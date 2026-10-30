<?php

return [
    /*
    |--------------------------------------------------------------------------
    | SMS Notifications Configuration
    |--------------------------------------------------------------------------
    |
    | Supported providers: 'smslenz'
    | Uses SMSlenz API gateway: https://smslenz.lk
    |
    */

    'enabled' => filter_var(
        env('PHONE_OTP_PROVIDER_ENABLED', env('SMS_ENABLED', true)),
        FILTER_VALIDATE_BOOLEAN
    ),

    'provider' => strtolower(
        env('PHONE_OTP_PROVIDER_NAME', env('SMS_PROVIDER', 'smslenz'))
    ),

    'send_url' => env(
        'PHONE_OTP_PROVIDER_SEND_URL',
        'https://smslenz.lk/api/send-sms'
    ),

    'status_url' => env(
        'PHONE_OTP_PROVIDER_STATUS_URL',
        'https://smslenz.lk/api/account-status'
    ),

    'user_id' => (string) env('PHONE_OTP_PROVIDER_USER_ID', '1644'),

    'api_key' => (string) env('PHONE_OTP_PROVIDER_API_KEY', '9b60385e-e599-49f3-a30b-fee08a8aa52a'),

    'sender_id' => env('PHONE_OTP_PROVIDER_SENDER_ID', 'Jaffna Gold'),

    'timeout' => (int) env('PHONE_OTP_PROVIDER_TIMEOUT_SECONDS', 5),
];
