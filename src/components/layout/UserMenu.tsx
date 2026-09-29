import React, { useState } from 'react';
import { UserRole } from '../../types';
import {
  User,
  ShieldCheck,
  Settings,
  HelpCircle,
  LogOut,
  ChevronDown,
  Building,
  Check,
  Shield,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';

export interface UserMenuProps {
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  onNavigate: (viewId: string) => void;
  onOpenOnboarding?: () => void;
}

const ROLES: { role: UserRole; label: string; desc: string; isPlatformSuperAdmin?: boolean }[] = [
  { role: 'SIGNINN Super Admin', label: 'Platform Super Admin', desc: 'SaaS multi-tenant control & client provisioning', isPlatformSuperAdmin: true },
  { role: 'Group Admin', label: 'Group Admin', desc: 'Full portfolio & multi-property admin' },
  { role: 'Owner', label: 'Owner / Executive', desc: 'Financial flash, revenue & performance' },
  { role: 'Property Manager', label: 'Property General Manager', desc: 'Operations, rates, staff & OTAs' },
  { role: 'Front Desk', label: 'Front Desk Agent', desc: 'Arrivals, check-in/out, folios & rooms' },
  { role: 'Housekeeping', label: 'Housekeeping Supervisor', desc: 'Turnover, inspection & room conditions' },
  { role: 'Finance', label: 'Finance & Accounts', desc: 'Ledger folios, billing, invoices & GST' },
  { role: 'Maintenance', label: 'Maintenance & Engineering', desc: 'Facility repairs, room blocks & tickets' },
  { role: 'Revenue Manager', label: 'Revenue Manager', desc: 'Dynamic rates, yield & OTA channel sync' },
];

export const UserMenu: React.FC<UserMenuProps> = ({
  currentRole,
  onSelectRole,
  onNavigate,
  onOpenOnboarding,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const currentUser = useAppStore((state) => state.currentUser);
  const isSuperAdmin = currentRole === 'SIGNINN Super Admin';

  const userName = currentUser?.name || (isSuperAdmin ? 'Platform Administrator' : 'Signed-in user');
  const userEmail = currentUser?.email || 'No email available';
  const userInitials = userName.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <div className="relative">
      {/* Trigger Button: Clean Profile Avatar with Role Pill */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setShowRoleSelector(false);
        }}
        className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all cursor-pointer group shadow-2xs"
        aria-label="User account menu"
      >
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-2xs ${
            isSuperAdmin ? 'bg-purple-700 ring-2 ring-purple-200' : 'bg-[#172033] ring-2 ring-slate-200'
          }`}
        >
          {userInitials}
        </div>
        <div className="hidden xl:flex flex-col text-left">
          <span className="text-xs font-semibold text-gray-900 leading-tight">
            {userName}
          </span>
          <span className="text-[10px] text-gray-500 leading-tight truncate max-w-[90px]">
            {currentRole}
          </span>
        </div>
        <ChevronDown className="w-3 h-3 text-gray-400 group-hover:text-gray-600 shrink-0" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-40 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* User Profile Header */}
            <div className="p-3.5 bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-100 flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-2xs ${
                  isSuperAdmin ? 'bg-purple-700 ring-2 ring-purple-200' : 'bg-[#172033] ring-2 ring-slate-200'
                }`}
              >
                {userInitials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-gray-900 truncate">{userName}</div>
                <div className="text-[11px] text-gray-500 font-mono truncate">{userEmail}</div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      isSuperAdmin
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {currentRole}
                  </span>
                </div>
              </div>
            </div>

            {!showRoleSelector ? (
              <>
                {/* Standard Account Actions */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onNavigate('settings-property');
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-gray-400" />
                    <span>Property Settings</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onNavigate('settings-staff');
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer"
                  >
                    <User className="w-4 h-4 text-gray-400" />
                    <span>Staff & Access Management</span>
                  </button>

                </div>

                {/* Logout Action */}
                <div className="py-1 border-t border-gray-100">
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onNavigate('auth');
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer font-medium"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            ) : (
              /* Role Selection Sub-View */
              <div className="py-1">
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                    Select Active Role
                  </span>
                  <button
                    onClick={() => setShowRoleSelector(false)}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                  >
                    Back
                  </button>
                </div>

                <div className="max-h-64 overflow-y-auto py-1">
                  {ROLES.map(({ role, label, desc, isPlatformSuperAdmin }) => {
                    const isSelected = currentRole === role;
                    return (
                      <button
                        key={role}
                        onClick={() => {
                          onSelectRole(role);
                          setIsOpen(false);
                          setShowRoleSelector(false);
                        }}
                        className={`w-full flex items-start justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-gray-50 cursor-pointer ${
                          isSelected
                            ? isPlatformSuperAdmin
                              ? 'bg-purple-50 text-purple-900 font-semibold'
                              : 'bg-blue-50/70 text-blue-700 font-semibold'
                            : isPlatformSuperAdmin
                            ? 'bg-purple-50/30 text-purple-950 hover:bg-purple-50'
                            : 'text-gray-800'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold leading-tight">{label}</span>
                            {isPlatformSuperAdmin && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-200 text-purple-800">
                                HQ
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-400 leading-tight mt-0.5 line-clamp-1">
                            {desc}
                          </div>
                        </div>
                        {isSelected && (
                          <Check
                            className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                              isPlatformSuperAdmin ? 'text-purple-700' : 'text-blue-600'
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
