import React, { useState } from 'react';
import {
  Building,
  Shield,
  Users,
  CreditCard,
  Layers,
  ArrowRight,
  Search,
  Plus,
  Activity,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Server,
  Zap,
  DollarSign,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  Lock,
  ChevronRight,
  Filter,
  Check,
  Settings,
  QrCode,
  MessageSquare,
  Bot,
  Sparkles,
  Smartphone,
  Radio,
  Building2,
} from 'lucide-react';
import { Tenant, TenantPlan, TenantStatus, PlatformMetrics, PLAN_DEFINITIONS, ADDON_DEFINITIONS } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';

export interface SuperAdminViewProps {
  tenants: Tenant[];
  currentTenantId: string;
  onSelectTenant: (tenantId: string) => void;
  onEnterTenant?: (tenant: Tenant) => void;
  onProvisionTenant: (tenantData: Omit<Tenant, 'id' | 'joinedDate' | 'renewalDate' | 'monthlyGmv' | 'monthlyBookings'>) => void;
  onUpdateTenantStatus: (tenantId: string, status: TenantStatus, reason?: string) => void;
  onUpdateTenantPlan: (tenantId: string, plan: TenantPlan) => void;
  onUpdateTenantFeatures?: (tenantId: string, features: Partial<Tenant['features']>) => void;
  onToggleTenantDeletion?: (tenantId: string, allowed?: boolean) => void;
  onRecordTenantPayment?: (tenantId: string, paymentData: any) => void;
  onDeleteTenant?: (tenantId: string, force?: boolean) => void;
}

