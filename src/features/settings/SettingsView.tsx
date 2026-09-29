import React, { useState } from 'react';
import {
  Building2,
  Receipt,
  CreditCard,
  Bell,
  Globe,
  Save,
  CheckCircle2,
  Shield,
  Key,
  User,
  Smartphone,
  Mail,
  Lock,
  Eye,
  Laptop,
} from 'lucide-react';
import { Property, RoomType } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { Tabs } from '../../components/ui/Tabs';
import { useToast } from '../../components/ui/Toast';

export interface SettingsViewProps {
  property: Property;
  roomTypes: RoomType[];
  onUpdateProperty: (prop: Partial<Property>) => void | Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  property,
  roomTypes,
  onUpdateProperty,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'profile' | 'property' | 'gst' | 'payments' | 'channels'>('property');

  // User profile states
  const [userName, setUserName] = useState('Alex Morgan');
  const [userTitle, setUserTitle] = useState('General Manager / Portfolio Owner');
  const [userEmail, setUserEmail] = useState('alex.morgan@grandheritage.com');
  const [userPhone, setUserPhone] = useState('+91 98450 11223');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [nightAuditEmail, setNightAuditEmail] = useState(true);
  const [currencyPref, setCurrencyPref] = useState('INR');
  const [dateFormatPref, setDateFormatPref] = useState('DD/MM/YYYY');

  // Property form states
  const [name, setName] = useState(property.name);
  const [tagline, setTagline] = useState(property.tagline);
  const [phone, setPhone] = useState(property.phone);
  const [email, setEmail] = useState(property.email);
  const [address, setAddress] = useState(property.address);
  const [checkInTime, setCheckInTime] = useState(property.checkInTime);
  const [checkOutTime, setCheckOutTime] = useState(property.checkOutTime);
  const [gstin, setGstin] = useState(property.gstin);

