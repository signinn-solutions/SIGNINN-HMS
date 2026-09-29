import React, { useState } from "react";
import {
  Globe, RefreshCw, Sliders,
  Copy, Check, Play, Zap, ExternalLink, TrendingDown, TrendingUp,
  ArrowRight, Link2, AlertCircle, CheckCircle2, BarChart3, IndianRupee,
  ShieldCheck, ArrowUpRight, Radio, Send, Database, Lock, Eye, Filter,
  SlidersHorizontal, CheckSquare, Settings2, Info, ChevronRight,
} from "lucide-react";
import { ChannelConnection, Property, Tenant } from "../../types";
import { formatCurrency } from "../../utils/formatters";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { useToast } from "../../components/ui/Toast";
import {
  useOtaIngestionLogsQuery,
  useAiosellConfigQuery,
  useAiosellPushInventoryMutation,
  useAiosellPushRatesMutation,
  useAiosellPushRestrictionsMutation,
  useAiosellMultiplierMutation,
  useAiosellMarkNoShowMutation,
  useAiosellFetchDataMutation,
  useAiosellSimulateWebhookMutation,
} from "../../services/api/queries";

export interface ChannelsViewProps {
  channels: ChannelConnection[];
  currentProperty?: Property | null;
  currentTenant?: Tenant | null;
  onForceSync: () => Promise<void>;
  onToggleChannelStatus: (channelId: string) => Promise<void>;
  onUpdateMarkup: (channelId: string, markupPercent: number) => Promise<void>;
}

type MainTab = "channels" | "push_suite" | "fetch_verify" | "webhook" | "logs";
type CategoryFilter = "ALL" | "OTA" | "CM" | "Booking Engine" | "OTA Aggregator";

const OTA_BRAND_COLORS: Record<string, { initials: string; color: string; bg: string }> = {
  "Booking.com": { initials: "BK", color: "#003580", bg: "#e8eef8" },
  "GoMMT (MakeMyTrip & Goibibo)": { initials: "MM", color: "#e41d24", bg: "#fde8e9" },
  "Agoda": { initials: "AG", color: "#1864ab", bg: "#e2ecf7" },
  "Airbnb": { initials: "AB", color: "#FF385C", bg: "#ffe8ec" },
  "Expedia": { initials: "EX", color: "#00355f", bg: "#e0eaf2" },
  "Cleartrip": { initials: "CT", color: "#f26522", bg: "#fef0ea" },
  "Ease My Trip": { initials: "EM", color: "#0084ff", bg: "#e6f3ff" },
  "CTrip / Trip.com": { initials: "TR", color: "#2577e3", bg: "#eaf2fc" },
  "HotelBeds": { initials: "HB", color: "#e61b24", bg: "#fce8e9" },
  "HostelWorld": { initials: "HW", color: "#ff6600", bg: "#fff0e6" },
  "HappyEasyGo": { initials: "HE", color: "#ff5000", bg: "#ffede6" },
  "Tiket": { initials: "TK", color: "#0064d2", bg: "#e6f0fa" },
  "Traveloka": { initials: "TV", color: "#1ba0e2", bg: "#e8f5fb" },
  "Travelguru": { initials: "TG", color: "#e67e22", bg: "#fdf2e9" },
  "Travolounge": { initials: "TL", color: "#8e44ad", bg: "#f4ecf7" },
  "VHS Hub": { initials: "VH", color: "#2c3e50", bg: "#eaeded" },
  "Bookings Maker": { initials: "BM", color: "#16a085", bg: "#e8f8f5" },
  "Reconline": { initials: "RC", color: "#2980b9", bg: "#eaf2f8" },
  "eZee Technosys": { initials: "EZ", color: "#27ae60", bg: "#eafaf1" },
  "Hotelierguru": { initials: "HG", color: "#d35400", bg: "#fbeee6" },
  "Simplotel": { initials: "SP", color: "#2980b9", bg: "#ebf5fb" },
  "Travelanium": { initials: "TA", color: "#8e44ad", bg: "#f5eef8" },
  "Aiolia BE": { initials: "AI", color: "#16a085", bg: "#e8f6f3" },
  "Bakuun": { initials: "BK", color: "#d35400", bg: "#faeae6" },
  "RateDock": { initials: "RD", color: "#c0392b", bg: "#f9ebea" },
  "HyperGuest": { initials: "HG", color: "#34495e", bg: "#ebedef" },
};

