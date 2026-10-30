<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Branches (Vavuniya, Jaffna, Mannar)
        Schema::create('branches', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->string('slug', 60)->unique();
            $table->string('city', 100);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 2. Shops underneath branches (e.g. Jaffna -> Shop A, Shop B)
        Schema::create('shops', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->string('name', 120);
            $table->string('slug', 80)->unique();
            $table->string('address')->nullable();
            $table->string('phone')->nullable();
            $table->time('opening_time')->default('09:00:00');
            $table->time('closing_time')->default('20:00:00');
            $table->unsignedSmallInteger('staff_capacity')->default(6);
            $table->enum('payroll_type', ['commission', 'fixed', 'hybrid'])->default('commission');
            $table->decimal('commission_rate', 5, 2)->default(40.00); // 40% default
            $table->unsignedInteger('fixed_daily_wage_cents')->default(250000); // LKR 2,500
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 3. Add shop and real-time state columns to staff table
        Schema::table('staff', function (Blueprint $table) {
            $table->foreignId('shop_id')->nullable()->after('salon_id')->constrained('shops')->nullOnDelete();
            $table->enum('working_status', ['offline', 'free', 'busy'])->default('offline')->after('is_active');
            $table->unsignedBigInteger('current_ticket_id')->nullable()->after('working_status');
            $table->enum('payroll_type', ['commission', 'fixed', 'hybrid'])->nullable()->after('current_ticket_id');
            $table->decimal('commission_rate', 5, 2)->nullable()->after('payroll_type');
            $table->unsignedInteger('fixed_daily_wage_cents')->nullable()->after('commission_rate');
        });

        // 4. Add shop_id to services
        Schema::table('services', function (Blueprint $table) {
            $table->foreignId('shop_id')->nullable()->after('salon_id')->constrained('shops')->nullOnDelete();
        });

        // 5. Smart Queue Tickets (The central queue)
        Schema::create('queue_tickets', function (Blueprint $table) {
            $table->id();
            $table->uuid('ticket_uuid')->unique();
            $table->foreignId('shop_id')->constrained('shops')->cascadeOnDelete();
            $table->foreignId('service_id')->constrained('services')->cascadeOnDelete();
            $table->foreignId('staff_id')->nullable()->constrained('staff')->nullOnDelete();
            $table->string('customer_name', 120);
            $table->string('customer_phone', 20);
            $table->unsignedInteger('queue_number'); // e.g. 101, 102
            $table->enum('status', ['pending', 'in_progress', 'completed', 'cancelled'])->default('pending');
            $table->enum('source', ['qr_code', 'walk_in_counter'])->default('qr_code');
            $table->unsignedInteger('price_cents');
            $table->unsignedInteger('staff_commission_cents')->default(0);
            $table->dateTime('queued_at');
            $table->dateTime('started_at')->nullable();
            $table->dateTime('completed_at')->nullable();
            $table->timestamps();

            $table->index(['shop_id', 'status', 'queued_at']);
            $table->index(['staff_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('queue_tickets');

        Schema::table('services', function (Blueprint $table) {
            $table->dropForeign(['shop_id']);
            $table->dropColumn(['shop_id']);
        });

        Schema::table('staff', function (Blueprint $table) {
            $table->dropForeign(['shop_id']);
            $table->dropColumn([
                'shop_id',
                'working_status',
                'current_ticket_id',
                'payroll_type',
                'commission_rate',
                'fixed_daily_wage_cents',
            ]);
        });

        Schema::dropIfExists('shops');
        Schema::dropIfExists('branches');
    }
};
