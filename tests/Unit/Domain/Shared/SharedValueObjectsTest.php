<?php

declare(strict_types=1);

use App\Domain\Shared\Money;
use App\Domain\Shared\PhoneNumber;
use App\Domain\Shared\TimeRange;
use Carbon\CarbonImmutable;

test('TimeRange calculates duration and containment correctly', function () {
    $start = CarbonImmutable::parse('2026-11-03 09:00:00');
    $end = CarbonImmutable::parse('2026-11-03 10:30:00');
    $range = new TimeRange($start, $end);

    expect($range->durationMinutes())->toBe(90);
    expect($range->contains($start))->toBeTrue();
    expect($range->contains(CarbonImmutable::parse('2026-11-03 09:45:00')))->toBeTrue();
    expect($range->contains($end))->toBeFalse();
    expect($range->fits(60))->toBeTrue();
    expect($range->fits(90))->toBeTrue();
    expect($range->fits(120))->toBeFalse();
});

test('TimeRange subtract handles middle, edge, and disjoint overlap correctly', function () {
    $main = TimeRange::from('2026-11-03 09:00:00', '2026-11-03 13:00:00');
    $booked = TimeRange::from('2026-11-03 10:00:00', '2026-11-03 11:00:00');

    $remaining = $main->subtract($booked);
    expect($remaining)->toHaveCount(2);
    expect($remaining[0]->start->toDateTimeString())->toBe('2026-11-03 09:00:00');
    expect($remaining[0]->end->toDateTimeString())->toBe('2026-11-03 10:00:00');
    expect($remaining[1]->start->toDateTimeString())->toBe('2026-11-03 11:00:00');
    expect($remaining[1]->end->toDateTimeString())->toBe('2026-11-03 13:00:00');

    // Non-overlapping range subtraction returns original
    $otherDay = TimeRange::from('2026-11-04 10:00:00', '2026-11-04 11:00:00');
    expect($main->subtract($otherDay))->toHaveCount(1);
});

test('Money formats correctly', function () {
    $money = Money::fromCents(150000);
    expect($money->toFormatted())->toBe('LKR 1,500.00');
    expect($money->toArray())->toBe([
        'cents' => 150000,
        'formatted' => 'LKR 1,500.00',
    ]);
});

test('PhoneNumber normalizes Sri Lankan numbers accurately (BR-6.4, T-24)', function () {
    expect(PhoneNumber::normalize('0771234567'))->toBe('+94771234567');
    expect(PhoneNumber::normalize('94771234567'))->toBe('+94771234567');
    expect(PhoneNumber::normalize('+94771234567'))->toBe('+94771234567');
    expect(PhoneNumber::normalize('771234567'))->toBe('+94771234567');
    expect(PhoneNumber::normalize('077 123 4567'))->toBe('+94771234567');
});
