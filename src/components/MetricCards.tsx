import React from 'react';
import { Footprints, Flame, Timer, Gauge, Route, HeartPulse } from 'lucide-react';

interface MetricCardsProps {
  steps: number;
  stepGoal: number;
  distanceMeters: number;
  durationSeconds: number;
  calories: number;
  cadence: number;
  paceSecPerKm: number;
  unit: 'metric' | 'imperial';
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatPace(secPerKm: number, unit: 'metric' | 'imperial'): string {
  if (secPerKm <= 0 || !isFinite(secPerKm)) return '--:--';
  const multiplier = unit === 'imperial' ? 1.60934 : 1.0;
  const targetSec = Math.round(secPerKm * multiplier);
  const m = Math.floor(targetSec / 60);
  const s = targetSec % 60;
  if (m > 99) return '--:--';
  return `${m}'${String(s).padStart(2, '0')}"`;
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  steps,
  stepGoal,
  distanceMeters,
  durationSeconds,
  calories,
  cadence,
  paceSecPerKm,
  unit,
}) => {
  const distance =
    unit === 'imperial'
      ? (distanceMeters * 0.000621371).toFixed(2)
      : (distanceMeters / 1000).toFixed(2);
  const distUnit = unit === 'imperial' ? 'mi' : 'km';
  const paceUnit = unit === 'imperial' ? 'min/mi' : 'min/km';

  // Circular progress calculations for steps
  const progressPercent = Math.min(100, Math.round((steps / Math.max(1, stepGoal)) * 100));
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  // Cadence description
  let cadenceLabel = 'Stationary';
  if (cadence > 120) cadenceLabel = 'Aerobic Stride';
  else if (cadence >= 100) cadenceLabel = 'Brisk Walk';
  else if (cadence > 40) cadenceLabel = 'Easy Stroll';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Primary Hero Ring Card: Steps & Daily Progress */}
      <div className="md:col-span-1 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Daily Step Target</span>
          <span className="tabular-nums font-mono">{progressPercent}%</span>
        </div>

        <div className="my-3 flex items-center justify-center">
          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 128 128">
              {/* Background ring */}
              <circle
                cx="64"
                cy="64"
                r={radius}
                className="stroke-slate-100 dark:stroke-slate-800"
                strokeWidth="10"
                fill="transparent"
              />
              {/* Active animated progress ring */}
              <circle
                cx="64"
                cy="64"
                r={radius}
                className="stroke-emerald-500 transition-all duration-500 ease-out"
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>

            {/* Centered Step Numbers */}
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums font-mono">
                {steps.toLocaleString()}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                of {stepGoal.toLocaleString()} steps
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            <Footprints className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Remaining</span>
          </div>
          <span className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">
            {Math.max(0, stepGoal - steps).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Grid of 4 Core Metrics */}
      <div className="md:col-span-2 grid grid-cols-2 gap-3 sm:gap-4">
        {/* Distance Card */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Distance</span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400">
              <Route className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums font-mono">
              {distance}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Total {distUnit} walked
            </div>
          </div>
        </div>

        {/* Active Time Card */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Duration</span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400">
              <Timer className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums font-mono">
              {formatDuration(durationSeconds)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Elapsed walking time
            </div>
          </div>
        </div>

        {/* Calories Burned Card */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Energy Burned</span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-amber-600 dark:text-amber-400">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums font-mono">
              {calories}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Active kilocalories (kcal)
            </div>
          </div>
        </div>

        {/* Cadence & Pace Card */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Rhythm & Pace</span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-violet-600 dark:text-violet-400">
              <HeartPulse className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums font-mono">
                {cadence}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                SPM · {cadenceLabel}
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold tracking-tight text-slate-900 dark:text-white tabular-nums font-mono">
                {formatPace(paceSecPerKm, unit)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {paceUnit} avg
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
