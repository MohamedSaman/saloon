<?php

declare(strict_types=1);

namespace App\Http\Controllers\Queue;

use App\Domain\Booking\Services\SmartQueueDispatchService;
use App\Http\Controllers\Controller;
use App\Models\QueueTicket;
use App\Models\Shop;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class QueueBookingController extends Controller
{
    public function __construct(
        private readonly SmartQueueDispatchService $dispatchService
    ) {
    }

    /**
     * Show fast mobile Smart Queue booking portal with Branch & Shop selection (No specialist choosing).
     */
    public function showPortal(Request $request, ?string $shopSlug = null): Response
    {
        $branches = \App\Models\Branch::with(['shops.services' => function ($q) {
            $q->where('is_active', true);
        }])->where('is_active', true)->get();

        // Resolve shop by slug, query parameter, or default to first
        $shop = null;
        if ($shopSlug) {
            $shop = Shop::with(['branch', 'services' => fn ($q) => $q->where('is_active', true)])
                ->where('slug', $shopSlug)
                ->first();
        }

        if (! $shop && $request->filled('shop')) {
            $shop = Shop::with(['branch', 'services' => fn ($q) => $q->where('is_active', true)])
                ->where('slug', $request->query('shop'))
                ->first();
        }

        if (! $shop && ($request->filled('shop_id') || $request->filled('salon_id'))) {
            $id = (int) ($request->query('shop_id') ?? $request->query('salon_id'));
            $shop = Shop::with(['branch', 'services' => fn ($q) => $q->where('is_active', true)])
                ->find($id);
        }

        if (! $shop) {
            $shop = Shop::with(['branch', 'services' => fn ($q) => $q->where('is_active', true)])->first();
        }

        if (! $shop) {
            return Inertia::render('Queue/QrBooking', [
                'branches' => [],
                'shop' => [
                    'id' => 1,
                    'name' => 'KV Saloon',
                    'slug' => 'main-shop',
                    'branch_id' => 1,
                    'branch_name' => 'Northern Province',
                    'city' => 'Jaffna',
                    'address' => null,
                    'phone' => null,
                    'pending_count' => 0,
                    'active_staff_count' => 0,
                ],
                'services' => [],
            ]);
        }

        // Count current pending queue for this shop
        $pendingCount = QueueTicket::where('shop_id', $shop->id)
            ->where('status', 'pending')
            ->count();

        // Count active working barbers on the floor
        $activeStaffCount = $shop->staff()
            ->whereIn('working_status', ['free', 'busy'])
            ->count();

        // Calculate accurate estimate
        $estWaitMinutes = $pendingCount > 0
            ? (int) ceil($pendingCount / max(1, $activeStaffCount)) * 15
            : 0;

        $currentTime = \Carbon\CarbonImmutable::now('Asia/Colombo');
        $estTurnTime = $estWaitMinutes > 0
            ? $currentTime->addMinutes($estWaitMinutes)->format('g:i A')
            : 'Immediate (Barber Free)';

        // Generate today's timeline slots from opening time to closing time
        $openHour = (int) substr($shop->opening_time, 0, 2);
        $openMin = (int) substr($shop->opening_time, 3, 2);
        $closeHour = (int) substr($shop->closing_time, 0, 2);
        $closeMin = (int) substr($shop->closing_time, 3, 2);

        $slotStart = $currentTime->setTime($openHour, $openMin, 0);
        $slotEnd = $currentTime->setTime($closeHour, $closeMin, 0);

        // Fetch today's scheduled tickets to determine busy slots
        $scheduledCounts = QueueTicket::where('shop_id', $shop->id)
            ->whereDate('queued_at', $currentTime->toDateString())
            ->whereNotNull('scheduled_time')
            ->whereIn('status', ['pending', 'in_progress'])
            ->groupBy('scheduled_time')
            ->selectRaw('scheduled_time, count(*) as count')
            ->pluck('count', 'scheduled_time');

        $timelineSlots = [];
        $cursor = $slotStart;
        while ($cursor < $slotEnd) {
            $time24 = $cursor->format('H:i');
            $time12 = $cursor->format('g:i A');
            $isPast = $cursor < $currentTime;
            $bookedCount = $scheduledCounts[$time24] ?? 0;
            $isFree = ! $isPast && ($bookedCount < max(1, $shop->staff_capacity));

            $timelineSlots[] = [
                'time_24' => $time24,
                'time_12' => $time12,
                'is_past' => $isPast,
                'is_free' => $isFree,
                'booked_count' => $bookedCount,
            ];

            $cursor = $cursor->addMinutes(30);
        }

        // Fetch live cutting and waiting tickets for the shop
        $currentCutting = QueueTicket::with(['service', 'staff'])
            ->where('shop_id', $shop->id)
            ->where('status', 'in_progress')
            ->orderBy('started_at')
            ->get()
            ->map(fn ($t) => [
                'queue_number' => $t->queue_number,
                'customer_name' => $t->customer_name,
                'service_name' => $t->service?->name ?? 'Haircut',
                'staff_name' => $t->staff?->display_name ?? 'Barber',
                'started_at' => $t->started_at?->setTimezone('Asia/Colombo')->format('g:i A'),
            ]);

        $currentWaiting = QueueTicket::with('service')
            ->where('shop_id', $shop->id)
            ->where('status', 'pending')
            ->orderBy('queued_at')
            ->get()
            ->map(fn ($t) => [
                'queue_number' => $t->queue_number,
                'customer_name' => $t->customer_name,
                'service_name' => $t->service?->name ?? 'Service',
                'scheduled_time' => $t->scheduled_time,
            ]);

        return Inertia::render('Queue/QrBooking', [
            'branches' => $branches->map(fn ($b) => [
                'id' => $b->id,
                'name' => $b->name,
                'city' => $b->city,
                'shops' => $b->shops->map(fn ($s) => [
                    'id' => $s->id,
                    'name' => $s->name,
                    'slug' => $s->slug,
                    'address' => $s->address,
                    'phone' => $s->phone,
                    'opening_time' => substr($s->opening_time, 0, 5),
                    'closing_time' => substr($s->closing_time, 0, 5),
                    'services_count' => $s->services->count(),
                ]),
            ]),
            'shop' => [
                'id' => $shop->id,
                'name' => $shop->name,
                'slug' => $shop->slug,
                'branch_id' => $shop->branch->id,
                'branch_name' => $shop->branch->name,
                'city' => $shop->branch->city,
                'address' => $shop->address,
                'phone' => $shop->phone,
                'opening_time' => substr($shop->opening_time, 0, 5),
                'closing_time' => substr($shop->closing_time, 0, 5),
                'pending_count' => $pendingCount,
                'active_staff_count' => $activeStaffCount,
                'est_wait_minutes' => $estWaitMinutes,
                'est_turn_time' => $estTurnTime,
            ],
            'timelineSlots' => $timelineSlots,
            'currentCutting' => $currentCutting,
            'currentWaiting' => $currentWaiting,
            'services' => $shop->services->map(fn ($s) => [
                'id' => $s->id,
                'name' => $s->name,
                'description' => $s->description,
                'duration_minutes' => $s->duration_minutes,
                'price_cents' => $s->price_cents,
                'price_rupees' => (int) round($s->price_cents / 100),
                'formatted_price' => 'Rs. ' . number_format($s->price_cents / 100, 2),
            ]),
            'activeBarbers' => $shop->staff()
                ->whereIn('working_status', ['free', 'busy'])
                ->get()
                ->map(fn ($stf) => [
                    'id' => $stf->id,
                    'display_name' => $stf->display_name,
                    'working_status' => $stf->working_status,
                ]),
        ]);
    }

    /**
     * Show fast mobile QR booking page when customer scans QR on table.
     */
    public function showQrBooking(string $shopSlug, Request $request): Response
    {
        return $this->showPortal($request, $shopSlug);
    }

    /**
     * Customer taps "Book" -> enters Central Shop Queue (Uber-style auto-assignment).
     */
    public function joinQueue(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'shop_id' => ['required', 'integer', 'exists:shops,id'],
            'service_id' => ['required', 'integer', 'exists:services,id'],
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'string', 'min:9', 'max:20'],
            'scheduled_time' => ['nullable', 'string', 'max:20'],
        ]);

        $result = $this->dispatchService->enqueue(
            shopId: (int) $validated['shop_id'],
            serviceId: (int) $validated['service_id'],
            name: $validated['name'],
            phone: $validated['phone'],
            source: 'qr_code',
            scheduledTime: $validated['scheduled_time'] ?? null
        );

        $ticket = $result['ticket'];

        return response()->json([
            'success' => true,
            'ticket_uuid' => $ticket->ticket_uuid,
            'queue_number' => $ticket->queue_number,
            'status' => $ticket->status,
            'assigned' => $result['assigned'],
            'staff_name' => $result['staff_name'],
            'position' => $result['position'],
            'scheduled_time' => $ticket->scheduled_time,
            'estimated_wait_minutes' => $result['assigned'] ? 0 : ($result['position'] * 15),
        ], 201);
    }

    /**
     * Real-time polling endpoint for customer waiting screen.
     */
    public function ticketStatus(string $ticketUuid): JsonResponse
    {
        $ticket = QueueTicket::with(['service', 'staff', 'shop'])
            ->where('ticket_uuid', $ticketUuid)
            ->firstOrFail();

        // 1. Get currently cutting tickets in this shop
        $cuttingTickets = QueueTicket::with(['service', 'staff'])
            ->where('shop_id', $ticket->shop_id)
            ->where('status', 'in_progress')
            ->orderBy('started_at')
            ->get()
            ->map(fn ($t) => [
                'queue_number' => $t->queue_number,
                'customer_name' => $t->customer_name,
                'service_name' => $t->service?->name ?? 'Haircut',
                'staff_name' => $t->staff?->display_name ?? 'Barber',
                'started_at' => $t->started_at?->setTimezone('Asia/Colombo')->format('g:i A'),
            ]);

        // 2. Get tickets waiting ahead of this customer
        $waitingAhead = collect();
        $aheadCount = 0;
        if ($ticket->status === 'pending') {
            $aheadQuery = QueueTicket::with('service')
                ->where('shop_id', $ticket->shop_id)
                ->where('status', 'pending')
                ->where('queued_at', '<', $ticket->queued_at)
                ->orderBy('queued_at')
                ->get();

            $aheadCount = $aheadQuery->count();
            $waitingAhead = $aheadQuery->map(fn ($t) => [
                'queue_number' => $t->queue_number,
                'customer_name' => $t->customer_name,
                'service_name' => $t->service?->name ?? 'Service',
            ]);
        }

        // 3. Count active working barbers on the floor
        $activeStaffCount = \App\Models\Staff::where('shop_id', $ticket->shop_id)
            ->whereIn('working_status', ['free', 'busy'])
            ->count();

        // 4. Calculate predicted wait minutes and expected turn time
        $estWaitMinutes = 0;
        $predictedTurnTime = 'Immediate (Next in Chair)';
        $now = \Carbon\CarbonImmutable::now('Asia/Colombo');

        if ($ticket->status === 'in_progress') {
            $predictedTurnTime = 'In Chair Now';
        } elseif ($ticket->status === 'completed') {
            $predictedTurnTime = 'Finished';
        } else {
            $estWaitMinutes = (int) ceil(($aheadCount + 1) * 15 / max(1, $activeStaffCount));
            $predictedTurnTime = $now->addMinutes($estWaitMinutes)->format('g:i A');
        }

        return response()->json([
            'ticket_uuid' => $ticket->ticket_uuid,
            'queue_number' => $ticket->queue_number,
            'customer_name' => $ticket->customer_name,
            'service_name' => $ticket->service->name,
            'formatted_price' => 'Rs. ' . number_format($ticket->price_cents / 100, 2),
            'status' => $ticket->status, // 'pending', 'in_progress', 'completed'
            'position' => $aheadCount + 1,
            'ahead_count' => $aheadCount,
            'staff_name' => $ticket->staff?->display_name,
            'scheduled_time' => $ticket->scheduled_time,
            'estimated_wait_minutes' => $estWaitMinutes,
            'predicted_turn_time' => $predictedTurnTime,
            'shop_name' => $ticket->shop->name,
            'cutting_tickets' => $cuttingTickets,
            'waiting_ahead' => $waitingAhead,
        ]);
    }
}
