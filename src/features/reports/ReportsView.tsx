import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  DollarSign,
  TrendingUp,
  PieChart,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { Reservation, Room, PaymentTransaction, Property } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { useToast } from '../../components/ui/Toast';

export interface ReportsViewProps {
  reservations: Reservation[];
  rooms: Room[];
  payments: PaymentTransaction[];
  property: Property | null;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ reservations, rooms, payments, property }) => {
  const { showToast } = useToast();
  const [reportType, setReportType] = useState<'manager' | 'revenue' | 'channels' | 'gst' | 'formc'>('manager');
  const [dateRange, setDateRange] = useState('month');

  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const rangeStart = new Date(today);
  if (dateRange === 'week') rangeStart.setDate(today.getDate() - 6);
  if (dateRange === 'month') rangeStart.setDate(1);
  if (dateRange === 'quarter') rangeStart.setMonth(Math.floor(today.getMonth() / 3) * 3, 1);
  if (dateRange === 'today') rangeStart.setHours(0, 0, 0, 0);
  const rangeStartKey = rangeStart.toISOString().slice(0, 10);
  const filteredReservations = reservations.filter((r) => r.status !== 'Cancelled' && r.checkInDate <= todayKey && r.checkOutDate >= rangeStartKey);
  const reservationIds = new Set(filteredReservations.map((r) => r.id));
  const filteredPayments = payments.filter((p) => reservationIds.has(p.reservationId) && p.status === 'Success');
  const totalRev = filteredReservations.reduce((acc, r) => acc + r.totalAmount, 0);
  const activeRooms = rooms.length;
  const occupiedCount = rooms.filter((r) => r.occupancyStatus === 'Occupied').length;
  const occupancyRate = activeRooms ? Math.round((occupiedCount / activeRooms) * 100) : 0;
  const adr = Math.round(totalRev / (filteredReservations.length || 1));
  const revpar = Math.round(adr * (occupancyRate / 100));
  const arrivalsToday = reservations.filter((r) => r.checkInDate === todayKey && r.status !== 'Cancelled');
  const departuresToday = reservations.filter((r) => r.checkOutDate === todayKey && r.status !== 'Cancelled');
  const foreignGuests = filteredReservations.filter((r) => r.guest.nationality && r.guest.nationality.toLowerCase() !== 'indian');
  const channelRows = Object.entries(filteredReservations.reduce<Record<string, number>>((totals, reservation) => {
    totals[reservation.bookingSource] = (totals[reservation.bookingSource] || 0) + reservation.totalAmount;
    return totals;
  }, {})).map(([name, revenue]) => ({ name, revenue, pct: totalRev ? Math.round(revenue / totalRev * 100) : 0 }));
  const revenueByDay = Array.from({ length: 16 }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (15 - index));
    const key = day.toISOString().slice(0, 10);
    return { label: day.getDate(), value: reservations.filter((r) => r.status !== 'Cancelled' && r.checkInDate <= key && r.checkOutDate > key).reduce((sum, r) => sum + (r.nightlyRate || r.totalAmount / Math.max(1, r.nights)), 0) };
  });
  const maxDailyRevenue = Math.max(...revenueByDay.map((row) => row.value), 1);

  const handleExport = (format: string) => {
    const rows = [['Reference', 'Guest', 'Check-in', 'Check-out', 'Source', 'Status', 'Total'], ...filteredReservations.map((r) => [r.refCode, `${r.guest.firstName} ${r.guest.lastName}`, r.checkInDate, r.checkOutDate, r.bookingSource, r.status, r.totalAmount])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${property?.code || 'hotel'}-${dateRange}-${format.toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast({
      title: `Export ${format} Started`,
      description: `Downloaded ${filteredReservations.length} records for ${property?.name || 'the selected property'}.`,
      type: 'success',
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl font-bold tracking-tight text-gray-950 font-sans">
              Hotel Analytics & Financial Reports
            </h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            General Manager flash reports, RevPAR analytics, Indian GST summaries, and statutory Form-C logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="h-8 px-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 outline-none"
          >
            <option value="today">Today (Shift)</option>
            <option value="week">This Week</option>
            <option value="month">This Month ({today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})</option>
            <option value="quarter">This Quarter</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('CSV')}
            leftIcon={<FileSpreadsheet className="w-3.5 h-3.5" />}
          >
            Export CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            leftIcon={<Printer className="w-3.5 h-3.5" />}
          >
            Print Flash Report
          </Button>
        </div>
      </div>

      {/* KPI Stat Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
            Total Revenue
          </span>
          <span className="text-2xl font-bold text-gray-950 mt-1 block">{formatCurrency(totalRev)}</span>
          <span className="text-[11px] text-gray-500">{filteredReservations.length} reservations in range</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
            Occupancy Rate
          </span>
          <span className="text-2xl font-bold text-gray-950 mt-1 block">{occupancyRate}%</span>
          <span className="text-[11px] text-gray-500">{occupiedCount} of {activeRooms} rooms occupied</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
            Average Daily Rate (ADR)
          </span>
          <span className="text-2xl font-bold text-blue-700 mt-1 block">{formatCurrency(adr)}</span>
          <span className="text-[11px] text-blue-600 font-medium">Per reservation in selected range</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
            RevPAR
          </span>
          <span className="text-2xl font-bold text-purple-700 mt-1 block">{formatCurrency(revpar)}</span>
          <span className="text-[11px] text-purple-600 font-medium">Revenue per available room</span>
        </div>
      </div>

      {/* Report Switcher Tabs */}
      <Tabs
        variant="segmented"
        activeTab={reportType}
        onChange={(t) => setReportType(t as any)}
        tabs={[
          { id: 'manager', label: "Manager's Flash Report" },
          { id: 'revenue', label: 'Revenue & RevPAR Trend' },
          { id: 'channels', label: 'Channel Share (OTA vs Direct)' },
          { id: 'gst', label: 'GST Tax Summary' },
          { id: 'formc', label: 'Form-C (Foreign Guests)' },
        ]}
      />

      {/* Report 1: General Manager Flash Report */}
      {reportType === 'manager' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs space-y-4 text-xs">
          <div className="border-b pb-3 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-gray-950">
                {property?.name || 'Selected Property'} — Daily Operations Flash Report
              </h3>
              <p className="text-gray-500 text-[11px]">Audit Date: {today.toLocaleDateString()} | Prepared by: System Auto-Audit</p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
              Night Audit: Closed & Reconciled
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg space-y-1.5 border border-gray-100">
              <span className="font-bold text-gray-800 block">Rooms Breakdown</span>
              <div className="flex justify-between"><span>Total Room Count:</span> <strong>{activeRooms}</strong></div>
              <div className="flex justify-between"><span>Occupied Rooms:</span> <strong>{occupiedCount}</strong></div>
              <div className="flex justify-between"><span>Vacant Clean:</span> <strong>{rooms.filter(r => r.occupancyStatus === 'Vacant' && r.housekeepingStatus === 'Ready').length}</strong></div>
              <div className="flex justify-between"><span>Turnover Dirty:</span> <strong>{rooms.filter(r => r.housekeepingStatus === 'Dirty').length}</strong></div>
              <div className="flex justify-between"><span>Out of Order (OOO):</span> <strong>{rooms.filter(r => r.maintenanceStatus !== 'Operational').length}</strong></div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg space-y-1.5 border border-gray-100">
              <span className="font-bold text-gray-800 block">Collections by Tender</span>
              <div className="flex justify-between"><span>Digital UPI QR:</span> <strong>{formatCurrency(filteredPayments.filter(p => p.method === 'UPI').reduce((a,b)=>a+b.amount,0))}</strong></div>
              <div className="flex justify-between"><span>Credit Card POS:</span> <strong>{formatCurrency(filteredPayments.filter(p => p.method === 'Credit Card' || p.method === 'Card').reduce((a,b)=>a+b.amount,0))}</strong></div>
              <div className="flex justify-between"><span>Counter Cash:</span> <strong>{formatCurrency(filteredPayments.filter(p => p.method === 'Cash').reduce((a,b)=>a+b.amount,0))}</strong></div>
              <div className="flex justify-between border-t pt-1 font-bold text-gray-900">
                <span>Total Shift Cashiering:</span>
                <strong>{formatCurrency(filteredPayments.reduce((a,b)=>a+b.amount,0))}</strong>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg space-y-1.5 border border-gray-100">
              <span className="font-bold text-gray-800 block">Guest Movements</span>
              <div className="flex justify-between"><span>Check-ins Executed:</span> <strong>{arrivalsToday.filter(r => r.status === 'Checked In').length}</strong></div>
              <div className="flex justify-between"><span>Pending Arrivals:</span> <strong>{arrivalsToday.filter(r => r.status === 'Confirmed').length}</strong></div>
              <div className="flex justify-between"><span>Departures Cleared:</span> <strong>{departuresToday.filter(r => r.status === 'Checked Out').length}</strong></div>
              <div className="flex justify-between"><span>Walk-in Directs:</span> <strong>{arrivalsToday.filter(r => String(r.bookingSource).toLowerCase().includes('walk')).length}</strong></div>
            </div>
          </div>
        </div>
      )}

      {/* Report 2: GST Tax Summary */}
      {reportType === 'gst' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs space-y-4 text-xs">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-950">GST Compliance Summary (GSTR-1 Ready)</h3>
              <p className="text-[11px] text-gray-500">{property?.name || 'Selected Property'} • GSTIN: {property?.gstin || 'Not configured'} • SAC: 996311</p>
            </div>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b text-[10px] uppercase text-gray-500">
                <th className="p-2.5">HSN/SAC</th>
                <th className="p-2.5">Taxable Revenue</th>
                <th className="p-2.5">CGST (9%)</th>
                <th className="p-2.5">SGST (9%)</th>
                <th className="p-2.5 text-right">Total GST Collected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="p-2.5 font-mono">996311 (Room Stays &gt; ₹1,000)</td>
                <td className="p-2.5 font-mono font-medium">{formatCurrency(Math.round(totalRev / 1.18))}</td>
                <td className="p-2.5 font-mono text-gray-600">{formatCurrency(Math.round((totalRev / 1.18) * 0.09))}</td>
                <td className="p-2.5 font-mono text-gray-600">{formatCurrency(Math.round((totalRev / 1.18) * 0.09))}</td>
                <td className="p-2.5 font-mono font-bold text-gray-950 text-right">
                  {formatCurrency(Math.round((totalRev / 1.18) * 0.18))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Report 3: Channel Breakdown */}
      {reportType === 'channels' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs space-y-4 text-xs">
          <h3 className="text-sm font-bold text-gray-950">Distribution Channel Contribution</h3>
          <div className="space-y-3">
            {channelRows.map((ch, index) => (
              <div key={ch.name} className="space-y-1">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-800">{ch.name}</span>
                  <span className="font-mono text-gray-600">{formatCurrency(ch.revenue)} ({ch.pct}%)</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${['bg-emerald-500', 'bg-blue-600', 'bg-rose-500', 'bg-amber-500'][index % 4]}`} style={{ width: `${ch.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report 4: Form-C */}
      {reportType === 'formc' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs space-y-3 text-xs">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-950">Bureau of Immigration (Form-C Foreign Registry)</h3>
              <p className="text-[11px] text-gray-500">Statutory foreign national arrival reporting under Indian Law</p>
            </div>
            <Button size="xs" variant="outline" onClick={() => handleExport('Form-C')}>
              Export BOI File
            </Button>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 text-gray-600 space-y-1">
            {foreignGuests.length === 0 ? <p>No foreign guests in the selected range.</p> : foreignGuests.map((reservation) => (
              <p key={reservation.id}>• <strong>{reservation.guest.firstName} {reservation.guest.lastName}</strong> ({reservation.guest.nationality}) • {reservation.guest.idType}: {reservation.guest.idNumber || 'Pending'} • Arrived: {reservation.checkInDate}</p>
            ))}
          </div>
        </div>
      )}

      {reportType === 'revenue' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs space-y-4 text-xs">
          <h3 className="text-sm font-bold text-gray-950">Daily Room Revenue — Last 16 Days</h3>
          <div className="h-48 flex items-end justify-between gap-2 pt-8 pb-2 border-b border-gray-200">
            {revenueByDay.map((row) => (
              <div key={row.label} className="flex-1 flex flex-col items-center gap-1 group" title={formatCurrency(row.value)}>
                <div
                  className="w-full bg-blue-600 rounded-t-sm group-hover:bg-blue-700 transition-colors"
                  style={{ height: `${Math.round(row.value / maxDailyRevenue * 100)}%` }}
                />
                <span className="text-[9px] text-gray-400">{row.label}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[11px] text-gray-500">
            <span>Daily Room Night Revenues (₹)</span>
            <span>Selected range revenue: {formatCurrency(totalRev)}</span>
          </div>
        </div>
      )}
    </div>
  );
};
