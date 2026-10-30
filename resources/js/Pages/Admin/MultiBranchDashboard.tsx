import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import {
    Building2,
    Store,
    Users,
    TrendingUp,
    Clock,
    DollarSign,
    Settings,
    FileSpreadsheet,
    Scissors,
    Plus,
    CheckCircle2,
    Calendar,
    ChevronRight,
    MapPin,
    ArrowUpRight,
    Sliders,
    Sparkles,
    Check,
    Download,
    QrCode,
    Printer,
    ExternalLink,
    MessageSquare,
    Send,
    Smartphone,
    RefreshCw,
    Activity,
    ShieldCheck,
    UserCheck,
    Flame,
    Trash2,
    Edit3,
    X,
    UserPlus,
    Tag,
    ChevronDown,
    LayoutDashboard,
    Briefcase,
    Receipt,
    AlertTriangle,
    AlertCircle,
    Search,
    Menu,
    Bell,
    Mail,
    MoreVertical,
    Share2,
    CheckCircle,
    XCircle,
    Phone,
    History,
    User
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface ShopBrief {
    id: number;
    branch_id: number;
    name: string;
    slug: string;
    address?: string | null;
    phone?: string | null;
    opening_time?: string;
    closing_time?: string;
    staff_capacity?: number;
    payroll_type?: 'commission' | 'fixed' | 'hybrid';
    commission_rate?: number;
    fixed_daily_wage_cents?: number;
    is_active?: boolean;
    staff_count: number;
    services_count?: number;
}

interface BranchItem {
    id: number;
    name: string;
    slug?: string;
    city: string;
    is_active?: boolean;
    shops: ShopBrief[];
}

interface SelectedShop {
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
    staff_capacity: number;
    payroll_type: string;
    commission_rate: number;
    fixed_daily_wage_cents: number;
}

interface KpiData {
    today_revenue: string;
    today_count: number;
    month_revenue: string;
    month_count: number;
    all_time_revenue: string;
    all_time_count: number;
    active_staff_count: number;
    total_staff_count: number;
}

interface StaffCurrentTicket {
    id: number;
    ticket_uuid?: string;
    queue_number: number;
    customer_name: string;
    customer_phone: string;
    service_name: string;
    service_duration: number;
    price_cents: number;
    price_rupees: number;
    formatted_price: string;
    commission_rupees: number;
    started_at?: string | null;
    started_diff?: string | null;
}

interface CompletedTicketSummary {
    id: number;
    queue_number: number;
    customer_name: string;
    customer_phone: string;
    service_name: string;
    formatted_price: string;
    commission_earned: string;
    completed_at: string;
}

interface StaffStats {
    today_cuts_count: number;
    today_revenue: string;
    today_commission: string;
    all_time_cuts_count: number;
    all_time_revenue: string;
    all_time_commission: string;
    today_completed_tickets: CompletedTicketSummary[];
}

interface FloorStaff {
    id: number;
    name: string;
    display_name: string;
    phone?: string | null;
    email?: string | null;
    working_status: 'offline' | 'free' | 'busy';
    commission_rate: number;
    is_active: boolean;
    shop_id?: number;
    shop_name?: string;
    branch_name?: string;
    is_cutting_now?: boolean;
    current_customer: string | null;
    current_service: string | null;
    current_ticket?: StaffCurrentTicket | null;
    stats?: StaffStats;
}

interface LiveQueueItem {
    id: number;
    queue_number: number;
    customer_name: string;
    customer_phone: string;
    service_name: string;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    source: string;
    queued_at: string;
}

interface ServiceItem {
    id: number;
    name: string;
    duration_minutes: number;
    price_cents: number;
    price_rupees: number;
    formatted_price: string;
    is_active: boolean;
}

interface ShopSummary {
    shop_id: number;
    shop_name: string;
    branch_name: string;
    city: string;
    payroll_type: string;
    commission_rate: string;
    active_workers: number;
    total_cuts: number;
    today_revenue: string;
    month_revenue: string;
}

interface Props {
    flash?: {
        success?: string | null;
        error?: string | null;
    };
    branches: BranchItem[];
    selectedShop: SelectedShop;
    kpis: KpiData;
    activeFloorStaff: FloorStaff[];
    shopStaff: FloorStaff[];
    liveQueue: LiveQueueItem[];
    services: ServiceItem[];
    shopSummaries: ShopSummary[];
    smsConfig?: {
        sender_id: string;
        user_id: string;
        sms_balance?: string;
    };
}

export default function MultiBranchDashboard({
    flash,
    branches,
    selectedShop,
    kpis,
    activeFloorStaff,
    shopStaff = [],
    liveQueue,
    services,
    shopSummaries,
    smsConfig,
}: Props) {
    // Navigation Sidebar Tab State
    const [activeTab, setActiveTab] = useState<'floor' | 'services' | 'staff' | 'branches' | 'settings' | 'reports' | 'qr_codes' | 'sms'>('floor');
    const [shopDropdownOpen, setShopDropdownOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Modals state
    const [serviceModalOpen, setServiceModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<ServiceItem | null>(null);
    const [serviceForm, setServiceForm] = useState({
        name: '',
        duration_minutes: 25,
        price_rupees: 1500,
        is_active: true,
    });

    const [staffModalOpen, setStaffModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<FloorStaff | null>(null);
    const [staffForm, setStaffForm] = useState({
        name: '',
        display_name: '',
        phone: '',
        email: '',
        password: '',
        commission_rate: selectedShop.commission_rate || 40,
        working_status: 'free' as 'free' | 'busy' | 'offline',
        is_active: true,
    });

    // Detailed Barber Profile & Stats Modal
    const [selectedStaffDetail, setSelectedStaffDetail] = useState<FloorStaff | null>(null);
    const [staffDetailModalOpen, setStaffDetailModalOpen] = useState(false);
    const [staffDetailTab, setStaffDetailTab] = useState<'overview' | 'edit'>('overview');

    // Delete Staff Modal State
    const [deleteStaffModalOpen, setDeleteStaffModalOpen] = useState(false);
    const [staffToDelete, setStaffToDelete] = useState<FloorStaff | null>(null);

    // Delete Service Modal State
    const [deleteServiceModalOpen, setDeleteServiceModalOpen] = useState(false);
    const [serviceToDelete, setServiceToDelete] = useState<ServiceItem | null>(null);

    // Branch Modals State
    const [branchModalOpen, setBranchModalOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<BranchItem | null>(null);
    const [branchForm, setBranchForm] = useState({
        name: '',
        city: '',
        is_active: true,
    });
    const [deleteBranchModalOpen, setDeleteBranchModalOpen] = useState(false);
    const [branchToDelete, setBranchToDelete] = useState<BranchItem | null>(null);

    // Shop Storefront Modals State
    const [shopModalOpen, setShopModalOpen] = useState(false);
    const [editingShop, setEditingShop] = useState<ShopBrief | null>(null);
    const [shopForm, setShopForm] = useState({
        branch_id: branches[0]?.id || 1,
        name: '',
        address: '',
        phone: '',
        opening_time: '09:00',
        closing_time: '20:00',
        staff_capacity: 6,
        payroll_type: 'commission' as 'commission' | 'fixed' | 'hybrid',
        commission_rate: 40.0,
        fixed_daily_wage_cents: 250000,
        is_active: true,
    });
    const [deleteShopModalOpen, setDeleteShopModalOpen] = useState(false);
    const [shopToDelete, setShopToDelete] = useState<ShopBrief | null>(null);

    // SMS Tester form state
    const [smsPhone, setSmsPhone] = useState('');
    const [smsType, setSmsType] = useState<'ready' | 'confirmed' | 'completed' | 'custom'>('ready');
    const [smsCustomMessage, setSmsCustomMessage] = useState('');
    const [isSendingSms, setIsSendingSms] = useState(false);
    const [smsResult, setSmsResult] = useState<any | null>(null);
    const [smsBalance, setSmsBalance] = useState<string | null>(smsConfig?.sms_balance || '1,437.59');
    const [isCheckingBalance, setIsCheckingBalance] = useState(false);

    // Operating Hours & Settings Form
    const [settingsForm, setSettingsForm] = useState({
        opening_time: selectedShop.opening_time || '09:00',
        closing_time: selectedShop.closing_time || '20:00',
        staff_capacity: selectedShop.staff_capacity || 6,
        payroll_type: selectedShop.payroll_type || 'commission',
        commission_rate: selectedShop.commission_rate || 40.0,
        fixed_daily_wage_cents: selectedShop.fixed_daily_wage_cents || 250000,
    });

    const handleCheckBalance = async () => {
        setIsCheckingBalance(true);
        try {
            const res = await fetch('/admin/sms/status');
            const data = await res.json();
            if (data?.data?.sms_credit_balance) {
                setSmsBalance(data.data.sms_credit_balance);
            }
        } catch {
            // keep fallback
        } finally {
            setIsCheckingBalance(false);
        }
    };

    const handleSendTestSms = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSendingSms(true);
        setSmsResult(null);

        try {
            const res = await fetch('/admin/sms/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({
                    phone: smsPhone,
                    type: smsType,
                    message: smsCustomMessage,
                }),
            });
            const data = await res.json();
            setSmsResult(data);
            if (data.success) {
                handleCheckBalance();
            }
        } catch (err: any) {
            setSmsResult({ success: false, message: err?.message || 'Network error sending SMS.' });
        } finally {
            setIsSendingSms(false);
        }
    };

    const handleSaveSettings = (e: React.FormEvent) => {
        e.preventDefault();
        router.post(`/admin/shops/${selectedShop.id}/settings`, settingsForm, {
            preserveScroll: true,
        });
    };

    // Service handlers
    const openCreateServiceModal = () => {
        setEditingService(null);
        setServiceForm({
            name: '',
            duration_minutes: 25,
            price_rupees: 1500,
            is_active: true,
        });
        setServiceModalOpen(true);
    };

    const openEditServiceModal = (svc: ServiceItem) => {
        setEditingService(svc);
        setServiceForm({
            name: svc.name,
            duration_minutes: svc.duration_minutes,
            price_rupees: svc.price_rupees,
            is_active: svc.is_active,
        });
        setServiceModalOpen(true);
    };

    const handleSaveService = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingService) {
            router.post(`/admin/services/${editingService.id}/update`, {
                name: serviceForm.name,
                duration_minutes: serviceForm.duration_minutes,
                price_cents: serviceForm.price_rupees * 100,
                is_active: serviceForm.is_active,
            }, {
                preserveScroll: true,
                onSuccess: () => setServiceModalOpen(false),
            });
        } else {
            router.post(`/admin/shops/${selectedShop.id}/services`, {
                name: serviceForm.name,
                duration_minutes: serviceForm.duration_minutes,
                price_cents: serviceForm.price_rupees * 100,
            }, {
                preserveScroll: true,
                onSuccess: () => setServiceModalOpen(false),
            });
        }
    };

    const openDeleteServiceModal = (svc: ServiceItem) => {
        setServiceToDelete(svc);
        setDeleteServiceModalOpen(true);
    };

    const handleConfirmDeleteService = () => {
        if (!serviceToDelete) return;
        router.post(`/admin/services/${serviceToDelete.id}/delete`, {}, {
            preserveScroll: true,
            onSuccess: () => setDeleteServiceModalOpen(false),
        });
    };

    // Staff handlers
    const openCreateStaffModal = () => {
        setEditingStaff(null);
        setStaffForm({
            name: '',
            display_name: '',
            phone: '',
            email: '',
            password: '',
            commission_rate: selectedShop.commission_rate || 40,
            working_status: 'free',
            is_active: true,
        });
        setStaffModalOpen(true);
    };

    const openStaffDetailModal = (staff: FloorStaff, initialTab: 'overview' | 'edit' = 'overview') => {
        const fresh = shopStaff.find(s => s.id === staff.id) || staff;
        setSelectedStaffDetail(fresh);
        setEditingStaff(fresh);
        setStaffForm({
            name: fresh.name,
            display_name: fresh.display_name,
            phone: fresh.phone || '',
            email: fresh.email || '',
            password: '',
            commission_rate: fresh.commission_rate,
            working_status: fresh.working_status,
            is_active: fresh.is_active,
        });
        setStaffDetailTab(initialTab);
        setStaffDetailModalOpen(true);
    };

    const openEditStaffModal = (staff: FloorStaff) => {
        openStaffDetailModal(staff, 'edit');
    };

    const handleSaveStaff = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingStaff) {
            router.post(`/admin/staff/${editingStaff.id}/update`, staffForm, {
                preserveScroll: true,
                onSuccess: () => {
                    setStaffModalOpen(false);
                    setStaffDetailModalOpen(false);
                },
            });
        } else {
            router.post(`/admin/shops/${selectedShop.id}/staff`, staffForm, {
                preserveScroll: true,
                onSuccess: () => setStaffModalOpen(false),
            });
        }
    };

    const openDeleteStaffModal = (staff: FloorStaff) => {
        setStaffToDelete(staff);
        setDeleteStaffModalOpen(true);
    };

    const handleConfirmDeleteStaff = () => {
        if (!staffToDelete) return;
        router.post(`/admin/staff/${staffToDelete.id}/delete`, {}, {
            preserveScroll: true,
            onSuccess: () => setDeleteStaffModalOpen(false),
        });
    };

    // Branch handlers
    const openCreateBranchModal = () => {
        setEditingBranch(null);
        setBranchForm({ name: '', city: '', is_active: true });
        setBranchModalOpen(true);
    };

    const openEditBranchModal = (branch: BranchItem) => {
        setEditingBranch(branch);
        setBranchForm({
            name: branch.name,
            city: branch.city,
            is_active: branch.is_active ?? true,
        });
        setBranchModalOpen(true);
    };

    const handleSaveBranch = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingBranch) {
            router.post(`/admin/branches/${editingBranch.id}/update`, branchForm, {
                preserveScroll: true,
                onSuccess: () => setBranchModalOpen(false),
            });
        } else {
            router.post('/admin/branches', branchForm, {
                preserveScroll: true,
                onSuccess: () => setBranchModalOpen(false),
            });
        }
    };

    const openDeleteBranchModal = (branch: BranchItem) => {
        setBranchToDelete(branch);
        setDeleteBranchModalOpen(true);
    };

    const handleConfirmDeleteBranch = () => {
        if (!branchToDelete) return;
        router.post(`/admin/branches/${branchToDelete.id}/delete`, {}, {
            preserveScroll: true,
            onSuccess: () => setDeleteBranchModalOpen(false),
        });
    };

    // Shop handlers
    const openCreateShopModal = (defaultBranchId?: number) => {
        setEditingShop(null);
        setShopForm({
            branch_id: defaultBranchId || selectedShop.branch_id || branches[0]?.id || 1,
            name: '',
            address: '',
            phone: '',
            opening_time: '09:00',
            closing_time: '20:00',
            staff_capacity: 6,
            payroll_type: 'commission',
            commission_rate: 40.0,
            fixed_daily_wage_cents: 250000,
            is_active: true,
        });
        setShopModalOpen(true);
    };

    const openEditShopModal = (shp: ShopBrief) => {
        setEditingShop(shp);
        setShopForm({
            branch_id: shp.branch_id,
            name: shp.name,
            address: shp.address || '',
            phone: shp.phone || '',
            opening_time: shp.opening_time || '09:00',
            closing_time: shp.closing_time || '20:00',
            staff_capacity: shp.staff_capacity || 6,
            payroll_type: (shp.payroll_type as any) || 'commission',
            commission_rate: shp.commission_rate ?? 40.0,
            fixed_daily_wage_cents: shp.fixed_daily_wage_cents || 250000,
            is_active: shp.is_active ?? true,
        });
        setShopModalOpen(true);
    };

    const handleSaveShop = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingShop) {
            router.post(`/admin/shops/${editingShop.id}/update`, shopForm, {
                preserveScroll: true,
                onSuccess: () => setShopModalOpen(false),
            });
        } else {
            router.post('/admin/shops', shopForm, {
                preserveScroll: true,
                onSuccess: () => setShopModalOpen(false),
            });
        }
    };

    const openDeleteShopModal = (shp: ShopBrief) => {
        setShopToDelete(shp);
        setDeleteShopModalOpen(true);
    };

    const handleConfirmDeleteShop = () => {
        if (!shopToDelete) return;
        router.post(`/admin/shops/${shopToDelete.id}/delete`, {}, {
            preserveScroll: true,
            onSuccess: () => setDeleteShopModalOpen(false),
        });
    };

    const handleSelectShop = (shopId: number) => {
        router.get('/admin/dashboard', { shop_id: shopId }, { preserveState: false });
        setShopDropdownOpen(false);
    };

    const handleExportCsv = () => {
        const headers = ['Shop Name', 'Branch', 'City', 'Payroll Model', 'Commission Rate', 'Active Workers', 'Total Completed Cuts', 'Today Revenue', 'Month Revenue'];
        const rows = shopSummaries.map((s) => [
            `"${s.shop_name}"`,
            `"${s.branch_name}"`,
            `"${s.city}"`,
            `"${s.payroll_type}"`,
            `"${s.commission_rate}"`,
            s.active_workers,
            s.total_cuts,
            `"${s.today_revenue}"`,
            `"${s.month_revenue}"`,
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `salon_chain_financial_report_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const currentShopList = branches.flatMap((b) => b.shops.map((s) => ({ ...s, branchName: b.name, city: b.city })));

    return (
        <div className="min-h-screen bg-[#EAEBF0] text-slate-800 font-sans p-0 sm:p-3 md:p-6 antialiased flex items-center justify-center selection:bg-indigo-500 selection:text-white">
            <Head title={`Master Admin — ${selectedShop.name} (${selectedShop.city})`} />

            {/* App Master Floating Frame (Exact Style & Curves from User Reference Image) */}
            <div className="w-full max-w-[1560px] bg-white rounded-none sm:rounded-[28px] md:rounded-[36px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.03)] border-0 sm:border border-slate-200/80 overflow-hidden flex flex-col md:flex-row min-h-screen md:min-h-[92vh]">

                {/* ========================================================= */}
                {/* MOBILE TOP NAVIGATION BAR (Visible only on < md)           */}
                {/* ========================================================= */}
                <div className="md:hidden bg-white border-b border-slate-100 sticky top-0 z-30">
                    <div className="px-4 py-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black shadow-xs">
                                <Scissors className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h1 className="text-sm font-extrabold tracking-tight text-slate-900 leading-none">
                                    healthy<span className="text-indigo-600 font-bold">.saloon</span>
                                </h1>
                                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Smart Queue HQ</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => setShopDropdownOpen(!shopDropdownOpen)}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700 text-[11px] font-bold flex items-center gap-1 max-w-[130px] truncate shadow-2xs"
                            >
                                <Store className="w-3 h-3 text-slate-500 shrink-0" />
                                <span className="truncate">{selectedShop.name}</span>
                                <ChevronDown className={`w-3 h-3 text-slate-400 shrink-0 transition-transform ${shopDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            <button
                                type="button"
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors shadow-2xs"
                                aria-label="Toggle navigation menu"
                            >
                                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Mobile Shop Switcher Drawer */}
                    {shopDropdownOpen && (
                        <div className="p-3 bg-white border-b border-slate-100 space-y-1.5 animate-fadeIn shadow-inner">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                                Switch Active Salon:
                            </div>
                            <div className="max-h-56 overflow-y-auto space-y-1">
                                {currentShopList.map((shp) => (
                                    <button
                                        key={shp.id}
                                        type="button"
                                        onClick={() => {
                                            handleSelectShop(shp.id);
                                            setShopDropdownOpen(false);
                                        }}
                                        className={`w-full text-left p-2 rounded-xl text-xs font-semibold flex items-center justify-between ${
                                            shp.id === selectedShop.id ? 'bg-slate-900 text-white shadow-xs' : 'hover:bg-slate-50 text-slate-700'
                                        }`}
                                    >
                                        <span className="truncate">{shp.name} ({shp.city})</span>
                                        <span className="text-[10px] opacity-75">{shp.staff_count} Staff</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Horizontal Scrollable Tabs Strip */}
                    <div className="overflow-x-auto no-scrollbar flex items-center gap-1.5 px-3 py-2 bg-slate-50/70 border-t border-slate-100 text-xs font-semibold">
                        {[
                            { id: 'floor', label: 'Dashboard', icon: LayoutDashboard, badge: liveQueue.length },
                            { id: 'staff', label: 'Care Team', icon: Users, badge: shopStaff.length },
                            { id: 'services', label: 'Prices & Services', icon: Tag, badge: services.length },
                            { id: 'settings', label: 'Hours & Payroll', icon: Sliders },
                            { id: 'branches', label: 'Branches', icon: Building2, badge: `${branches.length}B` },
                            { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
                            { id: 'qr_codes', label: 'Tabletop QRs', icon: QrCode },
                            { id: 'sms', label: 'SMS Gateway', icon: Smartphone },
                        ].map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => {
                                        setActiveTab(tab.id as any);
                                        setMobileMenuOpen(false);
                                    }}
                                    className={`px-3 py-1.5 rounded-full shrink-0 flex items-center gap-1.5 transition-all text-xs ${
                                        isActive
                                            ? 'bg-[#0F172A] text-white shadow-xs font-bold'
                                            : 'bg-white border border-slate-200/80 text-slate-600 hover:text-slate-900 font-medium'
                                    }`}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    <span>{tab.label}</span>
                                    {tab.badge !== undefined && (
                                        <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                                            isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                            {tab.badge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Full Mobile Slide-down Drawer Menu */}
                    {mobileMenuOpen && (
                        <div className="p-4 bg-white border-t border-slate-100 space-y-4 animate-fadeIn shadow-lg">
                            <div className="space-y-1">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                                    Store Operations
                                </div>
                                {[
                                    { id: 'floor', label: 'Dashboard', icon: LayoutDashboard, badge: liveQueue.length },
                                    { id: 'staff', label: 'Care Team (Staff)', icon: Users, badge: shopStaff.length },
                                    { id: 'services', label: 'Prices & Services', icon: Tag, badge: services.length },
                                    { id: 'settings', label: 'Hours & Payroll', icon: Sliders },
                                    { id: 'branches', label: 'Branches & Stores', icon: Building2, badge: `${branches.length}B · ${currentShopList.length}S` },
                                    { id: 'reports', label: 'Chain Reports', icon: FileSpreadsheet },
                                    { id: 'qr_codes', label: 'Tabletop QRs', icon: QrCode },
                                    { id: 'sms', label: 'SMSlenz Gateway', icon: Smartphone },
                                ].map((item) => {
                                    const Icon = item.icon;
                                    const isActive = activeTab === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => {
                                                setActiveTab(item.id as any);
                                                setMobileMenuOpen(false);
                                            }}
                                            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                                                isActive
                                                    ? 'bg-[#0F172A] text-white shadow-xs'
                                                    : 'text-slate-600 hover:bg-slate-50'
                                            }`}
                                        >
                                            <span className="flex items-center gap-3">
                                                <Icon className="w-4 h-4" />
                                                {item.label}
                                            </span>
                                            {item.badge && (
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    isActive ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600'
                                                }`}>
                                                    {item.badge}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                                        MS
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-900">Mohamed Saman</div>
                                        <div className="text-[10px] text-slate-400">saman@jaffnagold.lk</div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMobileMenuOpen(false);
                                        openCreateShopModal();
                                    }}
                                    className="py-1.5 px-3 rounded-xl bg-slate-900 text-white text-[11px] font-bold"
                                >
                                    + Storefront
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ========================================================= */}
                {/* 1. LEFT SIDEBAR NAVIGATION (Desktop md: and above)        */}
                {/* ========================================================= */}
                <aside className="hidden md:flex md:w-64 bg-white border-r border-slate-100 flex-col justify-between shrink-0 p-5 md:sticky md:top-0 md:h-[92vh]">
                    <div className="space-y-6">
                        {/* Brand Logo & Name */}
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black shadow-xs">
                                    <Scissors className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-sm font-extrabold tracking-tight text-slate-900 leading-none">
                                        healthy<span className="text-indigo-600 font-bold">.saloon</span>
                                    </h1>
                                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                        Smart Queue HQ
                                    </p>
                                </div>
                            </div>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-50" />
                        </div>

                        {/* Interactive Storefront Switcher Dropdown */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShopDropdownOpen(!shopDropdownOpen)}
                                className="w-full p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 text-left transition-all flex items-center justify-between group shadow-2xs"
                            >
                                <div className="flex items-center gap-2.5 truncate">
                                    <div className="w-7 h-7 rounded-xl bg-white text-slate-700 flex items-center justify-center shrink-0 border border-slate-200/60 shadow-2xs">
                                        <Store className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="truncate">
                                        <div className="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                                            {selectedShop.name}
                                        </div>
                                        <div className="text-[10px] text-slate-400 truncate">
                                            {selectedShop.city} · {selectedShop.staff_capacity} Chairs
                                        </div>
                                    </div>
                                </div>
                                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${shopDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Dropdown Menu */}
                            {shopDropdownOpen && (
                                <div className="absolute left-0 right-0 mt-2 p-2 rounded-2xl bg-white border border-slate-100 shadow-xl z-50 space-y-1 max-h-72 overflow-y-auto">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                                        Switch Active Salon:
                                    </div>
                                    {currentShopList.map((shp) => (
                                        <button
                                            key={shp.id}
                                            type="button"
                                            onClick={() => handleSelectShop(shp.id)}
                                            className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                                                shp.id === selectedShop.id
                                                    ? 'bg-slate-900 text-white shadow-xs'
                                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                            }`}
                                        >
                                            <div className="truncate">
                                                <div className="truncate">{shp.name}</div>
                                                <div className={`text-[10px] ${shp.id === selectedShop.id ? 'text-slate-300' : 'text-slate-400'}`}>
                                                    {shp.branchName} ({shp.city})
                                                </div>
                                            </div>
                                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                                                shp.id === selectedShop.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                                {shp.staff_count} Staff
                                            </span>
                                        </button>
                                    ))}

                                    <div className="pt-1.5 mt-1 border-t border-slate-100 px-1">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShopDropdownOpen(false);
                                                openCreateShopModal();
                                            }}
                                            className="w-full py-2 px-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
                                        >
                                            <Plus className="w-3.5 h-3.5 text-slate-500" />
                                            Deploy New Storefront
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Navigation Menu (Pill shapes identical to user reference image) */}
                        <nav className="space-y-1">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">
                                Store Operations
                            </div>

                            <button
                                type="button"
                                onClick={() => setActiveTab('floor')}
                                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                                    activeTab === 'floor'
                                        ? 'bg-[#0F172A] text-white shadow-xs'
                                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                            >
                                <span className="flex items-center gap-3">
                                    <LayoutDashboard className={`w-4 h-4 ${activeTab === 'floor' ? 'text-white' : 'text-slate-400'}`} />
                                    Dashboard
                                </span>
                                {liveQueue.length > 0 && (
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        activeTab === 'floor' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600'
                                    }`}>
                                        {liveQueue.length}
                                    </span>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setActiveTab('staff')}
                                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                                    activeTab === 'staff'
                                        ? 'bg-[#0F172A] text-white shadow-xs'
                                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                            >
                                <span className="flex items-center gap-3">
                                    <Users className={`w-4 h-4 ${activeTab === 'staff' ? 'text-white' : 'text-slate-400'}`} />
                                    Care Team (Staff)
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                    {shopStaff.length}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setActiveTab('services')}
                                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                                    activeTab === 'services'
                                        ? 'bg-[#0F172A] text-white shadow-xs'
                                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                            >
                                <span className="flex items-center gap-3">
                                    <Tag className={`w-4 h-4 ${activeTab === 'services' ? 'text-white' : 'text-slate-400'}`} />
                                    Prices & Services
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                    {services.length}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setActiveTab('settings')}
                                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                                    activeTab === 'settings'
                                        ? 'bg-[#0F172A] text-white shadow-xs'
                                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                            >
                                <span className="flex items-center gap-3">
                                    <Sliders className={`w-4 h-4 ${activeTab === 'settings' ? 'text-white' : 'text-slate-400'}`} />
                                    Hours & Payroll
                                </span>
                            </button>

                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pt-3 pb-1">
                                Chain Network
                            </div>

                            <button
                                type="button"
                                onClick={() => setActiveTab('branches')}
                                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                                    activeTab === 'branches'
                                        ? 'bg-[#0F172A] text-white shadow-xs'
                                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                            >
                                <span className="flex items-center gap-3">
                                    <Building2 className={`w-4 h-4 ${activeTab === 'branches' ? 'text-white' : 'text-slate-400'}`} />
                                    Branches & Stores
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600">
                                    {branches.length}B · {currentShopList.length}S
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setActiveTab('reports')}
                                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                                    activeTab === 'reports'
                                        ? 'bg-[#0F172A] text-white shadow-xs'
                                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                            >
                                <span className="flex items-center gap-3">
                                    <FileSpreadsheet className={`w-4 h-4 ${activeTab === 'reports' ? 'text-white' : 'text-slate-400'}`} />
                                    Chain Reports
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setActiveTab('qr_codes')}
                                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                                    activeTab === 'qr_codes'
                                        ? 'bg-[#0F172A] text-white shadow-xs'
                                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                            >
                                <span className="flex items-center gap-3">
                                    <QrCode className={`w-4 h-4 ${activeTab === 'qr_codes' ? 'text-white' : 'text-slate-400'}`} />
                                    Tabletop QRs
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setActiveTab('sms')}
                                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                                    activeTab === 'sms'
                                        ? 'bg-[#0F172A] text-white shadow-xs'
                                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                            >
                                <span className="flex items-center gap-3">
                                    <MessageSquare className={`w-4 h-4 ${activeTab === 'sms' ? 'text-white' : 'text-slate-400'}`} />
                                    SMSlenz Gateway
                                </span>
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            </button>
                        </nav>
                    </div>

                    {/* Sidebar Footer: User Profile Pill (Diana Kemmer in image) */}
                    <div className="pt-4 border-t border-slate-100 space-y-3">
                        <div className="p-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/50 flex items-center justify-between">
                            <div className="flex items-center gap-2.5 truncate">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-200">
                                    MS
                                </div>
                                <div className="truncate">
                                    <div className="text-xs font-bold text-slate-900 truncate">Mohamed Saman</div>
                                    <div className="text-[10px] text-slate-400 truncate">saman@jaffnagold.lk</div>
                                </div>
                            </div>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        </div>
                    </div>
                </aside>

                {/* ========================================================= */}
                {/* 2. RIGHT MAIN CONTENT CANVAS                              */}
                {/* ========================================================= */}
                <div className="flex-1 bg-[#F7F8FC] flex flex-col min-w-0 overflow-y-auto">

                    {/* Top Navigation Header (Exact Mockup Layout) */}
                    <header className="px-4 sm:px-6 md:px-8 py-3.5 sm:py-5 border-b border-slate-200/60 bg-white/70 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 sticky top-0 z-20">
                        {/* Greeting Heading */}
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                                Welcome, Owner!
                            </h2>
                        </div>

                        {/* Search Pill */}
                        <div className="relative hidden md:block">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search barbers, tickets, storefronts..."
                                className="w-64 lg:w-72 pl-9 pr-4 py-2 rounded-full bg-slate-50 border border-slate-200/80 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:bg-white transition-all"
                            />
                        </div>

                        {/* Top Right Controls & Action Button */}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                            <div className="px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-600 flex items-center gap-1.5 shadow-2xs">
                                <Bell className="w-3.5 h-3.5 text-slate-400" />
                                <span>+{liveQueue.length}</span>
                            </div>

                            <div className="px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-2xs">
                                <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                                <span>{selectedShop.city}</span>
                            </div>

                            {activeTab === 'floor' && (
                                <a
                                    href={`/queue/${selectedShop.slug}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-4 py-2 rounded-full bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs"
                                >
                                    <QrCode className="w-3.5 h-3.5 text-white" />
                                    <span>Live Queue Stand</span>
                                </a>
                            )}

                            {activeTab === 'branches' && (
                                <button
                                    type="button"
                                    onClick={() => openCreateShopModal()}
                                    className="px-4 py-2 rounded-full bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs"
                                >
                                    <Plus className="w-3.5 h-3.5 text-white stroke-[3]" />
                                    <span>Deploy Storefront</span>
                                </button>
                            )}

                            {activeTab === 'services' && (
                                <button
                                    type="button"
                                    onClick={openCreateServiceModal}
                                    className="px-4 py-2 rounded-full bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs"
                                >
                                    <Plus className="w-3.5 h-3.5 text-white stroke-[3]" />
                                    <span>Add Service</span>
                                </button>
                            )}

                            {activeTab === 'staff' && (
                                <button
                                    type="button"
                                    onClick={openCreateStaffModal}
                                    className="px-4 py-2 rounded-full bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs"
                                >
                                    <UserPlus className="w-3.5 h-3.5 text-white stroke-[3]" />
                                    <span>Add Stylist</span>
                                </button>
                            )}
                        </div>
                    </header>

                    {/* Flash Notification Banner */}
                    {flash?.success && (
                        <div className="mx-6 md:mx-8 mt-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 flex items-center justify-between text-xs font-semibold animate-fadeIn shadow-2xs">
                            <div className="flex items-center gap-2.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>{flash.success}</span>
                            </div>
                        </div>
                    )}
                    {flash?.error && (
                        <div className="mx-6 md:mx-8 mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-800 flex items-center justify-between text-xs font-semibold animate-fadeIn shadow-2xs">
                            <div className="flex items-center gap-2.5">
                                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                                <span>{flash.error}</span>
                            </div>
                        </div>
                    )}

                    {/* Dynamic View Canvas */}
                    <main className="p-3.5 sm:p-6 md:p-8 space-y-5 sm:space-y-6 flex-1">

                        {/* VIEW 1: LIVE FLOOR & SMART QUEUE (Exact Match to User Reference Image) */}
                        {activeTab === 'floor' && (
                            <div className="space-y-5 sm:space-y-6 animate-fadeIn">

                                {/* Top 3 Pastel Metric Cards from Mockup */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                    {/* Card 1: Pastel Peach/Rose (Medication taken / Today Revenue) */}
                                    <div className="bg-gradient-to-r from-[#FFF1F3] via-[#FFEBF0] to-[#FFE5EC] border border-[#FFDCE5]/80 rounded-[20px] sm:rounded-[24px] p-4 sm:p-5 shadow-2xs flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-white shadow-xs flex items-center justify-center shrink-0">
                                            <TrendingUp className="w-5 h-5 text-rose-500" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-medium text-slate-500">
                                                Today's Revenue
                                            </div>
                                            <div className="text-xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                                                {kpis.today_revenue}
                                            </div>
                                            <div className="text-[11px] text-rose-600 font-semibold mt-0.5">
                                                {kpis.today_count} services completed today
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card 2: Pastel Lavender (Blood pressure / Month Revenue) */}
                                    <div className="bg-gradient-to-r from-[#F0F3FF] via-[#ECEEFF] to-[#E5E9FF] border border-[#DDE2FF]/80 rounded-[20px] sm:rounded-[24px] p-4 sm:p-5 shadow-2xs flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-white shadow-xs flex items-center justify-center shrink-0">
                                            <DollarSign className="w-5 h-5 text-indigo-600" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-medium text-slate-500">
                                                Month Volume
                                            </div>
                                            <div className="text-xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                                                {kpis.month_revenue}
                                            </div>
                                            <div className="text-[11px] text-indigo-600 font-semibold mt-0.5">
                                                {kpis.month_count} bookings this month
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card 3: Pastel Soft Periwinkle (Mood level / Floor Barbers) */}
                                    <div className="bg-gradient-to-r from-[#EFF6FF] via-[#EBF2FE] to-[#E2EDFE] border border-[#D5E3FC]/80 rounded-[20px] sm:rounded-[24px] p-4 sm:p-5 shadow-2xs flex items-center gap-4 sm:col-span-2 lg:col-span-1">
                                        <div className="w-12 h-12 rounded-full bg-white shadow-xs flex items-center justify-center shrink-0">
                                            <Users className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-medium text-slate-500">
                                                Floor Chair Capacity
                                            </div>
                                            <div className="text-xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                                                {kpis.active_staff_count} / {selectedShop.staff_capacity} Active
                                            </div>
                                            <div className="text-[11px] text-blue-600 font-semibold mt-0.5">
                                                {kpis.total_staff_count} barbers on shop roster
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Middle Grid: Traffic Chart (Heart rate) + Floor Team (Care team) */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">

                                    {/* Left: Queue Traffic & Chair Utilization Bar Chart (2 columns wide) */}
                                    <div className="lg:col-span-2 bg-white rounded-[22px] sm:rounded-[26px] p-4 sm:p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-4 sm:space-y-5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-base font-bold text-slate-900">
                                                    Chair Utilization & Load
                                                </h3>
                                                <div className="px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200/80 text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                                                    <span>Weekdays</span>
                                                    <ChevronDown className="w-3 h-3 text-slate-400" />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-slate-900">76%</span>
                                                <span className="text-[11px] text-slate-400">avg rush</span>
                                                <Activity className="w-4 h-4 text-rose-500" />
                                            </div>
                                        </div>

                                        {/* Chart Visualization */}
                                        <div className="relative pt-6 pb-2">
                                            {/* Threshold dashed line (max 110 clients) */}
                                            <div className="absolute top-12 left-2 sm:left-8 right-0 border-t border-dashed border-rose-300 flex items-center justify-between pointer-events-none">
                                                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-bold uppercase tracking-wider -translate-y-1/2">
                                                    Peak Load
                                                </span>
                                                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500 text-white text-[10px] font-bold -translate-y-1/2">
                                                    92 clients
                                                </span>
                                            </div>

                                            {/* Columns Container */}
                                            <div className="flex items-end justify-between gap-1.5 sm:gap-3 h-40 sm:h-48 px-1 sm:px-4">
                                                {[
                                                    { day: 'Mon', val: '72 cuts', h: '60%', active: false },
                                                    { day: 'Tue', val: '61 cuts', h: '50%', active: false },
                                                    { day: 'Wed', val: '81 cuts', h: '70%', active: false },
                                                    { day: 'Thu', val: '92 cuts', h: '88%', active: true },
                                                    { day: 'Fri', val: '82 cuts', h: '72%', active: false },
                                                    { day: 'Sat', val: '72 cuts', h: '62%', active: false },
                                                    { day: 'Sun', val: '45 cuts', h: '38%', active: false },
                                                ].map((col) => (
                                                    <div key={col.day} className="flex-1 flex flex-col items-center gap-1.5 sm:gap-2 h-full justify-end">
                                                        <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium">
                                                            {col.val.split(' ')[0]}<span className="hidden sm:inline"> cuts</span>
                                                        </span>
                                                        <div
                                                            className={`w-full rounded-xl sm:rounded-2xl transition-all ${
                                                                col.active
                                                                    ? 'bg-gradient-to-t from-indigo-200/90 to-indigo-100 border border-indigo-300/80 shadow-2xs'
                                                                    : 'bg-slate-50 hover:bg-slate-100 border border-slate-100'
                                                            }`}
                                                            style={{ height: col.h }}
                                                        />
                                                        <span className={`text-[10px] sm:text-xs font-semibold ${col.active ? 'text-indigo-600 font-bold' : 'text-slate-500'}`}>
                                                            {col.day}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Floor Stylists (Care team in mockup) */}
                                    <div className="bg-white rounded-[26px] p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-4 flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center justify-between pb-2">
                                                <h3 className="text-base font-bold text-slate-900">
                                                    Care Team (Barbers)
                                                </h3>
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveTab('staff')}
                                                    className="text-xs font-semibold text-slate-400 hover:text-slate-700"
                                                >
                                                    See all
                                                </button>
                                            </div>

                                            <div className="divide-y divide-slate-100">
                                                {shopStaff.slice(0, 4).map((stf) => (
                                                    <div
                                                        key={stf.id}
                                                        onClick={() => openStaffDetailModal(stf, 'overview')}
                                                        className="py-3 px-2 -mx-2 rounded-xl flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer group"
                                                    >
                                                        <div className="flex items-center gap-3 truncate">
                                                            <div className="relative">
                                                                <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200 group-hover:border-indigo-300">
                                                                    {stf.display_name.slice(0, 2).toUpperCase()}
                                                                </div>
                                                                <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                                                                    stf.working_status === 'free' ? 'bg-emerald-500' : (stf.working_status === 'busy' ? 'bg-amber-500 animate-pulse' : 'bg-slate-300')
                                                                }`} />
                                                            </div>
                                                            <div className="truncate">
                                                                <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                                                                    {stf.display_name}
                                                                </div>
                                                                <div className="text-[11px] text-slate-400 truncate">
                                                                    {stf.current_customer ? `Cutting: ${stf.current_customer}` : (stf.working_status === 'free' ? 'Chair Ready' : 'Off-duty')} • {stf.stats?.today_cuts_count ?? 0} cuts
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openStaffDetailModal(stf, 'edit');
                                                            }}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                                                        >
                                                            <Edit3 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={openCreateStaffModal}
                                            className="w-full py-2.5 rounded-full border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-all shadow-2xs"
                                        >
                                            <Plus className="w-3.5 h-3.5 text-slate-500 stroke-[3]" />
                                            <span>Add Specialist</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Bottom Table Card: Live Queue Tracker (Medication tracker in mockup) */}
                                <div className="bg-white rounded-[26px] p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="flex items-center gap-2.5">
                                            <h3 className="text-base font-bold text-slate-900">
                                                Live Queue Tracker
                                            </h3>
                                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
                                                +{liveQueue.length} tickets
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="relative">
                                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                                <input
                                                    type="text"
                                                    placeholder="Search customer..."
                                                    className="pl-8 pr-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:bg-white"
                                                />
                                            </div>
                                            <div className="px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600 flex items-center gap-1">
                                                <span>All Status</span>
                                                <ChevronDown className="w-3 h-3 text-slate-400" />
                                            </div>
                                        </div>
                                    </div>

                                    {liveQueue.length === 0 ? (
                                        <div className="py-12 text-center text-slate-400 space-y-2">
                                            <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
                                                <Scissors className="w-5 h-5" />
                                            </div>
                                            <p className="text-xs font-semibold text-slate-600">No Customers Currently in Queue</p>
                                            <p className="text-[11px] text-slate-400">Chairs are ready for incoming walk-ins or online bookings.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto -mx-1 sm:mx-0">
                                            <table className="w-full text-left min-w-[620px]">
                                                <thead>
                                                    <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                                        <th className="pb-3 pl-2">Customer & Ticket</th>
                                                        <th className="pb-3">Progress / Service</th>
                                                        <th className="pb-3">Queued Time</th>
                                                        <th className="pb-3">Status</th>
                                                        <th className="pb-3">Est. Duration</th>
                                                        <th className="pb-3 text-right pr-2">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 text-xs">
                                                    {liveQueue.map((t, idx) => (
                                                        <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                                                            <td className="py-3.5 pl-2 font-bold text-slate-900 flex items-center gap-3">
                                                                <span className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-700 font-extrabold text-[11px] flex items-center justify-center border border-indigo-100">
                                                                    #{t.queue_number}
                                                                </span>
                                                                <div>
                                                                    <div>{t.customer_name}</div>
                                                                    <div className="text-[10px] text-slate-400 font-normal">{t.customer_phone}</div>
                                                                </div>
                                                            </td>
                                                            <td className="py-3.5">
                                                                <div className="flex items-center gap-2.5">
                                                                    {/* Mockup circular progress indicator */}
                                                                    <div className="w-7 h-7 rounded-full border-2 border-rose-400 border-t-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-700">
                                                                        {t.status === 'in_progress' ? '75%' : '20%'}
                                                                    </div>
                                                                    <span className="font-semibold text-slate-800">{t.service_name}</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-3.5 text-slate-500 font-medium">
                                                                {t.queued_at}
                                                            </td>
                                                            <td className="py-3.5">
                                                                {t.status === 'in_progress' ? (
                                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                                                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                                                        In Chair
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                                                                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                                                                        Waiting
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="py-3.5 text-slate-500 font-medium">
                                                                25 mins
                                                            </td>
                                                            <td className="py-3.5 text-right pr-2">
                                                                <button
                                                                    type="button"
                                                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                                                                >
                                                                    <MoreVertical className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* VIEW 2: STAFF & BARBERS MANAGEMENT */}
                        {activeTab === 'staff' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">
                                            Floor Barbers & Stylist Workforce
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Manage active floor chairs, commission percentages, and working statuses for {selectedShop.name}.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={openCreateStaffModal}
                                        className="px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all"
                                    >
                                        <UserPlus className="w-3.5 h-3.5 stroke-[3]" />
                                        Add Specialist
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {shopStaff.map((stf) => (
                                        <div
                                            key={stf.id}
                                            onClick={() => openStaffDetailModal(stf, 'overview')}
                                            className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-4 hover:border-indigo-200 hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group"
                                        >
                                            <div className="space-y-3">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative">
                                                            <div className="w-11 h-11 rounded-full bg-indigo-50 text-indigo-700 font-bold text-sm flex items-center justify-center border border-indigo-100 group-hover:scale-105 transition-transform">
                                                                {stf.display_name.slice(0, 2).toUpperCase()}
                                                            </div>
                                                            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                                                                stf.working_status === 'free' ? 'bg-emerald-500' :
                                                                (stf.working_status === 'busy' ? 'bg-amber-500 animate-pulse' : 'bg-slate-300')
                                                            }`} />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                                {stf.display_name}
                                                            </div>
                                                            <div className="text-xs text-slate-400">{stf.phone || 'No phone'}</div>
                                                        </div>
                                                    </div>
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                                        stf.working_status === 'free' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                                        (stf.working_status === 'busy' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-600')
                                                    }`}>
                                                        {stf.working_status === 'busy' ? '✂️ Cutting' : (stf.working_status === 'free' ? '🟢 Free' : 'Offline')}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                                                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                                        <div className="text-[10px] text-slate-400 font-semibold uppercase">Today's Haircuts</div>
                                                        <div className="font-extrabold text-slate-900 mt-0.5 flex items-center gap-1">
                                                            <Scissors className="w-3 h-3 text-indigo-600" />
                                                            <span>{stf.stats?.today_cuts_count ?? 0} cuts</span>
                                                        </div>
                                                    </div>
                                                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                                        <div className="text-[10px] text-slate-400 font-semibold uppercase">Chair Status</div>
                                                        <div className={`font-bold mt-0.5 truncate ${stf.current_customer ? 'text-amber-700' : 'text-emerald-700'}`}>
                                                            {stf.current_customer ? `✂️ ${stf.current_customer}` : (stf.working_status === 'free' ? 'Ready (Free)' : 'Off-duty')}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="p-2.5 rounded-xl bg-indigo-50/50 border border-indigo-100/60 flex items-center justify-between text-xs">
                                                    <span className="text-slate-500 font-medium">Earned Today ({stf.commission_rate}%)</span>
                                                    <span className="font-extrabold text-indigo-900">{stf.stats?.today_commission ?? 'Rs. 0.00'}</span>
                                                </div>
                                            </div>

                                            <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openStaffDetailModal(stf, 'overview');
                                                    }}
                                                    className="flex-1 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 shadow-xs"
                                                >
                                                    <Activity className="w-3.5 h-3.5" />
                                                    View Details
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openStaffDetailModal(stf, 'edit');
                                                    }}
                                                    className="py-2 px-3 rounded-full border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-all flex items-center justify-center gap-1"
                                                >
                                                    <Edit3 className="w-3.5 h-3.5" />
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openDeleteStaffModal(stf);
                                                    }}
                                                    className="p-2 rounded-full border border-rose-200 hover:bg-rose-50 text-rose-600 transition-all"
                                                    title="Remove Barber"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* VIEW 3: PRICES & SERVICES CATALOG */}
                        {activeTab === 'services' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">
                                            Pricing & Service Catalog
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Adjust service durations, price points, and active catalog items for {selectedShop.name}.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={openCreateServiceModal}
                                        className="px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all"
                                    >
                                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                        Add Service
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {services.map((svc) => (
                                        <div
                                            key={svc.id}
                                            className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-4 hover:border-slate-200 transition-all flex flex-col justify-between"
                                        >
                                            <div className="space-y-2">
                                                <div className="flex items-start justify-between">
                                                    <h4 className="text-sm font-bold text-slate-900">{svc.name}</h4>
                                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700">
                                                        {svc.duration_minutes} mins
                                                    </span>
                                                </div>
                                                <div className="text-xl font-extrabold text-slate-900 tracking-tight">
                                                    {svc.formatted_price}
                                                </div>
                                            </div>

                                            <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => openEditServiceModal(svc)}
                                                    className="flex-1 py-2 rounded-full border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-all flex items-center justify-center gap-1.5"
                                                >
                                                    <Edit3 className="w-3.5 h-3.5" />
                                                    Edit Price
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => openDeleteServiceModal(svc)}
                                                    className="p-2 rounded-full border border-rose-200 hover:bg-rose-50 text-rose-600 transition-all"
                                                    title="Delete Service"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* VIEW 4: BRANCHES & STOREFRONTS MANAGEMENT */}
                        {activeTab === 'branches' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">
                                            Regional Branches & Storefronts Network
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Establish regional hubs, deploy new salon storefronts, and manage operational parameters.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={openCreateBranchModal}
                                            className="px-4 py-2 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all"
                                        >
                                            <Building2 className="w-3.5 h-3.5 text-slate-600" />
                                            + New Branch
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => openCreateShopModal()}
                                            className="px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all"
                                        >
                                            <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                            + Deploy Storefront
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {branches.map((b) => (
                                        <div
                                            key={b.id}
                                            className="bg-white rounded-[26px] p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-5"
                                        >
                                            {/* Branch Header */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                                                        <Building2 className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-base font-bold text-slate-900">{b.name}</h4>
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 flex items-center gap-1">
                                                                <MapPin className="w-3 h-3 text-indigo-500" />
                                                                {b.city}
                                                            </span>
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                                                Active
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-slate-400 mt-0.5">
                                                            {b.shops.length} Storefront{b.shops.length === 1 ? '' : 's'} under this branch
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 self-end sm:self-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => openCreateShopModal(b.id)}
                                                        className="px-3.5 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-all"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                        Add Storefront
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditBranchModal(b)}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                                                        title="Edit Branch"
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => openDeleteBranchModal(b)}
                                                        disabled={b.shops.length > 0}
                                                        className={`p-1.5 rounded-lg transition-all ${
                                                            b.shops.length > 0
                                                                ? 'opacity-30 cursor-not-allowed text-slate-300'
                                                                : 'text-rose-500 hover:bg-rose-50'
                                                        }`}
                                                        title={b.shops.length > 0 ? 'Cannot delete branch containing active shops' : 'Delete Branch'}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Storefronts Grid */}
                                            {b.shops.length === 0 ? (
                                                <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                                                    No storefronts registered under {b.name}.
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {b.shops.map((shp) => {
                                                        const isCurrent = shp.id === selectedShop.id;
                                                        return (
                                                            <div
                                                                key={shp.id}
                                                                className={`rounded-2xl p-5 transition-all flex flex-col justify-between ${
                                                                    isCurrent
                                                                        ? 'bg-slate-50/90 border-2 border-indigo-500/50 shadow-xs'
                                                                        : 'bg-white border border-slate-200/80 hover:border-slate-300'
                                                                }`}
                                                            >
                                                                <div className="space-y-3">
                                                                    <div className="flex items-start justify-between">
                                                                        <div>
                                                                            <div className="flex items-center gap-2">
                                                                                <h5 className="text-sm font-bold text-slate-900">{shp.name}</h5>
                                                                                {isCurrent && (
                                                                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-600 text-white shadow-2xs">
                                                                                        CURRENT VIEW
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                                                                <MapPin className="w-3 h-3 text-slate-400" />
                                                                                <span>{shp.address || 'Address pending'}</span>
                                                                            </p>
                                                                        </div>

                                                                        <div className="flex items-center gap-1">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => openEditShopModal(shp)}
                                                                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                                                            >
                                                                                <Edit3 className="w-3.5 h-3.5" />
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => openDeleteShopModal(shp)}
                                                                                disabled={currentShopList.length <= 1}
                                                                                className={`p-1.5 rounded-lg ${
                                                                                    currentShopList.length <= 1 ? 'opacity-30 cursor-not-allowed text-slate-300' : 'text-rose-500 hover:bg-rose-50'
                                                                                }`}
                                                                            >
                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                                        <div className="p-2.5 rounded-xl bg-white border border-slate-100">
                                                                            <div className="text-[10px] text-slate-400 font-bold uppercase">Hours</div>
                                                                            <div className="font-semibold text-slate-700 mt-0.5">
                                                                                {shp.opening_time} - {shp.closing_time}
                                                                            </div>
                                                                        </div>
                                                                        <div className="p-2.5 rounded-xl bg-white border border-slate-100">
                                                                            <div className="text-[10px] text-slate-400 font-bold uppercase">Chairs</div>
                                                                            <div className="font-semibold text-indigo-600 mt-0.5">
                                                                                {shp.staff_capacity} Chairs
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center gap-2">
                                                                    {isCurrent ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setActiveTab('floor')}
                                                                            className="flex-1 py-2 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs"
                                                                        >
                                                                            <LayoutDashboard className="w-3.5 h-3.5" />
                                                                            Go to Live Floor
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleSelectShop(shp.id)}
                                                                            className="flex-1 py-2 rounded-full border border-slate-200 hover:bg-slate-900 hover:text-white text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                                                                        >
                                                                            <ArrowUpRight className="w-3.5 h-3.5" />
                                                                            Switch to This Store
                                                                        </button>
                                                                    )}
                                                                    <a
                                                                        href={`/queue/${shp.slug}`}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="p-2 rounded-full border border-slate-200 text-slate-400 hover:text-slate-700"
                                                                    >
                                                                        <ExternalLink className="w-4 h-4" />
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* VIEW 5: STORE OPERATING HOURS & PAYROLL SETTINGS */}
                        {activeTab === 'settings' && (
                            <div className="bg-white rounded-[26px] p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6 animate-fadeIn max-w-3xl">
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">
                                        Operating Hours & Staff Salary Rules — {selectedShop.name}
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Configure chair capacity, standard salon hours, and staff payroll calculation models.
                                    </p>
                                </div>

                                <form onSubmit={handleSaveSettings} className="space-y-5">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                                Opening Time
                                            </label>
                                            <input
                                                type="time"
                                                value={settingsForm.opening_time}
                                                onChange={(e) => setSettingsForm({ ...settingsForm, opening_time: e.target.value })}
                                                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                                Closing Time
                                            </label>
                                            <input
                                                type="time"
                                                value={settingsForm.closing_time}
                                                onChange={(e) => setSettingsForm({ ...settingsForm, closing_time: e.target.value })}
                                                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                                Chair Capacity
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="50"
                                                value={settingsForm.staff_capacity}
                                                onChange={(e) => setSettingsForm({ ...settingsForm, staff_capacity: Number(e.target.value) })}
                                                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                                Payroll Model
                                            </label>
                                            <select
                                                value={settingsForm.payroll_type}
                                                onChange={(e) => setSettingsForm({ ...settingsForm, payroll_type: e.target.value })}
                                                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white"
                                            >
                                                <option value="commission">Commission Based</option>
                                                <option value="fixed">Fixed Daily Wage</option>
                                                <option value="hybrid">Hybrid (Wage + Commission)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                                Commission Rate (%)
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={settingsForm.commission_rate}
                                                onChange={(e) => setSettingsForm({ ...settingsForm, commission_rate: Number(e.target.value) })}
                                                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white"
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            className="px-6 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs"
                                        >
                                            Save Settings
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* VIEW 6: MULTI-STORE FINANCIAL REPORTS */}
                        {activeTab === 'reports' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">
                                            Multi-Store Chain Performance
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Financial summary and completion metrics across all salons.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleExportCsv}
                                        className="px-4 py-2 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        Export CSV
                                    </button>
                                </div>

                                <div className="bg-white rounded-[26px] p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                                <th className="pb-3">Storefront</th>
                                                <th className="pb-3">Region</th>
                                                <th className="pb-3">Payroll Model</th>
                                                <th className="pb-3">Active Barbers</th>
                                                <th className="pb-3">Total Cuts</th>
                                                <th className="pb-3">Today Revenue</th>
                                                <th className="pb-3 text-right">Month Revenue</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {shopSummaries.map((s) => (
                                                <tr key={s.shop_id} className="hover:bg-slate-50/60">
                                                    <td className="py-3.5 font-bold text-slate-900">{s.shop_name}</td>
                                                    <td className="py-3.5 text-slate-500">{s.city} ({s.branch_name})</td>
                                                    <td className="py-3.5">
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                                            {s.payroll_type.toUpperCase()} ({s.commission_rate})
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 text-slate-700 font-semibold">{s.active_workers} Stylists</td>
                                                    <td className="py-3.5 text-slate-700 font-semibold">{s.total_cuts}</td>
                                                    <td className="py-3.5 font-bold text-slate-900">{s.today_revenue}</td>
                                                    <td className="py-3.5 text-right font-extrabold text-indigo-600">{s.month_revenue}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* VIEW 7: TABLETOP QR STANDS */}
                        {activeTab === 'qr_codes' && (
                            <div className="bg-white rounded-[26px] p-8 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6 text-center max-w-md mx-auto animate-fadeIn">
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">
                                        Acrylic Stand QR Code — {selectedShop.name}
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Print this QR code to place on the salon counter. Customers scan to join the live chair queue.
                                    </p>
                                </div>

                                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/80 inline-block">
                                    <QRCodeSVG
                                        value={`http://127.0.0.1:8000/queue/${selectedShop.slug}`}
                                        size={200}
                                        level="H"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <div className="text-xs font-bold text-slate-900">{selectedShop.name}</div>
                                    <div className="text-[11px] text-slate-400 font-mono">/queue/{selectedShop.slug}</div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="px-6 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 mx-auto shadow-xs"
                                >
                                    <Printer className="w-3.5 h-3.5" />
                                    Print Table Stand
                                </button>
                            </div>
                        )}

                        {/* VIEW 8: SMSLENZ GATEWAY */}
                        {activeTab === 'sms' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                                <div className="bg-white rounded-[26px] p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-5">
                                    <div>
                                        <h3 className="text-base font-bold text-slate-900">
                                            SMSlenz Gateway Live Dispatcher
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Dispatch test notifications using the configured Sri Lanka SMS gateway credentials.
                                        </p>
                                    </div>

                                    <form onSubmit={handleSendTestSms} className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                                Recipient Mobile Number
                                            </label>
                                            <input
                                                type="text"
                                                value={smsPhone}
                                                onChange={(e) => setSmsPhone(e.target.value)}
                                                required
                                                placeholder="e.g. 0771234567 or 94771234567"
                                                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                                Template Message Type
                                            </label>
                                            <select
                                                value={smsType}
                                                onChange={(e) => setSmsType(e.target.value as any)}
                                                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white"
                                            >
                                                <option value="ready">Chair Ready (Next In Line)</option>
                                                <option value="confirmed">Booking Confirmed</option>
                                                <option value="completed">Service Completed & Receipt</option>
                                                <option value="custom">Custom Message</option>
                                            </select>
                                        </div>

                                        {smsType === 'custom' && (
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                                    Custom Text
                                                </label>
                                                <textarea
                                                    value={smsCustomMessage}
                                                    onChange={(e) => setSmsCustomMessage(e.target.value)}
                                                    rows={3}
                                                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white"
                                                    required
                                                />
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={isSendingSms}
                                            className="w-full py-3 rounded-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all"
                                        >
                                            <Send className="w-3.5 h-3.5" />
                                            {isSendingSms ? 'Sending...' : 'Send Live SMS'}
                                        </button>
                                    </form>

                                    {smsResult && (
                                        <div className={`p-4 rounded-2xl border text-xs ${
                                            smsResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                                        }`}>
                                            <div className="font-bold">{smsResult.success ? 'SMS Sent Successfully' : 'SMS Delivery Failed'}</div>
                                            <p className="mt-1 font-mono text-[11px]">{smsResult.message}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-white rounded-[26px] p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-base font-bold text-slate-900">SMSlenz Account</h3>
                                        <button
                                            type="button"
                                            onClick={handleCheckBalance}
                                            disabled={isCheckingBalance}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                                        >
                                            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingBalance ? 'animate-spin' : ''}`} />
                                        </button>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 text-xs">
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500">Sender ID:</span>
                                            <span className="font-bold text-slate-900">{smsConfig?.sender_id || 'Jaffna Gold'}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500">User ID:</span>
                                            <span className="font-bold text-slate-900">{smsConfig?.user_id || '1644'}</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                                            <span className="text-slate-500">SMS Balance:</span>
                                            <span className="font-extrabold text-indigo-600 text-sm">Rs. {smsBalance}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </main>
                </div>
            </div>

            {/* ========================================================= */}
            {/* 3. MODAL: ADD / EDIT SERVICE MODAL                        */}
            {/* ========================================================= */}
            {serviceModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-fadeIn overflow-y-auto">
                    <div className="w-full max-w-md bg-white border border-slate-100 rounded-[24px] sm:rounded-[28px] p-5 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 my-auto max-h-[92vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Tag className="w-4 h-4 text-indigo-600" />
                                {editingService ? `Edit Service — ${editingService.name}` : `Add New Service`}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setServiceModalOpen(false)}
                                className="p-1 rounded-full text-slate-400 hover:text-slate-700"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveService} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                    Service Name
                                </label>
                                <input
                                    type="text"
                                    value={serviceForm.name}
                                    onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                                    required
                                    placeholder="e.g. Classic Haircut & Wash"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                        Duration (mins)
                                    </label>
                                    <input
                                        type="number"
                                        min="5"
                                        max="300"
                                        step="5"
                                        value={serviceForm.duration_minutes}
                                        onChange={(e) => setServiceForm({ ...serviceForm, duration_minutes: Number(e.target.value) })}
                                        required
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                        Price (LKR)
                                    </label>
                                    <input
                                        type="number"
                                        min="100"
                                        step="50"
                                        value={serviceForm.price_rupees}
                                        onChange={(e) => setServiceForm({ ...serviceForm, price_rupees: Number(e.target.value) })}
                                        required
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white"
                                    />
                                </div>
                            </div>

                            <div className="pt-2 flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setServiceModalOpen(false)}
                                    className="flex-1 py-2.5 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs"
                                >
                                    {editingService ? 'Save Changes' : 'Create Service'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* 3B. MODAL: DETAILED BARBER PROFILE, LIVE CHAIR & STATS   */}
            {/* ========================================================= */}
            {staffDetailModalOpen && selectedStaffDetail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-fadeIn overflow-y-auto">
                    <div className="w-full max-w-2xl bg-white border border-slate-100 rounded-[28px] shadow-2xl space-y-5 my-auto max-h-[92vh] overflow-y-auto p-5 sm:p-7">
                        {/* Modal Header */}
                        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                            <div className="flex items-center gap-3.5">
                                <div className="relative">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-700 font-extrabold text-lg flex items-center justify-center border border-indigo-200/80 shadow-xs">
                                        {selectedStaffDetail.display_name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ring-2 ring-white ${
                                        selectedStaffDetail.working_status === 'free' ? 'bg-emerald-500' :
                                        (selectedStaffDetail.working_status === 'busy' ? 'bg-amber-500 animate-pulse' : 'bg-slate-400')
                                    }`} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                                            {selectedStaffDetail.display_name}
                                        </h3>
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                            selectedStaffDetail.working_status === 'free' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                            (selectedStaffDetail.working_status === 'busy' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-600')
                                        }`}>
                                            {selectedStaffDetail.working_status === 'busy' ? '✂️ Cutting Now' : (selectedStaffDetail.working_status === 'free' ? '🟢 Free / Ready' : 'Off-duty')}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500 font-medium">
                                        {selectedStaffDetail.phone && (
                                            <span className="flex items-center gap-1">
                                                <Phone className="w-3 h-3 text-slate-400" />
                                                {selectedStaffDetail.phone}
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1">
                                            <Building2 className="w-3 h-3 text-slate-400" />
                                            {selectedShop.name} ({selectedShop.branch_name})
                                        </span>
                                        <span className="text-slate-400 font-bold">•</span>
                                        <span className="text-indigo-600 font-bold">{selectedStaffDetail.commission_rate}% Commission</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <a
                                    href={`/staff/portal?staff_id=${selectedStaffDetail.id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                                    title="Open this barber's live terminal"
                                >
                                    <span>Barber Portal</span>
                                    <ExternalLink className="w-3 h-3 text-slate-500" />
                                </a>
                                <button
                                    type="button"
                                    onClick={() => setStaffDetailModalOpen(false)}
                                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Sub-Tabs: Overview vs Edit Profile */}
                        <div className="flex items-center gap-2 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/60">
                            <button
                                type="button"
                                onClick={() => setStaffDetailTab('overview')}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                                    staffDetailTab === 'overview'
                                        ? 'bg-white text-slate-900 shadow-xs'
                                        : 'text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                <Scissors className="w-3.5 h-3.5" />
                                <span>Live Chair & Today's Cuts</span>
                                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-50 text-indigo-700">
                                    {selectedStaffDetail.stats?.today_cuts_count ?? 0} cuts
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setStaffDetailTab('edit')}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                                    staffDetailTab === 'edit'
                                        ? 'bg-white text-slate-900 shadow-xs'
                                        : 'text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit Profile & Settings</span>
                            </button>
                        </div>

                        {/* TAB 1: OVERVIEW & LIVE ACTIVITY */}
                        {staffDetailTab === 'overview' && (
                            <div className="space-y-5 animate-fadeIn">
                                {/* Live Chair Status Banner (Now Cutting or Free) */}
                                <div className={`p-4 rounded-2xl border ${
                                    selectedStaffDetail.working_status === 'busy'
                                        ? 'bg-amber-50/80 border-amber-200/80 text-amber-950'
                                        : (selectedStaffDetail.working_status === 'free'
                                            ? 'bg-emerald-50/80 border-emerald-200/80 text-emerald-950'
                                            : 'bg-slate-50 border-slate-200 text-slate-800')
                                }`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2.5 h-2.5 rounded-full ${
                                                selectedStaffDetail.working_status === 'busy' ? 'bg-amber-500 animate-ping' :
                                                (selectedStaffDetail.working_status === 'free' ? 'bg-emerald-500' : 'bg-slate-400')
                                            }`} />
                                            <span className="text-xs font-extrabold uppercase tracking-wider">
                                                {selectedStaffDetail.working_status === 'busy' ? 'Live: Currently Cutting in Chair' :
                                                (selectedStaffDetail.working_status === 'free' ? 'Live: Chair Available (Free)' : 'Live: Barber Off-Duty / Clocked Out')}
                                            </span>
                                        </div>
                                        {selectedStaffDetail.current_ticket && (
                                            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-slate-900 text-white">
                                                Ticket #{selectedStaffDetail.current_ticket.queue_number}
                                            </span>
                                        )}
                                    </div>

                                    {selectedStaffDetail.current_ticket ? (
                                        <div className="bg-white rounded-xl p-3.5 border border-amber-200/60 shadow-2xs space-y-2.5">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="text-sm font-extrabold text-slate-900">
                                                        {selectedStaffDetail.current_ticket.customer_name}
                                                    </div>
                                                    <div className="text-xs text-slate-500 font-medium">
                                                        {selectedStaffDetail.current_ticket.customer_phone}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs text-slate-400 font-medium">Service Price</div>
                                                    <div className="text-sm font-black text-slate-900">
                                                        {selectedStaffDetail.current_ticket.formatted_price}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                                                <span className="font-bold text-slate-800">
                                                    {selectedStaffDetail.current_ticket.service_name} ({selectedStaffDetail.current_ticket.service_duration} min)
                                                </span>
                                                <span className="flex items-center gap-1 text-slate-500">
                                                    <Clock className="w-3 h-3 text-slate-400" />
                                                    Started {selectedStaffDetail.current_ticket.started_at || 'Recently'}
                                                </span>
                                            </div>
                                            <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-between">
                                                <span>Barber Commission on this Cut ({selectedStaffDetail.commission_rate}%)</span>
                                                <span>Rs. {selectedStaffDetail.current_ticket.commission_rupees.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    ) : selectedStaffDetail.working_status === 'free' ? (
                                        <p className="text-xs text-emerald-800 font-medium">
                                            Chair is ready and online. The next waiting client in the central queue or walk-in dispatch will automatically assign to this barber.
                                        </p>
                                    ) : (
                                        <p className="text-xs text-slate-600 font-medium">
                                            This staff member is off the floor. Toggle their status to Free in the Edit tab to put them back into service rotation.
                                        </p>
                                    )}
                                </div>

                                {/* Today's 4 Stats Metrics */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Cuts</div>
                                        <div className="text-lg font-black text-slate-900 mt-0.5">
                                            {selectedStaffDetail.stats?.today_cuts_count ?? 0}
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-medium">Completed today</div>
                                    </div>

                                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Sales</div>
                                        <div className="text-lg font-black text-slate-900 mt-0.5 truncate">
                                            {selectedStaffDetail.stats?.today_revenue ?? 'Rs. 0.00'}
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-medium">Gross revenue</div>
                                    </div>

                                    <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                                        <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Commission</div>
                                        <div className="text-lg font-black text-emerald-800 mt-0.5 truncate">
                                            {selectedStaffDetail.stats?.today_commission ?? 'Rs. 0.00'}
                                        </div>
                                        <div className="text-[10px] text-emerald-600 font-medium">Today's take-home</div>
                                    </div>

                                    <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100">
                                        <div className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">All-Time</div>
                                        <div className="text-lg font-black text-indigo-900 mt-0.5">
                                            {selectedStaffDetail.stats?.all_time_cuts_count ?? 0}
                                        </div>
                                        <div className="text-[10px] text-indigo-600 font-medium truncate">
                                            {selectedStaffDetail.stats?.all_time_revenue ?? 'Rs. 0.00'}
                                        </div>
                                    </div>
                                </div>

                                {/* Today's Completed Haircuts Log */}
                                <div className="space-y-2.5 pt-1">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                            <History className="w-3.5 h-3.5 text-slate-500" />
                                            Today's Completed Haircuts ({selectedStaffDetail.stats?.today_completed_tickets?.length ?? 0})
                                        </h4>
                                        <span className="text-[11px] text-slate-400 font-semibold">Real-time log</span>
                                    </div>

                                    {(selectedStaffDetail.stats?.today_completed_tickets && selectedStaffDetail.stats.today_completed_tickets.length > 0) ? (
                                        <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-white max-h-56 overflow-y-auto">
                                            {selectedStaffDetail.stats.today_completed_tickets.map((t) => (
                                                <div key={t.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors">
                                                    <div className="flex items-center gap-2.5 truncate">
                                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-100 text-slate-800">
                                                            #{t.queue_number}
                                                        </span>
                                                        <div className="truncate">
                                                            <div className="text-xs font-bold text-slate-900 truncate">
                                                                {t.customer_name}
                                                            </div>
                                                            <div className="text-[11px] text-slate-500 truncate">
                                                                {t.service_name}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <div className="text-xs font-bold text-slate-900">{t.formatted_price}</div>
                                                        <div className="text-[10px] font-semibold text-emerald-600">
                                                            Comm: {t.commission_earned} • {t.completed_at}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-1">
                                            <Scissors className="w-6 h-6 text-slate-300 mx-auto" />
                                            <p className="text-xs font-bold text-slate-600">No haircuts completed yet today</p>
                                            <p className="text-[11px] text-slate-400">
                                                When {selectedStaffDetail.display_name} completes active tasks in their terminal, tickets and earnings appear here live.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setStaffDetailTab('edit')}
                                        className="px-4 py-2 rounded-full border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-all"
                                    >
                                        <Edit3 className="w-3.5 h-3.5" />
                                        Edit Profile & Settings
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStaffDetailModalOpen(false)}
                                        className="px-5 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all"
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: EDIT PROFILE & SETTINGS */}
                        {staffDetailTab === 'edit' && (
                            <form onSubmit={handleSaveStaff} className="space-y-4 animate-fadeIn">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                            Display Name / Nickname
                                        </label>
                                        <input
                                            type="text"
                                            value={staffForm.display_name}
                                            onChange={(e) => setStaffForm({ ...staffForm, display_name: e.target.value })}
                                            required
                                            placeholder="e.g. Nimal (Master Barber)"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                            Legal Full Name
                                        </label>
                                        <input
                                            type="text"
                                            value={staffForm.name}
                                            onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                                            required
                                            placeholder="e.g. Nimal Perera"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                            Mobile Phone Number
                                        </label>
                                        <input
                                            type="text"
                                            value={staffForm.phone}
                                            onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                                            placeholder="e.g. 0771234567"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                            Email Address (Optional)
                                        </label>
                                        <input
                                            type="email"
                                            value={staffForm.email || ''}
                                            onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                                            placeholder="e.g. nimal@salon.lk"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                            Login Password (Leave empty to keep)
                                        </label>
                                        <input
                                            type="password"
                                            value={staffForm.password || ''}
                                            onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                                            placeholder="••••••••"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                            Commission Rate (%)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={staffForm.commission_rate}
                                            onChange={(e) => setStaffForm({ ...staffForm, commission_rate: Number(e.target.value) })}
                                            required
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                            Working Status
                                        </label>
                                        <select
                                            value={staffForm.working_status}
                                            onChange={(e) => setStaffForm({ ...staffForm, working_status: e.target.value as any })}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
                                        >
                                            <option value="free">FREE — Available on Floor</option>
                                            <option value="busy">BUSY — Cutting / In Service</option>
                                            <option value="offline">OFFLINE — Clocked Out</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                                    <div>
                                        <div className="text-xs font-bold text-slate-900">Active Barber Account</div>
                                        <div className="text-[11px] text-slate-500">Enable this specialist to appear on shop rosters and receive client queues.</div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={staffForm.is_active}
                                        onChange={(e) => setStaffForm({ ...staffForm, is_active: e.target.checked })}
                                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                    />
                                </div>

                                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setStaffDetailModalOpen(false);
                                            openDeleteStaffModal(selectedStaffDetail);
                                        }}
                                        className="px-4 py-2.5 rounded-full border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center gap-1.5 transition-all"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Remove Specialist
                                    </button>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setStaffDetailTab('overview')}
                                            className="px-4 py-2.5 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs"
                                        >
                                            Back to Stats
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all"
                                        >
                                            Save Changes
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* 4. MODAL: ADD / EDIT STAFF MODAL                          */}
            {/* ========================================================= */}
            {staffModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-fadeIn overflow-y-auto">
                    <div className="w-full max-w-md bg-white border border-slate-100 rounded-[24px] sm:rounded-[28px] p-5 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 my-auto max-h-[92vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Users className="w-4 h-4 text-indigo-600" />
                                {editingStaff ? `Edit Specialist — ${editingStaff.display_name}` : `Add New Specialist`}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setStaffModalOpen(false)}
                                className="p-1 rounded-full text-slate-400 hover:text-slate-700"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveStaff} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    value={staffForm.name}
                                    onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                                    required
                                    placeholder="e.g. Sivaraj Kajan"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                    Display Name
                                </label>
                                <input
                                    type="text"
                                    value={staffForm.display_name}
                                    onChange={(e) => setStaffForm({ ...staffForm, display_name: e.target.value })}
                                    required
                                    placeholder="e.g. Kajan"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                    Phone Number
                                </label>
                                <input
                                    type="text"
                                    value={staffForm.phone}
                                    onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                                    placeholder="e.g. 0771234567"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                        Login Email <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={staffForm.email}
                                        onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                                        required={!editingStaff}
                                        placeholder="barber@salon.lk"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                        Password <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="password"
                                        value={staffForm.password}
                                        onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                                        required={!editingStaff}
                                        placeholder="Min 6 chars"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                        Commission (%)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={staffForm.commission_rate}
                                        onChange={(e) => setStaffForm({ ...staffForm, commission_rate: Number(e.target.value) })}
                                        required
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                        Status
                                    </label>
                                    <select
                                        value={staffForm.working_status}
                                        onChange={(e) => setStaffForm({ ...staffForm, working_status: e.target.value as any })}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white"
                                    >
                                        <option value="free">FREE (Ready)</option>
                                        <option value="busy">BUSY (In Chair)</option>
                                        <option value="offline">OFFLINE</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-2 flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setStaffModalOpen(false)}
                                    className="flex-1 py-2.5 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs"
                                >
                                    {editingStaff ? 'Save Changes' : 'Add Specialist'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* 5. MODAL: CREATE / EDIT BRANCH                            */}
            {/* ========================================================= */}
            {branchModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-fadeIn overflow-y-auto">
                    <div className="w-full max-w-md bg-white border border-slate-100 rounded-[24px] sm:rounded-[28px] p-5 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 my-auto max-h-[92vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-indigo-600" />
                                {editingBranch ? `Edit Branch — ${editingBranch.name}` : 'Establish Regional Branch'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setBranchModalOpen(false)}
                                className="p-1 rounded-full text-slate-400 hover:text-slate-700"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveBranch} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                    Branch Name
                                </label>
                                <input
                                    type="text"
                                    value={branchForm.name}
                                    onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                                    required
                                    placeholder="e.g. Colombo District Branch"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                    City / Geographic Region
                                </label>
                                <input
                                    type="text"
                                    value={branchForm.city}
                                    onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })}
                                    required
                                    placeholder="e.g. Colombo, Jaffna, Kandy"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white"
                                />
                            </div>

                            <div className="pt-2 flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setBranchModalOpen(false)}
                                    className="flex-1 py-2.5 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs"
                                >
                                    {editingBranch ? 'Save Branch' : 'Establish Branch'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* 6. MODAL: DELETE BRANCH CONFIRMATION                      */}
            {/* ========================================================= */}
            {deleteBranchModalOpen && branchToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-fadeIn overflow-y-auto">
                    <div className="w-full max-w-md bg-white border border-rose-200 rounded-[24px] sm:rounded-[28px] p-5 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 my-auto max-h-[92vh] overflow-y-auto">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Delete Branch</h3>
                                <p className="text-xs text-slate-500">{branchToDelete.name} ({branchToDelete.city})</p>
                            </div>
                        </div>

                        {branchToDelete.shops.length > 0 ? (
                            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
                                <p className="font-bold">Deletion Blocked</p>
                                <p>This branch contains {branchToDelete.shops.length} active storefront(s). Please move or delete them before removing this branch.</p>
                            </div>
                        ) : (
                            <p className="text-xs text-slate-600">
                                Are you sure you want to permanently delete <strong>{branchToDelete.name}</strong>?
                            </p>
                        )}

                        <div className="pt-2 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setDeleteBranchModalOpen(false)}
                                className="flex-1 py-2.5 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs"
                            >
                                Cancel
                            </button>
                            {branchToDelete.shops.length === 0 && (
                                <button
                                    type="button"
                                    onClick={handleConfirmDeleteBranch}
                                    className="flex-1 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs"
                                >
                                    Confirm Delete
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* 7. MODAL: CREATE / EDIT STOREFRONT SHOP                   */}
            {/* ========================================================= */}
            {shopModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn overflow-y-auto">
                    <div className="w-full max-w-lg bg-white border border-slate-100 rounded-[28px] p-6 shadow-2xl space-y-5 my-8">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Store className="w-4 h-4 text-indigo-600" />
                                {editingShop ? `Edit Storefront — ${editingShop.name}` : 'Deploy New Storefront'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShopModalOpen(false)}
                                className="p-1 rounded-full text-slate-400 hover:text-slate-700"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveShop} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                    Parent Branch
                                </label>
                                <select
                                    value={shopForm.branch_id}
                                    onChange={(e) => setShopForm({ ...shopForm, branch_id: Number(e.target.value) })}
                                    required
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white"
                                >
                                    {branches.map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {b.name} ({b.city})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                    Storefront Name
                                </label>
                                <input
                                    type="text"
                                    value={shopForm.name}
                                    onChange={(e) => setShopForm({ ...shopForm, name: e.target.value })}
                                    required
                                    placeholder="e.g. Jaffna Gold Flagship"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                        Physical Address
                                    </label>
                                    <input
                                        type="text"
                                        value={shopForm.address}
                                        onChange={(e) => setShopForm({ ...shopForm, address: e.target.value })}
                                        placeholder="e.g. 15 Main Street"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                        Contact Phone
                                    </label>
                                    <input
                                        type="text"
                                        value={shopForm.phone}
                                        onChange={(e) => setShopForm({ ...shopForm, phone: e.target.value })}
                                        placeholder="e.g. +94 77 123 4567"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                        Open Time
                                    </label>
                                    <input
                                        type="time"
                                        value={shopForm.opening_time}
                                        onChange={(e) => setShopForm({ ...shopForm, opening_time: e.target.value })}
                                        required
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                        Close Time
                                    </label>
                                    <input
                                        type="time"
                                        value={shopForm.closing_time}
                                        onChange={(e) => setShopForm({ ...shopForm, closing_time: e.target.value })}
                                        required
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                        Chairs
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={shopForm.staff_capacity}
                                        onChange={(e) => setShopForm({ ...shopForm, staff_capacity: Number(e.target.value) })}
                                        required
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                        Payroll
                                    </label>
                                    <select
                                        value={shopForm.payroll_type}
                                        onChange={(e) => setShopForm({ ...shopForm, payroll_type: e.target.value as any })}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white"
                                    >
                                        <option value="commission">Commission Based</option>
                                        <option value="fixed">Fixed Daily Wage</option>
                                        <option value="hybrid">Hybrid</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                        Commission (%)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={shopForm.commission_rate}
                                        onChange={(e) => setShopForm({ ...shopForm, commission_rate: Number(e.target.value) })}
                                        required
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white"
                                    />
                                </div>
                            </div>

                            <div className="pt-2 flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShopModalOpen(false)}
                                    className="flex-1 py-2.5 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs"
                                >
                                    {editingShop ? 'Save Storefront' : 'Deploy Storefront'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* 8. MODAL: DELETE STOREFRONT CONFIRMATION                  */}
            {/* ========================================================= */}
            {deleteShopModalOpen && shopToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-fadeIn overflow-y-auto">
                    <div className="w-full max-w-md bg-white border border-rose-200 rounded-[24px] sm:rounded-[28px] p-5 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 my-auto max-h-[92vh] overflow-y-auto">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Delete Storefront</h3>
                                <p className="text-xs text-slate-500">{shopToDelete.name}</p>
                            </div>
                        </div>

                        {currentShopList.length <= 1 ? (
                            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
                                <p className="font-bold">Deletion Blocked</p>
                                <p>The system requires at least one operating storefront.</p>
                            </div>
                        ) : (
                            <p className="text-xs text-slate-600">
                                Are you sure you want to permanently delete <strong>{shopToDelete.name}</strong>? Its tickets will be cleared and the view will fallback to the next available storefront.
                            </p>
                        )}

                        <div className="pt-2 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setDeleteShopModalOpen(false)}
                                className="flex-1 py-2.5 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs"
                            >
                                Cancel
                            </button>
                            {currentShopList.length > 1 && (
                                <button
                                    type="button"
                                    onClick={handleConfirmDeleteShop}
                                    className="flex-1 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs"
                                >
                                    Confirm Delete
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* 9. MODAL: DELETE STAFF CONFIRMATION                       */}
            {/* ========================================================= */}
            {deleteStaffModalOpen && staffToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-fadeIn overflow-y-auto">
                    <div className="w-full max-w-md bg-white border border-rose-200 rounded-[24px] sm:rounded-[28px] p-5 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 my-auto max-h-[92vh] overflow-y-auto">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Remove Staff Member</h3>
                                <p className="text-xs text-slate-500">{staffToDelete.display_name} ({staffToDelete.name})</p>
                            </div>
                        </div>

                        <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                            <p>
                                Are you sure you want to remove <strong className="text-slate-900 font-bold">{staffToDelete.display_name}</strong> from the shop workforce roster?
                            </p>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 space-y-1">
                                <div>• Working status: <strong className="text-slate-700">{staffToDelete.working_status.toUpperCase()}</strong></div>
                                <div>• Commission rate: <strong className="text-slate-700">{staffToDelete.commission_rate}%</strong></div>
                                {staffToDelete.current_customer && (
                                    <div className="text-amber-700 font-medium">⚠️ Currently cutting customer: {staffToDelete.current_customer}</div>
                                )}
                            </div>
                        </div>

                        <div className="pt-2 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setDeleteStaffModalOpen(false)}
                                className="flex-1 py-2.5 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDeleteStaff}
                                className="flex-1 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-all"
                            >
                                Confirm Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* 10. MODAL: DELETE SERVICE CONFIRMATION                     */}
            {/* ========================================================= */}
            {deleteServiceModalOpen && serviceToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-fadeIn overflow-y-auto">
                    <div className="w-full max-w-md bg-white border border-rose-200 rounded-[24px] sm:rounded-[28px] p-5 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 my-auto max-h-[92vh] overflow-y-auto">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Remove Service</h3>
                                <p className="text-xs text-slate-500">{serviceToDelete.name}</p>
                            </div>
                        </div>

                        <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                            <p>
                                Are you sure you want to remove <strong className="text-slate-900 font-bold">{serviceToDelete.name}</strong> ({serviceToDelete.formatted_price}) from the shop catalog?
                            </p>
                            <p className="text-[11px] text-slate-400">
                                This service will no longer be available for customer queue bookings or walk-ins.
                            </p>
                        </div>

                        <div className="pt-2 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setDeleteServiceModalOpen(false)}
                                className="flex-1 py-2.5 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDeleteService}
                                className="flex-1 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-all"
                            >
                                Confirm Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
