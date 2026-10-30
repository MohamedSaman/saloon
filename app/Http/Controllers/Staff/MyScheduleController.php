<?php

declare(strict_types=1);

namespace App\Http\Controllers\Staff;

use App\Domain\Booking\Enums\AppointmentStatus;
use App\Http\Controllers\Controller;
use App\Models\AppointmentItem;
use App\Models\Staff;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MyScheduleController extends Controller
{
    /**
     * Show mobile-first day schedule for the logged-in or demo staff member.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $staff = $user ? Staff::where('user_id', $user->id)->first() : null;

        // Fallback to first staff member if not logged in as staff user (demo convenience)
        if (! $staff) {
            $staff = Staff::first();
        }

        $today = CarbonImmutable::now('Asia/Colombo')->format('Y-m-d');
        $dateParam = $request->query('date', $today);
        $date = CarbonImmutable::parse($dateParam, 'Asia/Colombo');

        $items = AppointmentItem::query()
            ->with(['appointment.customer', 'service'])
            ->where('staff_id', $staff?->id)
            ->whereDate('starts_at', $date->format('Y-m-d'))
            ->orderBy('starts_at')
            ->get();

        $allStaff = Staff::all(['id', 'display_name']);

        return Inertia::render('Staff/Today', [
            'staff' => $staff,
            'allStaff' => $allStaff,
            'selectedDate' => $date->format('Y-m-d'),
            'items' => $items,
        ]);
    }

    /**
     * Staff marks an item as checked_in or completed.
     */
    public function updateItemStatus(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:confirmed,checked_in,completed'],
        ]);

        $item = AppointmentItem::findOrFail($id);
        $status = AppointmentStatus::from($validated['status']);

        $item->update(['status' => $status]);
        $item->appointment->update(['status' => $status]);

        return response()->json(['success' => true]);
    }
}
