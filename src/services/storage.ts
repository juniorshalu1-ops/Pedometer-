import { DailyActivity, UserSettings, WalkingSession, MilestoneBadge } from '../types';

const SETTINGS_KEY = 'stridepath_user_settings';
const SESSIONS_KEY = 'stridepath_walking_sessions';
const DAILY_ACTIVITY_KEY = 'stridepath_daily_activity';
const BADGES_KEY = 'stridepath_milestone_badges';

export const DEFAULT_SETTINGS: UserSettings = {
  stepGoal: 10000,
  distanceGoalKm: 7.5,
  calorieGoal: 450,
  activeMinutesGoal: 45,
  unit: 'metric',
  userWeightKg: 70,
  userHeightCm: 175,
  strideLengthCm: 72.6, // 175 * 0.415
  autoStride: true,
  voiceAnnouncements: true,
  soundEffects: true,
  sensorSensitivity: 'normal',
};

export const INITIAL_BADGES: MilestoneBadge[] = [
  {
    id: 'first_step',
    title: 'First Stride',
    description: 'Took your first 1,000 steps in a single day.',
    icon: 'Footprints',
    category: 'steps',
    unlockedAt: '2026-10-25',
  },
  {
    id: '5k_club',
    title: '5K Pathfinder',
    description: 'Crossed 5,000 steps in one day.',
    icon: 'Compass',
    category: 'steps',
    unlockedAt: '2026-10-27',
  },
  {
    id: '10k_daily',
    title: '10K Goal Crusher',
    description: 'Hit the gold standard 10,000 steps daily target.',
    icon: 'Trophy',
    category: 'steps',
    unlockedAt: '2026-10-28',
  },
  {
    id: '3day_streak',
    title: 'Consistency Champion',
    description: 'Achieved step goal 3 days in a row.',
    icon: 'Flame',
    category: 'streak',
    unlockedAt: '2026-10-29',
  },
  {
    id: 'first_route',
    title: 'Cartographer',
    description: 'Mapped and recorded your first walking route.',
    icon: 'MapPin',
    category: 'routes',
    unlockedAt: '2026-10-28',
  },
  {
    id: 'elevation_walker',
    title: 'Hill Conqueror',
    description: 'Climbed over 50 meters of elevation in recorded walks.',
    icon: 'Mountain',
    category: 'distance',
  },
  {
    id: 'marathon_mileage',
    title: '42K Marathon Milestone',
    description: 'Accumulated 42 km of total recorded walking distance.',
    icon: 'Award',
    category: 'distance',
  },
];

// Helper to format date YYYY-MM-DD
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDayLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

// Generate realistic seed history for past 7 days so user sees lively data
export function generateSeedDailyActivity(): Record<string, DailyActivity> {
  const map: Record<string, DailyActivity> = {};
  const today = new Date();
  
  // Historical step patterns
  const stepPattern = [6840, 8920, 10450, 9300, 11200, 7800, 4200];
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const steps = i === 0 ? 4200 : stepPattern[6 - i];
    const distanceMeters = Math.round(steps * 0.73);
    const calories = Math.round(steps * 0.042);
    const activeMinutes = Math.round(steps / 105);
    
    // Spread steps realistically across daytime hours (7am to 9pm)
    const hourlySteps: Record<number, number> = {};
    for (let h = 6; h <= 22; h++) {
      if (i === 0 && h > d.getHours()) {
        hourlySteps[h] = 0;
      } else {
        const factor = (h >= 8 && h <= 9) || (h >= 12 && h <= 13) || (h >= 17 && h <= 19) ? 0.16 : 0.04;
        hourlySteps[h] = Math.round(steps * factor + (Math.random() * 80 - 40));
      }
    }
    
    map[dateStr] = {
      date: dateStr,
      dayLabel: getDayLabel(dateStr),
      steps,
      distanceMeters,
      calories,
      activeMinutes,
      sessionsCount: steps > 8000 ? 2 : 1,
      hourlySteps,
    };
  }
  
  return map;
}

// Storage functions
export function loadUserSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveUserSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('Could not save user settings:', err);
  }
}

export function loadDailyActivities(): Record<string, DailyActivity> {
  try {
    const raw = localStorage.getItem(DAILY_ACTIVITY_KEY);
    if (!raw) {
      const seeded = generateSeedDailyActivity();
      saveDailyActivities(seeded);
      return seeded;
    }
    const data = JSON.parse(raw);
    const todayStr = getTodayDateString();
    if (!data[todayStr]) {
      data[todayStr] = {
        date: todayStr,
        dayLabel: getDayLabel(todayStr),
        steps: 0,
        distanceMeters: 0,
        calories: 0,
        activeMinutes: 0,
        sessionsCount: 0,
        hourlySteps: {},
      };
      saveDailyActivities(data);
    }
    return data;
  } catch {
    return generateSeedDailyActivity();
  }
}

