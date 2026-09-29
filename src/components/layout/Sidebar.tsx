import React from 'react';
import {
  LayoutDashboard,
  CalendarRange,
  DoorOpen,
  BedDouble,
  Sparkles,
  Wrench,
  Tag,
  Layers,
  Radio,
  Globe,
  Users,
  MessageSquare,
  Receipt,
  CreditCard,
  FileText,
  BarChart3,
  Settings,
  UserCheck,
  History,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Shield,
  Building,
  Database,
  LogOut,
  KeyRound,
  X,
  Lock,
} from 'lucide-react';
import { UserRole, Tenant } from '../../types';
import { cn } from '../../utils/formatters';

export interface SidebarProps {
  currentView: string;
  onNavigate: (viewId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  currentRole: UserRole;
  mobileMenuOpen?: boolean;
  onCloseMobileMenu?: () => void;
  tenantFeatures?: Tenant['features'];
  tenantStatus?: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  allowedRoles?: UserRole[];
  featureFlag?: keyof Tenant['features'];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
  currentRole,
  mobileMenuOpen = false,
  onCloseMobileMenu,
  tenantFeatures,
  tenantStatus,
}) => {
  const sections: NavSection[] = [
    {
      title: 'Platform HQ',
      items: [
        {
          id: 'superadmin',
          label: 'Hotel Clients (SaaS)',
          icon: Shield,
          badge: 'HQ',
          allowedRoles: ['SIGNINN Super Admin'],
        },
      ],
    },
    {
      title: 'Operations',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
        },
        {
          id: 'reservations',
          label: 'Reservations',
          icon: CalendarRange,
          allowedRoles: ['Group Admin', 'Owner', 'Property Manager', 'Front Desk', 'Revenue Manager', 'Finance'],
        },
        {
          id: 'frontdesk',
          label: 'Front Desk',
          icon: DoorOpen,
          allowedRoles: ['Group Admin', 'Owner', 'Property Manager', 'Front Desk'],
        },
        {
          id: 'records',
          label: 'Master Records',
          icon: Database,
          allowedRoles: ['Group Admin', 'Owner', 'Property Manager'],
        },
        {
          id: 'rooms',
          label: 'Rooms',
          icon: BedDouble,
          allowedRoles: ['Group Admin', 'Owner', 'Property Manager', 'Front Desk', 'Night Auditor'],
        },
        {
          id: 'housekeeping',
          label: 'Housekeeping',
          icon: Sparkles,
          allowedRoles: ['Group Admin', 'Owner', 'Property Manager', 'Front Desk', 'Housekeeping'],
        },
        {
          id: 'maintenance',
          label: 'Maintenance',
          icon: Wrench,
          allowedRoles: ['Group Admin', 'Owner', 'Property Manager', 'Front Desk', 'Maintenance'],
        },
      ],
    },
    {
      title: 'Revenue',
      items: [
        {
          id: 'rates',
          label: 'Rates',
          icon: Tag,
          allowedRoles: ['Group Admin', 'Owner', 'Property Manager', 'Revenue Manager'],
        },
        {
          id: 'availability',
          label: 'Availability',
          icon: Layers,
          allowedRoles: ['Group Admin', 'Owner', 'Property Manager', 'Revenue Manager', 'Front Desk'],
        },
        {
          id: 'channels',
          label: 'Channel Manager',
          icon: Radio,
          featureFlag: 'otaChannelManager',
          allowedRoles: ['Group Admin', 'Owner', 'Property Manager', 'Revenue Manager'],
        },
        {
          id: 'booking-engine',
          label: 'Booking Engine',
          icon: Globe,
          featureFlag: 'directBookingEngine',
          allowedRoles: ['Group Admin', 'Owner', 'Property Manager', 'Revenue Manager'],
        },
      ],
    },
    {
      title: 'Guests',
      items: [
        {
          id: 'guests',
          label: 'Guest Profiles',
          icon: Users,
          allowedRoles: ['Group Admin', 'Owner', 'Property Manager', 'Front Desk', 'Finance'],
        },
        {
          id: 'messages',
          label: 'Messages',
          icon: MessageSquare,
          allowedRoles: ['Group Admin', 'Owner', 'Property Manager', 'Front Desk', 'Housekeeping'],
        },
      ],
    },
    {
      title: 'Finance',
      items: [
        {
          id: 'folios',
          label: 'Folios',
          icon: Receipt,
          allowedRoles: ['Group Admin', 'Owner', 'Property Manager', 'Front Desk', 'Finance'],
        },
        {
          id: 'payments',
          label: 'Payments',
          icon: CreditCard,
          allowedRoles: ['Group Admin', 'Owner', 'Property Manager', 'Front Desk', 'Finance'],
        },
        {
          id: 'invoices',
          label: 'Invoices',
          icon: FileText,
          allowedRoles: ['Group Admin', 'Owner', 'Property Manager', 'Front Desk', 'Finance'],
        },
      ],
    },
    {
      title: 'Analytics',
      items: [
        {
          id: 'reports',
          label: 'Reports',
          icon: BarChart3,
          featureFlag: 'advancedAnalytics',
          allowedRoles: ['Group Admin', 'Owner', 'Property Manager', 'Revenue Manager', 'Finance'],
        },
      ],
    },
    {
      title: 'Admin',
      items: [
        {
          id: 'settings-property',
          label: 'Property Settings',
          icon: Settings,
          allowedRoles: ['Group Admin', 'Owner', 'Property Manager'],
        },
        {
          id: 'settings-staff',
          label: 'Staff & Roles',
          icon: UserCheck,
          allowedRoles: ['Group Admin', 'Owner', 'Property Manager'],
        },
        {
          id: 'settings-audit',
          label: 'Audit Log',
          icon: History,
          allowedRoles: ['Group Admin', 'Owner', 'Property Manager', 'Finance'],
        },
      ],
    },
  ];

  const filterItem = (item: NavItem) => {
    // Super Admin ONLY sees Platform HQ ('superadmin') and no hotel operations
    if (currentRole === 'SIGNINN Super Admin') {
      return item.id === 'superadmin';
    }

    // Platform HQ is strictly for Super Admin
    if (item.id === 'superadmin') return false;

    // Check Role Restrictions
    if (item.allowedRoles && !item.allowedRoles.includes(currentRole)) {
      return false;
    }

    // Check Feature Flag entitlement
    if (item.featureFlag && tenantFeatures && !tenantFeatures[item.featureFlag]) {
      return false;
    }

    return true;
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 md:hidden transition-opacity duration-200"
          onClick={onCloseMobileMenu}
        />
      )}

      <aside
        className={cn(
          'bg-[#0c1322] text-slate-300 flex flex-col transition-all duration-200 ease-in-out border-r border-slate-800/70 select-none shrink-0',
          // Desktop behavior
          'hidden md:flex',
          isCollapsed ? 'md:w-16' : 'md:w-64',
          // Mobile Drawer behavior
          mobileMenuOpen && 'flex fixed inset-y-0 left-0 z-50 w-64 shadow-2xl'
        )}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80">
          {!isCollapsed || mobileMenuOpen ? (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center font-extrabold text-white tracking-wider text-sm shadow-md shadow-blue-900/40">
                S
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base tracking-tight text-white font-sans">
                    SIGNINN
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-blue-500/20 text-blue-400 border border-blue-400/30">
                    HMS
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium tracking-tight leading-none mt-0.5">
                  Hotel Operating System
                </span>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 mx-auto rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center font-extrabold text-white text-sm shadow-md shadow-blue-900/40">
              S
            </div>
          )}

          {/* Close button on Mobile Drawer */}
          {mobileMenuOpen && (
            <button
              onClick={onCloseMobileMenu}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close navigation"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tenant Suspended Warning in Sidebar */}
        {tenantStatus === 'Suspended' && currentRole !== 'SIGNINN Super Admin' && (!isCollapsed || mobileMenuOpen) && (
          <div className="mx-3 mt-3 px-3 py-2 rounded-xl bg-rose-950/80 border border-rose-700/60 text-xs text-rose-300 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="font-semibold">Account Suspended by HQ</span>
          </div>
        )}

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto py-3.5 px-3 space-y-5">
          {sections.map((sec) => {
            const visibleItems = sec.items.filter(filterItem);
            if (visibleItems.length === 0) return null;

            return (
              <div key={sec.title} className="space-y-1">
                {(!isCollapsed || mobileMenuOpen) && (
                  <div className="px-3 py-1 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                    {sec.title}
                  </div>
                )}
                {visibleItems.map((item) => {
                  const isActive = currentView === item.id;
                  const Icon = item.icon;
                  const isFeatureDisabled =
                    currentRole !== 'SIGNINN Super Admin' &&
                    tenantFeatures &&
                    item.featureFlag &&
                    tenantFeatures[item.featureFlag] === false;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.id);
                        if (onCloseMobileMenu) onCloseMobileMenu();
                      }}
                      title={isCollapsed && !mobileMenuOpen ? item.label : undefined}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer group',
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-sm shadow-blue-500/20'
                          : isFeatureDisabled
                          ? 'text-slate-400/70 hover:text-slate-200 hover:bg-slate-800/40'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/70',
                        isCollapsed && !mobileMenuOpen && 'justify-center px-0'
                      )}
                    >
                      <Icon
                        className={cn(
                          'w-4 h-4 shrink-0 transition-transform group-hover:scale-105 duration-150',
                          isActive
                            ? 'text-white'
                            : isFeatureDisabled
                            ? 'text-slate-400'
                            : 'text-slate-400 group-hover:text-slate-200'
                        )}
                      />
                      {(!isCollapsed || mobileMenuOpen) && (
                        <span className="truncate flex-1 text-left">{item.label}</span>
                      )}
                      {(!isCollapsed || mobileMenuOpen) && isFeatureDisabled && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                          Disabled
                        </span>
                      )}
                      {(!isCollapsed || mobileMenuOpen) && !isFeatureDisabled && item.badge && (
                        <span
                          className={cn(
                            'text-[10px] px-2 py-0.5 rounded-full font-bold',
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Auth Flow Quick Link */}
        <div className="p-3 border-t border-slate-800/70">
          <button
            onClick={() => {
              onNavigate('auth');
              if (onCloseMobileMenu) onCloseMobileMenu();
            }}
            title={isCollapsed && !mobileMenuOpen ? 'Switch User / Login' : undefined}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer text-slate-300 hover:text-white hover:bg-slate-800/70 bg-slate-800/40 border border-slate-700/40',
              currentView === 'auth' && 'bg-indigo-600 text-white font-semibold border-transparent shadow-sm shadow-indigo-600/30',
              isCollapsed && !mobileMenuOpen && 'justify-center px-0'
            )}
          >
            <KeyRound className="w-4 h-4 text-indigo-400 shrink-0" />
            {(!isCollapsed || mobileMenuOpen) && (
              <span className="truncate flex-1 text-left font-medium">Switch User / Demo</span>
            )}
          </button>
        </div>

        {/* Footer Tagline & Collapse toggle */}
        <div className="p-3 border-t border-slate-800/70 flex items-center justify-between text-slate-400 text-xs">
          {(!isCollapsed || mobileMenuOpen) && (
            <div className="flex flex-col">
              <span className="text-[11px] text-slate-300 font-medium">
                SIGNINN <span className="text-slate-400">v2.4</span>
              </span>
              <span className="text-[9px] text-slate-400 italic">
                Hotel Operating System
              </span>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer ml-auto"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>
    </>
  );
};
