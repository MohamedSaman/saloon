<?php

declare(strict_types=1);

namespace App\Models;

use App\Domain\Booking\Enums\AppointmentStatus;
use App\Domain\Booking\Enums\AssignmentMethod;
use App\Domain\Booking\Enums\BookingSource;
use App\Models\Concerns\BelongsToSalon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Appointment extends Model
{
    use HasFactory, SoftDeletes, BelongsToSalon;

    protected $fillable = [
        'salon_id',
        'reference',
        'customer_id',
        'status',
        'source',
        'assignment_method',
        'assignment_strategy',
        'starts_at',
        'ends_at',
        'total_price_cents',
        'customer_note',
        'internal_note',
        'cancelled_at',
        'cancelled_by_user_id',
        'cancel_reason',
        'forced',
        'created_by_user_id',
    ];

    protected $casts = [
        'status' => AppointmentStatus::class,
        'source' => BookingSource::class,
        'assignment_method' => AssignmentMethod::class,
        'starts_at' => 'immutable_datetime',
        'ends_at' => 'immutable_datetime',
        'cancelled_at' => 'immutable_datetime',
        'total_price_cents' => 'integer',
        'forced' => 'boolean',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(AppointmentItem::class)->orderBy('sequence');
    }

    public function cancelledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by_user_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(NotificationLog::class);
    }
}
