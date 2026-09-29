import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from './apiClient';
import { useAppStore } from '../../stores/useAppStore';
import {
  Tenant,
  Property,
  Room,
  RoomType,
  Reservation,
  Guest,
  Folio,
  PaymentTransaction,
  Invoice,
  HousekeepingTask,
  MaintenanceTicket,
  ChannelConfig,
  RatePlan,
  StaffMember,
  AuditLogEntry,
  OtaIngestionLog,
  EmailSimulationPayload,
  CsvReconcilePayload,
  CsvReconcileResponse,
} from '../../types';

// ==========================================
// Query Keys
// ==========================================
export const QUERY_KEYS = {
  tenants: ['tenants'] as const,
  tenant: (id: string) => ['tenant', id] as const,
  platformMetrics: ['platformMetrics'] as const,
  properties: (tenantId: string) => ['properties', tenantId] as const,
  rooms: (tenantId: string, propertyId?: string | null) => ['rooms', tenantId, propertyId] as const,
  roomTypes: (tenantId: string, propertyId?: string | null) => ['roomTypes', tenantId, propertyId] as const,
  reservations: (tenantId: string, propertyId?: string | null) => ['reservations', tenantId, propertyId] as const,
  guests: (tenantId: string) => ['guests', tenantId] as const,
  folios: (tenantId: string) => ['folios', tenantId] as const,
  payments: (tenantId: string) => ['payments', tenantId] as const,
  invoices: (tenantId: string) => ['invoices', tenantId] as const,
  housekeeping: (tenantId: string) => ['housekeeping', tenantId] as const,
  maintenance: (tenantId: string) => ['maintenance', tenantId] as const,
  channels: (tenantId: string) => ['channels', tenantId] as const,
  ratePlans: (tenantId: string) => ['ratePlans', tenantId] as const,
  staff: (tenantId: string) => ['staff', tenantId] as const,
  auditLogs: (tenantId: string) => ['auditLogs', tenantId] as const,
};

// ==========================================
// TENANTS & PLATFORM HOOKS
// ==========================================
export function useTenantsQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.tenants,
    queryFn: () => apiRequest<Tenant[]>('/api/tenants'),
    staleTime: 1000 * 30, // 30s
  });
}

export function usePlatformMetricsQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.platformMetrics,
    queryFn: () => apiRequest<any>('/api/tenants/platform/metrics'),
    staleTime: 1000 * 60,
  });
}

// ==========================================
// PROPERTIES HOOKS
// ==========================================
export function usePropertiesQuery() {
  const currentTenantId = useAppStore((state) => state.currentTenantId);

  return useQuery({
    queryKey: QUERY_KEYS.properties(currentTenantId),
    queryFn: async () => {
        const list = await apiRequest<any[]>('/api/properties');
        return list.map((p) => ({
          ...p,
          totalRooms: p.totalRooms ?? p.total_rooms ?? 0,
          total_rooms: p.total_rooms ?? p.totalRooms ?? 0,
          tenantId: p.tenantId ?? p.tenant_id,
          tenant_id: p.tenant_id ?? p.tenantId,
        })) as Property[];
    },
    staleTime: 1000 * 60,
  });
}

// ==========================================
// ROOMS & ROOM TYPES HOOKS
// ==========================================
export function useRoomTypesQuery(propertyId?: string | null) {
  const currentTenantId = useAppStore((state) => state.currentTenantId);

  return useQuery({
    queryKey: QUERY_KEYS.roomTypes(currentTenantId, propertyId),
    queryFn: async () => {
      const query = propertyId ? `?property_id=${propertyId}` : '';
      return apiRequest<RoomType[]>(`/api/room-types${query}`);
    },
  });
}

