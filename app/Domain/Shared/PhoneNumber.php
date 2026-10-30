<?php

declare(strict_types=1);

namespace App\Domain\Shared;

use InvalidArgumentException;

final readonly class PhoneNumber
{
    public string $e164;

    public function __construct(string $raw)
    {
        $this->e164 = self::normalize($raw);
    }

    public static function normalize(string $phone): string
    {
        $cleaned = preg_replace('/[^\d+]/', '', trim($phone)) ?? '';

        // If starts with +94
        if (str_starts_with($cleaned, '+94') && strlen($cleaned) === 12) {
            return $cleaned;
        }

        // If starts with 94 (without +)
        if (str_starts_with($cleaned, '94') && strlen($cleaned) === 11) {
            return '+' . $cleaned;
        }

        // If starts with 0 (e.g. 0771234567 -> 10 digits)
        if (str_starts_with($cleaned, '0') && strlen($cleaned) === 10) {
            return '+94' . substr($cleaned, 1);
        }

        // If 9 digits (e.g. 771234567)
        if (strlen($cleaned) === 9 && ! str_starts_with($cleaned, '0')) {
            return '+94' . $cleaned;
        }

        if (str_starts_with($cleaned, '+')) {
            return $cleaned;
        }

        throw new InvalidArgumentException("Invalid Sri Lankan phone number format: {$phone}");
    }

    public function __toString(): string
    {
        return $this->e164;
    }
}
