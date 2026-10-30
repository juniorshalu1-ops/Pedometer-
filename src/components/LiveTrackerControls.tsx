import React, { useState } from 'react';
import { Play, Pause, Square, Smartphone, Compass, Sparkles, PlusCircle } from 'lucide-react';
import { TrackingMode, TrackingStatus } from '../types';
import { PRESET_ROUTES } from '../data/presetRoutes';

interface LiveTrackerControlsProps {
  status: TrackingStatus;
  mode: TrackingMode;
  onModeChange: (mode: TrackingMode) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onAddManualStep: () => void;
  selectedPresetRouteId: string;
  onSelectPresetRoute: (id: string) => void;
  simSpeedKmh: number;
  onSimSpeedChange: (speed: number) => void;
  isSensorSupported: boolean;
  onRequestSensorPermission: () => void;
}

export const LiveTrackerControls: React.FC<LiveTrackerControlsProps> = ({
  status,
  mode,
  onModeChange,
  onStart,
  onPause,
  onResume,
  onStop,
  onAddManualStep,
  selectedPresetRouteId,
  onSelectPresetRoute,
  simSpeedKmh,
  onSimSpeedChange,
  isSensorSupported,
  onRequestSensorPermission,
}) => {
  const [shakeAnim, setShakeAnim] = useState(false);

  const handleManualTap = () => {
    setShakeAnim(true);
    onAddManualStep();
    setTimeout(() => setShakeAnim(false), 200);
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4">
      {/* Top Segmented Controls: Sensor vs Simulator Mode */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
          <button
            onClick={() => onModeChange('real')}
            disabled={status !== 'idle'}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'real'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            } ${status !== 'idle' ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Real Sensors (GPS & Accel)</span>
          </button>

          <button
            onClick={() => onModeChange('simulate')}
            disabled={status !== 'idle'}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'simulate'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            } ${status !== 'idle' ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <Compass className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Walk Simulator</span>
          </button>
        </div>

        {/* Quick +1 Step Shake Button */}
        <button
          onClick={handleManualTap}
          className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-transform active:scale-95 ${
            shakeAnim ? 'translate-y-[-2px] border-emerald-500 text-emerald-600' : ''
          }`}
          title="Simulate 1 step manually"
        >
          <PlusCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Tap to Step</span>
        </button>
      </div>

      {/* Simulator Route & Speed Picker (Only visible when Simulator mode is selected) */}
      {mode === 'simulate' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/60">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Select Scenic Walking Route
            </label>
            <select
              value={selectedPresetRouteId}
              disabled={status !== 'idle'}
              onChange={(e) => onSelectPresetRoute(e.target.value)}
              className="w-full text-xs font-medium bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-60"
            >
              {PRESET_ROUTES.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.name} ({route.lengthKm} km · {route.city})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Walking Pace
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: 'Stroll', speed: 3.5 },
                { label: 'Brisk', speed: 5.0 },
                { label: 'Power', speed: 7.2 },
              ].map((item) => (
                <button
                  key={item.label}
                  disabled={status !== 'idle'}
                  onClick={() => onSimSpeedChange(item.speed)}
                  className={`py-1.5 px-2 text-xs font-medium rounded-lg border text-center transition-colors ${
                    simSpeedKmh === item.speed
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  } disabled:opacity-60`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Primary Action Buttons */}
      <div className="flex items-center gap-3">
        {status === 'idle' ? (
          <button
            onClick={onStart}
            className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm shadow-emerald-900/10 active:scale-[0.99] transition-all whitespace-nowrap"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Walking Route</span>
          </button>
        ) : status === 'tracking' ? (
          <>
            <button
              onClick={onPause}
              className="flex-1 h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition-all whitespace-nowrap"
            >
              <Pause className="w-4 h-4 fill-current" />
              <span>Pause Walk</span>
            </button>
            <button
              onClick={onStop}
              className="h-12 px-6 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition-all whitespace-nowrap"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Finish & Save</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onResume}
              className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition-all whitespace-nowrap"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Resume Walk</span>
            </button>
            <button
              onClick={onStop}
              className="h-12 px-6 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition-all whitespace-nowrap"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Finish & Save</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
