import React, { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import {
    Scissors,
    Clock,
    User,
    Phone,
    Users,
    CheckCircle2,
    Sparkles,
    AlertCircle,
    ArrowRight,
    MapPin,
    RefreshCw,
    Calendar,
    Zap,
    X,
    Check,
    Search,
    SlidersHorizontal,
    Star,
    Heart,
    ChevronDown,
    Home,
    Ticket,
    Armchair,
    LogIn,
    Shield,
    Bell,
    CheckCircle,
    Flame
} from 'lucide-react';

interface Service {
    id: number;
    name: string;
    description: string | null;
    duration_minutes: number;
    price_cents: number;
    price_rupees: number;
    formatted_price: string;
}

interface TimelineSlot {
    time_24: string;
    time_12: string;
    is_past: boolean;
    is_free: boolean;
    booked_count: number;
}

interface ShopItem {
    id: number;
    name: string;
    slug: string;
    address: string | null;
    phone: string | null;
    opening_time: string;
    closing_time: string;
    services_count: number;
}

interface BranchItem {
    id: number;
    name: string;
    city: string;
    shops: ShopItem[];
}

interface ShopInfo {
    id: number;
    name: string;
    slug: string;
    branch_id: number;
    branch_name: string;
    city: string;
    address: string | null;
    phone: string | null;
    opening_time: string;
    closing_time: string;
    pending_count: number;
    active_staff_count: number;
    est_wait_minutes: number;
    est_turn_time: string;
}

interface CuttingTicket {
    queue_number: number;
    customer_name: string;
    service_name: string;
    staff_name: string;
    started_at: string | null;
}

interface WaitingTicket {
    queue_number: number;
    customer_name: string;
    service_name: string;
    scheduled_time?: string | null;
}

interface TicketStatus {
    ticket_uuid: string;
    queue_number: number;
    customer_name: string;
    service_name: string;
    formatted_price?: string;
    status: 'pending' | 'in_progress' | 'completed';
    position: number;
    ahead_count?: number;
    staff_name: string | null;
    scheduled_time: string | null;
    estimated_wait_minutes: number;
    predicted_turn_time?: string;
    shop_name: string;
    cutting_tickets?: CuttingTicket[];
    waiting_ahead?: WaitingTicket[];
}

interface Props {
    branches?: BranchItem[];
    shop: ShopInfo;
    services: Service[];
    timelineSlots: TimelineSlot[];
    currentCutting?: CuttingTicket[];
    currentWaiting?: WaitingTicket[];
    activeBarbers?: { id: number; display_name: string; working_status: string }[];
}

export default function QrBooking({
    branches = [],
    shop,
    services = [],
    timelineSlots = [],
    currentCutting = [],
    currentWaiting = [],
    activeBarbers = []
}: Props) {
    // Mobile navigation tab: 'home' | 'ticket' | 'chairs' | 'portals'
    const [navTab, setNavTab] = useState<'home' | 'ticket' | 'chairs' | 'portals'>('home');

    // Filter and search state
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [branchPickerOpen, setBranchPickerOpen] = useState(false);

    // Selected service for booking
    const [selectedServiceId, setSelectedServiceId] = useState<number>(services[0]?.id || 1);
    const [bookingMode, setBookingMode] = useState<'now' | 'later'>('now');
    const [selectedSlotTime, setSelectedSlotTime] = useState<string | null>(null);

    // Modal state for customer contact sheet
    const [showContactModal, setShowContactModal] = useState(false);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Active customer ticket state (synced with backend polling)
    const [activeTicket, setActiveTicket] = useState<TicketStatus | null>(null);

    // Set default free slot for 'later' mode
    useEffect(() => {
        const firstFree = timelineSlots.find((s) => s.is_free);
        if (firstFree && !selectedSlotTime) {
            setSelectedSlotTime(firstFree.time_24);
        }
    }, [timelineSlots]);

    // Check localStorage for previously booked active ticket
    useEffect(() => {
        const savedUuid = localStorage.getItem(`queue_ticket_${shop.id}`);
        if (savedUuid) {
            fetchTicketStatus(savedUuid);
        }
    }, [shop.id]);

    // Live polling when customer has a pending/in_progress ticket
    useEffect(() => {
        if (!activeTicket || activeTicket.status === 'completed') {
            return;
        }

        const interval = setInterval(() => {
            fetchTicketStatus(activeTicket.ticket_uuid);
        }, 3000);

        return () => clearInterval(interval);
    }, [activeTicket]);

    const fetchTicketStatus = async (uuid: string) => {
        try {
            const res = await axios.get<TicketStatus>(`/api/queue/status/${uuid}`);
            setActiveTicket(res.data);
            if (res.data.status === 'completed') {
                localStorage.removeItem(`queue_ticket_${shop.id}`);
            }
        } catch {
            localStorage.removeItem(`queue_ticket_${shop.id}`);
            setActiveTicket(null);
        }
    };

    const handleSelectService = (id: number) => {
        setSelectedServiceId(id);
    };

    const handleOpenContactModal = () => {
        setErrorMessage(null);
        if (!selectedServiceId) {
            setErrorMessage('Please select a service.');
            return;
        }
        if (bookingMode === 'later' && !selectedSlotTime) {
            setErrorMessage('Please pick an available time slot.');
            return;
        }
        setShowContactModal(true);
    };

    const handleConfirmBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);

        if (!name.trim()) {
            setErrorMessage('Please enter your name.');
            return;
        }
        if (!phone.trim() || phone.trim().length < 9) {
            setErrorMessage('Please enter a valid phone number (at least 9 digits).');
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await axios.post('/api/queue/join', {
                shop_id: shop.id,
                service_id: selectedServiceId,
                name: name.trim(),
                phone: phone.trim(),
                scheduled_time: bookingMode === 'later' ? selectedSlotTime : null,
            });

            if (res.data.success) {
                setShowContactModal(false);
                localStorage.setItem(`queue_ticket_${shop.id}`, res.data.ticket_uuid);
                await fetchTicketStatus(res.data.ticket_uuid);
                setNavTab('ticket'); // Automatically switch to ticket tracker screen!
            }
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to submit booking. Please try again.';
            setErrorMessage(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLeaveQueue = () => {
        localStorage.removeItem(`queue_ticket_${shop.id}`);
        setActiveTicket(null);
        setNavTab('home');
    };

    const selectedService = services.find((s) => s.id === selectedServiceId) || services[0];
    const selectedSlotObj = timelineSlots.find((s) => s.time_24 === selectedSlotTime);

    // Filter services by search and category
    const filteredServices = services.filter((svc) => {
        const matchesQuery = svc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (svc.description && svc.description.toLowerCase().includes(searchQuery.toLowerCase()));

        if (!matchesQuery) return false;
        if (selectedCategory === 'haircut') return svc.name.toLowerCase().includes('cut');
        if (selectedCategory === 'beard') return svc.name.toLowerCase().includes('beard') || svc.name.toLowerCase().includes('shave');
        if (selectedCategory === 'color') return svc.name.toLowerCase().includes('color') || svc.name.toLowerCase().includes('dye');
        if (selectedCategory === 'styling') return svc.name.toLowerCase().includes('style') || svc.name.toLowerCase().includes('wash');
        if (selectedCategory === 'spa') return svc.name.toLowerCase().includes('spa') || svc.name.toLowerCase().includes('facial');
        return true;
    });

    // Categories list matching user's design image
    const categories = [
        { id: 'all', label: 'All', icon: Sparkles, color: 'bg-indigo-50 text-indigo-600' },
        { id: 'haircut', label: 'Haircut', icon: Scissors, color: 'bg-rose-50 text-rose-500' },
        { id: 'beard', label: 'Beard Trim', icon: Flame, color: 'bg-sky-50 text-sky-600' },
        { id: 'styling', label: 'Styling', icon: Zap, color: 'bg-amber-50 text-amber-600' },
        { id: 'spa', label: 'Spa & Care', icon: User, color: 'bg-emerald-50 text-emerald-600' },
    ];

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-0 sm:p-4 selection:bg-indigo-500 selection:text-white">
            <Head title={`${shop.name} — Smart Salon Mobile App`} />

            {/* Mobile Device Frame Container (Looks and behaves like a native mobile app) */}
            <div className="w-full max-w-md bg-white min-h-screen sm:min-h-[840px] sm:max-h-[920px] sm:rounded-[44px] shadow-[0_20px_60px_rgba(0,0,0,0.12)] sm:border-[8px] sm:border-slate-800 flex flex-col relative overflow-hidden font-sans">

                {/* Simulated iOS Status Bar */}
                <div className="pt-3 px-6 pb-1 flex items-center justify-between text-xs font-semibold text-slate-800 shrink-0 select-none z-20">
                    <span className="font-bold tracking-tight text-xs">9:41</span>
                    {/* Simulated Dynamic Island Pill */}
                    <div className="w-20 h-4 bg-slate-900 rounded-full hidden sm:block"></div>
                    <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="font-bold">5G</span>
                        <div className="w-4 h-2.5 border border-slate-700 rounded-xs p-0.5 flex items-center">
                            <div className="h-full w-full bg-slate-900 rounded-2xs"></div>
                        </div>
                    </div>
                </div>

                {/* APP HEADER */}
                <header className="px-5 pt-2 pb-3 shrink-0 bg-white/90 backdrop-blur-md z-10 border-b border-slate-50">
                    <div className="flex items-center justify-between">
                        {/* Greeting & Location */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 p-0.5 shadow-xs">
                                <div className="w-full h-full bg-white rounded-full flex items-center justify-center font-black text-indigo-700 text-xs">
                                    <Scissors className="w-5 h-5 text-indigo-600" />
                                </div>
                            </div>
                            <div>
                                <div className="text-xs font-bold text-slate-400">Hello, Guest 👋</div>
                                <h1 className="text-base font-black text-slate-900 tracking-tight leading-none">
                                    Ready for a new look?
                                </h1>
                            </div>
                        </div>

                        {/* Branch Dropdown Pill & Bell Icon */}
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setBranchPickerOpen(!branchPickerOpen)}
                                className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition-all"
                            >
                                <MapPin className="w-3 h-3 text-indigo-600 shrink-0" />
                                <span className="max-w-[85px] truncate">{shop.city}</span>
                                <ChevronDown className="w-3 h-3 text-slate-500" />
                            </button>

                            <Link
                                href="/admin/login"
                                title="Admin Portal"
                                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors relative"
                            >
                                <Bell className="w-4 h-4" />
                                <span className="w-2 h-2 rounded-full bg-emerald-500 absolute top-1.5 right-1.5 ring-2 ring-white"></span>
                            </Link>
                        </div>
                    </div>

                    {/* Branch Switcher Dropdown */}
                    {branchPickerOpen && (
                        <div className="mt-3 p-3 bg-white rounded-2xl border border-slate-200 shadow-xl space-y-2 animate-fadeIn z-30">
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                                Switch Salon Branch
                            </div>
                            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                {branches.map((b) => (
                                    <div key={b.id} className="space-y-1">
                                        <div className="text-[11px] font-black text-slate-600 px-2 pt-1">{b.name}</div>
                                        {b.shops.map((s) => (
                                            <a
                                                key={s.id}
                                                href={`/book?shop=${s.slug}`}
                                                className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-colors ${
                                                    s.id === shop.id
                                                        ? 'bg-slate-900 text-white'
                                                        : 'hover:bg-slate-100 text-slate-800'
                                                }`}
                                            >
                                                <span>{s.name}</span>
                                                <span className={`text-[10px] ${s.id === shop.id ? 'text-emerald-400' : 'text-slate-400'}`}>
                                                    {s.opening_time} - {s.closing_time}
                                                </span>
                                            </a>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </header>

                {/* MAIN SCROLLABLE APP BODY */}
                <main className="flex-1 overflow-y-auto px-5 py-3 space-y-4 pb-28">

                    {/* ---------------------------------------------------- */}
                    {/* TAB 1: HOME SCREEN (Matches user uploaded mockups)   */}
                    {/* ---------------------------------------------------- */}
                    {navTab === 'home' && (
                        <>
                            {/* Search and Filter Bar */}
                            <div className="flex items-center gap-2">
                                <div className="flex-1 relative">
                                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search services or salons..."
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-slate-300 rounded-2xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedCategory('all')}
                                    className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                                >
                                    <SlidersHorizontal className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Active Ticket Banner Pill if Booked */}
                            {activeTicket && activeTicket.status !== 'completed' && (
                                <div
                                    onClick={() => setNavTab('ticket')}
                                    className="p-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white cursor-pointer shadow-md flex items-center justify-between animate-pulse"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-black text-sm">
                                            #{activeTicket.queue_number}
                                        </div>
                                        <div>
                                            <div className="text-xs font-black">
                                                {activeTicket.status === 'in_progress' ? '✂️ Cutting Now in Chair!' : '🎟️ Ticket Booked • In Queue'}
                                            </div>
                                            <div className="text-[11px] text-emerald-100">
                                                {activeTicket.status === 'in_progress' ? `Barber: ${activeTicket.staff_name}` : `${activeTicket.ahead_count || 0} waiting ahead • Tap for live ladder`}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold bg-white text-emerald-800 px-2.5 py-1 rounded-full shadow-xs">
                                        Track →
                                    </span>
                                </div>
                            )}

                            {/* Promo Hero Card (From User Screenshot) */}
                            <div className="relative rounded-[28px] overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white p-5 shadow-lg border border-indigo-950/20">
                                <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-30 sm:opacity-40 pointer-events-none">
                                    <img
                                        src="/images/salon_hero.jpg"
                                        alt="Salon Hero"
                                        className="w-full h-full object-cover object-center mix-blend-luminosity"
                                    />
                                </div>
                                <div className="relative z-10 max-w-[210px] space-y-2">
                                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 text-[10px] font-bold uppercase tracking-wider border border-indigo-400/20">
                                        Smart Dispatch
                                    </span>
                                    <h2 className="text-xl font-black tracking-tight leading-tight">
                                        New Style<br />New You
                                    </h2>
                                    <p className="text-[11px] text-slate-300 font-medium">
                                        No waiting rooms. Instant live queue slot on your phone.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const el = document.getElementById('services-list');
                                            el?.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                        className="mt-1 px-4 py-2 rounded-full bg-white hover:bg-slate-100 text-slate-950 text-xs font-black shadow-sm flex items-center gap-1.5 transition-all"
                                    >
                                        <span>Explore Services</span>
                                        <ArrowRight className="w-3.5 h-3.5 text-slate-900" />
                                    </button>
                                </div>
                            </div>

                            {/* Popular Services Horizontal Scroll (From User Screenshot) */}
                            <div className="space-y-2 pt-1">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-black text-slate-900">Popular Services</h3>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedCategory('all')}
                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                                    >
                                        See All
                                    </button>
                                </div>
                                <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar">
                                    {categories.map((cat) => {
                                        const Icon = cat.icon;
                                        const isSelected = selectedCategory === cat.id;
                                        return (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                onClick={() => setSelectedCategory(cat.id)}
                                                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-2xl min-w-[72px] transition-all shrink-0 ${
                                                    isSelected
                                                        ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/10'
                                                        : 'bg-white border border-slate-100 hover:border-slate-200 text-slate-700'
                                                }`}
                                            >
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSelected ? 'bg-white/10 text-white' : cat.color}`}>
                                                    <Icon className="w-5 h-5" />
                                                </div>
                                                <span className="text-[11px] font-bold">{cat.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Top Salons Near You / Branch Card */}
                            <div className="space-y-2 pt-1">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-black text-slate-900">Selected Salon Studio</h3>
                                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                        Live Open
                                    </span>
                                </div>

                                <div className="bg-white rounded-3xl p-3 border border-slate-100 shadow-sm flex items-center gap-3">
                                    <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 bg-slate-100">
                                        <img
                                            src="/images/salon_chair.jpg"
                                            alt={shop.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-black text-sm text-slate-900 truncate">{shop.name}</h4>
                                            <div className="flex items-center gap-0.5 text-amber-500 font-black text-xs">
                                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                                <span>4.9</span>
                                            </div>
                                        </div>
                                        <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                            <span className="truncate">{shop.branch_name} • {shop.city}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
                                                {shop.active_staff_count} Barbers Active
                                            </span>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                                                {shop.pending_count} Waiting
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Service Selection List with (+) Buttons (Screen 3 in User Screenshot) */}
                            <div id="services-list" className="space-y-2 pt-1">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-black text-slate-900">Select Service</h3>
                                    <span className="text-xs text-slate-400 font-semibold">
                                        {filteredServices.length} available
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    {filteredServices.map((svc) => {
                                        const isSelected = selectedServiceId === svc.id;
                                        return (
                                            <div
                                                key={svc.id}
                                                onClick={() => handleSelectService(svc.id)}
                                                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                                                    isSelected
                                                        ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/10'
                                                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-100 shadow-xs'
                                                }`}
                                            >
                                                <div className="space-y-0.5 min-w-0 pr-2">
                                                    <div className="font-black text-xs sm:text-sm truncate">{svc.name}</div>
                                                    <div className={`text-[11px] flex items-center gap-1.5 ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                                                        <Clock className="w-3 h-3" />
                                                        <span>{svc.duration_minutes} min</span>
                                                        {svc.description && <span>• {svc.description}</span>}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 shrink-0">
                                                    <span className="font-black text-xs sm:text-sm">{svc.formatted_price}</span>
                                                    <div
                                                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                                                            isSelected
                                                                ? 'bg-emerald-500 text-white shadow-xs scale-105 ring-2 ring-emerald-400/40'
                                                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                        }`}
                                                    >
                                                        {isSelected ? <Check className="w-4 h-4 stroke-[2.5]" /> : <span className="text-sm font-bold leading-none">+</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Booking Mode Selector (Join Queue Now vs Schedule Time) */}
                            <div className="bg-slate-100 p-1 rounded-2xl grid grid-cols-2 gap-1 text-xs font-bold">
                                <button
                                    type="button"
                                    onClick={() => setBookingMode('now')}
                                    className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                                        bookingMode === 'now'
                                            ? 'bg-white text-slate-900 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-900'
                                    }`}
                                >
                                    <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                    <span>Join Queue (Now)</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBookingMode('later')}
                                    className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                                        bookingMode === 'later'
                                            ? 'bg-white text-slate-900 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-900'
                                    }`}
                                >
                                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>Schedule Today</span>
                                </button>
                            </div>

                            {/* Timeline Slots if 'later' chosen */}
                            {bookingMode === 'later' && (
                                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 space-y-2 animate-fadeIn">
                                    <div className="text-xs font-black text-slate-800">Available Slots Today</div>
                                    <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto">
                                        {timelineSlots.map((slot) => {
                                            const isSelected = selectedSlotTime === slot.time_24;
                                            if (slot.is_past) {
                                                return (
                                                    <div key={slot.time_24} className="p-2 rounded-xl bg-slate-50 text-slate-300 text-center text-xs line-through">
                                                        {slot.time_12}
                                                    </div>
                                                );
                                            }
                                            if (!slot.is_free) {
                                                return (
                                                    <div key={slot.time_24} className="p-2 rounded-xl bg-rose-50 text-rose-400 text-center text-xs font-bold">
                                                        {slot.time_12}
                                                    </div>
                                                );
                                            }
                                            return (
                                                <button
                                                    key={slot.time_24}
                                                    type="button"
                                                    onClick={() => setSelectedSlotTime(slot.time_24)}
                                                    className={`p-2 rounded-xl text-center text-xs font-bold transition-all ${
                                                        isSelected
                                                            ? 'bg-slate-900 text-white shadow-xs'
                                                            : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                                    }`}
                                                >
                                                    {slot.time_12}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* --------------------------------------------------------------------------------- */}
                    {/* TAB 2: LIVE QUEUE LADDER (EXACT USER REQUIREMENT: CUTTING -> 7 -> 8 -> 9 YOURS)   */}
                    {/* --------------------------------------------------------------------------------- */}
                    {(navTab === 'ticket' || navTab === 'chairs') && (
                        <div className="space-y-4 animate-fadeIn">
                            {/* Header Status Card */}
                            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                                            Live Smart Queue Floor
                                        </span>
                                    </div>
                                    <span className="text-[11px] font-bold text-slate-400">
                                        Shop: {shop.name}
                                    </span>
                                </div>

                                {activeTicket ? (
                                    activeTicket.status === 'in_progress' ? (
                                        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1 text-center">
                                            <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-sm">
                                                <Scissors className="w-5 h-5 animate-bounce" />
                                            </div>
                                            <h3 className="text-base font-black">You are in the Chair Now!</h3>
                                            <p className="text-xs font-semibold text-emerald-700">
                                                Barber Specialist: {activeTicket.staff_name || 'Assigned Stylist'}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-100 text-indigo-950 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2.5 py-1 rounded-full bg-indigo-600 text-white text-xs font-black">
                                                        Ticket #{activeTicket.queue_number}
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-600">
                                                        {activeTicket.customer_name}
                                                    </span>
                                                </div>
                                                <span className="text-xs font-black text-indigo-700">
                                                    {activeTicket.service_name}
                                                </span>
                                            </div>

                                            {/* Predicted Time Banner */}
                                            <div className="pt-2 border-t border-indigo-100/80 flex items-center justify-between text-xs font-bold">
                                                <span className="text-slate-600 flex items-center gap-1">
                                                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                                                    Pending in front:
                                                </span>
                                                <span className="text-indigo-900">
                                                    {activeTicket.ahead_count === 0
                                                        ? 'You are next in line!'
                                                        : `${activeTicket.ahead_count} customer(s) ahead`}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs font-bold">
                                                <span className="text-slate-600">Predicted Turn:</span>
                                                <span className="text-emerald-700 font-black">
                                                    {activeTicket.predicted_turn_time || `~${activeTicket.estimated_wait_minutes} mins`}
                                                </span>
                                            </div>
                                        </div>
                                    )
                                ) : (
                                    <div className="p-3 bg-slate-50 rounded-2xl text-center space-y-1">
                                        <div className="text-xs font-bold text-slate-700">You don't have an active ticket yet</div>
                                        <p className="text-[11px] text-slate-400">
                                            Select a service on the Home tab to join the queue and get your spot!
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* THE VISUAL QUEUE LADDER (REDESIGNED FOR MAXIMUM CLARITY & CLEAN LOOK) */}
                            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                                            <Scissors className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-black text-slate-900 tracking-tight uppercase">
                                                Queue Ladder Progression
                                            </h4>
                                            <p className="text-[11px] text-slate-400 font-medium">Real-time floor & chair progression</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        <span>Live Sync</span>
                                    </div>
                                </div>

                                {/* Vertical Timeline Ladder Container */}
                                <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-emerald-400 before:via-indigo-300 before:to-purple-500">
                                    {/* 1. CUTTING LEVEL (IN CHAIR NOW) */}
                                    <div className="relative space-y-2.5">
                                        {/* Step Marker Dot */}
                                        <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs ring-4 ring-emerald-50">
                                            <Scissors className="w-2.5 h-2.5" />
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                                                Cutting in Chair Now
                                            </span>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-100">
                                                {(activeTicket?.cutting_tickets?.length || currentCutting.length)} Active
                                            </span>
                                        </div>

                                        {/* Individual Clean Cards for Each Cutting Customer */}
                                        <div className="space-y-2">
                                            {((activeTicket?.cutting_tickets && activeTicket.cutting_tickets.length > 0)
                                                ? activeTicket.cutting_tickets
                                                : currentCutting
                                            ).map((cut, idx) => (
                                                <div
                                                    key={idx}
                                                    className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/70 border border-slate-200/70 transition-all flex items-center justify-between"
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-900 flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                                                            #{cut.queue_number}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-xs font-black text-slate-900 truncate">
                                                                {cut.customer_name}
                                                            </div>
                                                            <div className="text-[11px] text-slate-500 truncate font-medium">
                                                                {cut.service_name}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="text-right shrink-0 pl-2">
                                                        <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[10px] font-bold">
                                                            ✂️ {cut.staff_name}
                                                        </span>
                                                        <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                                                            {cut.started_at || 'In Chair'}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                            {(!activeTicket?.cutting_tickets?.length && !currentCutting.length) && (
                                                <div className="p-3 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-400 font-medium">
                                                    All styling chairs are currently open and ready.
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 2. WAITING TICKETS AHEAD (IN FRONT OF YOU) */}
                                    {((activeTicket?.waiting_ahead && activeTicket.waiting_ahead.length > 0) || (currentWaiting.length > 0 && !activeTicket)) && (
                                        <div className="relative space-y-2">
                                            {/* Step Marker Dot */}
                                            <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-xs ring-4 ring-indigo-50">
                                                <Clock className="w-2.5 h-2.5" />
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700">
                                                    Waiting Ahead in Line
                                                </span>
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                    {activeTicket?.waiting_ahead?.length || currentWaiting.length} Ahead
                                                </span>
                                            </div>

                                            <div className="space-y-1.5">
                                                {((activeTicket?.waiting_ahead && activeTicket.waiting_ahead.length > 0)
                                                    ? activeTicket.waiting_ahead
                                                    : currentWaiting.slice(0, 3)
                                                ).map((wait) => (
                                                    <div
                                                        key={wait.queue_number}
                                                        className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between"
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center font-black text-[11px] shrink-0">
                                                                {wait.queue_number}
                                                            </span>
                                                            <div className="text-xs font-bold text-slate-800 truncate">
                                                                Ticket #{wait.queue_number} <span className="text-slate-400 font-normal">({wait.service_name})</span>
                                                            </div>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-400 shrink-0">
                                                            Waiting
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* 3. YOUR SPOT IN QUEUE (HIGHLIGHTED) */}
                                    {activeTicket && activeTicket.status === 'pending' && (
                                        <div className="relative space-y-2">
                                            {/* Step Marker Dot */}
                                            <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-gradient-to-tr from-amber-400 to-indigo-600 text-white flex items-center justify-center shadow-xs ring-4 ring-amber-50 animate-pulse">
                                                <Sparkles className="w-2.5 h-2.5 fill-white" />
                                            </div>

                                            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-lg border border-indigo-500/30 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-black text-sm text-white shadow-xs">
                                                            #{activeTicket.queue_number}
                                                        </div>
                                                        <div>
                                                            <div className="font-black text-sm text-emerald-300 flex items-center gap-1.5">
                                                                <span>#{activeTicket.queue_number} . YOURS</span>
                                                                <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                                                            </div>
                                                            <div className="text-[11px] text-slate-300 font-medium">
                                                                {activeTicket.service_name} • {activeTicket.customer_name}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-xs">
                                                        Your Place
                                                    </span>
                                                </div>

                                                <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs">
                                                    <span className="text-slate-400 font-medium flex items-center gap-1">
                                                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                                                        Predicted Turn:
                                                    </span>
                                                    <span className="font-black text-emerald-300 text-sm">
                                                        {activeTicket.predicted_turn_time || `~${activeTicket.estimated_wait_minutes} mins`}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Barber Pending Notice Box */}
                                {activeTicket && activeTicket.status === 'pending' && (
                                    <div className="p-3 bg-indigo-50/80 border border-indigo-100 rounded-2xl text-xs text-indigo-950 font-semibold flex items-center gap-2.5">
                                        <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                                        <span>
                                            Barber has {activeTicket.ahead_count || 0} pending order(s) ahead of you. Predicted turn: <strong className="text-indigo-900">{activeTicket.predicted_turn_time || 'Soon'}</strong>.
                                        </span>
                                    </div>
                                )}

                                {activeTicket && (
                                    <div className="pt-1 flex items-center justify-between text-xs">
                                        <button
                                            type="button"
                                            onClick={handleLeaveQueue}
                                            className="text-rose-600 hover:text-rose-800 font-bold transition-colors"
                                        >
                                            Cancel My Ticket
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setNavTab('home')}
                                            className="text-slate-600 hover:text-slate-900 font-bold transition-colors"
                                        >
                                            ← Back to Services
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ---------------------------------------------------- */}
                    {/* TAB 4: SWITCH PORTALS (Admin & Barber Logins)       */}
                    {/* ---------------------------------------------------- */}
                    {navTab === 'portals' && (
                        <div className="space-y-4 animate-fadeIn">
                            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4 text-center">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                                    <Shield className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900">Staff & Management Gateway</h3>
                                    <p className="text-xs text-slate-500 font-medium mt-1">
                                        Choose your destination portal to sign in with your credentials.
                                    </p>
                                </div>

                                <div className="space-y-2.5 pt-2 text-left">
                                    <Link
                                        href="/admin"
                                        className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-between group transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                                                <Shield className="w-5 h-5 text-indigo-300" />
                                            </div>
                                            <div>
                                                <div className="font-black text-sm">Master Admin HQ</div>
                                                <div className="text-[11px] text-slate-300">/admin • Stores, staff & payroll</div>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                                    </Link>

                                    <Link
                                        href="/staff"
                                        className="p-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-950 flex items-center justify-between group transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                                                <Scissors className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="font-black text-sm">Barber Chair Terminal</div>
                                                <div className="text-[11px] text-emerald-700">/staff • Call clients & complete cuts</div>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-emerald-700 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}
                </main>

                {/* FLOATING ACTION BOTTOM BAR (JOIN QUEUE BUTTON) */}
                {navTab === 'home' && (
                    <div className="absolute bottom-[66px] left-0 right-0 px-5 py-2.5 bg-gradient-to-t from-white via-white/95 to-transparent z-20 pointer-events-auto">
                        <button
                            type="button"
                            onClick={handleOpenContactModal}
                            className="w-full py-3.5 px-5 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-black text-sm shadow-xl flex items-center justify-between transition-all"
                        >
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                <span>{bookingMode === 'now' ? 'Join Live Queue' : 'Book Free Slot'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 font-black text-emerald-300">
                                <span>{selectedService.formatted_price}</span>
                                <ArrowRight className="w-4 h-4 text-white" />
                            </div>
                        </button>
                    </div>
                )}

                {/* NATIVE MOBILE BOTTOM NAVIGATION BAR */}
                <nav className="absolute bottom-0 left-0 right-0 h-[64px] bg-white/95 backdrop-blur-md border-t border-slate-100 px-6 flex items-center justify-between z-30 select-none">
                    <button
                        type="button"
                        onClick={() => setNavTab('home')}
                        className={`flex flex-col items-center gap-1 transition-colors ${
                            navTab === 'home' ? 'text-slate-900 font-black' : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        <Home className={`w-5 h-5 ${navTab === 'home' ? 'stroke-[2.5px]' : ''}`} />
                        <span className="text-[10px]">Home</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setNavTab('ticket')}
                        className={`flex flex-col items-center gap-1 transition-colors relative ${
                            navTab === 'ticket' ? 'text-indigo-600 font-black' : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        <Ticket className={`w-5 h-5 ${navTab === 'ticket' ? 'stroke-[2.5px]' : ''}`} />
                        <span className="text-[10px]">My Ticket</span>
                        {activeTicket && activeTicket.status !== 'completed' && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 absolute top-0 right-1 ring-2 ring-white"></span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => setNavTab('chairs')}
                        className={`flex flex-col items-center gap-1 transition-colors ${
                            navTab === 'chairs' ? 'text-slate-900 font-black' : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        <Armchair className={`w-5 h-5 ${navTab === 'chairs' ? 'stroke-[2.5px]' : ''}`} />
                        <span className="text-[10px]">Ladder</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setNavTab('portals')}
                        className={`flex flex-col items-center gap-1 transition-colors ${
                            navTab === 'portals' ? 'text-slate-900 font-black' : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        <LogIn className={`w-5 h-5 ${navTab === 'portals' ? 'stroke-[2.5px]' : ''}`} />
                        <span className="text-[10px]">Portals</span>
                    </button>
                </nav>

                {/* BOTTOM CONTACT SHEET MODAL (SLIDE UP NATIVE iOS SHEET) */}
                {showContactModal && (
                    <div className="absolute inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end justify-center animate-fadeIn">
                        <div className="bg-white w-full rounded-t-[36px] p-6 shadow-2xl border-t border-slate-200 space-y-4 animate-slideUp max-h-[85vh] overflow-y-auto">
                            {/* Sheet Pull Bar */}
                            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-1"></div>

                            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                <div>
                                    <h3 className="text-base font-black text-slate-900">
                                        Confirm Your Spot
                                    </h3>
                                    <p className="text-xs text-slate-400 font-medium">
                                        We will notify your turn on this mobile number
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowContactModal(false)}
                                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Booking Summary Box */}
                            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
                                <div>
                                    <div className="font-black text-slate-900">{selectedService?.name}</div>
                                    <div className="text-slate-500 mt-0.5 font-medium">
                                        {bookingMode === 'now'
                                            ? '⚡ Central Live Queue Now'
                                            : `🕒 Slot: Today at ${selectedSlotObj?.time_12 || selectedSlotTime}`}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-black text-slate-900 text-sm">{selectedService?.formatted_price}</div>
                                    <div className="text-[11px] text-slate-400">{selectedService?.duration_minutes} mins</div>
                                </div>
                            </div>

                            {errorMessage && (
                                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                                    <span>{errorMessage}</span>
                                </div>
                            )}

                            <form onSubmit={handleConfirmBooking} className="space-y-3.5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Your Full Name
                                    </label>
                                    <div className="relative">
                                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="e.g. Kasun Kumara"
                                            required
                                            autoFocus
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Mobile Phone Number
                                    </label>
                                    <div className="relative">
                                        <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="e.g. 0771234567"
                                            required
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                                        />
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-1 font-medium">
                                        No account password needed. Your ticket is stored securely on this phone.
                                    </p>
                                </div>

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full py-3.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                                <span>Booking Your Spot...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Confirm & Get Ticket</span>
                                                <CheckCircle2 className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
