<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalonSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'salon_id',
        'timezone',
        'slot_interval_minutes',
        'lead_time_minutes',
        'booking_window_days',
        'cancellation_window_minutes',
        'assignment_strategy',
        'otp_required',
        'reminder_offsets_minutes',
        'max_services_per_booking',
        'allow_staff_status_update',
    ];

    protected $casts = [
        'slot_interval_minutes' => 'integer',
        'lead_time_minutes' => 'integer',
        'booking_window_days' => 'integer',
        'cancellation_window_minutes' => 'integer',
        'otp_required' => 'boolean',
        'reminder_offsets_minutes' => 'array',
        'max_services_per_booking' => 'integer',
        'allow_staff_status_update' => 'boolean',
    ];

    public function salon(): BelongsTo
    {
        return $this->belongsTo(Salon::class);
    }
}
