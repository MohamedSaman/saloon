<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff', function (Blueprint $table) {
            $table->id();
            $table->foreignId('salon_id')->constrained('salons')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->unique()->constrained('users')->nullOnDelete();
            $table->string('name', 120);
            $table->string('display_name', 120);
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('photo_path')->nullable();
            $table->string('bio', 300)->nullable();
            $table->smallInteger('display_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->boolean('bookable_online')->default(true);
            $table->dateTime('last_assigned_at')->nullable();
            $table->softDeletes();
            $table->timestamps();
        });

        Schema::create('staff_service', function (Blueprint $table) {
            $table->foreignId('staff_id')->constrained('staff')->cascadeOnDelete();
            $table->foreignId('service_id')->constrained('services')->cascadeOnDelete();
            $table->unsignedSmallInteger('duration_override_minutes')->nullable();
            $table->timestamps();

            $table->primary(['staff_id', 'service_id']);
        });

        Schema::create('staff_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('staff_id')->constrained('staff')->cascadeOnDelete();
            $table->unsignedTinyInteger('weekday'); // 0=Sunday, 1=Monday... 6=Saturday
            $table->time('starts_at');
            $table->time('ends_at');
            $table->timestamps();

            $table->index(['staff_id', 'weekday']);
        });

        Schema::create('staff_schedule_overrides', function (Blueprint $table) {
            $table->id();
            $table->foreignId('staff_id')->constrained('staff')->cascadeOnDelete();
            $table->date('date');
            $table->time('starts_at')->nullable(); // null times = day off
            $table->time('ends_at')->nullable();
            $table->timestamps();

            $table->index(['staff_id', 'date']);
        });

        Schema::create('staff_time_off', function (Blueprint $table) {
            $table->id();
            $table->foreignId('staff_id')->constrained('staff')->cascadeOnDelete();
            $table->dateTime('starts_at');
            $table->dateTime('ends_at');
            $table->enum('type', ['leave', 'sick', 'break', 'other'])->default('leave');
            $table->string('note')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['staff_id', 'starts_at', 'ends_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_time_off');
        Schema::dropIfExists('staff_schedule_overrides');
        Schema::dropIfExists('staff_schedules');
        Schema::dropIfExists('staff_service');
        Schema::dropIfExists('staff');
    }
};
