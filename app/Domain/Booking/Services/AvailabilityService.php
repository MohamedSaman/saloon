<?php

declare(strict_types=1);

namespace App\Domain\Booking\Services;

use App\Domain\Booking\Enums\AppointmentStatus;
use App\Models\AppointmentItem;
use App\Models\OpeningHour;
use App\Models\Salon;
use App\Models\SalonClosure;
use App\Models\SalonSetting;
use App\Models\Service;
use App\Models\Staff;
use App\Models\StaffSchedule;
use App\Models\StaffTimeOff;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

final class AvailabilityService
{
    /**
     * Get available dates with at least one slot over a date range.
     *
     * @param array<int> $serviceIds
     * @return array<int, array{date: string, available: bool}>
     */
    public function getAvailableDates(
        int $salonId,
        array $serviceIds,
        string|int $staffChoice,
        CarbonImmutable $from,
        CarbonImmutable $to
    ): array {
        $dates = [];
        $current = $from->startOfDay();
        $end = $to->startOfDay();

        while ($current->lessThanOrEqualTo($end)) {
            $slots = $this->getAvailableSlots($salonId, $current, $serviceIds, $staffChoice);
            $dates[] = [
                'date' => $current->format('Y-m-d'),
                'available' => count($slots) > 0,
            ];
            $current = $current->addDay();
        }

        return $dates;
    }

    /**
     * Get available time slots for a specific date.
     *
     * @param array<int> $serviceIds
     * @return array<int, array{start: string, end: string, formatted_start: string, formatted_end: string, available_staff_count: int}>
     */
    public function getAvailableSlots(
        int $salonId,
        CarbonImmutable $date,
        array $serviceIds,
        string|int $staffChoice
    ): array {
        $salon = Salon::find($salonId);
        if (! $salon || ! $salon->is_active) {
            return [];
        }

        $settings = SalonSetting::where('salon_id', $salonId)->first();
        $timezone = $settings?->timezone ?? 'Asia/Colombo';
        $slotInterval = $settings?->slot_interval_minutes ?? 15;
        $leadTime = $settings?->lead_time_minutes ?? 60;
        $bookingWindow = $settings?->booking_window_days ?? 30;

        $now = CarbonImmutable::now($timezone);
        $localDate = $date->setTimezone($timezone)->startOfDay();

        // 1. Check booking window limits (BR-4.5)
        if ($localDate->lessThan($now->startOfDay()) || $localDate->greaterThan($now->startOfDay()->addDays($bookingWindow))) {
            return [];
        }

        // 2. Check salon opening hours for this weekday
        $weekday = (int) $localDate->dayOfWeek; // 0=Sun, 1=Mon...
        $opening = OpeningHour::withoutGlobalScope('salon')
            ->where('salon_id', $salonId)
            ->where('weekday', $weekday)
            ->first();

        if (! $opening) {
            return []; // Closed this weekday
        }

        $salonOpen = CarbonImmutable::parse($localDate->format('Y-m-d') . ' ' . $opening->opens_at, $timezone);
        $salonClose = CarbonImmutable::parse($localDate->format('Y-m-d') . ' ' . $opening->closes_at, $timezone);

        // 3. Check full-day salon closures
        $closure = SalonClosure::withoutGlobalScope('salon')
            ->where('salon_id', $salonId)
            ->where('starts_at', '<=', $salonClose->setTimezone('UTC'))
            ->where('ends_at', '>=', $salonOpen->setTimezone('UTC'))
            ->exists();

        if ($closure) {
            return [];
        }

        // 4. Fetch services and calculate total block duration (BR-4.1)
        $services = Service::withoutGlobalScope('salon')
            ->where('salon_id', $salonId)
            ->whereIn('id', $serviceIds)
            ->get();

        if ($services->count() !== count($serviceIds) || $services->isEmpty()) {
            return [];
        }

        $totalDuration = $services->sum('duration_minutes');
        $lastServiceBuffer = (int) ($services->last()?->buffer_after_minutes ?? 0);
        $totalBlock = $totalDuration + $lastServiceBuffer;

        // 5. Determine eligible staff (BR-4.2)
        $staffQuery = Staff::withoutGlobalScope('salon')
            ->where('salon_id', $salonId)
            ->where('is_active', true)
            ->where('bookable_online', true);

        if ($staffChoice !== 'any' && is_numeric($staffChoice)) {
            $staffQuery->where('id', (int) $staffChoice);
        }

        $candidateStaff = $staffQuery->get()->filter(function (Staff $s) use ($serviceIds) {
            // Must have skill for every selected service
            $skilledIds = $s->services()->pluck('services.id')->all();
            return count(array_intersect($serviceIds, $skilledIds)) === count($serviceIds);
        });

        if ($candidateStaff->isEmpty()) {
            return [];
        }

        // 6. Generate candidate start slots aligned to grid
        $earliestAllowedStart = $now->addMinutes($leadTime);
        $slots = [];

        $candidateStart = $salonOpen;
        while ($candidateStart->addMinutes($totalBlock)->lessThanOrEqualTo($salonClose)) {
            if ($candidateStart->greaterThanOrEqualTo($earliestAllowedStart)) {
                // Check which staff members are free for this slot
                $freeStaffCount = 0;
                $candidateEnd = $candidateStart->addMinutes($totalDuration);
                $blockEnd = $candidateStart->addMinutes($totalBlock);

                foreach ($candidateStaff as $staff) {
                    if ($this->isStaffFree($staff, $candidateStart, $blockEnd, $weekday, $timezone)) {
                        $freeStaffCount++;
                    }
                }

                if ($freeStaffCount > 0) {
                    $slots[] = [
                        'start' => $candidateStart->toIso8601String(),
                        'end' => $candidateEnd->toIso8601String(),
                        'formatted_start' => $candidateStart->format('g:i A'),
                        'formatted_end' => $candidateEnd->format('g:i A'),
                        'available_staff_count' => $freeStaffCount,
                    ];
                }
            }

            $candidateStart = $candidateStart->addMinutes($slotInterval);
        }

        return $slots;
    }

