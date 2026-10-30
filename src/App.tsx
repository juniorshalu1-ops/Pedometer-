/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  WalkPoint,
  WalkingSession,
  DailyActivity,
  UserSettings,
  MilestoneBadge,
  TrackingMode,
  TrackingStatus,
} from './types';
import { PRESET_ROUTES } from './data/presetRoutes';
import {
  DEFAULT_SETTINGS,
  loadUserSettings,
  saveUserSettings,
  loadDailyActivities,
  saveDailyActivities,
  loadWalkingSessions,
  saveWalkingSessions,
  loadMilestones,
  saveMilestones,
  getTodayDateString,
  getDayLabel,
  playGoalChime,
  playStepMilestoneSound,
  speakCoachAnnouncement,
} from './services/storage';
import { PedometerService, PedometerUpdate } from './services/pedometerEngine';

import { MapView } from './components/MapView';
import { MetricCards } from './components/MetricCards';
import { LiveTrackerControls } from './components/LiveTrackerControls';
import { SaveWalkModal } from './components/SaveWalkModal';
import { DailyStats } from './components/DailyStats';
import { RoutesHistory } from './components/RoutesHistory';
import { SettingsModal } from './components/SettingsModal';

import {
  Footprints,
  Map as MapIcon,
  Compass,
  BarChart3,
  Sliders,
  Sun,
  Moon,
  Route,
  Activity,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export default function App() {
  // Theme state (Dark / Light)
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('stridepath_theme') === 'dark' ||
        (!localStorage.getItem('stridepath_theme') &&
          window.matchMedia('(prefers-color-scheme: dark)').matches)
      );
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('stridepath_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('stridepath_theme', 'light');
    }
  }, [isDark]);

  // App Navigation tab state
  type TabType = 'tracker' | 'map' | 'routes' | 'analytics';
  const [activeTab, setActiveTab] = useState<TabType>('tracker');

  // User Settings & Profile
  const [settings, setSettings] = useState<UserSettings>(loadUserSettings);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Daily activity records and sessions
  const [dailyActivities, setDailyActivities] = useState<Record<string, DailyActivity>>(
    loadDailyActivities
  );
  const [sessions, setSessions] = useState<WalkingSession[]>(loadWalkingSessions);
  const [badges, setBadges] = useState<MilestoneBadge[]>(loadMilestones);

  // Live Pedometer & Route state
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>('idle');
  const [trackingMode, setTrackingMode] = useState<TrackingMode>('simulate');
  const [selectedPresetRouteId, setSelectedPresetRouteId] = useState<string>('central-park-loop');
  const [simSpeedKmh, setSimSpeedKmh] = useState<number>(5.0);

  // Live session metrics
  const [sessionSteps, setSessionSteps] = useState<number>(0);
  const [sessionDistanceMeters, setSessionDistanceMeters] = useState<number>(0);
  const [sessionDurationSeconds, setSessionDurationSeconds] = useState<number>(0);
  const [sessionCalories, setSessionCalories] = useState<number>(0);
  const [sessionCadence, setSessionCadence] = useState<number>(0);
  const [sessionPaceSecPerKm, setSessionPaceSecPerKm] = useState<number>(0);
  const [sessionElevationGain, setSessionElevationGain] = useState<number>(0);
  const [livePoints, setLivePoints] = useState<WalkPoint[]>([]);
  const [currentPosition, setCurrentPosition] = useState<WalkPoint | undefined>(undefined);

  // Save Modal state
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  // Goal celebration flag to prevent duplicate fires
  const goalCelebratedRef = useRef(false);
  const lastKmAnnouncedRef = useRef(0);

  // Active Map Route for viewing (either current live points or a loaded past session)
  const [inspectedSession, setInspectedSession] = useState<WalkingSession | null>(null);

  // Pedometer engine reference
  const pedometerRef = useRef<PedometerService | null>(null);

  // Handle incoming updates from pedometer engine
  const handlePedometerUpdate = useCallback(
    (update: PedometerUpdate) => {
      setSessionSteps(update.steps);
      setSessionDistanceMeters(update.distanceMeters);
      setSessionDurationSeconds(update.durationSeconds);
      setSessionCalories(update.calories);
      setSessionCadence(update.currentCadence);
      setSessionPaceSecPerKm(update.currentPaceSecPerKm);
      setSessionElevationGain(update.elevationGainMeters);
      setLivePoints(update.allPoints);

      if (update.latestPoint) {
        setCurrentPosition(update.latestPoint);
      }

      // Check daily goal celebration
      const todayStr = getTodayDateString();
      const currentTodaySteps = (dailyActivities[todayStr]?.steps || 0) + update.steps;

      if (currentTodaySteps >= settings.stepGoal && !goalCelebratedRef.current) {
        goalCelebratedRef.current = true;
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899'],
        });
        if (settings.soundEffects) {
          playGoalChime();
        }
        if (settings.voiceAnnouncements) {
          speakCoachAnnouncement(
            `Congratulations! You achieved your daily target of ${settings.stepGoal} steps!`
          );
        }
      }

      // 1 km split announcement
      const currentKm = Math.floor(update.distanceMeters / 1000);
      if (currentKm > lastKmAnnouncedRef.current && currentKm >= 1) {
        lastKmAnnouncedRef.current = currentKm;
        if (settings.soundEffects) {
          playStepMilestoneSound();
        }
        if (settings.voiceAnnouncements) {
          const paceMin = Math.floor(update.currentPaceSecPerKm / 60);
          const paceSec = update.currentPaceSecPerKm % 60;
          speakCoachAnnouncement(
            `${currentKm} kilometer completed. Current pace: ${paceMin} minutes ${paceSec} seconds per kilometer.`
          );
        }
      }
    },
    [dailyActivities, settings]
  );

  // Initialize or update Pedometer Service
  useEffect(() => {
    pedometerRef.current = new PedometerService(settings, handlePedometerUpdate);
    return () => {
      pedometerRef.current?.stop();
    };
  }, [handlePedometerUpdate, settings]);

  // Request initial GPS position for map center
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentPosition({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            timestamp: Date.now(),
            altitude: pos.coords.altitude ?? 25,
            accuracy: pos.coords.accuracy,
          });
        },
        () => {
          // Fallback to Central Park preset center
          setCurrentPosition({
            lat: 40.7829,
            lng: -73.9654,
            timestamp: Date.now(),
            altitude: 35,
          });
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  // Today's total steps (including any active session)
  const todayStr = getTodayDateString();
  const todaySavedSteps = dailyActivities[todayStr]?.steps || 0;
  const currentTotalTodaySteps = todaySavedSteps + sessionSteps;

  // Tracker action handlers
  const handleStartWalk = async () => {
    if (!pedometerRef.current) return;

    goalCelebratedRef.current = currentTotalTodaySteps >= settings.stepGoal;
    lastKmAnnouncedRef.current = 0;
    setInspectedSession(null);

    if (trackingMode === 'real') {
      await PedometerService.requestSensorPermission();
      pedometerRef.current.startLiveTracking();
    } else {
      const preset =
        PRESET_ROUTES.find((r) => r.id === selectedPresetRouteId) || PRESET_ROUTES[0];
      pedometerRef.current.startSimulation(preset.points, simSpeedKmh);
    }

    setTrackingStatus('tracking');
  };

  const handlePauseWalk = () => {
    pedometerRef.current?.pause();
    setTrackingStatus('paused');
  };

  const handleResumeWalk = () => {
    pedometerRef.current?.resume();
    setTrackingStatus('tracking');
  };

  const handleStopWalk = () => {
    pedometerRef.current?.pause();
    setIsSaveModalOpen(true);
  };

  const handleAddManualStep = () => {
    pedometerRef.current?.addManualSteps(1);
    if (trackingStatus === 'idle') {
      // Also update today's steps directly if idle
      const updated = { ...dailyActivities };
      const current = updated[todayStr] || {
        date: todayStr,
        dayLabel: getDayLabel(todayStr),
        steps: 0,
        distanceMeters: 0,
        calories: 0,
        activeMinutes: 0,
        sessionsCount: 0,
        hourlySteps: {},
      };

      current.steps += 1;
      current.distanceMeters += Math.round((settings.strideLengthCm || 72) / 100);
      current.calories += 1;
      const hour = new Date().getHours();
      current.hourlySteps[hour] = (current.hourlySteps[hour] || 0) + 1;
      updated[todayStr] = current;

      setDailyActivities(updated);
      saveDailyActivities(updated);
    }
  };

  // Save Walk Session to History & Daily Totals
  const handleSaveWalk = (name: string, notes: string) => {
    if (!pedometerRef.current) return;

    const sessionData = pedometerRef.current.getSessionData(name, notes);
    const updatedSessions = [sessionData, ...sessions];
    setSessions(updatedSessions);
    saveWalkingSessions(updatedSessions);

    // Update Daily Activities
    const updatedDaily = { ...dailyActivities };
    const current = updatedDaily[todayStr] || {
      date: todayStr,
      dayLabel: getDayLabel(todayStr),
      steps: 0,
      distanceMeters: 0,
      calories: 0,
      activeMinutes: 0,
      sessionsCount: 0,
      hourlySteps: {},
    };

    current.steps += sessionData.steps;
    current.distanceMeters += sessionData.distanceMeters;
    current.calories += sessionData.calories;
    current.activeMinutes += Math.round(sessionData.durationSeconds / 60);
    current.sessionsCount += 1;

    // Distribute steps to current hour
    const hour = new Date().getHours();
    current.hourlySteps[hour] = (current.hourlySteps[hour] || 0) + sessionData.steps;
    updatedDaily[todayStr] = current;

    setDailyActivities(updatedDaily);
    saveDailyActivities(updatedDaily);

    // Check Badges Unlock
    const updatedBadges = badges.map((b) => {
      if (b.unlockedAt) return b;
      if (b.id === '10k_daily' && current.steps >= 10000) {
        return { ...b, unlockedAt: todayStr };
      }
      if (b.id === 'first_route' && updatedSessions.length >= 1) {
        return { ...b, unlockedAt: todayStr };
      }
      return b;
    });
    setBadges(updatedBadges);
    saveMilestones(updatedBadges);

    // Reset live session
    pedometerRef.current.reset();
    setTrackingStatus('idle');
    setSessionSteps(0);
    setSessionDistanceMeters(0);
    setSessionDurationSeconds(0);
    setSessionCalories(0);
    setSessionCadence(0);
    setSessionElevationGain(0);
    setLivePoints([]);
    setIsSaveModalOpen(false);

    // Switch to Map tab to show completed route
    setInspectedSession(sessionData);
    setActiveTab('map');
  };

  const handleDiscardWalk = () => {
    pedometerRef.current?.reset();
    setTrackingStatus('idle');
    setSessionSteps(0);
    setSessionDistanceMeters(0);
    setSessionDurationSeconds(0);
    setSessionCalories(0);
    setSessionCadence(0);
    setSessionElevationGain(0);
    setLivePoints([]);
    setIsSaveModalOpen(false);
  };

  const handleDeleteSession = (id: string) => {
    const filtered = sessions.filter((s) => s.id !== id);
    setSessions(filtered);
    saveWalkingSessions(filtered);
    if (inspectedSession?.id === id) {
      setInspectedSession(null);
    }
  };

  const handleSelectRouteForMap = (session: WalkingSession) => {
    setInspectedSession(session);
    setActiveTab('map');
  };

  const handleResetSeedData = () => {
    localStorage.removeItem('stridepath_daily_activity');
    localStorage.removeItem('stridepath_walking_sessions');
    localStorage.removeItem('stridepath_milestone_badges');
    setDailyActivities(loadDailyActivities());
    setSessions(loadWalkingSessions());
    setBadges(loadMilestones());
    setIsSettingsOpen(false);
  };

  // Points to display on map: either live points while tracking or inspected past session points
  const activeMapPoints = inspectedSession ? inspectedSession.points : livePoints;
  const activeElevationGain = inspectedSession
    ? inspectedSession.elevationGainMeters
    : sessionElevationGain;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased transition-colors">
      {/* 
        Top Bar Contract (§2):
        Exactly 1 row, 3 zones separated by gap-8:
        [Brand wordmark] — [4-5 clean single-line nav links] — [1 primary action]
      */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark (Single text element) */}
          <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shadow-emerald-900/20">
              <Footprints className="w-5 h-5" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
              StridePath
            </span>
          </div>

          {/* Zone 2: 4 Clean Single-Line Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <button
              onClick={() => setActiveTab('tracker')}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'tracker'
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : ''
              }`}
            >
              Live Tracker
            </button>
            <button
              onClick={() => setActiveTab('map')}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'map'
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : ''
              }`}
            >
              Map Explorer
            </button>
            <button
              onClick={() => setActiveTab('routes')}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'routes'
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : ''
              }`}
            >
              Walking Routes
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'analytics'
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : ''
              }`}
            >
              Daily Analytics
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action (Quick Settings / Theme) */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Settings</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-8 flex flex-col gap-6">
        {/* TAB 1: LIVE TRACKER */}
        {activeTab === 'tracker' && (
          <div className="space-y-6">
            {/* Real-time Metric Cards */}
            <MetricCards
              steps={currentTotalTodaySteps}
              stepGoal={settings.stepGoal}
              distanceMeters={
                (dailyActivities[todayStr]?.distanceMeters || 0) + sessionDistanceMeters
              }
              durationSeconds={
                (dailyActivities[todayStr]?.activeMinutes || 0) * 60 + sessionDurationSeconds
              }
              calories={(dailyActivities[todayStr]?.calories || 0) + sessionCalories}
              cadence={sessionCadence}
              paceSecPerKm={sessionPaceSecPerKm}
              unit={settings.unit}
            />

            {/* Split Grid: Live Controls & Route Map */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Left Column: Live Tracker Controls & Activity Tips */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                <LiveTrackerControls
                  status={trackingStatus}
                  mode={trackingMode}
                  onModeChange={setTrackingMode}
                  onStart={handleStartWalk}
                  onPause={handlePauseWalk}
                  onResume={handleResumeWalk}
                  onStop={handleStopWalk}
                  onAddManualStep={handleAddManualStep}
                  selectedPresetRouteId={selectedPresetRouteId}
                  onSelectPresetRoute={setSelectedPresetRouteId}
                  simSpeedKmh={simSpeedKmh}
                  onSimSpeedChange={setSimSpeedKmh}
                  isSensorSupported={typeof window !== 'undefined' && 'ondevicemotion' in window}
                  onRequestSensorPermission={PedometerService.requestSensorPermission}
                />

                {/* Quiet Status & Step Detection Invariant info */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-semibold">
                    <span>Hardware Sensor Status</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                      {trackingStatus === 'tracking'
                        ? trackingMode === 'real'
                          ? 'Accelerometer Active'
                          : 'GPS Simulator Active'
                        : 'Standby'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <span>Sensitivity: {settings.sensorSensitivity}</span>
                    <span aria-hidden="true">·</span>
                    <span>Stride: {settings.strideLengthCm} cm</span>
                    <span aria-hidden="true">·</span>
                    <span>Goal: {settings.stepGoal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Map View */}
              <div className="lg:col-span-7 h-[420px] lg:h-auto min-h-[400px]">
                <MapView
                  currentPosition={currentPosition}
                  routePoints={activeMapPoints}
                  isTracking={trackingStatus === 'tracking'}
                  isDark={isDark}
                  unit={settings.unit}
                  elevationGainMeters={activeElevationGain}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MAP EXPLORER */}
        {activeTab === 'map' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {inspectedSession ? inspectedSession.name : 'GPS Walking Map Explorer'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {inspectedSession
                    ? `Inspecting route recorded on ${inspectedSession.dateString} · ${(inspectedSession.distanceMeters / 1000).toFixed(2)} km`
                    : 'Interactive route map with high-precision GPS waypoints, satellite layers, and elevation.'}
                </p>
              </div>

              {inspectedSession && (
                <button
                  onClick={() => setInspectedSession(null)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-200 transition-colors"
                >
                  Back to Live GPS
                </button>
              )}
            </div>

            <div className="h-[560px] w-full">
              <MapView
                currentPosition={currentPosition}
                routePoints={activeMapPoints}
                isTracking={trackingStatus === 'tracking'}
                isDark={isDark}
                unit={settings.unit}
                elevationGainMeters={activeElevationGain}
              />
            </div>
          </div>
        )}

        {/* TAB 3: WALKING ROUTES HISTORY */}
        {activeTab === 'routes' && (
          <RoutesHistory
            sessions={sessions}
            onSelectRouteForMap={handleSelectRouteForMap}
            onDeleteSession={handleDeleteSession}
            unit={settings.unit}
          />
        )}

        {/* TAB 4: DAILY ANALYTICS & STATS */}
        {activeTab === 'analytics' && (
          <DailyStats
            dailyActivities={dailyActivities}
            settings={settings}
            badges={badges}
          />
        )}
      </main>

      {/* 
        Mobile Fixed Bottom Tab Bar (§3 Pattern 1):
        Under 15% mobile viewport cap, 44px+ hitboxes, clean touch ergonomics
      */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 h-16 px-2 flex items-center justify-around">
        <button
          onClick={() => setActiveTab('tracker')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] transition-colors ${
            activeTab === 'tracker'
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
          aria-label="Tracker"
        >
          <Footprints className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-1">Tracker</span>
        </button>

        <button
          onClick={() => setActiveTab('map')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] transition-colors ${
            activeTab === 'map'
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
          aria-label="Map"
        >
          <MapIcon className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-1">Map</span>
        </button>

        <button
          onClick={() => setActiveTab('routes')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] transition-colors ${
            activeTab === 'routes'
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
          aria-label="Routes"
        >
          <Route className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-1">Routes</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] transition-colors ${
            activeTab === 'analytics'
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
          aria-label="Stats"
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-1">Stats</span>
        </button>

        <button
          onClick={() => setIsSettingsOpen(true)}
          className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] text-slate-500 dark:text-slate-400"
          aria-label="Settings"
        >
          <Sliders className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-1">Profile</span>
        </button>
      </div>

      {/* Save Walk Modal */}
      <SaveWalkModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSave={handleSaveWalk}
        onDiscard={handleDiscardWalk}
        steps={sessionSteps}
        distanceMeters={sessionDistanceMeters}
        durationSeconds={sessionDurationSeconds}
        calories={sessionCalories}
        cadence={sessionCadence}
        elevationGainMeters={sessionElevationGain}
        unit={settings.unit}
      />

      {/* Settings & Calibration Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={(s) => {
          setSettings(s);
          saveUserSettings(s);
          pedometerRef.current?.updateSettings(s);
        }}
        onResetSeedData={handleResetSeedData}
      />
    </div>
  );
}
