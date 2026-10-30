<?php

declare(strict_types=1);

use App\Domain\Booking\Enums\AppointmentStatus;
use App\Domain\Booking\Enums\AssignmentMethod;
use App\Domain\Booking\Enums\BookingSource;
use App\Domain\Booking\Services\AvailabilityService;
use App\Domain\Booking\Services\BookingService;
use App\Domain\Shared\PhoneNumber;
use App\Models\Appointment;
use App\Models\AppointmentItem;
use App\Models\Customer;
use App\Models\OpeningHour;
use App\Models\Salon;
use App\Models\SalonClosure;
use App\Models\SalonSetting;
use App\Models\Service;
use App\Models\ServiceCategory;
use App\Models\Staff;
use App\Models\StaffSchedule;
use App\Models\StaffTimeOff;
use Carbon\CarbonImmutable;

beforeEach(function () {
    $this->salon = Salon::create([
        'name' => 'KV Saloon Colombo',
        'slug' => 'kv-colombo',
        'is_active' => true,
    ]);

    $this->settings = SalonSetting::create([
        'salon_id' => $this->salon->id,
        'timezone' => 'Asia/Colombo',
        'slot_interval_minutes' => 15,
        'lead_time_minutes' => 0, // 0 for exact testing
        'booking_window_days' => 30,
        'cancellation_window_minutes' => 180, // 3 hours
        'assignment_strategy' => 'least_booked_today',
    ]);

    // Monday opening hours 09:00 - 19:00
    OpeningHour::create([
        'salon_id' => $this->salon->id,
        'weekday' => 1, // Monday
        'opens_at' => '09:00:00',
        'closes_at' => '19:00:00',
    ]);

    $this->category = ServiceCategory::create([
        'salon_id' => $this->salon->id,
        'name' => 'Hair Care',
    ]);

    $this->serviceA = Service::create([
        'salon_id' => $this->salon->id,
        'category_id' => $this->category->id,
        'name' => 'Haircut',
        'duration_minutes' => 30,
        'buffer_after_minutes' => 10,
        'price_cents' => 150000,
        'is_active' => true,
        'bookable_online' => true,
    ]);

    $this->serviceB = Service::create([
        'salon_id' => $this->salon->id,
        'category_id' => $this->category->id,
        'name' => 'Blow Dry',
        'duration_minutes' => 60,
        'buffer_after_minutes' => 15,
        'price_cents' => 250000,
        'is_active' => true,
        'bookable_online' => true,
    ]);

    $this->staffA = Staff::create([
        'salon_id' => $this->salon->id,
        'name' => 'Staff A',
        'display_name' => 'Staff A',
        'display_order' => 1,
        'is_active' => true,
        'bookable_online' => true,
    ]);
    $this->staffA->services()->attach([$this->serviceA->id, $this->serviceB->id]);

    $this->staffB = Staff::create([
        'salon_id' => $this->salon->id,
        'name' => 'Staff B',
        'display_name' => 'Staff B',
        'display_order' => 2,
        'is_active' => true,
        'bookable_online' => true,
    ]);
    $this->staffB->services()->attach([$this->serviceA->id]); // Skilled only in Service A
});