    /**
     * Check if a staff member is available during the interval [start, blockEnd).
     */
    private function isStaffFree(
        Staff $staff,
        CarbonImmutable $startLocal,
        CarbonImmutable $blockEndLocal,
        int $weekday,
        string $timezone
    ): bool {
        // Staff weekly working hours
        $schedule = StaffSchedule::where('staff_id', $staff->id)
            ->where('weekday', $weekday)
            ->get();

        if ($schedule->isEmpty()) {
            return false;
        }

        // Check if [startLocal, blockEndLocal] falls fully within any schedule shift
        $fitsInShift = false;
        $slotStartTime = $startLocal->format('H:i:s');
        $slotEndTime = $blockEndLocal->format('H:i:s');

        foreach ($schedule as $shift) {
            if ($slotStartTime >= $shift->starts_at && $slotEndTime <= $shift->ends_at) {
                $fitsInShift = true;
                break;
            }
        }

        if (! $fitsInShift) {
            return false;
        }

        // Convert to UTC for database comparison
        $startUtc = $startLocal->setTimezone('UTC');
        $blockEndUtc = $blockEndLocal->setTimezone('UTC');

        // Check staff time off
        $hasTimeOff = StaffTimeOff::where('staff_id', $staff->id)
            ->where('starts_at', '<', $blockEndUtc)
            ->where('ends_at', '>', $startUtc)
            ->exists();

        if ($hasTimeOff) {
            return false;
        }

        $driver = DB::connection()->getDriverName();
        $dateAddExpr = $driver === 'sqlite'
            ? "datetime(appointment_items.ends_at, '+' || appointment_items.buffer_after_minutes || ' minutes') > ?"
            : 'DATE_ADD(appointment_items.ends_at, INTERVAL appointment_items.buffer_after_minutes MINUTE) > ?';

        $hasOverlap = AppointmentItem::query()
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

        return ! $hasOverlap;
    }
}
