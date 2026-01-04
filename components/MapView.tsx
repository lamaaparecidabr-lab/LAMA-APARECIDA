
import React, { useEffect, useRef } from 'react';
import { RoutePoint } from '../types';

interface MapViewProps {
  points: RoutePoint[];
  className?: string;
  isInteractive?: boolean;
}

export const MapView: React.FC<MapViewProps> = ({ points, className = "h-64", isInteractive = false }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);

  useEffect(() => {
    // Only load if L exists (added via CDN in index.html)
    const L = (window as any).L;
    if (!L || !mapRef.current || leafletMap.current) return;

    leafletMap.current = L.map(mapRef.current, {
      zoomControl: isInteractive,
      dragging: isInteractive,
      scrollWheelZoom: isInteractive,
      attributionControl: false,
    }).setView([-16.7908906, -49.2311547], 17);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(leafletMap.current);

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, [isInteractive]);

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !leafletMap.current || points.length === 0) return;

    // Clear existing layers if any (except base)
    leafletMap.current.eachLayer((layer: any) => {
      if (layer instanceof L.Polyline || layer instanceof L.Marker || layer instanceof L.CircleMarker) {
        leafletMap.current.removeLayer(layer);
      }
    });

    const latLngs = points.map(p => [p.lat, p.lng]);
    
    if (latLngs.length > 1) {
      const polyline = L.polyline(latLngs, { color: '#eab308', weight: 4 }).addTo(leafletMap.current);
      // Fit bounds for routes
      leafletMap.current.fitBounds(polyline.getBounds(), { padding: [20, 20] });
      
      // Markers for start and end
      L.circleMarker(latLngs[0], { radius: 5, color: '#eab308', fillOpacity: 1 }).addTo(leafletMap.current);
      L.circleMarker(latLngs[latLngs.length - 1], { radius: 5, color: '#ef4444', fillOpacity: 1 }).addTo(leafletMap.current);
    } else {
      // Single point (like the clubhouse)
      leafletMap.current.setView(latLngs[0], 18);
      L.circleMarker(latLngs[0], { 
        radius: 8, 
        color: '#eab308', 
        fillColor: '#eab308', 
        fillOpacity: 0.8,
        weight: 3
      }).addTo(leafletMap.current);
      
      // Add a smaller inner circle for precision look
      L.circleMarker(latLngs[0], { 
        radius: 3, 
        color: '#000', 
        fillColor: '#000', 
        fillOpacity: 1,
        weight: 1
      }).addTo(leafletMap.current);
    }
  }, [points]);

  return (
    <div ref={mapRef} className={`rounded-xl overflow-hidden border border-zinc-800 ${className}`} />
  );
};
