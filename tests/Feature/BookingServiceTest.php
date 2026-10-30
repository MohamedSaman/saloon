<?php

declare(strict_types=1);

use App\Domain\Booking\Enums\AppointmentStatus;
use App\Domain\Booking\Services\AvailabilityService;
use App\Domain\Booking\Services\BookingService;
use App\Models\Appointment;
use App\Models\OpeningHour;
use App\Models\Salon;
use App\Models\SalonSetting;
use App\Models\Service;
use App\Models\ServiceCategory;
use App\Models\Staff;
use App\Models\StaffSchedule;
use Carbon\CarbonImmutable;

beforeEach(function () {
    $this->salon = Salon::create([
        'name' => 'KV Test Saloon',
        'slug' => 'kv-test-saloon',
        'is_active' => true,
    ]);

    SalonSetting::create([
        'salon_id' => $this->salon->id,
        'timezone' => 'Asia/Colombo',
        'slot_interval_minutes' => 15,
        'lead_time_minutes' => 0, // for immediate test slots
        'booking_window_days' => 30,
        'cancellation_window_minutes' => 180,
        'assignment_strategy' => 'least_booked_today',
    ]);

    // Monday opening hours
    OpeningHour::create([
        'salon_id' => $this->salon->id,
        'weekday' => 1, // Monday
        'opens_at' => '09:00:00',
        'closes_at' => '17:00:00',
    ]);

    $cat = ServiceCategory::create([
        'salon_id' => $this->salon->id,
        'name' => 'Hair',
    ]);

    $this->service = Service::create([
        'salon_id' => $this->salon->id,
        'category_id' => $cat->id,
        'name' => 'Classic Cut',
        'duration_minutes' => 30,
        'buffer_after_minutes' => 15,
        'price_cents' => 200000,
        'is_active' => true,
        'bookable_online' => true,
    ]);

    $this->staff = Staff::create([
        'salon_id' => $this->salon->id,
        'name' => 'Kamal Stylist',
        'display_name' => 'Kamal',
        'is_active' => true,
        'bookable_online' => true,
    ]);

    $this->staff->services()->attach($this->service->id);

    StaffSchedule::create([
        'staff_id' => $this->staff->id,
        'weekday' => 1,
        'starts_at' => '09:00:00',
        'ends_at' => '17:00:00',
    ]);
});

test('AvailabilityService generates accurate time slots for working staff', function () {
    $availabilityService = new AvailabilityService();

    // Next Monday
    $monday = CarbonImmutable::now('Asia/Colombo')->next(CarbonImmutable::MONDAY);

    $slots = $availabilityService->getAvailableSlots(
        $this->salon->id,
        $monday,
        [$this->service->id],
        'any'
    );

    expect(count($slots))->toBeGreaterThan(5);
    expect($slots[0]['formatted_start'])->toBe('9:00 AM');
    expect($slots[0]['formatted_end'])->toBe('9:30 AM');
});

test('BookingService creates booking and assigns staff properly', function () {
    $bookingService = new BookingService();
    $monday = CarbonImmutable::now('Asia/Colombo')->next(CarbonImmutable::MONDAY)->setHour(10)->setMinute(0);

    $appt = $bookingService->create([
        'salon_id' => $this->salon->id,
        'service_ids' => [$this->service->id],
        'staff_id' => 'any',
        'start_time' => $monday->toIso8601String(),
        'customer' => [
            'name' => 'Sunil Shantha',
            'phone' => '0771234567',
        ],
        'note' => 'First time visitor',
    ]);

    expect($appt)->toBeInstanceOf(Appointment::class);
    expect($appt->status)->toBe(AppointmentStatus::Confirmed);
    expect($appt->reference)->toStartWith('KV-');
    expect($appt->customer->name)->toBe('Sunil Shantha');
    expect($appt->customer->phone_e164)->toBe('+94771234567');
    expect($appt->items)->toHaveCount(1);
    expect($appt->items->first()->staff_id)->toBe($this->staff->id);
});
