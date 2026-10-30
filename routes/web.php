<?php

declare(strict_types=1);

use App\Http\Controllers\Admin\CalendarController;
use App\Http\Controllers\Admin\SettingsController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Public\BookingPortalController;
use App\Http\Controllers\Staff\MyScheduleController;
use Illuminate\Support\Facades\Route;

// Customer Mobile App Booking Portal (Root & /book)
Route::get('/', [\App\Http\Controllers\Queue\QueueBookingController::class, 'showPortal'])->name('home');
Route::get('/book', [\App\Http\Controllers\Queue\QueueBookingController::class, 'showPortal'])->name('booking.portal');

// Admin Gateway & Login Routes
Route::get('/admin', function () {
    if (auth()->check()) {
        $user = auth()->user();
        if ($user->hasRole(['owner', 'super_admin', 'receptionist'])) {
            return redirect()->route('admin.multibranch');
        }
    }
    return redirect()->route('admin.login');
})->name('admin.gateway');

Route::get('/admin/login', function () {
    if (auth()->check() && auth()->user()->hasRole(['owner', 'super_admin', 'receptionist'])) {
        return redirect()->route('admin.multibranch');
    }
    return \Inertia\Inertia::render('Auth/AdminLogin');
})->name('admin.login');

// Staff Gateway & Login Routes
Route::get('/staff', function () {
    if (auth()->check()) {
        $user = auth()->user();
        $staff = $user->staff ?? \App\Models\Staff::where('user_id', $user->id)->first();
        if ($staff) {
            return redirect()->route('staff.portal', ['staff_id' => $staff->id]);
        }
        return redirect()->route('staff.portal');
    }
    return redirect()->route('staff.login');
})->name('staff.gateway');

Route::get('/staff/login', function () {
    if (auth()->check()) {
        $user = auth()->user();
        $staff = $user->staff ?? \App\Models\Staff::where('user_id', $user->id)->first();
        if ($staff) {
            return redirect()->route('staff.portal', ['staff_id' => $staff->id]);
        }
    }
    return \Inertia\Inertia::render('Auth/StaffLogin');
})->name('staff.login');

// Public JSON APIs for real-time reactive slot generation and booking
Route::prefix('api/v1/public')->group(function () {
    Route::get('/slots', [BookingPortalController::class, 'getSlots'])->name('api.public.slots');
    Route::post('/bookings', [BookingPortalController::class, 'store'])->name('api.public.bookings.store');
});

// Signed Customer Booking Self-Management
Route::get('/b/{reference}', [BookingPortalController::class, 'show'])->name('booking.manage');
Route::post('/b/{reference}/cancel', [BookingPortalController::class, 'cancel'])->name('booking.cancel');

// Admin & Front Desk Dashboard
Route::prefix('admin')->group(function () {
    Route::get('/calendar', [CalendarController::class, 'index'])->name('admin.calendar');
    Route::post('/appointments/{id}/status', [CalendarController::class, 'updateStatus'])->name('admin.appointments.status');

    Route::get('/settings', [SettingsController::class, 'index'])->name('admin.settings');
    Route::post('/settings/{salonId}/rules', [SettingsController::class, 'updateRules'])->name('admin.settings.rules');
    Route::post('/settings/{salonId}/opening-hours', [SettingsController::class, 'updateOpeningHours'])->name('admin.settings.hours');
    Route::post('/settings/{salonId}/closures', [SettingsController::class, 'storeClosure'])->name('admin.settings.closures');
    Route::post('/settings/branches', [SettingsController::class, 'storeBranch'])->name('admin.settings.branches');
});

// Staff Mobile Panel
Route::prefix('staff')->group(function () {
    Route::get('/today', [MyScheduleController::class, 'index'])->name('staff.today');
    Route::post('/items/{id}/status', [MyScheduleController::class, 'updateItemStatus'])->name('staff.items.status');
});

// Customer QR Self-Service & Smart Queue
Route::prefix('queue')->group(function () {
    Route::get('/{shopSlug}', [\App\Http\Controllers\Queue\QueueBookingController::class, 'showQrBooking'])->name('queue.qr');
});

