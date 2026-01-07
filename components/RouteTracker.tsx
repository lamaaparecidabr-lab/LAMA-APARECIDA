import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, MapPin, Gauge, Clock, Radio, Shield } from 'lucide-react';
import { RoutePoint, Route } from '../types';
import { MapView } from './MapView';

interface RouteTrackerProps {
  onSave?: (route: Route) => void;
}

const calculateDistance = (p1: RoutePoint, p2: RoutePoint): number => {
  const R = 6371;
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
  const pointsRef = useRef<RoutePoint[]>([]); // Ref para garantir acesso aos pontos mais recentes
  const [totalDistance, setTotalDistance] = useState(0);
  const distanceRef = useRef(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const watchId = useRef<number | null>(null);

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
      alert("GPS não suportado.");
      return;
    }

    setIsRecording(true);
    setStartTime(Date.now());
    setPoints([]);
    pointsRef.current = [];
    setTotalDistance(0);
    distanceRef.current = 0;

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        // Aumentado limite de precisão para 150m para garantir rastro em condições sub-ideais
        if (pos.coords.accuracy > 150) return; 

        const newPoint: RoutePoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timestamp: pos.timestamp,
        };

        const currentPoints = pointsRef.current;
        if (currentPoints.length > 0) {
          const last = currentPoints[currentPoints.length - 1];
          const dist = calculateDistance(last, newPoint);
          // Reduzido para 3 metros para maior fidelidade no rastro
          if (dist > 0.003) { 
            distanceRef.current += dist;
            setTotalDistance(distanceRef.current);
            pointsRef.current = [...currentPoints, newPoint];
            setPoints(pointsRef.current);
          }
        } else {
          pointsRef.current = [newPoint];
          setPoints(pointsRef.current);
        }
      },
      (err) => alert("Erro GPS: Ative a localização e tente novamente."),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  const stopTracking = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    
    // Usamos pointsRef para garantir que pegamos os pontos exatos do momento
    const finalPoints = pointsRef.current;
    const finalDistance = distanceRef.current;

    if (onSave && finalPoints.length > 0) {
      const date = new Date();
      onSave({
        id: Math.random().toString(36).substr(2, 9),
        title: `Missão em ${date.toLocaleDateString()}`,
        description: `Percurso gravado via telemetria L.A.M.A. Duração: ${formatTime(elapsed)}.`,
        distance: `${finalDistance.toFixed(2)} km`,
        difficulty: finalDistance > 40 ? 'Moderada' : 'Fácil',
        points: [...finalPoints],
        status: 'concluída',
        thumbnail: 'https://images.unsplash.com/photo-1458178351025-a764d88e0261?q=80&w=800&auto=format&fit=crop'
      });
    }

    setIsRecording(false);
    setStartTime(null);
    setElapsed(0);
    setPoints([]);
    pointsRef.current = [];
    setTotalDistance(0);
    distanceRef.current = 0;
    alert("Missão Concluída!");
  };

  const formatTime = (sec: number) => {
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6">
      <header>
        <h2 className="text-3xl md:text-5xl font-oswald font-black uppercase text-white italic">
          Gravar <span className="text-yellow-500">Missão</span>
        </h2>
        <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest mt-2">Sistema de Telemetria Ativo</p>
      </header>

      <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 relative">
          <MapView points={points} className="h-[180px] md:h-[350px] rounded-[2rem] border-zinc-800 shadow-2xl" isInteractive />
        </div>

        <div className="space-y-6">
          <div className="bg-zinc-950 p-6 rounded-[2rem] border border-zinc-900 space-y-4">
             <div className="flex justify-between">
                <span className="text-zinc-600 text-[10px] uppercase font-black">Cronômetro</span>
                <span className="text-xl font-mono text-white italic">{formatTime(elapsed)}</span>
             </div>
             <div className="flex justify-between border-t border-zinc-900 pt-4">
                <span className="text-zinc-600 text-[10px] uppercase font-black">Distância</span>
                <span className="text-xl font-mono text-white italic">{totalDistance.toFixed(2)} km</span>
             </div>
          </div>

          {!isRecording ? (
            <button onClick={startTracking} className="w-full bg-yellow-500 text-black py-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2">
              <Play fill="currentColor" size={16} /> Iniciar Gravação
            </button>
          ) : (
            <button onClick={stopTracking} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 animate-pulse">
              <Square fill="currentColor" size={16} /> Parar e Salvar
            </button>
          )}

          <div className="flex items-center gap-2 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
             <Shield className="text-red-600" size={14} />
             <p className="text-[9px] text-zinc-500 font-bold uppercase italic">Gravando coordenadas via satélite.</p>
          </div>
        </div>
      </div>
    </div>
  );
};