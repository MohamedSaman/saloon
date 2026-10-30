<?php

declare(strict_types=1);

namespace App\Domain\Booking\Services;

use App\Domain\Booking\Enums\AppointmentStatus;
use App\Domain\Booking\Enums\AssignmentMethod;
use App\Domain\Booking\Enums\BookingSource;
use App\Domain\Shared\PhoneNumber;
use App\Models\Appointment;
use App\Models\AppointmentItem;
use App\Models\Customer;
use App\Models\Salon;
use App\Models\SalonSetting;
use App\Models\Service;
use App\Models\Staff;
use App\Models\StaffSchedule;
use App\Models\StaffTimeOff;
use Carbon\CarbonImmutable;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class BookingService
{
    /**
     * Create a booking safely with ordered row locks and race-condition prevention.
     *
     * @param array{
     *     salon_id: int,
     *     service_ids: array<int>,
     *     staff_id: string|int,
     *     start_time: string,
     *     customer: array{name: string, phone: string, email?: ?string},
     *     note?: ?string,
     *     source?: BookingSource,
     *     forced?: bool
     * } $data
     * @throws Exception
     */
    public function create(array $data): Appointment
    {
        $salonId = (int) $data['salon_id'];
        $salon = Salon::findOrFail($salonId);
        $settings = SalonSetting::where('salon_id', $salonId)->first();
        $timezone = $settings?->timezone ?? 'Asia/Colombo';

        $startLocal = CarbonImmutable::parse($data['start_time'], $timezone);
        $startUtc = $startLocal->setTimezone('UTC');

        // Fetch services
        $services = Service::withoutGlobalScope('salon')
            ->where('salon_id', $salonId)
            ->whereIn('id', $data['service_ids'])
            ->get();

        if ($services->isEmpty()) {
            throw new Exception("No valid services selected.");
        }

        $totalDuration = $services->sum('duration_minutes');
        $lastBuffer = (int) ($services->last()?->buffer_after_minutes ?? 0);
        $totalBlock = $totalDuration + $lastBuffer;
        $blockEndUtc = $startUtc->addMinutes($totalBlock);

        // Normalized Customer phone
        $phoneE164 = PhoneNumber::normalize($data['customer']['phone']);

        return DB::transaction(function () use (
            $salonId,
            $data,
            $services,
            $startUtc,
            $blockEndUtc,
            $startLocal,
            $totalDuration,
            $phoneE164,
            $settings,
            $timezone
        ) {
            // 1. Identify Candidate Staff
            $staffQuery = Staff::withoutGlobalScope('salon')
                ->where('salon_id', $salonId)
                ->where('is_active', true);

            if ($data['staff_id'] !== 'any' && is_numeric($data['staff_id'])) {
                $staffQuery->where('id', (int) $data['staff_id']);
            }

            $candidateIds = $staffQuery->orderBy('id')->pluck('id')->all();

            if (empty($candidateIds)) {
                throw new Exception("No eligible staff available for this booking.");
            }

            // 2. Lock candidate staff rows in deterministic order to prevent deadlocks (ADR-002)
            $lockedStaff = Staff::withoutGlobalScope('salon')
                ->whereIn('id', $candidateIds)
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            // 3. Find free staff inside the transaction (sees committed concurrent bookings)
            $weekday = (int) $startLocal->dayOfWeek;
            $freeStaff = [];

            foreach ($lockedStaff as $staff) {
                // Must be skilled in all requested services
                $skilledIds = $staff->services()->pluck('services.id')->all();
                if (count(array_intersect($data['service_ids'], $skilledIds)) !== count($data['service_ids'])) {
                    continue;
                }

                // Check shift
                $shiftValid = false;
                $slotStartTime = $startLocal->format('H:i:s');
                $slotBlockEndTime = $startLocal->addMinutes($totalDuration + ($services->last()?->buffer_after_minutes ?? 0))->format('H:i:s');

                $schedules = StaffSchedule::where('staff_id', $staff->id)->where('weekday', $weekday)->get();
                foreach ($schedules as $shift) {
                    if ($slotStartTime >= $shift->starts_at && $slotBlockEndTime <= $shift->ends_at) {
                        $shiftValid = true;
                        break;
                    }
                }

                if (! $shiftValid && empty($data['forced'])) {
                    continue;
                }

                // Check overlap with time off
                $timeOffOverlap = StaffTimeOff::where('staff_id', $staff->id)
                    ->where('starts_at', '<', $blockEndUtc)
                    ->where('ends_at', '>', $startUtc)
                    ->exists();

                if ($timeOffOverlap && empty($data['forced'])) {
                    continue;
                }

                $driver = DB::connection()->getDriverName();
                $dateAddExpr = $driver === 'sqlite'
                    ? "datetime(appointment_items.ends_at, '+' || appointment_items.buffer_after_minutes || ' minutes') > ?"
                    : 'DATE_ADD(appointment_items.ends_at, INTERVAL appointment_items.buffer_after_minutes MINUTE) > ?';

                // Check overlap with existing appointments
                $overlapBooking = AppointmentItem::query()
                    ->join('appointments', 'appointments.id', '=', 'appointment_items.appointment_id')
                    ->where('appointment_items.staff_id', $staff->id)
                    ->whereIn('appointments.status', [
                        AppointmentStatus::Confirmed->value,
                        AppointmentStatus::CheckedIn->value,
                        AppointmentStatus::Completed->value,
                    ])
                    ->whereNull('appointments.deleted_at')
                    ->where('appointment_items.starts_at', '<', $blockEndUtc)
                    ->whereRaw($dateAddExpr, [$startUtc->toDateTimeString()])
                    ->exists();

                if (! $overlapBooking || ! empty($data['forced'])) {
                    $freeStaff[] = $staff;
                }
            }

            if (empty($freeStaff)) {
                throw new Exception("SLOT_TAKEN: This time slot was just booked. Please select another time.");
            }

            // 4. Select Staff by Strategy (BR-5)
            $assignedStaff = null;
            $assignmentMethod = AssignmentMethod::Auto;
            $strategyUsed = $settings?->assignment_strategy ?? 'least_booked_today';

            if ($data['staff_id'] !== 'any' && is_numeric($data['staff_id'])) {
                $assignedStaff = $freeStaff[0];
                $assignmentMethod = AssignmentMethod::CustomerChoice;
                $strategyUsed = 'customer_selected';
            } else {
                // 'least_booked_today': fewest booked minutes on this date
                $assignedStaff = collect($freeStaff)->sortBy(function (Staff $s) use ($startLocal) {
                    return AppointmentItem::where('staff_id', $s->id)
                        ->whereDate('starts_at', $startLocal->format('Y-m-d'))
                        ->count();
                })->first();
            }

            // 5. Match or create Customer (BR-6.4)
            $customer = Customer::withoutGlobalScope('salon')->firstOrCreate(
                ['salon_id' => $salonId, 'phone_e164' => $phoneE164],
                [
                    'name' => $data['customer']['name'],
                    'email' => $data['customer']['email'] ?? null,
                    'phone_verified_at' => now(),
                ]
            );

            if (empty($customer->name)) {
                $customer->update(['name' => $data['customer']['name']]);
            }

            // 6. Generate unique reference (BR-6.3)
            $reference = 'KV-' . strtoupper(Str::random(6));

            $totalPriceCents = (int) $services->sum('price_cents');
            $endsUtc = $startUtc->addMinutes($totalDuration);

            // 7. Insert Appointment
            $appointment = Appointment::create([
                'salon_id' => $salonId,
                'reference' => $reference,
                'customer_id' => $customer->id,
                'status' => AppointmentStatus::Confirmed,
                'source' => $data['source'] ?? BookingSource::Online,
                'assignment_method' => $assignmentMethod,
                'assignment_strategy' => $strategyUsed,
                'starts_at' => $startUtc,
                'ends_at' => $endsUtc,
                'total_price_cents' => $totalPriceCents,
                'customer_note' => $data['note'] ?? null,
                'forced' => ! empty($data['forced']),
            ]);

            // 8. Insert sequential items
            $itemStart = $startUtc;
            $seq = 1;
            foreach ($services as $svc) {
                $itemEnd = $itemStart->addMinutes($svc->duration_minutes);

                AppointmentItem::create([
                    'appointment_id' => $appointment->id,
                    'service_id' => $svc->id,
                    'staff_id' => $assignedStaff->id,
                    'starts_at' => $itemStart,
                    'ends_at' => $itemEnd,
                    'buffer_after_minutes' => $svc->buffer_after_minutes,
                    'price_cents' => $svc->price_cents,
                    'status' => AppointmentStatus::Confirmed,
                    'sequence' => $seq++,
                ]);

                $itemStart = $itemEnd;
            }

            // Update staff assignment record
            $assignedStaff->update(['last_assigned_at' => now()]);

            return $appointment->load(['customer', 'items.service', 'items.staff']);
        });
    }
}
