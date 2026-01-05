
import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { RouteTracker } from './components/RouteTracker';
import { MapView } from './components/MapView';
import { View, User, Route } from './types';
import { Bike, Compass, Users, Calendar, Trophy, Image as ImageIcon, ExternalLink, Shield, Gauge, ChevronRight, Zap, Map, Volume2, VolumeX, Maximize2, MapPin, Navigation, Lock, Radio, Award, Star, Loader2, Edit2, Save, X, Camera, UserPlus, Key, Trash2, CheckCircle2, Cake } from 'lucide-react';
import { getRouteInsights } from './services/geminiService';
import { supabase } from './services/supabaseClient';

const LAMA_LOGO_URL = 'https://github.com/lamaaparecidabr-lab/LAMA-APARECIDA/blob/main/components/logo.jpg?raw=true';
const YOUTUBE_ID = '-VzuMRXCizo';
// Coordenadas exatas do L.A.M.A. Aparecida Casa Club
const CLUBHOUSE_COORDS = { lat: -16.7908906, lng: -49.2311547 };
const CLUBHOUSE_ADDRESS = "R. X-011 - Sítios Santa Luzia, Aparecida de Goiânia - GO, 74922-570";
const CLUBHOUSE_MARK_NAME = "L.A.M.A. Aparecida Casa Club - Motorcycle Association";

const iconicRoutes: Route[] = [
  {
    id: 'iconic-1',
    title: 'Serra do Rio do Rastro (SC)',
    description: 'Uma das estradas mais desafiadoras e belas do mundo, com 284 curvas em 35km.',
    distance: '35 km',
    difficulty: 'Lendária',
    points: [],
    status: 'planejada',
    thumbnail: 'https://destinosnotaveis.com.br/wp-content/uploads/2022/08/Serra_do_Rio_do_Rastro-1024x640.jpg',
    isOfficial: true
  },
  {
    id: 'iconic-2',
    title: 'Los Caracoles (Chile/Arg)',
    description: 'A icônica travessia dos Andes com curvas em zigue-zague cobertas de neve.',
    distance: '250 km',
    difficulty: 'Difícil',
    points: [],
    status: 'planejada',
    thumbnail: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=800&auto=format&fit=crop',
    isOfficial: true
  },
  {
    id: 'iconic-3',
    title: 'Estrada Real de Goiás',
    description: 'Caminho histórico ligando Pirenópolis à antiga capital, a Cidade de Goiás.',
    distance: '130 km',
    difficulty: 'Moderada',
    points: [],
    status: 'planejada',
    thumbnail: 'https://images.unsplash.com/photo-1471478331149-c72f17e33c73?q=80&w=800&auto=format&fit=crop',
    isOfficial: false
  },
  {
    id: 'iconic-4',
    title: 'Rota das Águas Quentes',
    description: 'Trajeto relaxante pelas estâncias termais de Goiás, ideal para um final de semana.',
    distance: '170 km',
    difficulty: 'Fácil',
    points: [],
    status: 'planejada',
    thumbnail: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=800&auto=format&fit=crop',
    isOfficial: false
  }
];

