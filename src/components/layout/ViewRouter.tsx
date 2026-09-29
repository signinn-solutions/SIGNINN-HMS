import React from 'react';
import { Lock, ShieldAlert, Sparkles } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { useToast } from '../ui/Toast';

// Feature Views
import { DashboardView } from '../../features/dashboard/DashboardView';
import { ReservationCalendar } from '../../features/reservations/ReservationCalendar';
import { FrontDeskView } from '../../features/frontdesk/FrontDeskView';
import { RoomManagementView } from '../../features/rooms/RoomManagementView';
import { DataManagementView } from '../../features/data/DataManagementView';
import { HousekeepingView } from '../../features/housekeeping/HousekeepingView';
import { MaintenanceView } from '../../features/maintenance/MaintenanceView';
import { RatesView } from '../../features/rates/RatesView';
import { AvailabilityView } from '../../features/rates/AvailabilityView';
import { ChannelsView } from '../../features/channels/ChannelsView';
import { BookingEngineView } from '../../features/bookingengine/BookingEngineView';
import { GuestProfilesView } from '../../features/guests/GuestProfilesView';
import { MessagesView } from '../../features/messages/MessagesView';
import { FoliosView } from '../../features/folios/FoliosView';
import { PaymentsView } from '../../features/payments/PaymentsView';
import { InvoicesView } from '../../features/invoices/InvoicesView';
import { ReportsView } from '../../features/reports/ReportsView';
import { SettingsView } from '../../features/settings/SettingsView';
import { StaffRolesView } from '../../features/settings/StaffRolesView';
import { AuditLogView } from '../../features/settings/AuditLogView';
import { SuperAdminView } from '../../features/superadmin/SuperAdminView';
import { OnboardingWizard } from '../../features/onboarding/OnboardingWizard';
import { QrRoomServiceModal } from '../../features/addons/QrRoomServiceModal';
import { WhatsAppConciergeModal } from '../../features/addons/WhatsAppConciergeModal';

// React Query Hooks
import {
  useTenantsQuery,
  usePropertiesQuery,
  useRoomsQuery,
  useRoomTypesQuery,
  useReservationsQuery,
  useGuestsQuery,
  useFoliosQuery,
  usePaymentsQuery,
  useInvoicesQuery,
  useHousekeepingTasksQuery,
  useMaintenanceTicketsQuery,
  useChannelsQuery,
  useRatePlansQuery,
  useStaffMembersQuery,
  useAuditLogsQuery,
  useCreateReservationMutation,
  useReassignRoomMutation,
  useUpdateHousekeepingMutation,
  useUpdateMaintenanceMutation,
  useRecordPaymentMutation,
  useAddFolioChargeMutation,
  useProvisionTenantMutation,
  useUpdateTenantStatusMutation,
  useUpdateTenantPlanMutation,
  useUpdateTenantFeaturesMutation,
  useToggleTenantDeletionMutation,
  useRecordTenantSubscriptionPaymentMutation,
  useDeleteTenantMutation,
  useUpdateChannelMarkupMutation,
  useToggleChannelStatusMutation,
  useForceChannelSyncMutation,
  useCreateMaintenanceTicketMutation,
  useUpdateMaintenanceTicketStatusMutation,
  useUpdateHousekeepingTaskStatusMutation,
  useToggleHousekeepingItemMutation,
  useUpdateRatePlanMutation,
  useMessageThreadsQuery,
  useSendMessageMutation,
  useUpdatePropertyMutation,
  useAddStaffMutation,
  useUpdateStaffStatusMutation,
  useUpdateStaffMutation,
  useRecordDirectPaymentMutation,
} from '../../services/api/queries';

