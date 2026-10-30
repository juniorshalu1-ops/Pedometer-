import { WalkPoint, UserSettings } from '../types';

export interface PedometerUpdate {
  steps: number;
  distanceMeters: number;
  durationSeconds: number;
  calories: number;
  currentCadence: number; // steps per minute
  currentSpeedKmh: number;
  currentPaceSecPerKm: number;
  elevationGainMeters: number;
  latestPoint?: WalkPoint;
  allPoints: WalkPoint[];
  isSensorActive: boolean;
  gpsAccuracy?: number;
}

// Haversine formula to compute distance between two GPS coordinates in meters
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export class PedometerService {
  private steps: number = 0;
  private distanceMeters: number = 0;
  private durationSeconds: number = 0;
  private calories: number = 0;
  private elevationGainMeters: number = 0;
  private points: WalkPoint[] = [];

  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private startTime: number = 0;
  private timerIntervalId: number | null = null;
  private simulationIntervalId: number | null = null;

  // Sensor state
  private lastStepTimestamp: number = 0;
  private recentStepTimes: number[] = [];
  private lastAccelMag: number = 9.8;
  private isSensorActive: boolean = false;
  private geolocationWatchId: number | null = null;
  private lastElevation: number | null = null;

  // Configuration
  private settings: UserSettings;
  private onUpdateCallback: (update: PedometerUpdate) => void;

  constructor(settings: UserSettings, onUpdate: (update: PedometerUpdate) => void) {
    this.settings = settings;
    this.onUpdateCallback = onUpdate;
  }

  public updateSettings(settings: UserSettings) {
    this.settings = settings;
  }

  // Request accelerometer permission on iOS
  public static async requestSensorPermission(): Promise<boolean> {
    try {
      const anyMotion = typeof DeviceMotionEvent !== 'undefined' ? (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }) : undefined;
      if (anyMotion && typeof anyMotion.requestPermission === 'function') {
        const response = await anyMotion.requestPermission();
        return response === 'granted';
      }
      return true; // Not required on Android or non-iOS
    } catch (e) {
      console.warn('DeviceMotion permission error:', e);
      return false;
    }
  }

  // Start real GPS + Accelerometer tracking
  public startLiveTracking(): void {
    this.reset();
    this.isRunning = true;
    this.isPaused = false;
    this.startTime = Date.now();

    // 1. Start duration timer
    this.timerIntervalId = window.setInterval(() => {
      if (!this.isPaused) {
        this.durationSeconds++;
        this.emitUpdate();
      }
    }, 1000);

    // 2. Start Device Motion (Accelerometer) listener
    this.startMotionSensor();

    // 3. Start Geolocation GPS tracking
    this.startGeolocation();
  }

  // Start simulated walk along preset route or around coordinates
  public startSimulation(
    simulatedPoints: WalkPoint[],
    simSpeedKmh: number = 5.0
  ): void {
    this.reset();
    this.isRunning = true;
    this.isPaused = false;
    this.startTime = Date.now();

    // Stride length in meters
    const strideMeters = (this.settings.strideLengthCm || 72) / 100;
    // Step interval in ms based on speed
    const metersPerSec = (simSpeedKmh * 1000) / 3600;
    const stepsPerSecond = metersPerSec / strideMeters;
    const stepIntervalMs = Math.max(250, 1000 / stepsPerSecond);

    let routeIndex = 0;
    let currentLat = simulatedPoints[0]?.lat || 40.7829;
    let currentLng = simulatedPoints[0]?.lng || -73.9654;
    let currentAlt = simulatedPoints[0]?.altitude || 30;

    // Record initial point
    const firstPoint: WalkPoint = {
      lat: currentLat,
      lng: currentLng,
      timestamp: Date.now(),
      altitude: currentAlt,
      speed: metersPerSec,
      accuracy: 3,
    };
    this.points.push(firstPoint);

    // 1. Duration timer
    this.timerIntervalId = window.setInterval(() => {
      if (!this.isPaused) {
        this.durationSeconds++;
        this.emitUpdate();
      }
    }, 1000);

    // 2. Simulation loop
    let lastSimStepTime = Date.now();
    this.simulationIntervalId = window.setInterval(() => {
      if (this.isPaused) return;

      const now = Date.now();
      const elapsed = (now - lastSimStepTime) / 1000;
      lastSimStepTime = now;

      // Add step
      this.steps++;
      this.recentStepTimes.push(now);
      this.cleanRecentStepTimes(now);

      const addedDistance = strideMeters;
      this.distanceMeters += addedDistance;

      // Calculate calorie burn
      this.calories += this.calculateCalorieSlice(addedDistance, simSpeedKmh);

      // Advance along simulated route points smoothly
      if (simulatedPoints.length > 1) {
        const nextIdx = (routeIndex + 1) % simulatedPoints.length;
        const targetPoint = simulatedPoints[nextIdx];

        const dLat = targetPoint.lat - currentLat;
        const dLng = targetPoint.lng - currentLng;
        const distToTarget = calculateDistanceMeters(currentLat, currentLng, targetPoint.lat, targetPoint.lng);

        if (distToTarget < 8) {
          routeIndex = nextIdx;
        } else {
          // Move towards target
          const fraction = Math.min(1, addedDistance / Math.max(1, distToTarget));
          currentLat += dLat * fraction;
          currentLng += dLng * fraction;
        }

        const newAlt = targetPoint.altitude ?? 30;
        if (newAlt > currentAlt) {
          this.elevationGainMeters += newAlt - currentAlt;
        }
        currentAlt = newAlt;
      } else {
        // Jitter around current spot in gentle circle
        const angle = (this.steps * 0.1) % (2 * Math.PI);
        currentLat += (Math.cos(angle) * 0.00003);
        currentLng += (Math.sin(angle) * 0.00003);
      }

      // Add point every ~3 steps or 2.5 meters to avoid overly dense arrays
      if (this.steps % 3 === 0) {
        this.points.push({
          lat: Number(currentLat.toFixed(6)),
          lng: Number(currentLng.toFixed(6)),
          timestamp: now,
          altitude: currentAlt,
          speed: metersPerSec,
          accuracy: 4,
        });
      }

      this.emitUpdate();
    }, stepIntervalMs);
  }

  // Motion sensor handling for real device
  private handleMotion = (event: DeviceMotionEvent) => {
    if (!this.isRunning || this.isPaused) return;

    this.isSensorActive = true;
    const accel = event.accelerationIncludingGravity || event.acceleration;
    if (!accel || accel.x === null || accel.y === null || accel.z === null) return;

    const x = accel.x || 0;
    const y = accel.y || 0;
    const z = accel.z || 0;

    // Acceleration magnitude
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    const now = Date.now();

    // Sensitivity threshold
    let threshold = 11.4;
    if (this.settings.sensorSensitivity === 'low') threshold = 12.2;
    if (this.settings.sensorSensitivity === 'high') threshold = 10.7;

    // Detect positive peak crossing threshold with bounce suppression (>= 290ms between steps)
    if (
      magnitude > threshold &&
      this.lastAccelMag <= threshold &&
      now - this.lastStepTimestamp > 290
    ) {
      this.steps++;
      this.lastStepTimestamp = now;
      this.recentStepTimes.push(now);
      this.cleanRecentStepTimes(now);

      const strideMeters = (this.settings.strideLengthCm || 72) / 100;
      this.distanceMeters += strideMeters;

      const approxSpeedKmh = this.calculateCurrentSpeedKmh();
      this.calories += this.calculateCalorieSlice(strideMeters, approxSpeedKmh);

      this.emitUpdate();
    }

    this.lastAccelMag = magnitude;
  };

  private startMotionSensor(): void {
    if (typeof window !== 'undefined' && 'ondevicemotion' in window) {
      window.addEventListener('devicemotion', this.handleMotion);
    }
  }

  private stopMotionSensor(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('devicemotion', this.handleMotion);
    }
  }

  // Geolocation handling for live route breadcrumbs
  private startGeolocation(): void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    this.geolocationWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!this.isRunning || this.isPaused) return;

        const { latitude, longitude, altitude, speed, accuracy } = pos.coords;
        const now = Date.now();

        // Filter out extreme inaccuracies
        if (accuracy > 35) return;

        const newPoint: WalkPoint = {
          lat: latitude,
          lng: longitude,
          timestamp: now,
          altitude: altitude ?? undefined,
          speed: speed ?? undefined,
          accuracy,
        };

        if (this.points.length > 0) {
          const lastPoint = this.points[this.points.length - 1];
          const dist = calculateDistanceMeters(
            lastPoint.lat,
            lastPoint.lng,
            newPoint.lat,
            newPoint.lng
          );

          // Only add point if moved at least 2.5 meters to prevent GPS jitter clusters
          if (dist >= 2.5) {
            this.points.push(newPoint);

            // If altitude available, calculate elevation gain
            if (altitude !== null && this.lastElevation !== null) {
              const diff = altitude - this.lastElevation;
              if (diff > 0.5) {
                this.elevationGainMeters += diff;
              }
            }
            if (altitude !== null) {
              this.lastElevation = altitude;
            }
          }
        } else {
          this.points.push(newPoint);
          if (altitude !== null) {
            this.lastElevation = altitude;
          }
        }

        this.emitUpdate(accuracy);
      },
      (err) => {
        console.warn('Geolocation watch error:', err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000,
      }
    );
  }

  private stopGeolocation(): void {
    if (this.geolocationWatchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.geolocationWatchId);
      this.geolocationWatchId = null;
    }
  }

  // Manual step trigger (for instant in-app manual testing / tap / shake button)
  public addManualSteps(count: number = 1): void {
    const now = Date.now();
    this.steps += count;
    for (let i = 0; i < count; i++) {
      this.recentStepTimes.push(now);
    }
    this.cleanRecentStepTimes(now);

    const strideMeters = (this.settings.strideLengthCm || 72) / 100;
    const addedDist = strideMeters * count;
    this.distanceMeters += addedDist;
    this.calories += this.calculateCalorieSlice(addedDist, 4.5);

    this.emitUpdate();
  }

  public pause(): void {
    this.isPaused = true;
    this.emitUpdate();
  }

  public resume(): void {
    this.isPaused = false;
    this.emitUpdate();
  }

  public stop(): void {
    this.isRunning = false;
    this.isPaused = false;

    if (this.timerIntervalId !== null) {
      clearInterval(this.timerIntervalId);
      this.timerIntervalId = null;
    }

    if (this.simulationIntervalId !== null) {
      clearInterval(this.simulationIntervalId);
      this.simulationIntervalId = null;
    }

    this.stopMotionSensor();
    this.stopGeolocation();
    this.emitUpdate();
  }

  public reset(): void {
    this.stop();
    this.steps = 0;
    this.distanceMeters = 0;
    this.durationSeconds = 0;
    this.calories = 0;
    this.elevationGainMeters = 0;
    this.points = [];
    this.recentStepTimes = [];
    this.lastElevation = null;
  }

  // Calculate Cadence (Steps per Minute rolling over last 30 seconds)
  private calculateCurrentCadence(): number {
    const now = Date.now();
    this.cleanRecentStepTimes(now);
    if (this.recentStepTimes.length < 2) return 0;

    // Steps in window divided by window span in minutes
    const windowSpanSec = Math.max(5, (now - this.recentStepTimes[0]) / 1000);
    const spm = Math.round((this.recentStepTimes.length / windowSpanSec) * 60);
    return Math.min(220, Math.max(0, spm));
  }

  private cleanRecentStepTimes(now: number): void {
    const cutoff = now - 30000; // 30 sec window
    while (this.recentStepTimes.length > 0 && this.recentStepTimes[0] < cutoff) {
      this.recentStepTimes.shift();
    }
  }

  // Current Speed in km/h
  private calculateCurrentSpeedKmh(): number {
    if (this.durationSeconds <= 0 || this.distanceMeters <= 0) return 0;
    const km = this.distanceMeters / 1000;
    const hours = this.durationSeconds / 3600;
    const speed = km / hours;
    return Number(Math.min(18, speed).toFixed(1));
  }

  // Average Pace in seconds per kilometer
  private calculateAveragePaceSecPerKm(): number {
    if (this.distanceMeters < 50 || this.durationSeconds <= 0) return 0;
    const km = this.distanceMeters / 1000;
    return Math.round(this.durationSeconds / km);
  }

  // Energy expenditure formula (Walking METs ~3.5 to 5.0)
  private calculateCalorieSlice(distanceMeters: number, speedKmh: number): number {
    let met = 3.3;
    if (speedKmh > 4.5) met = 3.8;
    if (speedKmh > 5.5) met = 4.8;
    if (speedKmh > 6.5) met = 6.0;

    const weightKg = this.settings.userWeightKg || 70;
    // Calorie burn = MET * 3.5 * weightKg / 200 * (time in minutes)
    // or approx 0.04 - 0.05 kcal per meter for standard adult
    const calPerMeter = (met * 3.5 * weightKg) / (200 * (speedKmh * 1000 / 60));
    return distanceMeters * (isNaN(calPerMeter) || calPerMeter <= 0 ? 0.045 : calPerMeter);
  }

  private emitUpdate(gpsAccuracy?: number): void {
    const cadence = this.calculateCurrentCadence();
    const speed = this.calculateCurrentSpeedKmh();
    const pace = this.calculateAveragePaceSecPerKm();
    const latestPoint = this.points[this.points.length - 1];

    this.onUpdateCallback({
      steps: this.steps,
      distanceMeters: Math.round(this.distanceMeters),
      durationSeconds: this.durationSeconds,
      calories: Math.round(this.calories),
      currentCadence: cadence,
      currentSpeedKmh: speed,
      currentPaceSecPerKm: pace,
      elevationGainMeters: Math.round(this.elevationGainMeters),
      latestPoint,
      allPoints: [...this.points],
      isSensorActive: this.isSensorActive,
      gpsAccuracy,
    });
  }

  public getSessionData(name: string = 'Afternoon Walk', notes: string = '') {
    const km = this.distanceMeters / 1000;
    return {
      id: `walk-${Date.now()}`,
      name,
      startTime: this.startTime || Date.now() - this.durationSeconds * 1000,
      endTime: Date.now(),
      steps: this.steps,
      distanceMeters: Math.round(this.distanceMeters),
      durationSeconds: this.durationSeconds,
      calories: Math.round(this.calories),
      points: [...this.points],
      averageCadence: this.calculateCurrentCadence(),
      averagePaceSecPerKm: this.calculateAveragePaceSecPerKm(),
      elevationGainMeters: Math.round(this.elevationGainMeters),
      maxSpeedKmh: this.calculateCurrentSpeedKmh(),
      dateString: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      notes,
    };
  }
}