export function useRoomsQuery(propertyId?: string | null) {
  const currentTenantId = useAppStore((state) => state.currentTenantId);

  return useQuery({
    queryKey: QUERY_KEYS.rooms(currentTenantId, propertyId),
    queryFn: async () => {
      const query = propertyId ? `?property_id=${propertyId}` : '';
      const rawList = await apiRequest<any[]>(`/api/rooms${query}`);
      return rawList.map((room: any): Room => ({
        ...room,
        propertyId: room.propertyId || room.property_id || propertyId || '',
        roomNumber: room.roomNumber || room.room_number,
        roomTypeId: room.roomTypeId || room.room_type_id || '',
        roomTypeName: room.roomTypeName || room.room_type_name || '',
        occupancyStatus: room.occupancyStatus || room.occupancy_status || 'Vacant',
        housekeepingStatus: room.housekeepingStatus || room.housekeeping_status || 'Clean',
        maintenanceStatus: room.maintenanceStatus || room.maintenance_status || 'Operational',
        currentReservationId: room.currentReservationId || room.current_reservation_id,
        currentGuestName: room.currentGuestName || room.current_guest_name,
        nextArrivalDate: room.nextArrivalDate || room.next_arrival_date,
        maintenanceNotes: room.maintenanceNotes || room.maintenance_notes,
        keyCardAssigned: room.keyCardAssigned ?? room.key_card_assigned,
      }));
    },
  });
}

// ==========================================
// RESERVATIONS HOOKS
// ==========================================
export function useReservationsQuery(propertyId?: string | null) {
  const currentTenantId = useAppStore((state) => state.currentTenantId);

  return useQuery({
    queryKey: QUERY_KEYS.reservations(currentTenantId, propertyId),
    queryFn: async () => {
      try {
        const query = propertyId ? `?property_id=${propertyId}` : '';
        const rawList = await apiRequest<any[]>(`/api/reservations${query}`);
        return rawList.map((r: any): Reservation => {
          const sourceName = r.bookingSource || r.booking_source || r.source || 'Direct Website';
          return {
            ...r,
            id: r.id,
            refCode: r.refCode || r.ref_code || r.id,
            propertyId: r.propertyId || r.property_id || propertyId || '',
            guestId: r.guestId || r.guest_id || '',
            roomId: r.roomId || r.room_id,
            roomNumber: r.roomNumber || r.room_number,
            roomTypeId: r.roomTypeId || r.room_type_id || '',
            roomTypeName: r.roomTypeName || r.room_type_name || 'Standard Room',
            checkInDate: r.checkInDate || r.check_in_date,
            checkOutDate: r.checkOutDate || r.check_out_date,
            nights: r.nights ?? 1,
            adults: r.adults ?? 1,
            children: r.children ?? 0,
            status: r.status || 'Confirmed',
            bookingSource: sourceName as any,
            source: sourceName as any,
            nightlyRate: r.nightlyRate ?? r.nightly_rate ?? 0,
            totalAmount: r.totalAmount ?? r.total_amount ?? 0,
            paidAmount: r.paidAmount ?? r.paid_amount ?? 0,
            balanceAmount: r.balanceAmount ?? r.balance_amount ?? 0,
            paymentStatus: r.paymentStatus || r.payment_status || 'Unpaid',
            ratePlanCode: r.ratePlanCode || r.rate_plan_code || 'BAR-EP',
            specialRequests: r.specialRequests ?? r.special_requests ?? '',
            createdAt: r.createdAt || r.created_at || new Date().toISOString(),
            eta: r.eta || '14:00',
            otaReservationId: r.otaReservationId || r.ota_reservation_id,
            tags: r.tags || [],
            guest: r.guest ? {
              ...r.guest,
              id: r.guest.id || r.guest_id || '',
              firstName: r.guest.firstName || r.guest.first_name || 'Guest',
              lastName: r.guest.lastName || r.guest.last_name || '',
              email: r.guest.email || '',
              phone: r.guest.phone || '',
              vipStatus: r.guest.vipStatus ?? r.guest.vip_status ?? false,
            } : {
              id: r.guest_id || 'guest',
              firstName: 'Guest',
              lastName: '',
              email: '',
              phone: '',
              vipStatus: false,
            },
          };
        });
      } catch (error) {
        throw error;
      }
    },
  });
}

