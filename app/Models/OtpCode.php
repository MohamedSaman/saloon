<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OtpCode extends Model
{
    use HasFactory;

    protected $fillable = [
        'phone_e164',
        'code_hash',
        'expires_at',
        'attempts',
        'verified_at',
        'ip',
    ];

    protected $casts = [
        'expires_at' => 'immutable_datetime',
        'verified_at' => 'immutable_datetime',
        'attempts' => 'integer',
    ];
}
