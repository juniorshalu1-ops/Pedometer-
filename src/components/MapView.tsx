import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { WalkPoint, MapLayerType } from '../types';
import { Layers, Maximize2, Navigation, Play, Pause, RotateCcw, TrendingUp } from 'lucide-react';

interface MapViewProps {
  currentPosition?: WalkPoint;
  routePoints: WalkPoint[];
  isTracking: boolean;
  isDark: boolean;
  unit: 'metric' | 'imperial';
  elevationGainMeters?: number;
  highlightedPointIndex?: number;
  onPointSelect?: (point: WalkPoint | null, index: number | null) => void;
}

const TILE_LAYERS: Record<MapLayerType, { url: string; attribution: string; maxZoom: number }> = {
  street: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  },
  carto: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO',
    maxZoom: 19,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
  },
  terrain: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenTopoMap contributors',
    maxZoom: 17,
  },
};

export const MapView: React.FC<MapViewProps> = ({
  currentPosition,
  routePoints,
  isTracking,
  isDark,
  unit,
  elevationGainMeters = 0,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const replayMarkerRef = useRef<L.Marker | null>(null);
  const splitMarkersRef = useRef<L.Marker[]>([]);

  const [activeLayer, setActiveLayer] = useState<MapLayerType>('carto');
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [autoFollow, setAutoFollow] = useState(true);
  const [showElevation, setShowElevation] = useState(false);

  // Route replay scrubber state
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center (Central Park or fallback)
    const initialLat = currentPosition?.lat ?? 40.7829;
    const initialLng = currentPosition?.lng ?? -73.9654;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 15,
      zoomControl: false,
    });

    const layerInfo = TILE_LAYERS[activeLayer];
    const tileLayer = L.tileLayer(layerInfo.url, {
      attribution: layerInfo.attribution,
      maxZoom: layerInfo.maxZoom,
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;

    // Invalidate map size after short delay to ensure container dimensions are settled
    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    // Allow user to break auto-follow when they drag map
    map.on('dragstart', () => {
      setAutoFollow(false);
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer when layer or dark mode changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    // Default to dark or carto based on theme if layer is carto
    let layerKey = activeLayer;
    let url = TILE_LAYERS[layerKey].url;
    let attr = TILE_LAYERS[layerKey].attribution;

    if (activeLayer === 'carto' && isDark) {
      url = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    }

    const newLayer = L.tileLayer(url, {
      attribution: attr,
      maxZoom: TILE_LAYERS[layerKey].maxZoom,
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = newLayer;
  }, [activeLayer, isDark]);

  // Update Route Polyline & Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // 1. Draw/Update Polyline
    const latLngs = routePoints.map((p) => [p.lat, p.lng] as [number, number]);

    if (!polylineRef.current) {
      polylineRef.current = L.polyline(latLngs, {
        color: '#10b981',
        weight: 5,
        opacity: 0.9,
        lineJoin: 'round',
        lineCap: 'round',
      }).addTo(map);
    } else {
      polylineRef.current.setLatLngs(latLngs);
    }

    // 2. Start Marker (first point)
    if (routePoints.length > 0) {
      const first = routePoints[0];
      const startIcon = L.divIcon({
        className: 'custom-start-marker',
        html: `
          <div style="background-color: #10b981; color: white; width: 28px; height: 28px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); border: 2px solid white; font-size: 11px; font-weight: bold;">
            A
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      if (!startMarkerRef.current) {
        startMarkerRef.current = L.marker([first.lat, first.lng], { icon: startIcon }).addTo(map);
      } else {
        startMarkerRef.current.setLatLng([first.lat, first.lng]);
      }
    } else if (startMarkerRef.current) {
      map.removeLayer(startMarkerRef.current);
      startMarkerRef.current = null;
    }

    // 3. Distance Split Markers (every 1 km)
    splitMarkersRef.current.forEach((m) => map.removeLayer(m));
    splitMarkersRef.current = [];

    let accumulatedDistMeters = 0;
    let nextSplitKm = 1;

    for (let i = 1; i < routePoints.length; i++) {
      const p1 = routePoints[i - 1];
      const p2 = routePoints[i];
      // Quick dist
      const d = L.latLng(p1.lat, p1.lng).distanceTo(L.latLng(p2.lat, p2.lng));
      accumulatedDistMeters += d;

      if (accumulatedDistMeters >= nextSplitKm * 1000) {
        const splitIcon = L.divIcon({
          className: 'custom-split-marker',
          html: `
            <div style="background: rgba(15, 23, 42, 0.85); color: #e2e8f0; font-size: 10px; font-weight: 700; padding: 2px 5px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
              ${nextSplitKm} km
            </div>
          `,
          iconSize: [36, 18],
          iconAnchor: [18, 9],
        });
        const marker = L.marker([p2.lat, p2.lng], { icon: splitIcon }).addTo(map);
        splitMarkersRef.current.push(marker);
        nextSplitKm++;
      }
    }

    // Auto-fit if first time route has points and not in tracking mode
    if (!isTracking && routePoints.length > 2 && polylineRef.current) {
      map.fitBounds(polylineRef.current.getBounds(), { padding: [40, 40], maxZoom: 16 });
    }
  }, [routePoints, isTracking]);

  // Update Current User Position Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !currentPosition) return;

    const userIcon = L.divIcon({
      className: 'custom-user-marker',
      html: `
        <div style="position: relative; width: 22px; height: 22px;">
          <div style="position: absolute; inset: 0; background-color: #10b981; border-radius: 9999px; opacity: 0.4;" class="gps-pulse-marker"></div>
          <div style="position: absolute; inset: 3px; background-color: #059669; border-radius: 9999px; border: 2.5px solid #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.4);"></div>
        </div>
      `,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker([currentPosition.lat, currentPosition.lng], {
        icon: userIcon,
        zIndexOffset: 1000,
      }).addTo(map);
    } else {
      userMarkerRef.current.setLatLng([currentPosition.lat, currentPosition.lng]);
    }

    // Accuracy circle if accuracy is known
    if (currentPosition.accuracy && currentPosition.accuracy <= 30) {
      if (!accuracyCircleRef.current) {
        accuracyCircleRef.current = L.circle([currentPosition.lat, currentPosition.lng], {
          radius: currentPosition.accuracy,
          color: '#10b981',
          fillColor: '#10b981',
          fillOpacity: 0.08,
          weight: 1,
        }).addTo(map);
      } else {
        accuracyCircleRef.current.setLatLng([currentPosition.lat, currentPosition.lng]);
        accuracyCircleRef.current.setRadius(currentPosition.accuracy);
      }
    }

    // Auto pan if following
    if (autoFollow) {
      map.panTo([currentPosition.lat, currentPosition.lng], { animate: true, duration: 0.5 });
    }
  }, [currentPosition, autoFollow]);

  // Replay animation effect
  useEffect(() => {
    let timer: number | null = null;
    if (isReplaying && routePoints.length > 0) {
      timer = window.setInterval(() => {
        setReplayIndex((prev) => {
          if (prev >= routePoints.length - 1) {
            setIsReplaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 350);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isReplaying, routePoints]);

  // Update Replay Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || routePoints.length === 0) return;

    const pt = routePoints[replayIndex];
    if (!pt) return;

    const replayIcon = L.divIcon({
      className: 'custom-replay-marker',
      html: `
        <div style="background-color: #6366f1; color: white; width: 24px; height: 24px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 8px rgba(0,0,0,0.4); border: 2px solid white; font-size: 11px; font-weight: bold;">
          🚶
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    if (!replayMarkerRef.current) {
      replayMarkerRef.current = L.marker([pt.lat, pt.lng], { icon: replayIcon, zIndexOffset: 2000 }).addTo(map);
    } else {
      replayMarkerRef.current.setLatLng([pt.lat, pt.lng]);
    }
  }, [replayIndex, routePoints]);

  // Recenter Map
  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    setAutoFollow(true);
    if (currentPosition) {
      map.setView([currentPosition.lat, currentPosition.lng], 16, { animate: true });
    } else if (routePoints.length > 0 && polylineRef.current) {
      map.fitBounds(polylineRef.current.getBounds(), { padding: [50, 50] });
    }
  };

  // Fit bounds to entire route
  const handleFitRoute = () => {
    const map = mapInstanceRef.current;
    if (!map || !polylineRef.current || routePoints.length === 0) return;
    setAutoFollow(false);
    map.fitBounds(polylineRef.current.getBounds(), { padding: [40, 40] });
  };

  // Calculate Elevation SVG points
  const elevationData = useMemo(() => {
    if (routePoints.length < 2) return null;
    const altitudes = routePoints.map((p) => p.altitude ?? 20);
    const minAlt = Math.min(...altitudes);
    const maxAlt = Math.max(...altitudes);
    const range = Math.max(5, maxAlt - minAlt);

    const width = 400;
    const height = 70;
    const stepX = width / (routePoints.length - 1);

    const points = altitudes.map((alt, idx) => {
      const x = idx * stepX;
      const y = height - ((alt - minAlt) / range) * (height - 12) - 6;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const pathD = `M 0,${height} L ${points.join(' L ')} L ${width},${height} Z`;
    const lineD = `M ${points.join(' L ')}`;

    return { pathD, lineD, minAlt: Math.round(minAlt), maxAlt: Math.round(maxAlt) };
  }, [routePoints]);

  return (
    <div className="relative w-full h-full min-h-[380px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 shadow-sm">
      {/* The Leaflet Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Top Floating Controls */}
      <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2">
        {/* Layer Picker Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            title="Change Map Style"
            aria-label="Map layers"
          >
            <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="capitalize">{activeLayer}</span>
          </button>

          {showLayerMenu && (
            <div className="absolute top-11 left-0 w-36 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 py-1.5 z-50">
              {(['carto', 'street', 'satellite', 'terrain'] as MapLayerType[]).map((layer) => (
                <button
                  key={layer}
                  onClick={() => {
                    setActiveLayer(layer);
                    setShowLayerMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs font-medium capitalize transition-colors flex items-center justify-between ${
                    activeLayer === layer
                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{layer}</span>
                  {activeLayer === layer && <span className="text-emerald-600 font-bold">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Elevation Toggle */}
        {routePoints.length > 2 && (
          <button
            onClick={() => setShowElevation(!showElevation)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border backdrop-blur-md shadow-sm transition-colors whitespace-nowrap shrink-0 ${
              showElevation
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'text-slate-700 dark:text-slate-200 bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Elevation</span>
          </button>
        )}
      </div>

      {/* Right Action Floating Controls */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
        {/* Recenter button */}
        <button
          onClick={handleRecenter}
          className={`p-2.5 rounded-xl border backdrop-blur-md shadow-sm transition-colors flex items-center justify-center ${
            autoFollow
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'text-slate-700 dark:text-slate-200 bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
          title="Recenter Map"
          aria-label="Recenter Map"
        >
          <Navigation className="w-4 h-4" />
        </button>

        {/* Fit Route button */}
        {routePoints.length > 1 && (
          <button
            onClick={handleFitRoute}
            className="p-2.5 text-slate-700 dark:text-slate-200 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center"
            title="Fit Entire Route"
            aria-label="Fit Route"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Replay Controls & Elevation Profile Overlay at Bottom */}
      <div className="absolute bottom-3 left-3 right-3 z-[1000] flex flex-col gap-2 pointer-events-none">
        {/* Elevation Chart Drawer */}
        {showElevation && elevationData && (
          <div className="pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span className="font-semibold text-slate-800 dark:text-slate-200">Elevation Profile</span>
              <div className="flex items-center gap-3 tabular-nums">
                <span>Min: {elevationData.minAlt}m</span>
                <span>Max: {elevationData.maxAlt}m</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Gain: +{elevationGainMeters}m</span>
              </div>
            </div>
            <div className="w-full h-16 relative">
              <svg viewBox="0 0 400 70" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="elevationGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d={elevationData.pathD} fill="url(#elevationGrad)" />
                <path d={elevationData.lineD} fill="none" stroke="#10b981" strokeWidth="2" />
              </svg>
            </div>
          </div>
        )}

        {/* Route Replay Bar (Available when route is completed or not actively tracking) */}
        {!isTracking && routePoints.length > 5 && (
          <div className="pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg flex items-center gap-3">
            <button
              onClick={() => setIsReplaying(!isReplaying)}
              className="p-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shrink-0 flex items-center justify-center"
              aria-label={isReplaying ? 'Pause replay' : 'Play replay'}
            >
              {isReplaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => {
                setIsReplaying(false);
                setReplayIndex(0);
              }}
              className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors shrink-0"
              title="Reset to Start"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Scrubber slider */}
            <input
              type="range"
              min={0}
              max={routePoints.length - 1}
              value={replayIndex}
              onChange={(e) => {
                setIsReplaying(false);
                setReplayIndex(Number(e.target.value));
              }}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />

            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap shrink-0">
              {routePoints[replayIndex]?.speed ? `${(routePoints[replayIndex].speed! * 3.6).toFixed(1)} km/h` : 'Walking'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