// =========================================================================
// T-01: Worked Example from Document Section 2 §10 / BR-10
// Haircut 30m + 10m buffer. Staff A works 09:00-13:00.
// Existing booking 09:30-10:00 (+10 buffer -> blocked to 10:10).
// Free intervals: 09:00-09:30, 10:10-13:00. Block needed: 40m.
// 09:00 invalid (exceeds 09:30). Grid starts after 10:10: 10:15, 10:30 ... last 12:15.
// =========================================================================
test('T-01: Worked example BR-10 slot generation matches exact document formula', function () {
    $date = CarbonImmutable::now('Asia/Colombo')->next(CarbonImmutable::MONDAY)->startOfDay();

    // Staff A schedule: 09:00 to 13:00
    StaffSchedule::create([
        'staff_id' => $this->staffA->id,
        'weekday' => 1,
        'starts_at' => '09:00:00',
        'ends_at' => '13:00:00',
    ]);

    // Create existing booking 09:30 - 10:00 with 10 min buffer
    $customer = Customer::create([
        'salon_id' => $this->salon->id,
        'name' => 'Existing Client',
        'phone_e164' => '+94771111111',
    ]);

    $existingAppt = Appointment::create([
        'salon_id' => $this->salon->id,
        'reference' => 'KV-EXIST1',
        'customer_id' => $customer->id,
        'status' => AppointmentStatus::Confirmed,
        'starts_at' => $date->setHour(9)->setMinute(30)->setTimezone('UTC'),
        'ends_at' => $date->setHour(10)->setMinute(0)->setTimezone('UTC'),
        'total_price_cents' => 150000,
    ]);

    AppointmentItem::create([
        'appointment_id' => $existingAppt->id,
        'service_id' => $this->serviceA->id,
        'staff_id' => $this->staffA->id,
        'starts_at' => $date->setHour(9)->setMinute(30)->setTimezone('UTC'),
        'ends_at' => $date->setHour(10)->setMinute(0)->setTimezone('UTC'),
        'buffer_after_minutes' => 10,
        'price_cents' => 150000,
        'status' => AppointmentStatus::Confirmed,
    ]);

    $availabilityService = new AvailabilityService();
    $slots = $availabilityService->getAvailableSlots(
        $this->salon->id,
        $date,
        [$this->serviceA->id],
        $this->staffA->id
    );

    $starts = array_column($slots, 'formatted_start');

    // 09:00 must be invalid because 09:00 - 09:40 exceeds free interval (09:00 - 09:30)
    expect($starts)->not->toContain('9:00 AM');

    // Grid starts after 10:10 -> 10:15
    expect($starts[0])->toBe('10:15 AM');

    // Last valid start is 12:15 (12:15 - 12:55 fits in 13:00)
    expect(end($starts))->toBe('12:15 PM');
    expect($starts)->not->toContain('12:30 PM');
});

// =========================================================================
// T-02: Split Shift & Shift Boundaries (BR-3.1, BR-4.4)
// Staff has shift 09:00-13:00 and 14:00-19:00 (1 hour lunch break).
// Service of 60 mins: 12:15 is invalid (12:15 + 60 = 13:15 > 13:00); 14:00 is valid!
// =========================================================================
test('T-02: Split shift rejects spans crossing break and accepts shift start', function () {
    $date = CarbonImmutable::now('Asia/Colombo')->next(CarbonImmutable::MONDAY)->startOfDay();

    StaffSchedule::create([
        'staff_id' => $this->staffA->id,
        'weekday' => 1,
        'starts_at' => '09:00:00',
        'ends_at' => '13:00:00',
    ]);
    StaffSchedule::create([
        'staff_id' => $this->staffA->id,
        'weekday' => 1,
        'starts_at' => '14:00:00',
        'ends_at' => '19:00:00',
    ]);

    $availabilityService = new AvailabilityService();
    $slots = $availabilityService->getAvailableSlots(
        $this->salon->id,
        $date,
        [$this->serviceB->id], // 60 min service + 15 min buffer = 75 min block
        $this->staffA->id
    );

    $starts = array_column($slots, 'formatted_start');

    // 12:00 is invalid because 12:00 + 75 min = 13:15 > 13:00
    expect($starts)->not->toContain('12:00 PM');
    expect($starts)->not->toContain('12:15 PM');

    // 14:00 is valid (after lunch break)
    expect($starts)->toContain('2:00 PM');
});

