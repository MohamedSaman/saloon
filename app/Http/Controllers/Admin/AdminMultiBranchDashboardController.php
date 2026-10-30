<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\QueueTicket;
use App\Models\Service;
use App\Models\Shop;
use App\Models\Staff;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class AdminMultiBranchDashboardController extends Controller
{
    /**
     * Master "God View" Admin Dashboard with Branch Hierarchy (Vavuniya, Jaffna, Mannar).
     */
    public function index(Request $request): Response
    {
        $branches = Branch::with(['shops.staff', 'shops.services'])->get();

        // Selected shop (default to Jaffna Shop A)
        $defaultShop = Shop::with(['branch', 'staff.currentTicket.service', 'services'])->first();
        $selectedShopId = (int) $request->query('shop_id', $defaultShop?->id ?? 1);

        $selectedShop = Shop::with([
            'branch',
            'staff.currentTicket.service',
            'services'
        ])->find($selectedShopId) ?? $defaultShop;

        // Analytics KPIs for selected shop
        $todayStart = CarbonImmutable::now('Asia/Colombo')->startOfDay()->setTimezone('UTC');
        $monthStart = CarbonImmutable::now('Asia/Colombo')->startOfMonth()->setTimezone('UTC');

        // Revenue: Today, Month, All-Time
        $todayCompleted = QueueTicket::where('shop_id', $selectedShop->id)
            ->where('status', 'completed')
            ->where('completed_at', '>=', $todayStart)
            ->get();
        $todayRevenueCents = (int) $todayCompleted->sum('price_cents');
        $todayCount = $todayCompleted->count();

        $monthCompleted = QueueTicket::where('shop_id', $selectedShop->id)
            ->where('status', 'completed')
            ->where('completed_at', '>=', $monthStart)
            ->get();
        $monthRevenueCents = (int) $monthCompleted->sum('price_cents');
        $monthCount = $monthCompleted->count();

        $allTimeCompleted = QueueTicket::where('shop_id', $selectedShop->id)
            ->where('status', 'completed')
            ->get();
        $allTimeRevenueCents = (int) $allTimeCompleted->sum('price_cents');
        $allTimeCount = $allTimeCompleted->count();

        // Active Staff Count on floor (free or busy)
        $activeStaff = $selectedShop->staff->filter(fn ($s) => in_array($s->working_status, ['free', 'busy'], true));
        $activeStaffCount = $activeStaff->count();

        // Live Queue tickets
        $liveQueue = QueueTicket::with('service')
            ->where('shop_id', $selectedShop->id)
            ->whereIn('status', ['pending', 'in_progress'])
            ->orderBy('queued_at')
            ->get();

        // Financial report overview across all shops
        $allShops = Shop::with('branch')->get();
        $shopSummaries = $allShops->map(function ($shp) use ($todayStart, $monthStart) {
            $tRev = (int) QueueTicket::where('shop_id', $shp->id)
                ->where('status', 'completed')
                ->where('completed_at', '>=', $todayStart)
                ->sum('price_cents');

            $mRev = (int) QueueTicket::where('shop_id', $shp->id)
                ->where('status', 'completed')
                ->where('completed_at', '>=', $monthStart)
                ->sum('price_cents');

            $totalCuts = QueueTicket::where('shop_id', $shp->id)
                ->where('status', 'completed')
                ->count();

            $activeWorkers = Staff::where('shop_id', $shp->id)
                ->whereIn('working_status', ['free', 'busy'])
                ->count();

            return [
                'shop_id' => $shp->id,
                'shop_name' => $shp->name,
                'branch_name' => $shp->branch->name,
                'city' => $shp->branch->city,
                'payroll_type' => $shp->payroll_type,
                'commission_rate' => $shp->commission_rate . '%',
                'active_workers' => $activeWorkers,
                'total_cuts' => $totalCuts,
                'today_revenue' => 'Rs. ' . number_format($tRev / 100, 2),
                'month_revenue' => 'Rs. ' . number_format($mRev / 100, 2),
            ];
        });

        $staffIds = $selectedShop->staff->pluck('id');

        // Completed tickets today for staff in selected shop
        $todayTicketsByStaff = QueueTicket::with('service')
            ->whereIn('staff_id', $staffIds)
            ->where('status', 'completed')
            ->where('completed_at', '>=', $todayStart)
            ->orderByDesc('completed_at')
            ->get()
            ->groupBy('staff_id');

        // All-time completed stats for staff in selected shop
        $allTimeStatsByStaff = QueueTicket::whereIn('staff_id', $staffIds)
            ->where('status', 'completed')
            ->selectRaw('staff_id, count(*) as count, sum(price_cents) as total_price, sum(staff_commission_cents) as total_comm')
            ->groupBy('staff_id')
            ->get()
            ->keyBy('staff_id');

        return Inertia::render('Admin/MultiBranchDashboard', [
            'branches' => $branches->map(fn ($b) => [
                'id' => $b->id,
                'name' => $b->name,
                'slug' => $b->slug,
                'city' => $b->city,
                'is_active' => (bool) $b->is_active,
                'shops' => $b->shops->map(fn ($s) => [
                    'id' => $s->id,
                    'branch_id' => $s->branch_id,
                    'name' => $s->name,
                    'slug' => $s->slug,
                    'address' => $s->address,
                    'phone' => $s->phone,
                    'opening_time' => substr($s->opening_time, 0, 5),
                    'closing_time' => substr($s->closing_time, 0, 5),
                    'staff_capacity' => $s->staff_capacity,
                    'payroll_type' => $s->payroll_type,
                    'commission_rate' => (float) $s->commission_rate,
                    'fixed_daily_wage_cents' => (int) $s->fixed_daily_wage_cents,
                    'is_active' => (bool) $s->is_active,
                    'staff_count' => $s->staff->count(),
                    'services_count' => $s->services->count(),
                ]),
            ]),
            'selectedShop' => [
                'id' => $selectedShop->id,
                'name' => $selectedShop->name,
                'slug' => $selectedShop->slug,
                'branch_id' => $selectedShop->branch->id,
                'branch_name' => $selectedShop->branch->name,
                'city' => $selectedShop->branch->city,
                'address' => $selectedShop->address,
                'phone' => $selectedShop->phone,
                'opening_time' => substr($selectedShop->opening_time, 0, 5),
                'closing_time' => substr($selectedShop->closing_time, 0, 5),
                'staff_capacity' => $selectedShop->staff_capacity,
                'payroll_type' => $selectedShop->payroll_type,
                'commission_rate' => $selectedShop->commission_rate,
                'fixed_daily_wage_cents' => $selectedShop->fixed_daily_wage_cents,
            ],
            'kpis' => [
                'today_revenue' => 'Rs. ' . number_format($todayRevenueCents / 100, 2),
                'today_count' => $todayCount,
                'month_revenue' => 'Rs. ' . number_format($monthRevenueCents / 100, 2),
                'month_count' => $monthCount,
                'all_time_revenue' => 'Rs. ' . number_format($allTimeRevenueCents / 100, 2),
                'all_time_count' => $allTimeCount,
                'active_staff_count' => $activeStaffCount,
                'total_staff_count' => $selectedShop->staff->count(),
            ],
            'activeFloorStaff' => $selectedShop->staff->map(fn ($s) => [
                'id' => $s->id,
                'name' => $s->name,
                'display_name' => $s->display_name,
                'working_status' => $s->working_status,
                'current_customer' => $s->currentTicket?->customer_name,
                'current_service' => $s->currentTicket?->service?->name,
            ]),
            'liveQueue' => $liveQueue->map(fn ($q) => [
                'id' => $q->id,
                'queue_number' => $q->queue_number,
                'customer_name' => $q->customer_name,
                'customer_phone' => $q->customer_phone,
                'service_name' => $q->service->name,
                'status' => $q->status,
                'source' => $q->source,
                'queued_at' => $q->queued_at->setTimezone('Asia/Colombo')->format('g:i A'),
            ]),
            'shopStaff' => $selectedShop->staff->map(function ($s) use ($selectedShop, $todayTicketsByStaff, $allTimeStatsByStaff) {
                $staffTodayTickets = $todayTicketsByStaff->get($s->id, collect());
                $staffAllTime = $allTimeStatsByStaff->get($s->id);

                $todayCutsCount = $staffTodayTickets->count();
                $todayRevenueCents = (int) $staffTodayTickets->sum('price_cents');
                $todayCommissionCents = (int) $staffTodayTickets->sum('staff_commission_cents');

                $allTimeCutsCount = (int) ($staffAllTime?->count ?? 0);
                $allTimeRevenueCents = (int) ($staffAllTime?->total_price ?? 0);
                $allTimeCommissionCents = (int) ($staffAllTime?->total_comm ?? 0);

                $currentTicketData = null;
                if ($s->currentTicket) {
                    $t = $s->currentTicket;
                    $currentTicketData = [
                        'id' => $t->id,
                        'ticket_uuid' => $t->ticket_uuid,
                        'queue_number' => $t->queue_number,
                        'customer_name' => $t->customer_name,
                        'customer_phone' => $t->customer_phone,
                        'service_name' => $t->service?->name ?? 'Hair Service',
                        'service_duration' => $t->service?->duration_minutes ?? 30,
                        'price_cents' => $t->price_cents,
                        'price_rupees' => (int) round($t->price_cents / 100),
                        'formatted_price' => 'Rs. ' . number_format($t->price_cents / 100, 2),
                        'commission_rupees' => (int) round(($t->price_cents * (($s->commission_rate ?? $selectedShop->commission_rate ?? 40) / 100)) / 100),
                        'started_at' => $t->started_at?->setTimezone('Asia/Colombo')->format('g:i A'),
                        'started_diff' => $t->started_at?->diffForHumans(),
                    ];
                }

                return [
                    'id' => $s->id,
                    'name' => $s->name,
                    'display_name' => $s->display_name,
                    'phone' => $s->phone,
                    'email' => $s->email,
                    'working_status' => $s->working_status,
                    'commission_rate' => (float) ($s->commission_rate ?? $selectedShop->commission_rate ?? 40.0),
                    'is_active' => (bool) $s->is_active,
                    'shop_id' => $selectedShop->id,
                    'shop_name' => $selectedShop->name,
                    'branch_name' => $selectedShop->branch->name,
                    'is_cutting_now' => $s->working_status === 'busy' && $s->currentTicket !== null,
                    'current_customer' => $s->currentTicket?->customer_name,
                    'current_service' => $s->currentTicket?->service?->name,
                    'current_ticket' => $currentTicketData,
                    'stats' => [
                        'today_cuts_count' => $todayCutsCount,
                        'today_revenue' => 'Rs. ' . number_format($todayRevenueCents / 100, 2),
                        'today_commission' => 'Rs. ' . number_format($todayCommissionCents / 100, 2),
                        'all_time_cuts_count' => $allTimeCutsCount,
                        'all_time_revenue' => 'Rs. ' . number_format($allTimeRevenueCents / 100, 2),
                        'all_time_commission' => 'Rs. ' . number_format($allTimeCommissionCents / 100, 2),
                        'today_completed_tickets' => $staffTodayTickets->map(fn ($ticket) => [
                            'id' => $ticket->id,
                            'queue_number' => $ticket->queue_number,
                            'customer_name' => $ticket->customer_name,
                            'customer_phone' => $ticket->customer_phone,
                            'service_name' => $ticket->service?->name ?? 'Hair Service',
                            'formatted_price' => 'Rs. ' . number_format($ticket->price_cents / 100, 2),
                            'commission_earned' => 'Rs. ' . number_format($ticket->staff_commission_cents / 100, 2),
                            'completed_at' => $ticket->completed_at?->setTimezone('Asia/Colombo')->format('g:i A') ?? 'Just now',
                        ])->values()->all(),
                    ],
                ];
            }),
            'services' => $selectedShop->services->map(fn ($svc) => [
                'id' => $svc->id,
                'name' => $svc->name,
                'duration_minutes' => $svc->duration_minutes,
                'price_cents' => $svc->price_cents,
                'price_rupees' => (int) round($svc->price_cents / 100),
                'formatted_price' => 'Rs. ' . number_format($svc->price_cents / 100, 2),
                'is_active' => (bool) $svc->is_active,
            ]),
            'shopSummaries' => $shopSummaries,
            'smsConfig' => [
                'enabled' => config('sms.enabled'),
                'provider' => config('sms.provider'),
                'sender_id' => config('sms.sender_id'),
                'user_id' => config('sms.user_id'),
            ],
        ]);
    }

    /**
     * Update Shop Settings (Operating Hours, Headcount, Salary rules, Services).
     */
    public function updateShopSettings(Request $request, int $shopId): RedirectResponse
    {
        $validated = $request->validate([
            'opening_time' => ['required', 'string'],
            'closing_time' => ['required', 'string'],
            'staff_capacity' => ['required', 'integer', 'min:1', 'max:50'],
            'payroll_type' => ['required', 'string', 'in:commission,fixed,hybrid'],
            'commission_rate' => ['required', 'numeric', 'min:0', 'max:100'],
            'fixed_daily_wage_cents' => ['required', 'integer', 'min:0'],
        ]);

        $shop = Shop::findOrFail($shopId);
        $shop->update([
            'opening_time' => $validated['opening_time'] . ':00',
            'closing_time' => $validated['closing_time'] . ':00',
            'staff_capacity' => $validated['staff_capacity'],
            'payroll_type' => $validated['payroll_type'],
            'commission_rate' => $validated['commission_rate'],
            'fixed_daily_wage_cents' => $validated['fixed_daily_wage_cents'],
        ]);

        return back()->with('success', 'Shop settings and payroll configuration updated.');
    }

    /**
     * Add a service to this shop's catalog.
     */
    public function storeService(Request $request, int $shopId): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'duration_minutes' => ['required', 'integer', 'min:5', 'max:300'],
            'price_cents' => ['required', 'integer', 'min:100'],
        ]);

        $shop = Shop::findOrFail($shopId);

        Service::create([
            'salon_id' => 1,
            'shop_id' => $shop->id,
            'category_id' => 1,
            'name' => $validated['name'],
            'duration_minutes' => $validated['duration_minutes'],
            'price_cents' => $validated['price_cents'],
            'is_active' => true,
        ]);

        return back()->with('success', 'New service added to catalog.');
    }

    /**
     * Update existing service price and details.
     */
    public function updateService(Request $request, int $serviceId): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'duration_minutes' => ['required', 'integer', 'min:5', 'max:300'],
            'price_cents' => ['required', 'integer', 'min:100'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $service = Service::findOrFail($serviceId);
        $service->update([
            'name' => $validated['name'],
            'duration_minutes' => $validated['duration_minutes'],
            'price_cents' => $validated['price_cents'],
            'is_active' => $request->boolean('is_active', true),
        ]);

        return back()->with('success', "Service '{$service->name}' successfully updated.");
    }

    /**
     * Delete service from catalog.
     */
    public function deleteService(int $serviceId): RedirectResponse
    {
        $service = Service::findOrFail($serviceId);
        $name = $service->name;
        $service->delete();

        return back()->with('success', "Service '{$name}' deleted.");
    }

    /**
     * Add a new staff member to a shop.
     */
    public function storeStaff(Request $request, int $shopId): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'display_name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:120', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'phone' => ['nullable', 'string', 'max:30'],
            'commission_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'working_status' => ['nullable', 'string', 'in:free,busy,offline'],
        ]);

        $shop = Shop::findOrFail($shopId);

        // 1. Create User authentication account for staff member
        $user = User::create([
            'salon_id' => 1,
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'password' => Hash::make($validated['password']),
            'is_active' => true,
        ]);
        $user->assignRole('staff');

        // 2. Create Staff profile tied to user_id
        $staff = Staff::create([
            'salon_id' => 1,
            'shop_id' => $shop->id,
            'user_id' => $user->id,
            'name' => $validated['name'],
            'display_name' => $validated['display_name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'working_status' => $validated['working_status'] ?? 'free',
            'commission_rate' => $validated['commission_rate'] ?? $shop->commission_rate ?? 40.0,
            'payroll_type' => $shop->payroll_type,
            'is_active' => true,
            'bookable_online' => true,
        ]);

        // Attach all existing shop services by default
        $serviceIds = $shop->services()->pluck('id')->toArray();
        if (! empty($serviceIds)) {
            $staff->services()->sync($serviceIds);
        }

        return back()->with('success', "New staff specialist '{$staff->display_name}' created with login credentials.");
    }

    /**
     * Update an existing staff member.
     */
    public function updateStaff(Request $request, int $staffId): RedirectResponse
    {
        $staff = Staff::findOrFail($staffId);

        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:120'],
            'display_name' => ['required', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:120'],
            'password' => ['nullable', 'string', 'min:6'],
            'commission_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'working_status' => ['required', 'string', 'in:free,busy,offline'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $updateData = [
            'display_name' => $validated['display_name'],
            'phone' => $validated['phone'] ?? $staff->phone,
            'email' => $validated['email'] ?? $staff->email,
            'commission_rate' => $validated['commission_rate'] !== null ? (float) $validated['commission_rate'] : $staff->commission_rate,
            'working_status' => $validated['working_status'],
            'is_active' => $request->boolean('is_active', true),
        ];

        if (!empty($validated['name'])) {
            $updateData['name'] = $validated['name'];
        }

        // If explicitly set to free or offline from busy, clear active ticket assignment
        if (in_array($validated['working_status'], ['free', 'offline'], true) && $staff->working_status === 'busy') {
            $updateData['current_ticket_id'] = null;
        }

        // Update or create linked User login credentials
        $targetEmail = $validated['email'] ?? $staff->email;
        if (!empty($validated['password']) || (!empty($targetEmail) && !$staff->user_id)) {
            if ($staff->user_id && $staff->user) {
                $userUpdates = [];
                if (!empty($targetEmail)) {
                    $userUpdates['email'] = $targetEmail;
                }
                if (!empty($validated['name'])) {
                    $userUpdates['name'] = $validated['name'];
                }
                if (!empty($validated['password'])) {
                    $userUpdates['password'] = Hash::make($validated['password']);
                }
                $staff->user->update($userUpdates);
            } elseif (!empty($targetEmail)) {
                // Staff was seeded without a User record; create one now!
                $user = User::create([
                    'salon_id' => 1,
                    'name' => $validated['name'] ?? $staff->name,
                    'email' => $targetEmail,
                    'phone' => $validated['phone'] ?? $staff->phone,
                    'password' => Hash::make($validated['password'] ?? 'password'),
                    'is_active' => true,
                ]);
                $user->assignRole('staff');
                $updateData['user_id'] = $user->id;
            }
        }

        $staff->update($updateData);

        return back()->with('success', "Staff '{$staff->display_name}' updated successfully.");
    }

    /**
     * Remove / Delete staff member.
     */
    public function deleteStaff(int $staffId): RedirectResponse
    {
        $staff = Staff::findOrFail($staffId);
        $name = $staff->display_name;
        $staff->delete();

        return back()->with('success', "Staff member '{$name}' removed.");
    }

    /**
     * Send test SMS using configured SMSlenz gateway.
     */
    public function sendTestSms(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'phone' => ['required', 'string'],
            'type' => ['nullable', 'string', 'in:ready,confirmed,completed,custom'],
            'message' => ['nullable', 'string'],
        ]);

        $phone = $validated['phone'];
        $type = $validated['type'] ?? 'ready';

        if ($type === 'ready') {
            $msg = "Dear Valued Customer, your chair is READY at Jaffna Shop A! Stylist Kajan is waiting for you (Ticket #105 - Haircut & Beard Trim). Please proceed inside.";
        } elseif ($type === 'confirmed') {
            $msg = "Dear Valued Customer, your booking at Jaffna Shop A is confirmed! Ticket #105 (Haircut & Beard Trim). You are #2 in queue. We will SMS you when your chair is ready.";
        } elseif ($type === 'completed') {
            $msg = "Dear Valued Customer, thank you for visiting Jaffna Shop A! Your service is complete (LKR 2,500.00). Have a wonderful day!";
        } else {
            $msg = ! empty($validated['message']) ? $validated['message'] : "Test SMS from KV Saloon Smart Queue system via SMSlenz.";
        }

        $result = \App\Domain\Notifications\Services\SmsService::sendSms($phone, $msg);

        return response()->json($result);
    }

    /**
     * Check live SMSlenz account status and credits balance.
     */
    public function smsAccountStatus(): JsonResponse
    {
        $status = \App\Domain\Notifications\Services\SmsService::checkAccountStatus();

        return response()->json($status);
    }

    /**
     * Create a new Branch.
     */
    public function storeBranch(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'city' => ['required', 'string', 'max:100'],
        ]);

        $slug = $this->generateUniqueBranchSlug($validated['name']);

        $branch = Branch::create([
            'name' => $validated['name'],
            'slug' => $slug,
            'city' => $validated['city'],
            'is_active' => true,
        ]);

        return back()->with('success', "Branch '{$branch->name}' successfully established.");
    }

    /**
     * Update an existing Branch.
     */
    public function updateBranch(Request $request, int $branchId): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'city' => ['required', 'string', 'max:100'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $branch = Branch::findOrFail($branchId);
        $branch->update([
            'name' => $validated['name'],
            'city' => $validated['city'],
            'is_active' => $request->boolean('is_active', true),
        ]);

        return back()->with('success', "Branch '{$branch->name}' updated.");
    }

    /**
     * Delete a Branch (Safeguard: Block if branch contains active shops).
     */
    public function deleteBranch(int $branchId): RedirectResponse
    {
        $branch = Branch::findOrFail($branchId);
        $shopsCount = $branch->shops()->count();

        if ($shopsCount > 0) {
            return back()->with('error', "Cannot delete branch '{$branch->name}' because it contains {$shopsCount} active storefront(s). Please move or delete its storefronts first.");
        }

        $name = $branch->name;
        $branch->delete();

        return back()->with('success', "Branch '{$name}' deleted successfully.");
    }

    /**
     * Deploy a new Storefront under a Branch and seed starter catalog services.
     */
    public function storeShop(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'branch_id' => ['required', 'integer', 'exists:branches,id'],
            'name' => ['required', 'string', 'max:120'],
            'address' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'opening_time' => ['required', 'string'],
            'closing_time' => ['required', 'string'],
            'staff_capacity' => ['required', 'integer', 'min:1', 'max:50'],
            'payroll_type' => ['required', 'string', 'in:commission,fixed,hybrid'],
            'commission_rate' => ['required', 'numeric', 'min:0', 'max:100'],
            'fixed_daily_wage_cents' => ['nullable', 'integer', 'min:0'],
        ]);

        $slug = $this->generateUniqueShopSlug($validated['name']);

        $openTime = strlen($validated['opening_time']) === 5 ? $validated['opening_time'] . ':00' : $validated['opening_time'];
        $closeTime = strlen($validated['closing_time']) === 5 ? $validated['closing_time'] . ':00' : $validated['closing_time'];

        $shop = Shop::create([
            'branch_id' => $validated['branch_id'],
            'name' => $validated['name'],
            'slug' => $slug,
            'address' => $validated['address'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'opening_time' => $openTime,
            'closing_time' => $closeTime,
            'staff_capacity' => $validated['staff_capacity'],
            'payroll_type' => $validated['payroll_type'],
            'commission_rate' => $validated['commission_rate'],
            'fixed_daily_wage_cents' => $validated['fixed_daily_wage_cents'] ?? 250000,
            'is_active' => true,
        ]);

        // Auto-seed standard starter services so queue engine and customer bookings function immediately
        $defaultServices = [
            ['name' => 'Classic Haircut', 'duration_minutes' => 30, 'price_cents' => 150000],
            ['name' => 'Beard Grooming & Shape', 'duration_minutes' => 20, 'price_cents' => 100000],
            ['name' => 'Executive Haircut & Beard Combo', 'duration_minutes' => 45, 'price_cents' => 250000],
        ];

        foreach ($defaultServices as $svc) {
            Service::create([
                'salon_id' => 1,
                'shop_id' => $shop->id,
                'category_id' => 1,
                'name' => $svc['name'],
                'duration_minutes' => $svc['duration_minutes'],
                'price_cents' => $svc['price_cents'],
                'is_active' => true,
            ]);
        }

        return redirect()->route('admin.multibranch', ['shop_id' => $shop->id])
            ->with('success', "Storefront '{$shop->name}' deployed with starter catalog and activated!");
    }

    /**
     * Update an existing Storefront's operational parameters.
     */
    public function updateShop(Request $request, int $shopId): RedirectResponse
    {
        $validated = $request->validate([
            'branch_id' => ['required', 'integer', 'exists:branches,id'],
            'name' => ['required', 'string', 'max:120'],
            'address' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'opening_time' => ['required', 'string'],
            'closing_time' => ['required', 'string'],
            'staff_capacity' => ['required', 'integer', 'min:1', 'max:50'],
            'payroll_type' => ['required', 'string', 'in:commission,fixed,hybrid'],
            'commission_rate' => ['required', 'numeric', 'min:0', 'max:100'],
            'fixed_daily_wage_cents' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $shop = Shop::findOrFail($shopId);

        $openTime = strlen($validated['opening_time']) === 5 ? $validated['opening_time'] . ':00' : $validated['opening_time'];
        $closeTime = strlen($validated['closing_time']) === 5 ? $validated['closing_time'] . ':00' : $validated['closing_time'];

        $shop->update([
            'branch_id' => $validated['branch_id'],
            'name' => $validated['name'],
            'address' => $validated['address'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'opening_time' => $openTime,
            'closing_time' => $closeTime,
            'staff_capacity' => $validated['staff_capacity'],
            'payroll_type' => $validated['payroll_type'],
            'commission_rate' => $validated['commission_rate'],
            'fixed_daily_wage_cents' => $validated['fixed_daily_wage_cents'] ?? $shop->fixed_daily_wage_cents,
            'is_active' => $request->boolean('is_active', true),
        ]);

        return back()->with('success', "Storefront '{$shop->name}' settings updated successfully.");
    }

    /**
     * Delete a Storefront (Safeguards: Prevent deleting the last remaining shop; check for active tickets).
     */
    public function deleteShop(int $shopId): RedirectResponse
    {
        $totalShops = Shop::count();
        if ($totalShops <= 1) {
            return back()->with('error', 'Cannot delete this storefront. The system requires at least one operating storefront.');
        }

        $shop = Shop::findOrFail($shopId);

        // Safeguard: Check if customers are actively in chairs
        $inProgressCount = QueueTicket::where('shop_id', $shop->id)
            ->where('status', 'in_progress')
            ->count();

        if ($inProgressCount > 0) {
            return back()->with('error', "Cannot delete storefront '{$shop->name}' while {$inProgressCount} customer(s) are actively in service. Please complete or cancel their tickets first.");
        }

        $shopName = $shop->name;

        // Clean up staff associations gracefully
        Staff::where('shop_id', $shop->id)->update([
            'shop_id' => null,
            'working_status' => 'offline',
            'current_ticket_id' => null,
        ]);

        // Remove tickets and services associated with this shop
        QueueTicket::where('shop_id', $shop->id)->delete();
        Service::where('shop_id', $shop->id)->delete();

        $shop->delete();

        $fallbackShop = Shop::first();

        return redirect()->route('admin.multibranch', ['shop_id' => $fallbackShop?->id])
            ->with('success', "Storefront '{$shopName}' deleted. Switched active storefront to {$fallbackShop?->name}.");
    }

    /**
     * Generate unique branch slug.
     */
    private function generateUniqueBranchSlug(string $name): string
    {
        $base = Str::slug($name);
        if ($base === '') {
            $base = 'branch';
        }
        $slug = $base;
        $count = 1;
        while (Branch::where('slug', $slug)->exists()) {
            $slug = "{$base}-" . Str::lower(Str::random(4));
            $count++;
            if ($count > 10) {
                $slug = "{$base}-" . time();
                break;
            }
        }
        return $slug;
    }

    /**
     * Generate unique shop slug.
     */
    private function generateUniqueShopSlug(string $name): string
    {
        $base = Str::slug($name);
        if ($base === '') {
            $base = 'shop';
        }
        $slug = $base;
        $count = 1;
        while (Shop::where('slug', $slug)->exists()) {
            $slug = "{$base}-" . Str::lower(Str::random(4));
            $count++;
            if ($count > 10) {
                $slug = "{$base}-" . time();
                break;
            }
        }
        return $slug;
    }
}

