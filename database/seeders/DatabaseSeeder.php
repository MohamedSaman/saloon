<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Domain\Booking\Enums\AppointmentStatus;
use App\Domain\Booking\Enums\AssignmentMethod;
use App\Domain\Booking\Enums\BookingSource;
use App\Models\Appointment;
use App\Models\AppointmentItem;
use App\Models\Branch;
use App\Models\Customer;
use App\Models\OpeningHour;
use App\Models\QueueTicket;
use App\Models\Salon;
use App\Models\SalonSetting;
use App\Models\Service;
use App\Models\ServiceCategory;
use App\Models\Shop;
use App\Models\Staff;
use App\Models\StaffSchedule;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Roles
        $roles = ['super_admin', 'owner', 'receptionist', 'staff'];
        foreach ($roles as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
        }

        // 2. Base Salon
        $mainSalon = Salon::create([
            'name' => 'KV Saloon Chain',
            'slug' => 'kv-saloon-chain',
            'phone' => '+94212223344',
            'email' => 'contact@kvsaloon.lk',
            'address' => 'Northern Province, Sri Lanka',
            'is_active' => true,
        ]);

        SalonSetting::create([
            'salon_id' => $mainSalon->id,
            'timezone' => 'Asia/Colombo',
            'slot_interval_minutes' => 15,
            'lead_time_minutes' => 60,
            'booking_window_days' => 30,
            'cancellation_window_minutes' => 180,
            'assignment_strategy' => 'least_booked_today',
            'otp_required' => false,
            'reminder_offsets_minutes' => [1440, 120],
            'max_services_per_booking' => 4,
            'allow_staff_status_update' => true,
        ]);

        // Opening Hours Mon-Sat 9-19, Sun 10-16
        OpeningHour::create(['salon_id' => $mainSalon->id, 'weekday' => 0, 'opens_at' => '10:00:00', 'closes_at' => '16:00:00']);
        for ($d = 1; $d <= 6; $d++) {
            OpeningHour::create(['salon_id' => $mainSalon->id, 'weekday' => $d, 'opens_at' => '09:00:00', 'closes_at' => '19:00:00']);
        }

        // 3. Branches: Jaffna, Vavuniya, Mannar
        $jaffnaBranch = Branch::create([
            'name' => 'Jaffna Branch',
            'slug' => 'jaffna',
            'city' => 'Jaffna',
            'is_active' => true,
        ]);

        $vavuniyaBranch = Branch::create([
            'name' => 'Vavuniya Branch',
            'slug' => 'vavuniya',
            'city' => 'Vavuniya',
            'is_active' => true,
        ]);

        $mannarBranch = Branch::create([
            'name' => 'Mannar Branch',
            'slug' => 'mannar',
            'city' => 'Mannar',
            'is_active' => true,
        ]);

        // 4. Shops: Jaffna has "Shop A" and "Shop B", Vavuniya has "Vavuniya Central", Mannar has "Mannar Coastal"
        $jaffnaShopA = Shop::create([
            'branch_id' => $jaffnaBranch->id,
            'name' => 'Shop A — Main Street',
            'slug' => 'jaffna-shop-a',
            'address' => '24 Main Street, Jaffna',
            'phone' => '+94212211001',
            'opening_time' => '08:30:00',
            'closing_time' => '20:30:00',
            'staff_capacity' => 6,
            'payroll_type' => 'commission',
            'commission_rate' => 40.00, // 40% commission per cut
            'fixed_daily_wage_cents' => 200000,
            'is_active' => true,
        ]);

        $jaffnaShopB = Shop::create([
            'branch_id' => $jaffnaBranch->id,
            'name' => 'Shop B — Hospital Road',
            'slug' => 'jaffna-shop-b',
            'address' => '88 Hospital Road, Jaffna',
            'phone' => '+94212211002',
            'opening_time' => '09:00:00',
            'closing_time' => '20:00:00',
            'staff_capacity' => 4,
            'payroll_type' => 'commission',
            'commission_rate' => 40.00,
            'fixed_daily_wage_cents' => 200000,
            'is_active' => true,
        ]);

        $vavuniyaShop = Shop::create([
            'branch_id' => $vavuniyaBranch->id,
            'name' => 'Vavuniya Central Station',
            'slug' => 'vavuniya-central',
            'address' => '15 Station Road, Vavuniya',
            'phone' => '+94242221100',
            'opening_time' => '09:00:00',
            'closing_time' => '19:30:00',
            'staff_capacity' => 4,
            'payroll_type' => 'hybrid',
            'commission_rate' => 30.00,
            'fixed_daily_wage_cents' => 250000,
            'is_active' => true,
        ]);

        $mannarShop = Shop::create([
            'branch_id' => $mannarBranch->id,
            'name' => 'Mannar Coastal Lounge',
            'slug' => 'mannar-coastal',
            'address' => '05 Coast Road, Mannar',
            'phone' => '+94232221100',
            'opening_time' => '09:00:00',
            'closing_time' => '19:00:00',
            'staff_capacity' => 3,
            'payroll_type' => 'fixed',
            'commission_rate' => 0.00,
            'fixed_daily_wage_cents' => 300000,
            'is_active' => true,
        ]);

        // 5. Users
        $owner = User::create([
            'salon_id' => $mainSalon->id,
            'name' => 'Owner KV (Admin)',
            'email' => 'owner@kv.test',
            'phone' => '+94770000001',
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);
        $owner->assignRole('owner');

        $receptionist = User::create([
            'salon_id' => $mainSalon->id,
            'name' => 'Reception Desk',
            'email' => 'reception@kv.test',
            'phone' => '+94770000002',
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);
        $receptionist->assignRole('receptionist');

        $nimalUser = User::create([
            'salon_id' => $mainSalon->id,
            'name' => 'Nimal Perera',
            'email' => 'nimal@kv.test',
            'phone' => '+94770000003',
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);
        $nimalUser->assignRole('staff');

        // 6. Service Categories & Standard Services
        $catHair = ServiceCategory::create(['salon_id' => $mainSalon->id, 'name' => 'Haircut & Styling', 'sort_order' => 1]);
        $catBeard = ServiceCategory::create(['salon_id' => $mainSalon->id, 'name' => 'Beard & Shave', 'sort_order' => 2]);
        $catCombo = ServiceCategory::create(['salon_id' => $mainSalon->id, 'name' => 'Value Combos', 'sort_order' => 3]);
        $catFacial = ServiceCategory::create(['salon_id' => $mainSalon->id, 'name' => 'Grooming & Spa', 'sort_order' => 4]);

        $servicesList = [
            ['name' => 'Classic Haircut', 'cat' => $catHair->id, 'dur' => 20, 'price' => 150000, 'desc' => 'Precision cut and styling.'],
            ['name' => 'Haircut + Hair Wash', 'cat' => $catHair->id, 'dur' => 30, 'price' => 200000, 'desc' => 'Scissor/clipper cut with cooling shampoo wash.'],
            ['name' => 'Signature Beard Sculpt & Hot Towel', 'cat' => $catBeard->id, 'dur' => 15, 'price' => 100000, 'desc' => 'Razor finish and steam hot towel treatment.'],
            ['name' => 'Executive Haircut + Beard Trim Combo', 'cat' => $catCombo->id, 'dur' => 35, 'price' => 250000, 'desc' => 'Complete signature grooming package.'],
            ['name' => 'Head Massage & Scalp Tonic', 'cat' => $catFacial->id, 'dur' => 20, 'price' => 120000, 'desc' => 'Deep pressure relaxing head massage.'],
            ['name' => 'Charcoal Face Cleanup', 'cat' => $catFacial->id, 'dur' => 25, 'price' => 180000, 'desc' => 'Exfoliating blackhead removal and facial glow.'],
        ];

        $createdServices = [];
        foreach ($servicesList as $s) {
            $created = Service::create([
                'salon_id' => $mainSalon->id,
                'shop_id' => $jaffnaShopA->id,
                'category_id' => $s['cat'],
                'name' => $s['name'],
                'description' => $s['desc'],
                'duration_minutes' => $s['dur'],
                'buffer_after_minutes' => 5,
                'price_cents' => $s['price'],
                'is_active' => true,
                'bookable_online' => true,
            ]);
            $createdServices[] = $created;
        }

        // 7. Staff Members stationed in Jaffna Shop A (4 Active Barbers)
        $staffMembersData = [
            ['name' => 'Nimal Perera', 'display' => 'Nimal (Master Barber)', 'user_id' => $nimalUser->id, 'status' => 'busy'],
            ['name' => 'Kavindi Silva', 'display' => 'Kavindi (Senior Stylist)', 'user_id' => null, 'status' => 'busy'],
            ['name' => 'Ruwan Jayawardena', 'display' => 'Ruwan (Beard Specialist)', 'user_id' => null, 'status' => 'busy'],
            ['name' => 'Shanika Fernando', 'display' => 'Shanika (Stylist & Spa)', 'user_id' => null, 'status' => 'free'], // 1 free staff ready
        ];

        $createdStaff = [];
        foreach ($staffMembersData as $idx => $st) {
            $staff = Staff::create([
                'salon_id' => $mainSalon->id,
                'shop_id' => $jaffnaShopA->id,
                'user_id' => $st['user_id'],
                'name' => $st['name'],
                'display_name' => $st['display'],
                'working_status' => $st['status'],
                'payroll_type' => 'commission',
                'commission_rate' => 40.00, // 40% commission
                'display_order' => $idx + 1,
                'is_active' => true,
                'bookable_online' => true,
            ]);

            // Attach all services
            foreach ($createdServices as $cs) {
                $staff->services()->attach($cs->id);
            }

            $createdStaff[] = $staff;
        }

        // 8. Create Live Queue Tickets in Jaffna Shop A
        // Staff 0, 1, 2 are busy with in_progress haircuts
        $now = CarbonImmutable::now('UTC');

        $inProgressNames = [
            ['name' => 'Kamal Wijesinghe', 'phone' => '+94771122334', 'staff_idx' => 0, 'service_idx' => 3],
            ['name' => 'Dilani Perera', 'phone' => '+94772233445', 'staff_idx' => 1, 'service_idx' => 1],
            ['name' => 'Senthil Nathan', 'phone' => '+94773344556', 'staff_idx' => 2, 'service_idx' => 2],
        ];

        foreach ($inProgressNames as $i => $item) {
            $svc = $createdServices[$item['service_idx']];
            $assignedStaff = $createdStaff[$item['staff_idx']];

            $ticket = QueueTicket::create([
                'ticket_uuid' => (string) Str::uuid(),
                'shop_id' => $jaffnaShopA->id,
                'service_id' => $svc->id,
                'staff_id' => $assignedStaff->id,
                'customer_name' => $item['name'],
                'customer_phone' => $item['phone'],
                'queue_number' => 101 + $i,
                'status' => 'in_progress',
                'source' => 'qr_code',
                'price_cents' => $svc->price_cents,
                'staff_commission_cents' => (int) round(($svc->price_cents * 40) / 100),
                'queued_at' => $now->subMinutes(25 - ($i * 5)),
                'started_at' => $now->subMinutes(15 - ($i * 5)),
            ]);

            $assignedStaff->update(['current_ticket_id' => $ticket->id]);
        }

        // Pending Queue customers waiting on sofa
        $waitingCustomers = [
            ['name' => 'Pradeep Kumara', 'phone' => '+94774455667', 'service_idx' => 0],
            ['name' => 'Vimalanathan Raman', 'phone' => '+94775566778', 'service_idx' => 3],
            ['name' => 'Anoma Rathnayake', 'phone' => '+94776677889', 'service_idx' => 4],
        ];

        foreach ($waitingCustomers as $j => $wait) {
            $svc = $createdServices[$wait['service_idx']];
            QueueTicket::create([
                'ticket_uuid' => (string) Str::uuid(),
                'shop_id' => $jaffnaShopA->id,
                'service_id' => $svc->id,
                'customer_name' => $wait['name'],
                'customer_phone' => $wait['phone'],
                'queue_number' => 104 + $j,
                'status' => 'pending',
                'source' => 'qr_code',
                'price_cents' => $svc->price_cents,
                'staff_commission_cents' => 0,
                'queued_at' => $now->subMinutes(10 - ($j * 3)),
            ]);
        }

        // Seed 12 completed haircuts for today for Nimal (Staff 0) to demonstrate his daily earnings
        for ($k = 1; $k <= 12; $k++) {
            $svc = $createdServices[array_rand($createdServices)];
            $comm = (int) round(($svc->price_cents * 40) / 100);

            QueueTicket::create([
                'ticket_uuid' => (string) Str::uuid(),
                'shop_id' => $jaffnaShopA->id,
                'service_id' => $svc->id,
                'staff_id' => $createdStaff[0]->id,
                'customer_name' => "Completed Client #{$k}",
                'customer_phone' => "+947700000{$k}",
                'queue_number' => 80 + $k,
                'status' => 'completed',
                'source' => $k % 2 === 0 ? 'qr_code' : 'walk_in_counter',
                'price_cents' => $svc->price_cents,
                'staff_commission_cents' => $comm,
                'queued_at' => $now->subHours(8)->addMinutes($k * 30),
                'started_at' => $now->subHours(8)->addMinutes($k * 30 + 5),
                'completed_at' => $now->subHours(8)->addMinutes($k * 30 + 25),
            ]);
        }

        // 9. Seed Vavuniya, Mannar, and Jaffna Shop B
        $otherShops = [
            [
                'shop' => $vavuniyaShop,
                'staff' => [
                    ['name' => 'Ramesh Thevar', 'display' => 'Ramesh (Senior Barber)', 'status' => 'busy'],
                    ['name' => 'Dinesh Fernando', 'display' => 'Dinesh (Stylist)', 'status' => 'free'],
                    ['name' => 'Siva Kumar', 'display' => 'Siva (Beard Specialist)', 'status' => 'free'],
                ],
                'completed_count' => 9,
            ],
            [
                'shop' => $mannarShop,
                'staff' => [
                    ['name' => 'Antony Jude', 'display' => 'Antony (Master Barber)', 'status' => 'busy'],
                    ['name' => 'Bastian Silva', 'display' => 'Bastian (Stylist)', 'status' => 'free'],
                ],
                'completed_count' => 6,
            ],
            [
                'shop' => $jaffnaShopB,
                'staff' => [
                    ['name' => 'Thivakar Raja', 'display' => 'Thivakar (Stylist)', 'status' => 'busy'],
                    ['name' => 'Janahan S.', 'display' => 'Janahan (Barber)', 'status' => 'free'],
                    ['name' => 'Priya Kumar', 'display' => 'Priya (Spa Specialist)', 'status' => 'free'],
                ],
                'completed_count' => 11,
            ],
        ];

        foreach ($otherShops as $shopData) {
            $shp = $shopData['shop'];

            // Create services for this shop
            $shopServices = [];
            foreach ($servicesList as $s) {
                $shopServices[] = Service::create([
                    'salon_id' => $mainSalon->id,
                    'shop_id' => $shp->id,
                    'category_id' => $s['cat'],
                    'name' => $s['name'],
                    'description' => $s['desc'],
                    'duration_minutes' => $s['dur'],
                    'buffer_after_minutes' => 5,
                    'price_cents' => $s['price'],
                    'is_active' => true,
                    'bookable_online' => true,
                ]);
            }

            // Create staff for this shop
            $shopStaffList = [];
            foreach ($shopData['staff'] as $sIdx => $stf) {
                $createdStf = Staff::create([
                    'salon_id' => $mainSalon->id,
                    'shop_id' => $shp->id,
                    'user_id' => null,
                    'name' => $stf['name'],
                    'display_name' => $stf['display'],
                    'working_status' => $stf['status'],
                    'payroll_type' => $shp->payroll_type,
                    'commission_rate' => $shp->commission_rate,
                    'display_order' => $sIdx + 1,
                    'is_active' => true,
                    'bookable_online' => true,
                ]);

                foreach ($shopServices as $ss) {
                    $createdStf->services()->attach($ss->id);
                }
                $shopStaffList[] = $createdStf;
            }

            // Completed cuts for today
            for ($c = 1; $c <= $shopData['completed_count']; $c++) {
                $sItem = $shopServices[array_rand($shopServices)];
                $stfItem = $shopStaffList[array_rand($shopStaffList)];
                $rate = $shp->commission_rate > 0 ? $shp->commission_rate : 40.0;
                $comm = (int) round(($sItem->price_cents * $rate) / 100);

                QueueTicket::create([
                    'ticket_uuid' => (string) Str::uuid(),
                    'shop_id' => $shp->id,
                    'service_id' => $sItem->id,
                    'staff_id' => $stfItem->id,
                    'customer_name' => "Customer {$shp->city} #{$c}",
                    'customer_phone' => "+9477123400{$c}",
                    'queue_number' => 200 + $c,
                    'status' => 'completed',
                    'source' => 'qr_code',
                    'price_cents' => $sItem->price_cents,
                    'staff_commission_cents' => $comm,
                    'queued_at' => $now->subHours(6)->addMinutes($c * 30),
                    'started_at' => $now->subHours(6)->addMinutes($c * 30 + 5),
                    'completed_at' => $now->subHours(6)->addMinutes($c * 30 + 25),
                ]);
            }
        }
    }
}
