<?php

declare(strict_types=1);

namespace App\Models;

use App\Domain\Booking\Enums\AppointmentStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AppointmentItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'appointment_id',
        'service_id',
        'staff_id',
        'starts_at',
        'ends_at',
        'buffer_after_minutes',
        'price_cents',
        'status',
        'sequence',
    ];

    protected $casts = [
        'status' => AppointmentStatus::class,
        'starts_at' => 'immutable_datetime',
        'ends_at' => 'immutable_datetime',
        'buffer_after_minutes' => 'integer',
        'price_cents' => 'integer',
        'sequence' => 'integer',
    ];

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function staff(): BelongsTo
    {
        return $this->belongsTo(Staff::class);
    }
}
