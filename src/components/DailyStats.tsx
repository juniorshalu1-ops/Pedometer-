import React, { useState } from 'react';
import { DailyActivity, MilestoneBadge, UserSettings } from '../types';
import { Trophy, Award, Flame, Calendar, BarChart2, CheckCircle2 } from 'lucide-react';

interface DailyStatsProps {
  dailyActivities: Record<string, DailyActivity>;
  settings: UserSettings;
  badges: MilestoneBadge[];
}

export const DailyStats: React.FC<DailyStatsProps> = ({
  dailyActivities,
  settings,
  badges,
}) => {
  const [selectedRange, setSelectedRange] = useState<'7days' | '14days'>('7days');
  const [selectedDate, setSelectedDate] = useState<string>(
    Object.keys(dailyActivities).sort().reverse()[0] || ''
  );

  // Sort daily activities chronologically
  const sortedDates = Object.keys(dailyActivities).sort();
  const rangeCount = selectedRange === '7days' ? 7 : 14;
  const recentDates = sortedDates.slice(-rangeCount);

  // Selected day's activity
  const activeDayData = dailyActivities[selectedDate] || dailyActivities[recentDates[recentDates.length - 1]];

  // Calculate streak (consecutive days hitting stepGoal)
  let streak = 0;
  for (let i = sortedDates.length - 1; i >= 0; i--) {
    const act = dailyActivities[sortedDates[i]];
    if (act && act.steps >= settings.stepGoal) {
      streak++;
    } else if (i === sortedDates.length - 1 && act && act.steps < settings.stepGoal) {
      // If today is in progress, still check yesterday's streak
      continue;
    } else {
      break;
    }
  }

  // Maximum step value for scaling bar heights
  const maxStepsInPeriod = Math.max(
    settings.stepGoal * 1.25,
    ...recentDates.map((d) => dailyActivities[d]?.steps || 0)
  );

  // Lifetime aggregates
  const totalLifetimeSteps = Object.values(dailyActivities).reduce((acc, d) => acc + d.steps, 0);
  const totalLifetimeKm = (
    Object.values(dailyActivities).reduce((acc, d) => acc + d.distanceMeters, 0) / 1000
  ).toFixed(1);
  const totalLifetimeHours = (
    Object.values(dailyActivities).reduce((acc, d) => acc + d.activeMinutes, 0) / 60
  ).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Overview Metric Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Active Streak</span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
            {streak} {streak === 1 ? 'Day' : 'Days'}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            &gt;= {settings.stepGoal.toLocaleString()} steps/day
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Trophy className="w-3.5 h-3.5 text-emerald-500" />
            <span>Lifetime Steps</span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
            {totalLifetimeSteps.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Recorded strides
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-sky-500" />
            <span>Total Distance</span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
            {totalLifetimeKm} km
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            All logged routes
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <BarChart2 className="w-3.5 h-3.5 text-violet-500" />
            <span>Total Active Time</span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
            {totalLifetimeHours} hrs
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Movement time
          </div>
        </div>
      </div>

      {/* Main Bar Chart: Daily Steps vs Target */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              Daily Steps History
            </h4>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span>Goal: {settings.stepGoal.toLocaleString()} steps</span>
              <span aria-hidden="true">·</span>
              <span>Tap any bar to inspect hourly breakdown</span>
            </div>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              onClick={() => setSelectedRange('7days')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                selectedRange === '7days'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Past 7 Days
            </button>
            <button
              onClick={() => setSelectedRange('14days')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                selectedRange === '14days'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Past 14 Days
            </button>
          </div>
        </div>

        {/* The Bar Chart Graphic */}
        <div className="relative pt-6 pb-2">
          {/* Target Goal Dotted Line */}
          <div
            className="absolute left-0 right-0 border-b border-dashed border-emerald-500/60 z-10 flex items-center justify-end pointer-events-none"
            style={{
              bottom: `${(settings.stepGoal / maxStepsInPeriod) * 100}%`,
            }}
          >
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold bg-white dark:bg-slate-900 px-1.5 -translate-y-2 rounded">
              Target {settings.stepGoal.toLocaleString()}
            </span>
          </div>

          {/* Bars Grid */}
          <div className="h-56 flex items-end justify-between gap-1 sm:gap-2">
            {recentDates.map((dateStr) => {
              const act = dailyActivities[dateStr];
              const steps = act?.steps || 0;
              const isSelected = selectedDate === dateStr;
              const isGoalMet = steps >= settings.stepGoal;
              const barHeightPercent = Math.max(4, (steps / maxStepsInPeriod) * 100);

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className="flex-1 h-full flex flex-col items-center justify-end group focus:outline-none"
                  title={`${dateStr}: ${steps.toLocaleString()} steps`}
                >
                  {/* Tooltip on hover/active */}
                  <div
                    className={`text-[10px] font-mono tabular-nums mb-1 font-semibold transition-opacity ${
                      isSelected
                        ? 'opacity-100 text-slate-900 dark:text-white'
                        : 'opacity-0 group-hover:opacity-100 text-slate-500'
                    }`}
                  >
                    {steps > 999 ? `${(steps / 1000).toFixed(1)}k` : steps}
                  </div>

                  {/* Visual Bar */}
                  <div
                    className={`w-full max-w-[36px] rounded-t-lg transition-all ${
                      isSelected
                        ? 'ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-slate-900'
                        : ''
                    } ${
                      isGoalMet
                        ? 'bg-emerald-500 hover:bg-emerald-600'
                        : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
                    }`}
                    style={{ height: `${barHeightPercent}%` }}
                  />

                  {/* Day Label */}
                  <span
                    className={`text-[11px] mt-2 font-medium transition-colors ${
                      isSelected
                        ? 'font-bold text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {act?.dayLabel || dateStr.slice(-2)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hourly Breakdown for the Selected Date */}
      {activeDayData && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Hourly Activity · {activeDayData.date}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Total for day: {activeDayData.steps.toLocaleString()} steps · {(activeDayData.distanceMeters / 1000).toFixed(2)} km
              </p>
            </div>
            {activeDayData.steps >= settings.stepGoal && (
              <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Goal Reached</span>
              </div>
            )}
          </div>

          <div className="h-32 flex items-end justify-between gap-1 pt-4">
            {Array.from({ length: 17 }, (_, i) => i + 6).map((hour) => {
              const hourSteps = activeDayData.hourlySteps?.[hour] || 0;
              const maxHourly = Math.max(1200, ...Object.values(activeDayData.hourlySteps || {}));
              const heightPercent = Math.max(4, (hourSteps / maxHourly) * 100);

              return (
                <div key={hour} className="flex-1 flex flex-col items-center justify-end h-full group">
                  <div
                    className="w-full max-w-[18px] bg-sky-500/80 hover:bg-sky-500 rounded-t-sm transition-all"
                    style={{ height: `${heightPercent}%` }}
                    title={`${hour}:00 - ${hourSteps} steps`}
                  />
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 font-mono">
                    {hour % 3 === 0 ? `${hour}h` : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Milestone Badges & Achievements */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <h4 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Milestone Badges & Achievements</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {badges.map((b) => {
            const isUnlocked = !!b.unlockedAt;
            return (
              <div
                key={b.id}
                className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all ${
                  isUnlocked
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                }`}
              >
                <div
                  className={`p-2.5 rounded-xl text-base shrink-0 ${
                    isUnlocked
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                  }`}
                >
                  <Trophy className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {b.title}
                    </h5>
                    {isUnlocked && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        Unlocked
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                    {b.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
