<?php

declare(strict_types=1);

namespace App\Domain\Booking\Enums;

enum BookingSource: string
{
    case Online = 'online';
    case FrontDesk = 'front_desk';
    case Phone = 'phone';
    case WalkIn = 'walk_in';
}
