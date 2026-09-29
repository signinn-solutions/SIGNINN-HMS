import React, { useState } from 'react';
import {
  CreditCard,
  Plus,
  ArrowDownLeft,
  Search,
  Filter,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  RotateCcw,
} from 'lucide-react';
import { PaymentTransaction } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { useAppStore } from '../../stores/useAppStore';

export interface PaymentsViewProps {
  payments: PaymentTransaction[];
  onRecordPayment: (payment: Omit<PaymentTransaction, 'id' | 'date' | 'status'>) => Promise<PaymentTransaction>;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({ payments, onRecordPayment }) => {
  const { showToast } = useToast();
  const property = useAppStore((state) => state.currentProperty);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('all');
  const [isCashDrawerOpen, setIsCashDrawerOpen] = useState(false);

  const filteredPayments = payments.filter((p) => {
    if (selectedMethod !== 'all' && p.method !== selectedMethod) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.guestName.toLowerCase().includes(q) ||
      p.reservationRef.toLowerCase().includes(q) ||
      p.reference.toLowerCase().includes(q) ||
      (p.roomNumber && p.roomNumber.includes(q))
    );
  });

  // Calculate totals by method
  const totalAmount = payments.reduce((acc, p) => acc + p.amount, 0);
  const upiTotal = payments.filter((p) => p.method === 'UPI').reduce((acc, p) => acc + p.amount, 0);
  const cardTotal = payments.filter((p) => p.method === 'Credit Card').reduce((acc, p) => acc + p.amount, 0);
  const cashTotal = payments.filter((p) => p.method === 'Cash').reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold tracking-tight text-gray-950 font-sans">
              Payments & Collections Ledger
            </h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Reconciliation of all digital UPI transactions, POS cards, cash drawer, and B2B wire transfers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCashDrawerOpen(true)}
            leftIcon={<DollarSign className="w-3.5 h-3.5 text-emerald-600" />}
          >
            Cash Drawer Float
          </Button>
        </div>
      </div>

      {/* Payment Method Breakdown Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
            Total Collections
          </span>
          <span className="text-xl font-bold text-gray-950 mt-1 block">{formatCurrency(totalAmount)}</span>
          <span className="text-[10px] text-gray-400">{payments.length} transactions</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider block">
            UPI / Instant QR
          </span>
          <span className="text-xl font-bold text-blue-900 mt-1 block">{formatCurrency(upiTotal)}</span>
          <span className="text-[10px] text-blue-600 font-medium">62% of volume</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider block">
            Credit / Debit Card
          </span>
          <span className="text-xl font-bold text-purple-900 mt-1 block">{formatCurrency(cardTotal)}</span>
          <span className="text-[10px] text-purple-600 font-medium">EDC Swipes</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider block">
            Front Desk Cash
          </span>
          <span className="text-xl font-bold text-emerald-900 mt-1 block">{formatCurrency(cashTotal)}</span>
          <span className="text-[10px] text-emerald-600 font-medium">In safe drawer</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-700">Filter Instrument:</span>
          <select
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
            className="h-8 px-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 outline-none"
          >
            <option value="all">All Methods</option>
            <option value="UPI">UPI / QR</option>
            <option value="Credit Card">Credit Card</option>
            <option value="Cash">Cash</option>
            <option value="Bank Transfer">Bank Transfer</option>
          </select>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search guest, ref, TXN code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-xs h-8 pl-8 pr-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 placeholder:text-gray-400 outline-none focus:border-blue-600 w-56 sm:w-72"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px]">
              <th className="p-3">Date / Timestamp</th>
              <th className="p-3">Guest & Room</th>
              <th className="p-3">Reservation Ref</th>
              <th className="p-3">Method</th>
              <th className="p-3">Auth / Ref Code</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Amount Credited</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredPayments.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="p-3 font-mono text-gray-600">{new Date(p.date).toLocaleString()}</td>
                <td className="p-3">
                  <span className="font-semibold text-gray-900 block">{p.guestName}</span>
                  <span className="text-[10px] text-gray-500">Room {p.roomNumber || '—'}</span>
                </td>
                <td className="p-3 font-mono text-blue-600">{p.reservationRef}</td>
                <td className="p-3">
                  <span className="font-medium text-gray-800">{p.method}</span>
                </td>
                <td className="p-3 font-mono text-[11px] text-gray-500">{p.reference}</td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                    {p.status}
                  </span>
                </td>
                <td className="p-3 text-right font-bold text-gray-950">
                  {formatCurrency(p.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cash Drawer Float Reconciliation Dialog */}
      <Modal
        isOpen={isCashDrawerOpen}
        onClose={() => setIsCashDrawerOpen(false)}
        maxWidth="md"
        title="Daily Shift Cash Drawer Reconciliation"
        description={`Shift audit for physical counter float at ${property?.name || 'the selected property'}`}
        footer={
          <Button variant="primary" size="sm" onClick={() => setIsCashDrawerOpen(false)}>
            Close Shift Audit
          </Button>
        }
      >
        <div className="space-y-3 text-xs">
          <div className="flex justify-between py-1.5 border-b border-gray-100">
            <span className="text-gray-600">Opening Cash Float:</span>
            <span className="font-bold text-gray-900">₹5,000.00</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-gray-100">
            <span className="text-gray-600">Cash Collected Today:</span>
            <span className="font-bold text-emerald-700">+{formatCurrency(cashTotal)}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-gray-100">
            <span className="text-gray-600">Petty Cash Paid Out:</span>
            <span className="font-bold text-rose-700">- ₹450.00 (Kitchen milk)</span>
          </div>
          <div className="flex justify-between py-2 border-t border-gray-200 text-sm font-bold">
            <span>Expected Cash in Counter:</span>
            <span className="text-blue-700">{formatCurrency(5000 + cashTotal - 450)}</span>
          </div>
        </div>
      </Modal>
    </div>
  );
};
