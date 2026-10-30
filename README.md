# KV Saloon — Booking & Management System

Phase 1 Online Booking platform built with Laravel 12, Inertia.js 2, React 18, TypeScript, and Tailwind CSS.

## Features
- **Mobile-First Customer Booking Portal** (`/book`): Seamless 4-step booking flow designed for mobile users (Service multi-select, Specialist picker, 14-day horizontal calendar with real-time slot generation, and instant receipt with `.ics` calendar & WhatsApp links).
- **Multi-Branch Support**: Easily switch between locations (e.g. Colombo 03, Jaffna City) or add new branches.
- **Admin Settings Panel** (`/admin/settings`): Configure opening and closing hours per weekday, schedule holidays/closures, customize slot grid intervals (15/20/30m), cancellation windows, and automatic staff assignment rules.
- **Front Desk Calendar** (`/admin/calendar`): Day view with staff columns, appointments, and quick status changes (Checked-In, Completed, No-Show).
- **Stylist Mobile Schedule** (`/staff/today`): Dedicated daily agenda for stylists to check in clients from their phones.
- **Concurrency & Double-Booking Protection**: Pessimistic row locking (`SELECT ... FOR UPDATE ORDER BY id`) and transaction guarantees.

## Quick Start
```bash
# 1. Install dependencies
composer install
npm install

# 2. Configure environment
cp .env.example .env
php artisan key:generate

# 3. Database migrations & seed demo data
php artisan migrate --seed

# 4. Start local development
php artisan serve
npm run dev
```

## Running Tests
```bash
php artisan test
```
