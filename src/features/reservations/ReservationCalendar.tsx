import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  Calendar as CalendarIcon,
  Search,
  BedDouble,
  Clock,
  Sparkles,
  Info,
  DollarSign,
  User,
  Phone,
  ShieldAlert,
} from 'lucide-react';
import { Room, Reservation, RoomType } from '../../types';
import { formatCurrency, getStatusColor, getChannelBadgeStyle } from '../../utils/formatters';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ReservationBar } from '../../components/domain';

export interface ReservationCalendarProps {
  rooms: Room[];
  roomTypes: RoomType[];
  reservations: Reservation[];
  onOpenReservationDetail: (resId: string) => void;
  onOpenNewReservation: (initialRoomId?: string, initialDate?: string) => void;
  onOpenCheckIn: (resId: string) => void;
  onOpenCheckOut: (resId: string) => void;
}

export const ReservationCalendar: React.FC<ReservationCalendarProps> = ({
  rooms,
  roomTypes,
  reservations,
  onOpenReservationDetail,
  onOpenNewReservation,
  onOpenCheckIn,
  onOpenCheckOut,
}) => {
  // Calendar viewport date range state (Defaults to 14 days starting from yesterday for live context)
  const [startDateStr, setStartDateStr] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  });
  const [viewDays, setViewDays] = useState<7 | 14 | 30>(14);

  // Filters
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>('all');
  const [selectedFloor, setSelectedFloor] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Hover card state
  const [hoveredRes, setHoveredRes] = useState<{
    res: Reservation;
    x: number;
    y: number;
  } | null>(null);

  // Generate date array
  const dates = useMemo(() => {
    const list: string[] = [];
    const base = new Date(startDateStr);
    for (let i = 0; i < viewDays; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      list.push(d.toISOString().split('T')[0]);
    }
    return list;
  }, [startDateStr, viewDays]);

  const availableFloors = useMemo(() => {
    return Array.from(new Set(rooms.map((r) => r.floor))).sort((a, b) => a - b);
  }, [rooms]);

  // Filter rooms
  const filteredRooms = useMemo(() => {
    return rooms
      .filter((r) => {
        if (selectedRoomTypeId !== 'all' && r.roomTypeId !== selectedRoomTypeId) return false;
        if (selectedFloor !== 'all' && r.floor.toString() !== selectedFloor) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          return (
            r.roomNumber.toLowerCase().includes(q) ||
            r.roomTypeName.toLowerCase().includes(q) ||
            (r.currentGuestName && r.currentGuestName.toLowerCase().includes(q))
          );
        }
        return true;
      })
      .sort((a, b) => parseInt(a.roomNumber) - parseInt(b.roomNumber));
  }, [rooms, selectedRoomTypeId, selectedFloor, searchQuery]);

  // Navigate calendar dates
  const handleShiftDate = (days: number) => {
    const d = new Date(startDateStr);
    d.setDate(d.getDate() + days);
    setStartDateStr(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setStartDateStr(d.toISOString().split('T')[0]);
  };

  // Unassigned reservations
  const unassignedReservations = reservations.filter(
    (r) => !r.roomId && r.status !== 'Cancelled' && r.status !== 'Checked Out'
  );

  return (
    <div className="space-y-4">
      {/* Calendar Top Control Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-white/95 p-4 rounded-2xl border border-slate-200/90 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/70">
            <button
              onClick={() => handleShiftDate(-viewDays)}
              className="p-1.5 rounded-lg hover:bg-white text-slate-700 transition-colors cursor-pointer"
              title="Previous period"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1 text-xs font-bold text-slate-800 hover:bg-white rounded-lg transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={() => handleShiftDate(viewDays)}
              className="p-1.5 rounded-lg hover:bg-white text-slate-700 transition-colors cursor-pointer"
              title="Next period"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium px-2 py-1 rounded-xl bg-slate-50 border border-slate-200/60">
            <CalendarIcon className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-bold text-slate-900">
              {new Date(dates[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span>–</span>
            <span className="font-bold text-slate-900">
              {new Date(dates[dates.length - 1]).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>

          {/* View range switcher (7 days, 14 days, 30 days) */}
          <div className="inline-flex rounded-xl border border-slate-200/70 bg-slate-100/90 p-1">
            {[7, 14, 30].map((num) => (
              <button
                key={num}
                onClick={() => setViewDays(num as 7 | 14 | 30)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  viewDays === num ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {num}D
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap xl:justify-end">
          {/* Room Type select */}
          <select
            value={selectedRoomTypeId}
            onChange={(e) => setSelectedRoomTypeId(e.target.value)}
            className="text-xs h-9 px-3 bg-slate-50/80 hover:bg-white border border-slate-200/90 rounded-xl text-slate-800 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer transition-colors shadow-2xs"
          >
            <option value="all">All Room Types</option>
            {roomTypes.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.name}
              </option>
            ))}
          </select>

          {/* Floor select */}
          <select
            value={selectedFloor}
            onChange={(e) => setSelectedFloor(e.target.value)}
            className="text-xs h-9 px-3 bg-slate-50/80 hover:bg-white border border-slate-200/90 rounded-xl text-slate-800 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer transition-colors shadow-2xs"
          >
            <option value="all">All Floors</option>
            {availableFloors.map((floor) => (
              <option key={floor} value={floor.toString()}>
                Floor {floor}
              </option>
            ))}
          </select>

          {/* Search input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Room # or guest..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs h-9 pl-9 pr-3 bg-slate-50/80 hover:bg-white border border-slate-200/90 rounded-xl text-slate-800 placeholder:text-slate-400 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 w-36 sm:w-48 transition-colors shadow-2xs"
            />
          </div>

          <button
            onClick={() => onOpenNewReservation()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold shadow-xs hover:shadow-md hover:shadow-blue-500/20 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Book Room
          </button>
        </div>
      </div>

      {/* Unassigned Reservations Bar (if any) */}
      {unassignedReservations.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-200/90 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
              <ShieldAlert className="w-4 h-4 shrink-0" />
            </div>
            <span className="font-bold text-amber-900">
              {unassignedReservations.length} Unassigned Arrivals:
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {unassignedReservations.map((u) => (
                <button
                  key={u.id}
                  onClick={() => onOpenReservationDetail(u.id)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 font-semibold transition-colors cursor-pointer shadow-2xs"
                >
                  {u.refCode} ({u.guest.firstName} {u.guest.lastName} • {u.roomTypeName})
                </button>
              ))}
            </div>
          </div>
          <span className="text-xs text-amber-800 font-medium hidden sm:inline">Click to assign room number</span>
        </div>
      )}

      {/* Calendar Tape Chart Grid */}
      <div className="bg-white/95 rounded-2xl border border-slate-200/90 shadow-[0_1px_3px_rgba(15,23,42,0.03)] overflow-hidden relative">
        <div className="overflow-x-auto min-h-[500px]">
          <div className="min-w-[960px]">
            {/* Header Row: Dates */}
            <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
              {/* Room Column Header */}
              <div className="w-48 shrink-0 p-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-r border-gray-200 flex items-center justify-between bg-gray-50">
                <span>Room / Type</span>
                <span className="text-[10px] text-gray-400 lowercase font-normal">
                  {filteredRooms.length} rooms
                </span>
              </div>

              {/* Date Columns */}
              <div className="flex-1 flex">
                {dates.map((dateStr) => {
                  const d = new Date(dateStr);
                  const isToday = dateStr === new Date().toISOString().slice(0, 10);
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                  const dayNum = d.getDate();

                  return (
                    <div
                      key={dateStr}
                      className={`flex-1 min-w-[64px] p-2 text-center border-r border-gray-100 transition-colors ${
                        isToday ? 'bg-blue-50/70 border-blue-200' : isWeekend ? 'bg-gray-100/50' : ''
                      }`}
                    >
                      <div
                        className={`text-[10px] uppercase font-bold tracking-tight ${
                          isToday ? 'text-blue-700' : 'text-gray-400'
                        }`}
                      >
                        {dayName}
                      </div>
                      <div
                        className={`text-xs font-bold mt-0.5 ${
                          isToday
                            ? 'w-6 h-6 rounded-full bg-blue-600 text-white mx-auto flex items-center justify-center'
                            : 'text-gray-800'
                        }`}
                      >
                        {dayNum}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Room Rows */}
            <div className="divide-y divide-gray-100">
              {filteredRooms.map((room) => {
                // Find reservations for this room that overlap with calendar date window
                const roomResList = reservations.filter((r) => {
                  if (r.roomId !== room.id) return false;
                  if (r.status === 'Cancelled') return false;
                  // Check overlap
                  return r.checkInDate <= dates[dates.length - 1] && r.checkOutDate >= dates[0];
                });

                return (
                  <div key={room.id} className="flex h-14 group hover:bg-gray-50/40 relative">
                    {/* Left Room Info Column */}
                    <div className="w-48 shrink-0 p-2.5 border-r border-gray-200 flex items-center justify-between bg-white group-hover:bg-gray-50/60 transition-colors z-2">
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-gray-900">
                            {room.roomNumber}
                          </span>
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              room.housekeepingStatus === 'Ready' || room.housekeepingStatus === 'Inspected'
                                ? 'bg-emerald-500'
                                : room.housekeepingStatus === 'Dirty'
                                ? 'bg-rose-500'
                                : 'bg-amber-500'
                            }`}
                            title={`Housekeeping: ${room.housekeepingStatus}`}
                          />
                        </div>
                        <div className="text-[10px] text-gray-500 truncate font-normal">
                          {room.roomTypeName}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-gray-400">Fl {room.floor}</span>
                      </div>
                    </div>

                    {/* Timeline Grid Cells */}
                    <div className="flex-1 flex relative">
                      {/* Background Day Cells */}
                      {dates.map((dateStr) => {
                        const isToday = dateStr === new Date().toISOString().slice(0, 10);
                        return (
                          <div
                            key={dateStr}
                            onClick={() => onOpenNewReservation(room.id, dateStr)}
                            className={`flex-1 min-w-[64px] border-r border-gray-100 transition-colors hover:bg-blue-50/20 cursor-pointer ${
                              isToday ? 'bg-blue-50/30' : ''
                            }`}
                            title={`Click to book Room ${room.roomNumber} on ${dateStr}`}
                          />
                        );
                      })}

                      {/* Render Reservation Blocks */}
                      {roomResList.map((res) => {
                        // Calculate start offset and width in days
                        const startIndex = dates.indexOf(res.checkInDate);
                        const endIndex = dates.indexOf(res.checkOutDate);

                        const colStart = startIndex >= 0 ? startIndex : 0;
                        const colEnd = endIndex >= 0 ? endIndex : dates.length;
                        const spanDays = Math.max(1, colEnd - colStart);

                        const leftPercent = (colStart / dates.length) * 100;
                        const widthPercent = (spanDays / dates.length) * 100;

                        // Reservation block styling based on status
                        const statusColors: Record<
                          string,
                          { bg: string; text: string; border: string; hover: string }
                        > = {
                          'Checked In': {
                            bg: 'bg-blue-600',
                            text: 'text-white',
                            border: 'border-blue-700',
                            hover: 'hover:bg-blue-700',
                          },
                          Confirmed: {
                            bg: 'bg-emerald-600',
                            text: 'text-white',
                            border: 'border-emerald-700',
                            hover: 'hover:bg-emerald-700',
                          },
                          'Checked Out': {
                            bg: 'bg-gray-400',
                            text: 'text-white',
                            border: 'border-gray-500',
                            hover: 'hover:bg-gray-500',
                          },
                          'Maintenance Hold': {
                            bg: 'bg-amber-600',
                            text: 'text-white',
                            border: 'border-amber-700',
                            hover: 'hover:bg-amber-700',
                          },
                        };

                        const c = statusColors[res.status] || {
                          bg: 'bg-slate-700',
                          text: 'text-white',
                          border: 'border-slate-800',
                          hover: 'hover:bg-slate-800',
                        };

                        return (
                          <ReservationBar
                            key={res.id}
                            reservation={res}
                            onClick={() => onOpenReservationDetail(res.id)}
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setHoveredRes({
                                res,
                                x: rect.left + rect.width / 2,
                                y: rect.top,
                              });
                            }}
                            onMouseLeave={() => setHoveredRes(null)}
                            style={{
                              left: `calc(${leftPercent}% + 3px)`,
                              width: `calc(${widthPercent}% - 6px)`,
                            }}
                            compact={spanDays <= 2}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Hover Card Detail on reservation cursor hover */}
      {hoveredRes && (
        <div
          style={{
            position: 'fixed',
            left: `${Math.min(window.innerWidth - 300, Math.max(10, hoveredRes.x - 140))}px`,
            top: `${Math.max(10, hoveredRes.y - 145)}px`,
            zIndex: 60,
          }}
          className="w-72 bg-white rounded-xl shadow-2xl border border-gray-200 p-3.5 pointer-events-none animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <h5 className="text-xs font-bold text-gray-900">
                  {hoveredRes.res.guest.firstName} {hoveredRes.res.guest.lastName}
                </h5>
                {hoveredRes.res.guest.vipStatus && (
                  <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                    VIP
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-500">{hoveredRes.res.refCode}</p>
            </div>
            <Badge variant="status" status={hoveredRes.res.status} size="sm" />
          </div>

          <div className="mt-2.5 pt-2 border-t border-gray-100 space-y-1.5 text-[11px] text-gray-600">
            <div className="flex justify-between">
              <span>Dates:</span>
              <span className="font-medium text-gray-900">
                {hoveredRes.res.checkInDate} → {hoveredRes.res.checkOutDate} ({hoveredRes.res.nights} nights)
              </span>
            </div>
            <div className="flex justify-between">
              <span>Room & Type:</span>
              <span className="font-medium text-gray-900">
                Room {hoveredRes.res.roomNumber} ({hoveredRes.res.roomTypeName})
              </span>
            </div>
            <div className="flex justify-between">
              <span>Channel:</span>
              <Badge variant="channel" channel={hoveredRes.res.bookingSource} size="sm" />
            </div>
            <div className="flex justify-between">
              <span>Folio Balance:</span>
              <span className={`font-semibold ${hoveredRes.res.balanceAmount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {hoveredRes.res.balanceAmount > 0
                  ? `Due ${formatCurrency(hoveredRes.res.balanceAmount)}`
                  : 'Paid in Full'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tape Chart Legend Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center justify-between flex-wrap gap-3 text-xs text-gray-600">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-semibold text-gray-900">Legend:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-600" />
            <span>Checked In</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-600" />
            <span>Confirmed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-gray-400" />
            <span>Checked Out</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-600" />
            <span>Maintenance Hold</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Ready / Clean</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Dirty Turnover</span>
          </div>
        </div>
      </div>
    </div>
  );
};
