<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\OpeningHour;
use App\Models\Salon;
use App\Models\SalonClosure;
use App\Models\SalonSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    /**
     * Display salon and branch settings panel.
     */
    public function index(Request $request): Response
    {
        $salons = Salon::all();
        $currentSalonId = (int) $request->query('salon_id', $salons->first()?->id ?? 1);
        $currentSalon = Salon::find($currentSalonId) ?? $salons->first();

        $settings = SalonSetting::firstOrCreate(
            ['salon_id' => $currentSalon->id],
            [
                'timezone' => 'Asia/Colombo',
                'slot_interval_minutes' => 15,
                'lead_time_minutes' => 60,
                'booking_window_days' => 30,
                'cancellation_window_minutes' => 180,
                'assignment_strategy' => 'least_booked_today',
                'otp_required' => false,
                'max_services_per_booking' => 4,
                'allow_staff_status_update' => true,
            ]
        );

        $openingHours = OpeningHour::withoutGlobalScope('salon')
            ->where('salon_id', $currentSalon->id)
            ->orderBy('weekday')
            ->get();

        $closures = SalonClosure::withoutGlobalScope('salon')
            ->where('salon_id', $currentSalon->id)
            ->orderByDesc('starts_at')
            ->get();

        return Inertia::render('Admin/Settings', [
            'salons' => $salons,
            'currentSalon' => $currentSalon,
            'settings' => $settings,
            'openingHours' => $openingHours,
            'closures' => $closures,
        ]);
    }

    /**
     * Update salon general booking rules.
     */
    public function updateRules(Request $request, int $salonId): RedirectResponse
    {
        $validated = $request->validate([
            'slot_interval_minutes' => ['required', 'integer', 'in:10,15,20,30,45,60'],
            'lead_time_minutes' => ['required', 'integer', 'min:0'],
            'booking_window_days' => ['required', 'integer', 'min:1', 'max:90'],
            'cancellation_window_minutes' => ['required', 'integer', 'min:0'],
            'assignment_strategy' => ['required', 'in:least_booked_today,round_robin,priority'],
            'otp_required' => ['required', 'boolean'],
        ]);

        SalonSetting::updateOrCreate(
            ['salon_id' => $salonId],
            $validated
        );

        return back()->with('success', 'Booking rules updated successfully.');
    }

    /**
     * Update or create weekly opening hours for a salon branch.
     */
    public function updateOpeningHours(Request $request, int $salonId): RedirectResponse
    {
        $validated = $request->validate([
            'hours' => ['required', 'array'],
            'hours.*.weekday' => ['required', 'integer', 'between:0,6'],
            'hours.*.is_closed' => ['required', 'boolean'],
            'hours.*.opens_at' => ['nullable', 'string'],
            'hours.*.closes_at' => ['nullable', 'string'],
        ]);

        foreach ($validated['hours'] as $item) {
            if ($item['is_closed']) {
                OpeningHour::withoutGlobalScope('salon')
                    ->where('salon_id', $salonId)
                    ->where('weekday', $item['weekday'])
                    ->delete();
            } else {
                OpeningHour::withoutGlobalScope('salon')->updateOrCreate(
                    [
                        'salon_id' => $salonId,
                        'weekday' => $item['weekday'],
                    ],
                    [
                        'opens_at' => $item['opens_at'] ?? '09:00:00',
                        'closes_at' => $item['closes_at'] ?? '19:00:00',
                    ]
                );
            }
        }

        return back()->with('success', 'Operating hours updated successfully.');
    }

    /**
     * Add a salon closure / public holiday.
     */
    public function storeClosure(Request $request, int $salonId): RedirectResponse
    {
        $validated = $request->validate([
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after_or_equal:starts_at'],
            'reason' => ['required', 'string', 'max:120'],
        ]);

        SalonClosure::create([
            'salon_id' => $salonId,
            'starts_at' => $validated['starts_at'],
            'ends_at' => $validated['ends_at'],
            'reason' => $validated['reason'],
        ]);

        return back()->with('success', 'Closure scheduled successfully.');
    }

    /**
     * Create a new branch.
     */
    public function storeBranch(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'slug' => ['required', 'string', 'max:60', 'unique:salons,slug'],
            'phone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:120'],
            'address' => ['nullable', 'string', 'max:255'],
        ]);

        $newSalon = Salon::create([
            ...$validated,
            'is_active' => true,
        ]);

        SalonSetting::create([
            'salon_id' => $newSalon->id,
            'timezone' => 'Asia/Colombo',
            'slot_interval_minutes' => 15,
            'lead_time_minutes' => 60,
            'booking_window_days' => 30,
            'cancellation_window_minutes' => 180,
            'assignment_strategy' => 'least_booked_today',
            'otp_required' => false,
            'max_services_per_booking' => 4,
            'allow_staff_status_update' => true,
        ]);

        // Default opening hours Mon-Sat 9-19, Sun 10-16
        OpeningHour::create(['salon_id' => $newSalon->id, 'weekday' => 0, 'opens_at' => '10:00:00', 'closes_at' => '16:00:00']);
        for ($d = 1; $d <= 6; $d++) {
            OpeningHour::create(['salon_id' => $newSalon->id, 'weekday' => $d, 'opens_at' => '09:00:00', 'closes_at' => '19:00:00']);
        }

        return redirect()->route('admin.settings', ['salon_id' => $newSalon->id])
            ->with('success', 'New branch added successfully.');
    }
}
