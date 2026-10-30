import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import {
    Calendar,
    Clock,
    User,
    Scissors,
    MapPin,
    Phone,
    AlertCircle,
    CheckCircle2,
    XCircle,
    ArrowLeft
} from 'lucide-react';

interface AppointmentDetails {
    reference: string;
    status: string;
    starts_at: string;
    total_price: string;
    customer_name: string;
    customer_phone: string;
    staff_name: string;
    salon_name: string;
    salon_phone: string | null;
    salon_address: string | null;
    services: { name: string; price: string }[];
    can_cancel: boolean;
    cancellation_deadline: string;
}

interface Props {
    appointment: AppointmentDetails;
}

export default function Manage({ appointment }: Props) {
    const [status, setStatus] = useState<string>(appointment.status);
    const [cancelling, setCancelling] = useState<boolean>(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState<boolean>(false);
    const [cancelReason, setCancelReason] = useState<string>('');
    const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleCancel = async () => {
        setCancelling(true);
        setMsg(null);
        try {
            const res = await axios.post(`/b/${appointment.reference}/cancel`, {
                reason: cancelReason || 'Cancelled by customer',
            });
            if (res.data.success) {
                setStatus('cancelled');
                setShowCancelConfirm(false);
                setMsg({ type: 'success', text: 'Your appointment has been cancelled successfully.' });
            }
        } catch (err: any) {
            setMsg({
                type: 'error',
                text: err.response?.data?.message || 'Unable to cancel appointment. Please contact salon.',
            });
        } finally {
            setCancelling(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8F9FB] text-slate-900 flex flex-col justify-between selection:bg-slate-900 selection:text-white">
            <Head title={`Manage Booking — ${appointment.reference}`} />

            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 sm:px-6">
                <div className="max-w-xl mx-auto flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <Link href="/book" className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <div>
                            <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                Booking Management
                            </h1>
                            <p className="text-xs text-slate-500 font-mono">Ref: {appointment.reference}</p>
                        </div>
                    </div>
                    <Link
                        href="/book"
                        className="text-xs font-bold text-slate-900 hover:underline"
                    >
                        Book New
                    </Link>
                </div>
            </header>

            <main className="max-w-xl w-full mx-auto p-4 sm:p-6 flex-1 space-y-4">
                {msg && (
                    <div className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
                        msg.type === 'success'
                            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                            : 'bg-rose-50 border border-rose-200 text-rose-800'
                    }`}>
                        {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />}
                        <span className="font-medium">{msg.text}</span>
                    </div>
                )}

                {/* Status Badge Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 card-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Status</span>
                            <div className="text-xl font-extrabold text-slate-900 capitalize mt-0.5">
                                {status}
                            </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            status === 'confirmed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : status === 'cancelled'
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-amber-100 text-amber-800'
                        }`}>
                            {status}
                        </span>
                    </div>

                    <div className="border-t border-slate-100 pt-3 grid grid-cols-2 gap-3 text-xs">
                        <div>
                            <span className="text-slate-400 block font-medium">Date & Time</span>
                            <span className="font-bold text-slate-900">{appointment.starts_at}</span>
                        </div>
                        <div>
                            <span className="text-slate-400 block font-medium">Stylist</span>
                            <span className="font-bold text-slate-900">{appointment.staff_name}</span>
                        </div>
                        <div>
                            <span className="text-slate-400 block font-medium">Salon Location</span>
                            <span className="font-bold text-slate-900">{appointment.salon_name}</span>
                        </div>
                        <div>
                            <span className="text-slate-400 block font-medium">Total Amount</span>
                            <span className="font-extrabold text-slate-900">{appointment.total_price}</span>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">Treatments</span>
                        <div className="space-y-1">
                            {appointment.services.map((s, idx) => (
                                <div key={idx} className="flex justify-between text-xs">
                                    <span className="text-slate-700 font-medium">• {s.name}</span>
                                    <span className="text-slate-900 font-bold">{s.price}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Salon Contact Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2 text-xs card-shadow">
                    <span className="font-bold text-slate-900 block">Salon Location & Contact</span>
                    <p className="text-slate-600 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {appointment.salon_address}
                    </p>
                    {appointment.salon_phone && (
                        <p className="text-slate-600 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <a href={`tel:${appointment.salon_phone}`} className="text-slate-900 font-bold underline">
                                {appointment.salon_phone}
                            </a>
                        </p>
                    )}
                </div>

                {/* Cancellation Section */}
                {status === 'confirmed' && (
                    <div className="space-y-3 pt-2">
                        {appointment.can_cancel ? (
                            <>
                                {!showCancelConfirm ? (
                                    <button
                                        onClick={() => setShowCancelConfirm(true)}
                                        className="w-full py-3 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors bg-white card-shadow"
                                    >
                                        Cancel Appointment
                                    </button>
                                ) : (
                                    <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-3 card-shadow">
                                        <p className="text-xs text-rose-900 font-bold">
                                            Are you sure you want to cancel this booking?
                                        </p>
                                        <input
                                            type="text"
                                            placeholder="Reason for cancellation (optional)"
                                            value={cancelReason}
                                            onChange={(e) => setCancelReason(e.target.value)}
                                            className="w-full bg-white border border-rose-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleCancel}
                                                disabled={cancelling}
                                                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors"
                                            >
                                                {cancelling ? 'Cancelling...' : 'Yes, Cancel Booking'}
                                            </button>
                                            <button
                                                onClick={() => setShowCancelConfirm(false)}
                                                className="flex-1 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                                            >
                                                Keep Booking
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <p className="text-[11px] text-slate-400 text-center font-medium">
                                    Online cancellation is permitted until {appointment.cancellation_deadline}.
                                </p>
                            </>
                        ) : (
                            <div className="p-3.5 bg-slate-100 rounded-xl text-center text-xs text-slate-600 font-medium">
                                The self-cancellation deadline has passed. To make changes, please call the salon at {appointment.salon_phone}.
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
