import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { RoomType, Room, Reservation } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useToast } from '../../components/ui/Toast';
import { Calendar, User, CreditCard, Sparkles, Check, ArrowRight, ArrowLeft } from 'lucide-react';

export interface NewReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomTypes: RoomType[];
  rooms: Room[];
  initialRoomId?: string;
  initialDate?: string;
  onCreateReservation: (data: Partial<Reservation>) => Promise<Reservation>;
}

export const NewReservationModal: React.FC<NewReservationModalProps> = ({
  isOpen,
  onClose,
  roomTypes,
  rooms,
  initialRoomId,
  initialDate,
  onCreateReservation,
}) => {
  const { showToast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [checkInDate, setCheckInDate] = useState(initialDate || new Date().toISOString().slice(0, 10));
  const [checkOutDate, setCheckOutDate] = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [roomTypeId, setRoomTypeId] = useState(roomTypes[0]?.id || 'rt-1');
  const [selectedRoomId, setSelectedRoomId] = useState(initialRoomId || '');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  // Rate & extras
  const [mealPlan, setMealPlan] = useState<'EP' | 'CP' | 'MAP'>('CP');
  const [airportTransfer, setAirportTransfer] = useState(false);
  const [extraBed, setExtraBed] = useState(false);

  // Guest info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [email, setEmail] = useState('');
  const [idType, setIdType] = useState('Aadhaar');
  const [idNumber, setIdNumber] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [source, setSource] = useState('Direct Front Desk');

  // Payment
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('UPI');

  const selectedRoomType = roomTypes.find((rt) => rt.id === roomTypeId) || roomTypes[0];

  // Calculate pricing
  const nights = Math.max(
    1,
    Math.round(
      (new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24)
    )
  );

  const baseRate = (selectedRoomType && selectedRoomType.basePrice != null && !isNaN(Number(selectedRoomType.basePrice))) ? Number(selectedRoomType.basePrice) : 4500;
  const mealAddon = mealPlan === 'CP' ? 600 * nights * adults : mealPlan === 'MAP' ? 1400 * nights * adults : 0;
  const transferAddon = airportTransfer ? 1500 : 0;
  const extraBedAddon = extraBed ? 1000 * nights : 0;
  const totalAmount = baseRate * nights + mealAddon + transferAddon + extraBedAddon;

  const handleSubmit = async () => {
    if (checkOutDate <= checkInDate) {
      showToast({ title: 'Invalid stay dates', description: 'Check-out must be after check-in.', type: 'error' });
      return;
    }
    if (!firstName || !lastName || !phone) {
      showToast({
        title: 'Missing Required Fields',
        description: 'Please provide guest first name, last name, and contact number.',
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const room = rooms.find((r) => r.id === selectedRoomId);
      await onCreateReservation({
        guest: {
          id: `guest-${Date.now()}`,
          firstName,
          lastName,
          email: email || 'guest@example.com',
          phone,
          idType: idType as any,
          idNumber: idNumber || 'KYC-PENDING',
          nationality: 'Indian',
          vipStatus: false,
          lifetimeStays: 1,
          lifetimeRevenue: totalAmount,
          preferences: [],
          notes: specialRequests,
        },
        roomId: room?.id,
        roomNumber: room?.roomNumber,
        roomTypeId: selectedRoomType.id,
        roomTypeName: selectedRoomType.name,
        checkInDate,
        checkOutDate,
        nights,
        adults,
        children,
        status: 'Confirmed',
        bookingSource: source as any,
        totalAmount,
        paidAmount: advanceAmount,
        ratePlanCode: `BAR-${mealPlan}`,
        specialRequests,
      });

      showToast({
        title: 'Reservation Created Successfully',
        description: `Booking confirmed for ${firstName} ${lastName}.`,
        type: 'success',
      });

      onClose();
      // Reset form
      setStep(1);
    } catch (e) {
      showToast({
        title: 'Error Creating Reservation',
        description: 'An unexpected error occurred.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      title="Create New Reservation"
      description="Fast 4-step direct booking flow with live rate calculation"
      footer={
        <div className="flex items-center justify-between w-full">
          {step > 1 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep((s) => (s - 1) as any)}
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
            >
              Back
            </Button>
          ) : (
            <span className="text-xs text-gray-500">Step 1 of 4: Dates & Room</span>
          )}

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>

            {step < 4 ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setStep((s) => (s + 1) as any)}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Next Step
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmit}
                isLoading={isSubmitting}
                leftIcon={<Check className="w-3.5 h-3.5" />}
              >
                Confirm & Create Booking
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Step Navigation Pill Indicator */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          {[
            { s: 1, title: 'Dates & Room' },
            { s: 2, title: 'Rate & Addons' },
            { s: 3, title: 'Guest Profile' },
            { s: 4, title: 'Summary & Payment' },
          ].map((item) => (
            <div
              key={item.s}
              className={`flex items-center gap-2 text-xs font-medium ${
                step === item.s
                  ? 'text-blue-600 font-semibold'
                  : step > item.s
                  ? 'text-emerald-600'
                  : 'text-gray-400'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step === item.s
                    ? 'bg-blue-600 text-white'
                    : step > item.s
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {step > item.s ? '✓' : item.s}
              </div>
              <span className="hidden sm:inline">{item.title}</span>
            </div>
          ))}
        </div>

        {/* Step 1: Stay Details */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                type="date"
                label="Check-in Date"
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
              />
              <Input
                type="date"
                label="Check-out Date"
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Room Category"
                value={roomTypeId}
                onChange={(e) => setRoomTypeId(e.target.value)}
                options={roomTypes.map((rt) => ({
                  value: rt.id,
                  label: `${rt.name} (${formatCurrency(rt.basePrice != null && !isNaN(Number(rt.basePrice)) ? Number(rt.basePrice) : 4500)}/night)`,
                }))}
              />

              <Select
                label="Pre-Assign Room (Optional)"
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
              >
                <option value="">Auto-assign on check-in</option>
                {rooms
                  .filter((r) => r.roomTypeId === roomTypeId)
                  .map((rm) => (
                    <option key={rm.id} value={rm.id}>
                      Room {rm.roomNumber} (Fl {rm.floor}) - {rm.housekeepingStatus}
                    </option>
                  ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Input
                type="number"
                min="1"
                max="6"
                label="Adults"
                value={adults}
                onChange={(e) => setAdults(parseInt(e.target.value) || 1)}
              />
              <Input
                type="number"
                min="0"
                max="4"
                label="Children"
                value={children}
                onChange={(e) => setChildren(parseInt(e.target.value) || 0)}
              />
              <div className="col-span-2 flex items-center p-3 bg-blue-50/50 rounded-lg text-xs text-blue-800">
                Duration: <strong>&nbsp;{nights} night(s) stay</strong>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Rate & Extras */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700 block">Meal Plan Option</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { code: 'EP', name: 'Room Only (EP)', add: '₹0' },
                  { code: 'CP', name: 'Bed & Breakfast (CP)', add: '+₹600/adult/night' },
                  { code: 'MAP', name: 'Breakfast + Dinner (MAP)', add: '+₹1,400/adult/night' },
                ].map((plan) => (
                  <button
                    key={plan.code}
                    type="button"
                    onClick={() => setMealPlan(plan.code as any)}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-colors ${
                      mealPlan === plan.code
                        ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-1 ring-blue-600'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-800'
                    }`}
                  >
                    <div className="text-xs font-bold">{plan.name}</div>
                    <div className="text-[11px] text-gray-500 mt-1">{plan.add}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-gray-100">
              <label className="text-xs font-semibold text-gray-700 block">Add-ons & Extras</label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={airportTransfer}
                    onChange={(e) => setAirportTransfer(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  <div className="flex-1 text-xs">
                    <span className="font-semibold text-gray-900">Airport Pickup / Drop</span>
                    <span className="text-gray-500 block text-[11px]">Sedan airport transfer (₹1,500 one-way)</span>
                  </div>
                  <span className="text-xs font-bold text-gray-900">₹1,500</span>
                </label>

                <label className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={extraBed}
                    onChange={(e) => setExtraBed(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  <div className="flex-1 text-xs">
                    <span className="font-semibold text-gray-900">Rollaway Extra Bed</span>
                    <span className="text-gray-500 block text-[11px]">Includes extra mattress and linens (₹1,000/night)</span>
                  </div>
                  <span className="text-xs font-bold text-gray-900">{formatCurrency(1000 * nights)}</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Guest Profile */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First Name *"
                placeholder="e.g. Arjun"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <Input
                label="Last Name *"
                placeholder="e.g. Menon"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Mobile Phone *"
                placeholder="+91 98470 12345"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Input
                label="Email Address"
                placeholder="arjun.menon@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="ID / KYC Type"
                value={idType}
                onChange={(e) => setIdType(e.target.value)}
                options={[
                  { value: 'Aadhaar', label: 'Aadhaar Card' },
                  { value: 'Passport', label: 'Passport' },
                  { value: 'Driving License', label: 'Driving License' },
                  { value: 'Voter ID', label: 'Voter ID Card' },
                ]}
              />
              <Input
                label="ID Document Number"
                placeholder="XXXX XXXX 1234"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
              />
            </div>

            <Input
              label="Special Requests / Operational Notes"
              placeholder="e.g. High floor, quiet room, late check-in at 20:00"
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
            />
          </div>
        )}

        {/* Step 4: Summary & Payment */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Guest:</span>
                <span className="font-bold text-gray-900">
                  {firstName} {lastName} ({phone})
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Room & Dates:</span>
                <span className="font-medium text-gray-900">
                  {selectedRoomType.name} ({nights} nights • {checkInDate} to {checkOutDate})
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Meal Plan:</span>
                <span className="font-medium text-gray-900">{mealPlan}</span>
              </div>
              <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-sm text-gray-950">
                <span>Total Estimated Bill:</span>
                <span className="text-blue-700">{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <Input
                type="number"
                label="Advance Payment Received (₹)"
                value={advanceAmount}
                onChange={(e) => setAdvanceAmount(parseFloat(e.target.value) || 0)}
                helperText="Leave 0 if guest will pay upon check-in"
              />

              <Select
                label="Payment Method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                options={[
                  { value: 'UPI', label: 'UPI (GPay / PhonePe / QR)' },
                  { value: 'Credit Card', label: 'Credit / Debit Card' },
                  { value: 'Cash', label: 'Cash at Counter' },
                  { value: 'Bank Transfer', label: 'NEFT / RTGS Transfer' },
                ]}
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
