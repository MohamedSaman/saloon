<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StaffScheduleOverride extends Model
{
    use HasFactory;

    protected $fillable = [
        'staff_id',
        'date',
        'starts_at',
        'ends_at',
    ];

    protected $casts = [
        'date' => 'immutable_date',
    ];

    public function staff(): BelongsTo
    {
        return $this->belongsTo(Staff::class);
    }
}
