import React from 'react';
import {
  BedDouble,
  DoorOpen,
  LogOut,
  Users,
  Sparkles,
  AlertTriangle,
  CreditCard,
  Radio,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Clock,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Wrench,
  Receipt,
  FileText,
  UserPlus,
  Tag,
  Shield,
  Layers,
  ArrowUpRight,
  Check,
  Package,
} from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';
import { StatWidget } from '../../components/ui/StatWidget';
import { PerformanceChart } from '../../components/charts/PerformanceChart';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { formatCurrency } from '../../utils/formatters';
import {
  Reservation,
  Room,
  Property,
  UserRole,
  HousekeepingTask,
  MaintenanceTicket,
  PaymentTransaction,
  Folio,
  Invoice,
  ChannelConnection,
  RatePlan,
} from '../../types';

export interface DashboardViewProps {
  property: Property | null;
  reservations: Reservation[];
  rooms: Room[];
  role?: UserRole;
  housekeepingTasks?: HousekeepingTask[];
  maintenanceTickets?: MaintenanceTicket[];
  payments?: PaymentTransaction[];
  folios?: Folio[];
  invoices?: Invoice[];
  channels?: ChannelConnection[];
  ratePlans?: RatePlan[];
  onNavigate: (viewId: string) => void;
  onOpenReservationDetail: (resId: string) => void;
  onOpenCheckIn: (resId?: string) => void;
  onOpenCheckOut: (resId?: string) => void;
  onOpenWalkIn?: () => void;
  onOpenNewReservation?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  property,
  reservations,
  rooms,
  role = 'Owner',
  housekeepingTasks = [],
  maintenanceTickets = [],
  payments = [],
  folios = [],
  invoices = [],
  channels = [],
  ratePlans = [],
  onNavigate,
  onOpenReservationDetail,
  onOpenCheckIn,
  onOpenCheckOut,
  onOpenWalkIn,
  onOpenNewReservation,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Basic computed operational values
  const arrivalsToday = reservations.filter((r) => r.checkInDate === today && r.status !== 'Cancelled');
  const checkedInArrivals = arrivalsToday.filter((r) => r.status === 'Checked In').length;
  const pendingArrivals = arrivalsToday.length - checkedInArrivals;

  const departuresToday = reservations.filter((r) => r.checkOutDate === today && r.status !== 'Cancelled');
  const completedDepartures = reservations.filter((r) => r.checkOutDate === today && r.status === 'Checked Out').length;
  const pendingDepartures = departuresToday.length - completedDepartures;

  const inHouseReservations = reservations.filter((r) => r.status === 'Checked In');

  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter((r) => r.occupancyStatus === 'Occupied').length;
  const dirtyRooms = rooms.filter((r) => r.housekeepingStatus === 'Dirty').length;
  const readyRooms = rooms.filter((r) => r.occupancyStatus === 'Vacant' && (r.housekeepingStatus === 'Ready' || r.housekeepingStatus === 'Inspected')).length;
  const maintenanceRooms = rooms.filter((r) => r.maintenanceStatus !== 'Operational').length;
  const occupancyPercentage = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  const pendingPayments = reservations
    .filter((r) => r.balanceAmount > 0 && r.status !== 'Cancelled')
    .reduce((acc, r) => acc + r.balanceAmount, 0);

  const unassignedArrivals = arrivalsToday.filter((r) => !r.roomId);
  const totalGuestsCount = inHouseReservations.reduce((sum, r) => sum + (r.adults || 1) + (r.children || 0), 0);

