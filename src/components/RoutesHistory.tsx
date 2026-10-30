import React, { useState } from 'react';
import { WalkingSession, UserSettings } from '../types';
import { exportToGPX, exportToGeoJSON } from '../services/storage';
import { Route, Footprints, Timer, Flame, Mountain, Download, Eye, Trash2, MapPin } from 'lucide-react';

interface RoutesHistoryProps {
  sessions: WalkingSession[];
  onSelectRouteForMap: (session: WalkingSession) => void;
  onDeleteSession: (id: string) => void;
  unit: 'metric' | 'imperial';
}

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${totalSeconds % 60}s`;
}

export const RoutesHistory: React.FC<RoutesHistoryProps> = ({
  sessions,
  onSelectRouteForMap,
  onDeleteSession,
  unit,
}) => {
  const [activeExportId, setActiveExportId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Recorded Walking Routes
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {sessions.length} recorded {sessions.length === 1 ? 'route' : 'routes'} with GPS coordinates & elevation
          </p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <Route className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            No Routes Recorded Yet
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Start a walk from the Live Tracker tab to record your walking route, GPS coordinates, and step analytics.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {sessions.map((session) => {
            const distance =
              unit === 'imperial'
                ? (session.distanceMeters * 0.000621371).toFixed(2) + ' mi'
                : (session.distanceMeters / 1000).toFixed(2) + ' km';

            return (
              <div
                key={session.id}
                className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                {/* Left Info */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {session.name}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                      · {session.dateString}
                    </span>
                  </div>

                  {session.notes && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 italic">
                      "{session.notes}"
                    </p>
                  )}

                  {/* Clean unboxed metrics with subtle separators */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400 pt-1 font-mono tabular-nums">
                    <div className="flex items-center gap-1">
                      <Footprints className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>{session.steps.toLocaleString()} steps</span>
                    </div>
                    <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                    <div className="flex items-center gap-1">
                      <Route className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                      <span>{distance}</span>
                    </div>
                    <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                    <div className="flex items-center gap-1">
                      <Timer className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>{formatDuration(session.durationSeconds)}</span>
                    </div>
                    <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                    <div className="flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-rose-500" />
                      <span>{session.calories} kcal</span>
                    </div>
                    {session.elevationGainMeters > 0 && (
                      <>
                        <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                        <div className="flex items-center gap-1">
                          <Mountain className="w-3.5 h-3.5 text-emerald-500" />
                          <span>+{session.elevationGainMeters}m</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Right Interactive Actions */}
                <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => onSelectRouteForMap(session)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors whitespace-nowrap"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View on Map</span>
                  </button>

                  {/* Export GPX/GeoJSON dropdown */}
                  <div className="relative">
                    <button
                      onClick={() =>
                        setActiveExportId(activeExportId === session.id ? null : session.id)
                      }
                      className="p-2 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                      title="Export Route"
                      aria-label="Export Route"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    {activeExportId === session.id && (
                      <div className="absolute right-0 top-10 w-36 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-30">
                        <button
                          onClick={() => {
                            exportToGPX(session);
                            setActiveExportId(null);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-between"
                        >
                          <span>Export GPX</span>
                          <span className="text-[10px] text-slate-400">Garmin</span>
                        </button>
                        <button
                          onClick={() => {
                            exportToGeoJSON(session);
                            setActiveExportId(null);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-between"
                        >
                          <span>Export GeoJSON</span>
                          <span className="text-[10px] text-slate-400">GIS</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      if (window.confirm(`Delete route "${session.name}"?`)) {
                        onDeleteSession(session.id);
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
                    title="Delete route"
                    aria-label="Delete route"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
