<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToSalon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Staff extends Model
{
    use HasFactory, SoftDeletes, BelongsToSalon;

    protected $table = 'staff';

    protected $fillable = [
        'salon_id',
        'shop_id',
        'user_id',
        'name',
        'display_name',
        'phone',
        'email',
        'photo_path',
        'bio',
        'display_order',
        'is_active',
        'bookable_online',
        'working_status', // 'offline', 'free', 'busy'
        'current_ticket_id',
        'payroll_type',
        'commission_rate',
        'fixed_daily_wage_cents',
        'last_assigned_at',
    ];

    protected $casts = [
        'display_order' => 'integer',
        'is_active' => 'boolean',
        'bookable_online' => 'boolean',
        'commission_rate' => 'float',
        'fixed_daily_wage_cents' => 'integer',
        'last_assigned_at' => 'immutable_datetime',
    ];

    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class);
    }

    public function currentTicket(): BelongsTo
    {
        return $this->belongsTo(QueueTicket::class, 'current_ticket_id');
    }

    public function queueTickets(): HasMany
    {
        return $this->hasMany(QueueTicket::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function services(): BelongsToMany
    {
        return $this->belongsToMany(Service::class, 'staff_service')
            ->withPivot('duration_override_minutes')
            ->withTimestamps();
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(StaffSchedule::class);
    }

    public function scheduleOverrides(): HasMany
    {
        return $this->hasMany(StaffScheduleOverride::class);
    }

    public function timeOff(): HasMany
    {
        return $this->hasMany(StaffTimeOff::class);
    }

    public function appointmentItems(): HasMany
    {
        return $this->hasMany(AppointmentItem::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeOnline($query)
    {
        return $query->where('is_active', true)->where('bookable_online', true);
    }
}