// =========================================================================
// T-04: Staff Time Off (BR-3.2)
// Adding time off 15:00 - 16:00 removes overlapping slots
// =========================================================================
test('T-04: Staff time off correctly blocks appointment slots during leave', function () {
    $date = CarbonImmutable::now('Asia/Colombo')->next(CarbonImmutable::MONDAY)->startOfDay();

    StaffSchedule::create([
        'staff_id' => $this->staffA->id,
        'weekday' => 1,
        'starts_at' => '09:00:00',
        'ends_at' => '19:00:00',
    ]);

    // Staff time off 15:00 to 16:00 local (Asia/Colombo)
    StaffTimeOff::create([
        'staff_id' => $this->staffA->id,
        'starts_at' => $date->setHour(15)->setTimezone('UTC'),
        'ends_at' => $date->setHour(16)->setTimezone('UTC'),
        'type' => 'break',
        'note' => 'Doctor appointment',
    ]);

    $availabilityService = new AvailabilityService();
    $slots = $availabilityService->getAvailableSlots(
        $this->salon->id,
        $date,
        [$this->serviceA->id], // 30 min duration + 10 buffer = 40 min block
        $this->staffA->id
    );

    $starts = array_column($slots, 'formatted_start');

    // 14:45 would end at 15:25, overlapping time off starting at 15:00
    expect($starts)->not->toContain('2:45 PM');
    expect($starts)->not->toContain('3:00 PM');
    expect($starts)->not->toContain('3:30 PM');

    // 16:00 is free again
    expect($starts)->toContain('4:00 PM');
});

// =========================================================================
// T-05: Salon Closure / Public Holiday (BR-3.3)
// A salon closure blocks all slots for all staff
// =========================================================================
test('T-05: Salon closure disables slots across all staff for that day', function () {
    $date = CarbonImmutable::now('Asia/Colombo')->next(CarbonImmutable::MONDAY)->startOfDay();

    StaffSchedule::create([
        'staff_id' => $this->staffA->id,
        'weekday' => 1,
        'starts_at' => '09:00:00',
        'ends_at' => '19:00:00',
    ]);

    SalonClosure::create([
        'salon_id' => $this->salon->id,
        'starts_at' => $date->setHour(0)->setTimezone('UTC'),
        'ends_at' => $date->setHour(23)->setMinute(59)->setTimezone('UTC'),
        'reason' => 'National Holiday Closure',
    ]);

    $availabilityService = new AvailabilityService();
    $slots = $availabilityService->getAvailableSlots(
        $this->salon->id,
        $date,
        [$this->serviceA->id],
        'any'
    );

    expect($slots)->toBeEmpty();
});

// =========================================================================
// T-06: Staff Skill Eligibility (BR-4.2)
// Staff B does not have skill for Service B -> should be excluded
// =========================================================================
test('T-06: Staff without required skill is excluded from booking availability', function () {
    $date = CarbonImmutable::now('Asia/Colombo')->next(CarbonImmutable::MONDAY)->startOfDay();

    StaffSchedule::create([
        'staff_id' => $this->staffB->id,
        'weekday' => 1,
        'starts_at' => '09:00:00',
        'ends_at' => '19:00:00',
    ]);

    $availabilityService = new AvailabilityService();
    // Inquire specifically for Staff B on Service B (which Staff B lacks)
    $slots = $availabilityService->getAvailableSlots(
        $this->salon->id,
        $date,
        [$this->serviceB->id],
        $this->staffB->id
    );

    expect($slots)->toBeEmpty();
});