// ==========================================
// GUESTS HOOKS
// ==========================================
export function useGuestsQuery() {
  const currentTenantId = useAppStore((state) => state.currentTenantId);

  return useQuery({
    queryKey: QUERY_KEYS.guests(currentTenantId),
    queryFn: async () => {
      return apiRequest<Guest[]>('/api/guests');
    },
  });
}

// ==========================================
// BILLING & FOLIOS HOOKS
// ==========================================
export function useFoliosQuery() {
  const currentTenantId = useAppStore((state) => state.currentTenantId);

  return useQuery({
    queryKey: QUERY_KEYS.folios(currentTenantId),
    queryFn: async () => {
      return apiRequest<Folio[]>('/api/billing/folios');
    },
  });
}

export function usePaymentsQuery() {
  const currentTenantId = useAppStore((state) => state.currentTenantId);

  return useQuery({
    queryKey: QUERY_KEYS.payments(currentTenantId),
    queryFn: async () => {
      return apiRequest<PaymentTransaction[]>('/api/billing/payments');
    },
  });
}

export function useInvoicesQuery() {
  const currentTenantId = useAppStore((state) => state.currentTenantId);

  return useQuery({
    queryKey: QUERY_KEYS.invoices(currentTenantId),
    queryFn: async () => {
      return apiRequest<Invoice[]>('/api/billing/invoices');
    },
  });
}

// ==========================================
// HOUSEKEEPING & MAINTENANCE HOOKS
// ==========================================
export function useHousekeepingTasksQuery() {
  const currentTenantId = useAppStore((state) => state.currentTenantId);

  return useQuery({
    queryKey: QUERY_KEYS.housekeeping(currentTenantId),
    queryFn: async () => {
      return apiRequest<HousekeepingTask[]>('/api/housekeeping/tasks');
    },
  });
}

export function useMaintenanceTicketsQuery() {
  const currentTenantId = useAppStore((state) => state.currentTenantId);

  return useQuery({
    queryKey: QUERY_KEYS.maintenance(currentTenantId),
    queryFn: async () => {
      return apiRequest<MaintenanceTicket[]>('/api/maintenance/tickets');
    },
  });
}

// ==========================================
// CHANNELS & RATES HOOKS
// ==========================================
export function useChannelsQuery() {
  const currentTenantId = useAppStore((state) => state.currentTenantId);

  return useQuery({
    queryKey: QUERY_KEYS.channels(currentTenantId),
    queryFn: async () => {
      try {
        const rawList = await apiRequest<any[]>('/api/channels');
        return rawList.map((ch: any): ChannelConfig => ({
          id: ch.id,
          channelName: (ch.channelName || ch.channel_name || 'OTA Channel') as any,
          code: ch.code || 'OTA',
          status: ch.status || 'Connected',
          lastSync: ch.lastSync || ch.last_sync || 'Real-time',
          mappedRoomTypes: ch.mappedRoomTypes ?? ch.mapped_room_types ?? 4,
          totalRoomTypes: ch.totalRoomTypes ?? ch.total_room_types ?? 4,
          mappedRatePlans: ch.mappedRatePlans ?? ch.mapped_rate_plans ?? 2,
          totalRatePlans: ch.totalRatePlans ?? ch.total_rate_plans ?? 2,
          errorCount: ch.errorCount ?? ch.error_count ?? 0,
          errorSummary: ch.errorSummary ?? ch.error_summary,
          commissionRate: ch.commissionRate ?? ch.commission_rate ?? 15,
          revenueThisMonth: ch.revenueThisMonth ?? ch.revenue_this_month ?? 0,
          rateMultiplier: ch.rateMultiplier ?? ch.rate_multiplier ?? 1.0,
          bookingsThisMonth: ch.bookingsThisMonth ?? ch.bookings_this_month ?? 0,
          activeListings: ch.activeListings ?? ch.active_listings ?? 1,
          category: ch.category || 'OTA',
          aiosell_slug: ch.aiosell_slug || ch.aiosellSlug,
          inbound_email_alias: ch.inbound_email_alias,
          ical_export_token: ch.ical_export_token,
          ical_import_url: ch.ical_import_url,
          last_email_received_at: ch.last_email_received_at,
          auto_ingested_count: ch.auto_ingested_count ?? 0,
        }));
      } catch (error) {
        throw error;
      }
    },
  });
}

