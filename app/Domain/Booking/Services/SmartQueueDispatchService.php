<?php

declare(strict_types=1);

namespace App\Domain\Booking\Services;

use App\Domain\Shared\PhoneNumber;
use App\Models\QueueTicket;
use App\Models\Service;
use App\Models\Shop;
use App\Models\Staff;
use Carbon\CarbonImmutable;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class SmartQueueDispatchService
{
    /**
     * Enqueue a new customer into the central shop queue.
     * If any qualified staff is currently FREE, immediately auto-dispatches to them (Uber-style).
     *
     * @return array{ticket: QueueTicket, position: int, assigned: bool, staff_name: ?string}
     */
    public function enqueue(
        int $shopId,
        int $serviceId,
        string $name,
        string $phone,
        string $source = 'qr_code',
        ?string $scheduledTime = null
    ): array {
        $shop = Shop::findOrFail($shopId);
        $service = Service::findOrFail($serviceId);

        $normalizedPhone = PhoneNumber::normalize($phone);

        return DB::transaction(function () use ($shop, $service, $name, $normalizedPhone, $source, $scheduledTime) {
            // Generate sequential daily queue ticket number (e.g. #101, #102...)
            $today = CarbonImmutable::now('Asia/Colombo')->startOfDay()->setTimezone('UTC');
            $lastTicketToday = QueueTicket::where('shop_id', $shop->id)
                ->where('queued_at', '>=', $today)
                ->max('queue_number');

            $nextQueueNumber = $lastTicketToday ? $lastTicketToday + 1 : 101;

            $ticket = QueueTicket::create([
                'ticket_uuid' => (string) Str::uuid(),
                'shop_id' => $shop->id,
                'service_id' => $service->id,
                'customer_name' => trim($name),
                'customer_phone' => $normalizedPhone,
                'scheduled_time' => $scheduledTime,
                'queue_number' => $nextQueueNumber,
                'status' => 'pending',
                'source' => $source,
                'price_cents' => $service->price_cents,
                'staff_commission_cents' => 0,
                'queued_at' => CarbonImmutable::now('UTC'),
            ]);

            // If scheduled for later, do not dispatch to immediate floor staff now
            $assigned = false;
            $staffName = null;

            if (empty($scheduledTime)) {
                // Check if any active staff in this shop is currently FREE
                $freeStaff = Staff::where('shop_id', $shop->id)
                    ->where('is_active', true)
                    ->where('working_status', 'free')
                    ->orderBy('last_assigned_at', 'asc') // fair round-robin among free staff
                    ->lockForUpdate()
                    ->first();

                if ($freeStaff) {
                    // Instantly auto-assign oldest pending ticket to this free staff
                    $this->assignTicketToStaff($ticket, $freeStaff, $shop);
                    $assigned = true;
                    $staffName = $freeStaff->display_name;
                }
            }

            // Calculate live queue position
            $position = QueueTicket::where('shop_id', $shop->id)
                ->where('status', 'pending')
                ->where('queued_at', '<=', $ticket->queued_at)
                ->count();

            // If not immediately assigned, notify customer that their ticket is confirmed in queue
            if (! $assigned) {
                try {
                    \App\Domain\Notifications\Services\SmsService::notifyBookingConfirmed(
                        $ticket->fresh(['service', 'shop']),
                        $shop,
                        $position
                    );
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::warning('[SmartQueueDispatchService] SMS confirm failed: ' . $e->getMessage());
                }
            }

            return [
                'ticket' => $ticket->fresh(['service', 'staff']),
                'position' => $position,
                'assigned' => $assigned,
                'staff_name' => $staffName,
            ];
        });
    }

    /**
     * Complete current service for staff member and immediately auto-assign the next pending customer.
     *
     * @return array{completed_ticket: QueueTicket, next_ticket: ?QueueTicket, commission_earned_cents: int}
     */
    public function completeCurrentService(int $staffId): array
    {
        return DB::transaction(function () use ($staffId) {
            $staff = Staff::where('id', $staffId)->lockForUpdate()->firstOrFail();
            $shop = Shop::findOrFail($staff->shop_id);

            $currentTicket = null;
            if ($staff->current_ticket_id) {
                $currentTicket = QueueTicket::where('id', $staff->current_ticket_id)
                    ->lockForUpdate()
                    ->first();
            }

            $commissionEarnedCents = 0;

            if ($currentTicket && $currentTicket->status === 'in_progress') {
                // Calculate commission based on shop/staff payroll rule
                $rate = $staff->commission_rate ?? $shop->commission_rate ?? 40.0;
                $commissionEarnedCents = (int) round(($currentTicket->price_cents * $rate) / 100);

                $currentTicket->update([
                    'status' => 'completed',
                    'staff_commission_cents' => $commissionEarnedCents,
                    'completed_at' => CarbonImmutable::now('UTC'),
                ]);

                try {
                    \App\Domain\Notifications\Services\SmsService::notifyServiceCompleted(
                        $currentTicket->fresh(['service', 'shop']),
                        $staff,
                        $shop
                    );
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::warning('[SmartQueueDispatchService] SMS completion failed: ' . $e->getMessage());
                }
            }

            // Transition staff to free
            $staff->update([
                'working_status' => 'free',
                'current_ticket_id' => null,
                'last_assigned_at' => CarbonImmutable::now('UTC'),
            ]);

            // Immediately check the central queue for next pending customer (FIFO)
            $nextTicket = $this->dispatchNextPendingTicket($staff, $shop);

            return [
                'completed_ticket' => $currentTicket,
                'next_ticket' => $nextTicket,
                'commission_earned_cents' => $commissionEarnedCents,
            ];
        });
    }

    /**
     * Change staff working status ('offline' <-> 'free').
     * If turning 'free', immediately pulls the next pending customer from queue if one exists.
     */
    public function updateStaffStatus(int $staffId, string $newStatus): array
    {
        if (! in_array($newStatus, ['offline', 'free'], true)) {
            throw new Exception("Invalid target status. Staff can only toggle between 'offline' and 'free'.");
        }

        return DB::transaction(function () use ($staffId, $newStatus) {
            $staff = Staff::where('id', $staffId)->lockForUpdate()->firstOrFail();
            $shop = Shop::findOrFail($staff->shop_id);

            // Cannot switch to offline while actively in a service
            if ($staff->working_status === 'busy' && $newStatus === 'offline') {
                throw new Exception("Cannot go offline while actively serving a customer. Complete the current service first.");
            }

            $staff->update(['working_status' => $newStatus]);

            $assignedTicket = null;
            if ($newStatus === 'free') {
                $assignedTicket = $this->dispatchNextPendingTicket($staff, $shop);
            }

            return [
                'staff' => $staff->fresh(['currentTicket.service']),
                'assigned_ticket' => $assignedTicket,
            ];
        });
    }

    /**
     * Internal helper to find oldest pending ticket and assign it to the given free staff.
     */
    private function dispatchNextPendingTicket(Staff $staff, Shop $shop): ?QueueTicket
    {
        $oldestPending = QueueTicket::where('shop_id', $shop->id)
            ->where('status', 'pending')
            ->orderBy('queued_at', 'asc')
            ->lockForUpdate()
            ->first();

        if (! $oldestPending) {
            return null;
        }

        $this->assignTicketToStaff($oldestPending, $staff, $shop);

        return $oldestPending->fresh(['service']);
    }

    /**
     * Internal helper to link ticket and staff.
     */
    private function assignTicketToStaff(QueueTicket $ticket, Staff $staff, Shop $shop): void
    {
        $ticket->update([
            'staff_id' => $staff->id,
            'status' => 'in_progress',
            'started_at' => CarbonImmutable::now('UTC'),
        ]);

        $staff->update([
            'working_status' => 'busy',
            'current_ticket_id' => $ticket->id,
            'last_assigned_at' => CarbonImmutable::now('UTC'),
        ]);

        // Trigger SMS notification: Customer chair & barber is ready
        try {
            \App\Domain\Notifications\Services\SmsService::notifyBookingReady(
                $ticket->fresh(['service', 'shop']),
                $staff,
                $shop
            );
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('[SmartQueueDispatchService] SMS ready notification failed: ' . $e->getMessage());
        }
    }
}

