<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QueueTicket extends Model
{
    use HasFactory;

    protected $fillable = [
        'ticket_uuid',
        'shop_id',
        'service_id',
        'staff_id',
        'customer_name',
        'customer_phone',
        'scheduled_time',
        'queue_number',
        'status',
        'source',
        'price_cents',
        'staff_commission_cents',
        'queued_at',
        'started_at',
        'completed_at',
    ];

    protected $casts = [
        'queue_number' => 'integer',
        'price_cents' => 'integer',
        'staff_commission_cents' => 'integer',
        'queued_at' => 'immutable_datetime',
        'started_at' => 'immutable_datetime',
        'completed_at' => 'immutable_datetime',
    ];

    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class);
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