const ADMIN_EMAIL = 'lama.aparecidabr@gmail.com';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setView] = useState<View>('home');
  const [user, setUser] = useState<User | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [editForm, setEditForm] = useState({ name: '', bikeModel: '', avatar: '', birthDate: '' });
  const [insights, setInsights] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLIFrameElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await syncUserData(session.user);
      } else {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchRoutes();
  }, [isAuthenticated]);

  const syncUserData = async (authUser: any) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      const userData: User = {
        id: authUser.id,
        name: profile?.name || authUser.user_metadata?.name || 'Membro L.A.M.A.',
        email: authUser.email || '',
        bikeModel: profile?.bike_model || 'Não informado',
        avatar: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser.id}`,
        birthDate: profile?.birth_date || '',
        role: (profile?.role as 'admin' | 'member') || (authUser.email === ADMIN_EMAIL ? 'admin' : 'member')
      };
      
      setUser(userData);
      setEditForm({
        name: userData.name,
        bikeModel: userData.bikeModel || '',
        avatar: userData.avatar || '',
        birthDate: userData.birthDate || ''
      });
      setIsAuthenticated(true);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoutes = async () => {
    const { data } = await supabase.from('routes').select().order('created_at', { ascending: false });
    if (data) setRoutes(data.map((r: any) => ({ ...r, isOfficial: r.is_official })));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword(loginForm);

    if (error) {
      alert("Acesso negado: " + error.message);
      setIsLoading(false);
    } else if (data?.session?.user) {
      await syncUserData(data.session.user);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsUpdating(true);

    try {
      await supabase.from('profiles').upsert({
        id: user.id,
        name: editForm.name,
        bike_model: editForm.bikeModel,
        avatar_url: editForm.avatar,
        birth_date: editForm.birthDate || null,
        updated_at: new Date().toISOString()
      });

      setUser({ ...user, ...editForm });
      setIsEditingProfile(false);
      alert("Perfil atualizado!");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveRoute = async (newRoute: Route) => {
    await supabase.from('routes').insert([{
      ...newRoute,
      is_official: user?.role === 'admin',
      user_id: user?.id
    }]);
    fetchRoutes();
  };

  const fetchInsights = async (route: Route) => {
    setIsUpdating(true);
    try {
      const data = await getRouteInsights(route.title, "Aparecida de Goiânia, GO");
      setInsights(data);
      alert(`🛡️ DICAS L.A.M.A. PARA: ${route.title}\n\n${data.safetyTips.map((t: string) => `• ${t}`).join('\n')}\n\n🌅 DESTAQUE PAISAGÍSTICO: ${data.scenicHighlight}`);
    } catch (error) {
      console.error("Erro ao obter insights via Gemini:", error);
      alert("Radar temporariamente indisponível. Tente novamente mais tarde.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setUser(null);
    setView('home');
  };

  const toggleMute = () => {
    if (videoRef.current?.contentWindow) {
      const command = isMuted ? 'unMute' : 'mute';
      // Envia apenas o comando de mutar/desmutar
      videoRef.current.contentWindow.postMessage(JSON.stringify({ 
        event: 'command', 
        func: command, 
        args: [] 
      }), '*');
      
      // Garante que o volume esteja no máximo ao desmutar sem forçar playVideo
      if (isMuted) {
        videoRef.current.contentWindow.postMessage(JSON.stringify({ 
          event: 'command', 
          func: 'setVolume', 
          args: [100] 
        }), '*');
      }

      setIsMuted(!isMuted);
    }
  };

  const handleFullscreen = () => {
    if (videoContainerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoContainerRef.current.requestFullscreen().catch(err => {
          console.error(`Erro ao tentar ativar tela cheia: ${err.message}`);
        });
      }
    }
  };

  const getDifficultyStyles = (difficulty: string) => {
    switch (difficulty) {
      case 'Lendária': return 'text-red-500 border-red-500/30 bg-red-500/10 shadow-[0_0_10px_rgba(239,68,68,0.3)]';
      case 'Difícil': return 'text-orange-600 border-orange-600/30 bg-orange-600/10 shadow-[0_0_10px_rgba(234,88,12,0.3)]';
      case 'Moderada': return 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10 shadow-[0_0_10px_rgba(234,179,8,0.2)]';
      case 'Fácil': return 'text-green-400 border-green-400/30 bg-green-500/10 shadow-[0_0_10px_rgba(74,222,128,0.2)]';
      default: return 'text-zinc-400 border-zinc-800 bg-zinc-800/30';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Não informado';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  if (isLoading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6">
      <Loader2 className="text-yellow-500 animate-spin" size={48} />
      <p className="text-yellow-500 font-oswald font-black uppercase tracking-widest animate-pulse italic">Iniciando Sistemas...</p>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#050505] text-zinc-300">
      <Sidebar user={user} currentView={currentView} setView={setView} onLogout={handleLogout} />
      
      <main className="flex-1 p-5 md:p-12 pb-32 md:pb-12 max-w-[1400px] mx-auto w-full overflow-y-auto custom-scrollbar">
        {!isAuthenticated && !['home', 'clubhouse'].includes(currentView) ? (
          <div className="min-h-[70vh] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] shadow-2xl">
              <div className="text-center mb-10">
                <img src={LAMA_LOGO_URL} alt="Logo" className="w-20 h-20 mx-auto mb-6 object-contain" />
                <h2 className="text-3xl font-oswald text-white font-black uppercase italic tracking-tighter">Sede Virtual</h2>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <input type="email" required className="w-full bg-black border border-zinc-800 text-white px-6 py-4 rounded-2xl outline-none" placeholder="Email" value={loginForm.email} onChange={e => setLoginForm({...loginForm, email: e.target.value})} />
                <input type="password" required className="w-full bg-black border border-zinc-800 text-white px-6 py-4 rounded-2xl outline-none" placeholder="Senha" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
                <button type="submit" className="w-full bg-yellow-500 text-black py-5 rounded-2xl font-black uppercase flex items-center justify-center gap-3">Entrar <Zap size={16} /></button>
              </form>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in duration-700">
            {currentView === 'home' && (
              <div className="space-y-8">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-900 pb-12">
                  <div className="flex items-center gap-10">
                    <img src={LAMA_LOGO_URL} alt="Logo" className="w-28 h-28 object-contain" />
                    <div>
                      <span className="text-yellow-500 font-black uppercase tracking-widest text-xs md:text-lg">LATIN AMERICAN MOTORCYCLE ASSOCIATION</span>
                      <h1 className="text-3xl md:text-5xl font-oswald font-black text-white uppercase italic mt-2">Capítulo <span className="text-yellow-500">Aparecida</span></h1>
                    </div>
                  </div>
                </header>

                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-yellow-500 rounded-full"></div>
                    <h3 className="text-2xl md:text-3xl font-oswald font-black text-white uppercase italic tracking-widest leading-none">Respeito <span className="text-yellow-500">& Liberdade</span></h3>
                  </div>
                  
                  <div ref={videoContainerRef} className="relative rounded-3xl md:rounded-[4rem] overflow-hidden bg-zinc-900 border border-zinc-800 aspect-[16/9] md:aspect-[21/9] shadow-3xl">
                    <iframe 
                      ref={videoRef}
                      className="w-full h-full object-cover opacity-60 pointer-events-none"
                      src={`https://www.youtube.com/embed/${YOUTUBE_ID}?autoplay=1&mute=1&loop=1&playlist=${YOUTUBE_ID}&controls=0&enablejsapi=1&modestbranding=1&rel=0&iv_load_policy=3&origin=${window.location.origin}`} 
                      frameBorder="0"
                    ></iframe>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 md:flex md:flex-wrap md:gap-4 items-center justify-start">
                     <button onClick={() => setView('clubhouse')} className="bg-white text-black px-1 md:px-12 py-3 md:py-5 rounded-xl md:rounded-[1.8rem] font-black uppercase text-[7px] md:text-[11px] hover:bg-yellow-500 transition-all flex flex-col md:flex-row items-center justify-center gap-1 md:gap-3 shadow-xl">
                       VISITAR SEDE <MapPin size={12} />
                     </button>
                     <button onClick={toggleMute} className="bg-zinc-900/80 backdrop-blur-md text-white px-1 md:px-10 py-3 md:py-5 rounded-xl md:rounded-[1.8rem] font-black uppercase text-[7px] md:text-[11px] hover:bg-yellow-500 hover:text-black transition-all flex flex-col md:flex-row items-center justify-center gap-1 md:gap-3 shadow-xl">
                       VOLUME {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                     </button>
                     <button onClick={handleFullscreen} className="bg-zinc-900/80 backdrop-blur-md text-white px-1 md:px-10 py-3 md:py-5 rounded-xl md:rounded-[1.8rem] font-black uppercase text-[7px] md:text-[11px] hover:bg-yellow-500 hover:text-black transition-all flex flex-col md:flex-row items-center justify-center gap-1 md:gap-3 shadow-xl">
                       AMPLIAR VÍDEO <Maximize2 size={12} />
                     </button>
                  </div>
                </div>
              </div>
            )}

            {currentView === 'profile' && (
              <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <header className="flex items-center gap-4">
                  <div className="w-2 h-10 bg-yellow-500 rounded-full"></div>
                  <h2 className="text-4xl font-oswald font-black text-white italic uppercase tracking-tighter">Área do <span className="text-yellow-500">Membro</span></h2>
                </header>

                <div className="relative group">
                  {/* Glow Background */}
                  <div className="absolute -inset-4 bg-yellow-500/10 blur-[60px] rounded-[4rem] group-hover:bg-yellow-500/15 transition-all duration-1000"></div>
                  
                  <div className="relative bg-zinc-950 p-10 md:p-16 rounded-[3rem] md:rounded-[4rem] border border-zinc-900 overflow-hidden shadow-3xl">
                    <div className="absolute top-0 right-0 p-12 opacity-[0.03] rotate-12 pointer-events-none">
                      <Shield size={320} className="text-white" />
                    </div>

                    {isEditingProfile ? (
                      <form onSubmit={handleUpdateProfile} className="space-y-8 relative z-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 ml-4">Nome de Estrada</label>
                            <input type="text" required className="w-full bg-zinc-900 border border-zinc-800 text-white px-6 py-4 rounded-2xl outline-none focus:border-yellow-500/50" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 ml-4">Máquina Principal</label>
                            <input type="text" className="w-full bg-zinc-900 border border-zinc-800 text-white px-6 py-4 rounded-2xl outline-none focus:border-yellow-500/50" value={editForm.bikeModel} onChange={e => setEditForm({...editForm, bikeModel: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 ml-4">Data de Nascimento</label>
                            <input type="date" className="w-full bg-zinc-900 border border-zinc-800 text-white px-6 py-4 rounded-2xl outline-none focus:border-yellow-500/50" value={editForm.birthDate} onChange={e => setEditForm({...editForm, birthDate: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 ml-4">URL do Avatar</label>
                            <input type="text" className="w-full bg-zinc-900 border border-zinc-800 text-white px-6 py-4 rounded-2xl outline-none focus:border-yellow-500/50" value={editForm.avatar} onChange={e => setEditForm({...editForm, avatar: e.target.value})} />
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <button type="submit" disabled={isUpdating} className="flex-1 bg-yellow-500 text-black py-5 rounded-2xl font-black uppercase flex items-center justify-center gap-2">
                             {isUpdating ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Salvar Alterações</>}
                          </button>
                          <button type="button" onClick={() => setIsEditingProfile(false)} className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-400 py-5 rounded-2xl font-black uppercase">Cancelar</button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex flex-col md:flex-row items-center md:items-start gap-10 md:gap-16 relative z-10">
                        {/* Avatar Section */}
                        <div className="relative shrink-0">
                          <div className="absolute -inset-2 bg-gradient-to-tr from-yellow-500 to-red-600 rounded-[2.5rem] blur-sm opacity-50"></div>
                          <img 
                            src={user?.avatar} 
                            alt="Avatar" 
                            className="relative w-48 h-48 md:w-64 md:h-64 rounded-[2.2rem] border-4 border-zinc-950 object-cover shadow-2xl" 
                          />
                          <div className="absolute -bottom-4 -right-4 bg-yellow-500 text-black p-3 rounded-2xl shadow-xl transform rotate-12">
                            <Award size={24} strokeWidth={3} />
                          </div>
                        </div>

                        {/* Info Section */}
                        <div className="flex-1 text-center md:text-left space-y-8">
                          <div>
                            <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-4">
                              <span className="bg-yellow-500 text-black px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">Membro Ativo</span>
                              <span className="bg-zinc-800 text-zinc-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-zinc-700">Capítulo Aparecida</span>
                            </div>
                            <h2 className="text-5xl md:text-7xl lg:text-8xl font-oswald font-black text-white uppercase italic tracking-tighter leading-none mb-2">
                              {user?.name}
                            </h2>
                            <p className="text-zinc-500 font-black uppercase tracking-[0.4em] text-[10px] md:text-xs italic">{user?.email}</p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                            <div className="bg-zinc-900/60 border border-zinc-800/80 p-6 md:p-8 rounded-[2rem] flex items-center gap-6 hover:border-yellow-500/30 transition-all group/card">
                              <div className="bg-yellow-500/10 p-4 rounded-2xl group-hover/card:bg-yellow-500/20 transition-all">
                                <Bike size={32} className="text-yellow-500" />
                              </div>
                              <div className="flex flex-col text-left">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-1">Motocicleta</span>
                                <span className="font-bold text-white text-lg md:text-xl tracking-tight">{user?.bikeModel}</span>
                              </div>
                            </div>

                            <div className="bg-zinc-900/60 border border-zinc-800/80 p-6 md:p-8 rounded-[2rem] flex items-center gap-6 hover:border-pink-500/30 transition-all group/card">
                              <div className="bg-pink-500/10 p-4 rounded-2xl group-hover/card:bg-pink-500/20 transition-all">
                                <Cake size={32} className="text-pink-500" />
                              </div>
                              <div className="flex flex-col text-left">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-1">Aniversário</span>
                                <span className="font-bold text-white text-lg md:text-xl tracking-tight italic">{formatDate(user?.birthDate)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-4 flex flex-col sm:flex-row gap-4">
                             <button onClick={() => setIsEditingProfile(true)} className="flex-1 bg-white text-black py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] hover:bg-yellow-500 transition-all shadow-xl">Editar Perfil</button>
                             <button className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-400 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] hover:text-white transition-all">Alterar Senha</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {currentView === 'tracking' && <RouteTracker onSave={handleSaveRoute} />}
            
            {currentView === 'my-routes' && (
              <div className="space-y-12">
                <header className="flex items-center gap-4">
                  <div className="w-2 h-10 bg-red-600 rounded-full"></div>
                  <h2 className="text-4xl font-oswald font-black text-white italic uppercase tracking-tighter">Mural de <span className="text-yellow-500">Missões</span></h2>
                </header>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {routes.length > 0 ? routes.map(route => (
                    <div key={route.id} className="bg-zinc-950 rounded-[2.5rem] border border-zinc-900 overflow-hidden shadow-2xl group flex flex-col relative">
                      <MapView points={route.points} className="h-48 grayscale group-hover:grayscale-0 transition-all duration-500" />
                      <div className="p-8">
                         <h3 className="text-2xl font-oswald font-black text-white uppercase italic truncate tracking-tighter">{route.title}</h3>
                         <div className="flex items-center justify-between mt-4 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                           <span>{route.distance} Rodados</span>
                           <button onClick={() => fetchInsights(route)} className="p-2 bg-zinc-900 rounded-lg text-yellow-500 hover:bg-yellow-500 hover:text-black transition-all"><Zap size={14}/></button>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="col-span-full py-32 text-center bg-zinc-900/10 rounded-[3rem] border border-dashed border-zinc-800 text-zinc-500 uppercase italic tracking-widest">Nenhuma missão registrada localmente.</div>
                  )}
                </div>
              </div>
            )}

            {currentView === 'explorer' && (
              <div className="space-y-12">
                <header className="flex items-center gap-4">
                  <div className="w-2 h-10 bg-yellow-500 rounded-full"></div>
                  <h2 className="text-5xl font-oswald font-black text-white italic uppercase tracking-tighter">Rotas <span className="text-yellow-500">Icônicas</span></h2>
                </header>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {iconicRoutes.map(route => (
                    <div key={route.id} className="bg-zinc-900/50 rounded-[3rem] overflow-hidden border border-zinc-800 hover:border-yellow-500/30 transition-all group shadow-2xl flex flex-col relative">
                      {/* Carimbo Oficial Melhorado */}
                      {route.isOfficial && (
                        <div className="absolute top-6 right-6 z-20 transform rotate-12 drop-shadow-2xl">
                          <div className="border-[5px] border-yellow-500 text-yellow-500 px-6 py-2 rounded-2xl font-oswald font-black uppercase text-[12px] tracking-[0.25em] shadow-[0_0_30px_rgba(0,0,0,0.8)] bg-black/95 ring-2 ring-yellow-500/40">
                            OFICIAL L.A.M.A.
                          </div>
                        </div>
                      )}

                      <div className="h-64 relative overflow-hidden">
                        <img src={route.thumbnail} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80" alt={route.title} />
                      </div>
                      <div className="p-10 flex-1 flex flex-col space-y-6">
                        <div className="flex flex-col gap-4">
                          <div className={`w-fit px-4 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest italic ${getDifficultyStyles(route.difficulty)}`}>
                            {route.difficulty}
                          </div>
                          <div className="flex justify-between items-start">
                            <h3 className="text-3xl font-oswald font-black text-white uppercase italic tracking-tighter">{route.title}</h3>
                            <span className="text-zinc-500 font-mono text-sm">{route.distance}</span>
                          </div>
                        </div>
                        <p className="text-zinc-500 text-sm leading-relaxed flex-1">{route.description}</p>
                        <button onClick={() => fetchInsights(route)} className="w-full bg-zinc-800 hover:bg-yellow-500 hover:text-black text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all flex items-center justify-center gap-3">
                          <Zap size={16} /> Briefing Inteligente
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentView === 'clubhouse' && (
              <div className="space-y-12">
                <header className="flex items-center gap-4">
                  <div className="w-2 h-10 bg-yellow-500 rounded-full"></div>
                  <h2 className="text-5xl font-oswald font-black text-white italic uppercase tracking-tighter">Casa <span className="text-yellow-500">Club</span></h2>
                </header>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="bg-zinc-950 p-8 md:p-12 rounded-[3rem] border border-zinc-900 flex flex-col justify-center space-y-8">
                    <div className="flex flex-row items-center gap-4 mb-4">
                      <div className="bg-yellow-500/10 p-2.5 rounded-2xl border border-yellow-500/20 shadow-[0_0_20px_rgba(234,179,8,0.1)]">
                        <Award size={24} className="text-yellow-500" />
                      </div>
                      <h4 className="text-xl font-oswald font-black text-white uppercase italic tracking-widest leading-none">Sede Oficial <span className="text-yellow-500">L.A.M.A. Aparecida</span></h4>
                    </div>
                    <h3 className="text-3xl font-oswald font-black text-white uppercase italic">Ponto de <span className="text-yellow-500">Encontro</span></h3>
                    <p className="text-zinc-400 text-lg leading-relaxed">{CLUBHOUSE_ADDRESS}</p>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CLUBHOUSE_MARK_NAME)}`} target="_blank" className="flex-1 bg-white text-black py-4 rounded-2xl font-black uppercase text-center flex items-center justify-center gap-3 hover:bg-yellow-500 transition-all">Google Maps <ExternalLink size={18}/></a>
                      <a href={`https://waze.com/ul?q=${encodeURIComponent(CLUBHOUSE_MARK_NAME)}&navigate=yes`} target="_blank" className="flex-1 bg-[#33ccff] text-black py-4 rounded-2xl font-black uppercase text-center flex items-center justify-center gap-3 hover:bg-yellow-500 transition-all">Waze <ExternalLink size={18}/></a>
                    </div>
                  </div>
                  <MapView points={[{...CLUBHOUSE_COORDS, timestamp: Date.now()}]} className="h-[400px] shadow-3xl" isInteractive />
                </div>
              </div>
            )}

       {currentView === 'gallery' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
            <header>
              <h2 className="text-4xl font-oswald font-bold uppercase text-white italic">Nossa <span className="text-yellow-500">Galeria</span></h2>
              <p className="text-zinc-400 mt-2">Registros históricos e momentos da irmandade em Aparecida.</p>
            </header>

            <div className="relative bg-zinc-900 rounded-[3rem] border border-zinc-800 overflow-hidden min-h-[500px] flex flex-col items-center justify-center p-12 text-center shadow-2xl">
              <div className="absolute inset-0 opacity-10 grayscale">
                <img src="https://images.unsplash.com/photo-1558981403-c5f91cbba527?q=80&w=2070&auto=format&fit=crop" alt="Background" className="w-full h-full object-cover" />
              </div>
              
              <div className="relative z-10 space-y-8 max-w-xl">
                <div className="bg-yellow-500/10 p-6 rounded-full w-fit mx-auto border border-yellow-500/20">
                  <ImageIcon size={64} className="text-yellow-500" />
                </div>
                <h3 className="text-3xl font-oswald font-bold text-white uppercase italic">Explore Nossa História no <span className="text-blue-500">Facebook</span></h3>
                <p className="text-zinc-400 text-lg leading-relaxed">
                  Mantemos nossa galeria oficial atualizada em nossa página do Facebook. Clique no botão abaixo para ver as fotos das nossas últimas rotas, eventos e encontros.
                </p>
                <a 
                  href="https://www.facebook.com/lamaaparecidabr/photos" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 bg-yellow-500 hover:bg-yellow-600 text-black px-10 py-5 rounded-2xl font-bold text-lg transition-all transform hover:scale-105 shadow-xl shadow-yellow-500/20 uppercase tracking-widest"
                >
                  ACESSAR GALERIA OFICIAL <ExternalLink size={20} />
                </a>
              </div>
            </div>
          </div>
        )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
