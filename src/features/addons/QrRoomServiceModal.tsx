import React, { useState } from 'react';
import {
  QrCode,
  UtensilsCrossed,
  Printer,
  Sparkles,
  CheckCircle2,
  Coffee,
  Wine,
  Clock,
  Plus,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { Property, Room } from '../../types';

export interface QrRoomServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProperty: Property | null;
  rooms?: Room[];
}

interface MenuItem {
  id: string;
  name: string;
  category: 'Breakfast' | 'Mains' | 'Beverages' | 'Desserts';
  price: number;
  prepTime: string;
  veg: boolean;
  popular?: boolean;
}

const SAMPLE_MENU: MenuItem[] = [
  { id: 'm1', name: 'Kerala Malabar Parotta with Chicken Curry', category: 'Mains', price: 420, prepTime: '25 min', veg: false, popular: true },
  { id: 'm2', name: 'Appam with Vegetable Stew', category: 'Breakfast', price: 290, prepTime: '20 min', veg: true, popular: true },
  { id: 'm3', name: 'Paneer Butter Masala with Butter Naan', category: 'Mains', price: 380, prepTime: '20 min', veg: true },
  { id: 'm4', name: 'Club Sandwich with Masala Fries', category: 'Mains', price: 310, prepTime: '15 min', veg: true },
  { id: 'm5', name: 'Traditional South Indian Filter Coffee', category: 'Beverages', price: 120, prepTime: '10 min', veg: true, popular: true },
  { id: 'm6', name: 'Fresh Coconut Water & Lime Cooler', category: 'Beverages', price: 160, prepTime: '5 min', veg: true },
  { id: 'm7', name: 'Warm Chocolate Lava Cake with Ice Cream', category: 'Desserts', price: 260, prepTime: '15 min', veg: true },
];

