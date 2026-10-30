<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Booking\Services\SmartQueueDispatchService;
use App\Domain\Notifications\Services\SmsService;
use App\Models\QueueTicket;
use App\Models\Service;
use App\Models\Shop;
use App\Models\Staff;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SmslenzNotificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_normalizes_sri_lankan_phone_numbers_correctly(): void
    {
        $this->assertSame('+94771234567', SmsService::normalizePhoneNumber('0771234567'));
        $this->assertSame('+94771234567', SmsService::normalizePhoneNumber('94771234567'));
        $this->assertSame('+94771234567', SmsService::normalizePhoneNumber('+94771234567'));
        $this->assertSame('+94771234567', SmsService::normalizePhoneNumber('077-123-4567'));
    }

    public function test_smslenz_sends_correct_payload_and_headers(): void
    {
        Http::fake([
            'https://smslenz.lk/api/send-sms' => Http::response([
                'success' => true,
                'message' => 'SMS queued successfully',
                'data' => ['campaign_id' => '12345'],
            ], 200),
        ]);

        $result = SmsService::sendSms('0771234567', 'Your chair is ready!');

        $this->assertTrue($result['success']);
        $this->assertSame('SMS queued successfully', $result['message']);

        Http::assertSent(function ($request) {
            return $request->url() === 'https://smslenz.lk/api/send-sms'
                && $request['user_id'] === '1644'
                && $request['api_key'] === '9b60385e-e599-49f3-a30b-fee08a8aa52a'
                && $request['sender_id'] === 'Jaffna Gold'
                && $request['contact'] === '+94771234567'
                && $request['message'] === 'Your chair is ready!';
        });
    }

    public function test_notify_booking_ready_sends_customized_ready_message(): void
    {
        Http::fake([
            'https://smslenz.lk/api/send-sms' => Http::response([
                'success' => true,
                'message' => 'SMS sent',
            ], 200),
        ]);

        $shop = Shop::first();
        $service = Service::first();
        $staff = Staff::where('shop_id', $shop->id)->first();

        $ticket = QueueTicket::create([
            'ticket_uuid' => 'test-uuid-ready',
            'shop_id' => $shop->id,
            'service_id' => $service->id,
            'customer_name' => 'Ravi Kumar',
            'customer_phone' => '+94778899001',
            'queue_number' => 108,
            'status' => 'in_progress',
            'source' => 'qr_code',
            'price_cents' => 200000,
            'staff_commission_cents' => 80000,
            'queued_at' => now(),
        ]);

        $res = SmsService::notifyBookingReady($ticket, $staff, $shop);

        $this->assertTrue($res['success']);

        Http::assertSent(function ($request) {
            return str_contains($request['message'], 'your chair is READY')
                && str_contains($request['message'], 'Ravi Kumar')
                && str_contains($request['message'], '#108');
        });
    }

    public function test_smart_queue_auto_dispatches_ready_sms_when_barber_is_free(): void
    {
        Http::fake([
            'https://smslenz.lk/api/send-sms' => Http::response([
                'success' => true,
                'message' => 'SMS queued',
            ], 200),
        ]);

        $shop = Shop::first();
        $service = Service::first();

        // Ensure at least one staff is free
        $freeStaff = Staff::where('shop_id', $shop->id)->first();
        $freeStaff->update(['working_status' => 'free', 'is_active' => true]);

        $dispatchService = app(SmartQueueDispatchService::class);
        $result = $dispatchService->enqueue(
            shopId: $shop->id,
            serviceId: $service->id,
            name: 'Thilak S',
            phone: '0775551234',
            source: 'qr_code'
        );

        $this->assertTrue($result['assigned']);
        $this->assertSame('busy', $freeStaff->fresh()->working_status);

        // Verify that SMSlenz received the booking ready dispatch
        Http::assertSent(function ($request) {
            return $request['contact'] === '+94775551234'
                && str_contains($request['message'], 'your chair is READY');
        });
    }

    public function test_admin_can_send_test_sms_endpoint(): void
    {
        Http::fake([
            'https://smslenz.lk/api/send-sms' => Http::response([
                'success' => true,
                'message' => 'Test SMS delivered',
            ], 200),
        ]);

        $response = $this->postJson('/admin/sms/test', [
            'phone' => '0772223344',
            'type' => 'ready',
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true);

        Http::assertSent(function ($request) {
            return $request['contact'] === '+94772223344'
                && str_contains($request['message'], 'your chair is READY');
        });
    }

    public function test_admin_can_query_smslenz_account_status(): void
    {
        Http::fake([
            'https://smslenz.lk/api/account-status' => Http::response([
                'success' => true,
                'message' => 'Account status retrieved successfully',
                'data' => [
                    'status' => 'active',
                    'sms_credit_balance' => '1,448.80',
                ],
            ], 200),
        ]);

        $response = $this->getJson('/admin/sms/status');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.sms_credit_balance', '1,448.80');
    }
}