export function useRatePlansQuery() {
  const currentTenantId = useAppStore((state) => state.currentTenantId);

  return useQuery({
    queryKey: QUERY_KEYS.ratePlans(currentTenantId),
    queryFn: async () => {
      return apiRequest<RatePlan[]>('/api/rates');
    },
  });
}

// ==========================================
// STAFF & AUDIT LOGS HOOKS
// ==========================================
export function useStaffMembersQuery() {
  const currentTenantId = useAppStore((state) => state.currentTenantId);

  return useQuery({
    queryKey: QUERY_KEYS.staff(currentTenantId),
    queryFn: async () => {
      const staff = await apiRequest<any[]>('/api/staff-audit/staff');
      return staff.map((member) => ({
        ...member,
        assignedPropertyId: member.property_id,
      })) as StaffMember[];
    },
  });
}

export function useAuditLogsQuery() {
  const currentTenantId = useAppStore((state) => state.currentTenantId);

  return useQuery({
    queryKey: QUERY_KEYS.auditLogs(currentTenantId),
    queryFn: async () => {
      return apiRequest<AuditLogEntry[]>('/api/staff-audit/audit-logs');
    },
  });
}

// ==========================================
// MUTATIONS WITH AUTO-CACHE INVALIDATION
// ==========================================

export function useCreateReservationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reservationData: any) => {
      const guest = reservationData.guest;
      const saved = await apiRequest<any>('/api/reservations', {
        method: 'POST',
        body: JSON.stringify({
          property_id: reservationData.propertyId || useAppStore.getState().currentPropertyId,
          guest_id: reservationData.guestId,
          guest: guest && {
            first_name: guest.firstName,
            last_name: guest.lastName,
            email: guest.email,
            phone: guest.phone,
            id_type: guest.idType,
            id_number: guest.idNumber,
            nationality: guest.nationality,
            vip_status: guest.vipStatus,
            preferences: guest.preferences,
            notes: guest.notes,
          },
          room_id: reservationData.roomId,
          room_number: reservationData.roomNumber,
          room_type_id: reservationData.roomTypeId,
          room_type_name: reservationData.roomTypeName,
          check_in_date: reservationData.checkInDate,
          check_out_date: reservationData.checkOutDate,
          nights: reservationData.nights,
          adults: reservationData.adults,
          children: reservationData.children,
          booking_source: reservationData.bookingSource,
          nightly_rate: reservationData.nightlyRate,
          total_amount: reservationData.totalAmount,
          paid_amount: reservationData.paidAmount,
          rate_plan_code: reservationData.ratePlanCode,
          special_requests: reservationData.specialRequests,
          status: reservationData.status,
        }),
      });
      return { ...saved, refCode: saved.ref_code, propertyId: saved.property_id } as Reservation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['folios'] });
      queryClient.invalidateQueries({ queryKey: ['guests'] });
    },
  });
}

