<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        $user = Auth::user();

        // 1. Admin / Owner / Receptionist -> Admin Multi-Branch Dashboard
        if ($user && $user->hasRole(['owner', 'super_admin', 'receptionist'])) {
            return redirect()->intended(route('admin.multibranch'));
        }

        // 2. Staff / Barber -> Personal Staff Smart Queue Portal
        if ($user && ($user->hasRole('staff') || $user->staff)) {
            $staff = $user->staff ?? \App\Models\Staff::where('user_id', $user->id)->first();
            return redirect()->intended(route('staff.portal', ['staff_id' => $staff?->id ?? 1]));
        }

        if (\Illuminate\Support\Facades\Route::has('dashboard')) {
            return redirect()->intended(route('dashboard'));
        }

        return redirect()->intended(route('home'));
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect('/');
    }
}