export const SuperAdminView: React.FC<SuperAdminViewProps> = ({
  tenants,
  currentTenantId,
  onSelectTenant,
  onEnterTenant,
  onProvisionTenant,
  onUpdateTenantStatus,
  onUpdateTenantPlan,
  onUpdateTenantFeatures,
  onToggleTenantDeletion,
  onRecordTenantPayment,
  onDeleteTenant,
}) => {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'tenants' | 'gateways' | 'plans' | 'audit'>('tenants');
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [selectedTenantForPlan, setSelectedTenantForPlan] = useState<Tenant | null>(null);

  // Additional Modals State
  const [tenantForPayments, setTenantForPayments] = useState<Tenant | null>(null);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const [tenantToSuspend, setTenantToSuspend] = useState<Tenant | null>(null);

  // Payment Recording Form State
  const [payAmount, setPayAmount] = useState<number>(5999);
  const [payRef, setPayRef] = useState<string>('');
  const [payMethod, setPayMethod] = useState<string>('UPI');
  const [payNotes, setPayNotes] = useState<string>('Monthly subscription payment');
  const [payNextRenewal, setPayNextRenewal] = useState<string>('2027-01-01');

  // Suspension Form State
  const [suspendReason, setSuspendReason] = useState<string>('Overdue subscription payment');

  // Deletion Confirmation Input
  const [deleteConfirmSlug, setDeleteConfirmSlug] = useState<string>('');

  // New Tenant Form State
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formOwnerName, setFormOwnerName] = useState('');
  const [formOwnerEmail, setFormOwnerEmail] = useState('');
  const [formOwnerPhone, setFormOwnerPhone] = useState('');
  const [formPlan, setFormPlan] = useState<TenantPlan>('Professional');
  const [formMaxRooms, setFormMaxRooms] = useState(60);
  const [formBillingCycle, setFormBillingCycle] = useState<'Monthly' | 'Annual'>('Monthly');

  // Form Modules & Add-ons
  const [formOtaSync, setFormOtaSync] = useState(true);
  const [formDirectBooking, setFormDirectBooking] = useState(true);
  const [formWhatsapp, setFormWhatsapp] = useState(false);
  const [formMultiProperty, setFormMultiProperty] = useState(false);
  const [formQrRoomService, setFormQrRoomService] = useState(false);
  const [formAiPricing, setFormAiPricing] = useState(false);
  const [formHousekeepingApp, setFormHousekeepingApp] = useState(true);
  const [formSmsPortal, setFormSmsPortal] = useState(false);

  const handleSelectPlan = (plan: TenantPlan) => {
    setFormPlan(plan);
    if (plan === 'Enterprise') {
      setFormMaxRooms(250);
      setFormMultiProperty(true);
      setFormOtaSync(true);
      setFormDirectBooking(true);
      setFormWhatsapp(true);
      setFormQrRoomService(true);
      setFormAiPricing(true);
      setFormHousekeepingApp(true);
      setFormSmsPortal(true);
    } else if (plan === 'Professional') {
      setFormMaxRooms(75);
      setFormMultiProperty(false);
      setFormOtaSync(true);
      setFormDirectBooking(true);
      setFormWhatsapp(false);
      setFormQrRoomService(false);
      setFormAiPricing(false);
      setFormHousekeepingApp(true);
      setFormSmsPortal(false);
    } else {
      setFormMaxRooms(25);
      setFormMultiProperty(false);
      setFormOtaSync(false);
      setFormDirectBooking(true);
      setFormWhatsapp(false);
      setFormQrRoomService(false);
      setFormAiPricing(false);
      setFormHousekeepingApp(false);
      setFormSmsPortal(false);
    }
  };

  // Dynamic MRR calculations
  const basePlanPrice = PLAN_DEFINITIONS[formPlan]?.monthlyPrice ?? 8999;
  const addonsPrice =
    (formPlan !== 'Enterprise' && formMultiProperty ? 4999 : 0) +
    (formPlan !== 'Enterprise' && formQrRoomService ? 1499 : 0) +
    (formPlan !== 'Enterprise' && formWhatsapp ? 2499 : 0) +
    (formPlan !== 'Enterprise' && formAiPricing ? 3499 : 0) +
    (formPlan === 'Starter' && formHousekeepingApp ? 999 : 0) +
    (formPlan !== 'Enterprise' && formSmsPortal ? 999 : 0);
  const calculatedTotalMonthlyMrr = basePlanPrice + addonsPrice;
  const effectiveCalculatedMrr = formBillingCycle === 'Annual'
    ? Math.round(calculatedTotalMonthlyMrr * 0.85)
    : calculatedTotalMonthlyMrr;

  // Aggregated platform stats
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((t) => t.status === 'Active').length;
  const totalRoomsManaged = tenants.reduce((sum, t) => sum + t.totalRoomsActive, 0);
  const totalMrr = tenants.reduce((sum, t) => sum + (t.status === 'Active' ? t.mrr : 0), 0);
  const totalArr = totalMrr * 12;
  const totalPlatformGmv = tenants.reduce((sum, t) => sum + t.monthlyGmv, 0);

  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subdomain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.ownerEmail.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlan = filterPlan === 'all' || t.plan === filterPlan;
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  const handleCreateTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formSlug || !formOwnerEmail) {
      showToast({ title: 'Missing Fields', description: 'Please fill in required fields.', type: 'error' });
      return;
    }

    onProvisionTenant({
      name: formName,
      slug: formSlug.toLowerCase().trim(),
      subdomain: `${formSlug.toLowerCase().trim()}.signinn.com`,
      ownerName: formOwnerName,
      ownerEmail: formOwnerEmail,
      ownerPhone: formOwnerPhone || '+91 98000 00000',
      plan: formPlan,
      status: 'Active',
      billingCycle: formBillingCycle,
      mrr: effectiveCalculatedMrr,
      maxRooms: Number(formMaxRooms),
      totalRoomsActive: Math.min(Number(formMaxRooms), 20),
      propertiesCount: 1,
      primaryPropertyId: 'prop-1',
      features: {
        otaChannelManager: formPlan === 'Enterprise' || formOtaSync,
        directBookingEngine: formDirectBooking,
        whatsappAutomations: formPlan === 'Enterprise' || formWhatsapp,
        multiProperty: formPlan === 'Enterprise' || formMultiProperty,
        advancedAnalytics: formPlan !== 'Starter',
        qrRoomService: formPlan === 'Enterprise' || formQrRoomService,
        aiPricing: formPlan === 'Enterprise' || formAiPricing,
        housekeepingApp: formPlan === 'Enterprise' || formPlan === 'Professional' || formHousekeepingApp,
        smsGuestPortal: formPlan === 'Enterprise' || formSmsPortal,
      },
    });

    showToast({
      title: 'Hotel Client Provisioned',
      description: `${formName} created with ${formPlan} Plan (MRR: ${formatCurrency(effectiveCalculatedMrr)})`,
      type: 'success',
    });

    setIsProvisionModalOpen(false);
    setFormName('');
    setFormSlug('');
    setFormOwnerName('');
    setFormOwnerEmail('');
  };

  const handleAutoSlug = (name: string) => {
    setFormName(name);
    if (!formSlug || formSlug === formName.toLowerCase().replace(/[^a-z0-9]/g, '')) {
      setFormSlug(name.toLowerCase().replace(/[^a-z0-9]/g, ''));
    }
  };

  return (
    <div className="space-y-6">
      {/* Super Admin Platform HQ Banner */}
      <div className="bg-gradient-to-r from-[#0d1526] via-[#131d33] to-[#1e293b] rounded-2xl p-6 text-white shadow-md border border-slate-700/60 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-400/30 flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-purple-400" /> SIGNINN Platform HQ
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Multi-Tenant Architecture
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
              Hotel Clients & Platform Administration
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Global control center for SIGNINN HMS. Manage client hotel organizations, SaaS subscription tiers,
              subdomains, tenant provisioning, and two-way OTA sync infrastructure.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsProvisionModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Provision New Hotel
            </Button>
          </div>
        </div>

        {/* Global Platform KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6 pt-5 border-t border-slate-700/60">
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40">
            <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center justify-between">
              Active Tenants
              <Building className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-xl font-bold text-white mt-1">
              {activeTenants} <span className="text-xs font-normal text-slate-400">/ {totalTenants} hotels</span>
            </div>
            <div className="text-[10px] text-emerald-400 mt-0.5 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> 100% Platform Uptime
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40">
            <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center justify-between">
              Rooms Managed
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-xl font-bold text-white mt-1">
              {totalRoomsManaged}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-normal">
              Across active client racks
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40">
            <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center justify-between">
              Monthly ARR / MRR
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-emerald-400 mt-1">
              {formatCurrency(totalMrr)} <span className="text-[10px] text-slate-400 font-normal">/mo</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-normal">
              ARR: {formatCurrency(totalArr)}
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40">
            <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center justify-between">
              Client Hotel GMV
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-bold text-white mt-1">
              ₹{(totalPlatformGmv / 100000).toFixed(1)} Lakhs
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-normal">
              Processed this month
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40 col-span-2 sm:col-span-1">
            <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center justify-between">
              OTA Sync Health
              <Activity className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-xl font-bold text-purple-300 mt-1">
              99.84%
            </div>
            <div className="text-[10px] text-purple-300/80 mt-0.5 font-normal">
              Gateway telemetry unavailable
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto whitespace-nowrap">
        <button
          onClick={() => setActiveTab('tenants')}
          className={`pb-3 px-3 text-xs font-semibold transition-colors border-b-2 cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'tenants'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Building className="w-4 h-4" />
          Hotel Clients ({tenants.length})
        </button>

        <button
          onClick={() => setActiveTab('gateways')}
          className={`pb-3 px-3 text-xs font-semibold transition-colors border-b-2 cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'gateways'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Server className="w-4 h-4" />
          OTA Gateway Health
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          className={`pb-3 px-3 text-xs font-semibold transition-colors border-b-2 cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'plans'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Subscription Plans & Pricing
        </button>
      </div>

      {/* Tab 1: Tenants Directory */}
      {activeTab === 'tenants' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by hotel name, subdomain, or owner..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Filter className="w-3.5 h-3.5 text-gray-400" />
                <span>Plan:</span>
                <select
                  value={filterPlan}
                  onChange={(e) => setFilterPlan(e.target.value)}
                  className="text-xs bg-gray-50 border border-gray-200 rounded-md py-1 px-2 focus:outline-none"
                >
                  <option value="all">All Plans</option>
                  <option value="Starter">Starter</option>
                  <option value="Professional">Professional</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
              </div>

              <div className="flex items-center gap-1 text-xs text-gray-500">
                <span>Status:</span>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="text-xs bg-gray-50 border border-gray-200 rounded-md py-1 px-2 focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Trial">Trial</option>
                  <option value="Past Due">Past Due</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tenants Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-50/80 text-[10px] uppercase font-semibold text-gray-500 tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">Hotel Organization / Tenant</th>
                    <th className="py-3 px-4">Subdomain</th>
                    <th className="py-3 px-4">Owner & Contact</th>
                    <th className="py-3 px-4">Plan & Billing</th>
                    <th className="py-3 px-4 text-center">Rooms Quota</th>
                    <th className="py-3 px-4">Monthly GMV</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTenants.map((t) => {
                    const isCurrent = t.id === currentTenantId;
                    return (
                      <tr
                        key={t.id}
                        className={`hover:bg-gray-50/70 transition-colors ${
                          isCurrent ? 'bg-blue-50/40' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-medium text-gray-900">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[#172033] text-white flex items-center justify-center font-bold text-xs shrink-0">
                              {t.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-gray-950">{t.name}</span>
                                {isCurrent && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-800">
                                    Current
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-gray-400">
                                Client since {new Date(t.joinedDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 text-gray-600 font-mono text-[11px] bg-gray-50 px-2 py-1 rounded border border-gray-100 w-fit">
                            <span>{t.subdomain}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">{t.ownerName}</div>
                          <div className="text-[10px] text-gray-500">{t.ownerEmail}</div>
                          <div className="text-[10px] text-gray-400">{t.ownerPhone}</div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                t.plan === 'Enterprise'
                                  ? 'bg-purple-100 text-purple-800'
                                  : t.plan === 'Professional'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {t.plan}
                            </span>
                            <span className="text-[10px] text-gray-400">({t.billingCycle})</span>
                          </div>
                          <div className="text-[11px] font-semibold text-gray-900 mt-0.5">
                            {formatCurrency(t.mrr)}<span className="text-[9px] text-gray-400 font-normal">/mo</span>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="font-semibold text-gray-900">
                            {t.totalRoomsActive} <span className="text-gray-400 font-normal">/ {t.maxRooms}</span>
                          </div>
                          <div className="w-16 mx-auto bg-gray-100 rounded-full h-1.5 mt-1 overflow-hidden">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full"
                              style={{ width: `${Math.min(100, (t.totalRoomsActive / t.maxRooms) * 100)}%` }}
                            />
                          </div>
                        </td>

                        <td className="py-3 px-4 font-semibold text-gray-900">
                          {formatCurrency(t.monthlyGmv)}
                          <div className="text-[10px] text-gray-400 font-normal">{t.monthlyBookings} stays this month</div>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold inline-flex items-center gap-1 ${
                              t.status === 'Active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : t.status === 'Trial'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : t.status === 'Past Due'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                t.status === 'Active'
                                  ? 'bg-emerald-500'
                                  : t.status === 'Trial'
                                  ? 'bg-blue-500'
                                  : t.status === 'Past Due'
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                            />
                            {t.status}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setTenantForPayments(t);
                                setPayAmount(t.mrr || 5999);
                                setPayRef(`TXN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
                              }}
                              className="px-2 py-1 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer flex items-center gap-1"
                              title="Track SaaS Subscription Payments"
                            >
                              <CreditCard className="w-3 h-3" /> Payments
                            </button>

                            {t.status === 'Suspended' ? (
                              <button
                                onClick={() => {
                                  onUpdateTenantStatus(t.id, 'Active');
                                  showToast({
                                    title: 'Hotel Reactivated',
                                    description: `${t.name} has been reinstated to Active status.`,
                                    type: 'success',
                                  });
                                }}
                                className="px-2 py-1 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                                title="Reactivate suspended client hotel"
                              >
                                Reactivate
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setTenantToSuspend(t);
                                  setSuspendReason('Subscription payment overdue / policy update');
                                }}
                                className="px-2 py-1 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer"
                                title="Suspend hotel operations"
                              >
                                Suspend
                              </button>
                            )}

                            <Button
                              size="xs"
                              variant={isCurrent ? 'outline' : 'primary'}
                              onClick={() => {
                                if (onSelectTenant) {
                                  onSelectTenant(t.id);
                                } else if (onEnterTenant) {
                                  onEnterTenant(t);
                                }
                                showToast({
                                  title: `Switched to ${t.name}`,
                                  description: `You are now operating inside tenant ${t.slug}.signinn.com`,
                                  type: 'info',
                                });
                              }}
                              leftIcon={<ArrowRight className="w-3 h-3" />}
                            >
                              {isCurrent ? 'Active' : 'Enter HMS'}
                            </Button>

                            <button
                              onClick={() => setSelectedTenantForPlan(t)}
                              title="Manage Plan, Features & Deletion Switch"
                              className="p-1.5 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
                            >
                              <Settings className="w-3.5 h-3.5 text-slate-600" />
                            </button>

                            <button
                              onClick={() => {
                                setTenantToDelete(t);
                                setDeleteConfirmSlug('');
                              }}
                              title="Delete Client Tenant Account"
                              className="p-1.5 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredTenants.length === 0 && (
              <div className="py-12 text-center text-gray-500">
                <Building className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs font-medium">No hotel clients matching criteria</p>
                <p className="text-[11px] text-gray-400 mt-1">Try clearing filters or search query</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: OTA Gateway Health */}
      {activeTab === 'gateways' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-950">Global OTA Distribution Connectivity</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Centralized gateway connections routing rates, availability, and bookings between global channels and all hotel tenants.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
              Telemetry unavailable
            </span>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Gateway health telemetry is not configured. Check the Aiosell property mapping in Channel Manager for the current connection state.</div>
        </div>
      )}

      {/* Tab 3: Subscription Plans & Pricing */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800">
                  SaaS Revenue Architecture
                </span>
                <span className="text-xs text-gray-400">• Tiered Plans & Modular Add-ons</span>
              </div>
              <h3 className="text-base font-bold text-gray-950 mt-1">SIGNINN HMS Subscription Matrix</h3>
              <p className="text-xs text-gray-500 mt-0.5 max-w-xl">
                Multi-property capability is selectively granted via Enterprise plans or as a dedicated add-on. Individual hotel clients can be customized with guest experience and operational modules.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="primary" size="sm" onClick={() => setIsProvisionModalOpen(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" />
                Provision Client with Plan
              </Button>
            </div>
          </div>

          {/* 3 SaaS Subscription Tiers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Starter Plan */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-700">
                    Starter
                  </span>
                  <span className="text-xs text-gray-400 font-medium">Single Property Only</span>
                </div>

                <div>
                  <div className="text-3xl font-extrabold text-gray-950">₹4,499</div>
                  <div className="text-xs text-gray-500">per property / month billed monthly</div>
                </div>

                <div className="text-xs text-gray-600 space-y-2.5 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Up to <strong>25 rooms</strong> capacity</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>1 Single Physical Property</strong> (Strictly locked)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Interactive Tape Chart & Room Rack</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Front Desk Check-in / Check-out</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Indian GST Billing (SAC 996311)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Direct Booking Engine</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <Lock className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                    <span>Multi-Property: Available as Add-on (+₹4,999/mo)</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[11px] text-gray-500">Active Clients:</span>
                <span className="font-bold text-xs text-gray-900 bg-gray-100 px-2 py-0.5 rounded-full">
                  {tenants.filter((t) => t.plan === 'Starter').length}
                </span>
              </div>
            </div>

            {/* Professional Plan */}
            <div className="bg-white rounded-2xl border-2 border-blue-600 p-5 shadow-sm flex flex-col justify-between relative hover:shadow-md transition-all">
              <span className="absolute -top-3 right-5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white shadow-xs">
                Most Popular
              </span>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800">
                    Professional
                  </span>
                  <span className="text-xs text-blue-600 font-medium">Boutique & Mid-Scale</span>
                </div>

                <div>
                  <div className="text-3xl font-extrabold text-gray-950">₹8,999</div>
                  <div className="text-xs text-gray-500">per property / month billed monthly</div>
                </div>

                <div className="text-xs text-gray-600 space-y-2.5 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Up to <strong>75 rooms</strong> capacity</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-600 shrink-0" />
                    <span><strong>1 Primary Property</strong> included</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-600 shrink-0" />
                    <span><strong>2-Way OTA Channel Manager</strong> (Booking.com, MMT, Agoda)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Direct Booking Engine with Payment Gateway</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Housekeeping Mobile Attendant Board</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Daily Manager Flash & RevPAR Analytics</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Multi-Property: Add-on (+₹4,999/mo)</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[11px] text-gray-500">Active Clients:</span>
                <span className="font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                  {tenants.filter((t) => t.plan === 'Professional').length}
                </span>
              </div>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-gradient-to-b from-white to-purple-50/30 rounded-2xl border border-purple-200 p-5 shadow-2xs flex flex-col justify-between hover:border-purple-300 transition-all">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-100 text-purple-800">
                    Enterprise
                  </span>
                  <span className="text-xs text-purple-600 font-semibold">Chains & Portfolios</span>
                </div>

                <div>
                  <div className="text-3xl font-extrabold text-gray-950">₹19,999</div>
                  <div className="text-xs text-gray-500">per organization / month</div>
                </div>

                <div className="text-xs text-gray-600 space-y-2.5 pt-2 border-t border-purple-100">
                  <div className="flex items-center gap-2 font-medium text-purple-950">
                    <Check className="w-4 h-4 text-purple-600 shrink-0" />
                    <span><strong>Multi-Property Portfolio Included</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-purple-600 shrink-0" />
                    <span><strong>Unlimited Rooms</strong> & Branch Switcher</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-purple-600 shrink-0" />
                    <span><strong>WhatsApp Booking & Concierge</strong> included</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-purple-600 shrink-0" />
                    <span><strong>QR Code Room Service</strong> included</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-purple-600 shrink-0" />
                    <span><strong>AI Dynamic Pricing & Yield Engine</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Dedicated Account Manager & 24/7 Priority SLA</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-purple-100 flex items-center justify-between">
                <span className="text-[11px] text-gray-500">Active Clients:</span>
                <span className="font-bold text-xs text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                  {tenants.filter((t) => t.plan === 'Enterprise').length}
                </span>
              </div>
            </div>
          </div>

          {/* Dedicated SaaS Add-ons Catalog */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-gray-900">SIGNINN SaaS Add-ons Catalog</h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                    6 Modular Add-ons
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Upsell modules that can be activated on any client account to expand feature functionality and increase MRR.
                </p>
              </div>
              <div className="text-xs text-gray-500 font-medium">
                Active Client Subscriptions: <strong className="text-gray-900">{tenants.length} Hotels</strong>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ADDON_DEFINITIONS.map((addon) => {
                const activeCount = tenants.filter((t) => Boolean((t.features as any)?.[addon.id])).length;
                return (
                  <div
                    key={addon.id}
                    className="p-4 rounded-xl border border-gray-200/90 bg-slate-50/40 hover:bg-white hover:border-blue-200 hover:shadow-xs transition-all space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600">
                          {addon.category}
                        </span>
                        {addon.badge && (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            addon.badge === 'Enterprise Feature'
                              ? 'bg-purple-100 text-purple-700 border border-purple-200'
                              : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}>
                            {addon.badge}
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-gray-900">{addon.name}</h4>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{addon.description}</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                      <div>
                        <div className="text-base font-extrabold text-blue-700">₹{addon.monthlyPrice.toLocaleString()}</div>
                        <div className="text-[10px] text-gray-400">per month</div>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {activeCount} hotels
                        </span>
                        <div className="text-[10px] text-gray-400">subscribed</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Provision New Tenant Modal */}
      {isProvisionModalOpen && (
        <Modal
          isOpen={isProvisionModalOpen}
          onClose={() => setIsProvisionModalOpen(false)}
          title="Provision New Hotel Tenant (Client Onboarding)"
          size="lg"
        >
          <form onSubmit={handleCreateTenant} className="space-y-4">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50/80 p-3.5 rounded-xl border border-blue-200/80 text-xs text-blue-950 leading-relaxed flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong>Multi-Tenant Client Provisioning:</strong> Configures a dedicated tenant database isolation sandbox,
                subdomain routing (<code>{formSlug ? `${formSlug}.signinn.com` : 'client.signinn.com'}</code>), and assigns plan feature entitlements.
              </div>
            </div>

            {/* Basic Organization Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Hotel Organization / Client Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => handleAutoSlug(e.target.value)}
                  placeholder="e.g. Whispering Palms Luxury Resort"
                  className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Subdomain Slug *
                </label>
                <div className="flex items-center">
                  <input
                    type="text"
                    required
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                    placeholder="whisperingpalms"
                    className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                  />
                  <span className="px-2.5 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-xs text-gray-500 font-mono">
                    .signinn.com
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Owner / GM Name *
                </label>
                <input
                  type="text"
                  required
                  value={formOwnerName}
                  onChange={(e) => setFormOwnerName(e.target.value)}
                  placeholder="e.g. Suresh Varma"
                  className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Owner Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formOwnerEmail}
                  onChange={(e) => setFormOwnerEmail(e.target.value)}
                  placeholder="suresh@whisperingpalms.com"
                  className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formOwnerPhone}
                  onChange={(e) => setFormOwnerPhone(e.target.value)}
                  placeholder="+91 98470 55443"
                  className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Plan Selector Cards */}
            <div className="pt-2 border-t border-gray-100">
              <label className="block text-xs font-semibold text-gray-900 mb-2">
                Select Base Subscription Plan *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {(['Starter', 'Professional', 'Enterprise'] as TenantPlan[]).map((p) => {
                  const planMeta = PLAN_DEFINITIONS[p];
                  const isSelected = formPlan === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleSelectPlan(p)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-500 shadow-2xs'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-gray-900">{p}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                      </div>
                      <div className="text-base font-extrabold text-blue-700 mt-1">
                        ₹{planMeta.monthlyPrice.toLocaleString()}<span className="text-[10px] font-normal text-gray-500">/mo</span>
                      </div>
                      <div className="text-[10px] text-gray-500 mt-1">
                        {p === 'Enterprise' ? 'Unlimited Rooms • Multi-Property' : `Up to ${planMeta.maxRooms} rooms • Single Property`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Max Room Quota
                </label>
                <input
                  type="number"
                  min="5"
                  max="500"
                  value={formMaxRooms}
                  onChange={(e) => setFormMaxRooms(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Billing Cycle
                </label>
                <select
                  value={formBillingCycle}
                  onChange={(e) => setFormBillingCycle(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Monthly">Monthly Recurring</option>
                  <option value="Annual">Annual (15% Pre-pay discount)</option>
                </select>
              </div>
            </div>

            {/* Multi-Property & Extended Add-ons Configuration */}
            <div className="pt-2 border-t border-gray-100 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-semibold text-gray-900">
                    Multi-Property Capability & SaaS Add-ons
                  </label>
                  <p className="text-[10px] text-gray-500">
                    Multi-property is selectable here for non-Enterprise clients as an add-on (+₹4,999/mo).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {/* Multi-Property Toggle */}
                <label className={`p-2.5 rounded-xl border flex items-start justify-between gap-2 cursor-pointer transition-colors ${
                  formPlan === 'Enterprise'
                    ? 'bg-purple-50/70 border-purple-200'
                    : formMultiProperty
                    ? 'bg-blue-50/70 border-blue-300'
                    : 'bg-gray-50 border-gray-200 hover:bg-white'
                }`}>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-600" />
                      <span className="font-semibold text-gray-900">Multi-Property Switching</span>
                    </div>
                    <p className="text-[10px] text-gray-500">Enable multiple hotel branches & portfolio group view</p>
                  </div>
                  {formPlan === 'Enterprise' ? (
                    <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-[9px] font-bold shrink-0">
                      Included
                    </span>
                  ) : (
                    <div className="flex flex-col items-end shrink-0">
                      <input
                        type="checkbox"
                        checked={formMultiProperty}
                        onChange={(e) => setFormMultiProperty(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span className="text-[9px] text-blue-600 font-semibold mt-1">+₹4,999</span>
                    </div>
                  )}
                </label>

                {/* QR Code Room Service */}
                <label className={`p-2.5 rounded-xl border flex items-start justify-between gap-2 cursor-pointer transition-colors ${
                  formPlan === 'Enterprise'
                    ? 'bg-purple-50/70 border-purple-200'
                    : formQrRoomService
                    ? 'bg-blue-50/70 border-blue-300'
                    : 'bg-gray-50 border-gray-200 hover:bg-white'
                }`}>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="font-semibold text-gray-900">QR Room Service & Dining</span>
                    </div>
                    <p className="text-[10px] text-gray-500">Contactless in-room QR menu with folio auto-posting</p>
                  </div>
                  {formPlan === 'Enterprise' ? (
                    <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-[9px] font-bold shrink-0">
                      Included
                    </span>
                  ) : (
                    <div className="flex flex-col items-end shrink-0">
                      <input
                        type="checkbox"
                        checked={formQrRoomService}
                        onChange={(e) => setFormQrRoomService(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span className="text-[9px] text-blue-600 font-semibold mt-1">+₹1,499</span>
                    </div>
                  )}
                </label>

                {/* WhatsApp Booking & Concierge */}
                <label className={`p-2.5 rounded-xl border flex items-start justify-between gap-2 cursor-pointer transition-colors ${
                  formPlan === 'Enterprise'
                    ? 'bg-purple-50/70 border-purple-200'
                    : formWhatsapp
                    ? 'bg-blue-50/70 border-blue-300'
                    : 'bg-gray-50 border-gray-200 hover:bg-white'
                }`}>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="font-semibold text-gray-900">WhatsApp Booking & AI Bot</span>
                    </div>
                    <p className="text-[10px] text-gray-500">2-way WhatsApp vouchers & pre-arrival concierge</p>
                  </div>
                  {formPlan === 'Enterprise' ? (
                    <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-[9px] font-bold shrink-0">
                      Included
                    </span>
                  ) : (
                    <div className="flex flex-col items-end shrink-0">
                      <input
                        type="checkbox"
                        checked={formWhatsapp}
                        onChange={(e) => setFormWhatsapp(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span className="text-[9px] text-blue-600 font-semibold mt-1">+₹2,499</span>
                    </div>
                  )}
                </label>

                {/* AI Dynamic Pricing */}
                <label className={`p-2.5 rounded-xl border flex items-start justify-between gap-2 cursor-pointer transition-colors ${
                  formPlan === 'Enterprise'
                    ? 'bg-purple-50/70 border-purple-200'
                    : formAiPricing
                    ? 'bg-blue-50/70 border-blue-300'
                    : 'bg-gray-50 border-gray-200 hover:bg-white'
                }`}>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="font-semibold text-gray-900">AI Dynamic Yield Pricing</span>
                    </div>
                    <p className="text-[10px] text-gray-500">Real-time algorithmic rate adjustments based on velocity</p>
                  </div>
                  {formPlan === 'Enterprise' ? (
                    <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-[9px] font-bold shrink-0">
                      Included
                    </span>
                  ) : (
                    <div className="flex flex-col items-end shrink-0">
                      <input
                        type="checkbox"
                        checked={formAiPricing}
                        onChange={(e) => setFormAiPricing(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span className="text-[9px] text-blue-600 font-semibold mt-1">+₹3,499</span>
                    </div>
                  )}
                </label>

                {/* Mobile Housekeeping App */}
                <label className={`p-2.5 rounded-xl border flex items-start justify-between gap-2 cursor-pointer transition-colors ${
                  formPlan !== 'Starter'
                    ? 'bg-blue-50/40 border-blue-200'
                    : formHousekeepingApp
                    ? 'bg-blue-50/70 border-blue-300'
                    : 'bg-gray-50 border-gray-200 hover:bg-white'
                }`}>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                      <span className="font-semibold text-gray-900">Mobile Housekeeping App</span>
                    </div>
                    <p className="text-[10px] text-gray-500">Mobile attendant turnover board & room inspector</p>
                  </div>
                  {formPlan !== 'Starter' ? (
                    <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-bold shrink-0">
                      Included
                    </span>
                  ) : (
                    <div className="flex flex-col items-end shrink-0">
                      <input
                        type="checkbox"
                        checked={formHousekeepingApp}
                        onChange={(e) => setFormHousekeepingApp(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span className="text-[9px] text-blue-600 font-semibold mt-1">+₹999</span>
                    </div>
                  )}
                </label>

                {/* SMS & Guest Portal */}
                <label className={`p-2.5 rounded-xl border flex items-start justify-between gap-2 cursor-pointer transition-colors ${
                  formPlan === 'Enterprise'
                    ? 'bg-purple-50/70 border-purple-200'
                    : formSmsPortal
                    ? 'bg-blue-50/70 border-blue-300'
                    : 'bg-gray-50 border-gray-200 hover:bg-white'
                }`}>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-purple-600" />
                      <span className="font-semibold text-gray-900">SMS Alerts & Self Check-in</span>
                    </div>
                    <p className="text-[10px] text-gray-500">Transactional SMS & guest self-service web portal</p>
                  </div>
                  {formPlan === 'Enterprise' ? (
                    <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-[9px] font-bold shrink-0">
                      Included
                    </span>
                  ) : (
                    <div className="flex flex-col items-end shrink-0">
                      <input
                        type="checkbox"
                        checked={formSmsPortal}
                        onChange={(e) => setFormSmsPortal(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span className="text-[9px] text-blue-600 font-semibold mt-1">+₹999</span>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Live Calculated MRR Box */}
            <div className="p-3.5 rounded-xl bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Calculated Monthly Billed MRR
                </div>
                <div className="text-xs text-slate-300 mt-0.5">
                  Base {formPlan} (₹{basePlanPrice.toLocaleString()}) {addonsPrice > 0 && `+ Add-ons (₹${addonsPrice.toLocaleString()})`}
                  {formBillingCycle === 'Annual' && ' • 15% Annual Discount'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-extrabold text-emerald-400">
                  {formatCurrency(effectiveCalculatedMrr)}
                </div>
                <div className="text-[10px] text-slate-400">/ month</div>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsProvisionModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Provision Hotel Client
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Tenant Plan & Status Management Modal */}
      {selectedTenantForPlan && (
        <Modal
          isOpen={!!selectedTenantForPlan}
          onClose={() => setSelectedTenantForPlan(null)}
          title={`Manage Tenant: ${selectedTenantForPlan.name}`}
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Subdomain:</span>
                <span className="font-mono font-medium">{selectedTenantForPlan.subdomain}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Current Plan:</span>
                <span className="font-semibold text-blue-700">{selectedTenantForPlan.plan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Account Status:</span>
                <span className="font-semibold">{selectedTenantForPlan.status}</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Change Subscription Tier</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Starter', 'Professional', 'Enterprise'] as TenantPlan[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      onUpdateTenantPlan(selectedTenantForPlan.id, p);
                      setSelectedTenantForPlan({ ...selectedTenantForPlan, plan: p });
                      showToast({ title: 'Plan Updated', description: `Switched to ${p}`, type: 'success' });
                    }}
                    className={`p-2 rounded-lg border text-center font-medium transition-colors cursor-pointer ${
                      selectedTenantForPlan.plan === p
                        ? 'border-blue-600 bg-blue-50 text-blue-800'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Account Suspension / Status</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const newStatus = selectedTenantForPlan.status === 'Active' ? 'Suspended' : 'Active';
                    onUpdateTenantStatus(selectedTenantForPlan.id, newStatus);
                    setSelectedTenantForPlan({ ...selectedTenantForPlan, status: newStatus });
                    showToast({
                      title: `Tenant Status Changed`,
                      description: `Set to ${newStatus}`,
                      type: newStatus === 'Active' ? 'success' : 'warning',
                    });
                  }}
                  className={`p-2 rounded-lg border font-medium cursor-pointer transition-colors ${
                    selectedTenantForPlan.status === 'Active'
                      ? 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100'
                      : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  {selectedTenantForPlan.status === 'Active' ? 'Suspend Tenant Account' : 'Reactivate Tenant'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onSelectTenant) {
                      onSelectTenant(selectedTenantForPlan.id);
                    } else if (onEnterTenant) {
                      onEnterTenant(selectedTenantForPlan);
                    }
                    setSelectedTenantForPlan(null);
                    showToast({
                      title: `Logged into ${selectedTenantForPlan.name}`,
                      description: 'Super Admin Impersonation Active',
                      type: 'info',
                    });
                  }}
                  className="p-2 rounded-lg border border-blue-600 bg-blue-600 text-white font-medium hover:bg-blue-700 cursor-pointer"
                >
                  Enter This Tenant
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block font-semibold text-gray-800">Feature Entitlements & Add-ons</label>
                  <p className="text-[10px] text-gray-500">Toggle core modules and modular add-on licenses for this client hotel</p>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                  Core PMS Modules
                </span>
                <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {[
                    { key: 'otaChannelManager', label: 'OTA Channel Manager', desc: 'Booking.com, MMT, Agoda 2-way sync' },
                    { key: 'directBookingEngine', label: 'Direct Booking Engine', desc: 'Direct guest booking engine & widget' },
                    { key: 'advancedAnalytics', label: 'Advanced P&L Analytics', desc: 'Managerial & tax revenue reporting' },
                  ].map((feat) => {
                    const isEnabled = !!(selectedTenantForPlan.features as any)?.[feat.key];
                    return (
                      <div key={feat.key} className="flex items-center justify-between py-1 px-2 rounded-md hover:bg-white transition-colors">
                        <div>
                          <span className="font-semibold text-gray-900 text-xs">{feat.label}</span>
                          <p className="text-[10px] text-gray-500">{feat.desc}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const updatedFeatures = {
                              ...selectedTenantForPlan.features,
                              [feat.key]: !isEnabled,
                            };
                            onUpdateTenantFeatures?.(selectedTenantForPlan.id, updatedFeatures);
                            setSelectedTenantForPlan({
                              ...selectedTenantForPlan,
                              features: updatedFeatures,
                            });
                            showToast({
                              title: `Module ${!isEnabled ? 'Enabled' : 'Disabled'}`,
                              description: `${feat.label} is now ${!isEnabled ? 'active' : 'inactive'} for ${selectedTenantForPlan.name}`,
                              type: !isEnabled ? 'success' : 'warning',
                            });
                          }}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isEnabled ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                              isEnabled ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block mb-1.5 flex items-center justify-between">
                  <span>SaaS Add-ons & Extensions</span>
                  <span className="text-[10px] font-normal text-blue-600">Selectable per client</span>
                </span>
                <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {[
                    { key: 'multiProperty', label: 'Multi-Property Portfolio', desc: 'Enable branch switching & group metrics (+₹4,999/mo)', icon: Building2 },
                    { key: 'qrRoomService', label: 'QR Code Room Service', desc: 'In-room QR dining menu with folio posting (+₹1,499/mo)', icon: QrCode },
                    { key: 'whatsappAutomations', label: 'WhatsApp Booking & AI Bot', desc: '2-way WhatsApp vouchers & AI concierge (+₹2,499/mo)', icon: MessageSquare },
                    { key: 'aiPricing', label: 'AI Dynamic Pricing', desc: 'Algorithmic occupancy yield adjustments (+₹3,499/mo)', icon: Bot },
                    { key: 'housekeepingApp', label: 'Mobile Staff Housekeeping', desc: 'Mobile attendant turnover board (+₹999/mo)', icon: Smartphone },
                    { key: 'smsGuestPortal', label: 'SMS & Guest Portal', desc: 'Transactional SMS & digital check-in (+₹999/mo)', icon: Radio },
                  ].map((feat) => {
                    const isEnabled = !!(selectedTenantForPlan.features as any)?.[feat.key];
                    const IconComponent = feat.icon;
                    return (
                      <div key={feat.key} className="flex items-center justify-between py-1 px-2 rounded-md hover:bg-white transition-colors">
                        <div className="flex items-start gap-2">
                          <IconComponent className={`w-3.5 h-3.5 mt-0.5 ${isEnabled ? 'text-blue-600' : 'text-gray-400'}`} />
                          <div>
                            <span className="font-semibold text-gray-900 text-xs">{feat.label}</span>
                            <p className="text-[10px] text-gray-500">{feat.desc}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const updatedFeatures = {
                              ...selectedTenantForPlan.features,
                              [feat.key]: !isEnabled,
                            };
                            onUpdateTenantFeatures?.(selectedTenantForPlan.id, updatedFeatures);
                            setSelectedTenantForPlan({
                              ...selectedTenantForPlan,
                              features: updatedFeatures,
                            });
                            showToast({
                              title: `Add-on ${!isEnabled ? 'Activated' : 'Deactivated'}`,
                              description: `${feat.label} is now ${!isEnabled ? 'enabled' : 'disabled'} for ${selectedTenantForPlan.name}`,
                              type: !isEnabled ? 'success' : 'warning',
                            });
                          }}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isEnabled ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                              isEnabled ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Platform SuperAdmin Special Permission: Data Deletion Toggle */}
            <div className="pt-2 border-t border-rose-100 bg-rose-50/50 p-3 rounded-xl border">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-rose-900 text-xs flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-rose-600" /> Allow Tenant Data Deletion Switch
                  </span>
                  <p className="text-[10px] text-rose-700 mt-0.5">
                    When turned ON, platform admins can permanently delete this tenant account & records.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newVal = !selectedTenantForPlan.deletionAllowed;
                    onToggleTenantDeletion?.(selectedTenantForPlan.id, newVal);
                    setSelectedTenantForPlan({
                      ...selectedTenantForPlan,
                      deletionAllowed: newVal,
                    });
                    showToast({
                      title: `Deletion Feature ${newVal ? 'Allowed' : 'Disabled'}`,
                      description: `Tenant deletion permission set to ${newVal}`,
                      type: newVal ? 'warning' : 'info',
                    });
                  }}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    selectedTenantForPlan.deletionAllowed ? 'bg-rose-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                      selectedTenantForPlan.deletionAllowed ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button size="xs" variant="outline" onClick={() => setSelectedTenantForPlan(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Subscription Payments & Billing Tracking Modal */}
      {tenantForPayments && (
        <Modal
          isOpen={!!tenantForPayments}
          onClose={() => setTenantForPayments(null)}
          title={`SaaS Subscription Payments: ${tenantForPayments.name}`}
          size="lg"
        >
          <div className="space-y-4 text-xs">
            {/* Overview Bar */}
            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] text-gray-500 block">Subscription Tier</span>
                <span className="font-bold text-gray-900 text-sm">{tenantForPayments.plan}</span>
                <span className="text-[10px] text-blue-600 block">({formatCurrency(tenantForPayments.mrr)}/mo)</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 block">Payment Status</span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold inline-block mt-0.5 ${
                    tenantForPayments.paymentStatus === 'Paid'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {tenantForPayments.paymentStatus || 'Paid'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 block">Next Renewal Date</span>
                <span className="font-semibold text-gray-900 text-xs">{tenantForPayments.renewalDate}</span>
              </div>
            </div>

            {/* Record New Payment Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!payAmount || !payRef) {
                  showToast({ title: 'Missing Info', description: 'Enter amount and transaction reference', type: 'error' });
                  return;
                }
                onRecordTenantPayment?.(tenantForPayments.id, {
                  amount: payAmount,
                  reference: payRef,
                  method: payMethod,
                  notes: payNotes,
                  nextRenewalDate: payNextRenewal,
                });
                showToast({
                  title: 'Payment Recorded',
                  description: `Logged ₹${payAmount} payment for ${tenantForPayments.name}`,
                  type: 'success',
                });
                setTenantForPayments(null);
              }}
              className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-200 space-y-3"
            >
              <h4 className="font-bold text-gray-900 flex items-center gap-1.5 text-xs">
                <CreditCard className="w-4 h-4 text-blue-600" /> Log New Subscription Renewal Payment
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block font-medium text-gray-700 mb-0.5">Amount (₹)</label>
                  <input
                    type="number"
                    value={payAmount}
                    onChange={(e) => setPayAmount(Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-lg bg-white font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-0.5">Payment Method</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="UPI">UPI / GPay</option>
                    <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-0.5">Transaction Ref</label>
                  <input
                    type="text"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    placeholder="TXN-984021"
                    className="w-full p-2 border border-gray-300 rounded-lg bg-white font-mono text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-0.5">Extend Renewal To</label>
                  <input
                    type="date"
                    value={payNextRenewal}
                    onChange={(e) => setPayNextRenewal(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium text-gray-700 mb-0.5">Notes / Remittance Reference</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Payment received via bank transfer for 12-month renewal"
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white"
                />
              </div>
              <div className="flex justify-end">
                <Button size="xs" variant="primary">
                  Save Subscription Payment
                </Button>
              </div>
            </form>

            {/* Payment Logs Table */}
            <div>
              <h4 className="font-bold text-gray-900 mb-2">Past Subscription Payment Logs</h4>
              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-44 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-100 text-gray-600 text-[10px] uppercase font-semibold">
                    <tr>
                      <th className="p-2">Date</th>
                      <th className="p-2">Reference</th>
                      <th className="p-2">Method</th>
                      <th className="p-2">Amount</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(tenantForPayments.paymentHistory || [
                      { id: 'p-1', date: tenantForPayments.lastPaymentDate || '2026-03-01', reference: 'TXN-INIT88', method: 'UPI', amount: tenantForPayments.mrr || 5999, status: 'Paid' }
                    ]).map((ph) => (
                      <tr key={ph.id} className="hover:bg-gray-50">
                        <td className="p-2 text-gray-600 font-mono text-[10px]">{ph.date}</td>
                        <td className="p-2 font-mono font-medium text-gray-900">{ph.reference}</td>
                        <td className="p-2 text-gray-600">{ph.method}</td>
                        <td className="p-2 font-semibold text-emerald-700">{formatCurrency(ph.amount)}</td>
                        <td className="p-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                            {ph.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button size="xs" variant="outline" onClick={() => setTenantForPayments(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Tenant Suspension Modal */}
      {tenantToSuspend && (
        <Modal
          isOpen={!!tenantToSuspend}
          onClose={() => setTenantToSuspend(null)}
          title={`Suspend Hotel Operational Access: ${tenantToSuspend.name}`}
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-1">
              <span className="font-bold flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-amber-600" /> Confirm Operational Suspension
              </span>
              <p className="text-[11px] text-amber-800">
                Suspending <strong>{tenantToSuspend.name}</strong> will block hotel staff from creating reservations, checking in guests, or syncing rates with OTAs.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-gray-800 mb-1">Reason for Suspension</label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={3}
                className="w-full p-2.5 border border-gray-300 rounded-lg text-xs"
                placeholder="e.g. Overdue subscription payment / Policy violation / Pending KYC validation"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button size="xs" variant="outline" onClick={() => setTenantToSuspend(null)}>
                Cancel
              </Button>
              <Button
                size="xs"
                variant="secondary"
                className="bg-amber-600 hover:bg-amber-700 text-white border-none"
                onClick={() => {
                  onUpdateTenantStatus(tenantToSuspend.id, 'Suspended', suspendReason);
                  showToast({
                    title: 'Tenant Access Suspended',
                    description: `${tenantToSuspend.name} access has been suspended: ${suspendReason}`,
                    type: 'warning',
                  });
                  setTenantToSuspend(null);
                }}
              >
                Confirm Suspension
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Tenant Account Safe Deletion Modal */}
      {tenantToDelete && (
        <Modal
          isOpen={!!tenantToDelete}
          onClose={() => setTenantToDelete(null)}
          title={`Delete Client Tenant: ${tenantToDelete.name}`}
          size="md"
        >
          <div className="space-y-4 text-xs">
            {!tenantToDelete.deletionAllowed ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-rose-700">
                  <Lock className="w-5 h-5" /> Deletion Feature Switch is Disabled
                </div>
                <p className="text-xs text-rose-800 leading-relaxed">
                  Tenant deletion protection is currently <strong>ACTIVE</strong> for <strong>{tenantToDelete.name}</strong>.
                  To protect client records, tenant deletion cannot be performed until the <strong>"Allow Tenant Data Deletion"</strong> toggle switch is enabled in tenant configuration.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      const target = tenantToDelete;
                      setTenantToDelete(null);
                      setSelectedTenantForPlan(target);
                    }}
                    className="px-3 py-1.5 bg-rose-700 text-white font-semibold rounded-lg hover:bg-rose-800 transition-colors cursor-pointer text-xs"
                  >
                    Open Feature Config to Enable Deletion Toggle
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900">
                  <span className="font-bold text-sm text-rose-700 block mb-1">Permanent Data Removal</span>
                  <p className="text-xs text-rose-800">
                    This action will permanently delete <strong>{tenantToDelete.name}</strong> ({tenantToDelete.subdomain}) and all associated property data, room configurations, guest folios, and booking history.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-gray-800 mb-1">
                    To confirm deletion, type the tenant slug <code className="bg-gray-100 px-1 py-0.5 rounded text-rose-700">{tenantToDelete.slug}</code> below:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmSlug}
                    onChange={(e) => setDeleteConfirmSlug(e.target.value)}
                    placeholder={tenantToDelete.slug}
                    className="w-full p-2.5 border border-gray-300 rounded-lg font-mono text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button size="xs" variant="outline" onClick={() => setTenantToDelete(null)}>
                    Cancel
                  </Button>
                  <button
                    disabled={deleteConfirmSlug !== tenantToDelete.slug}
                    onClick={() => {
                      onDeleteTenant?.(tenantToDelete.id, true);
                      setTenantToDelete(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors ${
                      deleteConfirmSlug === tenantToDelete.slug
                        ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Permanently Delete Tenant Account
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
