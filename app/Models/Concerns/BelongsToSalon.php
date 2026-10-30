<?php

declare(strict_types=1);

namespace App\Models\Concerns;

use App\Models\Salon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait BelongsToSalon
{
    public static function bootBelongsToSalon(): void
    {
        static::addGlobalScope('salon', function (Builder $builder) {
            $salonId = config('app.salon_id', 1);
            if ($salonId !== null) {
                $builder->where($builder->qualifyColumn('salon_id'), $salonId);
            }
        });

        static::creating(function ($model) {
            if (empty($model->salon_id)) {
                $model->salon_id = config('app.salon_id', 1);
            }
        });
    }

    public function salon(): BelongsTo
    {
        return $this->belongsTo(Salon::class);
    }
}
