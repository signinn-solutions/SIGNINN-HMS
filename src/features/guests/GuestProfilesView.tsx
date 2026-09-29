import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  GitMerge,
  AlertTriangle,
  CheckCircle2,
  Utensils,
  MessageSquare,
  BedDouble,
  Check,
  ChevronRight,
} from 'lucide-react';
import { Guest, Reservation } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Drawer } from '../../components/ui/Drawer';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { simulateLatency } from '../../services/latency';
import { useAppStore } from '../../stores/useAppStore';

export interface GuestProfilesViewProps {
  guests: Guest[];
  reservations: Reservation[];
  onBookForGuest: (guest: Guest) => void;
  onOpenReservationDetail: (resId: string) => void;
  onMergeGuests?: (primaryId: string, secondaryId: string) => Promise<void>;
}

export interface DuplicatePair {
  original: Guest;
  duplicate: Guest;
  reason: string;
}

export const GuestProfilesView: React.FC<GuestProfilesViewProps> = ({
  guests: initialGuests,
  reservations,
  onBookForGuest,
  onOpenReservationDetail,
  onMergeGuests,
}) => {
  const { showToast } = useToast();
  const property = useAppStore((state) => state.currentProperty);
  const [guestList, setGuestList] = useState<Guest[]>(initialGuests);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);

  // Merge Wizard State
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [activeDuplicatePair, setActiveDuplicatePair] = useState<DuplicatePair | null>(null);
  const [primaryRecordId, setPrimaryRecordId] = useState<string>('');
  const [isMerging, setIsMerging] = useState(false);

  // Sync if initialGuests changes
  React.useEffect(() => {
    setGuestList(initialGuests);
  }, [initialGuests]);

  // Duplicate Detection
  const detectedDuplicates = useMemo(() => {
    const dups: DuplicatePair[] = [];
    for (let i = 0; i < guestList.length; i++) {
      for (let j = i + 1; j < guestList.length; j++) {
        const g1 = guestList[i];
        const g2 = guestList[j];

        const p1 = g1.phone.replace(/[^0-9]/g, '').slice(-10);
        const p2 = g2.phone.replace(/[^0-9]/g, '').slice(-10);

        if (p1 && p1 === p2) {
          dups.push({
            original: g1,
            duplicate: g2,
            reason: `Matching phone number (${g1.phone})`,
          });
        } else if (g1.email && g2.email && g1.email.toLowerCase() === g2.email.toLowerCase()) {
          dups.push({
            original: g1,
            duplicate: g2,
            reason: `Matching email (${g1.email})`,
          });
        }
      }
    }
    return dups;
  }, [guestList]);

  const filteredGuests = guestList.filter((g) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      `${g.firstName} ${g.lastName}`.toLowerCase().includes(q) ||
      g.phone.includes(q) ||
      g.email.toLowerCase().includes(q) ||
      g.idNumber.toLowerCase().includes(q)
    );
  });

  const guestStays = selectedGuest
    ? reservations.filter((r) => r.guestId === selectedGuest.id || r.guest.phone === selectedGuest.phone)
    : [];

  const handleOpenMergeWizard = (pair: DuplicatePair) => {
    setActiveDuplicatePair(pair);
    setPrimaryRecordId(pair.original.id);
    setMergeModalOpen(true);
  };

  const handleExecuteMerge = async () => {
    if (!activeDuplicatePair) return;
    setIsMerging(true);

    try {
      const primaryId = primaryRecordId;
      const secondaryId =
        activeDuplicatePair.original.id === primaryId
          ? activeDuplicatePair.duplicate.id
          : activeDuplicatePair.original.id;

      if (onMergeGuests) {
        await onMergeGuests(primaryId, secondaryId);
      } else {
        await simulateLatency(400, 700);
      }

      // Update local state
      const primaryGuest = guestList.find((g) => g.id === primaryId)!;
      const secondaryGuest = guestList.find((g) => g.id === secondaryId)!;

      const merged: Guest = {
        ...primaryGuest,
        lifetimeStays: primaryGuest.lifetimeStays + secondaryGuest.lifetimeStays,
        lifetimeRevenue: primaryGuest.lifetimeRevenue + secondaryGuest.lifetimeRevenue,
        preferences: Array.from(new Set([...primaryGuest.preferences, ...secondaryGuest.preferences])),
        notes: primaryGuest.notes
          ? `${primaryGuest.notes} | Merged: ${secondaryGuest.notes || ''}`
          : secondaryGuest.notes,
      };

      setGuestList((prev) => prev.filter((g) => g.id !== secondaryId).map((g) => (g.id === primaryId ? merged : g)));

      showToast({
        title: 'Profiles Successfully Merged',
        description: `Consolidated records for ${merged.firstName} ${merged.lastName}. All stays and spend preserved.`,
        type: 'success',
      });

      setMergeModalOpen(false);
      setActiveDuplicatePair(null);
    } catch (err) {
      showToast({
        title: 'Merge Failed',
        description: 'An error occurred while merging guest profiles.',
        type: 'error',
      });
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold tracking-tight text-gray-950 font-sans">
              Guest Profiles & CRM
            </h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Centralized guest records, stay history, verified KYC documents, duplicate detection, and stay preferences.
          </p>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, phone, email, Aadhaar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-xs h-8 pl-8 pr-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 placeholder:text-gray-400 outline-none focus:border-blue-600 w-64 sm:w-80"
          />
        </div>
      </div>

      {/* Duplicate Detection Warning Banner */}
      {detectedDuplicates.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">
                {detectedDuplicates.length} Potential Duplicate Profile{detectedDuplicates.length > 1 ? 's' : ''} Detected
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                Profiles found with identical phone numbers or emails. Merge profiles to maintain accurate stay histories and KYC.
              </p>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                {detectedDuplicates.slice(0, 2).map((dup, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-amber-300 text-[11px] text-amber-900 font-medium"
                  >
                    <span>{dup.original.firstName} {dup.original.lastName}</span>
                    <span className="text-amber-400">↔</span>
                    <span>{dup.duplicate.firstName} {dup.duplicate.lastName}</span>
                    <span className="text-amber-600 font-mono text-[10px]">({dup.reason})</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="bg-white border-amber-300 text-amber-900 hover:bg-amber-100 shrink-0 font-semibold"
            leftIcon={<GitMerge className="w-3.5 h-3.5" />}
            onClick={() => handleOpenMergeWizard(detectedDuplicates[0])}
          >
            Review & Merge
          </Button>
        </div>
      )}

      {/* Guest Directory Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGuests.map((guest) => (
          <div
            key={guest.id}
            onClick={() => setSelectedGuest(guest)}
            className="bg-white rounded-xl border border-gray-200 p-4 shadow-2xs hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-800 border border-blue-200 flex items-center justify-center font-bold text-xs">
                    {guest.firstName?.[0] || ''}
                    {guest.lastName?.[0] || ''}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 leading-tight">
                      {guest.firstName} {guest.lastName}
                    </h4>
                    <span className="text-[11px] text-gray-500">{guest.nationality}</span>
                  </div>
                </div>

                {guest.vipStatus && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                    VIP
                  </span>
                )}
              </div>

              <div className="mt-3 space-y-1 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <span className="font-mono">{guest.phone}</span>
                </div>
                <div className="flex items-center gap-2 truncate">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  <span className="truncate">{guest.email}</span>
                </div>
              </div>

              {guest.preferences && guest.preferences.length > 0 && (
                <div className="mt-2.5 flex items-center gap-1 flex-wrap">
                  {guest.preferences.slice(0, 2).map((pref, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700"
                    >
                      {pref}
                    </span>
                  ))}
                  {guest.preferences.length > 2 && (
                    <span className="text-[10px] text-gray-400">
                      +{guest.preferences.length - 2} more
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
              <div className="text-gray-500">
                <strong>{guest.lifetimeStays}</strong> stay(s) •{' '}
                <strong className="text-emerald-700">{formatCurrency(guest.lifetimeRevenue)}</strong>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onBookForGuest(guest);
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
              >
                + Book Stay
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Merge Profiles Wizard Modal */}
      <Modal
        isOpen={mergeModalOpen}
        onClose={() => !isMerging && setMergeModalOpen(false)}
        title="Merge Guest Profiles Wizard"
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-gray-500">
              Selected primary profile will be preserved and enriched.
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMergeModalOpen(false)}
                disabled={isMerging}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExecuteMerge}
                isLoading={isMerging}
                leftIcon={<GitMerge className="w-3.5 h-3.5" />}
              >
                Confirm & Merge Profiles
              </Button>
            </div>
          </div>
        }
      >
        {activeDuplicatePair && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
              <strong>Match Reason:</strong> {activeDuplicatePair.reason}. Select which profile should serve as the <strong>Primary Master Record</strong>. Secondary details, stays, and total revenue will be consolidated into the chosen primary profile.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Profile A */}
              {[activeDuplicatePair.original, activeDuplicatePair.duplicate].map((profile, idx) => {
                const isSelectedPrimary = primaryRecordId === profile.id;
                return (
                  <div
                    key={profile.id}
                    onClick={() => setPrimaryRecordId(profile.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                      isSelectedPrimary
                        ? 'border-blue-600 bg-blue-50/40 shadow-xs ring-2 ring-blue-500/20'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500 uppercase">
                          Record {idx === 0 ? 'A' : 'B'}
                        </span>
                        {isSelectedPrimary && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                            <Check className="w-3 h-3" /> Master Record
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-gray-400">{profile.id}</span>
                    </div>

                    <h4 className="text-sm font-bold text-gray-900 mt-2">
                      {profile.firstName} {profile.lastName}
                    </h4>

                    <div className="mt-3 space-y-1.5 text-xs text-gray-600">
                      <div>
                        <span className="text-[10px] text-gray-400 block">Phone</span>
                        <span className="font-mono font-semibold text-gray-800">{profile.phone}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block">Email</span>
                        <span className="truncate block font-semibold text-gray-800">{profile.email}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block">KYC Document</span>
                        <span className="font-semibold text-gray-800">
                          {profile.idType}: {profile.idNumber}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                        <span>Lifetime Stays:</span>
                        <strong className="text-gray-900">{profile.lifetimeStays}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Lifetime Spend:</span>
                        <strong className="text-emerald-700">{formatCurrency(profile.lifetimeRevenue)}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Consolidated Preview Summary */}
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2 text-xs">
              <h5 className="font-bold text-gray-800 uppercase tracking-wider text-[11px]">
                Consolidated Profile Outcome
              </h5>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-gray-600">
                <div>
                  <span className="text-[10px] text-gray-400 block">Total Stays</span>
                  <span className="font-bold text-gray-900">
                    {activeDuplicatePair.original.lifetimeStays + activeDuplicatePair.duplicate.lifetimeStays} stays
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block">Total Revenue</span>
                  <span className="font-bold text-emerald-700">
                    {formatCurrency(
                      activeDuplicatePair.original.lifetimeRevenue + activeDuplicatePair.duplicate.lifetimeRevenue
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block">Preferences</span>
                  <span className="font-semibold text-gray-900">
                    {Array.from(
                      new Set([...activeDuplicatePair.original.preferences, ...activeDuplicatePair.duplicate.preferences])
                    ).length} tags
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block">Folio Records</span>
                  <span className="font-semibold text-gray-900">Automatically linked</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Guest Profile Detail Drawer */}
      <Drawer
        isOpen={!!selectedGuest}
        onClose={() => setSelectedGuest(null)}
        width="xl"
        title={
          selectedGuest ? (
            <div className="flex items-center gap-2">
              <span>{selectedGuest.firstName} {selectedGuest.lastName}</span>
              {selectedGuest.vipStatus && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                  VIP Guest
                </span>
              )}
            </div>
          ) : ''
        }
        subtitle={selectedGuest ? `${selectedGuest.nationality} • Lifetime Spent: ${formatCurrency(selectedGuest.lifetimeRevenue)}` : ''}
        footer={
          selectedGuest && (
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-gray-500">
                Member ID: <strong className="font-mono">{selectedGuest.id}</strong>
              </span>
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  const g = selectedGuest;
                  setSelectedGuest(null);
                  onBookForGuest(g);
                }}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Book New Stay for Guest
              </Button>
            </div>
          )
        }
      >
        {selectedGuest && (
          <div className="space-y-6">
            {/* Contact & KYC Info */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Verified Identity & KYC
                </h4>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> KYC Verified
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px]">Phone Number</span>
                  <span className="font-semibold text-gray-900">{selectedGuest.phone}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Email Address</span>
                  <span className="font-semibold text-gray-900">{selectedGuest.email}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">KYC Document Type & ID</span>
                  <span className="font-semibold text-gray-900">
                    {selectedGuest.idType}: {selectedGuest.idNumber}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Nationality</span>
                  <span className="font-semibold text-gray-900">{selectedGuest.nationality}</span>
                </div>
              </div>
            </div>

            {/* Operational Preferences: Dietary, Room & Communication */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Operational Preferences & Service Profiles
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Room & Bed Preferences */}
                <div className="p-3 rounded-lg border border-gray-200 bg-white space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-gray-800 font-semibold">
                    <BedDouble className="w-3.5 h-3.5 text-blue-600" /> Room & Stay Preferences
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedGuest.preferences.map((p, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-200"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Communication Channels */}
                <div className="p-3 rounded-lg border border-gray-200 bg-white space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-gray-800 font-semibold">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> Communication Preferences
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                      WhatsApp Updates
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700">
                      Email Invoices
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700">
                      SMS Notifications
                    </span>
                  </div>
                </div>
              </div>

              {selectedGuest.notes && (
                <p className="text-xs text-gray-600 bg-amber-50/70 p-3 rounded-lg border border-amber-200/60 mt-2">
                  <strong>Special Guest Note:</strong> {selectedGuest.notes}
                </p>
              )}
            </div>

            {/* Historical Stays with APKA INN */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Stay History at {property?.name || 'the selected property'} ({guestStays.length} records)
                </h4>
                <span className="text-xs text-gray-500">
                  Total Spend: <strong className="text-emerald-700">{formatCurrency(selectedGuest.lifetimeRevenue)}</strong>
                </span>
              </div>

              {guestStays.length === 0 ? (
                <p className="text-xs text-gray-500 py-4 text-center">No past stays recorded.</p>
              ) : (
                <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white">
                  {guestStays.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => onOpenReservationDetail(s.id)}
                      className="p-3 hover:bg-gray-50 transition-colors flex items-center justify-between cursor-pointer text-xs group"
                    >
                      <div>
                        <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                          <span>{s.checkInDate} → {s.checkOutDate}</span>
                          <span className="text-gray-400 font-normal">({s.nights} nights)</span>
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          Room {s.roomNumber || 'Unassigned'} • {s.roomTypeName} • Ref: <span className="font-mono text-blue-600">{s.refCode}</span>
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-2">
                        <div>
                          <div className="font-bold text-gray-900">{formatCurrency(s.totalAmount)}</div>
                          <Badge variant="status" status={s.status} size="sm" />
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-600 transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
