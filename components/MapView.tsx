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
  const polylineLayer = useRef<any>(null);
  const startMarker = useRef<any>(null);
  const endMarker = useRef<any>(null);

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current || leafletMap.current) return;

    // Inicializa o mapa com foco padrão em Aparecida de Goiânia
    leafletMap.current = L.map(mapRef.current, {
      zoomControl: isInteractive,
      dragging: isInteractive,
      scrollWheelZoom: isInteractive,
      attributionControl: false,
    }).setView([-16.7908906, -49.2311547], 16);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(leafletMap.current);

    // Ajuste forçado de tamanho inicial
    const invalidate = () => {
      if (leafletMap.current) leafletMap.current.invalidateSize();
    };
    
    setTimeout(invalidate, 100);
    setTimeout(invalidate, 500);

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, [isInteractive]);

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !leafletMap.current) return;

    if (!points || points.length === 0) {
      if (polylineLayer.current) leafletMap.current.removeLayer(polylineLayer.current);
      if (startMarker.current) leafletMap.current.removeLayer(startMarker.current);
      if (endMarker.current) leafletMap.current.removeLayer(endMarker.current);
      polylineLayer.current = null;
      startMarker.current = null;
      endMarker.current = null;
      return;
    }

    const latLngs = points.map(p => [p.lat, p.lng]);
    
    if (latLngs.length > 0) {
      // Gerencia a linha do traçado
      if (polylineLayer.current) {
        polylineLayer.current.setLatLngs(latLngs);
      } else {
        polylineLayer.current = L.polyline(latLngs, { 
          color: '#eab308', 
          weight: 5, 
          opacity: 0.9,
          lineJoin: 'round'
        }).addTo(leafletMap.current);
      }

      const firstPoint = latLngs[0];
      const latestPoint = latLngs[latLngs.length - 1];

      // Marcador de início da missão
      if (!startMarker.current) {
        startMarker.current = L.circleMarker(firstPoint, { 
          radius: 7, 
          color: '#eab308', 
          fillColor: '#eab308',
          fillOpacity: 1, 
          weight: 2 
        }).addTo(leafletMap.current);
      }

      // Marcador de posição atual em tempo real
      if (!endMarker.current) {
        endMarker.current = L.circleMarker(latestPoint, { 
          radius: 6, 
          color: '#ef4444', 
          fillColor: '#ef4444',
          fillOpacity: 1, 
          weight: 2 
        }).addTo(leafletMap.current);
      } else {
        endMarker.current.setLatLng(latestPoint);
      }

      // Comportamento de foco
      if (!isInteractive) {
        // Segue o motociclista suavemente
        leafletMap.current.panTo(latestPoint, { animate: true, duration: 0.5 });
        if (latLngs.length === 1) leafletMap.current.setZoom(17);
      } else if (latLngs.length > 1) {
        // No mural, ajusta para ver o trajeto completo
        leafletMap.current.fitBounds(polylineLayer.current.getBounds(), { padding: [30, 30] });
      }
    }
  }, [points, isInteractive]);

  return (
    <div ref={mapRef} className={`rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 ${className}`} />
  );
};