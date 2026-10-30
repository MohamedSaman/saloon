import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
    ChevronLeft,
    ChevronRight,
    Clock,
    User,
    Sliders,
    Store,
    ArrowLeft
} from 'lucide-react';

interface StaffMember {
    id: number;
    name: string;
    display_name: string;
}

interface AppointmentItem {
    id: number;
    reference: string;
    status: 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show';
    starts_at: string;
    ends_at: string;
    total_price_cents: number;
    customer_note: string | null;
    customer: {
        name: string;
        phone_e164: string;
    };
    items: {
        id: number;
        staff_id: number;
        service: { name: string; duration_minutes: number };
        staff: { display_name: string };
    }[];
}

interface SalonBranch {
    id: number;
    name: string;
}

interface Props {
    salons: SalonBranch[];
    currentSalon: SalonBranch;
    selectedDate: string;
    staff: StaffMember[];
    appointments: AppointmentItem[];
}

export default function Calendar({ salons, currentSalon, selectedDate, staff, appointments }: Props) {
    const [activeAppointment, setActiveAppointment] = useState<AppointmentItem | null>(null);

    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleDateChange = (daysDelta: number) => {
        const current = new Date(selectedDate);
        current.setDate(current.getDate() + daysDelta);
        const yyyy = current.getFullYear();
        const mm = String(current.getMonth() + 1).padStart(2, '0');
        const dd = String(current.getDate()).padStart(2, '0');
        router.get('/admin/calendar', {
            salon_id: currentSalon.id,
            date: `${yyyy}-${mm}-${dd}`,
        });
    };

    const handleUpdateStatus = (status: string) => {
        if (!activeAppointment) return;
        router.post(`/admin/appointments/${activeAppointment.id}/status`, {
            status,
        }, {
            onSuccess: () => {
                setActiveAppointment(null);
            }
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'confirmed':
                return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'checked_in':
                return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'completed':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'cancelled':
                return 'bg-slate-100 text-slate-500 border-slate-200';
            case 'no_show':
                return 'bg-rose-50 text-rose-700 border-rose-200';
            default:
                return 'bg-slate-100 text-slate-700';
        }
    };

    return (
        <div className="min-h-screen bg-[#F8F9FB] text-slate-900 flex flex-col selection:bg-slate-900 selection:text-white">
            <Head title={`Admin Calendar — ${selectedDate}`} />

            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 sm:px-6">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <Link href="/book" className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <div>
                            <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                Front Desk Calendar
                            </h1>
                            <p className="text-xs text-slate-500">{currentSalon.name}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Date Navigation */}
                        <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 text-xs card-shadow">
                            <button
                                onClick={() => handleDateChange(-1)}
                                className="p-1 hover:bg-slate-100 rounded-lg text-slate-600"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="px-3 font-bold text-slate-800">{selectedDate}</span>
                            <button
                                onClick={() => handleDateChange(1)}
                                className="p-1 hover:bg-slate-100 rounded-lg text-slate-600"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        <Link
                            href={`/admin/settings?salon_id=${currentSalon.id}`}
                            className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center gap-1.5 card-shadow transition-colors"
                        >
                            <Sliders className="w-4 h-4 text-slate-500" />
                            <span className="hidden sm:inline">Settings</span>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Calendar Staff Columns */}
            <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 flex-1 overflow-x-auto">
                <div className="min-w-[700px]">
                    <div className="grid grid-cols-4 gap-3">
                        {staff.map(s => {
                            const staffAppts = appointments.filter(a =>
                                a.items.some(i => i.staff_id === s.id)
                            );

                            return (
                                <div key={s.id} className="bg-white rounded-2xl border border-slate-200 flex flex-col card-shadow">
                                    <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl flex justify-between items-center">
                                        <h3 className="text-sm font-bold text-slate-900 truncate">{s.display_name}</h3>
                                        <span className="text-[11px] font-bold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full">{staffAppts.length}</span>
                                    </div>

                                    <div className="p-3 space-y-2.5 flex-1 min-h-[300px]">
                                        {staffAppts.length === 0 ? (
                                            <div className="h-full flex items-center justify-center text-xs text-slate-400 py-12">
                                                No appointments
                                            </div>
                                        ) : (
                                            staffAppts.map(appt => (
                                                <div
                                                    key={appt.id}
                                                    onClick={() => setActiveAppointment(appt)}
                                                    className="p-3 rounded-xl bg-white border border-slate-200 hover:border-slate-400 cursor-pointer transition-all space-y-1.5 card-shadow"
                                                >
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="font-extrabold text-slate-900">
                                                            {formatTime(appt.starts_at)}
                                                        </span>
                                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(appt.status)}`}>
                                                            {appt.status}
                                                        </span>
                                                    </div>

                                                    <div className="text-xs font-bold text-slate-800">
                                                        {appt.customer?.name}
                                                    </div>

                                                    <div className="text-[11px] text-slate-500 truncate">
                                                        {appt.items.map(i => i.service.name).join(', ')}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>

            {/* Appointment Detail Modal */}
            {activeAppointment && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <div>
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Reference</span>
                                <h3 className="text-base font-bold text-slate-900 font-mono">{activeAppointment.reference}</h3>
                            </div>
                            <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full border ${getStatusBadge(activeAppointment.status)}`}>
                                {activeAppointment.status}
                            </span>
                        </div>

                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Customer:</span>
                                <span className="font-bold text-slate-900">{activeAppointment.customer?.name} ({activeAppointment.customer?.phone_e164})</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Scheduled Time:</span>
                                <span className="font-bold text-slate-900">{formatTime(activeAppointment.starts_at)} – {formatTime(activeAppointment.ends_at)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Total:</span>
                                <span className="font-extrabold text-slate-900">
                                    LKR {(activeAppointment.total_price_cents / 100).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                            {activeAppointment.customer_note && (
                                <div className="p-2.5 bg-slate-50 rounded-xl text-slate-700 italic border border-slate-100">
                                    "{activeAppointment.customer_note}"
                                </div>
                            )}
                        </div>

                        {/* Status Change Buttons */}
                        <div className="pt-2 border-t border-slate-100 space-y-2">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Change Status</span>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                                <button
                                    onClick={() => handleUpdateStatus('checked_in')}
                                    className="py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold transition-colors"
                                >
                                    Check In
                                </button>
                                <button
                                    onClick={() => handleUpdateStatus('completed')}
                                    className="py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold transition-colors"
                                >
                                    Complete
                                </button>
                                <button
                                    onClick={() => handleUpdateStatus('no_show')}
                                    className="py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold transition-colors"
                                >
                                    No Show
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={() => setActiveAppointment(null)}
                            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors mt-2"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
