import React, { useState } from 'react';
import { Footprints, Route, Timer, Flame, Mountain, HeartPulse, X } from 'lucide-react';

interface SaveWalkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, notes: string) => void;
  onDiscard: () => void;
  steps: number;
  distanceMeters: number;
  durationSeconds: number;
  calories: number;
  cadence: number;
  elevationGainMeters: number;
  unit: 'metric' | 'imperial';
}

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}m ${s}s`;
}

export const SaveWalkModal: React.FC<SaveWalkModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDiscard,
  steps,
  distanceMeters,
  durationSeconds,
  calories,
  cadence,
  elevationGainMeters,
  unit,
}) => {
  if (!isOpen) return null;

  const defaultName = `Walk · ${new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })} ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

  const [name, setName] = useState(defaultName);
  const [notes, setNotes] = useState('');

  const distance =
    unit === 'imperial'
      ? (distanceMeters * 0.000621371).toFixed(2) + ' mi'
      : (distanceMeters / 1000).toFixed(2) + ' km';

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Walk Finished!
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Review your walk summary and save your route to your activity history.
        </p>

        {/* 6 Summary Stat Badges */}
        <div className="grid grid-cols-3 gap-2.5 my-5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
              <Footprints className="w-3 h-3 text-emerald-600" />
              <span>Steps</span>
            </div>
            <div className="text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5 tabular-nums">
              {steps.toLocaleString()}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
              <Route className="w-3 h-3 text-sky-600" />
              <span>Distance</span>
            </div>
            <div className="text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5 tabular-nums">
              {distance}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
              <Timer className="w-3 h-3 text-amber-600" />
              <span>Time</span>
            </div>
            <div className="text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5 tabular-nums">
              {formatDuration(durationSeconds)}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
              <Flame className="w-3 h-3 text-rose-600" />
              <span>Calories</span>
            </div>
            <div className="text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5 tabular-nums">
              {calories} kcal
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
              <HeartPulse className="w-3 h-3 text-violet-600" />
              <span>Avg Cadence</span>
            </div>
            <div className="text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5 tabular-nums">
              {cadence} SPM
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
              <Mountain className="w-3 h-3 text-emerald-600" />
              <span>Climb</span>
            </div>
            <div className="text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5 tabular-nums">
              +{elevationGainMeters} m
            </div>
          </div>
        </div>

        {/* Inputs */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Route Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              placeholder="e.g., Riverside Walk"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs font-medium px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              placeholder="Weather was sunny, brisk pace..."
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onDiscard}
            className="px-4 py-2.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
          >
            Discard Walk
          </button>
          <button
            onClick={() => onSave(name, notes)}
            className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-900/10 transition-colors"
          >
            Save Route to History
          </button>
        </div>
      </div>
    </div>
  );
};
