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
    }).setView([-16.7908906, -49.2311547], 15);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(leafletMap.current);

    // Ajuste de tamanho vital para evitar tela cinza
    const resizeObserver = new ResizeObserver(() => {
      if (leafletMap.current) leafletMap.current.invalidateSize();
    });
    resizeObserver.observe(mapRef.current);

    return () => {
      resizeObserver.disconnect();
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

    const latLngs = points.map(p => [p.lat, p.lng]).filter(coords => !isNaN(coords[0]) && !isNaN(coords[1]));
    
    if (latLngs.length > 0) {
      // Gerenciamento da Linha (Trajeto)
      if (polylineLayer.current) {
        polylineLayer.current.setLatLngs(latLngs);
      } else {
        polylineLayer.current = L.polyline(latLngs, { color: '#eab308', weight: 4, opacity: 0.8 }).addTo(leafletMap.current);
      }

      // Marcadores de Início e Fim
      const firstPoint = latLngs[0];
      const latestPoint = latLngs[latLngs.length - 1];

      if (!startMarker.current) {
        startMarker.current = L.circleMarker(firstPoint, { radius: 6, color: '#eab308', fillOpacity: 1 }).addTo(leafletMap.current);
      }

      if (!endMarker.current) {
        endMarker.current = L.circleMarker(latestPoint, { radius: 5, color: '#ef4444', fillOpacity: 1, weight: 2 }).addTo(leafletMap.current);
      } else {
        endMarker.current.setLatLng(latestPoint);
      }

      // Seguir o usuário em tempo real se não for o modo interativo (mural/detalhes)
      if (!isInteractive) {
        leafletMap.current.panTo(latestPoint);
      } else if (latLngs.length > 1) {
        // No mural, ajustamos para ver o trajeto completo
        leafletMap.current.fitBounds(polylineLayer.current.getBounds(), { padding: [20, 20] });
      }
    }
  }, [points, isInteractive]);

  return (
    <div ref={mapRef} className={`rounded-xl overflow-hidden border border-zinc-800 ${className}`} />
  );
};