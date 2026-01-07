import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Shield } from 'lucide-react';
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
  const pointsRef = useRef<RoutePoint[]>([]);
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
    if (!navigator.geolocation) { alert("GPS não suportado."); return; }
    setIsRecording(true);
    setStartTime(Date.now());
    setPoints([]);
    pointsRef.current = [];
    setTotalDistance(0);
    distanceRef.current = 0;

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (pos.coords.accuracy > 150) return;
        const newPoint = { lat: pos.coords.latitude, lng: pos.coords.longitude, timestamp: pos.timestamp };
        if (pointsRef.current.length > 0) {
          const last = pointsRef.current[pointsRef.current.length - 1];
          const dist = calculateDistance(last, newPoint);
          if (dist > 0.003) {
            distanceRef.current += dist;
            setTotalDistance(distanceRef.current);
            pointsRef.current = [...pointsRef.current, newPoint];
            setPoints(pointsRef.current);
          }
        } else {
          pointsRef.current = [newPoint];
          setPoints(pointsRef.current);
        }
      },
      () => alert("Erro GPS: Ative a localização."),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  const stopTracking = () => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    const finalPoints = pointsRef.current;
    const finalDistance = distanceRef.current;

    if (onSave && finalPoints.length > 0) {
      onSave({
        id: '', // Supabase gera o ID automaticamente
        title: `Missão em ${new Date().toLocaleDateString('pt-BR')}`,
        description: `Percurso via L.A.M.A. Duração: ${formatTime(elapsed)}.`,
        distance: `${finalDistance.toFixed(2)} km`,
        difficulty: finalDistance > 40 ? 'Moderada' : 'Fácil',
        points: finalPoints,
        status: 'concluída'
      });
    }

    setIsRecording(false);
    setStartTime(null);
    setElapsed(0);
    setPoints([]);
    pointsRef.current = [];
    setTotalDistance(0);
    alert("Missão Finalizada!");
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6">
      <header>
        <h2 className="text-3xl md:text-5xl font-oswald font-black uppercase text-white italic">Gravar <span className="text-yellow-500">Missão</span></h2>
        <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest mt-2">Sistema de Telemetria Ativo</p>
      </header>
      <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3"><MapView points={points} className="h-[180px] md:h-[350px] rounded-[2rem]" isInteractive /></div>
        <div className="space-y-6">
          <div className="bg-zinc-950 p-6 rounded-[2rem] border border-zinc-900 space-y-4">
             <div className="flex justify-between"><span className="text-[10px] font-black uppercase text-zinc-600">Tempo</span><span className="text-xl font-mono text-white italic">{formatTime(elapsed)}</span></div>
             <div className="flex justify-between border-t border-zinc-900 pt-4"><span className="text-[10px] font-black uppercase text-zinc-600">KM</span><span className="text-xl font-mono text-white italic">{totalDistance.toFixed(2)} km</span></div>
          </div>
          {!isRecording ? (
            <button onClick={startTracking} className="w-full bg-yellow-500 text-black py-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2">Iniciar Gravação</button>
          ) : (
            <button onClick={stopTracking} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 animate-pulse">Parar e Salvar</button>
          )}
          <div className="flex items-center gap-2 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800"><Shield className="text-red-600" size={14} /><p className="text-[9px] text-zinc-500 font-bold uppercase italic">Gravando coordenadas satelitais.</p></div>
        </div>
      </div>
    </div>
  );
};
