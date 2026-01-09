import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Shield, Radio, Loader2 } from 'lucide-react';
import { RoutePoint, Route } from '../types';
import { MapView } from './MapView';

interface RouteTrackerProps {
  onSave?: (route: Route) => void;
}

const calculateDistance = (p1: RoutePoint, p2: RoutePoint): number => {
  const R = 6371; // km
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
  const [isSaving, setIsSaving] = useState(false);
  const [points, setPoints] = useState<RoutePoint[]>([]);
  const pointsRef = useRef<RoutePoint[]>([]);
  const [totalDistance, setTotalDistance] = useState(0);
  const distanceRef = useRef(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const watchId = useRef<number | null>(null);
  const wakeLock = useRef<any>(null);

  useEffect(() => {
    let interval: any;
    if (isRecording && startTime) {
      interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => {
      clearInterval(interval);
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
      if (wakeLock.current) {
        wakeLock.current.release().catch(() => {});
      }
    };
  }, [isRecording, startTime]);

  const startTracking = async () => {
    if (!navigator.geolocation) { 
      alert("Erro: Este dispositivo não possui suporte a Radar GPS."); 
      return; 
    }

    resetState();
    setIsRecording(true);
    setStartTime(Date.now());

    if ('wakeLock' in navigator) {
      try {
        wakeLock.current = await (navigator as any).wakeLock.request('screen');
      } catch (err) {
        console.warn("Wake Lock indisponível.");
      }
    }

    const processNewPosition = (pos: GeolocationPosition) => {
      if (pos.coords.accuracy > 200) return;

      const newPoint: RoutePoint = { 
        lat: Number(pos.coords.latitude.toFixed(6)), 
        lng: Number(pos.coords.longitude.toFixed(6)), 
        timestamp: pos.timestamp 
      };

      const lastPoint = pointsRef.current[pointsRef.current.length - 1];

      if (!lastPoint) {
        pointsRef.current = [newPoint];
        setPoints([newPoint]);
      } else {
        const d = calculateDistance(lastPoint, newPoint);
        if (d > 0.002) {
          distanceRef.current += d;
          pointsRef.current.push(newPoint);
          setTotalDistance(distanceRef.current);
          setPoints([...pointsRef.current]);
        }
      }
    };

    navigator.geolocation.getCurrentPosition(processNewPosition, 
      (err) => console.warn("Aguardando satélite...", err),
      { enableHighAccuracy: true, timeout: 5000 }
    );

    watchId.current = navigator.geolocation.watchPosition(
      processNewPosition,
      (error) => console.error("Falha no GPS:", error),
      { 
        enableHighAccuracy: true, 
        timeout: 10000, 
        maximumAge: 0 
      }
    );
  };

  const stopTracking = async () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }

    if (wakeLock.current) {
      wakeLock.current.release().catch(() => {});
      wakeLock.current = null;
    }

    const finalPoints = [...pointsRef.current];
    const finalDistance = distanceRef.current;
    const finalElapsed = elapsed;

    if (finalPoints.length < 2 || finalDistance < 0.01) {
      alert("Trajeto insuficiente no Radar. Movimente-se mais.");
      resetState();
      return;
    }

    setIsSaving(true);
    
    // Pequeno delay para garantir que o UI renderize o estado 'Sincronizando'
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      if (onSave) {
        await onSave({
          id: '', 
          title: `Missão em ${new Date().toLocaleDateString('pt-BR')}`,
          description: `Percurso gravado via L.A.M.A. Sede Virtual. Duração: ${formatTime(finalElapsed)}.`,
          distance: `${finalDistance.toFixed(2)} km`,
          difficulty: finalDistance > 50 ? 'Moderada' : 'Fácil',
          points: finalPoints,
          status: 'concluída'
        });
      }
      resetState();
    } catch (err) {
      console.error("Erro ao sincronizar missão:", err);
      // O resetState não é chamado aqui para permitir que o usuário tente novamente se falhar
    } finally {
      setIsSaving(false);
    }
  };

  const resetState = () => {
    setIsRecording(false);
    setStartTime(null);
    setElapsed(0);
    setPoints([]);
    pointsRef.current = [];
    setTotalDistance(0);
    distanceRef.current = 0;
  };

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <header>
        <h2 className="text-3xl md:text-5xl font-oswald font-black uppercase text-white italic">Gravar <span className="text-yellow-500">Missão</span></h2>
        <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest mt-2">Radar Ativo: Captura de Telemetria Satelital</p>
      </header>
      <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <MapView points={points} className="h-[250px] md:h-[450px] rounded-[2.5rem] shadow-2xl" isInteractive={false} />
        </div>
        <div className="space-y-6">
          <div className="bg-zinc-950 p-8 rounded-[2.5rem] border border-zinc-900 space-y-6 shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5"><Radio size={80} /></div>
             <div className="flex justify-between items-end relative z-10">
               <span className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">Cronômetro</span>
               <span className="text-3xl font-oswald font-black text-white italic leading-none">{formatTime(elapsed)}</span>
             </div>
             <div className="flex justify-between items-end border-t border-zinc-900 pt-6 relative z-10">
               <span className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">KM Rodados</span>
               <span className="text-4xl font-oswald font-black text-yellow-500 italic leading-none">{totalDistance.toFixed(2)}</span>
             </div>
          </div>
          
          {!isRecording ? (
            <button 
              onClick={startTracking} 
              disabled={isSaving}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black py-6 rounded-2xl font-black uppercase text-[12px] flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 disabled:opacity-50"
            >
              <Play size={20} fill="currentColor" /> Iniciar Gravação
            </button>
          ) : (
            <button 
              onClick={stopTracking} 
              disabled={isSaving}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-6 rounded-2xl font-black uppercase text-[12px] flex items-center justify-center gap-3 animate-pulse shadow-xl active:scale-95 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Square size={20} fill="currentColor" />} 
              {isSaving ? 'Sincronizando...' : 'Finalizar Missão'}
            </button>
          )}
          
          <div className="flex items-center gap-4 bg-zinc-900/40 p-5 rounded-2xl border border-zinc-800">
            <Shield className="text-red-600 shrink-0" size={18} />
            <p className="text-[9px] text-zinc-500 font-bold uppercase italic leading-relaxed">
              Dica: Missões longas podem demorar alguns segundos a mais para sincronizar com o Mural.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};