export function useCheckInMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      resId,
      roomId,
      advancePaid,
      method = 'UPI',
    }: {
      resId: string;
      roomId: string;
      advancePaid: number;
      method?: string;
    }) => {
      return await apiRequest(`/api/reservations/${resId}/check-in`, {
        method: 'POST',
        body: JSON.stringify({
          room_id: roomId,
          advance_paid: advancePaid,
          payment_method: method,
        }),
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.setQueriesData<Room[]>({ queryKey: ['rooms'] }, (rooms) =>
        rooms?.map((room) =>
          room.id === variables.roomId
            ? {
                ...room,
                occupancyStatus: 'Occupied',
                currentReservationId: variables.resId,
                keyCardAssigned: true,
              }
            : room
        )
      );
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['folios'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
    },
  });
}

export function useCheckOutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      resId,
      finalPayment,
      method = 'UPI',
    }: {
      resId: string;
      finalPayment: number;
      method?: string;
    }) => {
      return apiRequest(`/api/reservations/${resId}/check-out`, {
          method: 'POST',
          body: JSON.stringify({
            settlement_amount: finalPayment,
            payment_method: method,
          }),
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['folios'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['housekeeping'] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
    },
  });
}

export function useReassignRoomMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ resId, newRoomId }: { resId: string; newRoomId: string }) => {
      return apiRequest(`/api/reservations/${resId}/reassign-room`, {
          method: 'POST',
          body: JSON.stringify({ newRoomId }),
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
}

export function useUpdateHousekeepingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roomId, status }: { roomId: string; status: any }) => {
      return apiRequest(`/api/rooms/${roomId}/housekeeping`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['housekeeping'] });
    },
  });
}

export function useUpdateMaintenanceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roomId, status }: { roomId: string; status: any }) => {
      return apiRequest(`/api/rooms/${roomId}/maintenance`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
    },
  });
}

export function useCreateMaintenanceTicketMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticket: any) => {
      return apiRequest('/api/maintenance/tickets', {
          method: 'POST',
          body: JSON.stringify({
            room_id: ticket.roomId,
            room_number: ticket.roomNumber,
            title: ticket.title,
            description: ticket.description || '',
            priority: ticket.priority || ticket.severity || 'Medium',
            reported_by: ticket.reportedBy || 'Front Desk',
            category: ticket.category || 'General',
          }),
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
}

export function useUpdateMaintenanceTicketStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: string }) => {
      return apiRequest(`/api/maintenance/tickets/${ticketId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
}

export function useUpdateHousekeepingTaskStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      return apiRequest(`/api/housekeeping/tasks/${taskId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['housekeeping'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
}

export function useToggleHousekeepingItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, itemId }: { taskId: string; itemId: string }) => {
      return apiRequest(`/api/housekeeping/tasks/${taskId}/toggle-item`, {
          method: 'POST',
          body: JSON.stringify({ itemId }),
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['housekeeping'] });
    },
  });
}