  const handleSave = async () => {
    await onUpdateProperty({
      name,
      tagline,
      phone,
      email,
      address,
      checkInTime,
      checkOutTime,
      gstin,
    });
    showToast({
      title: 'Property Saved',
      description: 'Property details and operating parameters were updated.',
      type: 'success',
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-gray-700" />
            <h1 className="text-xl font-bold tracking-tight text-gray-950 font-sans">
              Property & Operational Settings
            </h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Global hotel configuration, GSTIN registration, standard checkout policies, and integrations.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          leftIcon={<Save className="w-3.5 h-3.5" />}
        >
          Save Changes
        </Button>
      </div>

      <Tabs
        variant="segmented"
        activeTab={activeTab}
        onChange={(t) => setActiveTab(t as any)}
        tabs={[
          { id: 'property', label: 'Hotel Profile & Policies' },
          { id: 'gst', label: 'GST & Tax Slabs' },
        ]}
      />

      {/* Tab 0: User Profile & Preferences */}
      {activeTab === 'profile' && (
        <div className="space-y-5 max-w-3xl">
          {/* Identity & Contact Card */}
          <div className="bg-white rounded-2xl border border-gray-200/85 p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white font-bold text-xl flex items-center justify-center shadow-sm">
                {userName.split(' ').map((n) => n[0]).join('')}
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">{userName}</h3>
                <p className="text-xs text-indigo-600 font-medium">{userTitle}</p>
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded mt-1 font-medium">
                  <CheckCircle2 className="w-3 h-3" /> SIGNINN Verified Administrator
                </span>
              </div>
              <Button
                variant="outline"
                size="xs"
                className="ml-auto"
                onClick={() => showToast({ title: 'Avatar Update', description: 'Upload dialog initialized.', type: 'info' })}
              >
                Change Photo
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Legal Name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
              <Input
                label="Designation / Role"
                value={userTitle}
                onChange={(e) => setUserTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Primary Business Email"
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
              />
              <Input
                label="Mobile Phone (SMS & 2FA)"
                type="tel"
                value={userPhone}
                onChange={(e) => setUserPhone(e.target.value)}
              />
            </div>
          </div>

          {/* Security & Multi-Factor Authentication */}
          <div className="bg-white rounded-2xl border border-gray-200/85 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-600" />
                  Security & Multi-Factor Authentication (MFA)
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Protect your hotel property with enterprise-grade sign-in security.
                </p>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              <div className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-gray-900">Two-Factor Authentication (2FA)</div>
                  <div className="text-[11px] text-gray-500">
                    Require a 6-digit TOTP code via Google Authenticator or 1Password.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={twoFactorEnabled}
                    onChange={(e) => {
                      setTwoFactorEnabled(e.target.checked);
                      showToast({
                        title: e.target.checked ? '2FA Enabled' : '2FA Disabled',
                        description: 'Account security preference updated.',
                        type: 'info',
                      });
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-gray-900">Account Password</div>
                  <div className="text-[11px] text-gray-500">Last changed 42 days ago (TLS 1.3 encrypted)</div>
                </div>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => showToast({ title: 'Password Reset', description: 'Verification link sent to your registered email.', type: 'info' })}
                >
                  Change Password
                </Button>
              </div>

              <div className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Laptop className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-xs font-semibold text-gray-900">Active Web Session</div>
                    <div className="text-[11px] text-gray-500">Chrome on macOS • Mumbai, India (Current Device)</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  Active Now
                </span>
              </div>
            </div>
          </div>

          {/* Operational Notification Preferences */}
          <div className="bg-white rounded-2xl border border-gray-200/85 p-6 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-600" />
              Operational Notification Preferences
            </h3>

            <div className="space-y-2.5 text-xs">
              <label className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 cursor-pointer">
                <div>
                  <span className="font-semibold text-gray-800 block">Instant VIP Arrival Alerts</span>
                  <span className="text-[11px] text-gray-500">Get push notification when high-tier loyalty guests check in.</span>
                </div>
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 cursor-pointer">
                <div>
                  <span className="font-semibold text-gray-800 block">Night Audit Summary Report (PDF)</span>
                  <span className="text-[11px] text-gray-500">Automated midnight email with ADR, RevPAR, and revenue breakdown.</span>
                </div>
                <input
                  type="checkbox"
                  checked={nightAuditEmail}
                  onChange={(e) => setNightAuditEmail(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 cursor-pointer">
                <div>
                  <span className="font-semibold text-gray-800 block">OTA Rate Parity Warnings</span>
                  <span className="text-[11px] text-gray-500">Immediate alert when Booking.com or MMT rates undercut direct pricing.</span>
                </div>
                <input
                  type="checkbox"
                  checked={smsAlerts}
                  onChange={(e) => setSmsAlerts(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Tab 1: Hotel Profile */}
      {activeTab === 'property' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs space-y-4 max-w-3xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Property Trade Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label="Tagline / Brand Position"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Official Front Desk Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              label="Reservations Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <Input
            label="Postal Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <Input
              label="Standard Check-in Time"
              value={checkInTime}
              onChange={(e) => setCheckInTime(e.target.value)}
            />
            <Input
              label="Standard Check-out Time"
              value={checkOutTime}
              onChange={(e) => setCheckOutTime(e.target.value)}
            />
            <Input label="Currency" defaultValue="INR (₹)" disabled />
            <Input label="Timezone" defaultValue="Asia/Kolkata (IST)" disabled />
          </div>
        </div>
      )}

      {/* Tab 2: GST Settings */}
      {activeTab === 'gst' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs space-y-4 max-w-3xl text-xs">
          <h3 className="text-sm font-bold text-gray-900">Goods and Services Tax (GST) Parameters</h3>
          <p className="text-gray-500">
            Compliant with Indian Hotel Tariff slabs (SAC 996311)
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Hotel GSTIN *"
              value={gstin}
              onChange={(e) => setGstin(e.target.value)}
              className="font-mono"
            />
            <Input
              label="PAN Number"
              defaultValue="AABCS1429B"
              disabled
              className="font-mono"
            />
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
            <span className="font-bold text-gray-900 block">Current Tariff Tax Slabs:</span>
            <div className="flex justify-between py-1 border-b border-gray-200">
              <span>Room Tariff &le; ₹7,500/night:</span>
              <strong className="font-mono">12% GST (6% CGST + 6% SGST)</strong>
            </div>
            <div className="flex justify-between py-1">
              <span>Room Tariff &gt; ₹7,500/night:</span>
              <strong className="font-mono">18% GST (9% CGST + 9% SGST)</strong>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Payment Gateways */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs space-y-4 max-w-3xl text-xs">
          <h3 className="text-sm font-bold text-gray-900">Payment Processors & QR Rails</h3>

          <div className="space-y-3">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
              <div>
                <strong className="text-gray-900 block">UPI Direct Rail (Zero Fee)</strong>
                <span className="text-gray-500 text-[11px]">Merchant VPA: apkainn@hdfcbank</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Active & Live
              </span>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
              <div>
                <strong className="text-gray-900 block">Razorpay PG Gateway</strong>
                <span className="text-gray-500 text-[11px]">Webhooks enabled for credit card / netbanking</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                Connected (Test Mode)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: API Integrations */}
      {activeTab === 'channels' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs space-y-3 max-w-3xl text-xs">
          <h3 className="text-sm font-bold text-gray-900">Third-Party Connectivity</h3>
          <p className="text-gray-500">API connection credentials for Channel Managers and WhatsApp Business.</p>

          <div className="divide-y divide-gray-100 border rounded-xl overflow-hidden">
            <div className="p-3 flex justify-between items-center">
              <div>
                <strong>WhatsApp Cloud API (Meta)</strong>
                <div className="text-gray-500 text-[11px]">Automated guest messaging pipeline</div>
              </div>
              <span className="text-emerald-700 font-bold">Connected</span>
            </div>
            <div className="p-3 flex justify-between items-center">
              <div>
                <strong>Channex / SiteMinder API Bridge</strong>
                <div className="text-gray-500 text-[11px]">OTA two-way XML distribution</div>
              </div>
              <span className="text-emerald-700 font-bold">Connected</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
