import React, { useState, useMemo } from 'react';
import {
  Tag,
  Plus,
  Sliders,
  Sparkles,
  TrendingUp,
  Percent,
  Calendar,
  CheckCircle2,
  RefreshCw,
  Radio,
  Save,
} from 'lucide-react';
import { RatePlan, RoomType } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { useAiosellConfigQuery, useAiosellMappingQuery, useAiosellPushRatesMutation } from '../../services/api/queries';
import { mappedAiosellRoom } from '../../utils/aiosellMapping';

export interface RatesViewProps {
  ratePlans: RatePlan[];
  roomTypes: RoomType[];
  onUpdateRatePlan: (plan: RatePlan) => Promise<void>;
}

export const RatesView: React.FC<RatesViewProps> = ({
  ratePlans,
  roomTypes,
  onUpdateRatePlan,
}) => {
  const { showToast } = useToast();
  const pushRatesMutation = useAiosellPushRatesMutation();
  const { data: aiosellConfig } = useAiosellConfigQuery();
  const { data: aiosellMapping } = useAiosellMappingQuery(undefined, undefined, Boolean(aiosellConfig?.configured));

  const [selectedPlan, setSelectedPlan] = useState<RatePlan | null>(null);
  const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);
  const [bulkPercent, setBulkPercent] = useState(10);
  const [isPushingAiosell, setIsPushingAiosell] = useState(false);

  // Dynamic pricing rolling 7-day window starting today
  const dates = useMemo(() => {
    const list: string[] = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      list.push(d.toISOString().split('T')[0]);
    }
    return list;
  }, []);

  // Matrix rates state: `${roomTypeId}-${date}` -> rate
  const [customRates, setCustomRates] = useState<Record<string, number>>({});

  const getEffectiveRate = (rt: RoomType, d: string, idx: number) => {
    const key = `${rt.id}-${d}`;
    if (customRates[key] !== undefined) return customRates[key];
    const isWeekend = idx === 3 || idx === 4; // Fri/Sat surcharge
    return isWeekend ? rt.basePrice + 800 : rt.basePrice;
  };

  const handleRateCellChange = (rtId: string, d: string, valStr: string) => {
    const numeric = parseInt(valStr.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(numeric)) {
      setCustomRates((prev) => ({ ...prev, [`${rtId}-${d}`]: numeric }));
    }
  };

  const handlePushRatesToAiosell = async () => {
    setIsPushingAiosell(true);
    try {
      if (!aiosellConfig?.configured) throw new Error('Configure Aiosell on the server before pushing rates.');
      // Build rate updates for Aiosell
      const updates = dates.map((d, idx) => {
        const rates = roomTypes.map((rt) => {
          const rateVal = getEffectiveRate(rt, d, idx);
          const mappedRoom = mappedAiosellRoom(aiosellMapping, rt);
          if (mappedRoom.rateplans?.length !== 1) {
            throw new Error(`Select a mapped rate plan for ${rt.name} in the Channel Manager push form.`);
          }
          return {
            roomCode: mappedRoom.room_id,
            rateplanCode: mappedRoom.rateplans[0].rateplan_id,
            rate: rateVal,
          };
        });
        return {
          startDate: d,
          endDate: d,
          rates,
        };
      });

      await pushRatesMutation.mutateAsync({ updates });
      showToast({
        title: 'Rates Pushed to Aiosell',
        description: `Live rates pushed to Aiosell Channel Manager for next 7 days.`,
        type: 'success',
      });
    } catch (err: any) {
      showToast({
        title: 'Sync Failed',
        description: err.message || 'Could not push rates to Aiosell',
        type: 'error',
      });
    } finally {
      setIsPushingAiosell(false);
    }
  };

  const handleApplyBulk = () => {
    // Apply bulk surge to custom rates
    const nextRates = { ...customRates };
    roomTypes.forEach((rt) => {
      dates.forEach((d, idx) => {
        const current = getEffectiveRate(rt, d, idx);
        const adjusted = Math.round(current * (1 + bulkPercent / 100));
        nextRates[`${rt.id}-${d}`] = adjusted;
      });
    });
    setCustomRates(nextRates);
    showToast({
      title: 'Bulk Yield Surge Applied',
      description: `All BAR rates updated by +${bulkPercent}% across the 7-day grid. Click "Push Rates to Aiosell" to broadcast.`,
      type: 'success',
    });
    setIsBulkUpdateOpen(false);
  };

  const handleSavePlan = async () => {
    if (!selectedPlan) return;
    try {
      await onUpdateRatePlan(selectedPlan);
      showToast({
        title: 'Rate Plan Updated',
        description: `${selectedPlan.name} configuration saved.`,
        type: 'success',
      });
      setSelectedPlan(null);
    } catch (err: any) {
      showToast({
        title: 'Error Saving Plan',
        description: err.message || 'Failed to update plan',
        type: 'error',
      });
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-purple-600" />
            <h1 className="text-xl font-bold tracking-tight text-gray-950 font-sans">
              Rates & Yield Pricing Manager
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {aiosellConfig?.configured ? 'Aiosell configured' : 'Aiosell setup required'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Dynamic pricing rules, meal plan packages, rate parity, and real-time Aiosell OTA distribution.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsBulkUpdateOpen(true)}
            leftIcon={<TrendingUp className="w-3.5 h-3.5 text-blue-600" />}
          >
            Bulk Rate Surge (+%)
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handlePushRatesToAiosell}
            disabled={isPushingAiosell}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isPushingAiosell ? 'animate-spin' : ''}`} />}
          >
            {isPushingAiosell ? 'Pushing to Aiosell...' : 'Push Rates to Aiosell'}
          </Button>
        </div>
      </div>

      {/* Rate Plans Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ratePlans.map((plan) => (
          <div
            key={plan.id}
            className="bg-white rounded-xl border border-gray-200 p-4 shadow-2xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-[10px] text-gray-400 block">{plan.code}</span>
                  <h4 className="text-sm font-bold text-gray-900 mt-0.5">{plan.name}</h4>
                </div>
                <Badge variant="status" status={plan.status} size="sm" />
              </div>

              <div className="mt-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Meal Plan:</span>
                  <span className="font-semibold text-gray-900">{plan.mealPlan}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Cancellation:</span>
                  <span className="text-gray-900 truncate max-w-[170px]">{plan.cancellationPolicy}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Pricing Rule:</span>
                  <span className="font-bold text-purple-700">
                    {plan.markupPercent > 0
                      ? `+${plan.markupPercent}% on Base`
                      : plan.discountPercent > 0
                      ? `-${plan.discountPercent}% Discount`
                      : 'Standard Base Rate'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[10px] text-gray-400">Min Stay: {plan.minNights} night(s)</span>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => setSelectedPlan(plan)}
                leftIcon={<Sliders className="w-3 h-3" />}
              >
                Edit Plan
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Date x Room Type Live Pricing Matrix */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">
              7-Day Rate & Yield Matrix (BAR Room Only)
            </h3>
            <p className="text-[11px] text-gray-500">Live baseline tariffs pushed to OTAs via Aiosell Channel Manager</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              Parity Maintained across Portals
            </span>
            <Button
              variant="outline"
              size="xs"
              onClick={handlePushRatesToAiosell}
              disabled={isPushingAiosell}
              leftIcon={<Radio className="w-3 h-3 text-emerald-600" />}
            >
              Sync Grid
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-100/50 text-gray-600 uppercase text-[10px]">
                <th className="p-3 sticky left-0 bg-gray-100 z-10 w-44">Room Category</th>
                {dates.map((d) => (
                  <th key={d} className="p-3 text-center min-w-[100px]">
                    <div className="font-bold text-gray-900">
                      {new Date(d).toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className="text-[10px] text-gray-400">{d.slice(5)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {roomTypes.map((rt) => (
                <tr key={rt.id} className="hover:bg-gray-50">
                  <td className="p-3 font-semibold text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-100">
                    <div>{rt.name}</div>
                    <span className="text-[10px] text-gray-400 font-normal">{rt.totalInventory} rooms total</span>
                  </td>
                  {dates.map((d, idx) => {
                    const currentVal = getEffectiveRate(rt, d, idx);
                    return (
                      <td key={d} className="p-3 text-center">
                        <input
                          type="text"
                          value={`₹${currentVal}`}
                          onChange={(e) => handleRateCellChange(rt.id, d, e.target.value)}
                          className="w-20 text-center text-xs font-bold text-gray-900 bg-white border border-gray-200 rounded py-1 hover:border-blue-500 focus:border-blue-600 outline-none"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Rate Surge Modal */}
      <Modal
        isOpen={isBulkUpdateOpen}
        onClose={() => setIsBulkUpdateOpen(false)}
        maxWidth="md"
        title="Apply Dynamic Bulk Rate Surge"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setIsBulkUpdateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleApplyBulk}>
              Apply Rate Surge
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <p className="text-gray-600">
            Increase or decrease all room tariffs across the calendar based on high demand or festival weekends.
          </p>

          <Input
            type="number"
            label="Rate Adjustment Percentage (+%)"
            value={bulkPercent}
            onChange={(e) => setBulkPercent(parseFloat(e.target.value) || 0)}
          />

          <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200 text-blue-900">
            <strong>Yield Rule Active:</strong> Applying a +{bulkPercent}% increase to Deluxe Room will
            adjust rates from ₹4,500 to {formatCurrency(Math.round(4500 * (1 + bulkPercent / 100)))}.
          </div>
        </div>
      </Modal>

      {/* Edit Rate Plan Modal */}
      {selectedPlan && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedPlan(null)}
          maxWidth="md"
          title={`Edit Rate Plan: ${selectedPlan.name}`}
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setSelectedPlan(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSavePlan} leftIcon={<Save className="w-3.5 h-3.5" />}>
                Save Plan Changes
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-xs">
            <Input
              label="Plan Name"
              value={selectedPlan.name}
              onChange={(e) => setSelectedPlan({ ...selectedPlan, name: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Meal Plan</label>
                <select
                  value={selectedPlan.mealPlan}
                  onChange={(e) => setSelectedPlan({ ...selectedPlan, mealPlan: e.target.value as RatePlan['mealPlan'] })}
                  className="w-full text-xs h-8 px-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none"
                >
                  <option value="EP">Room Only (EP)</option>
                  <option value="CP">Bed & Breakfast (CP)</option>
                  <option value="MAP">Half Board (MAP)</option>
                  <option value="AP">Full Board (AP)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Status</label>
                <select
                  value={selectedPlan.status}
                  onChange={(e) => setSelectedPlan({ ...selectedPlan, status: e.target.value as any })}
                  className="w-full text-xs h-8 px-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                label="Markup on Base (%)"
                value={selectedPlan.markupPercent}
                onChange={(e) => setSelectedPlan({ ...selectedPlan, markupPercent: parseFloat(e.target.value) || 0 })}
              />
              <Input
                type="number"
                label="Minimum Nights"
                value={selectedPlan.minNights}
                onChange={(e) => setSelectedPlan({ ...selectedPlan, minNights: parseInt(e.target.value) || 1 })}
              />
            </div>

            <Input
              label="Cancellation Policy"
              value={selectedPlan.cancellationPolicy}
              onChange={(e) => setSelectedPlan({ ...selectedPlan, cancellationPolicy: e.target.value })}
            />
          </div>
        </Modal>
      )}
    </div>
  );
};
