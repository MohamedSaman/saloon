import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import {
    Calendar,
    Clock,
    User,
    CheckCircle2,
    Scissors,
    ArrowLeft,
    Phone,
    ChevronDown
} from 'lucide-react';

interface StaffItem {
    id: number;
    display_name: string;
}

interface AppointmentItem {
    id: number;
    starts_at: string;
    ends_at: string;
    status: string;
    service: {
        name: string;
        duration_minutes: number;
    };
    appointment: {
        id: number;
        reference: string;
        customer_note: string | null;
        customer: {
            name: string;
            phone_e164: string;
        };
    };
}

interface Props {
    staff: StaffItem | null;
    allStaff: StaffItem[];
    selectedDate: string;
    items: AppointmentItem[];
}

export default function Today({ staff, allStaff, selectedDate, items }: Props) {
    const [updatingId, setUpdatingId] = useState<number | null>(null);

    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleStatusUpdate = async (itemId: number, newStatus: string) => {
        setUpdatingId(itemId);
        try {
            await axios.post(`/staff/items/${itemId}/status`, {
                status: newStatus,
            });
            router.reload({ only: ['items'] });
        } catch (err) {
            alert('Failed to update status.');
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8F9FB] text-slate-900 flex flex-col selection:bg-slate-900 selection:text-white">
            <Head title="Stylist Mobile Schedule — KV Saloon" />

            {/* Mobile Header */}
            <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3">
                <div className="max-w-md mx-auto flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <Link href="/book" className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <div>
                            <h1 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                                Stylist Panel
                            </h1>
                            <p className="text-xs text-slate-500 font-semibold">{staff?.display_name}</p>
                        </div>
                    </div>

                    {/* Switch Staff Dropdown */}
                    <div className="relative">
                        <select
                            value={staff?.id || ''}
                            onChange={(e) => router.get('/staff/today', { staff_id: e.target.value })}
                            className="appearance-none bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 rounded-xl pl-3 pr-8 py-1.5 focus:ring-2 focus:ring-slate-900 outline-none"
                        >
                            {allStaff.map(s => (
                                <option key={s.id} value={s.id}>
                                    {s.display_name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                </div>
            </header>

            <main className="max-w-md w-full mx-auto p-4 flex-1 space-y-4">
                <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Today's Schedule ({items.length})
                    </span>
                    <span className="text-xs text-slate-700 font-bold bg-white border border-slate-200 px-2.5 py-1 rounded-full card-shadow">{selectedDate}</span>
                </div>

                {items.length === 0 ? (
                    <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-2 card-shadow">
                        <Scissors className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-sm font-bold text-slate-800">No Appointments Scheduled</p>
                        <p className="text-xs text-slate-500">Your agenda is clear for today.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {items.map(item => (
                            <div
                                key={item.id}
                                className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 card-shadow"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm font-extrabold text-slate-900">
                                            {formatTime(item.starts_at)} – {formatTime(item.ends_at)}
                                        </span>
                                    </div>
                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                                        item.status === 'confirmed'
                                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                                            : item.status === 'checked_in'
                                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    }`}>
                                        {item.status}
                                    </span>
                                </div>

                                <div className="border-t border-slate-100 pt-2 space-y-1">
                                    <div className="text-sm font-bold text-slate-900">
                                        {item.appointment?.customer?.name}
                                    </div>
                                    <a
                                        href={`tel:${item.appointment?.customer?.phone_e164}`}
                                        className="text-xs text-slate-500 flex items-center gap-1 hover:text-slate-900 font-medium"
                                    >
                                        <Phone className="w-3 h-3 text-slate-400" />
                                        {item.appointment?.customer?.phone_e164}
                                    </a>
                                    <div className="text-xs font-bold text-slate-700 pt-1">
                                        Treatment: {item.service.name} ({item.service.duration_minutes} min)
                                    </div>
                                    {item.appointment?.customer_note && (
                                        <div className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-1">
                                            "{item.appointment?.customer_note}"
                                        </div>
                                    )}
                                </div>

                                {/* Status Action */}
                                <div className="pt-1 flex gap-2">
                                    {item.status === 'confirmed' && (
                                        <button
                                            disabled={updatingId === item.id}
                                            onClick={() => handleStatusUpdate(item.id, 'checked_in')}
                                            className="flex-1 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition-colors"
                                        >
                                            Mark Checked-In
                                        </button>
                                    )}
                                    {item.status === 'checked_in' && (
                                        <button
                                            disabled={updatingId === item.id}
                                            onClick={() => handleStatusUpdate(item.id, 'completed')}
                                            className="flex-1 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors"
                                        >
                                            Mark Completed
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
