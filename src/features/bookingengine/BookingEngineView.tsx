import React, { useState } from 'react';
import {
  Globe,
  Smartphone,
  Sparkles,
  QrCode,
  CheckCircle2,
  Calendar,
  Users,
  ShieldCheck,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { RoomType, Reservation } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { useToast } from '../../components/ui/Toast';

export interface BookingEngineViewProps {
  roomTypes: RoomType[];
  onCreateDirectBooking: (data: Partial<Reservation>) => Promise<Reservation>;
}

export const BookingEngineView: React.FC<BookingEngineViewProps> = ({
  roomTypes,
  onCreateDirectBooking,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'preview' | 'admin'>('preview');

  // Booking widget form state
  const [checkIn, setCheckIn] = useState(() => new Date().toISOString().slice(0, 10));
  const [checkOut, setCheckOut] = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [adults, setAdults] = useState(2);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState(roomTypes[0]?.id || 'rt-1');
  const [guestName, setGuestName] = useState('Priya Sharma');
  const [guestPhone, setGuestPhone] = useState('+91 98950 11223');
  const [guestEmail, setGuestEmail] = useState('priya.sharma@gmail.com');
  const [breakfastIncluded, setBreakfastIncluded] = useState(true);
  const [isBooked, setIsBooked] = useState(false);
  const [confirmedRef, setConfirmedRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedRoomType = roomTypes.find((rt) => rt.id === selectedRoomTypeId) || roomTypes[0];
  const nights = Math.max(0, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000));
  const roomCost = (selectedRoomType?.basePrice || 0) * nights;
  const directDiscount = Math.round(roomCost * 0.1); // 10% direct booking discount incentive
  const mealCost = breakfastIncluded ? 600 * nights * adults : 0;
  const grandTotal = roomCost - directDiscount + mealCost;

  const handleBookDirect = async () => {
    if (!selectedRoomType || !guestName.trim() || !guestPhone.trim() || !guestEmail.trim() || nights < 1 || checkIn < new Date().toISOString().slice(0, 10)) {
      showToast({ title: 'Check booking details', description: 'Choose a room, future stay dates, and enter guest contact details.', type: 'error' });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await onCreateDirectBooking({
        guest: {
          id: `guest-${Date.now()}`,
          firstName: guestName.split(' ')[0] || 'Priya',
          lastName: guestName.split(' ')[1] || 'Sharma',
          email: guestEmail,
          phone: guestPhone,
          idType: 'Aadhaar',
          idNumber: 'DIRECT-WEB-KYC',
          nationality: 'Indian',
          vipStatus: false,
          lifetimeStays: 1,
          lifetimeRevenue: grandTotal,
          preferences: ['Direct Website Member'],
        },
        roomTypeId: selectedRoomType.id,
        roomTypeName: selectedRoomType.name,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        nights,
        adults,
        children: 0,
        status: 'Confirmed',
        bookingSource: 'Direct Website',
        totalAmount: grandTotal,
        paidAmount: 0,
        ratePlanCode: 'DIRECT-SAVE10',
      });
      setConfirmedRef(res.refCode);
      setIsBooked(true);
      showToast({
        title: 'Direct Reservation Confirmed!',
        description: `Reference ${res.refCode}. Reservation saved.`,
        type: 'success',
      });
    } catch (e) {
      showToast({
        title: 'Booking Error',
        description: e instanceof Error ? e.message : 'Unable to complete direct reservation.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold tracking-tight text-gray-950 font-sans">
              Direct Booking Engine
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
              0% Commission Direct Channel
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Zero-commission direct booking widget embedded on apkainn.com with instant UPI payments.
          </p>
        </div>

        <Tabs
          variant="segmented"
          activeTab={activeTab}
          onChange={(t) => setActiveTab(t as any)}
          tabs={[
            { id: 'preview', label: 'Guest Live Preview' },
            { id: 'admin', label: 'Widget Config' },
          ]}
        />
      </div>

      {activeTab === 'preview' ? (
        /* Live Guest Booking Engine Frame */
        <div className="bg-gradient-to-b from-gray-50 to-white rounded-2xl border border-gray-300 p-4 sm:p-8 max-w-4xl mx-auto shadow-sm">
          {/* Guest Hotel Banner */}
          <div className="text-center pb-6 border-b border-gray-200">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold mb-2">
              <Zap className="w-3.5 h-3.5 text-emerald-600" /> Direct Booking Perk: Guaranteed Lowest Rate
              (Save 10%)
            </div>
            <h2 className="text-2xl font-black text-gray-950 tracking-tight font-serif">
              APKA INN - BOUTIQUE HOTEL
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Marine Drive, Kochi, Kerala • Free High-Speed WiFi • 24/7 Power Backup • Pure Vegetarian
              Kitchen
            </p>
          </div>

          {!isBooked ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
              {/* Room Selection & Dates */}
              <div className="lg:col-span-7 space-y-4">
                {/* Stay Date Bar */}
                <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-gray-200">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block">Check-in</label>
                    <input
                      type="date"
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="text-xs font-bold text-gray-900 outline-none w-full"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block">Check-out</label>
                    <input
                      type="date"
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="text-xs font-bold text-gray-900 outline-none w-full"
                    />
                  </div>
                </div>

                {/* Room Cards */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-gray-800 block uppercase tracking-wider">
                    Select Room Category
                  </span>
                  {roomTypes.map((rt) => {
                    const isSelected = rt.id === selectedRoomTypeId;
                    return (
                      <div
                        key={rt.id}
                        onClick={() => setSelectedRoomTypeId(rt.id)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/50 border-blue-600 ring-1 ring-blue-600'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-sm font-bold text-gray-950">{rt.name}</h4>
                            <p className="text-xs text-gray-500 mt-0.5">{rt.description}</p>
                            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                              {rt.amenities.map((a, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded text-[10px] bg-gray-100 text-gray-600"
                                >
                                  {a}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-sm font-bold text-gray-900">
                              {formatCurrency(rt.basePrice)}
                              <span className="text-[10px] font-normal text-gray-400">/night</span>
                            </div>
                            <span className="text-[10px] text-emerald-700 font-semibold block">
                              Includes 10% direct saving
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add-ons */}
                <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-gray-800 block">Complimentary & Add-ons</span>
                  <label className="flex items-center justify-between text-xs cursor-pointer">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={breakfastIncluded}
                        onChange={(e) => setBreakfastIncluded(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span>South Indian Buffet Breakfast at Cafe</span>
                    </div>
                    <span className="font-bold text-gray-900">{formatCurrency(mealCost)}</span>
                  </label>
                </div>
              </div>

              {/* Guest & Instant UPI Payment Column */}
              <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                  Guest Contact & Payment
                </h3>

                <div className="space-y-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full h-8 px-2.5 text-xs rounded-lg border border-gray-300 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                      Mobile (for WhatsApp confirmation) *
                    </label>
                    <input
                      type="text"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      className="w-full h-8 px-2.5 text-xs rounded-lg border border-gray-300 font-medium font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className="w-full h-8 px-2.5 text-xs rounded-lg border border-gray-300 font-medium"
                    />
                  </div>
                </div>

                {/* Fare Breakdown */}
                <div className="pt-3 border-t border-gray-100 space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>
                      {selectedRoomType.name} ({nights} nights):
                    </span>
                    <span>{formatCurrency(roomCost)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Direct Booking Special Discount:</span>
                    <span>- {formatCurrency(directDiscount)}</span>
                  </div>
                  {breakfastIncluded && (
                    <div className="flex justify-between text-gray-600">
                      <span>Buffet Breakfast:</span>
                      <span>{formatCurrency(mealCost)}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-gray-200 flex justify-between text-base font-extrabold text-gray-950">
                    <span>Total Net Amount:</span>
                    <span className="text-blue-700">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>

                <p className="text-xs text-gray-600">Payment can be collected from the reservation folio after booking.</p>

                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={handleBookDirect}
                  disabled={isSubmitting}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  {isSubmitting ? 'Saving reservation...' : 'Confirm Reservation'}
                </Button>
              </div>
            </div>
          ) : (
            /* Booking Confirmation View */
            <div className="text-center py-10 space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-950">Booking Confirmed!</h3>
              <p className="text-xs text-gray-600">
                Your reservation at APKA INN has been saved for <strong>{guestEmail}</strong>.
              </p>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs text-left space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Booking Reference:</span>
                  <span className="font-mono font-bold text-blue-700">{confirmedRef}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Room Category:</span>
                  <span className="font-semibold text-gray-900">{selectedRoomType.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Dates:</span>
                  <span className="font-semibold text-gray-900">
                    {checkIn} to {checkOut} ({nights} nights)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount due:</span>
                  <span className="font-bold text-amber-700">{formatCurrency(grandTotal)}</span>
                </div>
              </div>

              <Button variant="outline" size="sm" onClick={() => setIsBooked(false)}>
                Make Another Direct Booking
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* Admin Configuration View */
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs max-w-2xl mx-auto space-y-4 text-xs">
          <h3 className="text-sm font-bold text-gray-900">Direct Engine Customization</h3>
          <p className="text-gray-500">
            Configure the embeddable direct reservation widget on your hotel website.
          </p>

          <div className="space-y-3">
            <div>
              <label className="font-bold text-gray-700 block mb-1">Direct Incentive Discount (%)</label>
              <input
                type="number"
                defaultValue={10}
                className="w-full h-8 px-3 rounded-lg border border-gray-300 font-bold"
              />
              <span className="text-[11px] text-gray-400">
                Promote direct bookings with guaranteed discount vs OTA commission.
              </span>
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">Hotel Contact WhatsApp</label>
              <input
                type="text"
                defaultValue="+91 484 235 6789"
                className="w-full h-8 px-3 rounded-lg border border-gray-300 font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">VPA / Merchant UPI ID</label>
              <input
                type="text"
                defaultValue="apkainn@hdfcbank"
                className="w-full h-8 px-3 rounded-lg border border-gray-300 font-mono"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
