<?php

declare(strict_types=1);

namespace App\Domain\Booking\Enums;

enum AssignmentMethod: string
{
    case Auto = 'auto';
    case CustomerChoice = 'customer_choice';
    case Manual = 'manual';
}
