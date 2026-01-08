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

    // Inicializa o mapa focado em Aparecida de Goiânia por padrão
    leafletMap.current = L.map(mapRef.current, {
      zoomControl: isInteractive,
      dragging: isInteractive,
      scrollWheelZoom: isInteractive,
      attributionControl: false,
    }).setView([-16.7908906, -49.2311547], 16);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(leafletMap.current);

    // Garante que o mapa ocupe todo o container disponível
    setTimeout(() => {
      if (leafletMap.current) leafletMap.current.invalidateSize();
    }, 250);

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
      // Atualizar Linha do Trajeto
      if (polylineLayer.current) {
        polylineLayer.current.setLatLngs(latLngs);
      } else {
        polylineLayer.current = L.polyline(latLngs, { color: '#eab308', weight: 5, opacity: 0.85 }).addTo(leafletMap.current);
      }

      const firstPoint = latLngs[0];
      const latestPoint = latLngs[latLngs.length - 1];

      // Marcador de Início (Amarelo)
      if (!startMarker.current) {
        startMarker.current = L.circleMarker(firstPoint, { radius: 7, color: '#eab308', fillOpacity: 1, weight: 2 }).addTo(leafletMap.current);
      }

      // Marcador de Posição Atual (Vermelho)
      if (!endMarker.current) {
        endMarker.current = L.circleMarker(latestPoint, { radius: 6, color: '#ef4444', fillOpacity: 1, weight: 2 }).addTo(leafletMap.current);
      } else {
        endMarker.current.setLatLng(latestPoint);
      }

      // Durante a gravação, focar sempre no ponto atual
      if (!isInteractive) {
        leafletMap.current.panTo(latestPoint, { animate: true });
        // Se for o primeiro ponto, ajusta o zoom
        if (latLngs.length === 1) {
          leafletMap.current.setZoom(17);
        }
      } else if (latLngs.length > 1) {
        // No mural, mostra o trajeto inteiro
        leafletMap.current.fitBounds(polylineLayer.current.getBounds(), { padding: [40, 40] });
      }
    }
  }, [points, isInteractive]);

  return (
    <div ref={mapRef} className={`rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 ${className}`} />
  );
};