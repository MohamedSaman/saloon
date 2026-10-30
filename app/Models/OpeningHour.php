<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToSalon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OpeningHour extends Model
{
    use HasFactory, BelongsToSalon;

    protected $fillable = [
        'salon_id',
        'weekday',
        'opens_at',
        'closes_at',
    ];

    protected $casts = [
        'weekday' => 'integer',
    ];
}
