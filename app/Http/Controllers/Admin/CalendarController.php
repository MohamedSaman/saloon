<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Domain\Booking\Enums\AppointmentStatus;
use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Salon;
use App\Models\Staff;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CalendarController extends Controller
{
    public function index(Request $request): Response
    {
        $salons = Salon::all();
        $currentSalonId = (int) $request->query('salon_id', $salons->first()?->id ?? 1);
        $currentSalon = Salon::find($currentSalonId) ?? $salons->first();

        $selectedDate = $request->query('date', CarbonImmutable::now('Asia/Colombo')->format('Y-m-d'));
        $date = CarbonImmutable::parse($selectedDate, 'Asia/Colombo');

        $staff = Staff::withoutGlobalScope('salon')
            ->where('salon_id', $currentSalon->id)
            ->where('is_active', true)
            ->with('schedules')
            ->orderBy('display_order')
            ->get();

        $appointments = Appointment::withoutGlobalScope('salon')
            ->where('salon_id', $currentSalon->id)
            ->whereDate('starts_at', $date->format('Y-m-d'))
            ->with(['customer', 'items.service', 'items.staff'])
            ->orderBy('starts_at')
            ->get();

        return Inertia::render('Admin/Calendar', [
            'salons' => $salons,
            'currentSalon' => $currentSalon,
            'selectedDate' => $date->format('Y-m-d'),
            'staff' => $staff,
            'appointments' => $appointments,
        ]);
    }

    /**
     * Update appointment status (checked_in, completed, cancelled, no_show).
     */
    public function updateStatus(Request $request, int $id): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:confirmed,checked_in,completed,cancelled,no_show'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $appointment = Appointment::withoutGlobalScope('salon')->findOrFail($id);
        $statusEnum = AppointmentStatus::from($validated['status']);

        $updateData = ['status' => $statusEnum];
        if ($statusEnum === AppointmentStatus::Cancelled) {
            $updateData['cancelled_at'] = now();
            $updateData['cancel_reason'] = $validated['reason'] ?? 'Cancelled by staff';
        }

        $appointment->update($updateData);

        if ($request->wantsJson()) {
            return response()->json(['success' => true]);
        }

        return back()->with('success', 'Appointment status updated.');
    }
}
