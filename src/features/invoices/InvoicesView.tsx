import React, { useState } from 'react';
import {
  FileText,
  Printer,
  Search,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { Invoice } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { useAppStore } from '../../stores/useAppStore';

export interface InvoicesViewProps {
  invoices: Invoice[];
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({ invoices }) => {
  const { showToast } = useToast();
  const property = useAppStore((state) => state.currentProperty);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const filteredInvoices = invoices.filter((inv) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.guestName.toLowerCase().includes(q) ||
      inv.reservationRef.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl font-bold tracking-tight text-gray-950 font-sans">
              Invoices & GST Tax Billing
            </h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Compliant Indian GST Tax Invoices (SAC 996311) with CGST/SGST split and print-ready formats.
          </p>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search invoice #, guest, ref..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-xs h-8 pl-8 pr-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 placeholder:text-gray-400 outline-none focus:border-blue-600 w-64"
          />
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px]">
              <th className="p-3">Invoice #</th>
              <th className="p-3">Issue Date</th>
              <th className="p-3">Guest & Room</th>
              <th className="p-3">Reservation Ref</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Tax (GST)</th>
              <th className="p-3 text-right">Invoice Total</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredInvoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-gray-50">
                <td className="p-3 font-mono font-bold text-gray-950">{inv.invoiceNumber}</td>
                <td className="p-3 font-mono text-gray-600">{inv.date}</td>
                <td className="p-3 font-medium text-gray-900">
                  {inv.guestName}
                  <span className="block text-[10px] text-gray-400">Room {inv.roomNumber}</span>
                </td>
                <td className="p-3 font-mono text-blue-600">{inv.reservationRef}</td>
                <td className="p-3">
                  <Badge variant="status" status={inv.status} size="sm" />
                </td>
                <td className="p-3 text-right text-gray-600">
                  {formatCurrency(inv.cgst + inv.sgst)}
                </td>
                <td className="p-3 text-right font-bold text-gray-950">
                  {formatCurrency(inv.totalAmount)}
                </td>
                <td className="p-3 text-right">
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => setSelectedInvoice(inv)}
                    leftIcon={<Printer className="w-3 h-3" />}
                  >
                    View Invoice
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tax Invoice Full Print Preview Modal */}
      {selectedInvoice && (
        <Modal
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          maxWidth="2xl"
          title="Tax Invoice Preview"
          description={`Tax Invoice No: ${selectedInvoice.invoiceNumber} • SAC Code: 996311`}
          footer={
            <div className="flex items-center justify-between w-full">
              <Button variant="ghost" size="sm" onClick={() => setSelectedInvoice(null)}>
                Close
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => window.print()}
                  leftIcon={<Printer className="w-3.5 h-3.5" />}
                >
                  Print Legal Copy
                </Button>
              </div>
            </div>
          }
        >
          <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-xs text-xs space-y-5">
            {/* Header / Hotel Details */}
            <div className="flex items-start justify-between border-b pb-4">
              <div>
                <h2 className="text-lg font-extrabold text-gray-950 tracking-tight">{property?.name || 'Selected property'}</h2>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {property?.address || 'Property address not configured'}
                </p>
                <p className="text-[11px] text-gray-500">
                  GSTIN: <strong className="font-mono text-gray-800">32AABCS1429B1Z8</strong> • PAN: AABCS1429B
                </p>
                <p className="text-[11px] text-gray-500">Phone: {property?.phone || 'Not configured'} • {property?.email || 'Email not configured'}</p>
              </div>

              <div className="text-right">
                <span className="px-2.5 py-1 rounded bg-blue-50 text-blue-800 font-bold text-[11px] uppercase tracking-wider">
                  Tax Invoice
                </span>
                <div className="mt-2 text-xs">
                  <div className="font-mono font-bold text-gray-900">{selectedInvoice.invoiceNumber}</div>
                  <div className="text-gray-500">Date: {selectedInvoice.date}</div>
                  <div className="text-blue-600 font-mono text-[11px]">Ref: {selectedInvoice.reservationRef}</div>
                </div>
              </div>
            </div>

            {/* Billed To Guest */}
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3.5 rounded-lg border border-gray-100">
              <div>
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Billed To (Guest)
                </span>
                <strong className="text-gray-900 block mt-0.5">{selectedInvoice.guestName}</strong>
                <span className="text-[11px] text-gray-500">Room: {selectedInvoice.roomNumber}</span>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Place of Supply
                </span>
                <strong className="text-gray-900 block mt-0.5">32 - Kerala (State Code 32)</strong>
                <span className="text-[11px] text-gray-500">Reverse Charge: No</span>
              </div>
            </div>

            {/* Line Items Table */}
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-300 text-gray-500 text-[10px] uppercase">
                  <th className="py-2">Description of Supply</th>
                  <th className="py-2">HSN/SAC</th>
                  <th className="py-2 text-right">Taxable Value</th>
                  <th className="py-2 text-right">CGST (9%)</th>
                  <th className="py-2 text-right">SGST (9%)</th>
                  <th className="py-2 text-right">Total (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-2.5 font-medium text-gray-900">
                    Hotel Accommodation Services (Stay)
                  </td>
                  <td className="py-2.5 font-mono text-gray-500">996311</td>
                  <td className="py-2.5 text-right font-mono">
                    {formatCurrency(selectedInvoice.taxableAmount)}
                  </td>
                  <td className="py-2.5 text-right font-mono">
                    {formatCurrency(selectedInvoice.cgst)}
                  </td>
                  <td className="py-2.5 text-right font-mono">
                    {formatCurrency(selectedInvoice.sgst)}
                  </td>
                  <td className="py-2.5 text-right font-bold text-gray-950 font-mono">
                    {formatCurrency(selectedInvoice.totalAmount)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Totals & Signature */}
            <div className="pt-3 border-t border-gray-200 flex items-start justify-between">
              <div className="text-[11px] text-gray-500 max-w-xs space-y-1">
                <p>Terms & Conditions: Electronic system generated tax invoice under Indian GST law.</p>
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold mt-2">
                  <CheckCircle2 className="w-4 h-4" /> Invoice Status: Paid in Full
                </div>
              </div>

              <div className="text-right space-y-1">
                <div className="flex justify-between gap-8 text-gray-600">
                  <span>Taxable Subtotal:</span>
                  <span className="font-mono">{formatCurrency(selectedInvoice.taxableAmount)}</span>
                </div>
                <div className="flex justify-between gap-8 text-gray-600">
                  <span>Central GST (9%):</span>
                  <span className="font-mono">{formatCurrency(selectedInvoice.cgst)}</span>
                </div>
                <div className="flex justify-between gap-8 text-gray-600">
                  <span>State GST (9%):</span>
                  <span className="font-mono">{formatCurrency(selectedInvoice.sgst)}</span>
                </div>
                <div className="flex justify-between gap-8 text-sm font-extrabold text-gray-950 border-t pt-1.5">
                  <span>Total Payable:</span>
                  <span className="font-mono">{formatCurrency(selectedInvoice.totalAmount)}</span>
                </div>

                <div className="pt-8 text-center">
                  <div className="border-t border-gray-300 pt-1 text-[10px] text-gray-400">
                    Authorized Signatory for {property?.name || 'Selected property'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
