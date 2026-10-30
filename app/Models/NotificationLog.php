<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'appointment_id',
        'channel',
        'type',
        'offset_minutes',
        'to',
        'status',
        'provider_message_id',
        'error',
        'sent_at',
    ];

    protected $casts = [
        'offset_minutes' => 'integer',
        'sent_at' => 'immutable_datetime',
    ];

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }
}
