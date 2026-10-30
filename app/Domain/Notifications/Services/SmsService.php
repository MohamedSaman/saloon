<?php

declare(strict_types=1);

namespace App\Domain\Notifications\Services;

use App\Domain\Shared\PhoneNumber;
use App\Models\QueueTicket;
use App\Models\Shop;
use App\Models\Staff;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class SmsService
{
    /**
     * Normalize a phone number to +94XXXXXXXXX format.
     */
    public static function normalizePhoneNumber(?string $phoneNumber): string
    {
        $raw = trim($phoneNumber ?? '');
        if (empty($raw)) {
            return '';
        }

        try {
            return PhoneNumber::normalize($raw);
        } catch (Throwable) {
            $digits = preg_replace('/\D/', '', $raw);
            if (empty($digits)) {
                return '';
            }
            if (str_starts_with($digits, '0') && strlen($digits) === 10) {
                return '+94' . substr($digits, 1);
            }
            if (str_starts_with($digits, '94') && strlen($digits) === 11) {
                return '+' . $digits;
            }
            if (strlen($digits) === 9) {
                return '+94' . $digits;
            }
            return str_starts_with($raw, '+') ? $raw : '+' . $digits;
        }
    }

    /**
     * Send an SMS message via SMSlenz API gateway.
     *
     * @return array{success: bool, message: string, data?: mixed, mocked?: bool, error?: string}
     */
    public static function sendSms(string $phone, string $message): array
    {
        $enabled = config('sms.enabled', true);
        $sendUrl = config('sms.send_url', 'https://smslenz.lk/api/send-sms');
        $userId = (string) config('sms.user_id', '1644');
        $apiKey = (string) config('sms.api_key', '9b60385e-e599-49f3-a30b-fee08a8aa52a');
        $senderId = (string) config('sms.sender_id', 'Jaffna Gold');
        $timeout = (int) config('sms.timeout', 5);

        $normalizedContact = self::normalizePhoneNumber($phone);

        if (empty($normalizedContact)) {
            Log::warning('[SmsService] Skipping SMS send: Empty or invalid phone number.', ['phone' => $phone]);

            return [
                'success' => false,
                'message' => 'Invalid recipient phone number.',
            ];
        }

        // If SMS is disabled in config, mock the success and log for debugging
        if (! $enabled || empty($sendUrl) || empty($apiKey)) {
            Log::info('[SmsService] SMS provider disabled or unconfigured (Mocked).', [
                'recipient' => $normalizedContact,
                'message' => $message,
                'sender_id' => $senderId,
            ]);

            return [
                'success' => true,
                'mocked' => true,
                'message' => 'SMS mocked (Provider disabled or not configured).',
            ];
        }

        $payload = [
            'user_id' => $userId,
            'api_key' => $apiKey,
            'sender_id' => $senderId,
            'contact' => $normalizedContact,
            'message' => $message,
        ];

        try {
            $response = Http::asForm()
                ->withHeaders(['Accept' => 'application/json'])
                ->timeout($timeout)
                ->post($sendUrl, $payload);

            $data = $response->json();

            if ($response->successful() && is_array($data) && ($data['success'] ?? false)) {
                Log::info('[SmsService] SMS dispatched successfully via SMSlenz.', [
                    'recipient' => $normalizedContact,
                    'sender_id' => $senderId,
                    'provider_response' => $data,
                ]);

                return [
                    'success' => true,
                    'message' => $data['message'] ?? 'SMS sent successfully.',
                    'data' => $data,
                ];
            }

            $errorMessage = is_array($data) ? ($data['message'] ?? 'SMS provider rejected the request.') : $response->body();
            Log::error('[SmsService] SMSlenz returned an error.', [
                'status_code' => $response->status(),
                'response' => $errorMessage,
                'recipient' => $normalizedContact,
            ]);

            return [
                'success' => false,
                'message' => $errorMessage,
                'status_code' => $response->status(),
            ];

        } catch (Throwable $e) {
            Log::error('[SmsService] Exception while sending SMS: ' . $e->getMessage(), [
                'recipient' => $normalizedContact,
                'trace' => $e->getTraceAsString(),
            ]);

            return [
                'success' => false,
                'message' => 'SMS gateway communication error: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Check SMSlenz account status and credit balance.
     */
    public static function checkAccountStatus(): array
    {
        $statusUrl = config('sms.status_url', 'https://smslenz.lk/api/account-status');
        $userId = (string) config('sms.user_id', '1644');
        $apiKey = (string) config('sms.api_key', '9b60385e-e599-49f3-a30b-fee08a8aa52a');
        $timeout = (int) config('sms.timeout', 5);

        if (empty($statusUrl) || empty($apiKey)) {
            return [
                'success' => false,
                'message' => 'Missing SMSlenz status URL or API key.',
            ];
        }

        try {
            $response = Http::asForm()
                ->withHeaders(['Accept' => 'application/json'])
                ->timeout($timeout)
                ->post($statusUrl, [
                    'user_id' => $userId,
                    'api_key' => $apiKey,
                ]);

            return $response->json() ?: [
                'success' => $response->successful(),
                'body' => $response->body(),
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to check account status: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * 1. Notify Customer when their booking/turn is READY (Barber chair is available).
     */
    public static function notifyBookingReady(
        QueueTicket $ticket,
        ?Staff $staff = null,
        ?Shop $shop = null
    ): array {
        $phone = $ticket->customer_phone;
        if (empty($phone)) {
            return ['success' => false, 'message' => 'Customer has no phone number recorded.'];
        }

        $customerName = trim($ticket->customer_name ?: 'Valued Customer');
        $ticketNo = $ticket->queue_number ? '#' . $ticket->queue_number : 'Ticket';
        $shopName = $shop?->name ?? ($ticket->shop?->name ?? 'KV Saloon');
        $barberName = $staff?->display_name ?? ($ticket->staff?->display_name ?? 'Our Stylist');
        $serviceName = $ticket->service?->name ?? 'Haircut / Grooming';

        $message = "Dear {$customerName}, your chair is READY at {$shopName}! Stylist {$barberName} is waiting for you ({$ticketNo} - {$serviceName}). Please proceed inside.";

        $result = self::sendSms($phone, $message);

        Log::info('[SmsService] notifyBookingReady sent', [
            'ticket_id' => $ticket->id,
            'phone' => $phone,
            'result' => $result,
        ]);

        return $result;
    }

    /**
     * 2. Notify Customer when they first join the queue / book online.
     */
    public static function notifyBookingConfirmed(
        QueueTicket $ticket,
        ?Shop $shop = null,
        int $queuePosition = 1
    ): array {
        $phone = $ticket->customer_phone;
        if (empty($phone)) {
            return ['success' => false, 'message' => 'Customer has no phone number recorded.'];
        }

        $customerName = trim($ticket->customer_name ?: 'Valued Customer');
        $ticketNo = $ticket->queue_number ? '#' . $ticket->queue_number : 'Ticket';
        $shopName = $shop?->name ?? ($ticket->shop?->name ?? 'KV Saloon');
        $serviceName = $ticket->service?->name ?? 'Haircut / Grooming';

        if (! empty($ticket->scheduled_time)) {
            $message = "Dear {$customerName}, your appointment at {$shopName} ({$serviceName}) is booked for {$ticket->scheduled_time} today ({$ticketNo}). We look forward to serving you!";
        } else {
            $aheadText = $queuePosition > 1 ? " You are #{$queuePosition} in queue." : " You are next up!";
            $message = "Dear {$customerName}, your booking at {$shopName} is confirmed! {$ticketNo} ({$serviceName}).{$aheadText} We will SMS you as soon as your chair is ready.";
        }

        return self::sendSms($phone, $message);
    }

    /**
     * 3. Notify Customer when their service is completed.
     */
    public static function notifyServiceCompleted(
        QueueTicket $ticket,
        ?Staff $staff = null,
        ?Shop $shop = null
    ): array {
        $phone = $ticket->customer_phone;
        if (empty($phone)) {
            return ['success' => false, 'message' => 'Customer has no phone number recorded.'];
        }

        $customerName = trim($ticket->customer_name ?: 'Valued Customer');
        $shopName = $shop?->name ?? ($ticket->shop?->name ?? 'KV Saloon');
        $serviceName = $ticket->service?->name ?? 'service';
        $priceLkr = number_format($ticket->price_cents / 100, 2);

        $message = "Dear {$customerName}, thank you for visiting {$shopName}! Your {$serviceName} is complete (LKR {$priceLkr}). Have a wonderful day!";

        return self::sendSms($phone, $message);
    }
}
