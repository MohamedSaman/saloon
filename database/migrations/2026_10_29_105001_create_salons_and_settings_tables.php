<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('salons', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->string('slug', 60)->unique();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('address')->nullable();
            $table->string('logo_path')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('salon_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('salon_id')->unique()->constrained('salons')->cascadeOnDelete();
            $table->string('timezone', 50)->default('Asia/Colombo');
            $table->unsignedSmallInteger('slot_interval_minutes')->default(15);
            $table->unsignedSmallInteger('lead_time_minutes')->default(60);
            $table->unsignedSmallInteger('booking_window_days')->default(30);
            $table->unsignedSmallInteger('cancellation_window_minutes')->default(180);
            $table->enum('assignment_strategy', ['least_booked_today', 'round_robin', 'priority'])->default('least_booked_today');
            $table->boolean('otp_required')->default(true);
            $table->json('reminder_offsets_minutes')->nullable();
            $table->unsignedSmallInteger('max_services_per_booking')->default(4);
            $table->boolean('allow_staff_status_update')->default(true);
            $table->timestamps();
        });

        Schema::create('opening_hours', function (Blueprint $table) {
            $table->id();
            $table->foreignId('salon_id')->constrained('salons')->cascadeOnDelete();
            $table->unsignedTinyInteger('weekday'); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
            $table->time('opens_at');
            $table->time('closes_at');
            $table->timestamps();

            $table->unique(['salon_id', 'weekday', 'opens_at']);
        });

        Schema::create('salon_closures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('salon_id')->constrained('salons')->cascadeOnDelete();
            $table->dateTime('starts_at');
            $table->dateTime('ends_at');
            $table->string('reason');
            $table->timestamps();

            $table->index(['salon_id', 'starts_at']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('salon_id')->nullable()->after('id')->constrained('salons')->nullOnDelete();
            $table->string('phone')->nullable()->after('email');
            $table->boolean('is_active')->default(true)->after('phone');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['salon_id']);
            $table->dropColumn(['salon_id', 'phone', 'is_active']);
        });

        Schema::dropIfExists('salon_closures');
        Schema::dropIfExists('opening_hours');
        Schema::dropIfExists('salon_settings');
        Schema::dropIfExists('salons');
    }
};
