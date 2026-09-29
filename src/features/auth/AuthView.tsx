import React, { useState } from 'react';
import {
  Shield,
  Eye,
  EyeOff,
  Mail,
  Lock,
  Building,
  User,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  KeyRound,
  Globe,
  Star,
  Hotel,
} from 'lucide-react';
import { UserRole } from '../../types';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { apiRequest } from '../../services/api/apiClient';
import { normalizeUserRole, useAppStore } from '../../stores/useAppStore';

export interface AuthViewProps {
  onLoginSuccess: (user: {
    name: string;
    email: string;
    role: UserRole;
    hotelName: string;
  }) => void;
  initialRole?: UserRole;
  onCancel?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  onLoginSuccess,
  initialRole = 'Owner',
  onCancel,
}) => {
  const { showToast } = useToast();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [hotelName, setHotelName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);
  const [rememberMe, setRememberMe] = useState(true);

  // Error/validation states
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  const validateForm = (): boolean => {
    let valid = true;
    setEmailError('');
    setPasswordError('');

    if (!email || !email.includes('@')) {
      setEmailError('Please enter a valid business email address');
      valid = false;
    }
    if (mode !== 'forgot' && (!password || password.length < 6)) {
      setPasswordError('Password must be at least 6 characters');
      valid = false;
    }
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      if (mode === 'forgot') {
        setForgotSubmitted(true);
        showToast({
          title: 'Reset Link Dispatched',
          description: `Password recovery instructions sent to ${email}`,
          type: 'success',
        });
      } else {
        const authData = await apiRequest<any>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });

        useAppStore.getState().setAuthSession(authData);

        showToast({
          title: 'Signed In Successfully',
          description: `Welcome to SIGNINN HMS, ${authData.user?.name || fullName}`,
          type: 'success',
        });

        const effectiveRole = normalizeUserRole(
          authData.role?.name || authData.role?.code,
          authData.is_platform_user
        );

        onLoginSuccess({
          name: authData.user?.name || fullName,
          email: authData.user?.email || email,
          role: effectiveRole,
          hotelName: authData.tenant?.name || 'SIGNINN Platform HQ',
        });
      }
    } catch (err: any) {
      showToast({
        title: 'Authentication Failed',
        description: err.message || 'Invalid email or password. Please verify credentials.',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectDemoRole = (role: UserRole, demoEmail: string, demoName: string, demoHotel: string) => {
    setSelectedRole(role);
    setEmail(demoEmail);
    setFullName(demoName);
    setHotelName(demoHotel);
    setPassword('password123');
    setEmailError('');
    setPasswordError('');
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-50 text-slate-900 font-sans">
      {/* Left Column: Striking Luxury Hospitality Showcase */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 bg-slate-950 text-white overflow-hidden selection:bg-indigo-500">
        {/* Ambient atmospheric backdrop */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=1600&auto=format&fit=crop"
            alt="Luxury Resort Architecture"
            className="w-full h-full object-cover opacity-25 mix-blend-luminosity scale-105 transition-transform duration-1000 ease-out hover:scale-100"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/40" />
          {/* Subtle electric blue & indigo ambient orbs */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Brand Header */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 border border-indigo-400/30">
              <Hotel className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white font-sans flex items-center gap-1.5">
                SIGNINN <span className="text-indigo-400 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30">HMS LUXURY</span>
              </span>
              <p className="text-[11px] text-slate-400 tracking-wide">Multi-Tenant Hotel Operating System</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-800">
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <span>Global Cloud v4.2</span>
          </div>
        </div>

        {/* Centered Value Proposition */}
        <div className="relative z-10 my-auto py-8 max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/25 text-indigo-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Next-Gen Autonomous Hotel Management</span>
          </div>

          <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight leading-tight text-white">
            Pristine hospitality intelligence for luxury boutique & group portfolios.
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed font-normal">
            Effortlessly orchestrate real-time front desk check-ins, multi-channel rate distribution, 
            instant UPI/card payment folios, and intelligent housekeeping workflows with sub-second synchronization.
          </p>

          {/* Testimonial card */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md space-y-3">
            <div className="flex items-center gap-1 text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400" />
              ))}
            </div>
            <p className="text-xs text-slate-200 italic leading-relaxed">
              "SIGNINN transformed our 8-property heritage portfolio. Check-in queues dropped by 70%, 
              OTA rate parity errors were eliminated completely, and ADR climbed 18% in the first quarter."
            </p>
            <div className="flex items-center gap-3 pt-1 border-t border-slate-800">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                VS
              </div>
              <div>
                <div className="text-xs font-semibold text-white">Vikramaditya Singh</div>
                <div className="text-[10px] text-slate-400">Managing Director, Heritage Palace Hotels Group</div>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Trust Badges */}
        <div className="relative z-10 pt-6 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>SOC-2 Type II Certified • PCI-DSS L1</span>
          </div>
          <span className="text-[11px] text-slate-500">99.99% Guaranteed SLA</span>
        </div>
      </div>

      {/* Right Column: Sleek Modern Auth Card */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 lg:p-16 overflow-y-auto">
        {/* Top bar with guest back action */}
        <div className="flex items-center justify-between mb-8">
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
              S
            </div>
            <span className="font-bold text-slate-900">SIGNINN HMS</span>
          </div>

          {onCancel && (
            <button
              onClick={onCancel}
              className="text-xs text-slate-500 hover:text-slate-800 transition-colors ml-auto cursor-pointer"
            >
              ← Back to App Preview
            </button>
          )}
        </div>

        <div className="max-w-md w-full mx-auto space-y-7">
          {/* Header & Mode Switcher */}
          <div className="space-y-2 text-left">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">
              {mode === 'login' && 'Sign in to your workspace'}
              {mode === 'signup' && 'Create your hotel organization'}
              {mode === 'forgot' && 'Reset your password'}
            </h2>
            <p className="text-xs text-slate-500">
              {mode === 'login' && 'Enter your credentials to access SIGNINN Cloud.'}
              {mode === 'signup' && 'Deploy a dedicated HMS tenant for your property.'}
              {mode === 'forgot' && "We'll send secure recovery steps to your registered email."}
            </p>
          </div>

          {/* Quick Demo Credentials Pill Bar (Zero Friction testing) */}
          <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-150 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                Select Demo Account Persona
              </span>
              <span className="text-[10px] text-indigo-700 font-medium">1-Click Sign-in</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() =>
                  selectDemoRole(
                    'SIGNINN Super Admin',
                    'superadmin@signinn.com',
                    'SIGNINN Super Admin',
                    'SIGNINN Platform HQ'
                  )
                }
                className={`px-2.5 py-1.5 rounded-lg text-left text-xs transition-all cursor-pointer border ${
                  selectedRole === 'SIGNINN Super Admin'
                    ? 'bg-purple-700 text-white border-purple-800 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300'
                }`}
              >
                <div className="font-semibold text-[11px] truncate flex items-center gap-1">
                  <Shield className="w-3 h-3 text-purple-300 inline" /> Super Admin
                </div>
                <div className={`text-[9px] truncate ${selectedRole === 'SIGNINN Super Admin' ? 'text-purple-200' : 'text-slate-400'}`}>
                  SaaS HQ Dashboard
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  selectDemoRole(
                    'Owner',
                    'alex.morgan@grandazure.com',
                    'Alex Morgan (Owner)',
                    'Grand Azure Resort & Spa'
                  )
                }
                className={`px-2.5 py-1.5 rounded-lg text-left text-xs transition-all cursor-pointer border ${
                  selectedRole === 'Owner'
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                }`}
              >
                <div className="font-semibold text-[11px] truncate">Hotel Owner</div>
                <div className={`text-[9px] truncate ${selectedRole === 'Owner' ? 'text-indigo-100' : 'text-slate-400'}`}>
                  Full Hotel Access
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  selectDemoRole(
                    'Property Manager',
                    'rohit.gm@grandazure.com',
                    'Rohit Verma (GM)',
                    'Grand Azure Resort & Spa'
                  )
                }
                className={`px-2.5 py-1.5 rounded-lg text-left text-xs transition-all cursor-pointer border ${
                  selectedRole === 'Property Manager'
                    ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                }`}
              >
                <div className="font-semibold text-[11px] truncate">Hotel Manager</div>
                <div className={`text-[9px] truncate ${selectedRole === 'Property Manager' ? 'text-blue-100' : 'text-slate-400'}`}>
                  Multi-Property Ops
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  selectDemoRole(
                    'Front Desk',
                    'priya.desk@grandazure.com',
                    'Priya Sharma (Desk)',
                    'Grand Azure Resort & Spa'
                  )
                }
                className={`px-2.5 py-1.5 rounded-lg text-left text-xs transition-all cursor-pointer border ${
                  selectedRole === 'Front Desk'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                }`}
              >
                <div className="font-semibold text-[11px] truncate">Front Desk</div>
                <div className={`text-[9px] truncate ${selectedRole === 'Front Desk' ? 'text-emerald-100' : 'text-slate-400'}`}>
                  Check-ins & Folios
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  selectDemoRole(
                    'Housekeeping',
                    'sunita.clean@grandazure.com',
                    'Sunita Devi (HK Lead)',
                    'Grand Azure Resort & Spa'
                  )
                }
                className={`px-2.5 py-1.5 rounded-lg text-left text-xs transition-all cursor-pointer border ${
                  selectedRole === 'Housekeeping'
                    ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
                }`}
              >
                <div className="font-semibold text-[11px] truncate">Housekeeping</div>
                <div className={`text-[9px] truncate ${selectedRole === 'Housekeeping' ? 'text-amber-100' : 'text-slate-400'}`}>
                  Room Clean Status
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  selectDemoRole(
                    'Finance',
                    'arun.finance@grandazure.com',
                    'Arun Menon (Finance)',
                    'Grand Azure Resort & Spa'
                  )
                }
                className={`px-2.5 py-1.5 rounded-lg text-left text-xs transition-all cursor-pointer border ${
                  selectedRole === 'Finance'
                    ? 'bg-slate-800 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                }`}
              >
                <div className="font-semibold text-[11px] truncate">Finance Manager</div>
                <div className={`text-[9px] truncate ${selectedRole === 'Finance' ? 'text-slate-200' : 'text-slate-400'}`}>
                  P&L, Taxes & Audit
                </div>
              </button>
            </div>
          </div>

          {/* Social Logins */}
          {mode !== 'forgot' && (
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    showToast({
                      title: 'OAuth Initialized',
                      description: 'Connecting via Google Workspace Enterprise SSO',
                      type: 'info',
                    });
                    setTimeout(() => {
                      onLoginSuccess({
                        name: fullName,
                        email,
                        role: selectedRole,
                        hotelName,
                      });
                    }, 400);
                  }}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-2xs cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Google SSO</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    showToast({
                      title: 'Apple ID Initialized',
                      description: 'Connecting via Apple Business Manager',
                      type: 'info',
                    });
                    setTimeout(() => {
                      onLoginSuccess({
                        name: fullName,
                        email,
                        role: selectedRole,
                        hotelName,
                      });
                    }, 400);
                  }}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-2xs cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.86c.62-.75 1.04-1.8 0.92-2.86-.9.04-1.99.6-2.63 1.35-.57.65-1.06 1.73-.93 2.76 1.01.08 2.02-.5 2.64-1.25z" />
                  </svg>
                  <span>Apple ID</span>
                </button>
              </div>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-slate-50 px-3 text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                  Or email credentials
                </span>
              </div>
            </div>
          )}

          {/* Form container */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* If Sign Up: Organization Details */}
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Your Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Alex Morgan"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Hotel / Resort Name
                    </label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={hotelName}
                        onChange={(e) => setHotelName(e.target.value)}
                        placeholder="Grand Heritage Palace"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Custom Subdomain
                    </label>
                    <div className="flex items-center text-xs rounded-xl border border-slate-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500">
                      <input
                        type="text"
                        required
                        value={subdomain}
                        onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                        placeholder="heritage"
                        className="w-full pl-3 py-2 text-xs bg-transparent focus:outline-none text-slate-900"
                      />
                      <span className="pr-3 text-[10px] text-slate-400 font-mono select-none">
                        .signinn.com
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Business Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError('');
                  }}
                  placeholder="name@hotelgroup.com"
                  className={`w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 transition-all text-slate-900 ${
                    emailError
                      ? 'border-rose-400 focus:ring-rose-400/20'
                      : 'border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500'
                  }`}
                />
              </div>
              {emailError && <p className="text-[11px] text-rose-600 mt-1">{emailError}</p>}
            </div>

            {/* Password */}
            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError('');
                    }}
                    placeholder="••••••••••••"
                    className={`w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 transition-all text-slate-900 ${
                      passwordError
                        ? 'border-rose-400 focus:ring-rose-400/20'
                        : 'border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordError && <p className="text-[11px] text-rose-600 mt-1">{passwordError}</p>}
              </div>
            )}

            {/* Remember Me */}
            {mode === 'login' && (
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <span>Remember this device for 30 days</span>
                </label>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isLoading}
              className="w-full justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl shadow-sm cursor-pointer"
              rightIcon={!isLoading && <ArrowRight className="w-4 h-4" />}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Authenticating...
                </span>
              ) : mode === 'login' ? (
                'Sign In to Dashboard'
              ) : mode === 'signup' ? (
                'Deploy Hotel Organization'
              ) : (
                'Send Recovery Email'
              )}
            </Button>
          </form>

          {/* Mode Switcher footer */}
          <div className="pt-4 border-t border-slate-200 text-center text-xs text-slate-500">
            {mode === 'login' && (
              <p>
                Don't have a SIGNINN organization yet?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  Create one here
                </button>
              </p>
            )}

            {mode === 'signup' && (
              <p>
                Already have an active account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  Sign in here
                </button>
              </p>
            )}

            {mode === 'forgot' && (
              <p>
                Remembered your password?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  Return to sign in
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-[11px] text-slate-400">
          SIGNINN Hospitality Operating System © 2026 • Encrypted with TLS 1.3
        </div>
      </div>
    </div>
  );
};
