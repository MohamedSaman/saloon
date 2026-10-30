<?php

declare(strict_types=1);

namespace App\Domain\Booking\Enums;

enum AppointmentStatus: string
{
    case Confirmed = 'confirmed';
    case CheckedIn = 'checked_in';
    case Completed = 'completed';
    case Cancelled = 'cancelled';
    case NoShow = 'no_show';

    public function blocksTime(): bool
    {
        return in_array($this, [self::Confirmed, self::CheckedIn, self::Completed], true);
    }
}
