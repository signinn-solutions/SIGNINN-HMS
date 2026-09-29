import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { Reservation, Folio } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useToast } from '../../components/ui/Toast';
import { useAppStore } from '../../stores/useAppStore';
import {
  LogOut,
  CreditCard,
  FileText,
  Key,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Printer,
} from 'lucide-react';

export interface CheckOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: Reservation | null;
  folio?: Folio;
  onCompleteCheckOut: (resId: string, finalPaymentAmount: number, paymentMethod: string) => Promise<void>;
}

export const CheckOutModal: React.FC<CheckOutModalProps> = ({
  isOpen,
  onClose,
  reservation,
  folio,
  onCompleteCheckOut,
}) => {
  const { showToast } = useToast();
  const property = useAppStore((state) => state.currentProperty);
  const [keysReturned, setKeysReturned] = useState(true);
  const [minibarCleared, setMinibarCleared] = useState(true);
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);

  React.useEffect(() => {
    if (reservation) {
      setSettleAmount(reservation.balanceAmount);
    }
  }, [reservation]);

  if (!reservation) return null;

  const handleFinish = async () => {
    if (settleAmount < reservation.balanceAmount && reservation.balanceAmount > 0) {
      showToast({
        title: 'Settlement Required',
        description: 'Full folio balance must be collected before completing guest departure.',
        type: 'error',
      });
      return;
    }

    if (!keysReturned) {
      showToast({
        title: 'Key Return Warning',
        description: 'Please verify that room keys have been surrendered to front desk.',
        type: 'warning',
      });
      return;
    }

    setIsProcessing(true);
    try {
      await onCompleteCheckOut(reservation.id, settleAmount, paymentMethod);
      showToast({
        title: 'Guest Successfully Checked Out',
        description: `Room ${reservation.roomNumber} marked for housekeeping turnover. Tax Invoice generated.`,
        type: 'success',
      });
      onClose();
    } catch (e) {
      showToast({
        title: 'Check-out Failed',
        description: 'Unable to process checkout.',
        type: 'error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="xl"
      title="Guest Departure & Settlement"
      description={`Room ${reservation.roomNumber} • ${reservation.guest.firstName} ${reservation.guest.lastName} • Ref ${reservation.refCode}`}
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInvoicePreview(!showInvoicePreview)}
            leftIcon={<Printer className="w-3.5 h-3.5" />}
          >
            {showInvoicePreview ? 'Hide Invoice Preview' : 'Preview GST Invoice'}
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleFinish}
              isLoading={isProcessing}
              leftIcon={<LogOut className="w-3.5 h-3.5" />}
            >
              Settle & Check-out
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Folio Balance Summary */}
        <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/70 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Folio Settlement
            </span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded ${
                reservation.balanceAmount > 0
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {reservation.balanceAmount > 0 ? 'Pending Settlement' : 'Zero Balance Cleared'}
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-gray-600">
              <span>Total Stay Charges:</span>
              <span className="font-semibold text-gray-900">{formatCurrency(reservation.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Payments Already Credited:</span>
              <span className="font-semibold text-emerald-700">
                - {formatCurrency(reservation.paidAmount)}
              </span>
            </div>
            <div className="pt-2 border-t border-gray-200 flex justify-between text-sm font-bold text-gray-950">
              <span>Amount Due to Settle:</span>
              <span className={reservation.balanceAmount > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                {formatCurrency(reservation.balanceAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Collection if Balance > 0 */}
        {reservation.balanceAmount > 0 && (
          <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
              <CreditCard className="w-4 h-4 text-amber-700" />
              Collect Final Folio Balance
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                type="number"
                label="Amount to Collect (₹)"
                value={settleAmount}
                onChange={(e) => setSettleAmount(parseFloat(e.target.value) || 0)}
              />
              <Select
                label="Payment Instrument"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                options={[
                  { value: 'UPI', label: 'UPI / GPay / QR' },
                  { value: 'Credit Card', label: 'Credit Card (EDC POS)' },
                  { value: 'Cash', label: 'Cash at Desk' },
                  { value: 'Corporate', label: 'Bill to Company (BTC)' },
                ]}
              />
            </div>
          </div>
        )}

        {/* Departure Checklist */}
        <div className="space-y-2 p-3 bg-white border border-gray-200 rounded-xl">
          <span className="text-xs font-semibold text-gray-700 block">Departure Verifications</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center gap-2.5 text-xs text-gray-800 cursor-pointer">
              <input
                type="checkbox"
                checked={keysReturned}
                onChange={(e) => setKeysReturned(e.target.checked)}
                className="rounded border-gray-300 text-blue-600"
              />
              <Key className="w-3.5 h-3.5 text-gray-500" />
              <span>Room Keycard(s) Returned</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs text-gray-800 cursor-pointer">
              <input
                type="checkbox"
                checked={minibarCleared}
                onChange={(e) => setMinibarCleared(e.target.checked)}
                className="rounded border-gray-300 text-blue-600"
              />
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Minibar & Laundry Audited</span>
            </label>
          </div>
        </div>

        {/* Simulated GST Tax Invoice Preview */}
        {showInvoicePreview && (
          <div className="p-4 bg-white border border-gray-300 rounded-xl shadow-xs font-mono text-[11px] text-gray-800 space-y-2">
            <div className="border-b pb-2 flex justify-between">
              <div>
                <strong>{property?.name || 'SELECTED PROPERTY'} - TAX INVOICE</strong>
                <div className="text-[10px] text-gray-500">GSTIN: 32AABCS1429B1Z8</div>
              </div>
              <div className="text-right">
                <div>INV-2026-{reservation.refCode.replace('RES-', '')}</div>
                <div className="text-[10px] text-gray-500">Date: {new Date().toISOString().split('T')[0]}</div>
              </div>
            </div>

            <div className="py-1">
              <div>Guest: {reservation.guest.firstName} {reservation.guest.lastName}</div>
              <div>Room: {reservation.roomNumber} ({reservation.roomTypeName})</div>
            </div>

            <div className="border-t border-b py-1.5 space-y-1">
              <div className="flex justify-between">
                <span>Room Stay ({reservation.nights} nights @ rate plan):</span>
                <span>{formatCurrency(Math.round(reservation.totalAmount / 1.18))}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>CGST (9%):</span>
                <span>{formatCurrency(Math.round((reservation.totalAmount / 1.18) * 0.09))}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>SGST (9%):</span>
                <span>{formatCurrency(Math.round((reservation.totalAmount / 1.18) * 0.09))}</span>
              </div>
              <div className="flex justify-between font-bold text-black border-t pt-1">
                <span>Grand Total:</span>
                <span>{formatCurrency(reservation.totalAmount)}</span>
              </div>
            </div>
            <div className="text-center text-[10px] text-gray-500 pt-1">
              Thank you for staying with {property?.name || 'us'}! Powered by SIGNINN HMS
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
