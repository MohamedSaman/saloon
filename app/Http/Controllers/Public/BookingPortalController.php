<?php

declare(strict_types=1);

namespace App\Http\Controllers\Public;

use App\Domain\Booking\Enums\AppointmentStatus;
use App\Domain\Booking\Services\AvailabilityService;
use App\Domain\Booking\Services\BookingService;
use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Salon;
use App\Models\SalonSetting;
use App\Models\Service;
use App\Models\ServiceCategory;
use App\Models\Staff;
use Carbon\CarbonImmutable;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Inertia\Inertia;
use Inertia\Response;

class BookingPortalController extends Controller
{
    public function __construct(
        private readonly AvailabilityService $availabilityService,
        private readonly BookingService $bookingService
    ) {
    }

    /**
     * Render the mobile-first customer booking portal (Smart Queue - Zero Barber Selection).
     */
    public function index(Request $request): Response
    {
        return app(\App\Http\Controllers\Queue\QueueBookingController::class)->showPortal($request);
    }


    /**
     * Fetch available slots for chosen salon, date, services, and staff.
     */
    public function getSlots(Request $request): JsonResponse
    {
        $request->validate([
            'salon_id' => ['required', 'integer'],
            'date' => ['required', 'date_format:Y-m-d'],
            'service_ids' => ['required', 'array', 'min:1'],
            'service_ids.*' => ['integer'],
            'staff_id' => ['required'],
        ]);

        $salonId = (int) $request->input('salon_id');
        $date = CarbonImmutable::parse($request->input('date'), 'Asia/Colombo');
        $serviceIds = array_map('intval', (array) $request->input('service_ids'));
        $staffChoice = $request->input('staff_id');

        $slots = $this->availabilityService->getAvailableSlots(
            $salonId,
            $date,
            $serviceIds,
            $staffChoice
        );

        return response()->json([
            'date' => $date->format('Y-m-d'),
            'slots' => $slots,
        ]);
    }

    /**
     * Submit and confirm an appointment.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'salon_id' => ['required', 'integer', 'exists:salons,id'],
            'service_ids' => ['required', 'array', 'min:1'],
            'service_ids.*' => ['integer', 'exists:services,id'],
            'staff_id' => ['required'],
            'start_time' => ['required', 'string'],
            'customer' => ['required', 'array'],
            'customer.name' => ['required', 'string', 'max:120'],
            'customer.phone' => ['required', 'string', 'min:9', 'max:20'],
            'customer.email' => ['nullable', 'email', 'max:120'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $appointment = $this->bookingService->create($validated);

            $manageUrl = URL::signedRoute('booking.manage', [
                'reference' => $appointment->reference,
            ]);

            return response()->json([
                'success' => true,
                'reference' => $appointment->reference,
                'manage_url' => $manageUrl,
                'appointment' => [
                    'reference' => $appointment->reference,
                    'status' => $appointment->status->value,
                    'starts_at' => $appointment->starts_at->setTimezone('Asia/Colombo')->format('M d, Y h:i A'),
                    'total_price' => 'LKR ' . number_format($appointment->total_price_cents / 100, 2),
                    'customer_name' => $appointment->customer->name,
                    'customer_phone' => $appointment->customer->phone_e164,
                    'staff_name' => $appointment->items->first()?->staff?->display_name ?? 'KV Specialist',
                    'services' => $appointment->items->map(fn ($item) => [
                        'name' => $item->service->name,
                        'price' => 'LKR ' . number_format($item->price_cents / 100, 2),
                    ]),
                ],
            ], 201);
        } catch (Exception $e) {
            $code = str_contains($e->getMessage(), 'SLOT_TAKEN') ? 409 : 422;
            return response()->json([
                'success' => false,
                'error' => [
                    'message' => $e->getMessage(),
                ],
            ], $code);
        }
    }

    /**
     * Show appointment management page (via signed URL).
     */
    public function show(string $reference, Request $request): Response
    {
        $appointment = Appointment::withoutGlobalScope('salon')
            ->where('reference', $reference)
            ->with(['salon', 'customer', 'items.service', 'items.staff'])
            ->firstOrFail();

        $salon = $appointment->salon;
        $settings = SalonSetting::where('salon_id', $salon->id)->first();
        $cancelWindowMinutes = $settings?->cancellation_window_minutes ?? 180;

        $now = CarbonImmutable::now('Asia/Colombo');
        $start = $appointment->starts_at->setTimezone('Asia/Colombo');
        $canCancel = $now->lessThan($start->subMinutes($cancelWindowMinutes)) && $appointment->status === AppointmentStatus::Confirmed;

        return Inertia::render('Booking/Manage', [
            'appointment' => [
                'reference' => $appointment->reference,
                'status' => $appointment->status->value,
                'starts_at' => $start->format('l, F j, Y \a\t g:i A'),
                'total_price' => 'LKR ' . number_format($appointment->total_price_cents / 100, 2),
                'customer_name' => $appointment->customer->name,
                'customer_phone' => $appointment->customer->phone_e164,
                'staff_name' => $appointment->items->first()?->staff?->display_name ?? 'KV Stylist',
                'salon_name' => $salon->name,
                'salon_phone' => $salon->phone,
                'salon_address' => $salon->address,
                'services' => $appointment->items->map(fn ($item) => [
                    'name' => $item->service->name,
                    'price' => 'LKR ' . number_format($item->price_cents / 100, 2),
                ]),
                'can_cancel' => $canCancel,
                'cancellation_deadline' => $start->subMinutes($cancelWindowMinutes)->format('M d, g:i A'),
            ],
        ]);
    }

    /**
     * Cancel an appointment.
     */
    public function cancel(string $reference, Request $request): JsonResponse
    {
        $appointment = Appointment::withoutGlobalScope('salon')
            ->where('reference', $reference)
            ->firstOrFail();

        $settings = SalonSetting::where('salon_id', $appointment->salon_id)->first();
        $cancelWindowMinutes = $settings?->cancellation_window_minutes ?? 180;

        $now = CarbonImmutable::now('Asia/Colombo');
        $start = $appointment->starts_at->setTimezone('Asia/Colombo');

        if ($now->greaterThanOrEqualTo($start->subMinutes($cancelWindowMinutes))) {
            return response()->json([
                'success' => false,
                'message' => 'Cancellation window has passed. Please call the salon directly.',
            ], 403);
        }

        $appointment->update([
            'status' => AppointmentStatus::Cancelled,
            'cancelled_at' => now(),
            'cancel_reason' => $request->input('reason', 'Cancelled by customer via self-service link'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Your appointment has been cancelled successfully.',
        ]);
    }
}
