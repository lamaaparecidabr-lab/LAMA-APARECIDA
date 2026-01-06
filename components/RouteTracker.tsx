
import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, MapPin, Gauge, Clock, Radio, Shield } from 'lucide-react';
import { RoutePoint, Route } from '../types';
import { MapView } from './MapView';

interface RouteTrackerProps {
  onSave?: (route: Route) => void;
}

// Função para calcular distância entre dois pontos (Haversine)
const calculateDistance = (p1: RoutePoint, p2: RoutePoint): number => {
  const R = 6371; // Raio da Terra em km
  const dLat = (p2.lat - p1.lat) * Math.PI / 180;
  const dLon = (p2.lng - p1.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const RouteTracker: React.FC<RouteTrackerProps> = ({ onSave }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [points, setPoints] = useState<RoutePoint[]>([]);
  const [totalDistance, setTotalDistance] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const watchId = useRef<number | null>(null);
  const lastPointRef = useRef<RoutePoint | null>(null);

  useEffect(() => {
    let interval: any;
    if (isRecording && startTime) {
      interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, startTime]);

  const startTracking = () => {
    if (!navigator.geolocation) {
      alert("Seu dispositivo não suporta geolocalização.");
      return;
    }

    // Solicita permissão e inicia
    setIsRecording(true);
    setStartTime(Date.now());
    setPoints([]);
    setTotalDistance(0);
    lastPointRef.current = null;

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        // Filtro de precisão básica (ignora se a precisão for pior que 100 metros para evitar "drifting")
        if (pos.coords.accuracy > 100) return;

        const newPoint: RoutePoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timestamp: pos.timestamp,
        };

        setPoints(prev => {
          if (prev.length > 0) {
            const last = prev[prev.length - 1];
            const dist = calculateDistance(last, newPoint);
            // Só adiciona distância se o deslocamento for significativo (> 5 metros)
            if (dist > 0.005) {
              setTotalDistance(d => d + dist);
              return [...prev, newPoint];
            }
            return prev;
          }
          return [newPoint];
        });
      },
      (err) => {
        console.error("Erro de GPS:", err);
        if (err.code === 1) alert("Permissão de localização negada. Ative o GPS.");
      },
      { 
        enableHighAccuracy: true, 
        timeout: 10000, 
        maximumAge: 0 
      }
    );
  };

  const stopTracking = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
    }
    
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    if (onSave && points.length > 0) {
      const newRoute: Route = {
        id: Math.random().toString(36).substr(2, 9),
        title: `Missão de ${dateStr} - ${timeStr}`,
        description: `Rota gravada via GPS. Duração: ${formatTime(elapsed)}.`,
        distance: `${totalDistance.toFixed(2)} km`,
        difficulty: totalDistance > 50 ? 'Moderada' : 'Fácil',
        points: [...points],
        status: 'concluída',
        thumbnail: 'https://images.unsplash.com/photo-1458178351025-a764d88e0261?q=80&w=800&auto=format&fit=crop'
      };
      onSave(newRoute);
    }

    setIsRecording(false);
    setStartTime(null);
    setElapsed(0);
    setPoints([]);
    setTotalDistance(0);
    alert("Percurso salvo com sucesso!");
  };

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-500">
      <header>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1.5 h-6 md:h-8 bg-red-600 rounded-full"></div>
          <h2 className="text-3xl md:text-5xl font-oswald font-black uppercase tracking-tighter text-white italic">
            Gravar <span className="text-yellow-500">Rota</span>
          </h2>
        </div>
        <p className="text-yellow-500/60 font-black uppercase tracking-[0.2em] text-[8px] md:text-[10px] ml-4 md:ml-5">Telemetria GPS em Tempo Real</p>
      </header>

      <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6 md:gap-10">
        <div className="lg:col-span-3 order-2 lg:order-1 relative z-0">
          <MapView points={points} className="h-[250px] md:h-[500px] border-yellow-500/10 shadow-2xl rounded-[2rem] md:rounded-[3rem] overflow-hidden" isInteractive />
        </div>

        <div className="space-y-6 md:space-y-8 order-1 lg:order-2">
          <div className="bg-zinc-950 p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-zinc-900 space-y-6 md:space-y-8 shadow-2xl relative overflow-hidden">
            <div className="space-y-4 md:space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-zinc-600 font-black uppercase text-[8px] md:text-[10px] tracking-widest flex items-center gap-2"><Clock size={14} className="text-yellow-500" /> Tempo</span>
                <span className="text-2xl md:text-3xl font-mono text-white font-black italic">{formatTime(elapsed)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-zinc-900 pt-4 md:pt-6">
                <span className="text-zinc-600 font-black uppercase text-[8px] md:text-[10px] tracking-widest flex items-center gap-2"><Gauge size={14} className="text-red-600" /> Km</span>
                <span className="text-2xl md:text-3xl font-mono text-white font-black italic">{totalDistance.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {!isRecording ? (
            <button
              onClick={startTracking}
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-black py-4 md:py-6 rounded-2xl md:rounded-[2rem] font-black text-[10px] md:text-xs transition-all shadow-xl shadow-yellow-500/20 uppercase tracking-[0.2em] md:tracking-[0.25em] flex items-center justify-center gap-3"
            >
              <Play fill="currentColor" size={18} /> Iniciar Gravação
            </button>
          ) : (
            <button
              onClick={stopTracking}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-4 md:py-6 rounded-2xl md:rounded-[2rem] font-black text-[10px] md:text-xs transition-all shadow-xl shadow-red-600/20 uppercase tracking-[0.2em] md:tracking-[0.25em] flex items-center justify-center gap-3 animate-pulse"
            >
              <Square fill="currentColor" size={18} /> Encerrar Missão
            </button>
          )}

          <div className="bg-zinc-900/30 p-4 rounded-xl border border-zinc-800 flex items-center gap-3">
             <Shield className="text-red-600 shrink-0" size={16} />
             <p className="text-[8px] md:text-[10px] text-zinc-500 font-bold uppercase leading-relaxed italic">Radar de precisão ativado.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