export const QrRoomServiceModal: React.FC<QrRoomServiceModalProps> = ({
  isOpen,
  onClose,
  currentProperty,
  rooms = [],
}) => {
  const { showToast } = useToast();
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string>('204');
  const [activeTab, setActiveTab] = useState<'preview' | 'cards' | 'menu'>('preview');
  const [cart, setCart] = useState<{ item: MenuItem; qty: number }[]>([
    { item: SAMPLE_MENU[0], qty: 1 },
    { item: SAMPLE_MENU[4], qty: 2 },
  ]);

  const hotelName = currentProperty?.name || 'Selected property';
  const cartTotal = cart.reduce((sum, line) => sum + line.item.price * line.qty, 0);
  const gstAmount = Math.round(cartTotal * 0.05);
  const grandTotal = cartTotal + gstAmount;

  const handleSimulateOrder = () => {
    showToast({
      title: 'Room Service Order Received',
      description: `₹${grandTotal.toLocaleString()} charged to Room #${selectedRoomNumber} Folio. Kitchen ticket KOT-${Math.floor(1000 + Math.random() * 9000)} printed.`,
      type: 'success',
    });
  };

  const handlePrintCard = () => {
    showToast({
      title: 'QR Tent Card Ready',
      description: `Generating high-res printable PDF tent card for Room #${selectedRoomNumber}.`,
      type: 'info',
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="QR Code Room Service & In-Room Dining (Add-on)"
      size="xl"
    >
      <div className="space-y-4 text-xs">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 p-4 rounded-xl border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-950 text-sm">Contactless Digital Room Dining</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  Active Add-on
                </span>
              </div>
              <p className="text-gray-600 text-xs mt-0.5">
                Guests scan in-room QR code tent cards on their smartphones to order food & amenities directly to their room folio without downloading an app.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === 'preview' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('preview')}
            >
              Guest Menu View
            </Button>
            <Button
              variant={activeTab === 'cards' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('cards')}
            >
              Printable QR Stand
            </Button>
          </div>
        </div>

        {/* Guest Mobile Simulator View */}
        {activeTab === 'preview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Left: Menu Picker */}
            <div className="md:col-span-2 space-y-3 bg-white p-4 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">In-Room Dining Menu</h4>
                  <p className="text-[11px] text-gray-500">Live digital menu served by {hotelName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Simulate Room:</span>
                  <select
                    value={selectedRoomNumber}
                    onChange={(e) => setSelectedRoomNumber(e.target.value)}
                    className="px-2 py-1 bg-gray-50 border border-gray-300 rounded font-semibold text-xs"
                  >
                    <option value="101">Room 101</option>
                    <option value="102">Room 102</option>
                    <option value="204">Room 204</option>
                    <option value="305">Room 305 (Suite)</option>
                    <option value="401">Room 401</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {SAMPLE_MENU.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center text-[8px] font-bold ${
                          item.veg ? 'border-emerald-600 text-emerald-600' : 'border-rose-600 text-rose-600'
                        }`}>
                          ●
                        </span>
                        <span className="font-semibold text-gray-900 text-xs truncate">{item.name}</span>
                        {item.popular && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">
                            Chef Special
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-gray-500">
                        <span>{item.category}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" /> {item.prepTime}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-bold text-gray-900 text-xs">₹{item.price}</span>
                      <button
                        onClick={() => {
                          const existing = cart.find((c) => c.item.id === item.id);
                          if (existing) {
                            setCart(cart.map((c) => (c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c)));
                          } else {
                            setCart([...cart, { item, qty: 1 }]);
                          }
                          showToast({ title: 'Added to Cart', description: `${item.name} added`, type: 'info' });
                        }}
                        className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Guest Mobile Cart & Folio Post Preview */}
            <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-col justify-between shadow-md space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Guest Mobile Order</span>
                    <h5 className="font-bold text-white text-xs">Room #{selectedRoomNumber} Tray</h5>
                  </div>
                  <Badge variant="status" status="Active" size="sm">Online</Badge>
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {cart.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-xs">Cart is empty</div>
                  ) : (
                    cart.map((line) => (
                      <div key={line.item.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/60">
                        <div>
                          <div className="font-medium text-slate-200">{line.item.name}</div>
                          <div className="text-[10px] text-slate-400">Qty: {line.qty} × ₹{line.item.price}</div>
                        </div>
                        <span className="font-bold text-slate-100">₹{line.item.price * line.qty}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal:</span>
                    <span>₹{cartTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>GST (5% F&B SAC 996331):</span>
                    <span>₹{gstAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-white font-bold text-sm pt-1 border-t border-slate-800">
                    <span>Total Folio Charge:</span>
                    <span className="text-emerald-400">₹{grandTotal.toLocaleString()}</span>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSimulateOrder}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                >
                  Confirm & Post to Folio
                </Button>
                <div className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Auto-generates kitchen ticket (KOT) & folio item
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Printable QR Stand View */}
        {activeTab === 'cards' && (
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center space-y-4">
            <div className="bg-white p-6 rounded-2xl shadow-md border-2 border-slate-900 max-w-xs w-full space-y-4">
              <div className="space-y-1">
                <div className="text-xs font-bold uppercase tracking-wider text-blue-700">{hotelName}</div>
                <h4 className="text-base font-extrabold text-gray-950">Room #{selectedRoomNumber}</h4>
                <p className="text-[11px] text-gray-500">Scan to Order Room Dining & Minibar</p>
              </div>

              {/* Simulated QR graphic */}
              <div className="w-44 h-44 mx-auto bg-slate-950 p-3 rounded-xl flex items-center justify-center text-white relative group">
                <div className="w-full h-full border-4 border-dashed border-slate-400 rounded-lg flex flex-col items-center justify-center p-2 text-center">
                  <QrCode className="w-24 h-24 text-white" />
                  <span className="text-[9px] font-mono text-emerald-400 font-bold mt-1">signinn.link/r{selectedRoomNumber}</span>
                </div>
              </div>

              <div className="text-[10px] text-gray-500 leading-tight">
                No app install required. Scan with camera to browse menu, order amenities, or request towel replenishment.
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="primary" size="sm" onClick={handlePrintCard}>
                <Printer className="w-3.5 h-3.5 mr-1" />
                Print Acrylic Tent Stand (PDF)
              </Button>
              <Button variant="outline" size="sm" onClick={() => setActiveTab('preview')}>
                Back to Simulator
              </Button>
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>Module status: Fully integrated with Guest Folio SAC 996331</span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
