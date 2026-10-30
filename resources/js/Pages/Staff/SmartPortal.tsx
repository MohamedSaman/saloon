import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import {
    Scissors,
    Clock,
    User,
    Phone,
    CheckCircle2,
    DollarSign,
    PlusCircle,
    Power,
    Users,
    TrendingUp,
    Sparkles,
    AlertCircle,
    X,
    ChevronDown,
    Building2,
    Check
} from 'lucide-react';

interface StaffProfile {
    id: number;
    name: string;
    display_name: string;
    working_status: 'offline' | 'free' | 'busy';
    shop_id: number;
    shop_name: string;
    branch_name: string;
    commission_rate: number;
}

interface CurrentTicket {
    id: number;
    ticket_uuid: string;
    queue_number: number;
    customer_name: string;
    customer_phone: string;
    service_name: string;
    service_duration: number;
    price_cents: number;
    formatted_price: string;
    started_at: string;
}

interface Metrics {
    today_count: number;
    today_earnings: string;
    total_count: number;
    total_earnings: string;
}

interface PendingTicket {
    id: number;
    queue_number: number;
    customer_name: string;
    service_name: string;
    source: string;
    queued_at: string;
}

interface ServiceOption {
    id: number;
    name: string;
    price_cents: number;
    formatted_price: string;
}

interface StaffOption {
    id: number;
    display_name: string;
    working_status: string;
    shop_name: string;
}

interface Props {
    staff: StaffProfile;
    currentTicket: CurrentTicket | null;
    metrics: Metrics;
    shopPendingQueue: PendingTicket[];
    shopServices: ServiceOption[];
    allStaff: StaffOption[];
}

