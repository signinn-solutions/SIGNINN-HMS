import React, { useState, useMemo } from 'react';
import {
  CalendarCheck2,
  Ban,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Sparkles,
  RefreshCw,
  Radio,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { RoomType, Room } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { useAiosellConfigQuery, useAiosellMappingQuery, useAiosellPushRestrictionsMutation } from '../../services/api/queries';
import { mappedAiosellRoom } from '../../utils/aiosellMapping';

export interface AvailabilityViewProps {
  roomTypes: RoomType[];
  rooms: Room[];
}

export const AvailabilityView: React.FC<AvailabilityViewProps> = ({ roomTypes, rooms }) => {
  const { showToast } = useToast();
  const pushRestrictionsMutation = useAiosellPushRestrictionsMutation();
  const { data: aiosellConfig } = useAiosellConfigQuery();
  const { data: aiosellMapping } = useAiosellMappingQuery(undefined, undefined, Boolean(aiosellConfig?.configured));

  const [viewDays, setViewDays] = useState<7 | 14>(7);
  const [dayOffset, setDayOffset] = useState(0);
  const [isPushing, setIsPushing] = useState(false);

  // Generate rolling dates starting today
  const dates = useMemo(() => {
    const list: Array<{ date: string; day: string; isPeak: boolean }> = [];
    const now = new Date();
    now.setDate(now.getDate() + dayOffset);

    for (let i = 0; i < viewDays; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const dayOfWeek = d.getDay(); // 0 is Sunday, 5 is Friday, 6 is Saturday
      const isPeak = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0;
      list.push({
        date: d.toISOString().split('T')[0],
        day: d.toLocaleDateString('en-US', { weekday: 'short' }),
        isPeak,
      });
    }
    return list;
  }, [viewDays, dayOffset]);

  // Stop sell state per room type & date key
  const [stopSells, setStopSells] = useState<Record<string, boolean>>({});
  const [minStays, setMinStays] = useState<Record<string, number>>({});

  const toggleStopSell = (key: string) => {
    setStopSells((prev) => {
      const next = !prev[key];
      showToast({
        title: next ? 'Stop Sell Applied' : 'Channel Inventory Opened',
        description: next ? 'OTA booking engines blocked for this date.' : 'Rooms open for sale.',
        type: next ? 'warning' : 'success',
      });
      return { ...prev, [key]: next };
    });
  };

  const handlePushRestrictionsToAiosell = async () => {
    setIsPushing(true);
    try {
      if (!aiosellConfig?.configured) throw new Error('Configure Aiosell on the server before pushing restrictions.');
      const updates = dates.map((d) => {
        const roomsPayload = roomTypes.map((rt) => {
          const key = `${rt.id}-${d.date}`;
          const isStopSell = !!stopSells[key];
          const minStay = minStays[key] || 1;
          const roomCode = mappedAiosellRoom(aiosellMapping, rt).room_id;

          return {
            roomCode,
            restrictions: {
              stopSell: isStopSell,
              minimumStay: minStay,
              maximumStay: null,
              closeOnArrival: false,
              closeOnDeparture: false,
              minimumStayArrival: null,
              maximumStayArrival: null,
              exactStayArrival: null,
              minimumAdvanceReservation: null,
              maximumAdvanceReservation: null,
            },
          };
        });

        return {
          startDate: d.date,
          endDate: d.date,
          rooms: roomsPayload,
        };
      });

      await pushRestrictionsMutation.mutateAsync({
        type: 'inventory',
        to_channels: ['booking.com', 'gommt', 'agoda', 'airbnb', 'expedia'],
        updates,
      });

      showToast({
        title: 'Restrictions Pushed to Aiosell',
        description: 'Stop sell and stay length controls broadcasted to all channels.',
        type: 'success',
      });
    } catch (err: any) {
      showToast({
        title: 'Push Error',
        description: err.message || 'Failed to push restrictions',
        type: 'error',
      });
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CalendarCheck2 className="w-5 h-5 text-emerald-600" />
            <h1 className="text-xl font-bold tracking-tight text-gray-950 font-sans">
              Availability & Restrictions Grid
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {aiosellConfig?.configured ? 'Aiosell configured' : 'Aiosell setup required'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Real-time channel distribution inventory controls, stop-sells, minimum stay rules, and OTA parity.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-xs">
            <button
              onClick={() => setViewDays(7)}
              className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                viewDays === 7 ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setViewDays(14)}
              className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                viewDays === 14 ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              14 Days
            </button>
          </div>

          <div className="flex items-center border border-gray-200 rounded-lg bg-white">
            <button
              onClick={() => setDayOffset((prev) => prev - viewDays)}
              className="p-1.5 hover:bg-gray-50 text-gray-600 cursor-pointer"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDayOffset(0)}
              className="px-2 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={() => setDayOffset((prev) => prev + viewDays)}
              className="p-1.5 hover:bg-gray-50 text-gray-600 cursor-pointer"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handlePushRestrictionsToAiosell}
            disabled={isPushing}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isPushing ? 'animate-spin' : ''}`} />}
          >
            {isPushing ? 'Broadcasting...' : 'Push Restrictions'}
          </Button>
        </div>
      </div>

      {/* Grid Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="p-3 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-gray-700">Distribution Status Legend:</span>
            <span className="text-gray-500 flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Open for Booking
            </span>
            <span className="text-gray-500 flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Min Stay Applied
            </span>
            <span className="text-gray-500 flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Stop Sell Active
            </span>
          </div>

          <span className="text-[11px] text-gray-400">
            Window: {dates[0]?.date} to {dates[dates.length - 1]?.date}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px]">
                <th className="p-3 sticky left-0 bg-gray-50 z-10 w-44">Room Type</th>
                {dates.map((d) => (
                  <th key={d.date} className="p-3 text-center min-w-[110px]">
                    <div className={`font-bold ${d.isPeak ? 'text-indigo-900' : 'text-gray-900'}`}>{d.day}</div>
                    <div className="text-[10px] text-gray-400">{d.date.slice(5)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {roomTypes.map((rt) => {
                const totalInType = rt.totalInventory;
                return (
                  <tr key={rt.id} className="hover:bg-gray-50/50">
                    <td className="p-3 font-semibold text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-100">
                      <div>{rt.name}</div>
                      <span className="text-[10px] text-gray-400 font-normal">Cap: {totalInType} rooms</span>
                    </td>

                    {dates.map((d) => {
                      const key = `${rt.id}-${d.date}`;
                      const isStopSell = !!stopSells[key];
                      const minStay = minStays[key] || 1;
                      const availableRooms = isStopSell ? 0 : Math.max(1, totalInType - (d.isPeak ? 4 : 2));

                      return (
                        <td key={d.date} className="p-2.5 text-center">
                          <div
                            className={`p-2 rounded-lg border transition-all ${
                              isStopSell
                                ? 'bg-rose-50 border-rose-200 text-rose-950'
                                : minStay > 1
                                ? 'bg-amber-50/60 border-amber-200 text-amber-950'
                                : 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                            }`}
                          >
                            <div className="text-base font-extrabold">
                              {isStopSell ? '0' : availableRooms}
                              <span className="text-[10px] font-normal text-gray-400">/{totalInType}</span>
                            </div>

                            <div className="mt-1 flex items-center justify-center gap-1">
                              {minStay > 1 && (
                                <span className="text-[9px] px-1 py-0.2 bg-amber-200 text-amber-900 font-bold rounded">
                                  Min {minStay}N
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => toggleStopSell(key)}
                              className="mt-1.5 w-full text-[10px] font-bold py-0.5 rounded cursor-pointer transition-colors bg-white/80 hover:bg-white shadow-2xs border border-gray-200"
                            >
                              {isStopSell ? 'Open Sales' : 'Stop Sell'}
                            </button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
