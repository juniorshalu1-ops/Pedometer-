import { WalkPoint } from '../types';

export interface PresetRoute {
  id: string;
  name: string;
  city: string;
  country: string;
  lengthKm: number;
  estimatedSteps: number;
  elevationGainM: number;
  center: [number, number];
  points: WalkPoint[];
}

// Helper to generate interpolated points with timestamps and elevation
function createWaypoints(
  coords: [number, number, number][],
  baseSpeedKmh: number = 4.8
): WalkPoint[] {
  const points: WalkPoint[] = [];
  let currentTime = Date.now() - 3600000; // 1 hour ago
  
  for (let i = 0; i < coords.length; i++) {
    const [lat, lng, alt] = coords[i];
    let speed = (baseSpeedKmh * 1000) / 3600; // m/s
    
    if (i > 0) {
      const prev = coords[i - 1];
      const dLat = (lat - prev[0]) * 111320;
      const dLng = (lng - prev[1]) * 111320 * Math.cos((lat * Math.PI) / 180);
      const dist = Math.sqrt(dLat * dLat + dLng * dLng);
      const timeDiff = Math.max(5, (dist / speed) * 1000);
      currentTime += timeDiff;
    }
    
    points.push({
      lat,
      lng,
      timestamp: Math.round(currentTime),
      altitude: alt,
      speed: Number(speed.toFixed(2)),
      accuracy: 4,
    });
  }
  
  return points;
}

export const PRESET_ROUTES: PresetRoute[] = [
  {
    id: 'central-park-loop',
    name: 'Central Park Reservoir & Tree Walk',
    city: 'New York',
    country: 'USA',
    lengthKm: 3.4,
    estimatedSteps: 4500,
    elevationGainM: 28,
    center: [40.7829, -73.9654],
    points: createWaypoints([
      [40.7812, -73.9665, 34],
      [40.7828, -73.9678, 36],
      [40.7851, -73.9689, 39],
      [40.7874, -73.9682, 42],
      [40.7891, -73.9660, 41],
      [40.7895, -73.9632, 40],
      [40.7882, -73.9609, 38],
      [40.7859, -73.9598, 35],
      [40.7836, -73.9610, 34],
      [40.7818, -73.9635, 33],
      [40.7812, -73.9665, 34],
    ]),
  },
  {
    id: 'london-hyde-park',
    name: 'Hyde Park & Serpentine Lake Walk',
    city: 'London',
    country: 'United Kingdom',
    lengthKm: 4.1,
    estimatedSteps: 5400,
    elevationGainM: 16,
    center: [51.5073, -0.1657],
    points: createWaypoints([
      [51.5033, -0.1517, 18],
      [51.5049, -0.1595, 20],
      [51.5071, -0.1668, 22],
      [51.5098, -0.1742, 24],
      [51.5120, -0.1685, 25],
      [51.5105, -0.1601, 22],
      [51.5082, -0.1540, 19],
      [51.5050, -0.1520, 18],
      [51.5033, -0.1517, 18],
    ]),
  },
  {
    id: 'tokyo-meguro-river',
    name: 'Meguro River Sakura Walk',
    city: 'Tokyo',
    country: 'Japan',
    lengthKm: 2.8,
    estimatedSteps: 3700,
    elevationGainM: 12,
    center: [35.6355, 139.7042],
    points: createWaypoints([
      [35.6425, 139.6980, 15],
      [35.6398, 139.7005, 14],
      [35.6372, 139.7031, 13],
      [35.6346, 139.7060, 12],
      [35.6320, 139.7092, 11],
      [35.6295, 139.7125, 10],
      [35.6315, 139.7135, 11],
      [35.6340, 139.7100, 12],
      [35.6368, 139.7065, 13],
      [35.6395, 139.7032, 14],
      [35.6425, 139.6980, 15],
    ]),
  },
  {
    id: 'sf-embarcadero',
    name: 'San Francisco Bay Waterfront Stroll',
    city: 'San Francisco',
    country: 'USA',
    lengthKm: 3.8,
    estimatedSteps: 5000,
    elevationGainM: 8,
    center: [37.7955, -122.3937],
    points: createWaypoints([
      [37.7785, -122.3892, 4],
      [37.7850, -122.3875, 4],
      [37.7915, -122.3905, 5],
      [37.7955, -122.3937, 5],
      [37.8010, -122.3970, 6],
      [37.8062, -122.4045, 6],
      [37.8080, -122.4110, 5],
      [37.8055, -122.4030, 6],
      [37.7955, -122.3937, 5],
      [37.7785, -122.3892, 4],
    ]),
  },
];