Route::prefix('api/queue')->group(function () {
    Route::post('/join', [\App\Http\Controllers\Queue\QueueBookingController::class, 'joinQueue'])->name('api.queue.join');
    Route::get('/status/{ticketUuid}', [\App\Http\Controllers\Queue\QueueBookingController::class, 'ticketStatus'])->name('api.queue.status');
});

// Staff Mobile Smart Queue Portal
Route::prefix('staff/portal')->group(function () {
    Route::get('/', [\App\Http\Controllers\Staff\StaffQueuePortalController::class, 'index'])->name('staff.portal');
    Route::post('/complete', [\App\Http\Controllers\Staff\StaffQueuePortalController::class, 'completeCurrent'])->name('staff.portal.complete');
    Route::post('/walk-in', [\App\Http\Controllers\Staff\StaffQueuePortalController::class, 'addWalkIn'])->name('staff.portal.walkin');
    Route::post('/status', [\App\Http\Controllers\Staff\StaffQueuePortalController::class, 'toggleStatus'])->name('staff.portal.status');
});

// Admin Multi-Branch Management ("God View")
Route::prefix('admin')->group(function () {
    Route::get('/dashboard', [\App\Http\Controllers\Admin\AdminMultiBranchDashboardController::class, 'index'])->name('admin.multibranch');
    Route::post('/shops/{shopId}/settings', [\App\Http\Controllers\Admin\AdminMultiBranchDashboardController::class, 'updateShopSettings'])->name('admin.shops.settings');
    Route::post('/shops/{shopId}/services', [\App\Http\Controllers\Admin\AdminMultiBranchDashboardController::class, 'storeService'])->name('admin.shops.services');
    Route::post('/services/{serviceId}/update', [\App\Http\Controllers\Admin\AdminMultiBranchDashboardController::class, 'updateService'])->name('admin.services.update');
    Route::post('/services/{serviceId}/delete', [\App\Http\Controllers\Admin\AdminMultiBranchDashboardController::class, 'deleteService'])->name('admin.services.delete');

    Route::post('/shops/{shopId}/staff', [\App\Http\Controllers\Admin\AdminMultiBranchDashboardController::class, 'storeStaff'])->name('admin.shops.staff.store');
    Route::post('/staff/{staffId}/update', [\App\Http\Controllers\Admin\AdminMultiBranchDashboardController::class, 'updateStaff'])->name('admin.staff.update');
    Route::post('/staff/{staffId}/delete', [\App\Http\Controllers\Admin\AdminMultiBranchDashboardController::class, 'deleteStaff'])->name('admin.staff.delete');

    // Branch CRUD Controls
    Route::post('/branches', [\App\Http\Controllers\Admin\AdminMultiBranchDashboardController::class, 'storeBranch'])->name('admin.branches.store');
    Route::post('/branches/{branchId}/update', [\App\Http\Controllers\Admin\AdminMultiBranchDashboardController::class, 'updateBranch'])->name('admin.branches.update');
    Route::post('/branches/{branchId}/delete', [\App\Http\Controllers\Admin\AdminMultiBranchDashboardController::class, 'deleteBranch'])->name('admin.branches.delete');

    // Shop Storefront CRUD Controls
    Route::post('/shops', [\App\Http\Controllers\Admin\AdminMultiBranchDashboardController::class, 'storeShop'])->name('admin.shops.store');
    Route::post('/shops/{shopId}/update', [\App\Http\Controllers\Admin\AdminMultiBranchDashboardController::class, 'updateShop'])->name('admin.shops.update');
    Route::post('/shops/{shopId}/delete', [\App\Http\Controllers\Admin\AdminMultiBranchDashboardController::class, 'deleteShop'])->name('admin.shops.delete');

    Route::post('/sms/test', [\App\Http\Controllers\Admin\AdminMultiBranchDashboardController::class, 'sendTestSms'])->name('admin.sms.test');
    Route::get('/sms/status', [\App\Http\Controllers\Admin\AdminMultiBranchDashboardController::class, 'smsAccountStatus'])->name('admin.sms.status');
});

// Authenticated Breeze Profile & Dashboard Routes
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', function () {
        return redirect()->route('admin.multibranch');
    })->name('dashboard');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