export default function SmartPortal({
    staff,
    currentTicket,
    metrics,
    shopPendingQueue,
    shopServices,
    allStaff,
}: Props) {
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [actionMessage, setActionMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Complete service confirmation modal
    const [showCompleteModal, setShowCompleteModal] = useState(false);

    // Walk-in modal state
    const [showWalkInModal, setShowWalkInModal] = useState(false);
    const [walkInName, setWalkInName] = useState('');
    const [walkInPhone, setWalkInPhone] = useState('');
    const [walkInServiceId, setWalkInServiceId] = useState<number>(shopServices[0]?.id || 0);

    // Complete Current Service (Uber-style dispatch trigger)
    const handleExecuteComplete = async () => {
        setIsActionLoading(true);
        setErrorMessage(null);
        try {
            const res = await axios.post('/staff/portal/complete', {
                staff_id: staff.id,
            });

            if (res.data.success) {
                setShowCompleteModal(false);
                setActionMessage(
                    `Service completed! Earned ${res.data.commission_earned}. ${
                        res.data.next_ticket
                            ? `Next customer assigned: ${res.data.next_ticket.customer_name}!`
                            : 'Status is now Free. Standing by for next queue assignment.'
                    }`
                );
                // Refresh Inertia page to update state
                router.reload();
            }
        } catch (err: any) {
            setErrorMessage(err.response?.data?.message || 'Error completing service.');
        } finally {
            setIsActionLoading(false);
        }
    };

    // Toggle Staff Status (offline <-> free)
    const handleToggleStatus = async () => {
        const targetStatus = staff.working_status === 'offline' ? 'free' : 'offline';
        setIsActionLoading(true);

        try {
            const res = await axios.post('/staff/portal/status', {
                staff_id: staff.id,
                status: targetStatus,
            });

            if (res.data.success) {
                if (res.data.assigned_ticket) {
                    setActionMessage(`You are now ONLINE! New customer auto-assigned: ${res.data.assigned_ticket.customer_name}`);
                } else {
                    setActionMessage(`Status changed to ${targetStatus === 'free' ? 'Online (Free)' : 'Offline'}.`);
                }
                router.reload();
            }
        } catch (err: any) {
            setErrorMessage(err.response?.data?.message || 'Error updating status.');
        } finally {
            setIsActionLoading(false);
        }
    };

    // Submit Walk-in Customer
    const handleAddWalkIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);
        if (!walkInName.trim() || !walkInPhone.trim()) {
            setErrorMessage('Please enter customer name and phone.');
            return;
        }

        setIsActionLoading(true);
        try {
            const res = await axios.post('/staff/portal/walk-in', {
                shop_id: staff.shop_id,
                service_id: walkInServiceId,
                customer_name: walkInName.trim(),
                customer_phone: walkInPhone.trim(),
            });

            if (res.data.success) {
                setShowWalkInModal(false);
                setWalkInName('');
                setWalkInPhone('');
                setActionMessage(
                    res.data.assigned
                        ? `Walk-in customer #${res.data.queue_number} auto-assigned to ${res.data.staff_name}!`
                        : `Walk-in customer #${res.data.queue_number} added to central pending queue.`
                );
                router.reload();
            }
        } catch (err: any) {
            setErrorMessage(err.response?.data?.message || 'Failed to add walk-in.');
        } finally {
            setIsActionLoading(false);
        }
    };

    // Switch active staff view (useful for shop manager / shared tablet)
    const handleSwitchStaff = (newStaffId: number) => {
        router.get('/staff/portal', { staff_id: newStaffId });
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased pb-20">
            <Head title={`Staff Portal — ${staff.display_name}`} />

            {/* Top Navigation */}
            <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
                <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-sm">
                            <Scissors className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">
                                    {staff.display_name}
                                </h1>
                                <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                        staff.working_status === 'busy'
                                            ? 'bg-rose-100 text-rose-800'
                                            : staff.working_status === 'free'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : 'bg-slate-100 text-slate-600'
                                    }`}
                                >
                                    {staff.working_status}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-slate-400" />
                                {staff.branch_name} • {staff.shop_name}
                            </p>
                        </div>
                    </div>

                    {/* Staff switcher selector */}
                    <div className="flex items-center gap-2">
                        <select
                            value={staff.id}
                            onChange={(e) => handleSwitchStaff(Number(e.target.value))}
                            className="text-xs font-semibold bg-slate-100 border-0 rounded-xl px-2.5 py-1.5 text-slate-700 focus:ring-2 focus:ring-slate-900"
                        >
                            {allStaff.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.display_name} ({s.working_status})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </header>

            <main className="max-w-xl mx-auto px-4 pt-4 space-y-4">
                {/* Notification Banner */}
                {actionMessage && (
                    <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>{actionMessage}</span>
                        </div>
                        <button onClick={() => setActionMessage(null)} className="text-emerald-700 hover:text-emerald-900">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}

                {/* Error Banner */}
                {errorMessage && !showCompleteModal && !showWalkInModal && (
                    <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>{errorMessage}</span>
                        </div>
                        <button onClick={() => setErrorMessage(null)} className="text-rose-700 hover:text-rose-900">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}

                {/* Status Toggle & Walk-in Quick Actions Bar */}
                <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleToggleStatus}
                            disabled={isActionLoading || staff.working_status === 'busy'}
                            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm ${
                                staff.working_status === 'offline'
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : staff.working_status === 'free'
                                    ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            <Power className="w-3.5 h-3.5" />
                            {staff.working_status === 'offline'
                                ? 'Go Online (Free)'
                                : staff.working_status === 'free'
                                ? 'Go Offline'
                                : 'Busy (In Service)'}
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowWalkInModal(true)}
                        className="px-4 py-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all flex items-center gap-1.5 border border-indigo-200 shadow-sm"
                    >
                        <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
                        New Walk-in
                    </button>
                </div>

                {/* CURRENT ACTIVE TASK CARD (Uber-Style Assigned Ride) */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                                Current Active Task
                            </h2>
                        </div>
                        {currentTicket && (
                            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-slate-900 text-white">
                                Ticket #{currentTicket.queue_number}
                            </span>
                        )}
                    </div>

                    {currentTicket ? (
                        <div className="space-y-4 pt-1">
                            {/* Customer Profile Box */}
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-bold">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="text-base font-extrabold text-slate-900">
                                                {currentTicket.customer_name}
                                            </div>
                                            <div className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                                <Phone className="w-3 h-3 text-slate-400" />
                                                {currentTicket.customer_phone}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="text-xs text-slate-400 font-medium">Service Price</div>
                                        <div className="text-base font-black text-slate-900">
                                            {currentTicket.formatted_price}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-600">
                                    <span className="font-semibold text-slate-800">
                                        {currentTicket.service_name}
                                    </span>
                                    <span className="flex items-center gap-1 text-slate-500">
                                        <Clock className="w-3.5 h-3.5" />
                                        Started at {currentTicket.started_at}
                                    </span>
                                </div>
                            </div>

                            {/* "COMPLETE" TRIGGER BUTTON */}
                            <button
                                type="button"
                                onClick={() => setShowCompleteModal(true)}
                                disabled={isActionLoading}
                                className="w-full py-4 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <CheckCircle2 className="w-5 h-5" />
                                Complete & Auto-Dispatch Next
                            </button>
                            <p className="text-center text-[11px] text-slate-400">
                                Completing service calculates your {staff.commission_rate}% commission and pulls the next waiting customer.
                            </p>
                        </div>
                    ) : (
                        <div className="py-8 text-center space-y-2 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center mx-auto">
                                <Clock className="w-6 h-6" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-700">No active customer assigned</h3>
                            <p className="text-xs text-slate-400 max-w-xs mx-auto">
                                {staff.working_status === 'offline'
                                    ? 'You are currently offline. Tap "Go Online" above to start receiving queue bookings.'
                                    : 'You are online and free! The system will automatically feed you the next customer as soon as one arrives.'}
                            </p>
                        </div>
                    )}
                </div>

                {/* PERFORMANCE METRICS CARD (Earnings & Commission Tracker) */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                            <TrendingUp className="w-4 h-4 text-emerald-600" />
                            My Performance & Earnings
                        </h2>
                        <span className="text-xs font-semibold text-slate-500">
                            Commission: {staff.commission_rate}%
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="text-xs font-medium text-slate-500">Today's Completed</div>
                            <div className="text-2xl font-black text-slate-900 mt-1">
                                {metrics.today_count}{' '}
                                <span className="text-xs font-medium text-slate-400">cuts</span>
                            </div>
                            <div className="text-xs font-bold text-emerald-600 mt-0.5">
                                {metrics.today_earnings}
                            </div>
                        </div>

                        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="text-xs font-medium text-slate-500">All-Time Completed</div>
                            <div className="text-2xl font-black text-slate-900 mt-1">
                                {metrics.total_count}{' '}
                                <span className="text-xs font-medium text-slate-400">cuts</span>
                            </div>
                            <div className="text-xs font-bold text-slate-700 mt-0.5">
                                {metrics.total_earnings}
                            </div>
                        </div>
                    </div>
                </div>

                {/* CENTRAL SHOP QUEUE PREVIEW */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-indigo-600" />
                            Central Shop Queue ({shopPendingQueue.length} Waiting)
                        </h2>
                        <span className="text-xs font-semibold text-slate-400">FIFO Order</span>
                    </div>

                    {shopPendingQueue.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                            {shopPendingQueue.map((item, idx) => (
                                <div key={item.id} className="py-2.5 flex items-center justify-between first:pt-0 last:pb-0">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-extrabold text-xs flex items-center justify-center">
                                            #{item.queue_number}
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-900">{item.customer_name}</div>
                                            <div className="text-[11px] text-slate-400">{item.service_name}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                            {item.source === 'qr_code' ? 'QR Code' : 'Walk-in'}
                                        </span>
                                        <div className="text-[10px] text-slate-400 mt-0.5">{item.queued_at}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-slate-400 text-center py-3">
                            No customers currently waiting in shop queue.
                        </p>
                    )}
                </div>
            </main>

            {/* "ADD WALK-IN" MODAL */}
            {showWalkInModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-extrabold text-slate-900">Add Walk-in Customer</h3>
                            <button
                                onClick={() => {
                                    setShowWalkInModal(false);
                                    setErrorMessage(null);
                                }}
                                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {errorMessage && (
                            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        <form onSubmit={handleAddWalkIn} className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Customer Name
                                </label>
                                <input
                                    type="text"
                                    value={walkInName}
                                    onChange={(e) => setWalkInName(e.target.value)}
                                    placeholder="e.g. Ramesh"
                                    required
                                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    value={walkInPhone}
                                    onChange={(e) => setWalkInPhone(e.target.value)}
                                    placeholder="e.g. 0771234567"
                                    required
                                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Requested Service
                                </label>
                                <select
                                    value={walkInServiceId}
                                    onChange={(e) => setWalkInServiceId(Number(e.target.value))}
                                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                                >
                                    {shopServices.map((svc) => (
                                        <option key={svc.id} value={svc.id}>
                                            {svc.name} — {svc.formatted_price}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isActionLoading}
                                    className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                                >
                                    {isActionLoading ? 'Adding...' : 'Enqueue Customer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* "COMPLETE CURRENT SERVICE" IN-APP MODAL */}
            {showCompleteModal && currentTicket && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn overflow-y-auto">
                    <div className="w-full max-w-sm bg-white border border-slate-200 rounded-[28px] p-6 shadow-2xl space-y-4 my-auto animate-scaleUp">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">
                                        Finish Active Service
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                        Ticket #{currentTicket.queue_number}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCompleteModal(false)}
                                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {errorMessage && (
                            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2.5 text-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium">Customer</span>
                                <span className="font-bold text-slate-900">{currentTicket.customer_name}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium">Service</span>
                                <span className="font-bold text-slate-800">{currentTicket.service_name}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium">Service Price</span>
                                <span className="font-bold text-slate-900">{currentTicket.formatted_price}</span>
                            </div>
                            <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-emerald-700 font-bold">
                                <span>Your {staff.commission_rate}% Commission</span>
                                <span className="text-sm">
                                    Rs. {((currentTicket.price_cents * (staff.commission_rate / 100)) / 100).toFixed(2)}
                                </span>
                            </div>
                        </div>

                        <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 text-[11px] text-indigo-700 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                            <span>
                                {shopPendingQueue.length > 0
                                    ? `Next in line: #${shopPendingQueue[0].queue_number} (${shopPendingQueue[0].customer_name}) will auto-assign!`
                                    : 'No clients waiting. Your chair will reset to Available (Free).'}
                            </span>
                        </div>

                        <div className="pt-2 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setShowCompleteModal(false)}
                                disabled={isActionLoading}
                                className="flex-1 py-2.5 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleExecuteComplete}
                                disabled={isActionLoading}
                                className="flex-1 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                            >
                                {isActionLoading ? (
                                    <span>Completing...</span>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>Confirm Finish</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