export function saveDailyActivities(data: Record<string, DailyActivity>): void {
  try {
    localStorage.setItem(DAILY_ACTIVITY_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Could not save daily activities:', err);
  }
}

export function loadWalkingSessions(): WalkingSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) {
      // Seed 2 realistic past completed walk sessions
      const seedSessions: WalkingSession[] = [
        {
          id: 'walk-seed-1',
          name: 'Morning River Promenade',
          startTime: Date.now() - 86400000 * 2,
          endTime: Date.now() - 86400000 * 2 + 2100000,
          steps: 4320,
          distanceMeters: 3180,
          durationSeconds: 2100,
          calories: 148,
          averageCadence: 123,
          averagePaceSecPerKm: 660,
          elevationGainMeters: 14,
          maxSpeedKmh: 5.8,
          dateString: 'Yesterday',
          notes: 'Crisp morning air, steady cadence and good breathing.',
          points: [
            { lat: 40.7828, lng: -73.9678, timestamp: Date.now() - 2100000, altitude: 36, speed: 1.4 },
            { lat: 40.7851, lng: -73.9689, timestamp: Date.now() - 1500000, altitude: 39, speed: 1.5 },
            { lat: 40.7874, lng: -73.9682, timestamp: Date.now() - 900000, altitude: 42, speed: 1.6 },
            { lat: 40.7891, lng: -73.9660, timestamp: Date.now() - 300000, altitude: 41, speed: 1.4 },
          ],
        },
        {
          id: 'walk-seed-2',
          name: 'Sunset Greenbelt Loop',
          startTime: Date.now() - 86400000 * 3,
          endTime: Date.now() - 86400000 * 3 + 3420000,
          steps: 6450,
          distanceMeters: 4850,
          durationSeconds: 3420,
          calories: 226,
          averageCadence: 118,
          averagePaceSecPerKm: 705,
          elevationGainMeters: 28,
          maxSpeedKmh: 5.4,
          dateString: '3 days ago',
          notes: 'Gentle incline through park trails.',
          points: [
            { lat: 51.5033, lng: -0.1517, timestamp: Date.now() - 3400000, altitude: 18, speed: 1.3 },
            { lat: 51.5071, lng: -0.1668, timestamp: Date.now() - 2000000, altitude: 22, speed: 1.4 },
            { lat: 51.5120, lng: -0.1685, timestamp: Date.now() - 800000, altitude: 25, speed: 1.4 },
          ],
        },
      ];
      saveWalkingSessions(seedSessions);
      return seedSessions;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveWalkingSessions(sessions: WalkingSession[]): void {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch (err) {
    console.warn('Could not save walking sessions:', err);
  }
}

export function loadMilestones(): MilestoneBadge[] {
  try {
    const raw = localStorage.getItem(BADGES_KEY);
    if (!raw) {
      saveMilestones(INITIAL_BADGES);
      return INITIAL_BADGES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_BADGES;
  }
}

export function saveMilestones(badges: MilestoneBadge[]): void {
  try {
    localStorage.setItem(BADGES_KEY, JSON.stringify(badges));
  } catch (err) {
    console.warn('Could not save milestone badges:', err);
  }
}

// Export Walk Route as standard GPX format
export function exportToGPX(session: WalkingSession): void {
  const startTimeISO = new Date(session.startTime).toISOString();
  let trackPointsXml = '';
  
  if (session.points && session.points.length > 0) {
    trackPointsXml = session.points
      .map((p) => {
        const timeStr = new Date(p.timestamp).toISOString();
        const eleStr = p.altitude !== undefined ? `<ele>${p.altitude.toFixed(1)}</ele>` : '';
        return `      <trkpt lat="${p.lat}" lon="${p.lng}">${eleStr}<time>${timeStr}</time></trkpt>`;
      })
      .join('\n');
  }

  const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="StridePath Pedometer" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(session.name)}</name>
    <time>${startTimeISO}</time>
    <desc>Steps: ${session.steps}, Distance: ${(session.distanceMeters / 1000).toFixed(2)} km, Duration: ${Math.round(session.durationSeconds / 60)} min</desc>
  </metadata>
  <trk>
    <name>${escapeXml(session.name)}</name>
    <trkseg>
${trackPointsXml}
    </trkseg>
  </trk>
</gpx>`;

  const blob = new Blob([gpxContent], { type: 'application/gpx+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${session.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${session.dateString || 'walk'}.gpx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Export Walk Route as standard GeoJSON format
export function exportToGeoJSON(session: WalkingSession): void {
  const coordinates = session.points.map((p) => [p.lng, p.lat, p.altitude || 0]);
  
  const geojson = {
    type: 'FeatureCollection',
    properties: {
      id: session.id,
      name: session.name,
      steps: session.steps,
      distanceKm: (session.distanceMeters / 1000).toFixed(2),
      durationMinutes: Math.round(session.durationSeconds / 60),
      caloriesBurned: session.calories,
      elevationGainM: session.elevationGainMeters,
      avgCadence: session.averageCadence,
      date: session.dateString,
    },
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates,
        },
        properties: {
          name: session.name,
          stroke: '#10b981',
          'stroke-width': 4,
        },
      },
    ],
  };

  const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${session.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.geojson`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

// Audio Feedback Engine (Web Audio API - synthetic beeps and melodic chimes)
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export function playGoalChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    
    gain.gain.setValueAtTime(0, now + idx * 0.1);
    gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.1 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.35);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now + idx * 0.1);
    osc.stop(now + idx * 0.1 + 0.4);
  });
}

export function playStepMilestoneSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.exponentialRampToValueAtTime(1760, now + 0.15);
  
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.22);
}

// Text-to-Speech coaching announcement
export function speakCoachAnnouncement(message: string): void {
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.volume = 0.85;
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis error:', err);
  }
}
