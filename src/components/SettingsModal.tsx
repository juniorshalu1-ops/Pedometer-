import React from 'react';
import { UserSettings } from '../types';
import { X, Sliders, Volume2, Activity, User, Ruler } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSaveSettings: (settings: UserSettings) => void;
  onResetSeedData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onResetSeedData,
}) => {
  if (!isOpen) return null;

  const handleChange = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    const updated = { ...settings, [key]: value };

    // Auto-calculate stride if height changes and autoStride is on
    if (key === 'userHeightCm' && updated.autoStride) {
      updated.strideLengthCm = Number(((value as number) * 0.415).toFixed(1));
    }
    if (key === 'autoStride' && value === true) {
      updated.strideLengthCm = Number((updated.userHeightCm * 0.415).toFixed(1));
    }

    onSaveSettings(updated);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <Sliders className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Pedometer Settings
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          Customize your daily targets, biometric profile, and motion sensor calibration.
        </p>

        <div className="space-y-6">
          {/* Daily Step Target */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Daily Step Goal
              </label>
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {settings.stepGoal.toLocaleString()} steps
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-2">
              {[6000, 8000, 10000, 12500].map((goal) => (
                <button
                  key={goal}
                  onClick={() => handleChange('stepGoal', goal)}
                  className={`py-1.5 px-2 text-xs font-semibold rounded-lg border transition-colors ${
                    settings.stepGoal === goal
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {(goal / 1000).toFixed(0)}k
                </button>
              ))}
            </div>

            <input
              type="range"
              min={3000}
              max={25000}
              step={500}
              value={settings.stepGoal}
              onChange={(e) => handleChange('stepGoal', Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
          </div>

          {/* Unit System */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
              Measurement Units
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleChange('unit', 'metric')}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-colors ${
                  settings.unit === 'metric'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                Metric (km · kg · cm)
              </button>
              <button
                onClick={() => handleChange('unit', 'imperial')}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-colors ${
                  settings.unit === 'imperial'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                Imperial (mi · lbs · in)
              </button>
            </div>
          </div>

          {/* Biometrics (Weight & Height) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Body Weight ({settings.unit === 'metric' ? 'kg' : 'lbs'})
              </label>
              <input
                type="number"
                min={30}
                max={250}
                value={settings.userWeightKg}
                onChange={(e) => handleChange('userWeightKg', Number(e.target.value))}
                className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">For calorie burn</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Height (cm)
              </label>
              <input
                type="number"
                min={100}
                max={230}
                value={settings.userHeightCm}
                onChange={(e) => handleChange('userHeightCm', Number(e.target.value))}
                className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">For stride length</span>
            </div>
          </div>

          {/* Stride Length Calibration */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Ruler className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Stride Length
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                {settings.strideLengthCm} cm
              </span>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="autoStrideCheck"
                checked={settings.autoStride}
                onChange={(e) => handleChange('autoStride', e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="autoStrideCheck" className="text-xs text-slate-600 dark:text-slate-400">
                Auto-calculate from height (Height × 0.415)
              </label>
            </div>

            {!settings.autoStride && (
              <input
                type="range"
                min={45}
                max={110}
                step={0.5}
                value={settings.strideLengthCm}
                onChange={(e) => handleChange('strideLengthCm', Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
            )}
          </div>

          {/* Accelerometer Sensitivity */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
              Sensor Sensitivity
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'normal', 'high'] as const).map((sens) => (
                <button
                  key={sens}
                  onClick={() => handleChange('sensorSensitivity', sens)}
                  className={`py-1.5 px-2 text-xs font-semibold capitalize rounded-xl border transition-colors ${
                    settings.sensorSensitivity === sens
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {sens}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              High picks up gentler steps; Low rejects accidental pocket bounces.
            </span>
          </div>

          {/* Sound & Audio Cues */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Goal Celebration Chimes
              </span>
              <input
                type="checkbox"
                checked={settings.soundEffects}
                onChange={(e) => handleChange('soundEffects', e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Voice Split Coaching (1 km Announcements)
              </span>
              <input
                type="checkbox"
                checked={settings.voiceAnnouncements}
                onChange={(e) => handleChange('voiceAnnouncements', e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Reset / Done Button */}
        <div className="flex items-center justify-between gap-3 mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => {
              if (window.confirm('Reset sample walking routes and analytics back to initial demo seed?')) {
                onResetSeedData();
              }
            }}
            className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            Reset Demo Data
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