// =========================================================================
// T-11: "Any Staff" Assignment with Least Booked Today (BR-4.7, BR-5.1)
// If Staff A has 1 booking and Staff B has 0 bookings, auto-assignment picks Staff B
// =========================================================================
test('T-11: Any staff auto assigns least booked staff member today', function () {
    $date = CarbonImmutable::now('Asia/Colombo')->next(CarbonImmutable::MONDAY)->startOfDay();

    // Give both staff schedules on Monday
    StaffSchedule::create(['staff_id' => $this->staffA->id, 'weekday' => 1, 'starts_at' => '09:00:00', 'ends_at' => '19:00:00']);
    StaffSchedule::create(['staff_id' => $this->staffB->id, 'weekday' => 1, 'starts_at' => '09:00:00', 'ends_at' => '19:00:00']);

    // Staff A already has a booking at 14:00
    $cust = Customer::create(['salon_id' => $this->salon->id, 'name' => 'C1', 'phone_e164' => '+94770000010']);
    $apptA = Appointment::create([
        'salon_id' => $this->salon->id,
        'reference' => 'KV-BUSY01',
        'customer_id' => $cust->id,
        'status' => AppointmentStatus::Confirmed,
        'starts_at' => $date->setHour(14)->setTimezone('UTC'),
        'ends_at' => $date->setHour(14)->setMinute(30)->setTimezone('UTC'),
        'total_price_cents' => 150000,
    ]);
    AppointmentItem::create([
        'appointment_id' => $apptA->id,
        'service_id' => $this->serviceA->id,
        'staff_id' => $this->staffA->id,
        'starts_at' => $date->setHour(14)->setTimezone('UTC'),
        'ends_at' => $date->setHour(14)->setMinute(30)->setTimezone('UTC'),
        'buffer_after_minutes' => 10,
        'price_cents' => 150000,
        'status' => AppointmentStatus::Confirmed,
    ]);

    // Book at 10:00 AM with 'any' staff
    $bookingService = new BookingService();
    $newAppt = $bookingService->create([
        'salon_id' => $this->salon->id,
        'service_ids' => [$this->serviceA->id],
        'staff_id' => 'any',
        'start_time' => $date->setHour(10)->setMinute(0)->toIso8601String(),
        'customer' => ['name' => 'Auto Test', 'phone' => '0772223344'],
    ]);

    // Staff B had 0 bookings while Staff A had 1, so Staff B should be chosen
    expect($newAppt->items->first()->staff_id)->toBe($this->staffB->id);
    expect($newAppt->assignment_method)->toBe(AssignmentMethod::Auto);
});

// =========================================================================
// T-14: Concurrency & Double-Booking Protection (BR-6.1, ADR-002)
// Attempting to create two overlapping bookings for the same staff throws SLOT_TAKEN
// =========================================================================
test('T-14: Concurrent booking protection rejects second overlapping request', function () {
    $date = CarbonImmutable::now('Asia/Colombo')->next(CarbonImmutable::MONDAY)->startOfDay();

    StaffSchedule::create([
        'staff_id' => $this->staffA->id,
        'weekday' => 1,
        'starts_at' => '09:00:00',
        'ends_at' => '19:00:00',
    ]);

    $bookingService = new BookingService();

    // 1st request succeeds
    $booking1 = $bookingService->create([
        'salon_id' => $this->salon->id,
        'service_ids' => [$this->serviceA->id], // 30 min + 10 min buffer
        'staff_id' => $this->staffA->id,
        'start_time' => $date->setHour(11)->setMinute(0)->toIso8601String(),
        'customer' => ['name' => 'First Booker', 'phone' => '0771112233'],
    ]);
    expect($booking1)->toBeInstanceOf(Appointment::class);

    // 2nd request for same staff and overlapping time (11:15 AM)
    expect(function () use ($bookingService, $date) {
        $bookingService->create([
            'salon_id' => $this->salon->id,
            'service_ids' => [$this->serviceA->id],
            'staff_id' => $this->staffA->id,
            'start_time' => $date->setHour(11)->setMinute(15)->toIso8601String(),
            'customer' => ['name' => 'Second Booker', 'phone' => '0779998877'],
        ]);
    })->toThrow(Exception::class, 'SLOT_TAKEN');
});

