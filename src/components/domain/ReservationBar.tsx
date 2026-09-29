import React from 'react';
import { Crown, AlertCircle, Clock } from 'lucide-react';
import { Reservation, ReservationStatus } from '../../types';
import { OTABadge } from './OTABadge';

export interface ReservationBarProps {
  reservation: Reservation;
  onClick?: () => void;
  onMouseEnter?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: () => void;
  style?: React.CSSProperties;
  className?: string;
  compact?: boolean;
}

export const ReservationBar: React.FC<ReservationBarProps> = ({
  reservation,
  onClick,
  onMouseEnter,
  onMouseLeave,
  style,
  className = '',
  compact = false,
}) => {
  const getStatusClasses = (status: ReservationStatus) => {
    switch (status) {
      case 'Checked In':
        return 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700 ring-blue-500/30';
      case 'Confirmed':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 ring-emerald-500/30';
      case 'Checked Out':
        return 'bg-slate-400 hover:bg-slate-500 text-white border-slate-500 ring-slate-400/30';
      case 'Provisional':
      case 'Inquiry':
        return 'bg-teal-600 hover:bg-teal-700 text-white border-teal-700 ring-teal-500/30';
      case 'Cancelled':
      case 'No-show':
        return 'bg-rose-500 hover:bg-rose-600 text-white border-rose-600 ring-rose-500/30';
      default:
        return 'bg-slate-700 hover:bg-slate-800 text-white border-slate-800 ring-slate-600/30';
    }
  };

  const statusClass = getStatusClasses(reservation.status);

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={style}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`absolute inset-y-2 rounded-md px-2 flex items-center gap-1.5 text-xs font-semibold shadow-xs border cursor-pointer select-none overflow-hidden transition-colors duration-150 z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${statusClass} ${className}`}
      title={`${reservation.guest.firstName} ${reservation.guest.lastName} • ${reservation.status} • ${reservation.source}`}
    >
      <div className="truncate flex flex-1 items-center gap-1.5 min-w-0">
        {reservation.guest.vipStatus && (
          <Crown className="w-3 h-3 text-amber-300 shrink-0 fill-amber-300" />
        )}
        <span className="truncate font-medium">
          {reservation.guest.firstName} {reservation.guest.lastName}
        </span>
      </div>

      {!compact && (
        <div className="flex items-center gap-1 shrink-0 max-w-[45%] overflow-hidden">
          <OTABadge
            source={reservation.bookingSource || reservation.source || (reservation as any).booking_source || 'Direct Website'}
            size="xs"
            className="bg-black/25 border-white/20 text-white font-normal shadow-none hidden sm:inline-flex"
          />
          <span className="text-[10px] opacity-85 hidden xl:inline font-mono">
            {reservation.nights}n
          </span>
        </div>
      )}
    </div>
  );
};
