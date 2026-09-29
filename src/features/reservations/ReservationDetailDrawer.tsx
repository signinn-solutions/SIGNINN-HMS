import React, { useState } from 'react';
import { Drawer } from '../../components/ui/Drawer';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { formatCurrency } from '../../utils/formatters';
import { Reservation, Folio, Room } from '../../types';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  CreditCard,
  DoorOpen,
  LogOut,
  BedDouble,
  FileText,
  MessageSquare,
  Sparkles,
  History,
  CheckCircle2,
  AlertCircle,
  Plus,
  Send,
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { useAppStore } from '../../stores/useAppStore';

export interface ReservationDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: Reservation | null;
  folio?: Folio;
  availableRooms: Room[];
  onCheckIn: (resId: string) => void;
  onCheckOut: (resId: string) => void;
  onAssignRoom: (resId: string, roomId: string) => void;
  onAddPayment: (resId: string) => void;
  onOpenGuestProfile?: (guestId: string) => void;
}

export const ReservationDetailDrawer: React.FC<ReservationDetailDrawerProps> = ({
  isOpen,
  onClose,
  reservation,
  folio,
  availableRooms,
  onCheckIn,
  onCheckOut,
  onAssignRoom,
  onAddPayment,
  onOpenGuestProfile,
}) => {
  const { showToast } = useToast();
  const property = useAppStore((state) => state.currentProperty);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [newNote, setNewNote] = useState('');
  const [notesList, setNotesList] = useState<string[]>([]);

  if (!reservation) return null;

  const handleRoomChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const roomId = e.target.value;
    if (roomId) {
      onAssignRoom(reservation.id, roomId);
      showToast({
        title: 'Room Reassigned',
        description: `Reservation ${reservation.refCode} updated to new room.`,
        type: 'success',
      });
    }
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    setNotesList((prev) => [...prev, newNote.trim()]);
    setNewNote('');
    showToast({
      title: 'Operational Note Appended',
      description: 'Added for this open screen only. Persistent reservation notes are not configured.',
      type: 'info',
    });
  };

  const handlePrintRegistration = () => {
    window.print();
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      width="2xl"
      title={
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-base font-bold text-gray-900">
            {reservation.guest.firstName} {reservation.guest.lastName}
          </span>
          {reservation.guest.vipStatus && (
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">
              VIP Guest
            </span>
          )}
          <Badge variant="status" status={reservation.status} size="sm" />
          <Badge variant="channel" channel={reservation.bookingSource} size="sm" />
        </div>
      }
      subtitle={
        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
          <span>Ref: <strong className="text-gray-900 font-mono">{reservation.refCode}</strong></span>
          <span>•</span>
          <span>Booked on {new Date(reservation.createdAt).toLocaleDateString()}</span>
          <span>•</span>
          <span>{property?.name || 'Selected property'}</span>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="outline" size="sm" onClick={handlePrintRegistration} leftIcon={<FileText className="w-3.5 h-3.5" />}>
            Print GRC Card
          </Button>

          <div className="flex items-center gap-2">
            {reservation.balanceAmount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAddPayment(reservation.id)}
                leftIcon={<CreditCard className="w-3.5 h-3.5 text-amber-600" />}
              >
                Record Payment
              </Button>
            )}

            {reservation.status === 'Confirmed' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onCheckIn(reservation.id)}
                leftIcon={<DoorOpen className="w-3.5 h-3.5" />}
              >
                Complete Check-in
              </Button>
            )}

            {reservation.status === 'Checked In' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onCheckOut(reservation.id)}
                leftIcon={<LogOut className="w-3.5 h-3.5" />}
              >
                Check-out & Close Folio
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Stay Summary Highlights Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
          <div>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
              Check-in Date
            </span>
            <span className="text-xs font-bold text-gray-900 mt-0.5 block">
              {reservation.checkInDate}
            </span>
            <span className="text-[10px] text-gray-500">ETA {reservation.eta || '14:00'}</span>
          </div>

          <div>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
              Check-out Date
            </span>
            <span className="text-xs font-bold text-gray-900 mt-0.5 block">
              {reservation.checkOutDate}
            </span>
            <span className="text-[10px] text-gray-500">{reservation.nights} Night(s)</span>
          </div>

          <div>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
              Assigned Room
            </span>
            <span className="text-xs font-bold text-gray-900 mt-0.5 block">
              Room {reservation.roomNumber || 'Unassigned'}
            </span>
            <span className="text-[10px] text-gray-500 truncate block">{reservation.roomTypeName}</span>
          </div>

          <div>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
              Guests
            </span>
            <span className="text-xs font-bold text-gray-900 mt-0.5 block">
              {reservation.adults} Adult(s) {reservation.children > 0 ? `, ${reservation.children} Child` : ''}
            </span>
            <span className="text-[10px] text-gray-500 font-mono">{reservation.ratePlanCode}</span>
          </div>
        </div>

        {/* Room Reassignment Selector */}
        <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
              <BedDouble className="w-4 h-4 text-blue-600" />
              Room Assignment
            </label>
            <span className="text-[11px] text-gray-500">
              Current: <strong>Room {reservation.roomNumber || 'None'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <select
              onChange={handleRoomChange}
              defaultValue=""
              className="flex-1 h-9 rounded-md border border-gray-300 bg-white px-3 text-xs text-gray-800 outline-none focus:border-blue-600"
            >
              <option value="" disabled>
                Switch or assign another available room...
              </option>
              {availableRooms.map((rm) => (
                <option key={rm.id} value={rm.id}>
                  Room {rm.roomNumber} ({rm.roomTypeName}) - Fl {rm.floor} - [{rm.housekeepingStatus}]
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Guest Contact & CRM Profile Card */}
        <div className="border border-gray-200 rounded-xl p-4 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" /> Guest Contact & KYC
            </h4>
            {onOpenGuestProfile && (
              <button
                onClick={() => onOpenGuestProfile(reservation.guest.id)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
              >
                View Full Profile
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-2 text-gray-700">
              <Phone className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-mono">{reservation.guest.phone}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700 truncate">
              <Mail className="w-3.5 h-3.5 text-gray-400" />
              <span className="truncate">{reservation.guest.email}</span>
            </div>
            <div className="text-gray-700">
              <span className="text-gray-400">KYC:</span> {reservation.guest.idType} ({reservation.guest.idNumber})
            </div>
          </div>

          {reservation.specialRequests && (
            <div className="p-2.5 bg-blue-50/50 border border-blue-100 rounded-lg text-xs text-blue-900">
              <strong>Special Request:</strong> {reservation.specialRequests}
            </div>
          )}
        </div>

        {/* Folio & Billing Quick Breakdown */}
        <div className="border border-gray-200 rounded-xl p-4 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-emerald-600" /> Folio Billing Summary
            </h4>
            <span
              className={`text-xs font-bold ${
                reservation.balanceAmount > 0 ? 'text-amber-600' : 'text-emerald-600'
              }`}
            >
              {reservation.balanceAmount > 0
                ? `Balance Due: ${formatCurrency(reservation.balanceAmount)}`
                : 'Paid in Full'}
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-gray-600">
              <span>Total Charges (Room & Add-ons):</span>
              <span className="font-medium text-gray-900">{formatCurrency(reservation.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Total Payments Collected:</span>
              <span className="font-medium text-emerald-700">
                - {formatCurrency(reservation.paidAmount)}
              </span>
            </div>
            <div className="pt-2 border-t border-gray-100 flex justify-between font-bold text-gray-950">
              <span>Outstanding Due:</span>
              <span className={reservation.balanceAmount > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                {formatCurrency(reservation.balanceAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Operational Notes & Audit Trail */}
        <div className="border border-gray-200 rounded-xl p-4 bg-white space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-purple-600" /> Operational Notes & Trail
          </h4>

          <div className="space-y-2 max-h-36 overflow-y-auto">
            <div className="text-xs text-gray-600 flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-gray-800">Booking received via {reservation.bookingSource}</span>
                <span className="text-[10px] text-gray-400 block">{reservation.createdAt}</span>
              </div>
            </div>

            {notesList.map((note, idx) => (
              <div key={idx} className="text-xs text-gray-600 flex items-start gap-2 bg-gray-50 p-2 rounded-lg">
                <MessageSquare className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-gray-800">{note}</span>
                  <span className="text-[10px] text-gray-400 block">Just now • Front Desk User</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <input
              type="text"
              placeholder="Add an internal front desk note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
              className="flex-1 h-8 rounded-md border border-gray-200 px-3 text-xs outline-none focus:border-blue-600"
            />
            <Button size="xs" variant="outline" onClick={handleAddNote} leftIcon={<Plus className="w-3 h-3" />}>
              Add Note
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  );
};
