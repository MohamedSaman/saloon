<?php

declare(strict_types=1);

namespace App\Domain\Shared;

use Carbon\CarbonImmutable;
use InvalidArgumentException;

final readonly class TimeRange
{
    public CarbonImmutable $start;
    public CarbonImmutable $end;

    public function __construct(CarbonImmutable $start, CarbonImmutable $end)
    {
        if ($end->lessThan($start)) {
            throw new InvalidArgumentException("End time ({$end->toIso8601String()}) must not be before start time ({$start->toIso8601String()}).");
        }

        $this->start = $start;
        $this->end = $end;
    }

    public static function from(CarbonImmutable|string $start, CarbonImmutable|string $end): self
    {
        $startDate = is_string($start) ? CarbonImmutable::parse($start) : $start;
        $endDate = is_string($end) ? CarbonImmutable::parse($end) : $end;

        return new self($startDate, $endDate);
    }

    public function durationMinutes(): int
    {
        return (int) round(($this->end->getTimestamp() - $this->start->getTimestamp()) / 60);
    }

    public function contains(CarbonImmutable $time): bool
    {
        return $time->greaterThanOrEqualTo($this->start) && $time->lessThan($this->end);
    }

    public function overlaps(self $other): bool
    {
        return $this->start->lessThan($other->end) && $this->end->greaterThan($other->start);
    }

    public function touches(self $other): bool
    {
        return $this->end->equalTo($other->start) || $this->start->equalTo($other->end);
    }

    public function fits(int $minutes): bool
    {
        return $this->durationMinutes() >= $minutes;
    }

    public function intersect(self $other): ?self
    {
        if (! $this->overlaps($other)) {
            return null;
        }

        $maxStart = $this->start->greaterThan($other->start) ? $this->start : $other->start;
        $minEnd = $this->end->lessThan($other->end) ? $this->end : $other->end;

        return new self($maxStart, $minEnd);
    }

    /**
     * Subtract another TimeRange from this TimeRange.
     *
     * @return array<int, self>
     */
    public function subtract(self $other): array
    {
        if (! $this->overlaps($other)) {
            return [$this];
        }

        $result = [];

        // Left remainder: this.start to other.start
        if ($this->start->lessThan($other->start)) {
            $result[] = new self($this->start, $other->start);
        }

        // Right remainder: other.end to this.end
        if ($this->end->greaterThan($other->end)) {
            $result[] = new self($other->end, $this->end);
        }

        return $result;
    }

    public function merge(self $other): ?self
    {
        if (! $this->overlaps($other) && ! $this->touches($other)) {
            return null;
        }

        $minStart = $this->start->lessThan($other->start) ? $this->start : $other->start;
        $maxEnd = $this->end->greaterThan($other->end) ? $this->end : $other->end;

        return new self($minStart, $maxEnd);
    }
}
