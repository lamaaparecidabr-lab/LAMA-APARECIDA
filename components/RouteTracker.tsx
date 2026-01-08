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

    // Tentar manter a tela ligada durante a missão (Wake Lock)
    if ('wakeLock' in navigator) {
      try {
        wakeLock.current = await (navigator as any).wakeLock.request('screen');
      } catch (err) {
        console.warn("Wake Lock não disponível");
      }
    }

    const handleNewPosition = (pos: GeolocationPosition) => {
      // Relaxamos o filtro de precisão para 150m para garantir captura em áreas urbanas
      if (pos.coords.accuracy > 150) return;

      const newPoint: RoutePoint = { 
        lat: Number(pos.coords.latitude.toFixed(6)), 
        lng: Number(pos.coords.longitude.toFixed(6)), 
        timestamp: pos.timestamp 
      };

      setPoints(prevPoints => {
        if (prevPoints.length === 0) {
          pointsRef.current = [newPoint];
          return [newPoint];
        }

        const last = prevPoints[prevPoints.length - 1];
        const dist = calculateDistance(last, newPoint);
        
        // Sensibilidade de 1 metro para garantir que qualquer movimento saia do 0.00km
        if (dist > 0.001) {
          distanceRef.current += dist;
          setTotalDistance(distanceRef.current);
          const updated = [...prevPoints, newPoint];
          pointsRef.current = updated;
          return updated;
        }
        return prevPoints;
      });
    };

    // Captura inicial para destravar o sistema instantaneamente
    navigator.geolocation.getCurrentPosition(handleNewPosition, 
      (err) => console.warn("GPS inicial falhou, aguardando watch...", err),
      { enableHighAccuracy: true, timeout: 5000 }
    );

    // Monitoramento contínuo de alta frequência
    watchId.current = navigator.geolocation.watchPosition(
      handleNewPosition,
      (error) => console.error("Erro de Radar:", error),
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
      alert("Trajeto insuficiente. Movimente-se um pouco mais para que o Radar grave sua missão.");
      resetState();
      return;
    }

    setIsSaving(true);
    if (onSave) {
      try {
        await onSave({
          id: '', 
          title: `Missão em ${new Date().toLocaleDateString('pt-BR')}`,
          description: `Percurso gravado via L.A.M.A. Sede Virtual. Duração: ${formatTime(finalElapsed)}.`,
          distance: `${finalDistance.toFixed(2)} km`,
          difficulty: finalDistance > 50 ? 'Moderada' : 'Fácil',
          points: finalPoints,
          status: 'concluída'
        });
      } catch (err) {
        console.error("Erro no salvamento:", err);
      }
    }

    setIsSaving(false);
    resetState();
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
        <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest mt-2">Radar Ativo: Prontidão para Captura Satelital</p>
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
              Dica: Mantenha esta tela aberta e visível para garantir a telemetria perfeita.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};