<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToSalon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    use HasFactory, BelongsToSalon;

    protected $fillable = [
        'salon_id',
        'name',
        'phone_e164',
        'email',
        'notes',
        'marketing_opt_in',
        'phone_verified_at',
    ];

    protected $casts = [
        'marketing_opt_in' => 'boolean',
        'phone_verified_at' => 'immutable_datetime',
    ];

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }
}
