<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToSalon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Service extends Model
{
    use HasFactory, SoftDeletes, BelongsToSalon;

    protected $fillable = [
        'salon_id',
        'shop_id',
        'category_id',
        'name',
        'description',
        'duration_minutes',
        'buffer_after_minutes',
        'price_cents',
        'price_is_from',
        'is_active',
        'bookable_online',
        'sort_order',
    ];

    protected $casts = [
        'duration_minutes' => 'integer',
        'buffer_after_minutes' => 'integer',
        'price_cents' => 'integer',
        'price_is_from' => 'boolean',
        'is_active' => 'boolean',
        'bookable_online' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ServiceCategory::class, 'category_id');
    }

    public function staff(): BelongsToMany
    {
        return $this->belongsToMany(Staff::class, 'staff_service')
            ->withPivot('duration_override_minutes')
            ->withTimestamps();
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
