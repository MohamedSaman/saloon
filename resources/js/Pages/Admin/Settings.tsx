import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
    Store,
    Clock,
    Calendar,
    Sliders,
    Plus,
    Save,
    CheckCircle2,
    ArrowLeft,
    ChevronDown,
    Building2,
    CalendarX,
    Settings as SettingsIcon
} from 'lucide-react';

interface SalonBranch {
    id: number;
    name: string;
    slug: string;
    phone: string | null;
    email: string | null;
    address: string | null;
}

interface SalonSettingsData {
    id: number;
    salon_id: number;
    timezone: string;
    slot_interval_minutes: number;
    lead_time_minutes: number;
    booking_window_days: number;
    cancellation_window_minutes: number;
    assignment_strategy: 'least_booked_today' | 'round_robin' | 'priority';
    otp_required: boolean;
}

interface OpeningHourItem {
    id?: number;
    salon_id: number;
    weekday: number;
    opens_at: string;
    closes_at: string;
}

interface ClosureItem {
    id: number;
    starts_at: string;
    ends_at: string;
    reason: string;
}

interface Props {
    salons: SalonBranch[];
    currentSalon: SalonBranch;
    settings: SalonSettingsData;
    openingHours: OpeningHourItem[];
    closures: ClosureItem[];
}

const WEEKDAYS = [
    { num: 0, label: 'Sunday' },
    { num: 1, label: 'Monday' },
    { num: 2, label: 'Tuesday' },
    { num: 3, label: 'Wednesday' },
    { num: 4, label: 'Thursday' },
    { num: 5, label: 'Friday' },
    { num: 6, label: 'Saturday' },
];

