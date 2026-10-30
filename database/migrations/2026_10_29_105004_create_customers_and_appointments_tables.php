<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('salon_id')->constrained('salons')->cascadeOnDelete();
            $table->string('name', 120);
            $table->string('phone_e164', 16);
            $table->string('email')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('marketing_opt_in')->default(false);
            $table->dateTime('phone_verified_at')->nullable();
            $table->timestamps();

            $table->unique(['salon_id', 'phone_e164']);
        });

        Schema::create('appointments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('salon_id')->constrained('salons')->cascadeOnDelete();
            $table->char('reference', 9);
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->enum('status', ['confirmed', 'checked_in', 'completed', 'cancelled', 'no_show'])->default('confirmed');
            $table->enum('source', ['online', 'front_desk', 'phone', 'walk_in'])->default('online');
            $table->enum('assignment_method', ['auto', 'customer_choice', 'manual'])->default('auto');
            $table->string('assignment_strategy')->nullable();
            $table->dateTime('starts_at');
            $table->dateTime('ends_at');
            $table->unsignedInteger('total_price_cents');
            $table->string('customer_note', 500)->nullable();
            $table->text('internal_note')->nullable();
            $table->dateTime('cancelled_at')->nullable();
            $table->foreignId('cancelled_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('cancel_reason')->nullable();
            $table->boolean('forced')->default(false);
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->softDeletes();
            $table->timestamps();

            $table->unique(['salon_id', 'reference']);
            $table->index(['salon_id', 'starts_at']);
            $table->index('customer_id');
            $table->index('status');
        });

        Schema::create('appointment_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('appointment_id')->constrained('appointments')->cascadeOnDelete();
            $table->foreignId('service_id')->constrained('services')->cascadeOnDelete();
            $table->foreignId('staff_id')->constrained('staff')->cascadeOnDelete();
            $table->dateTime('starts_at');
            $table->dateTime('ends_at');
            $table->unsignedSmallInteger('buffer_after_minutes')->default(0);
            $table->unsignedInteger('price_cents');
            $table->enum('status', ['confirmed', 'checked_in', 'completed', 'cancelled', 'no_show'])->default('confirmed');
            $table->unsignedTinyInteger('sequence')->default(1);
            $table->timestamps();

            $table->index(['staff_id', 'starts_at', 'ends_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointment_items');
        Schema::dropIfExists('appointments');
        Schema::dropIfExists('customers');
    }
};