  // Financial calculations
  const propertyReservationIds = new Set(reservations.map((r) => r.id));
  const propertyPayments = payments.filter((p) => propertyReservationIds.has(p.reservationId) && p.status === 'Success');
  const totalCollections = propertyPayments.reduce((acc, p) => acc + p.amount, 0);
  const todayCollections = propertyPayments.filter((p) => p.date?.slice(0, 10) === today).reduce((acc, p) => acc + p.amount, 0);
  const activeRoomNights = reservations.filter((r) => r.status !== 'Cancelled' && r.checkInDate <= today && r.checkOutDate > today);
  const realizedRevenue = activeRoomNights.reduce((sum, r) => sum + (r.nightlyRate || r.totalAmount / Math.max(1, r.nights)), 0);
  const adr = activeRoomNights.length > 0 ? Math.round(realizedRevenue / activeRoomNights.length) : 0;
  const revpar = totalRooms > 0 ? Math.round(realizedRevenue / totalRooms) : 0;
  const pastSevenDays = Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() - (6 - index));
    const key = day.toISOString().slice(0, 10);
    const staying = reservations.filter((r) => r.status !== 'Cancelled' && r.checkInDate <= key && r.checkOutDate > key);
    return {
      revenue: Math.round(staying.reduce((sum, r) => sum + (r.nightlyRate || r.totalAmount / Math.max(1, r.nights)), 0)),
      occupancy: totalRooms > 0 ? Math.round(staying.length / totalRooms * 100) : 0,
      guests: staying.reduce((sum, r) => sum + r.adults + r.children, 0),
    };
  });

  const pendingTasksCount = unassignedArrivals.length + dirtyRooms + maintenanceRooms;

  // Housekeeping metrics
  const hskDirtyCount = housekeepingTasks.filter((t) => t.status === 'Dirty').length || dirtyRooms;
  const hskInProgressCount = housekeepingTasks.filter((t) => t.status === 'In Progress' || t.status === 'Cleaning').length;
  const hskCleanCount = housekeepingTasks.filter((t) => t.status === 'Clean' || t.status === 'Ready').length || readyRooms;

  // Maintenance metrics
  const openMntTickets = maintenanceTickets.filter((t) => t.status !== 'Resolved');
  const urgentMntTickets = openMntTickets.filter((t) => t.severity === 'Urgent' || t.severity === 'High');

  // Role Category Classification
  const isFrontOffice = role === 'Front Desk' || role === 'Front Desk Agent' || role === 'Night Auditor';
  const isHousekeeping = role === 'Housekeeping';
  const isMaintenance = role === 'Maintenance';
  const isFinance = role === 'Finance';
  const isRevenue = role === 'Revenue Manager';
  const isExecutive = role === 'Owner' || role === 'Group Admin' || role === 'Property Manager';

  // -------------------------------------------------------------
  // 1. FRONT OFFICE / FRONT DESK DASHBOARD
  // -------------------------------------------------------------
  if (isFrontOffice) {
    const isNightAuditor = role === 'Night Auditor';
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden bg-white/95 rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 font-sans">
                  {isNightAuditor ? 'Night Audit & Shift Settlement' : 'Front Desk Operations Hub'}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  {isNightAuditor ? 'Night Audit Shift' : 'Front Office Active'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                {todayFormatted} • {property?.name || 'Selected property'} · Today's arrivals, room allocations & checkout queue.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {onOpenWalkIn && (
                <button
                  onClick={onOpenWalkIn}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-200 hover:border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 text-emerald-600" />
                  Express Walk-in
                </button>
              )}
              {onOpenNewReservation && (
                <button
                  onClick={onOpenNewReservation}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  <DoorOpen className="w-4 h-4 text-blue-400" />
                  New Reservation
                </button>
              )}
              <button
                onClick={() => onNavigate('reservations')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-slate-600" />
                Tape Chart
              </button>
            </div>
          </div>
        </div>

        {/* 4 Core Operational Front-Desk Widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatWidget
            title="Expected Arrivals Today"
            value={arrivalsToday.length}
            subtitle={`${checkedInArrivals} checked in • ${pendingArrivals} pending arrival`}
            trend={{ value: `${checkedInArrivals}/${arrivalsToday.length}`, isPositive: true, label: 'in-house' }}
            icon={<DoorOpen className="w-5 h-5 text-blue-600" />}
            accentColor="blue"
            onClick={() => onNavigate('frontdesk')}
          />
          <StatWidget
            title="Scheduled Departures"
            value={departuresToday.length}
            subtitle={`${completedDepartures} completed • ${pendingDepartures} pending`}
            trend={{ value: `${pendingDepartures} due`, isPositive: pendingDepartures === 0, label: 'remaining' }}
            icon={<LogOut className="w-5 h-5 text-orange-600" />}
            accentColor="amber"
            onClick={() => onNavigate('frontdesk')}
          />
          <StatWidget
            title="Vacant Clean Rooms Ready"
            value={readyRooms}
            subtitle={`${readyRooms} of ${totalRooms} rooms ready for check-in`}
            trend={{ value: `${occupancyPercentage}% Occ`, isPositive: true, label: 'current' }}
            icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            accentColor="emerald"
            onClick={() => onNavigate('rooms')}
          />
          <StatWidget
            title="Awaiting Room Allocation"
            value={unassignedArrivals.length}
            subtitle={unassignedArrivals.length > 0 ? 'Action needed: Assign room keys' : 'All incoming guests assigned'}
            trend={{ value: unassignedArrivals.length === 0 ? 'Clear' : 'Action Required', isPositive: unassignedArrivals.length === 0, label: 'status' }}
            icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
            accentColor="amber"
            onClick={() => onNavigate('frontdesk')}
          />
        </div>

        {/* Operational Shift Action Center */}
        <div className="bg-white/95 rounded-2xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              Front Desk Shift Priorities
            </h2>
            <span className="text-xs text-slate-400 font-medium">Shift Live Triage</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div
              onClick={() => onNavigate('frontdesk')}
              className="p-3.5 rounded-xl border border-blue-200/80 bg-blue-50/50 hover:bg-blue-50 cursor-pointer transition-all flex items-start gap-3"
            >
              <div className="p-2 rounded-lg bg-blue-100 text-blue-800 shrink-0">
                <DoorOpen className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-slate-900 block">
                  {unassignedArrivals.length > 0 ? `${unassignedArrivals.length} Arrivals Need Rooms` : 'All Arrivals Assigned'}
                </span>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                  {unassignedArrivals.length > 0
                    ? `Assign room keys for ${unassignedArrivals[0]?.guest?.firstName || 'incoming'} before arrival.`
                    : 'All expected arrivals have rooms reserved.'}
                </p>
              </div>
            </div>

            <div
              onClick={() => onNavigate('rooms')}
              className="p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/50 hover:bg-amber-50 cursor-pointer transition-all flex items-start gap-3"
            >
              <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-slate-900 block">
                  {dirtyRooms > 0 ? `${dirtyRooms} Rooms In Turnover` : 'Housekeeping Up to Date'}
                </span>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                  {dirtyRooms > 0 ? `Housekeeping cleaning rooms ${rooms.filter((r) => r.housekeepingStatus === 'Dirty').slice(0, 3).map((r) => r.roomNumber).join(', ')}.` : 'No pending dirty rooms.'}
                </p>
              </div>
            </div>

            <div
              onClick={() => onNavigate('folios')}
              className="p-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/50 hover:bg-emerald-50 cursor-pointer transition-all flex items-start gap-3"
            >
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
                <CreditCard className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-slate-900 block">Outstanding Folio Settlements</span>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                  {formatCurrency(pendingPayments)} pending settlement from departure folios.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Operational Arrivals & Departures Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Arrivals List */}
          <div className="bg-white/95 rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DoorOpen className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Today's Arrivals ({arrivalsToday.length})</h3>
              </div>
              <button onClick={() => onNavigate('frontdesk')} className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer">
                Front Desk Workspace →
              </button>
            </div>
            <div className="divide-y divide-gray-100 flex-1 overflow-x-auto max-h-[380px]">
              {arrivalsToday.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-500">No arrivals scheduled for today</div>
              ) : (
                arrivalsToday.map((res) => (
                  <div key={res.id} className="p-3.5 hover:bg-gray-50 transition-colors flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-gray-900 flex items-center gap-2">
                        {res.guest.firstName} {res.guest.lastName}
                        <Badge variant="channel" channel={res.bookingSource} size="sm" />
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        {res.refCode} • Room: <span className="font-semibold text-gray-700">{res.roomNumber || 'Unassigned'}</span> ({res.roomTypeName})
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="xs"
                        variant={res.status === 'Checked In' ? 'outline' : 'primary'}
                        onClick={() => (res.status === 'Checked In' ? onOpenReservationDetail(res.id) : onOpenCheckIn(res.id))}
                      >
                        {res.status === 'Checked In' ? 'In-House' : 'Check-In'}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Departures List */}
          <div className="bg-white/95 rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LogOut className="w-4 h-4 text-orange-600" />
                <h3 className="text-sm font-bold text-slate-900">Today's Departures ({departuresToday.length})</h3>
              </div>
              <button onClick={() => onNavigate('frontdesk')} className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer">
                Front Desk Workspace →
              </button>
            </div>
            <div className="divide-y divide-gray-100 flex-1 overflow-x-auto max-h-[380px]">
              {departuresToday.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-500">All departures cleared today</div>
              ) : (
                departuresToday.map((res) => (
                  <div key={res.id} className="p-3.5 hover:bg-gray-50 transition-colors flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-gray-900 flex items-center gap-2">
                        {res.guest.firstName} {res.guest.lastName}
                        <span className="text-[11px] text-gray-500 font-normal">Room {res.roomNumber}</span>
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        {res.refCode} • Due: {res.balanceAmount > 0 ? <span className="text-amber-700 font-semibold">{formatCurrency(res.balanceAmount)}</span> : <span className="text-emerald-700 font-semibold">Settled</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="xs" variant="outline" onClick={() => onOpenCheckOut(res.id)}>
                        Check-Out
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. HOUSEKEEPING DASHBOARD
  // -------------------------------------------------------------
  if (isHousekeeping) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden bg-white/95 rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-600 to-teal-500" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 font-sans">
                  Housekeeping & Turnaround Operations
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Floor Duty
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                {todayFormatted} • Room turnaround queue, cleanliness audits, and maintenance reporting.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() => onNavigate('housekeeping')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Housekeeping Tasks
              </button>
              <button
                onClick={() => onNavigate('maintenance')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              >
                <Wrench className="w-4 h-4 text-indigo-600" />
                Report Defect
              </button>
            </div>
          </div>
        </div>

        {/* 4 Housekeeping KPI Widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatWidget
            title="Rooms to Clean (Dirty)"
            value={dirtyRooms}
            subtitle={`${dirtyRooms} turnover cleanings pending`}
            trend={{ value: `${dirtyRooms} rooms`, isPositive: dirtyRooms === 0, label: 'due' }}
            icon={<Sparkles className="w-5 h-5 text-amber-600" />}
            accentColor="amber"
            onClick={() => onNavigate('housekeeping')}
          />
          <StatWidget
            title="In-Progress Servicing"
            value={hskInProgressCount}
            subtitle="Staff currently cleaning"
            trend={{ value: 'Active', isPositive: true, label: 'shifts' }}
            icon={<Clock className="w-5 h-5 text-blue-600" />}
            accentColor="blue"
            onClick={() => onNavigate('housekeeping')}
          />
          <StatWidget
            title="Clean & Ready to Sell"
            value={readyRooms}
            subtitle="Vacant inspected rooms"
            trend={{ value: `${readyRooms}/${totalRooms}`, isPositive: true, label: 'inventory' }}
            icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            accentColor="emerald"
            onClick={() => onNavigate('rooms')}
          />
          <StatWidget
            title="Out of Order / Defect"
            value={maintenanceRooms}
            subtitle={`${maintenanceRooms} rooms blocked for maintenance`}
            trend={{ value: maintenanceRooms > 0 ? 'Blocked' : 'Operational', isPositive: maintenanceRooms === 0, label: 'status' }}
            icon={<Wrench className="w-5 h-5 text-rose-600" />}
            accentColor="rose"
            onClick={() => onNavigate('maintenance')}
          />
        </div>

        {/* Housekeeping Priority Queue Table */}
        <div className="bg-white/95 rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Priority Room Turnaround Tasks ({dirtyRooms})</h3>
            </div>
            <button onClick={() => onNavigate('housekeeping')} className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer">
              Full Task Checklist →
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {rooms
              .filter((r) => r.housekeepingStatus === 'Dirty')
              .slice(0, 6)
              .map((r) => (
                <div key={r.id} className="p-4 hover:bg-gray-50 flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-lg bg-amber-100 text-amber-900 font-bold flex items-center justify-center shrink-0">
                      {r.roomNumber}
                    </span>
                    <div>
                      <div className="font-bold text-gray-900">{r.roomTypeName} • Floor {r.floor}</div>
                      <div className="text-[11px] text-gray-500">Turnover clean required before incoming arrival</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">Dirty</span>
                    <Button size="xs" variant="primary" onClick={() => onNavigate('housekeeping')}>
                      Service Room
                    </Button>
                  </div>
                </div>
              ))}
            {dirtyRooms === 0 && (
              <div className="p-8 text-center text-xs text-gray-500">All guest rooms are clean and ready for occupancy.</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 3. MAINTENANCE / ENGINEERING DASHBOARD
  // -------------------------------------------------------------
  if (isMaintenance) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden bg-white/95 rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-600 to-violet-600" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 font-sans">
                  Engineering & Facilities Dashboard
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  Engineering Duty
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                {todayFormatted} • Work orders, HVAC upkeep, out-of-order room blocks & repairs.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() => onNavigate('maintenance')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <Wrench className="w-4 h-4" />
                Maintenance Desk
              </button>
            </div>
          </div>
        </div>

        {/* 4 Maintenance KPI Widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatWidget
            title="Open Work Orders"
            value={openMntTickets.length}
            subtitle="Pending repair orders"
            trend={{ value: `${openMntTickets.length} active`, isPositive: openMntTickets.length <= 3, label: 'tickets' }}
            icon={<Wrench className="w-5 h-5 text-indigo-600" />}
            accentColor="indigo"
            onClick={() => onNavigate('maintenance')}
          />
          <StatWidget
            title="Urgent / High Severity"
            value={urgentMntTickets.length}
            subtitle="Requires immediate technician"
            trend={{ value: urgentMntTickets.length > 0 ? 'Urgent' : 'Clear', isPositive: urgentMntTickets.length === 0, label: 'priority' }}
            icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
            accentColor="rose"
            onClick={() => onNavigate('maintenance')}
          />
          <StatWidget
            title="Out-of-Order Rooms"
            value={maintenanceRooms}
            subtitle="Blocked from OTA & Frontdesk"
            trend={{ value: `${maintenanceRooms} rooms`, isPositive: maintenanceRooms === 0, label: 'locked' }}
            icon={<BedDouble className="w-5 h-5 text-amber-600" />}
            accentColor="amber"
            onClick={() => onNavigate('rooms')}
          />
          <StatWidget
            title="Operational Health"
            value={`${totalRooms > 0 ? Math.round(((totalRooms - maintenanceRooms) / totalRooms) * 100) : 100}%`}
            subtitle={`${totalRooms - maintenanceRooms} operational rooms`}
            trend={{ value: 'Physical Plant', isPositive: true, label: 'health' }}
            icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            accentColor="emerald"
            onClick={() => onNavigate('rooms')}
          />
        </div>

        {/* Active Tickets List */}
        <div className="bg-white/95 rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Active Maintenance Tickets ({openMntTickets.length})</h3>
            <button onClick={() => onNavigate('maintenance')} className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer">
              View All Tickets →
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {openMntTickets.slice(0, 6).map((t) => (
              <div key={t.id} className="p-4 hover:bg-gray-50 flex items-center justify-between gap-4 text-xs">
                <div>
                  <div className="font-bold text-gray-900 flex items-center gap-2">
                    Room {t.roomNumber} • {t.title}
                    <Badge variant="status" status={t.severity === 'Urgent' ? 'Cancelled' : 'Pending'} size="sm" />
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    Category: {t.category} • Reported by: {t.reportedBy} • Assigned: {t.assignedTo || 'Unassigned'}
                  </div>
                </div>
                <Button size="xs" variant="outline" onClick={() => onNavigate('maintenance')}>
                  Manage Ticket
                </Button>
              </div>
            ))}
            {openMntTickets.length === 0 && (
              <div className="p-8 text-center text-xs text-gray-500">No open maintenance tickets. All room systems operational.</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 4. FINANCE & ACCOUNTS DASHBOARD
  // -------------------------------------------------------------
  if (isFinance) {
    const upiTotal = propertyPayments.filter((p) => p.method === 'UPI').reduce((acc, p) => acc + p.amount, 0);
    const cardTotal = propertyPayments.filter((p) => p.method === 'Credit Card' || p.method === 'Card').reduce((acc, p) => acc + p.amount, 0);
    const cashTotal = propertyPayments.filter((p) => p.method === 'Cash').reduce((acc, p) => acc + p.amount, 0);

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden bg-white/95 rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 font-sans">
                  Finance & Accounts Ledger Dashboard
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Financial Control
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                {todayFormatted} • Daily collections, outstanding folios, digital payment reconciliations & GST compliance.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() => onNavigate('folios')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              >
                <Receipt className="w-4 h-4 text-emerald-600" />
                Folios Ledger
              </button>
              <button
                onClick={() => onNavigate('payments')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <CreditCard className="w-4 h-4 text-blue-400" />
                Collections & Recon
              </button>
              <button
                onClick={() => onNavigate('invoices')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              >
                <FileText className="w-4 h-4 text-indigo-600" />
                GST Invoices
              </button>
            </div>
          </div>
        </div>

        {/* 4 Finance KPI Widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatWidget
            title="Room Revenue Today"
            value={formatCurrency(realizedRevenue)}
            subtitle="Tonight's booked room rates"
            trend={{ value: formatCurrency(todayCollections), isPositive: true, label: 'collected today' }}
            icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
            accentColor="emerald"
            onClick={() => onNavigate('reports')}
          />
          <StatWidget
            title="Pending Folio Balances"
            value={formatCurrency(pendingPayments)}
            subtitle="Outstanding guest debts"
            trend={{ value: `${reservations.filter((r) => r.balanceAmount > 0).length} folios`, isPositive: pendingPayments === 0, label: 'due' }}
            icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
            accentColor="amber"
            onClick={() => onNavigate('folios')}
          />
          <StatWidget
            title="Tax Invoices (GST)"
            value={invoices.length}
            subtitle="Generated invoices"
            trend={{ value: `${invoices.length} issued`, isPositive: true, label: 'records' }}
            icon={<FileText className="w-5 h-5 text-indigo-600" />}
            accentColor="indigo"
            onClick={() => onNavigate('invoices')}
          />
          <StatWidget
            title="Verified Collections"
            value={formatCurrency(totalCollections)}
            subtitle={`${payments.length} transactions processed`}
            trend={{ value: 'Settled', isPositive: true, label: 'digital' }}
            icon={<CheckCircle2 className="w-5 h-5 text-blue-600" />}
            accentColor="blue"
            onClick={() => onNavigate('payments')}
          />
        </div>

        {/* Payment Instrument Split Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500 block">UPI / Instant QR Collections</span>
            <span className="text-xl font-bold text-blue-900 mt-1 block">{formatCurrency(upiTotal)}</span>
            <span className="text-[11px] text-blue-600 font-medium">Auto-reconciled with bank feed</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500 block">Credit / Debit Card Swipes</span>
            <span className="text-xl font-bold text-purple-900 mt-1 block">{formatCurrency(cardTotal)}</span>
            <span className="text-[11px] text-purple-600 font-medium">EDC terminal batch settle</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500 block">Front Desk Cash Safe</span>
            <span className="text-xl font-bold text-emerald-900 mt-1 block">{formatCurrency(cashTotal)}</span>
            <span className="text-[11px] text-emerald-600 font-medium">Physical cash drawer float</span>
          </div>
        </div>

        {/* Recent Payment Ledger Table */}
        <div className="bg-white/95 rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Recent Collections & Settlements ({payments.length})</h3>
            <button onClick={() => onNavigate('payments')} className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer">
              View All Settlements →
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {payments.slice(0, 6).map((p) => (
              <div key={p.id} className="p-3.5 hover:bg-gray-50 flex items-center justify-between gap-4 text-xs">
                <div>
                  <div className="font-bold text-gray-900">{p.guestName} • {formatCurrency(p.amount)}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    {p.reference} • Method: <span className="font-semibold text-gray-700">{p.method}</span> • {p.date ? p.date.slice(0, 10) : today}
                  </div>
                </div>
                <Badge variant="status" status="Confirmed" size="sm" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 5. REVENUE & DISTRIBUTION MANAGER DASHBOARD
  // -------------------------------------------------------------
  if (isRevenue) {
    const connectedChannels = channels.filter((c) => c.status === 'Connected').length;
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden bg-white/95 rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-600 to-indigo-600" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 font-sans">
                  Revenue & Channel Distribution Dashboard
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                  Yield Strategy Active
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                {todayFormatted} • ADR, RevPAR, channel settings and pricing overview.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() => onNavigate('channels')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <Radio className="w-4 h-4" />
                Aiosell Channel Manager
              </button>
              <button
                onClick={() => onNavigate('rates')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              >
                <Tag className="w-4 h-4 text-purple-600" />
                Yield Matrix
              </button>
              <button
                onClick={() => onNavigate('availability')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              >
                <Layers className="w-4 h-4 text-indigo-600" />
                Stop Sells
              </button>
            </div>
          </div>
        </div>

        {/* 4 Revenue Manager KPI Widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatWidget
            title="Average Daily Rate (ADR)"
            value={formatCurrency(adr)}
            subtitle="Realized rate per occupied room"
            trend={{ value: `${activeRoomNights.length} room nights`, isPositive: true, label: 'today' }}
            icon={<TrendingUp className="w-5 h-5 text-purple-600" />}
            accentColor="indigo"
            onClick={() => onNavigate('rates')}
          />
          <StatWidget
            title="RevPAR (Available Room)"
            value={formatCurrency(revpar)}
            subtitle="Yield efficiency index"
            trend={{ value: `${totalRooms} rooms`, isPositive: true, label: 'available' }}
            icon={<DollarSign className="w-5 h-5 text-indigo-600" />}
            accentColor="indigo"
            onClick={() => onNavigate('reports')}
          />
          <StatWidget
            title="Portfolio Occupancy"
            value={`${occupancyPercentage}%`}
            subtitle={`${occupiedRooms} of ${totalRooms} rooms occupied`}
            trend={{ value: `${readyRooms} sellable`, isPositive: true, label: 'vacant' }}
            icon={<BedDouble className="w-5 h-5 text-blue-600" />}
            accentColor="blue"
            onClick={() => onNavigate('rooms')}
          />
          <StatWidget
            title="Enabled PMS Channels"
            value={connectedChannels}
            subtitle="Connection status requires Aiosell verification"
            trend={{ value: `${channels.length} listed`, isPositive: true, label: 'channels' }}
            icon={<Radio className="w-5 h-5 text-emerald-600" />}
            accentColor="emerald"
            onClick={() => onNavigate('channels')}
          />
        </div>

        {/* Performance Yield Chart */}
        <PerformanceChart reservations={reservations} roomCount={totalRooms} />

        {/* Top OTA Feeds Quick Status */}
        <div className="bg-white/95 rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">PMS Channel Settings (Top Partners)</h3>
            <button onClick={() => onNavigate('channels')} className="text-xs text-purple-600 hover:text-purple-800 font-semibold cursor-pointer">
              All 26 Integrations →
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {channels.slice(0, 6).map((c) => (
              <div key={c.id} className="p-3.5 hover:bg-gray-50 flex items-center justify-between gap-4 text-xs">
                <div>
                  <div className="font-bold text-gray-900 flex items-center gap-2">
                    {c.channelName}
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-mono">{c.category || 'OTA'}</span>
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    Markup: {Math.round(((c.rateMultiplier || 1) - 1) * 100)}% • Ingested: {c.bookingsThisMonth || 0} bookings • Revenue: {formatCurrency(c.revenueThisMonth || 0)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> 2-Way Sync Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 6. EXECUTIVE / GENERAL MANAGER DASHBOARD (Owner, Group Admin, Property Manager)
  // -------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Action-Oriented Header Card */}
      <div className="relative overflow-hidden bg-white/95 rounded-2xl border border-slate-200/90 p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-400" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 font-sans">
                Good morning, {property ? property.name : 'SIGNINN Portfolio'}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Portfolio Operations
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              {todayFormatted} • General Manager command center: revenue, occupancy, front desk & operations.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => onNavigate('frontdesk')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            >
              <DoorOpen className="w-4 h-4 text-blue-600" />
              Front Desk
            </button>
            <button
              onClick={() => onNavigate('reservations')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-blue-400" />
              Tape Chart
            </button>
            <button
              onClick={() => onNavigate('reports')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            >
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              Analytics
            </button>
          </div>
        </div>
      </div>

      {/* Key Metric Cards with Trend Indicators & Sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatWidget
          title="Total Revenue (Today)"
          value={formatCurrency(realizedRevenue)}
            subtitle="Tonight's booked room rates"
          trend={{ value: formatCurrency(todayCollections), isPositive: true, label: 'collected today' }}
          icon={<DollarSign className="w-5 h-5 text-indigo-600" />}
          accentColor="indigo"
          sparkline={pastSevenDays.map((day) => day.revenue)}
          onClick={() => onNavigate('reports')}
        />
        <StatWidget
          title="Occupancy Rate"
          value={`${occupancyPercentage}%`}
          subtitle={`${occupiedRooms} of ${totalRooms} rooms occupied`}
          trend={{ value: `${occupiedRooms} occupied`, isPositive: true, label: 'today' }}
          icon={<BedDouble className="w-5 h-5 text-blue-600" />}
          accentColor="blue"
          sparkline={pastSevenDays.map((day) => day.occupancy)}
          onClick={() => onNavigate('rooms')}
        />
        <StatWidget
          title="Active In-House Guests"
          value={totalGuestsCount}
          subtitle={`${inHouseReservations.length} active registered folios`}
          trend={{ value: `${inHouseReservations.length} stays`, isPositive: true, label: 'in house' }}
          icon={<Users className="w-5 h-5 text-emerald-600" />}
          accentColor="emerald"
          sparkline={pastSevenDays.map((day) => day.guests)}
          onClick={() => onNavigate('guests')}
        />
        <StatWidget
          title="Pending Tasks"
          value={pendingTasksCount}
          subtitle="Front desk, housekeeping & maintenance"
          trend={{ value: `${dirtyRooms} dirty, ${maintenanceRooms} Mnt`, isPositive: pendingTasksCount <= 3, label: 'pending' }}
          icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
          accentColor="amber"
          onClick={() => onNavigate('frontdesk')}
        />
      </div>

      {/* Central Data Visualization Area */}
      <PerformanceChart reservations={reservations} roomCount={totalRooms} />

      {/* Secondary Operational Quick-Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <StatCard
          title="Arrivals Today"
          value={arrivalsToday.length}
          subtitle={`${arrivalsToday.length} check-ins scheduled`}
          icon={<DoorOpen className="w-4 h-4 text-blue-500" />}
          onClick={() => onNavigate('frontdesk')}
        />
        <StatCard
          title="Departures Today"
          value={departuresToday.length}
          subtitle={`${departuresToday.length} check-outs scheduled`}
          icon={<LogOut className="w-4 h-4 text-orange-500" />}
          onClick={() => onNavigate('frontdesk')}
        />
        <StatCard
          title="Ready Rooms"
          value={readyRooms}
          subtitle="Vacant, clean & inspected"
          variant="success"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          onClick={() => onNavigate('rooms')}
        />
        <StatCard
          title="Pending Folio Balances"
          value={formatCurrency(pendingPayments)}
          subtitle="Outstanding balances"
          icon={<CreditCard className="w-4 h-4 text-amber-500" />}
          onClick={() => onNavigate('folios')}
        />
      </div>

      {/* Action Center (High-priority triage items) */}
      <div className="bg-white/95 rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Operational Action Center
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">{pendingTasksCount} tasks requiring team resolution</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Triage card 1: Dirty Rooms / Housekeeping */}
          <div
            onClick={() => onNavigate('housekeeping')}
            className="p-4 rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/60 to-white hover:bg-amber-50/80 cursor-pointer transition-all hover:shadow-xs group flex items-start gap-3"
          >
            <div className="p-2.5 rounded-xl bg-amber-100/80 text-amber-800 shrink-0 shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">
                  {dirtyRooms > 0 ? `${dirtyRooms} Rooms Waiting for Housekeeping` : 'Housekeeping Complete'}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-snug">
                {dirtyRooms > 0
                  ? `Rooms ${rooms.filter((r) => r.housekeepingStatus === 'Dirty').slice(0, 3).map((r) => r.roomNumber).join(', ')} require turnover before incoming check-ins.`
                  : 'All guest rooms currently clean and inspected.'}
              </p>
            </div>
          </div>

          {/* Triage card 2: Unassigned arrival */}
          <div
            onClick={() => onNavigate('frontdesk')}
            className="p-4 rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50/60 to-white hover:bg-blue-50/80 cursor-pointer transition-all hover:shadow-xs group flex items-start gap-3"
          >
            <div className="p-2.5 rounded-xl bg-blue-100/80 text-blue-800 shrink-0 shadow-2xs">
              <BedDouble className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">
                  {unassignedArrivals.length > 0 ? `${unassignedArrivals.length} Arrival(s) Awaiting Room Allocation` : 'All Arrivals Assigned'}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-snug">
                {unassignedArrivals.length > 0
                  ? `${unassignedArrivals[0].refCode} (${unassignedArrivals[0].guest.firstName} ${unassignedArrivals[0].guest.lastName}) awaiting ${unassignedArrivals[0].roomTypeName} allocation.`
                  : 'All expected guest arrivals have dedicated room keys prepared.'}
              </p>
            </div>
          </div>

          {/* Triage card 3: OTA Channel Manager */}
          <div
            onClick={() => onNavigate('channels')}
            className="p-4 rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/60 to-white hover:bg-emerald-50/80 cursor-pointer transition-all hover:shadow-xs group flex items-start gap-3"
          >
            <div className="p-2.5 rounded-xl bg-emerald-100/80 text-emerald-800 shrink-0 shadow-2xs">
              <Radio className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Check Aiosell Channel Mapping</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-snug">
                Verify the Aiosell property mapping before claiming live rate or inventory distribution.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Operational Two-Column Grid: Arrivals & Departures */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Arrivals */}
        <div className="bg-white/95 rounded-2xl border border-slate-200/90 shadow-[0_1px_3px_rgba(15,23,42,0.03)] overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <DoorOpen className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Today's Arrivals ({arrivalsToday.length})</h3>
            </div>
            <button
              onClick={() => onNavigate('frontdesk')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
            >
              View in Front Desk <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-gray-100 overflow-x-auto flex-1">
            {arrivalsToday.map((res) => (
              <div
                key={res.id}
                className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-gray-900">
                      {res.guest.firstName} {res.guest.lastName}
                    </span>
                    <Badge variant="channel" channel={res.bookingSource} size="sm" />
                    {res.guest.vipStatus && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        VIP
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-3">
                    <span>{res.refCode}</span>
                    <span>•</span>
                    <span className="font-medium text-gray-700">{res.roomTypeName}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-gray-600">
                      <Clock className="w-3 h-3" /> ETA {res.eta || '14:00'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div className="text-xs font-semibold text-gray-900">
                      Room {res.roomNumber || 'Unassigned'}
                    </div>
                    <div className="text-[10px]">
                      {res.balanceAmount > 0 ? (
                        <span className="text-amber-600 font-medium">
                          Due {formatCurrency(res.balanceAmount)}
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-medium">Paid in Full</span>
                      )}
                    </div>
                  </div>

                  <Button
                    size="xs"
                    variant={res.status === 'Checked In' ? 'outline' : 'secondary'}
                    onClick={() => {
                      if (res.status === 'Checked In') {
                        onOpenReservationDetail(res.id);
                      } else {
                        onOpenCheckIn(res.id);
                      }
                    }}
                  >
                    {res.status === 'Checked In' ? 'View' : 'Check-in'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Today's Departures */}
        <div className="bg-white/95 rounded-2xl border border-slate-200/90 shadow-[0_1px_3px_rgba(15,23,42,0.03)] overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center">
                <LogOut className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Today's Departures ({departuresToday.length})</h3>
            </div>
            <button
              onClick={() => onNavigate('frontdesk')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
            >
              View in Front Desk <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-gray-100 overflow-x-auto flex-1">
            {departuresToday.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500">All departures cleared today</div>
            ) : (
              departuresToday.map((res) => (
                <div
                  key={res.id}
                  className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-gray-900">
                        {res.guest.firstName} {res.guest.lastName}
                      </span>
                      <span className="text-xs text-gray-500">Room {res.roomNumber}</span>
                      {res.specialRequests?.includes('Late checkout') && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-purple-100 text-purple-800">
                          Late Checkout
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      Stayed {res.nights} nights • {res.refCode}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-bold text-gray-900">
                        {res.balanceAmount > 0 ? (
                          <span className="text-red-600">Due {formatCurrency(res.balanceAmount)}</span>
                        ) : (
                          <span className="text-emerald-600">Balance ₹0</span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-400">Folio open</div>
                    </div>

                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => onOpenCheckOut(res.id)}
                    >
                      Check-out
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Operational Breakdown Strip: Channel Share, Revenue Summary & Room Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Booking Channel Distribution */}
        <div className="bg-white/95 rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Channel Distribution</h4>
            <span className="text-[11px] text-slate-400 font-medium">PMS records</span>
          </div>

          <div className="space-y-3">
            {[
              { name: 'Direct Website', share: 38, revenue: '₹4,12,000', color: 'bg-emerald-500' },
              { name: 'Booking.com', share: 29, revenue: '₹3,18,000', color: 'bg-blue-600' },
              { name: 'GoMMT', share: 18, revenue: '₹1,95,000', color: 'bg-red-500' },
              { name: 'Agoda & Expedia', share: 10, revenue: '₹1,08,000', color: 'bg-sky-500' },
              { name: 'Walk-in / Direct', share: 5, revenue: '₹54,000', color: 'bg-purple-500' },
            ].map((c) => (
              <div key={c.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 font-medium">{c.name}</span>
                  <span className="text-slate-900 font-bold">{c.share}% ({c.revenue})</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${c.color} rounded-full transition-all duration-300`} style={{ width: `${c.share}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Room Status Breakdown */}
        <div className="bg-white/95 rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Housekeeping & Rooms</h4>
            <button
              onClick={() => onNavigate('rooms')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
            >
              Room Rack →
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/70">
              <span className="text-emerald-800 font-medium block text-xs">Ready to Sell</span>
              <span className="text-2xl font-extrabold text-emerald-950 mt-1 block">{readyRooms}</span>
            </div>
            <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200/70">
              <span className="text-rose-800 font-medium block text-xs">Dirty / Turnover</span>
              <span className="text-2xl font-extrabold text-rose-950 mt-1 block">{dirtyRooms}</span>
            </div>
            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/70">
              <span className="text-blue-800 font-medium block text-xs">Occupied In-house</span>
              <span className="text-2xl font-extrabold text-blue-950 mt-1 block">{occupiedRooms}</span>
            </div>
            <div className="p-3 rounded-xl bg-orange-50/70 border border-orange-200/70">
              <span className="text-orange-800 font-medium block text-xs">Maintenance / Out</span>
              <span className="text-2xl font-extrabold text-orange-950 mt-1 block">{maintenanceRooms}</span>
            </div>
          </div>

        </div>

        {/* Financial Highlights */}
        <div className="bg-white/95 rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Financial Summary</h4>
              <span className="text-xs text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md">
                <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" /> Yield Health
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Today's Realized Revenue:</span>
                <span className="text-sm font-extrabold text-slate-900">{formatCurrency(realizedRevenue)}</span>
              </div>
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Average Daily Rate (ADR):</span>
                <span className="font-bold text-slate-900">{formatCurrency(adr)}</span>
              </div>
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">RevPAR (Per Available Room):</span>
                <span className="font-bold text-slate-900">{formatCurrency(revpar)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Collections Pending:</span>
                <span className="font-bold text-amber-600">{formatCurrency(pendingPayments)}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center text-xs font-semibold"
              onClick={() => onNavigate('reports')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Full Revenue Analytics
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