export default function Settings({ salons, currentSalon, settings, openingHours, closures }: Props) {
    const [activeTab, setActiveTab] = useState<'hours' | 'closures' | 'rules' | 'branches'>('hours');

    // Weekly hours local state
    const [hoursState, setHoursState] = useState(() => {
        return WEEKDAYS.map(w => {
            const existing = openingHours.find(oh => oh.weekday === w.num);
            return {
                weekday: w.num,
                label: w.label,
                is_closed: !existing,
                opens_at: existing ? existing.opens_at.substring(0, 5) : '09:00',
                closes_at: existing ? existing.closes_at.substring(0, 5) : '19:00',
            };
        });
    });

    // Rules state
    const [rules, setRules] = useState({
        slot_interval_minutes: settings?.slot_interval_minutes || 15,
        lead_time_minutes: settings?.lead_time_minutes || 60,
        booking_window_days: settings?.booking_window_days || 30,
        cancellation_window_minutes: settings?.cancellation_window_minutes || 180,
        assignment_strategy: settings?.assignment_strategy || 'least_booked_today',
        otp_required: Boolean(settings?.otp_required),
    });

    // New Closure state
    const [newClosure, setNewClosure] = useState({
        starts_at: '',
        ends_at: '',
        reason: '',
    });

    // New Branch state
    const [newBranch, setNewBranch] = useState({
        name: '',
        slug: '',
        phone: '',
        email: '',
        address: '',
    });

    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Save Operating Hours
    const handleSaveHours = (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        router.post(`/admin/settings/${currentSalon.id}/opening-hours`, {
            hours: hoursState.map(h => ({
                weekday: h.weekday,
                is_closed: h.is_closed,
                opens_at: h.is_closed ? null : `${h.opens_at}:00`,
                closes_at: h.is_closed ? null : `${h.closes_at}:00`,
            }))
        }, {
            onSuccess: () => {
                setSaving(false);
                setSuccessMessage('Shop operating hours updated successfully!');
                setTimeout(() => setSuccessMessage(null), 3500);
            },
            onError: () => setSaving(false),
        });
    };

    // Save Booking Rules
    const handleSaveRules = (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        router.post(`/admin/settings/${currentSalon.id}/rules`, rules, {
            onSuccess: () => {
                setSaving(false);
                setSuccessMessage('Booking settings updated successfully!');
                setTimeout(() => setSuccessMessage(null), 3500);
            },
            onError: () => setSaving(false),
        });
    };

    // Add Closure
    const handleAddClosure = (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        router.post(`/admin/settings/${currentSalon.id}/closures`, newClosure, {
            onSuccess: () => {
                setSaving(false);
                setNewClosure({ starts_at: '', ends_at: '', reason: '' });
                setSuccessMessage('Closure scheduled successfully!');
                setTimeout(() => setSuccessMessage(null), 3500);
            },
            onError: () => setSaving(false),
        });
    };

    // Add Branch
    const handleAddBranch = (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        router.post('/admin/settings/branches', newBranch, {
            onSuccess: () => {
                setSaving(false);
                setNewBranch({ name: '', slug: '', phone: '', email: '', address: '' });
                setSuccessMessage('New branch created successfully!');
                setTimeout(() => setSuccessMessage(null), 3500);
            },
            onError: () => setSaving(false),
        });
    };

    return (
        <div className="min-h-screen bg-[#F8F9FB] text-slate-900 flex flex-col selection:bg-slate-900 selection:text-white">
            <Head title={`Settings — ${currentSalon.name}`} />

            {/* Top Bar */}
            <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 sm:px-6">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <Link href="/book" className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <div>
                            <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                Salon Administration & Settings
                            </h1>
                            <p className="text-xs text-slate-500">Shop hours, holidays, and multi-branch management</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            href="/admin/calendar"
                            className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
                        >
                            Calendar View
                        </Link>
                        <Link
                            href="/staff/today"
                            className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
                        >
                            Staff Panel
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-5 flex-1">
                {/* Branch Switcher Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 card-shadow">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800">
                            <Store className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Active Branch</span>
                            <span className="text-sm font-bold text-slate-900">{currentSalon.name}</span>
                            <span className="text-xs text-slate-500 block">{currentSalon.address || 'Sri Lanka'}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-500">Switch Branch:</span>
                        <div className="relative">
                            <select
                                value={currentSalon.id}
                                onChange={(e) => router.get('/admin/settings', { salon_id: e.target.value })}
                                className="appearance-none bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 rounded-xl pl-3 pr-8 py-2 focus:ring-2 focus:ring-slate-900 outline-none cursor-pointer"
                            >
                                {salons.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {successMessage && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                        <span>{successMessage}</span>
                    </div>
                )}

                {/* Professional White Tabs */}
                <div className="flex border-b border-slate-200 space-x-1 sm:space-x-3">
                    <button
                        onClick={() => setActiveTab('hours')}
                        className={`py-2.5 px-3 sm:px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                            activeTab === 'hours'
                                ? 'border-slate-900 text-slate-900'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <Clock className="w-3.5 h-3.5" />
                        Operating Hours
                    </button>
                    <button
                        onClick={() => setActiveTab('closures')}
                        className={`py-2.5 px-3 sm:px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                            activeTab === 'closures'
                                ? 'border-slate-900 text-slate-900'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <CalendarX className="w-3.5 h-3.5" />
                        Holidays & Closures
                    </button>
                    <button
                        onClick={() => setActiveTab('rules')}
                        className={`py-2.5 px-3 sm:px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                            activeTab === 'rules'
                                ? 'border-slate-900 text-slate-900'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <Sliders className="w-3.5 h-3.5" />
                        Booking Rules
                    </button>
                    <button
                        onClick={() => setActiveTab('branches')}
                        className={`py-2.5 px-3 sm:px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                            activeTab === 'branches'
                                ? 'border-slate-900 text-slate-900'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <Building2 className="w-3.5 h-3.5" />
                        Branches
                    </button>
                </div>

                {/* TAB 1: OPERATING HOURS */}
                {activeTab === 'hours' && (
                    <form onSubmit={handleSaveHours} className="space-y-4">
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 card-shadow">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Weekly Opening & Closing Hours ({currentSalon.name})</h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Set the opening and closing times for each day of the week. Slots outside these hours will not be bookable by customers.
                                </p>
                            </div>

                            <div className="divide-y divide-slate-100">
                                {hoursState.map((item, idx) => (
                                    <div key={item.weekday} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                        <div className="w-28 font-bold text-slate-800">
                                            {item.label}
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={!item.is_closed}
                                                    onChange={(e) => {
                                                        const copy = [...hoursState];
                                                        copy[idx].is_closed = !e.target.checked;
                                                        setHoursState(copy);
                                                    }}
                                                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                                />
                                                <span className={item.is_closed ? 'text-slate-400 font-medium' : 'text-emerald-700 font-bold'}>
                                                    {item.is_closed ? 'Shop Closed' : 'Shop Open'}
                                                </span>
                                            </label>

                                            {!item.is_closed && (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="time"
                                                        value={item.opens_at}
                                                        onChange={(e) => {
                                                            const copy = [...hoursState];
                                                            copy[idx].opens_at = e.target.value;
                                                            setHoursState(copy);
                                                        }}
                                                        className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-medium"
                                                    />
                                                    <span className="text-slate-400">to</span>
                                                    <input
                                                        type="time"
                                                        value={item.closes_at}
                                                        onChange={(e) => {
                                                            const copy = [...hoursState];
                                                            copy[idx].closes_at = e.target.value;
                                                            setHoursState(copy);
                                                        }}
                                                        className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-medium"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Saving...' : 'Save Operating Hours'}
                        </button>
                    </form>
                )}

                {/* TAB 2: CLOSURES & HOLIDAYS */}
                {activeTab === 'closures' && (
                    <div className="space-y-5">
                        {/* Add Closure Form */}
                        <form onSubmit={handleAddClosure} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 card-shadow">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Schedule Special Closure / Public Holiday</h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Customer appointments will be blocked for this entire scheduled period.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                <div>
                                    <label className="block text-slate-700 mb-1 font-bold">Starts At *</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={newClosure.starts_at}
                                        onChange={(e) => setNewClosure({ ...newClosure, starts_at: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-700 mb-1 font-bold">Ends At *</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={newClosure.ends_at}
                                        onChange={(e) => setNewClosure({ ...newClosure, ends_at: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-700 mb-1 font-bold">Reason *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Sinhala & Tamil New Year"
                                        value={newClosure.reason}
                                        onChange={(e) => setNewClosure({ ...newClosure, reason: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Schedule Closure
                            </button>
                        </form>

                        {/* Existing Closures List */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 card-shadow">
                            <h3 className="text-sm font-bold text-slate-900">Scheduled Closures</h3>
                            {closures.length === 0 ? (
                                <p className="text-xs text-slate-400 py-2">No closures currently scheduled for this branch.</p>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {closures.map(c => (
                                        <div key={c.id} className="py-2.5 flex justify-between items-center text-xs">
                                            <div>
                                                <span className="font-bold text-slate-900 block">{c.reason}</span>
                                                <span className="text-slate-500">
                                                    {c.starts_at} to {c.ends_at}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 3: BOOKING RULES */}
                {activeTab === 'rules' && (
                    <form onSubmit={handleSaveRules} className="space-y-4">
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 card-shadow">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Booking Rules & Timing Limits</h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Control slot frequencies, customer lead time, advance booking limits, and staff assignment.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                <div>
                                    <label className="block text-slate-700 mb-1 font-bold">Slot Grid Interval</label>
                                    <select
                                        value={rules.slot_interval_minutes}
                                        onChange={(e) => setRules({ ...rules, slot_interval_minutes: Number(e.target.value) })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium"
                                    >
                                        <option value={10}>Every 10 minutes</option>
                                        <option value={15}>Every 15 minutes (Standard)</option>
                                        <option value={20}>Every 20 minutes</option>
                                        <option value={30}>Every 30 minutes</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-slate-700 mb-1 font-bold">Minimum Advance Notice (Lead Time)</label>
                                    <select
                                        value={rules.lead_time_minutes}
                                        onChange={(e) => setRules({ ...rules, lead_time_minutes: Number(e.target.value) })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium"
                                    >
                                        <option value={0}>Immediate (0 mins notice)</option>
                                        <option value={30}>30 minutes notice</option>
                                        <option value={60}>60 minutes notice (Standard)</option>
                                        <option value={120}>2 hours notice</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-slate-700 mb-1 font-bold">Booking Window (Days ahead)</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={90}
                                        value={rules.booking_window_days}
                                        onChange={(e) => setRules({ ...rules, booking_window_days: Number(e.target.value) })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-0.5">Maximum days into the future customers can book.</p>
                                </div>

                                <div>
                                    <label className="block text-slate-700 mb-1 font-bold">Cancellation Window (Minutes before appointment)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={rules.cancellation_window_minutes}
                                        onChange={(e) => setRules({ ...rules, cancellation_window_minutes: Number(e.target.value) })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-0.5">180 mins = 3 hours before start time.</p>
                                </div>

                                <div>
                                    <label className="block text-slate-700 mb-1 font-bold">Automatic Staff Assignment</label>
                                    <select
                                        value={rules.assignment_strategy}
                                        onChange={(e) => setRules({ ...rules, assignment_strategy: e.target.value as any })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium"
                                    >
                                        <option value="least_booked_today">Least Booked Today (Workload balanced)</option>
                                        <option value="round_robin">Round Robin (Sequential rotation)</option>
                                        <option value="priority">Priority Order (By staff rank)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-slate-700 mb-1 font-bold">SMS OTP Security</label>
                                    <div className="pt-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={rules.otp_required}
                                                onChange={(e) => setRules({ ...rules, otp_required: e.target.checked })}
                                                className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                            />
                                            <span className="text-xs text-slate-800 font-medium">Require SMS OTP to confirm booking</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Saving...' : 'Save Rules'}
                        </button>
                    </form>
                )}

                {/* TAB 4: BRANCH MANAGEMENT */}
                {activeTab === 'branches' && (
                    <div className="space-y-5">
                        {/* Branches Grid */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 card-shadow">
                            <h3 className="text-sm font-bold text-slate-900">Your Salon Branches</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {salons.map(b => (
                                    <div
                                        key={b.id}
                                        className={`p-4 rounded-xl border transition-all ${
                                            b.id === currentSalon.id
                                                ? 'bg-slate-50 border-slate-900 shadow-sm'
                                                : 'bg-white border-slate-200 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold text-slate-900 text-sm">{b.name}</span>
                                            {b.id === currentSalon.id && (
                                                <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded-full font-bold">
                                                    Current
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500">{b.address || 'Sri Lanka'}</p>
                                        <p className="text-xs text-slate-400 mt-1">{b.phone || 'No phone'}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Add Branch */}
                        <form onSubmit={handleAddBranch} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 card-shadow">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Add New Salon Branch</h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Set up an additional branch in your area with independent operating hours and specialists.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                <div>
                                    <label className="block text-slate-700 mb-1 font-bold">Branch Name *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. KV Saloon — Nugegoda Branch"
                                        value={newBranch.name}
                                        onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-700 mb-1 font-bold">Slug (URL identifier) *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="kv-saloon-nugegoda"
                                        value={newBranch.slug}
                                        onChange={(e) => setNewBranch({ ...newBranch, slug: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-700 mb-1 font-bold">Phone Number</label>
                                    <input
                                        type="tel"
                                        placeholder="+94112345678"
                                        value={newBranch.phone}
                                        onChange={(e) => setNewBranch({ ...newBranch, phone: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-700 mb-1 font-bold">Address / Street</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 120 High Level Rd, Nugegoda"
                                        value={newBranch.address}
                                        onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Create Branch
                            </button>
                        </form>
                    </div>
                )}
            </main>
        </div>
    );
}
