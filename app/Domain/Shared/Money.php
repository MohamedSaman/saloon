<?php

declare(strict_types=1);

namespace App\Domain\Shared;

final readonly class Money
{
    public function __construct(public int $cents, public string $currency = 'LKR')
    {
    }

    public static function fromCents(int $cents, string $currency = 'LKR'): self
    {
        return new self($cents, $currency);
    }

    public static function fromRupees(float|int $rupees, string $currency = 'LKR'): self
    {
        return new self((int) round($rupees * 100), $currency);
    }

    public function toFormatted(): string
    {
        return sprintf('%s %s', $this->currency, number_format($this->cents / 100, 2));
    }

    public function toArray(): array
    {
        return [
            'cents' => $this->cents,
            'formatted' => $this->toFormatted(),
        ];
    }
}