export function useUpdateRatePlanMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (plan: any) => {
      return apiRequest(`/api/rates/${plan.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: plan.name,
            base_price_multiplier: plan.basePriceMultiplier || plan.base_price_multiplier,
            cancellation_policy: plan.cancellationPolicy || plan.cancellation_policy,
            min_stay: plan.minStay || plan.min_stay,
            meal_plan: plan.mealPlan || plan.meal_plan,
          }),
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ratePlans'] });
    },
  });
}

export function useRecordPaymentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      folioId,
      amount,
      method,
      reference,
    }: {
      folioId: string;
      amount: number;
      method: any;
      reference?: string;
    }) => {
      return apiRequest(`/api/billing/folios/${folioId}/payments`, {
          method: 'POST',
          body: JSON.stringify({ amount, method, reference }),
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folios'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });
}

export function useAddFolioChargeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ folioId, item }: { folioId: string; item: any }) => {
      return apiRequest(`/api/billing/folios/${folioId}/charges`, {
          method: 'POST',
          body: JSON.stringify(item),
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folios'] });
    },
  });
}

export function useProvisionTenantMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tenantData: any) => {
      return apiRequest<Tenant>('/api/tenants', {
          method: 'POST',
          body: JSON.stringify(tenantData),
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['platformMetrics'] });
    },
  });
}

export function useUpdateTenantStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenantId, status }: { tenantId: string; status: any }) => {
      return apiRequest(`/api/tenants/${tenantId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
}

export function useUpdateTenantPlanMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenantId, plan }: { tenantId: string; plan: any }) => {
      return apiRequest(`/api/tenants/${tenantId}/plan`, {
          method: 'PATCH',
          body: JSON.stringify({ plan }),
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
}

export function useUpdateTenantFeaturesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenantId, features }: { tenantId: string; features: any }) => {
      return apiRequest(`/api/tenants/${tenantId}/features`, {
          method: 'PATCH',
          body: JSON.stringify({ features }),
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
}

export function useToggleTenantDeletionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenantId, allowed }: { tenantId: string; allowed?: boolean }) => {
      return apiRequest(`/api/tenants/${tenantId}/deletion-toggle`, {
          method: 'PATCH',
          body: JSON.stringify({ deletion_allowed: allowed }),
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
}

export function useRecordTenantSubscriptionPaymentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tenantId,
      paymentData,
    }: {
      tenantId: string;
      paymentData: { amount: number; reference: string; method?: string; notes?: string; nextRenewalDate?: string };
    }) => {
      return apiRequest(`/api/tenants/${tenantId}/payments`, {
          method: 'POST',
          body: JSON.stringify(paymentData),
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['platformMetrics'] });
    },
  });
}

export function useDeleteTenantMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenantId, force }: { tenantId: string; force?: boolean }) => {
      return apiRequest(`/api/tenants/${tenantId}?force=${!!force}`, {
          method: 'DELETE',
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['platformMetrics'] });
    },
  });
}

// ==========================================
// OTA CHANNEL MANAGER INGESTION LOGS
// ==========================================
export function useOtaIngestionLogsQuery() {
  const currentTenantId = useAppStore((state) => state.currentTenantId);

  return useQuery({
    queryKey: ['otaIngestionLogs', currentTenantId],
    queryFn: async () => {
      return apiRequest<OtaIngestionLog[]>('/api/channels/logs');
    },
    staleTime: 1000 * 15,
  });
}


export function useUpdateChannelMarkupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ channelId, markup }: { channelId: string; markup: number }) => {
      return apiRequest<any>(`/api/channels/${channelId}/markup`, {
          method: 'PATCH',
          body: JSON.stringify({ rateMultiplier: markup }),
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });
}

export function useToggleChannelStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (channelId: string) => {
      return await apiRequest<any>(`/api/channels/${channelId}/toggle`, {
        method: 'PATCH',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });
}

export function useForceChannelSyncMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload?: { hotel_code?: string; partner_id?: string }) => {
      const params = new URLSearchParams();
      if (payload?.hotel_code) params.append('hotel_code', payload.hotel_code);
      if (payload?.partner_id) params.append('partner_id', payload.partner_id);
      const queryStr = params.toString() ? `?${params.toString()}` : '';
      return await apiRequest<any>(`/api/channels/force-sync${queryStr}`, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      queryClient.invalidateQueries({ queryKey: ['aiosell'] });
    },
  });
}

// ==========================================
// AIOSELL CHANNEL MANAGER HOOKS
// ==========================================

export function useAiosellConfigQuery() {
  return useQuery({
    queryKey: ['aiosell', 'config'],
    queryFn: async () => {
      return await apiRequest<any>('/api/channels/aiosell/config');
    },
  });
}

export function useAiosellRoomMappingQuery() {
  return useQuery({
    queryKey: ['aiosell', 'room-mapping'],
    queryFn: async () => {
      return await apiRequest<any>('/api/channels/aiosell/room-mapping');
    },
  });
}

export function useAiosellMappingQuery(hotelCode?: string, partnerId?: string, enabled = true) {
  return useQuery({
    queryKey: ['aiosell', 'mapping', hotelCode, partnerId],
    enabled,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (hotelCode) params.append('hotel_code', hotelCode);
      if (partnerId) params.append('partner_id', partnerId);
      const queryStr = params.toString() ? `?${params.toString()}` : '';
      return await apiRequest<any>(`/api/channels/aiosell/mapping${queryStr}`);
    },
  });
}

