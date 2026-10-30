import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { Scissors, Mail, Lock, ArrowRight, Sparkles, UserCheck, Shield } from 'lucide-react';

export default function StaffLogin({ status }: { status?: string }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: true,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/login', {
            onFinish: () => reset('password'),
        });
    };

    const handleQuickFill = () => {
        setData({
            email: 'nimal@kv.test',
            password: 'password',
            remember: true,
        });
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col justify-between p-4 sm:p-6 selection:bg-emerald-500 selection:text-white">
            <Head title="Barber & Stylist Portal Login — Smart Queue" />

            {/* Top Navigation Bar */}
            <div className="max-w-md w-full mx-auto flex items-center justify-between pt-2">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                        <Scissors className="w-4 h-4 group-hover:rotate-45 transition-transform" />
                    </div>
                    <div>
                        <div className="text-sm font-black text-slate-900 tracking-tight">healthy.<span className="text-emerald-600">saloon</span></div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stylist Terminal</div>
                    </div>
                </Link>

                <Link
                    href="/admin/login"
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-xs transition-colors"
                >
                    Admin HQ →
                </Link>
            </div>

            {/* Main Login Card */}
            <div className="max-w-md w-full mx-auto my-auto py-6">
                <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-[0_12px_40px_rgba(0,0,0,0.04)] space-y-6">
                    {/* Header */}
                    <div className="space-y-2 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs border border-emerald-100/60">
                            <Scissors className="w-7 h-7" />
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                            Barber Chair Terminal
                        </h1>
                        <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto">
                            Sign in to manage your live chair queue, call waiting clients, and record completed haircuts.
                        </p>
                    </div>

                    {status && (
                        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold text-center">
                            {status}
                        </div>
                    )}

                    {/* Quick Demo Credentials Pill */}
                    <button
                        type="button"
                        onClick={handleQuickFill}
                        className="w-full p-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-100 text-xs font-bold text-emerald-800 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Quick Fill: Master Barber Nimal (nimal@kv.test)</span>
                    </button>

                    <form onSubmit={submit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                Staff Email
                            </label>
                            <div className="relative">
                                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                                <input
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    required
                                    placeholder="nimal@kv.test"
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all"
                                />
                            </div>
                            {errors.email && (
                                <p className="text-xs font-semibold text-rose-600 mt-1">{errors.email}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                                <input
                                    type="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all"
                                />
                            </div>
                            {errors.password && (
                                <p className="text-xs font-semibold text-rose-600 mt-1">{errors.password}</p>
                            )}
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={data.remember}
                                    onChange={(e) => setData('remember', e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="text-slate-600 font-semibold">Remember chair session</span>
                            </label>

                            <span className="text-slate-400 font-medium">Default: password</span>
                        </div>

                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full py-3.5 rounded-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                        >
                            <span>Open Barber Terminal</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            </div>

            {/* Footer */}
            <div className="max-w-md w-full mx-auto text-center pb-2 text-xs text-slate-400 font-medium">
                Customer looking to take a ticket?{' '}
                <Link href="/" className="text-emerald-700 font-bold hover:underline">
                    Customer Booking App →
                </Link>
            </div>
        </div>
    );
}
