import React, { useEffect } from 'react';
import { router } from '@inertiajs/react';

/**
 * Legacy Booking Portal - Replaced by Smart Queue & Auto-Assignment System.
 * Ensures no customer is ever shown the legacy "Select Specialist" screen.
 */
export default function Portal() {
    useEffect(() => {
        window.location.href = '/book';
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="text-center space-y-3">
                <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-600 font-semibold tracking-wide uppercase">
                    Redirecting to Smart Queue...
                </p>
            </div>
        </div>
    );
}
