<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Shop extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'name',
        'slug',
        'address',
        'phone',
        'opening_time',
        'closing_time',
        'staff_capacity',
        'payroll_type',
        'commission_rate',
        'fixed_daily_wage_cents',
        'is_active',
    ];

    protected $casts = [
        'staff_capacity' => 'integer',
        'commission_rate' => 'float',
        'fixed_daily_wage_cents' => 'integer',
        'is_active' => 'boolean',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function staff(): HasMany
    {
        return $this->hasMany(Staff::class);
    }

    public function services(): HasMany
    {
        return $this->hasMany(Service::class);
    }

    public function queueTickets(): HasMany
    {
        return $this->hasMany(QueueTicket::class);
    }

    public function pendingQueue(): HasMany
    {
        return $this->hasMany(QueueTicket::class)
            ->where('status', 'pending')
            ->orderBy('queued_at');
    }

    public function activeStaff(): HasMany
    {
        return $this->hasMany(Staff::class)
            ->whereIn('working_status', ['free', 'busy']);
    }
}
