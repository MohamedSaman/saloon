<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\QueueTicket;
use App\Models\Service;
use App\Models\Shop;
use App\Models\Staff;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SmartQueueDispatchTest extends TestCase
{
    use RefreshDatabase;

    private Shop $shopA;
    private Service $haircutService;
    private Staff $barberSaman;
    private Staff $barberKamal;

    protected function setUp(): void
    {
        parent::setUp();

        $salon = \App\Models\Salon::create([
            'name' => 'KV Saloon',
            'slug' => 'kv-saloon',
            'is_active' => true,
        ]);

        $category = \App\Models\ServiceCategory::create([
            'salon_id' => $salon->id,
            'name' => 'Haircuts',
        ]);

        // Create Branch (Jaffna)
        $branch = Branch::create([
            'name' => 'Jaffna Branch',
            'slug' => 'jaffna',
            'city' => 'Jaffna',
            'is_active' => true,
        ]);

        // Create Shop (Shop A)
        $this->shopA = Shop::create([
            'branch_id' => $branch->id,
            'name' => 'Jaffna Central (Shop A)',
            'slug' => 'jaffna-shop-a',
            'address' => 'Shop #12, Ground Floor, Jaffna',
            'phone' => '0212223344',
            'opening_time' => '08:30:00',
            'closing_time' => '20:30:00',
            'staff_capacity' => 4,
            'payroll_type' => 'commission',
            'commission_rate' => 40.00,
            'fixed_daily_wage_cents' => 0,
        ]);

        // Create Service (Haircut + Beard, Rs. 1500)
        $this->haircutService = Service::create([
            'salon_id' => 1,
            'shop_id' => $this->shopA->id,
            'category_id' => 1,
            'name' => 'Haircut + Beard Trim',
            'duration_minutes' => 30,
            'price_cents' => 150000, // Rs. 1,500
            'is_active' => true,
        ]);

        // Create 2 Barbers
        $this->barberSaman = Staff::create([
            'salon_id' => 1,
            'shop_id' => $this->shopA->id,
            'name' => 'Saman Perera',
            'display_name' => 'Saman',
            'working_status' => 'free',
            'payroll_type' => 'commission',
            'commission_rate' => 40.00,
            'is_active' => true,
        ]);

        $this->barberKamal = Staff::create([
            'salon_id' => 1,
            'shop_id' => $this->shopA->id,
            'name' => 'Kamal Silva',
            'display_name' => 'Kamal',
            'working_status' => 'free',
            'payroll_type' => 'commission',
            'commission_rate' => 40.00,
            'is_active' => true,
        ]);
    }

    /**
     * T-Q01: Customer QR joins queue when a barber is free -> instant auto-dispatch.
     */
    public function test_customer_qr_booking_instant_auto_dispatch_when_barber_free(): void
    {
        $response = $this->postJson(route('api.queue.join'), [
            'shop_id' => $this->shopA->id,
            'service_id' => $this->haircutService->id,
            'name' => 'Tech-savvy Customer',
            'phone' => '0771122334',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'assigned' => true,
                'status' => 'in_progress',
                'staff_name' => 'Saman',
                'estimated_wait_minutes' => 0,
            ]);

        $ticket = QueueTicket::where('customer_name', 'Tech-savvy Customer')->first();
        $this->assertNotNull($ticket);
        $this->assertSame('in_progress', $ticket->status);
        $this->assertSame($this->barberSaman->id, $ticket->staff_id);

        // Barber Saman is now busy
        $this->barberSaman->refresh();
        $this->assertSame('busy', $this->barberSaman->working_status);
        $this->assertSame($ticket->id, $this->barberSaman->current_ticket_id);
    }

    /**
     * T-Q02: When all staff are busy, next customer enters central pending queue (FIFO).
     */
    public function test_customer_queued_as_pending_when_all_barbers_busy(): void
    {
        // Set both barbers to busy
        $this->barberSaman->update(['working_status' => 'busy']);
        $this->barberKamal->update(['working_status' => 'busy']);

        $response = $this->postJson(route('api.queue.join'), [
            'shop_id' => $this->shopA->id,
            'service_id' => $this->haircutService->id,
            'name' => 'Waiting Customer 1',
            'phone' => '0779988776',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'assigned' => false,
                'status' => 'pending',
                'position' => 1,
            ]);

        $ticket = QueueTicket::where('customer_name', 'Waiting Customer 1')->first();
        $this->assertSame('pending', $ticket->status);
        $this->assertNull($ticket->staff_id);
    }

    /**
     * T-Q03: Multiple pending customers maintain strict FIFO sequential tickets.
     */
    public function test_multiple_customers_maintain_strict_fifo_order(): void
    {
        $this->barberSaman->update(['working_status' => 'busy']);
        $this->barberKamal->update(['working_status' => 'busy']);

        $res1 = $this->postJson(route('api.queue.join'), [
            'shop_id' => $this->shopA->id,
            'service_id' => $this->haircutService->id,
            'name' => 'First Customer',
            'phone' => '0771000001',
        ]);

        $res2 = $this->postJson(route('api.queue.join'), [
            'shop_id' => $this->shopA->id,
            'service_id' => $this->haircutService->id,
            'name' => 'Second Customer',
            'phone' => '0771000002',
        ]);

        $this->assertSame(1, $res1->json('position'));
        $this->assertSame(2, $res2->json('position'));
        $this->assertLessThan($res2->json('queue_number'), $res1->json('queue_number'));
    }

    /**
     * T-Q04: Staff marks service as completed -> calculates 40% commission and auto-assigns next pending customer.
     */
    public function test_staff_complete_calculates_commission_and_auto_dispatches_next_pending(): void
    {
        // Customer 1 is in progress with Saman
        $this->postJson(route('api.queue.join'), [
            'shop_id' => $this->shopA->id,
            'service_id' => $this->haircutService->id,
            'name' => 'Customer 1',
            'phone' => '0771111111',
        ]);

        // Customer 2 is in progress with Kamal
        $this->postJson(route('api.queue.join'), [
            'shop_id' => $this->shopA->id,
            'service_id' => $this->haircutService->id,
            'name' => 'Customer 2',
            'phone' => '0772222222',
        ]);

        // Customer 3 waits in queue
        $this->postJson(route('api.queue.join'), [
            'shop_id' => $this->shopA->id,
            'service_id' => $this->haircutService->id,
            'name' => 'Waiting Customer 3',
            'phone' => '0773333333',
        ]);

        // Both barbers are now busy
        $this->barberSaman->refresh();
        $this->assertSame('busy', $this->barberSaman->working_status);

        // Barber Saman completes service
        $completeRes = $this->postJson(route('staff.portal.complete'), [
            'staff_id' => $this->barberSaman->id,
        ]);

        $completeRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'commission_earned' => 'Rs. 600.00', // 40% of 1500
                'next_ticket' => [
                    'customer_name' => 'Waiting Customer 3',
                ],
            ]);

        // Saman's first ticket is completed with 40% commission
        $completedTicket = QueueTicket::where('customer_name', 'Customer 1')->first();
        $this->assertSame('completed', $completedTicket->status);
        $this->assertSame(60000, $completedTicket->staff_commission_cents);

        // Waiting Customer 3 is now in progress assigned to Saman
        $ticket3 = QueueTicket::where('customer_name', 'Waiting Customer 3')->first();
        $this->assertSame('in_progress', $ticket3->status);
        $this->assertSame($this->barberSaman->id, $ticket3->staff_id);

        $this->barberSaman->refresh();
        $this->assertSame('busy', $this->barberSaman->working_status);
        $this->assertSame($ticket3->id, $this->barberSaman->current_ticket_id);
    }

    /**
     * T-Q05: Staff walk-in counter entry joins queue and auto-assigns.
     */
    public function test_staff_walk_in_counter_entry(): void
    {
        $response = $this->postJson(route('staff.portal.walkin'), [
            'shop_id' => $this->shopA->id,
            'service_id' => $this->haircutService->id,
            'customer_name' => 'Walk-in Uncle',
            'customer_phone' => '0719876543',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'assigned' => true,
                'staff_name' => 'Saman',
            ]);

        $ticket = QueueTicket::where('customer_name', 'Walk-in Uncle')->first();
        $this->assertSame('walk_in_counter', $ticket->source);
        $this->assertSame('in_progress', $ticket->status);
    }

    /**
     * T-Q06: Staff toggles offline <-> free and pulls pending queue ticket when turning free.
     */
    public function test_staff_status_toggle_pulls_pending_ticket_when_turning_free(): void
    {
        // Put both barbers offline
        $this->barberSaman->update(['working_status' => 'offline']);
        $this->barberKamal->update(['working_status' => 'offline']);

        // Customer queues
        $this->postJson(route('api.queue.join'), [
            'shop_id' => $this->shopA->id,
            'service_id' => $this->haircutService->id,
            'name' => 'Patient Customer',
            'phone' => '0775554433',
        ]);

        $ticket = QueueTicket::where('customer_name', 'Patient Customer')->first();
        $this->assertSame('pending', $ticket->status);

        // Saman comes online (free)
        $response = $this->postJson(route('staff.portal.status'), [
            'staff_id' => $this->barberSaman->id,
            'status' => 'free',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'status' => 'busy', // Automatically busy because a pending customer was immediately assigned!
                'assigned_ticket' => [
                    'customer_name' => 'Patient Customer',
                ],
            ]);

        $ticket->refresh();
        $this->assertSame('in_progress', $ticket->status);
        $this->assertSame($this->barberSaman->id, $ticket->staff_id);
    }

    /**
     * T-Q07: Staff cannot toggle offline while busy in a haircut.
     */
    public function test_staff_cannot_toggle_offline_while_busy(): void
    {
        $this->barberSaman->update(['working_status' => 'busy']);

        $response = $this->postJson(route('staff.portal.status'), [
            'staff_id' => $this->barberSaman->id,
            'status' => 'offline',
        ]);

        $response->assertStatus(500);
    }

    /**
     * T-Q08: Real-time ticket status polling API.
     */
    public function test_ticket_status_polling_api(): void
    {
        $joinRes = $this->postJson(route('api.queue.join'), [
            'shop_id' => $this->shopA->id,
            'service_id' => $this->haircutService->id,
            'name' => 'Polling Customer',
            'phone' => '0778899001',
        ]);

        $uuid = $joinRes->json('ticket_uuid');

        $statusRes = $this->getJson(route('api.queue.status', ['ticketUuid' => $uuid]));

        $statusRes->assertStatus(200)
            ->assertJson([
                'ticket_uuid' => $uuid,
                'customer_name' => 'Polling Customer',
                'service_name' => 'Haircut + Beard Trim',
                'status' => 'in_progress',
                'staff_name' => 'Saman',
            ]);
    }

    /**
     * T-Q09: Admin Multi-Branch Dashboard renders hierarchy and KPIs.
     */
    public function test_admin_multi_branch_dashboard_renders_successfully(): void
    {
        $response = $this->get(route('admin.multibranch'));
        $response->assertStatus(200);
    }

    /**
     * T-Q10: Admin updates shop settings & payroll configuration.
     */
    public function test_admin_updates_shop_settings_and_payroll_rules(): void
    {
        $response = $this->post(route('admin.shops.settings', ['shopId' => $this->shopA->id]), [
            'opening_time' => '09:00',
            'closing_time' => '21:00',
            'staff_capacity' => 6,
            'payroll_type' => 'hybrid',
            'commission_rate' => 45.0,
            'fixed_daily_wage_cents' => 200000, // Rs. 2,000
        ]);

        $response->assertRedirect();

        $this->shopA->refresh();
        $this->assertSame('09:00:00', $this->shopA->opening_time);
        $this->assertSame('21:00:00', $this->shopA->closing_time);
        $this->assertSame(6, $this->shopA->staff_capacity);
        $this->assertSame('hybrid', $this->shopA->payroll_type);
        $this->assertEquals(45.0, $this->shopA->commission_rate);
        $this->assertSame(200000, $this->shopA->fixed_daily_wage_cents);
    }

    /**
     * T-Q11: Customer can book an available free slot for later today.
     */
    public function test_customer_can_book_free_slot_for_later_today(): void
    {
        $response = $this->postJson(route('api.queue.join'), [
            'shop_id' => $this->shopA->id,
            'service_id' => $this->haircutService->id,
            'name' => 'Late Booking Customer',
            'phone' => '0776655443',
            'scheduled_time' => '17:30',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'status' => 'pending',
                'scheduled_time' => '17:30',
            ]);

        $ticket = QueueTicket::where('customer_name', 'Late Booking Customer')->first();
        $this->assertNotNull($ticket);
        $this->assertSame('17:30', $ticket->scheduled_time);
        $this->assertSame('pending', $ticket->status);
    }
}
