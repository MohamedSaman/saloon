<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\QueueTicket;
use App\Models\Service;
use App\Models\Shop;
use App\Models\Staff;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BranchAndShopManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_can_create_new_branch(): void
    {
        $response = $this->post('/admin/branches', [
            'name' => 'Colombo District Branch',
            'city' => 'Colombo',
        ]);

        $response->assertSessionHas('success');
        $this->assertDatabaseHas('branches', [
            'name' => 'Colombo District Branch',
            'city' => 'Colombo',
            'slug' => 'colombo-district-branch',
            'is_active' => true,
        ]);
    }

    public function test_can_update_existing_branch(): void
    {
        $branch = Branch::create([
            'name' => 'Old Branch Name',
            'slug' => 'old-branch-name',
            'city' => 'Trincomalee',
            'is_active' => true,
        ]);

        $response = $this->post("/admin/branches/{$branch->id}/update", [
            'name' => 'Updated Eastern Regional Branch',
            'city' => 'Batticaloa',
            'is_active' => true,
        ]);

        $response->assertSessionHas('success');
        $this->assertDatabaseHas('branches', [
            'id' => $branch->id,
            'name' => 'Updated Eastern Regional Branch',
            'city' => 'Batticaloa',
        ]);
    }

    public function test_cannot_delete_branch_with_active_shops(): void
    {
        $branch = Branch::whereHas('shops')->first();
        $this->assertNotNull($branch);

        $response = $this->post("/admin/branches/{$branch->id}/delete");

        $response->assertSessionHas('error');
        $this->assertDatabaseHas('branches', ['id' => $branch->id]);
    }

    public function test_can_delete_empty_branch(): void
    {
        $emptyBranch = Branch::create([
            'name' => 'Empty Branch',
            'slug' => 'empty-branch',
            'city' => 'Galle',
            'is_active' => true,
        ]);

        $response = $this->post("/admin/branches/{$emptyBranch->id}/delete");

        $response->assertSessionHas('success');
        $this->assertDatabaseMissing('branches', ['id' => $emptyBranch->id]);
    }

    public function test_can_create_new_shop_with_auto_seeded_starter_services(): void
    {
        $branch = Branch::first();

        $response = $this->post('/admin/shops', [
            'branch_id' => $branch->id,
            'name' => 'Colombo Central Salon',
            'address' => '45 Galle Road, Colombo 03',
            'phone' => '+94 11 234 5678',
            'opening_time' => '08:30',
            'closing_time' => '21:00',
            'staff_capacity' => 8,
            'payroll_type' => 'commission',
            'commission_rate' => 45.0,
            'fixed_daily_wage_cents' => 300000,
        ]);

        $shop = Shop::where('name', 'Colombo Central Salon')->first();
        $this->assertNotNull($shop);
        $this->assertEquals($branch->id, $shop->branch_id);
        $this->assertEquals('colombo-central-salon', $shop->slug);
        $this->assertEquals(8, $shop->staff_capacity);

        // Check that starter services were auto-created
        $services = Service::where('shop_id', $shop->id)->get();
        $this->assertCount(3, $services);
        $this->assertTrue($services->contains('name', 'Classic Haircut'));
        $this->assertTrue($services->contains('name', 'Beard Grooming & Shape'));
        $this->assertTrue($services->contains('name', 'Executive Haircut & Beard Combo'));

        $response->assertRedirect(route('admin.multibranch', ['shop_id' => $shop->id]));
    }

    public function test_can_update_shop_operational_settings(): void
    {
        $shop = Shop::first();

        $response = $this->post("/admin/shops/{$shop->id}/update", [
            'branch_id' => $shop->branch_id,
            'name' => $shop->name . ' (Renovated)',
            'address' => 'Updated Address 101',
            'phone' => '+94 77 999 8888',
            'opening_time' => '10:00',
            'closing_time' => '22:00',
            'staff_capacity' => 12,
            'payroll_type' => 'hybrid',
            'commission_rate' => 35.0,
            'fixed_daily_wage_cents' => 350000,
            'is_active' => true,
        ]);

        $response->assertSessionHas('success');
        $this->assertDatabaseHas('shops', [
            'id' => $shop->id,
            'address' => 'Updated Address 101',
            'staff_capacity' => 12,
            'payroll_type' => 'hybrid',
            'commission_rate' => 35.0,
        ]);
    }

    public function test_cannot_delete_the_only_remaining_shop(): void
    {
        // Delete all shops except one
        $shops = Shop::all();
        for ($i = 1; $i < $shops->count(); $i++) {
            $shops[$i]->delete();
        }

        $lastShop = Shop::first();
        $this->assertEquals(1, Shop::count());

        $response = $this->post("/admin/shops/{$lastShop->id}/delete");

        $response->assertSessionHas('error');
        $this->assertDatabaseHas('shops', ['id' => $lastShop->id]);
    }

    public function test_can_delete_shop_and_fallback_to_remaining_shop(): void
    {
        $branch = Branch::first();

        // Create a secondary shop to delete
        $shopToDelete = Shop::create([
            'branch_id' => $branch->id,
            'name' => 'Temporary Pop-up Shop',
            'slug' => 'temp-popup-shop',
            'opening_time' => '09:00:00',
            'closing_time' => '18:00:00',
            'staff_capacity' => 2,
            'payroll_type' => 'commission',
            'commission_rate' => 40.0,
            'fixed_daily_wage_cents' => 200000,
            'is_active' => true,
        ]);

        $this->assertGreaterThan(1, Shop::count());

        $response = $this->post("/admin/shops/{$shopToDelete->id}/delete");

        $response->assertSessionHas('success');
        $this->assertDatabaseMissing('shops', ['id' => $shopToDelete->id]);
    }
}