// =========================================================================
// T-15: Cancelled Booking Frees Time (BR-7.1)
// When a booking is cancelled, its time slot immediately becomes available
// =========================================================================
test('T-15: Cancelled booking releases the time slot for new bookings', function () {
    $date = CarbonImmutable::now('Asia/Colombo')->next(CarbonImmutable::MONDAY)->startOfDay();

    StaffSchedule::create([
        'staff_id' => $this->staffA->id,
        'weekday' => 1,
        'starts_at' => '09:00:00',
        'ends_at' => '19:00:00',
    ]);

    $bookingService = new BookingService();
    $availabilityService = new AvailabilityService();

    $booking = $bookingService->create([
        'salon_id' => $this->salon->id,
        'service_ids' => [$this->serviceA->id],
        'staff_id' => $this->staffA->id,
        'start_time' => $date->setHour(10)->setMinute(0)->toIso8601String(),
        'customer' => ['name' => 'Client Cancel', 'phone' => '0773334455'],
    ]);

    // Slot at 10:00 AM is now unavailable
    $slotsBefore = $availabilityService->getAvailableSlots(
        $this->salon->id,
        $date,
        [$this->serviceA->id],
        $this->staffA->id
    );
    expect(array_column($slotsBefore, 'formatted_start'))->not->toContain('10:00 AM');

    // Cancel appointment
    $booking->update([
        'status' => AppointmentStatus::Cancelled,
        'cancelled_at' => now(),
    ]);

    // Slot at 10:00 AM reappears!
    $slotsAfter = $availabilityService->getAvailableSlots(
        $this->salon->id,
        $date,
        [$this->serviceA->id],
        $this->staffA->id
    );
    expect(array_column($slotsAfter, 'formatted_start'))->toContain('10:00 AM');
});

// =========================================================================
// T-24: Phone Normalization (BR-6.4)
// Different phone formats (077..., +9477..., 9477...) resolve to same customer
// =========================================================================
test('T-24: Different Sri Lankan phone number inputs map to the identical customer record', function () {
    $date = CarbonImmutable::now('Asia/Colombo')->next(CarbonImmutable::MONDAY)->startOfDay();

    StaffSchedule::create([
        'staff_id' => $this->staffA->id,
        'weekday' => 1,
        'starts_at' => '09:00:00',
        'ends_at' => '19:00:00',
    ]);

    $bookingService = new BookingService();

    // First booking with 0771234567
    $b1 = $bookingService->create([
        'salon_id' => $this->salon->id,
        'service_ids' => [$this->serviceA->id],
        'staff_id' => $this->staffA->id,
        'start_time' => $date->setHour(9)->setMinute(0)->toIso8601String(),
        'customer' => ['name' => 'Kamal Perera', 'phone' => '0771234567'],
    ]);

    // Second booking with 94771234567
    $b2 = $bookingService->create([
        'salon_id' => $this->salon->id,
        'service_ids' => [$this->serviceA->id],
        'staff_id' => $this->staffA->id,
        'start_time' => $date->setHour(12)->setMinute(0)->toIso8601String(),
        'customer' => ['name' => 'Kamal Perera', 'phone' => '94771234567'],
    ]);

    expect($b1->customer_id)->toBe($b2->customer_id);
    expect($b1->customer->phone_e164)->toBe('+94771234567');
});

// =========================================================================
// End-to-End API Test for Public Booking Flow
// =========================================================================
test('API: Customer can fetch slots and submit a booking via public API', function () {
    $date = CarbonImmutable::now('Asia/Colombo')->next(CarbonImmutable::MONDAY)->startOfDay();

    StaffSchedule::create([
        'staff_id' => $this->staffA->id,
        'weekday' => 1,
        'starts_at' => '09:00:00',
        'ends_at' => '19:00:00',
    ]);

    // 1. Get Slots
    $response = $this->getJson(route('api.public.slots', [
        'salon_id' => $this->salon->id,
        'date' => $date->format('Y-m-d'),
        'service_ids' => [$this->serviceA->id],
        'staff_id' => 'any',
    ]));

    $response->assertStatus(200);
    $response->assertJsonStructure(['date', 'slots']);
    $slotTime = $response->json('slots.0.start');

    // 2. Submit Booking
    $bookingResponse = $this->postJson(route('api.public.bookings.store'), [
        'salon_id' => $this->salon->id,
        'service_ids' => [$this->serviceA->id],
        'staff_id' => 'any',
        'start_time' => $slotTime,
        'customer' => [
            'name' => 'Anoma Silva',
            'phone' => '0775556677',
            'email' => 'anoma@example.com',
        ],
        'note' => 'Please be gentle',
    ]);

    $bookingResponse->assertStatus(201);
    $bookingResponse->assertJson(['success' => true]);
    expect($bookingResponse->json('reference'))->toStartWith('KV-');
    expect($bookingResponse->json('manage_url'))->toContain('/b/KV-');
});