export const ViewRouter: React.FC = () => {
  const { showToast } = useToast();

  const {
    currentRole,
    currentTenantId,
    currentProperty,
    currentView,
    isOnboardingOpen,
    setCurrentRole,
    setCurrentTenantId,
    setCurrentProperty,
    setCurrentView,
    setDetailResId,
    setCheckInResId,
    setCheckOutResId,
    setWalkInRoomId,
    setIsNewResOpen,
    setIsWalkInOpen,
    setIsOnboardingOpen,
  } = useAppStore();

  // Queries
  const { data: tenants = [] } = useTenantsQuery();
  const { data: properties = [] } = usePropertiesQuery();
  const { data: rooms = [] } = useRoomsQuery(currentProperty?.id);
  const { data: roomTypes = [] } = useRoomTypesQuery(currentProperty?.id);
  const { data: reservations = [] } = useReservationsQuery(currentProperty?.id);
  const { data: guests = [] } = useGuestsQuery();
  const { data: folios = [] } = useFoliosQuery();
  const { data: payments = [] } = usePaymentsQuery();
  const { data: invoices = [] } = useInvoicesQuery();
  const { data: housekeepingTasks = [] } = useHousekeepingTasksQuery();
  const { data: maintenanceTickets = [] } = useMaintenanceTicketsQuery();
  const { data: channels = [] } = useChannelsQuery();
  const { data: ratePlans = [] } = useRatePlansQuery();
  const { data: staffList = [] } = useStaffMembersQuery();
  const { data: auditLogs = [] } = useAuditLogsQuery();

  // Mutations
  const createResMutation = useCreateReservationMutation();
  const reassignRoomMutation = useReassignRoomMutation();
  const updateHskMutation = useUpdateHousekeepingMutation();
  const updateMntMutation = useUpdateMaintenanceMutation();
  const recordPaymentMutation = useRecordPaymentMutation();
  const addFolioChargeMutation = useAddFolioChargeMutation();
  const provisionTenantMutation = useProvisionTenantMutation();
  const updateTenantStatusMutation = useUpdateTenantStatusMutation();
  const updateTenantPlanMutation = useUpdateTenantPlanMutation();
  const updateTenantFeaturesMutation = useUpdateTenantFeaturesMutation();
  const toggleTenantDeletionMutation = useToggleTenantDeletionMutation();
  const recordTenantPaymentMutation = useRecordTenantSubscriptionPaymentMutation();
  const deleteTenantMutation = useDeleteTenantMutation();
  const updateChannelMarkupMutation = useUpdateChannelMarkupMutation();
  const toggleChannelStatusMutation = useToggleChannelStatusMutation();
  const forceChannelSyncMutation = useForceChannelSyncMutation();
  const createMaintenanceTicketMutation = useCreateMaintenanceTicketMutation();
  const updateMaintenanceTicketStatusMutation = useUpdateMaintenanceTicketStatusMutation();
  const updateHskTaskStatusMutation = useUpdateHousekeepingTaskStatusMutation();
  const toggleHskItemMutation = useToggleHousekeepingItemMutation();
  const updateRatePlanMutation = useUpdateRatePlanMutation();
  const { data: messageThreads = [] } = useMessageThreadsQuery();
  const sendMessageMutation = useSendMessageMutation();
  const updatePropertyMutation = useUpdatePropertyMutation();
  const addStaffMutation = useAddStaffMutation();
  const updateStaffStatusMutation = useUpdateStaffStatusMutation();
  const updateStaffMutation = useUpdateStaffMutation();
  const recordDirectPaymentMutation = useRecordDirectPaymentMutation();

  const currentTenant = tenants.find((t) => t.id === currentTenantId) || tenants[0];
  const isSuperAdmin = currentRole === 'SIGNINN Super Admin';
  const isFrontDesk = currentRole === 'Front Desk';

  const ROLE_ALLOWED_VIEWS: Record<string, string[]> = {
    'SIGNINN Super Admin': ['superadmin'],
    'Owner': ['dashboard', 'reservations', 'frontdesk', 'records', 'rooms', 'housekeeping', 'maintenance', 'rates', 'availability', 'channels', 'booking-engine', 'guests', 'messages', 'folios', 'payments', 'invoices', 'reports', 'settings-property', 'settings-staff', 'settings-audit'],
    'Group Admin': ['dashboard', 'reservations', 'frontdesk', 'records', 'rooms', 'housekeeping', 'maintenance', 'rates', 'availability', 'channels', 'booking-engine', 'guests', 'messages', 'folios', 'payments', 'invoices', 'reports', 'settings-property', 'settings-staff', 'settings-audit'],
    'Property Manager': ['dashboard', 'reservations', 'frontdesk', 'records', 'rooms', 'housekeeping', 'maintenance', 'rates', 'availability', 'channels', 'booking-engine', 'guests', 'messages', 'folios', 'payments', 'invoices', 'reports', 'settings-property', 'settings-staff', 'settings-audit'],
    'Front Desk': ['dashboard', 'reservations', 'frontdesk', 'rooms', 'housekeeping', 'maintenance', 'availability', 'guests', 'messages', 'folios', 'payments'],
    'Front Desk Agent': ['dashboard', 'reservations', 'frontdesk', 'rooms', 'housekeeping', 'maintenance', 'availability', 'guests', 'messages', 'folios', 'payments'],
    'Night Auditor': ['dashboard', 'reservations', 'frontdesk', 'rooms', 'guests', 'messages', 'folios', 'payments', 'invoices', 'reports'],
    'Housekeeping': ['dashboard', 'housekeeping', 'messages'],
    'Maintenance': ['dashboard', 'maintenance', 'messages'],
    'Revenue Manager': ['dashboard', 'reservations', 'rates', 'availability', 'channels', 'booking-engine', 'reports'],
    'Finance': ['dashboard', 'reservations', 'guests', 'folios', 'payments', 'invoices', 'reports', 'settings-audit'],
  };

  const allowedViews = ROLE_ALLOWED_VIEWS[currentRole] || ['dashboard'];
  const isCurrentViewRestricted = !allowedViews.includes(currentView);

  // Feature Flag disabled views for non-superadmin:
  const isOtaDisabled =
    !isSuperAdmin &&
    currentView === 'channels' &&
    currentTenant?.features?.otaChannelManager === false;
  const isBookingEngineDisabled =
    !isSuperAdmin &&
    currentView === 'booking-engine' &&
    currentTenant?.features?.directBookingEngine === false;
  const isReportsDisabled =
    !isSuperAdmin &&
    currentView === 'reports' &&
    currentTenant?.features?.advancedAnalytics === false;
  const isTenantSuspended = currentTenant?.status === 'Suspended' && !isSuperAdmin;

  // Render Onboarding
  if (isOnboardingOpen) {
    return <OnboardingWizard onComplete={() => setIsOnboardingOpen(false)} />;
  }

  // Render Suspended Tenant Notice
  if (isTenantSuspended) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white border border-rose-200 rounded-2xl shadow-sm text-center">
        <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Hotel Organization Suspended</h2>
        <p className="text-gray-600 text-sm mb-5 leading-relaxed">
          Operational access for{' '}
          <strong className="text-gray-900">{currentTenant?.name || 'this hotel'}</strong> (
          {currentTenant?.subdomain}) has been suspended by the SIGNINN Platform HQ due to
          administrative review or pending billing.
        </p>
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-xs text-rose-800 mb-6 text-left space-y-1.5">
          <div className="font-bold flex items-center gap-1.5 text-rose-900">
            <ShieldAlert className="w-4 h-4 text-rose-700" /> Platform Security & Billing Notice
          </div>
          <div>• Support Desk: <span className="font-mono font-semibold">billing@signinn.com</span> / +91 (800) 555-0199</div>
          <div>• Tenant Organization ID: <code className="bg-white/80 px-1 py-0.5 rounded font-mono">{currentTenant?.id}</code></div>
          <div>• Active Hotel Property: <span className="font-semibold">{currentProperty?.name}</span></div>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <p className="text-xs text-slate-500 italic">
            Contact your organization administrator or SIGNINN support to resolve subscription suspension.
          </p>
        </div>
      </div>
    );
  }

  // Render Restricted View Notice
  if (isCurrentViewRestricted) {
    return (
      <div className="max-w-lg mx-auto my-14 p-8 bg-white border border-amber-200 rounded-2xl shadow-sm text-center">
        <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Access Restricted</h2>
        <p className="text-gray-600 text-xs mb-4 leading-relaxed">
          Your current role <span className="font-semibold text-gray-900">({currentRole})</span>{' '}
          does not have permission to access the <strong>{currentView}</strong> module.
        </p>
        <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-800 mb-6 text-left">
          <span className="font-semibold">Role Scoping:</span> Your account is scoped to specific
          operational modules. If you need access to this view, please contact your hotel property
          manager or system administrator.
        </div>
        <button
          onClick={() => setCurrentView(isSuperAdmin ? 'superadmin' : 'dashboard')}
          className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
        >
          Return to {isSuperAdmin ? 'Platform HQ' : 'Dashboard'}
        </button>
      </div>
    );
  }

  // Render Feature Flag Disabled Notice
  if (isOtaDisabled || isBookingEngineDisabled || isReportsDisabled) {
    return (
      <div className="max-w-lg mx-auto my-14 p-8 bg-white border border-slate-200 rounded-2xl shadow-sm text-center">
        <div className="w-14 h-14 bg-purple-50 text-purple-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Module Not Enabled</h2>
        <p className="text-gray-600 text-xs mb-6 leading-relaxed">
          This feature module (
          {currentView === 'channels'
            ? 'OTA Channel Manager'
            : currentView === 'booking-engine'
            ? 'Direct Booking Engine'
            : 'Advanced Reports & Financial Analytics'}
          ) is turned OFF for <strong>{currentTenant?.name}</strong> by the Platform Super Admin.
        </p>
        <div className="flex items-center justify-center gap-3">
          {isSuperAdmin ? (
            <button
              onClick={() => setCurrentView('superadmin')}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Configure Feature in HQ
            </button>
          ) : (
            <button
              onClick={() => setCurrentView('dashboard')}
              className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Back to Dashboard
            </button>
          )}
        </div>
      </div>
    );
  }

  // Main Route Views
  switch (currentView) {
    case 'dashboard':
      return (
        <DashboardView
          property={currentProperty}
          reservations={reservations}
          rooms={rooms}
          role={currentRole}
          housekeepingTasks={housekeepingTasks}
          maintenanceTickets={maintenanceTickets}
          payments={payments}
          folios={folios}
          invoices={invoices}
          channels={channels}
          ratePlans={ratePlans}
          onNavigate={(viewId) => setCurrentView(viewId)}
          onOpenReservationDetail={(resId) => setDetailResId(resId)}
          onOpenCheckIn={(resId) => setCheckInResId(resId || null)}
          onOpenCheckOut={(resId) => setCheckOutResId(resId || null)}
          onOpenWalkIn={() => {
            setWalkInRoomId(undefined);
            setIsWalkInOpen(true);
          }}
          onOpenNewReservation={() => setIsNewResOpen(true)}
        />
      );

    case 'reservations':
      return (
        <ReservationCalendar
          rooms={rooms}
          roomTypes={roomTypes}
          reservations={reservations}
          onOpenReservationDetail={(resId) => setDetailResId(resId)}
          onOpenNewReservation={(roomId) => {
            setWalkInRoomId(roomId);
            setIsNewResOpen(true);
          }}
          onOpenCheckIn={(resId) => setCheckInResId(resId)}
          onOpenCheckOut={(resId) => setCheckOutResId(resId)}
        />
      );

    case 'frontdesk':
      return (
        <FrontDeskView
          reservations={reservations}
          rooms={rooms}
          onOpenCheckIn={(resId) => setCheckInResId(resId)}
          onOpenCheckOut={(resId) => setCheckOutResId(resId)}
          onOpenReservationDetail={(resId) => setDetailResId(resId)}
          onOpenWalkIn={() => {
            setWalkInRoomId(undefined);
            setIsWalkInOpen(true);
          }}
          onOpenNewReservation={() => setIsNewResOpen(true)}
        />
      );

    case 'rooms':
      return (
        <RoomManagementView
          rooms={rooms}
          roomTypes={roomTypes}
          onUpdateHousekeepingStatus={async (roomId, status) => {
            await updateHskMutation.mutateAsync({ roomId, status });
          }}
          onUpdateMaintenanceStatus={async (roomId, status) => {
            await updateMntMutation.mutateAsync({ roomId, status });
          }}
          onOpenWalkInForRoom={(roomId) => {
            setWalkInRoomId(roomId);
            setIsWalkInOpen(true);
          }}
          onOpenReservationDetail={(resId) => setDetailResId(resId)}
        />
      );

    case 'records':
      return (
        <DataManagementView
          reservations={reservations}
          rooms={rooms}
          onOpenReservationDetail={(resId) => setDetailResId(resId)}
          onOpenNewReservation={() => setIsNewResOpen(true)}
          onOpenCheckIn={(resId) => setCheckInResId(resId || reservations[0]?.id)}
        />
      );

    case 'housekeeping':
      return (
        <HousekeepingView
          tasks={housekeepingTasks}
          onToggleChecklistItem={async (taskId, itemId) => {
            await toggleHskItemMutation.mutateAsync({ taskId, itemId });
          }}
          onUpdateTaskStatus={async (taskId, status) => {
            await updateHskTaskStatusMutation.mutateAsync({ taskId, status });
          }}
          onReportMaintenance={async (roomNumber, issue, priority) => {
            const room = rooms.find((r) => r.roomNumber === roomNumber);
            await createMaintenanceTicketMutation.mutateAsync({
              roomId: room?.id || `rm-${roomNumber}`,
              roomNumber,
              title: issue,
              description: `Housekeeping report: ${issue}`,
              severity: priority,
              reportedBy: 'Housekeeping Team',
            });
            showToast({
              title: 'Maintenance Ticket Created',
              description: `Reported issue for Room ${roomNumber}`,
              type: 'info',
            });
          }}
        />
      );

    case 'maintenance':
      return (
        <MaintenanceView
          tickets={maintenanceTickets}
          rooms={rooms}
          onAddTicket={async (ticket) => {
            await createMaintenanceTicketMutation.mutateAsync(ticket);
            showToast({
              title: 'Maintenance Ticket Added',
              description: ticket.title,
              type: 'success',
            });
          }}
          onUpdateTicketStatus={async (ticketId, status) => {
            await updateMaintenanceTicketStatusMutation.mutateAsync({ ticketId, status });
          }}
        />
      );

    case 'rates':
      return (
        <RatesView
          ratePlans={ratePlans}
          roomTypes={roomTypes}
          onUpdateRatePlan={async (plan) => {
            await updateRatePlanMutation.mutateAsync(plan);
            showToast({
              title: 'Rate Plan Updated',
              description: `${plan.name} pricing synchronized.`,
              type: 'success',
            });
          }}
        />
      );

    case 'availability':
      return <AvailabilityView roomTypes={roomTypes} rooms={rooms} />;

    case 'channels':
      return (
        <ChannelsView
          channels={channels}
          currentProperty={currentProperty}
          currentTenant={currentTenant}
          onForceSync={async () => {
            await forceChannelSyncMutation.mutateAsync();
            showToast({
              title: 'OTA Channels Synced',
              description: 'Rates, inventory, and bookings synced.',
              type: 'success',
            });
          }}
          onToggleChannelStatus={async (id) => {
            await toggleChannelStatusMutation.mutateAsync(id);
          }}
          onUpdateMarkup={async (id, markup) => {
            await updateChannelMarkupMutation.mutateAsync({ channelId: id, markup });
          }}
        />
      );

    case 'booking-engine':
      return (
        <BookingEngineView
          roomTypes={roomTypes}
          onCreateDirectBooking={async (resData) => {
            return await createResMutation.mutateAsync(resData);
          }}
        />
      );

    case 'guests':
      return (
        <GuestProfilesView
          guests={guests}
          reservations={reservations}
          onBookForGuest={() => setIsNewResOpen(true)}
          onOpenReservationDetail={(resId) => setDetailResId(resId)}
        />
      );

    case 'messages':
      return (
        <MessagesView
          threads={messageThreads}
          onSendMessage={async (threadId, content) => {
            await sendMessageMutation.mutateAsync({ threadId, content });
            showToast({
              title: 'Message Sent',
              description: 'Guest communication dispatched via channel gateway.',
              type: 'success',
            });
          }}
        />
      );

    case 'folios':
      return (
        <FoliosView
          folios={folios}
          onAddCharge={async (folioId, item) => {
            await addFolioChargeMutation.mutateAsync({ folioId, item });
            showToast({
              title: 'Folio Charge Added',
              description: `${item.description} - INR ${item.amount}`,
              type: 'info',
            });
          }}
          onRecordPayment={async (folioId, amount, method, ref) => {
            await recordPaymentMutation.mutateAsync({ folioId, amount, method, reference: ref });
            showToast({
              title: 'Payment Recorded',
              description: `INR ${amount} via ${method}`,
              type: 'success',
            });
          }}
          onOpenReservationDetail={(resId) => setDetailResId(resId)}
        />
      );

    case 'payments':
      return (
        <PaymentsView
          payments={payments}
          onRecordPayment={async (payment) => {
            const recorded = await recordDirectPaymentMutation.mutateAsync(payment);
            showToast({
              title: 'Payment Processed',
              description: `INR ${payment.amount} recorded successfully in financial ledger.`,
              type: 'success',
            });
            return recorded;
          }}
        />
      );

    case 'invoices':
      return <InvoicesView invoices={invoices} />;

    case 'reports':
      return <ReportsView reservations={reservations} rooms={rooms} payments={payments} />;

    case 'qr-service':
      return (
        <QrRoomServiceModal
          isOpen={true}
          onClose={() => setCurrentView('dashboard')}
          currentProperty={currentProperty}
          rooms={rooms}
        />
      );

    case 'whatsapp-concierge':
      return (
        <WhatsAppConciergeModal
          isOpen={true}
          onClose={() => setCurrentView('messages')}
          currentProperty={currentProperty}
        />
      );

    case 'settings-property':
      return (
        <SettingsView
          property={currentProperty}
          roomTypes={roomTypes}
          onUpdateProperty={async (prop) => {
            if (currentProperty) {
              await updatePropertyMutation.mutateAsync({ ...prop, id: currentProperty.id });
              setCurrentProperty({ ...currentProperty, ...prop });
            }
            showToast({
              title: 'Hotel Property Updated',
              description: `${prop.name || 'Property'} details saved to database.`,
              type: 'success',
            });
          }}
        />
      );

    case 'settings-staff':
      return (
        <StaffRolesView
          staffList={staffList}
          propertyId={currentProperty?.id || ''}
          onAddStaff={async (newStaff) => {
            await addStaffMutation.mutateAsync({
              ...newStaff,
              propertyId: currentProperty?.id || 'prop-1',
            } as any);
            showToast({
              title: 'Staff Member Added',
              description: `${newStaff.name} assigned as ${newStaff.role}`,
              type: 'success',
            });
          }}
          onUpdateStaffStatus={async (staffId, status) => {
            await updateStaffStatusMutation.mutateAsync({ staffId, status });
            showToast({
              title: 'Staff Status Updated',
              description: `Status changed to ${status}`,
              type: 'info',
            });
          }}
          onUpdateStaff={async (staffId, changes) => {
            await updateStaffMutation.mutateAsync({ staffId, changes });
            showToast({ title: 'Staff Member Updated', description: 'Changes saved.', type: 'success' });
          }}
        />
      );

    case 'settings-audit':
      return <AuditLogView logs={auditLogs} />;

    case 'superadmin':
      return (
        <SuperAdminView
          tenants={tenants}
          currentTenantId={currentTenantId}
          onSelectTenant={(tenantId) => {
            setCurrentTenantId(tenantId);
            const tenant = tenants.find((t) => t.id === tenantId);
            showToast({
              title: `Tenant Selected: ${tenant?.name || 'Client'}`,
              description: `Viewing SaaS configuration for ${tenant?.subdomain || tenantId}`,
              type: 'info',
            });
          }}
          onEnterTenant={(tenant) => {
            setCurrentTenantId(tenant.id);
            showToast({
              title: 'Platform Boundary Active',
              description: `Inspecting ${tenant.name} SaaS details. Operational PMS access requires authorized hotel staff credentials.`,
              type: 'info',
            });
          }}
          onProvisionTenant={async (newTenantData) => {
            await provisionTenantMutation.mutateAsync(newTenantData);
            showToast({
              title: 'Hotel Tenant Provisioned',
              description: `${newTenantData.name} provisioned on ${newTenantData.plan} tier.`,
              type: 'success',
            });
          }}
          onUpdateTenantStatus={async (tenantId, status, reason) => {
            await updateTenantStatusMutation.mutateAsync({ tenantId, status, reason } as any);
            showToast({
              title: 'Tenant Status Changed',
              description: `Organization status set to ${status}.`,
              type: status === 'Active' ? 'info' : 'warning',
            });
          }}
          onUpdateTenantPlan={async (tenantId, plan) => {
            await updateTenantPlanMutation.mutateAsync({ tenantId, plan });
            showToast({
              title: 'Tenant Plan Updated',
              description: `SaaS subscription changed to ${plan}.`,
              type: 'success',
            });
          }}
          onUpdateTenantFeatures={async (tenantId, features) => {
            await updateTenantFeaturesMutation.mutateAsync({ tenantId, features });
            showToast({
              title: 'Tenant Features Updated',
              description: 'Feature modules have been updated for this client.',
              type: 'success',
            });
          }}
          onToggleTenantDeletion={async (tenantId, allowed) => {
            await toggleTenantDeletionMutation.mutateAsync({ tenantId, allowed });
            showToast({
              title: 'Deletion Feature Permission Updated',
              description: `Data deletion toggle set for tenant ${tenantId}`,
              type: 'info',
            });
          }}
          onRecordTenantPayment={async (tenantId, paymentData) => {
            await recordTenantPaymentMutation.mutateAsync({ tenantId, paymentData });
            showToast({
              title: 'Subscription Payment Recorded',
              description: `Logged ₹${paymentData.amount} subscription payment for tenant.`,
              type: 'success',
            });
          }}
          onDeleteTenant={async (tenantId, force) => {
            await deleteTenantMutation.mutateAsync({ tenantId, force });
            showToast({
              title: 'Tenant Account Deleted',
              description: `Client tenant ${tenantId} and all associated data have been deleted.`,
              type: 'warning',
            });
          }}
        />
      );

    default:
      return (
        <DashboardView
          property={currentProperty}
          reservations={reservations}
          rooms={rooms}
          onNavigate={(viewId) => setCurrentView(viewId)}
          onOpenReservationDetail={(resId) => setDetailResId(resId)}
          onOpenCheckIn={(resId) => setCheckInResId(resId || null)}
          onOpenCheckOut={(resId) => setCheckOutResId(resId || null)}
        />
      );
  }
};
