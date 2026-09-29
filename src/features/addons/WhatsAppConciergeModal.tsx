import React, { useState } from 'react';
import {
  MessageSquare,
  Bot,
  Send,
  Sparkles,
  PhoneCall,
  CheckCheck,
  CheckCircle2,
  Calendar,
  CreditCard,
  Building,
  Key,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { Property } from '../../types';

export interface WhatsAppConciergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProperty: Property | null;
}

interface AutomationTemplate {
  id: string;
  title: string;
  trigger: string;
  enabled: boolean;
  sampleMessage: string;
}

export const WhatsAppConciergeModal: React.FC<WhatsAppConciergeModalProps> = ({
  isOpen,
  onClose,
  currentProperty,
}) => {
  const { showToast } = useToast();
  const hotelName = currentProperty?.name || 'Selected property';

  const [templates, setTemplates] = useState<AutomationTemplate[]>([
    {
      id: 'tmpl-1',
      title: 'Instant Booking Voucher & Confirmation',
      trigger: 'Triggered upon reservation confirmation',
      enabled: true,
      sampleMessage: `Namaste Priya! 🙏\n\nYour stay at ${hotelName} is confirmed!\n\n📅 Dates: 20-22 Sep\n🏨 Room: Deluxe Sea View\n🧾 Booking ID: #RES-9482\n\nClick here for directions & digital keycard pass:\nsigninn.link/v/RES-9482`,
    },
    {
      id: 'tmpl-2',
      title: 'Pre-Arrival Contactless Registration Link',
      trigger: 'Sent 24 hours prior to check-in (12:00 PM)',
      enabled: true,
      sampleMessage: `Dear Priya, we look forward to welcoming you tomorrow at ${hotelName}!\n\nSkip the reception queue by pre-uploading your Aadhaar/Passport:\nsigninn.link/checkin/RES-9482`,
    },
    {
      id: 'tmpl-3',
      title: 'Wi-Fi Password & In-Stay Concierge Bot',
      trigger: 'Triggered when Front Desk clicks "Check In"',
      enabled: true,
      sampleMessage: `Welcome to Room 204! 🌴\n\nHigh-Speed Wi-Fi: ${hotelName}_Guest\nPassword: azureluxury2026\n\nReply anytime with "Room Service", "Housekeeping", or "Late Checkout" for instant assistance.`,
    },
    {
      id: 'tmpl-4',
      title: 'Express Checkout & GST Folio Invoice Link',
      trigger: 'Sent morning of departure (8:00 AM)',
      enabled: false,
      sampleMessage: `Good morning! We hope you enjoyed your stay at ${hotelName}.\n\nReview your bill & settle via UPI/Card link:\nsigninn.link/pay/FOL-204`,
    },
  ]);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('tmpl-1');
  const [testPhone, setTestPhone] = useState('+91 98470 55443');

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];

  const handleToggleTemplate = (id: string) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t))
    );
    showToast({
      title: 'Automation Rule Updated',
      description: 'Template trigger configuration saved.',
      type: 'info',
    });
  };

  const handleSendTest = () => {
    showToast({
      title: 'WhatsApp Dispatched',
      description: `Test message sent via Official WhatsApp Cloud API to ${testPhone}.`,
      type: 'success',
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="WhatsApp Booking & AI Guest Concierge (Add-on)"
      size="xl"
    >
      <div className="space-y-4 text-xs">
        {/* Banner */}
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100/50 p-4 rounded-xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-950 text-sm">Official WhatsApp Business API</span>
                <Badge variant="status" status="Active" size="sm">Meta Verified</Badge>
              </div>
              <p className="text-gray-600 text-xs mt-0.5">
                Automated 2-way WhatsApp vouchers, pre-arrival verification, and interactive guest AI concierge bot.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-emerald-900 bg-white/80 px-2.5 py-1 rounded-lg border border-emerald-300">
              ⚡ 99.4% Read Rate
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Templates list */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
              Automated Lifecycle Triggers
            </h4>
            <div className="space-y-2">
              {templates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() => setSelectedTemplateId(tmpl.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedTemplateId === tmpl.id
                      ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-500'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-gray-900 text-xs">{tmpl.title}</div>
                      <div className="text-[10px] text-gray-500">{tmpl.trigger}</div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleTemplate(tmpl.id);
                      }}
                      className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        tmpl.enabled ? 'bg-emerald-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                          tmpl.enabled ? 'translate-x-3' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Test Send Box */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
              <label className="block text-[11px] font-semibold text-gray-700">
                Send Live Test Message
              </label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                />
                <Button variant="primary" size="sm" onClick={handleSendTest} className="bg-emerald-600 hover:bg-emerald-700">
                  <Send className="w-3.5 h-3.5 mr-1" />
                  Send Test
                </Button>
              </div>
            </div>
          </div>

          {/* Smartphone WhatsApp Chat Preview */}
          <div className="bg-[#0b141a] text-white p-4 rounded-2xl shadow-md flex flex-col justify-between space-y-3">
            <div className="flex items-center gap-2 pb-2.5 border-b border-[#202c33]">
              <div className="w-7 h-7 rounded-full bg-emerald-700 flex items-center justify-center text-white font-bold text-xs">
                {hotelName.slice(0, 1)}
              </div>
              <div>
                <div className="font-bold text-xs text-white">{hotelName}</div>
                <div className="text-[10px] text-emerald-400">Official Business Account • Online</div>
              </div>
            </div>

            {/* Message Bubble */}
            <div className="bg-[#005c4b] text-white p-3.5 rounded-xl rounded-tl-none space-y-2 text-xs max-w-sm ml-auto whitespace-pre-line leading-relaxed shadow-sm">
              {selectedTemplate.sampleMessage}
              <div className="flex items-center justify-end gap-1 text-[9px] text-emerald-200 pt-1">
                <span>12:45 PM</span>
                <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
              </div>
            </div>

            <div className="p-2 bg-[#202c33] rounded-lg text-[10px] text-gray-400 text-center">
              Template: <strong>{selectedTemplate.title}</strong> • Automated trigger active
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>Official Meta WhatsApp Cloud API Provider</span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