export function useAiosellPushInventoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { updates: any[]; hotel_code?: string; partner_id?: string }) => {
      return await apiRequest<any>('/api/channels/aiosell/push-inventory', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });
}

export function useAiosellPushRatesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { updates: any[]; hotel_code?: string; partner_id?: string }) => {
      return await apiRequest<any>('/api/channels/aiosell/push-rates', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });
}

export function useAiosellPushRestrictionsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      type?: 'inventory' | 'rates';
      to_channels: string[];
      updates: any[];
      hotel_code?: string;
      partner_id?: string;
    }) => {
      return await apiRequest<any>('/api/channels/aiosell/push-restrictions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });
}

export function useAiosellMultiplierMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      multiplier: number;
      channels: string[];
      hotel_code?: string;
      partner_id?: string;
    }) => {
      return await apiRequest<any>('/api/channels/aiosell/multiplier', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });
}

export function useAiosellMarkNoShowMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      booking_id: string;
      channel: string;
      hotel_code?: string;
      partner_id?: string;
    }) => {
      return await apiRequest<any>('/api/channels/aiosell/mark-noshow', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
}

export function useAiosellFetchDataMutation() {
  return useMutation({
    mutationFn: async (payload: {
      data_type: 'inventory' | 'rates' | 'reservation';
      start_date: string;
      end_date: string;
      hotel_code?: string;
      partner_id?: string;
    }) => {
      return await apiRequest<any>('/api/channels/aiosell/fetch', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  });
}

export function useAiosellSimulateWebhookMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      return await apiRequest<any>('/api/channels/aiosell/simulate-webhook', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['otaIngestionLogs'] });
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });
}


// ==========================================
// PROPERTY & STAFF MUTATIONS
// ==========================================
export function useUpdatePropertyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (prop: Partial<Property> & { id: string }) => {
      return await apiRequest<Property>(`/api/properties/${prop.id}`, {
        method: 'PUT',
        body: JSON.stringify(prop),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });
}

export function useAddStaffMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newStaff: Partial<StaffMember>) => {
      return await apiRequest<StaffMember>('/api/staff-audit/staff', {
        method: 'POST',
        body: JSON.stringify(newStaff),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}

export function useUpdateStaffStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ staffId, status }: { staffId: string; status: string }) => {
      return await apiRequest<any>(`/api/staff-audit/staff/${staffId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}

export function useUpdateStaffMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ staffId, changes }: { staffId: string; changes: Partial<StaffMember> }) => {
      return apiRequest<StaffMember>(`/api/staff-audit/staff/${staffId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: changes.name,
          email: changes.email,
          phone: changes.phone,
          role: changes.role,
        }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff'] }),
  });
}

// ==========================================
// MESSAGES & GUEST COMMUNICATIONS
// ==========================================
export function useMessageThreadsQuery() {
  const currentTenantId = useAppStore((state) => state.currentTenantId);
  return useQuery({
    queryKey: ['messages', currentTenantId],
    queryFn: async () => {
      return await apiRequest<any[]>('/api/messages/threads');
    },
  });
}

export function useSendMessageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ threadId, content }: { threadId: string; content: string }) => {
      return await apiRequest<any>(`/api/messages/threads/${threadId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content, sender: 'hotel' }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

// ==========================================
// DIRECT PAYMENT RECORDING
// ==========================================
export function useRecordDirectPaymentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (paymentData: any) => {
      return await apiRequest<any>('/api/billing/payments', {
        method: 'POST',
        body: JSON.stringify({
          amount: paymentData.amount,
          method: paymentData.method,
          reference: paymentData.reference,
          notes: paymentData.notes,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['folios'] });
    },
  });
}

