<?php

declare(strict_types=1);

namespace App\Http\Controllers\Staff;

use App\Domain\Booking\Services\SmartQueueDispatchService;
use App\Http\Controllers\Controller;
use App\Models\QueueTicket;
use App\Models\Shop;
use App\Models\Staff;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StaffQueuePortalController extends Controller
{
    public function __construct(
        private readonly SmartQueueDispatchService $dispatchService
    ) {
    }

    /**
     * Mobile-first Staff Dashboard with Live Task, Metrics, and Status.
     */
    public function index(Request $request): Response
    {
        $allStaff = Staff::with('shop.branch')->get();
        $selectedStaffId = (int) $request->query('staff_id', $allStaff->first()?->id ?? 1);

        $staff = Staff::with(['shop.branch', 'shop.services', 'currentTicket.service'])
            ->find($selectedStaffId) ?? $allStaff->first();

        $shop = $staff->shop;

        // Today's metrics (Asia/Colombo timezone)
        $todayStart = CarbonImmutable::now('Asia/Colombo')->startOfDay()->setTimezone('UTC');

        // Services completed today & total
        $completedToday = QueueTicket::where('staff_id', $staff->id)
            ->where('status', 'completed')
            ->where('completed_at', '>=', $todayStart)
            ->get();

        $completedTodayCount = $completedToday->count();
        $earningsTodayCents = (int) $completedToday->sum('staff_commission_cents');

        $totalCompleted = QueueTicket::where('staff_id', $staff->id)
            ->where('status', 'completed')
            ->get();

        $totalCompletedCount = $totalCompleted->count();
        $totalEarningsCents = (int) $totalCompleted->sum('staff_commission_cents');

        // Central Shop Queue overview
        $shopPendingTickets = QueueTicket::with('service')
            ->where('shop_id', $shop->id)
            ->where('status', 'pending')
            ->orderBy('queued_at')
            ->get();

        return Inertia::render('Staff/SmartPortal', [
            'staff' => [
                'id' => $staff->id,
                'name' => $staff->name,
                'display_name' => $staff->display_name,
                'working_status' => $staff->working_status,
                'shop_id' => $shop->id,
                'shop_name' => $shop->name,
                'branch_name' => $shop->branch->name,
                'commission_rate' => $staff->commission_rate ?? $shop->commission_rate,
            ],
            'currentTicket' => $staff->currentTicket ? [
                'id' => $staff->currentTicket->id,
                'ticket_uuid' => $staff->currentTicket->ticket_uuid,
                'queue_number' => $staff->currentTicket->queue_number,
                'customer_name' => $staff->currentTicket->customer_name,
                'customer_phone' => $staff->currentTicket->customer_phone,
                'service_name' => $staff->currentTicket->service->name,
                'service_duration' => $staff->currentTicket->service->duration_minutes,
                'price_cents' => $staff->currentTicket->price_cents,
                'formatted_price' => 'Rs. ' . number_format($staff->currentTicket->price_cents / 100, 2),
                'started_at' => $staff->currentTicket->started_at?->setTimezone('Asia/Colombo')->format('g:i A'),
            ] : null,
            'metrics' => [
                'today_count' => $completedTodayCount,
                'today_earnings' => 'Rs. ' . number_format($earningsTodayCents / 100, 2),
                'total_count' => $totalCompletedCount,
                'total_earnings' => 'Rs. ' . number_format($totalEarningsCents / 100, 2),
            ],
            'shopPendingQueue' => $shopPendingTickets->map(fn ($t) => [
                'id' => $t->id,
                'queue_number' => $t->queue_number,
                'customer_name' => $t->customer_name,
                'service_name' => $t->service->name,
                'source' => $t->source,
                'queued_at' => $t->queued_at->setTimezone('Asia/Colombo')->format('g:i A'),
            ]),
            'shopServices' => $shop->services->map(fn ($s) => [
                'id' => $s->id,
                'name' => $s->name,
                'price_cents' => $s->price_cents,
                'formatted_price' => 'Rs. ' . number_format($s->price_cents / 100, 2),
            ]),
            'allStaff' => $allStaff->map(fn ($s) => [
                'id' => $s->id,
                'display_name' => $s->display_name,
                'working_status' => $s->working_status,
                'shop_name' => $s->shop?->name,
            ]),
        ]);
    }

    /**
     * Staff clicks "Complete" -> triggers status back to FREE and auto-dispatches next customer (Uber-style).
     */
    public function completeCurrent(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'staff_id' => ['required', 'integer', 'exists:staff,id'],
        ]);

        $result = $this->dispatchService->completeCurrentService((int) $validated['staff_id']);

        return response()->json([
            'success' => true,
            'message' => 'Service marked completed! Status set to Free.',
            'next_ticket' => $result['next_ticket'] ? [
                'customer_name' => $result['next_ticket']->customer_name,
                'service_name' => $result['next_ticket']->service->name,
            ] : null,
            'commission_earned' => 'Rs. ' . number_format($result['commission_earned_cents'] / 100, 2),
        ]);
    }

    /**
     * Staff counter entry: "Add Walk-in" -> enqueues customer and auto-assigns if any staff is free.
     */
    public function addWalkIn(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'shop_id' => ['required', 'integer', 'exists:shops,id'],
            'service_id' => ['required', 'integer', 'exists:services,id'],
            'customer_name' => ['required', 'string', 'max:120'],
            'customer_phone' => ['required', 'string', 'min:9', 'max:20'],
        ]);

        $result = $this->dispatchService->enqueue(
            shopId: (int) $validated['shop_id'],
            serviceId: (int) $validated['service_id'],
            name: $validated['customer_name'],
            phone: $validated['customer_phone'],
            source: 'walk_in_counter'
        );

        return response()->json([
            'success' => true,
            'assigned' => $result['assigned'],
            'staff_name' => $result['staff_name'],
            'queue_number' => $result['ticket']->queue_number,
        ]);
    }

    /**
     * Toggle staff working status (offline <-> free).
     */
    public function toggleStatus(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'staff_id' => ['required', 'integer', 'exists:staff,id'],
            'status' => ['required', 'string', 'in:offline,free'],
        ]);

        $result = $this->dispatchService->updateStaffStatus(
            (int) $validated['staff_id'],
            $validated['status']
        );

        return response()->json([
            'success' => true,
            'status' => $result['staff']->working_status,
            'assigned_ticket' => $result['assigned_ticket'] ? [
                'customer_name' => $result['assigned_ticket']->customer_name,
                'service_name' => $result['assigned_ticket']->service->name,
            ] : null,
        ]);
    }
}