const dateFromToday = (offset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export const ChannelsView: React.FC<ChannelsViewProps> = ({
  channels,
  currentProperty,
  onForceSync,
  onToggleChannelStatus,
  onUpdateMarkup,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<MainTab>("channels");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Aiosell API Hooks
  const { data: aiosellConfig } = useAiosellConfigQuery();
  const pushInventoryMutation = useAiosellPushInventoryMutation();
  const pushRatesMutation = useAiosellPushRatesMutation();
  const pushRestrictionsMutation = useAiosellPushRestrictionsMutation();
  const channelMultiplierMutation = useAiosellMultiplierMutation();
  const markNoShowMutation = useAiosellMarkNoShowMutation();
  const fetchDataMutation = useAiosellFetchDataMutation();
  const simulateWebhookMutation = useAiosellSimulateWebhookMutation();
  const { data: ingestionLogs = [] } = useOtaIngestionLogsQuery();

  // Push Form State
  const [pushType, setPushType] = useState<"rate" | "inventory" | "restrictions" | "multiplier" | "noshow">("rate");
  const [pushStartDate, setPushStartDate] = useState(() => dateFromToday(1));
  const [pushEndDate, setPushEndDate] = useState(() => dateFromToday(4));
  const [pushRoomCode, setPushRoomCode] = useState("executive");
  const [pushRatePlanCode, setPushRatePlanCode] = useState("executive-s-ep");
  const [pushRateAmount, setPushRateAmount] = useState<number>(2499);
  const [pushInventoryCount, setPushInventoryCount] = useState<number>(10);
  const [pushSelectedChannels, setPushSelectedChannels] = useState<string[]>(["gommt", "booking.com"]);
  const [pushStopSell, setPushStopSell] = useState(false);
  const [pushMinStay, setPushMinStay] = useState<number>(1);
  const [pushCloseOnArrival, setPushCloseOnArrival] = useState(false);
  const [pushCloseOnDeparture, setPushCloseOnDeparture] = useState(false);
  const [pushMultiplierValue, setPushMultiplierValue] = useState<number>(1.15);
  const [noShowBookingId, setNoShowBookingId] = useState("");
  const [noShowChannel, setNoShowChannel] = useState<"booking.com" | "gommt">("gommt");
  const [pushResult, setPushResult] = useState<any | null>(null);

  // Fetch Form State
  const [fetchType, setFetchType] = useState<"inventory" | "rates" | "reservation">("inventory");
  const [fetchStartDate, setFetchStartDate] = useState(() => dateFromToday(1));
  const [fetchEndDate, setFetchEndDate] = useState(() => dateFromToday(4));
  const [fetchResult, setFetchResult] = useState<any | null>(null);

  // Webhook Simulator State
  const [simAction, setSimAction] = useState<"book" | "modify" | "cancel">("book");
  const [simBookingId, setSimBookingId] = useState(`AIO-${Math.floor(100000 + Math.random() * 900000)}`);
  const [simChannelName, setSimChannelName] = useState("Goibibo");
  const [simGuestFirst, setSimGuestFirst] = useState("Aditya");
  const [simGuestLast, setSimGuestLast] = useState("Singhania");
  const [simGuestEmail, setSimGuestEmail] = useState("aditya.singhania@gmail.com");
  const [simGuestPhone, setSimGuestPhone] = useState("+91 98201 44521");
  const [simTotalAmount, setSimTotalAmount] = useState(14500);
  const [simPah, setSimPah] = useState(false); // Pay at Hotel vs Prepaid
  const [simSpecialReq, setSimSpecialReq] = useState("Late checkout requested, airport transfer needed");
  const [simResult, setSimResult] = useState<any | null>(null);

  const propertyName = currentProperty?.name || "Selected property";
  const hotelCode = aiosellConfig?.hotelCode || "";
  const partnerId = aiosellConfig?.partnerId || "";
  const webhookUrl = `${window.location.protocol}//${window.location.host}/api/channels/aiosell/webhook`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast({ title: "Copied!", description: text, type: "success" });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      await onForceSync();
      showToast({ title: "Mapping verified", description: "Aiosell property mapping is reachable. No rates or inventory were sent.", type: "success" });
    } catch (err: any) {
      showToast({ title: "Connection check failed", description: err.message || "Could not reach Aiosell", type: "error" });
    } finally {
      setIsSyncing(false);
    }
  };

  // Push Execution
  const handleExecutePush = async () => {
    setPushResult(null);
    try {
      if (!aiosellConfig?.configured) throw new Error("Configure Aiosell partner credentials and partner ID on the server first.");
      if (pushType === "rate") {
        const payload = {
          updates: [
            {
              startDate: pushStartDate,
              endDate: pushEndDate,
              rates: [{ roomCode: pushRoomCode, rateplanCode: pushRatePlanCode, rate: Number(pushRateAmount) }],
            },
          ],
        };
        const res = await pushRatesMutation.mutateAsync(payload);
        setPushResult(res);
        showToast({ title: "Rates Pushed", description: "Pushed to Aiosell successfully!", type: "success" });
      } else if (pushType === "inventory") {
        const payload = {
          updates: [
            {
              startDate: pushStartDate,
              endDate: pushEndDate,
              rooms: [{ roomCode: pushRoomCode, available: Number(pushInventoryCount) }],
            },
          ],
        };
        const res = await pushInventoryMutation.mutateAsync(payload);
        setPushResult(res);
        showToast({ title: "Inventory Pushed", description: "Availability updated on Aiosell!", type: "success" });
      } else if (pushType === "restrictions") {
        const payload = {
          type: "inventory" as const,
          to_channels: pushSelectedChannels,
          updates: [
            {
              startDate: pushStartDate,
              endDate: pushEndDate,
              rooms: [
                {
                  roomCode: pushRoomCode,
                  restrictions: {
                    stopSell: pushStopSell,
                    minimumStay: Number(pushMinStay),
                    maximumStay: null,
                    closeOnArrival: pushCloseOnArrival,
                    closeOnDeparture: pushCloseOnDeparture,
                    minimumStayArrival: null,
                    maximumStayArrival: null,
                    exactStayArrival: null,
                    minimumAdvanceReservation: null,
                    maximumAdvanceReservation: null,
                  },
                },
              ],
            },
          ],
        };
        const res = await pushRestrictionsMutation.mutateAsync(payload);
        setPushResult(res);
        showToast({ title: "Restrictions Pushed", description: "Channel restrictions updated!", type: "success" });
      } else if (pushType === "multiplier") {
        const payload = {
          multiplier: Number(pushMultiplierValue),
          channels: pushSelectedChannels,
        };
        const res = await channelMultiplierMutation.mutateAsync(payload);
        setPushResult(res);
        showToast({ title: "Multiplier Applied", description: `Updated rate multiplier to ${pushMultiplierValue}x`, type: "success" });
      } else if (pushType === "noshow") {
        if (!noShowBookingId.trim()) {
          showToast({ title: "Booking ID Required", description: "Enter valid OTA Booking Reference", type: "error" });
          return;
        }
        const res = await markNoShowMutation.mutateAsync({
          booking_id: noShowBookingId,
          channel: noShowChannel,
        });
        setPushResult(res);
        showToast({ title: "Marked No-Show", description: res.message || "Booking marked no-show", type: "success" });
      }
    } catch (err: any) {
      setPushResult({ error: err.message || "Operation failed" });
      showToast({ title: "Push Error", description: err.message || "Push failed", type: "error" });
    }
  };

  // Fetch Execution
  const handleExecuteFetch = async () => {
    setFetchResult(null);
    try {
      if (!aiosellConfig?.configured) throw new Error("Configure Aiosell partner credentials and partner ID on the server first.");
      const res = await fetchDataMutation.mutateAsync({
        data_type: fetchType,
        start_date: fetchStartDate,
        end_date: fetchEndDate,
      });
      setFetchResult(res);
      showToast({ title: "Data Fetched", description: `Retrieved ${fetchType} from Aiosell API.`, type: "success" });
    } catch (err: any) {
      setFetchResult({ error: err.message || "Fetch failed" });
      showToast({ title: "Fetch Error", description: err.message, type: "error" });
    }
  };

  // Webhook Simulator Execution
  const handleExecuteWebhookSimulation = async () => {
    setSimResult(null);
    try {
      let payload: any;
      if (simAction === "cancel") {
        payload = {
          action: "cancel",
          hotelCode: hotelCode,
          channel: simChannelName,
          bookingId: simBookingId,
        };
      } else {
        payload = {
          action: simAction,
          hotelCode: hotelCode,
          channel: simChannelName,
          bookingId: simBookingId,
          cmBookingId: `CM-${simBookingId}`,
          bookedOn: new Date().toISOString().replace("T", " ").substring(0, 19),
          checkin: "2026-10-15",
          checkout: "2026-10-18",
          segment: "OTA",
          specialRequests: simSpecialReq,
          pah: simPah,
          amount: {
            amountAfterTax: Number(simTotalAmount),
            amountBeforeTax: Math.round(Number(simTotalAmount) * 0.88),
            tax: Math.round(Number(simTotalAmount) * 0.12),
            currency: "INR",
            commission: Math.round(Number(simTotalAmount) * 0.15),
            tcs: 14.5,
            tds: 2.9,
          },
          guest: {
            firstName: simGuestFirst,
            lastName: simGuestLast,
            email: simGuestEmail,
            phone: simGuestPhone,
            address: {
              line1: "51, MG Road",
              city: "Bangalore",
              state: "Karnataka",
              country: "India",
              zipCode: "560001",
            },
          },
          rooms: [
            {
              roomCode: "executive",
              rateplanCode: "executive-s-ep",
              guestName: `${simGuestFirst} ${simGuestLast}`,
              occupancy: { adults: 2, children: 0 },
              prices: [
                { date: "2026-10-15", sellRate: Math.round(Number(simTotalAmount) / 3) },
                { date: "2026-10-16", sellRate: Math.round(Number(simTotalAmount) / 3) },
                { date: "2026-10-17", sellRate: Math.round(Number(simTotalAmount) / 3) },
              ],
            },
          ],
        };
      }

      const res = await simulateWebhookMutation.mutateAsync(payload);
      setSimResult(res);
      showToast({
        title: `Aiosell Webhook (${simAction.toUpperCase()}) Processed`,
        description: res.message || "Reservation synced in HMS!",
        type: "success",
      });
      // Generate new booking id for next test
      setSimBookingId(`AIO-${Math.floor(100000 + Math.random() * 900000)}`);
    } catch (err: any) {
      setSimResult({ error: err.message || "Webhook processing failed" });
      showToast({ title: "Webhook Failed", description: err.message, type: "error" });
    }
  };

  // Filter channels
  const filteredChannels = channels.filter((c) => {
    const matchesCategory =
      categoryFilter === "ALL" ||
      (c.category && c.category.toUpperCase() === categoryFilter.toUpperCase());
    const matchesSearch =
      c.channelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.aiosell_slug && c.aiosell_slug.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const totalMonthlyRev = channels.reduce((sum, c) => sum + (c.revenueThisMonth || 0), 0);
  const totalBookings = channels.reduce((sum, c) => sum + (c.bookingsThisMonth || 0), 0);
  const activeCount = channels.filter((c) => c.status === "Connected").length;

  return (
    <div className="space-y-4">
      {!aiosellConfig?.configured && (
        <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Aiosell is not configured. Set the partner ID, username, password and hotel code on the server before demonstrating a live connection.
        </div>
      )}
      {aiosellConfig?.configured && !aiosellConfig?.webhookConfigured && (
        <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Outbound Aiosell access is configured. Set AIOSELL_PROPERTY_ID to the matching PMS property before accepting reservation webhooks.
        </div>
      )}
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 leading-tight">OTA Channel Manager</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Aiosell integration
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                {aiosellConfig?.configured ? (aiosellConfig.isSandbox ? "Sandbox mode" : "Partner configuration") : "Setup required"}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {propertyName} · Verify mapping before pushing rates, inventory or restrictions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://live.aiosell.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-blue-700 transition shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
            Aiosell Sandbox UI
          </a>
          <button
            onClick={handleForceSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-sm disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            Check Aiosell Mapping
          </button>
        </div>
      </div>

      {/* QUICK SUMMARY METRICS BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Enabled PMS channels</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-slate-900">{activeCount}</span>
            <span className="text-xs text-slate-500">of {channels.length} Integrations</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${(activeCount / (channels.length || 1)) * 100}%` }} />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">OTA Revenue (30d)</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-slate-900">{formatCurrency(totalMonthlyRev)}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">From PMS channel records</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">OTA Bookings Ingested</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-slate-900">{totalBookings}</span>
            <span className="text-xs text-slate-500">Reservations</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">From PMS channel records</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Channel Engine</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-sm font-bold text-blue-700">Aiosell REST v2</span>
          </div>
          <p className="text-[11px] text-slate-500 truncate mt-1">Connection requires verification</p>
        </div>
      </div>

      {/* AIOSELL CREDENTIALS & ENDPOINT DRAWER CARD */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-xl p-4 shadow-md border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold tracking-wide">Aiosell integration settings</h2>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                {aiosellConfig?.isSandbox ? "Sandbox configuration" : "Partner configuration"}
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl">
              Rate, Inventory & Restrictions push directly to Aiosell endpoints. Aiosell pushes OTA bookings back via our secure Webhook endpoint.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-lg px-3 py-1.5 flex items-center gap-2">
              <span className="text-slate-400">Hotel Code:</span>
              <code className="text-emerald-400 font-mono font-semibold">{hotelCode}</code>
              <button
                onClick={() => copyToClipboard(hotelCode, "hotelCode")}
                className="text-slate-400 hover:text-white transition ml-1 cursor-pointer"
                title="Copy Hotel Code"
              >
                {copiedKey === "hotelCode" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="bg-slate-800/90 border border-slate-700/80 rounded-lg px-3 py-1.5 flex items-center gap-2">
              <span className="text-slate-400">Partner ID:</span>
              <code className="text-indigo-300 font-mono font-semibold">{partnerId}</code>
              <button
                onClick={() => copyToClipboard(partnerId, "partnerId")}
                className="text-slate-400 hover:text-white transition ml-1 cursor-pointer"
                title="Copy Partner ID"
              >
                {copiedKey === "partnerId" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="text-slate-400">Aiosell Sandbox Portal Login:</span>
            <span className="text-white font-medium">live.aiosell.com</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="text-slate-400">Inbound Webhook:</span>
            <code className="text-cyan-300 font-mono text-[11px] truncate max-w-xs">{webhookUrl}</code>
            <button
              onClick={() => copyToClipboard(webhookUrl, "webhook")}
              className="text-slate-400 hover:text-white transition cursor-pointer"
              title="Copy Webhook URL"
            >
              {copiedKey === "webhook" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("channels")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === "channels"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          Partner Channels ({channels.length})
        </button>
        <button
          onClick={() => setActiveTab("push_suite")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === "push_suite"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Send className="w-3.5 h-3.5 text-indigo-600" />
          Push Rates & Inventory
        </button>
        <button
          onClick={() => setActiveTab("fetch_verify")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === "fetch_verify"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Database className="w-3.5 h-3.5 text-amber-600" />
          Fetch & Inspect API
        </button>
        <button
          onClick={() => setActiveTab("webhook")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === "webhook"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Radio className="w-3.5 h-3.5 text-emerald-600" />
          Inbound Webhook Tester
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === "logs"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 text-purple-600" />
          Sync Logs ({ingestionLogs.length})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ALL CHANNELS GRID (SPREADSHEET PARTNERS) */}
      {/* ========================================================================= */}
      {activeTab === "channels" && (
        <div className="space-y-4">
          {/* FILTER AND SEARCH CONTROLS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50/80 p-2.5 rounded-lg border border-slate-200">
            <div className="flex flex-wrap items-center gap-1.5">
              {(["ALL", "OTA", "CM", "Booking Engine", "OTA Aggregator"] as CategoryFilter[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
                    categoryFilter === cat
                      ? "bg-blue-600 text-white shadow-xs font-semibold"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {cat === "ALL" ? `All (${channels.length})` : cat}
                </button>
              ))}
            </div>

            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search channel or OTA slug..."
                className="w-full sm:w-64 pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-500"
              />
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            </div>
          </div>

          {/* CHANNELS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredChannels.map((channel) => {
              const brand = OTA_BRAND_COLORS[channel.channelName] || {
                initials: channel.code.substring(0, 2).toUpperCase(),
                color: "#1e293b",
                bg: "#f1f5f9",
              };
              const isConnected = channel.status === "Connected";
              const multiplier = channel.rateMultiplier || 1.0;

              return (
                <div
                  key={channel.id}
                  className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* TOP: LOGO, NAME, STATUS */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0"
                          style={{ backgroundColor: brand.bg, color: brand.color }}
                        >
                          {brand.initials}
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-slate-900 leading-tight">{channel.channelName}</h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                              {channel.code}
                            </span>
                            <span className="text-[10px] text-blue-600 font-mono font-medium">
                              slug: {channel.aiosell_slug || "—"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <button
                          onClick={() => onToggleChannelStatus(channel.id)}
                          className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border transition cursor-pointer ${
                            isConnected
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                          }`}
                        >
                          {isConnected ? "Enabled in PMS" : "Disabled in PMS"}
                        </button>
                        <span className="text-[10px] font-medium text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.2 rounded">
                          {channel.category || "OTA"}
                        </span>
                      </div>
                    </div>

                    {/* METRICS ROW */}
                    <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-slate-100 text-center mb-3">
                      <div>
                        <p className="text-[10px] text-slate-500">Revenue</p>
                        <p className="text-xs font-bold text-slate-800">{formatCurrency(channel.revenueThisMonth || 0)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500">Bookings</p>
                        <p className="text-xs font-bold text-slate-800">{channel.bookingsThisMonth || 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500">Commission</p>
                        <p className="text-xs font-bold text-slate-800">{channel.commissionRate}%</p>
                      </div>
                    </div>
                  </div>

                  {/* BOTTOM: RATE MULTIPLIER SLIDER / CONTROL */}
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                        <SlidersHorizontal className="w-3 h-3 text-slate-500" /> Rate Multiplier
                      </span>
                      <span className="font-mono font-bold text-blue-700 text-xs">
                        {multiplier.toFixed(2)}x ({multiplier >= 1 ? `+${Math.round((multiplier - 1) * 100)}%` : `-${Math.round((1 - multiplier) * 100)}%`})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0.80"
                        max="1.50"
                        step="0.05"
                        value={multiplier}
                        onChange={(e) => onUpdateMarkup(channel.id, parseFloat(e.target.value))}
                        className="w-full accent-blue-600 cursor-pointer h-1.5"
                      />
                      <button
                        onClick={async () => {
                          if (!channel.aiosell_slug) return;
                          try {
                            await channelMultiplierMutation.mutateAsync({
                              multiplier: multiplier,
                              channels: [channel.aiosell_slug],
                            });
                            showToast({
                              title: "Aiosell Multiplier Pushed",
                              description: `${channel.channelName} updated to ${multiplier.toFixed(2)}x factor`,
                              type: "success",
                            });
                          } catch (err: any) {
                            showToast({ title: "Multiplier Failed", description: err.message, type: "error" });
                          }
                        }}
                        className="px-2 py-1 text-[10px] font-bold bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded transition shrink-0 cursor-pointer"
                        title="Push this multiplier to Aiosell"
                      >
                        Push
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PUSH RATES & INVENTORY SUITE */}
      {/* ========================================================================= */}
      {activeTab === "push_suite" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Aiosell Push Dispatcher</h2>
              <p className="text-xs text-slate-500">
                Directly push rates, inventory counts, restrictions, or channel multipliers to Aiosell Channel Manager.
              </p>
            </div>

            {/* ACTION SELECTOR */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: "rate", label: "Push Rates" },
                { id: "inventory", label: "Push Inventory" },
                { id: "restrictions", label: "Restrictions" },
                { id: "multiplier", label: "Multiplier" },
                { id: "noshow", label: "Mark No-Show" },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setPushType(btn.id as any)}
                  className={`py-2 px-2 text-xs font-semibold rounded-lg border text-center transition cursor-pointer ${
                    pushType === btn.id
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* DYNAMIC FORM BASED ON PUSH TYPE */}
            <div className="space-y-3 pt-2">
              {pushType !== "multiplier" && pushType !== "noshow" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date (Inclusive)</label>
                    <input
                      type="date"
                      value={pushStartDate}
                      onChange={(e) => setPushStartDate(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">End Date (Inclusive)</label>
                    <input
                      type="date"
                      value={pushEndDate}
                      onChange={(e) => setPushEndDate(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* RATE PUSH FIELDS */}
              {pushType === "rate" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Room Code</label>
                    <select
                      value={pushRoomCode}
                      onChange={(e) => setPushRoomCode(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="executive">executive (Executive Room)</option>
                      <option value="suite">suite (Suite Room)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Rate Plan Code</label>
                    <select
                      value={pushRatePlanCode}
                      onChange={(e) => setPushRatePlanCode(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="executive-s-ep">executive-s-ep (Room Only - EP)</option>
                      <option value="executive-s-cp">executive-s-cp (Breakfast - CP)</option>
                      <option value="suite-s-ep">suite-s-ep (Suite Room Only)</option>
                      <option value="suite-d-cp">suite-d-cp (Suite Breakfast)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nightly Rate (INR)</label>
                    <input
                      type="number"
                      value={pushRateAmount}
                      onChange={(e) => setPushRateAmount(Number(e.target.value))}
                      className="w-full text-xs p-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* INVENTORY PUSH FIELDS */}
              {pushType === "inventory" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Room Code</label>
                    <select
                      value={pushRoomCode}
                      onChange={(e) => setPushRoomCode(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="executive">executive (Executive Room)</option>
                      <option value="suite">suite (Suite Room)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Available Room Count</label>
                    <input
                      type="number"
                      min="0"
                      value={pushInventoryCount}
                      onChange={(e) => setPushInventoryCount(Number(e.target.value))}
                      className="w-full text-xs p-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* RESTRICTIONS FIELDS */}
              {pushType === "restrictions" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Target Channels</label>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {["agoda", "booking.com", "gommt", "airbnb", "expedia"].map((ch) => (
                          <label key={ch} className="inline-flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-200 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={pushSelectedChannels.includes(ch)}
                              onChange={(e) => {
                                if (e.target.checked) setPushSelectedChannels([...pushSelectedChannels, ch]);
                                else setPushSelectedChannels(pushSelectedChannels.filter((c) => c !== ch));
                              }}
                              className="accent-blue-600 rounded"
                            />
                            <span>{ch}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Minimum Stay (Nights)</label>
                      <input
                        type="number"
                        min="1"
                        value={pushMinStay}
                        onChange={(e) => setPushMinStay(Number(e.target.value))}
                        className="w-full text-xs p-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pushStopSell}
                        onChange={(e) => setPushStopSell(e.target.checked)}
                        className="accent-red-600 w-4 h-4 rounded"
                      />
                      <span className="font-semibold text-red-600">Stop-Sell (Close All Bookings)</span>
                    </label>

                    <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pushCloseOnArrival}
                        onChange={(e) => setPushCloseOnArrival(e.target.checked)}
                        className="accent-amber-600 w-4 h-4 rounded"
                      />
                      <span>Close on Arrival (CTA)</span>
                    </label>

                    <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pushCloseOnDeparture}
                        onChange={(e) => setPushCloseOnDeparture(e.target.checked)}
                        className="accent-amber-600 w-4 h-4 rounded"
                      />
                      <span>Close on Departure (CTD)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* MULTIPLIER FIELDS */}
              {pushType === "multiplier" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Multiplier Factor (e.g. 1.25 = +25%)</label>
                      <input
                        type="number"
                        step="0.05"
                        value={pushMultiplierValue}
                        onChange={(e) => setPushMultiplierValue(Number(e.target.value))}
                        className="w-full text-xs p-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Target Channels</label>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {["gommt", "airbnb", "booking.com", "agoda"].map((ch) => (
                          <label key={ch} className="inline-flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-200 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={pushSelectedChannels.includes(ch)}
                              onChange={(e) => {
                                if (e.target.checked) setPushSelectedChannels([...pushSelectedChannels, ch]);
                                else setPushSelectedChannels(pushSelectedChannels.filter((c) => c !== ch));
                              }}
                              className="accent-blue-600 rounded"
                            />
                            <span>{ch}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MARK NO-SHOW FIELDS */}
              {pushType === "noshow" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">OTA Booking ID</label>
                    <input
                      type="text"
                      placeholder="e.g. 111222350"
                      value={noShowBookingId}
                      onChange={(e) => setNoShowBookingId(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Supported Channel</label>
                    <select
                      value={noShowChannel}
                      onChange={(e) => setNoShowChannel(e.target.value as any)}
                      className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="gommt">gommt (MakeMyTrip / Goibibo)</option>
                      <option value="booking.com">booking.com</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="pt-3">
                <Button
                  onClick={handleExecutePush}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  Execute Aiosell Push
                </Button>
              </div>
            </div>
          </div>

          {/* RESPONSE VIEWER */}
          <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Aiosell API Response</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>

              {pushResult ? (
                <pre className="text-[11px] text-emerald-300 overflow-x-auto whitespace-pre-wrap max-h-96">
                  {JSON.stringify(pushResult, null, 2)}
                </pre>
              ) : (
                <div className="text-slate-500 py-12 text-center">
                  <Send className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>Execute an action to inspect the raw response from Aiosell Channel Manager.</p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-400">
              Target Endpoint: <code className="text-cyan-300">live.aiosell.com/api/v2/cm/...</code>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: FETCH & INSPECT AIOSELL DATA */}
      {/* ========================================================================= */}
      {activeTab === "fetch_verify" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Fetch from Aiosell</h2>
              <p className="text-xs text-slate-500">
                Poll the live state of inventory, rates, or bookings as recorded on Aiosell Channel Manager.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Dataset Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["inventory", "rates", "reservation"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setFetchType(t)}
                      className={`py-1.5 px-2 text-xs font-semibold rounded-lg border capitalize transition cursor-pointer ${
                        fetchType === t ? "bg-blue-600 text-white border-blue-600" : "bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={fetchStartDate}
                  onChange={(e) => setFetchStartDate(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={fetchEndDate}
                  onChange={(e) => setFetchEndDate(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <Button
                onClick={handleExecuteFetch}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-2"
              >
                <Database className="w-3.5 h-3.5" />
                Query Aiosell API
              </Button>
            </div>
          </div>

          <div className="lg:col-span-2 bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Query Output ({fetchType.toUpperCase()})
                </span>
                <span className="text-[10px] text-slate-400">Endpoint: POST /api/v2/cm/data/{partnerId}</span>
              </div>

              {fetchResult ? (
                <pre className="text-[11px] text-emerald-300 overflow-x-auto whitespace-pre-wrap max-h-96">
                  {JSON.stringify(fetchResult, null, 2)}
                </pre>
              ) : (
                <div className="text-slate-500 py-16 text-center">
                  <Database className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>Click "Query Aiosell API" to fetch real-time channel state.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: INBOUND WEBHOOK TESTER & SIMULATOR */}
      {/* ========================================================================= */}
      {activeTab === "webhook" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">Inbound Webhook Simulator</h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                  HTTP Basic Auth Protected
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Exercise your inbound reservation endpoint. Simulates Aiosell calling SIGNINN-HMS with live booking payloads.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(["book", "modify", "cancel"] as const).map((act) => (
                <button
                  key={act}
                  onClick={() => setSimAction(act)}
                  className={`py-2 px-3 text-xs font-bold rounded-lg border uppercase tracking-wider transition cursor-pointer ${
                    simAction === act
                      ? act === "cancel"
                        ? "bg-red-600 text-white border-red-600 shadow-xs"
                        : "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {act} Reservation
                </button>
              ))}
            </div>

            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">OTA Booking ID</label>
                  <input
                    type="text"
                    value={simBookingId}
                    onChange={(e) => setSimBookingId(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Booking Channel</label>
                  <select
                    value={simChannelName}
                    onChange={(e) => setSimChannelName(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Goibibo">Goibibo (GoMMT)</option>
                    <option value="Booking.com">Booking.com</option>
                    <option value="Agoda">Agoda</option>
                    <option value="Airbnb">Airbnb</option>
                    <option value="Expedia">Expedia</option>
                  </select>
                </div>
              </div>

              {simAction !== "cancel" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Guest First Name</label>
                      <input
                        type="text"
                        value={simGuestFirst}
                        onChange={(e) => setSimGuestFirst(e.target.value)}
                        className="w-full text-xs p-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Guest Last Name</label>
                      <input
                        type="text"
                        value={simGuestLast}
                        onChange={(e) => setSimGuestLast(e.target.value)}
                        className="w-full text-xs p-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Guest Email</label>
                      <input
                        type="email"
                        value={simGuestEmail}
                        onChange={(e) => setSimGuestEmail(e.target.value)}
                        className="w-full text-xs p-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Total Amount (INR)</label>
                      <input
                        type="number"
                        value={simTotalAmount}
                        onChange={(e) => setSimTotalAmount(Number(e.target.value))}
                        className="w-full text-xs p-2 border border-slate-200 rounded-lg font-semibold"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div>
                      <span className="text-xs font-semibold text-slate-800">Payment Collection (PAH Flag)</span>
                      <p className="text-[11px] text-slate-500">
                        {simPah ? "Pay-at-Hotel: Guest settles balance at front desk upon check-in" : "Prepaid OTA: Virtual Card or channel settled before arrival"}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={simPah}
                        onChange={(e) => setSimPah(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-300 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-colors peer-checked:bg-amber-600"></div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Special Requests (Free text)</label>
                    <input
                      type="text"
                      value={simSpecialReq}
                      onChange={(e) => setSimSpecialReq(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                </>
              )}

              <div className="pt-2">
                <Button
                  onClick={handleExecuteWebhookSimulation}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-2"
                >
                  <Play className="w-3.5 h-3.5" />
                  Fire {simAction.toUpperCase()} Webhook
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Webhook Ingestion Output</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>

              {simResult ? (
                <pre className="text-[11px] text-emerald-300 overflow-x-auto whitespace-pre-wrap max-h-96">
                  {JSON.stringify(simResult, null, 2)}
                </pre>
              ) : (
                <div className="text-slate-500 py-16 text-center">
                  <Radio className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>Execute webhook simulator to verify automatic reservation & folio generation.</p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-400">
              Verified: <code className="text-emerald-400">Idempotent on Booking ID · Auto Folio Allocation</code>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SYNC LOGS & INGESTION AUDIT */}
      {/* ========================================================================= */}
      {activeTab === "logs" && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Aiosell Channel Ingestion Audit Logs</h2>
            <span className="text-xs text-slate-500">{ingestionLogs.length} events recorded</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Channel</th>
                  <th className="py-2.5 px-3">OTA Ref ID</th>
                  <th className="py-2.5 px-3">Guest Name</th>
                  <th className="py-2.5 px-3">Dates</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ingestionLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                      {log.created_at ? log.created_at.substring(0, 19).replace("T", " ") : "Just now"}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{log.channel}</td>
                    <td className="py-2.5 px-3 font-mono text-blue-600 font-medium">{log.ota_reservation_id}</td>
                    <td className="py-2.5 px-3">{log.guest_name || "Guest"}</td>
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                      {log.check_in_date} â†’ {log.check_out_date}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-800">
                      {formatCurrency(log.total_amount || 0)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.status === "Cancelled"
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : log.status === "Modified"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">{log.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
