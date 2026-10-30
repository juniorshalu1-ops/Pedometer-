export interface WalkPoint {
  lat: number;
  lng: number;
  timestamp: number;
  altitude?: number;
  speed?: number; // m/s
  accuracy?: number; // meters
}

export interface WalkingSession {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  steps: number;
  distanceMeters: number;
  durationSeconds: number;
  calories: number;
  points: WalkPoint[];
  averageCadence: number; // steps per minute
  averagePaceSecPerKm: number;
  elevationGainMeters: number;
  maxSpeedKmh: number;
  dateString: string;
  notes?: string;
}

export interface HourlySteps {
  [hour: number]: number;
}

export interface DailyActivity {
  date: string; // YYYY-MM-DD
  dayLabel: string; // "Mon", "Tue", etc.
  steps: number;
  distanceMeters: number;
  calories: number;
  activeMinutes: number;
  sessionsCount: number;
  hourlySteps: HourlySteps;
}

export interface UserSettings {
  stepGoal: number;
  distanceGoalKm: number;
  calorieGoal: number;
  activeMinutesGoal: number;
  unit: 'metric' | 'imperial';
  userWeightKg: number;
  userHeightCm: number;
  strideLengthCm: number;
  autoStride: boolean;
  voiceAnnouncements: boolean;
  soundEffects: boolean;
  sensorSensitivity: 'low' | 'normal' | 'high';
}

export interface MilestoneBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  category: 'steps' | 'distance' | 'streak' | 'routes';
}

export type TrackingMode = 'real' | 'simulate';
export type TrackingStatus = 'idle' | 'tracking' | 'paused';
export type MapLayerType = 'street' | 'satellite' | 'terrain' | 'carto';
