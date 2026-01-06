
import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { RouteTracker } from './components/RouteTracker';
import { MapView } from './components/MapView';
import { View, User, Route } from './types';
import { Bike, Compass, Users, Calendar, Trophy, Image as ImageIcon, ExternalLink, Shield, Gauge, ChevronRight, Zap, Map, Volume2, VolumeX, Maximize2, MapPin, Navigation, Lock, Radio, Award, Star, Loader2, Edit2, Save, X, Camera, UserPlus, Key, Trash2, CheckCircle2, Cake, Upload, MessageCircle, Briefcase } from 'lucide-react';
import { getRouteInsights } from './services/geminiService';
import { supabase } from './services/supabaseClient';

const LAMA_LOGO_URL = 'https://github.com/lamaaparecidabr-lab/LAMA-APARECIDA/blob/main/components/logo.jpg?raw=true';
const YOUTUBE_ID = '-VzuMRXCizo';
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
    thumbnail: 'https://www.viajali.com.br/wp-content/uploads/2017/12/serra-do-rio-do-rastro-10.jpg',
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
  const [allMembers, setAllMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [editForm, setEditForm] = useState({ name: '', bikeModel: '', avatar: '', birthDate: '', associationType: '' as any });
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLIFrameElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const syncInProgress = useRef(false);

  useEffect(() => {
    let mounted = true;

    const safetyTimer = setTimeout(() => {
      if (mounted && isLoading) {
        setIsLoading(false);
      }
    }, 8000);

    const checkInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          if (session?.user) {
            await syncUserData(session.user);
          } else {
            setIsLoading(false);
          }
        }
      } catch (err) {
        if (mounted) setIsLoading(false);
      }
    };

    checkInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (session?.user) {
        await syncUserData(session.user);
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setRoutes([]);
        setAllMembers([]);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchRoutes();
      fetchMembers();
    }
  }, [isAuthenticated]);

  const syncUserData = async (authUser: any) => {
    if (syncInProgress.current) return;
    syncInProgress.current = true;
    
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      const userData: User = {
        id: authUser.id,
        name: profileData?.name || authUser.user_metadata?.name || 'Membro L.A.M.A.',
        email: authUser.email || '',
        bikeModel: profileData?.bike_model || 'Não informado',
        avatar: profileData?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser.id}`,
        birthDate: profileData?.birth_date || '',
        associationType: profileData?.association_type || undefined,
        role: (profileData?.role as 'admin' | 'member') || (authUser.email === ADMIN_EMAIL ? 'admin' : 'member')
      };
      
      setUser(userData);
      setEditForm({
        name: userData.name,
        bikeModel: userData.bikeModel || '',
        avatar: userData.avatar || '',
        birthDate: userData.birthDate || '',
        associationType: userData.associationType || ''
      });
      setIsAuthenticated(true);
    } catch (err) {
      console.error("Erro na sincronização:", err);
    } finally {
      setIsLoading(false);
      syncInProgress.current = false;
    }
  };

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, avatar_url, birth_date, bike_model, association_type')
        .order('name', { ascending: true });
      
      if (error) throw error;
      if (data) {
        setAllMembers(data.map((m: any) => ({
          id: m.id,
          name: m.name,
          avatar: m.avatar_url,
          birthDate: m.birth_date,
          bikeModel: m.bike_model,
          associationType: m.association_type,
          email: ''
        })));
      }
    } catch (err) {
      console.error("Erro ao buscar membros:", err);
    }
  };

  const fetchRoutes = async () => {
    try {
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data) {
        setRoutes(data.map((r: any) => ({
          id: r.id,
          user_id: r.user_id,
          title: r.title,
          description: r.description,
          distance: r.distance,
          difficulty: r.difficulty,
          points: r.points,
          status: r.status,
          thumbnail: r.thumbnail,
          isOfficial: r.is_official
        })));
      }
    } catch (err) {
      console.error("Erro ao buscar rotas:", err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword(loginForm);
      if (error) {
        alert("Acesso negado: " + error.message);
        setIsLoading(false);
      }
    } catch (err: any) {
      alert("Erro inesperado no login.");
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsUpdating(true);

    try {
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        name: editForm.name,
        bike_model: editForm.bikeModel,
        avatar_url: editForm.avatar,
        birth_date: editForm.birthDate || null,
        association_type: editForm.associationType || null,
        updated_at: new Date().toISOString()
      });

      if (error) throw error;

      setUser({ ...user, ...editForm });
      setIsEditingProfile(false);
      fetchMembers();
      alert("Perfil atualizado com sucesso!");
    } catch (err: any) {
      alert("Erro ao atualizar perfil: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasswordChange = async () => {
    const newPassword = window.prompt("Digite sua nova senha (mínimo 6 caracteres):");
    if (newPassword && newPassword.length >= 6) {
      setIsUpdating(true);
      try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        alert("Senha alterada com sucesso!");
      } catch (err: any) {
        alert("Erro ao alterar senha: " + err.message);
      } finally {
        setIsUpdating(false);
      }
    } else if (newPassword) {
      alert("A senha deve conter pelo menos 6 caracteres.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("A imagem deve ter no máximo 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveRoute = async (newRoute: Route) => {
    if (!user) return;
    const { error } = await supabase.from('routes').insert([{
      id: newRoute.id,
      user_id: user.id,
      title: newRoute.title,
      description: newRoute.description,
      distance: newRoute.distance,
      difficulty: newRoute.difficulty,
      points: newRoute.points,
      status: newRoute.status,
      thumbnail: newRoute.thumbnail,
      is_official: user.role === 'admin'
    }]);

    if (error) alert("Erro ao salvar missão: " + error.message);
    else fetchRoutes();
  };

  const fetchInsights = async (route: Route) => {
    setIsUpdating(true);
    try {
      const data = await getRouteInsights(route.title, "Aparecida de Goiânia, GO");
      alert(`🛡️ DICAS L.A.M.A. PARA: ${route.title}\n\n${data.safetyTips.map((t: string) => `• ${t}`).join('\n')}\n\n🌅 DESTAQUE PAISAGÍSTICO: ${data.scenicHighlight}`);
    } catch (error) {
      console.error("Erro no briefing:", error);
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
      videoRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: command, args: [] }), '*');
      if (isMuted) videoRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [100] }), '*');
      setIsMuted(!isMuted);
    }
  };

  const handleFullscreen = () => {
    if (videoContainerRef.current) {
      if (document.fullscreenElement) document.exitFullscreen();
      else videoContainerRef.current.requestFullscreen();
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Não informado';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  const getBirthdays = (offset: number) => {
    const targetMonth = (new Date().getMonth() + offset) % 12;
    return allMembers.filter(m => m.birthDate && new Date(m.birthDate).getUTCMonth() === targetMonth)
      .sort((a, b) => new Date(a.birthDate!).getUTCDate() - new Date(b.birthDate!).getUTCDate());
  };

  const getSortedMembersByBirthMonth = () => {
    return [...allMembers].sort((a, b) => {
      if (!a.birthDate) return 1;
      if (!b.birthDate) return -1;
      const m1 = new Date(a.birthDate).getUTCMonth();
      const m2 = new Date(b.birthDate).getUTCMonth();
      if (m1 !== m2) return m1 - m2;
      return new Date(a.birthDate).getUTCDate() - new Date(b.birthDate).getUTCDate();
    });
  };

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const isAdmin = user?.role === 'admin' || user?.email === ADMIN_EMAIL;

  if (isLoading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6">
      <Loader2 className="text-yellow-500 animate-spin" size={48} />
      <p className="text-yellow-500 font-oswald font-black uppercase tracking-widest animate-pulse italic">Sincronizando Radar...</p>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#121212] text-zinc-300">
      <Sidebar user={user} currentView={currentView} setView={setView} onLogout={handleLogout} />
      
      <main className="flex-1 p-5 md:p-12 pb-32 md:pb-12 max-w-[1400px] mx-auto w-full overflow-y-auto custom-scrollbar flex flex-col">
        {!isAuthenticated && !['home', 'clubhouse'].includes(currentView) ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4">
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
            <footer className="mt-10 py-6 text-center">
              <p className="text-[10px] italic text-zinc-600 uppercase tracking-widest">Developed by Antunes Rider</p>
            </footer>
          </div>
        ) : (
          <div className="animate-in fade-in duration-700 flex-1 flex flex-col">
            <div className="flex-1">
              {currentView === 'home' && (
                <div className="space-y-8">
                  <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-900 pb-12">
                    <div className="flex items-center gap-10">
                      <div className="relative group shrink-0">
                        <div className="absolute inset-0 bg-yellow-500/20 blur-3xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
                        <img 
                          src={LAMA_LOGO_URL} 
                          alt="Logo" 
                          className="relative w-28 h-28 object-contain filter drop-shadow-[0_0_15px_rgba(234,179,8,0.3)] transform group-hover:scale-110 transition-transform duration-500" 
                        />
                      </div>
                      <div>
                        <span className="text-yellow-500 font-black uppercase tracking-widest text-xs md:text-lg">LATIN AMERICAN MOTORCYCLE ASSOCIATION</span>
                        <h1 className="text-3xl md:text-5xl font-oswald font-black text-white uppercase italic mt-2">Capítulo <span className="text-yellow-500">Aparecida</span></h1>
                        <p className="text-[10px] font-bold italic text-zinc-600 uppercase tracking-widest mt-1">Est. 10/2022</p>
                      </div>
                    </div>
                  </header>

                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-yellow-500 rounded-full"></div>
                        <h3 className="text-2xl md:text-3xl font-oswald font-black text-white uppercase italic tracking-widest leading-none">Respeito <span className="text-yellow-500">& Liberdade</span></h3>
                      </div>
                      <a href="https://chat.whatsapp.com/EsjVd9CMEEl0tpgKhZ73XE" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/20 px-4 py-2 rounded-xl transition-all group">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-tight text-right">venha fazer parte do grupo de amigos <br className="hidden sm:block"/> do LAMA Aparecida</span>
                        <div className="bg-[#25D366] p-2 rounded-lg text-black group-hover:scale-110 transition-transform shadow-lg shadow-[#25D366]/20"><MessageCircle size={20} fill="currentColor" /></div>
                      </a>
                    </div>
                    <div ref={videoContainerRef} className="relative rounded-3xl md:rounded-[4rem] overflow-hidden bg-zinc-900 border border-zinc-800 aspect-[16/9] md:aspect-[21/9] shadow-3xl">
                      <iframe ref={videoRef} className="w-full h-full object-cover opacity-60 pointer-events-none" src={`https://www.youtube.com/embed/${YOUTUBE_ID}?autoplay=1&mute=1&loop=1&playlist=${YOUTUBE_ID}&controls=0&enablejsapi=1&modestbranding=1&rel=0&iv_load_policy=3&origin=${window.location.origin}`} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen></iframe>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 md:flex md:flex-wrap md:gap-4 items-center justify-start">
                       <button onClick={() => setView('clubhouse')} className="bg-white text-black px-1 md:px-12 py-3 md:py-5 rounded-xl md:rounded-[1.8rem] font-black uppercase text-[7px] md:text-[11px] hover:bg-yellow-500 transition-all flex flex-col md:flex-row items-center justify-center gap-1 md:gap-3 shadow-xl">VISITAR SEDE <MapPin size={12} /></button>
                       <button onClick={toggleMute} className="bg-zinc-900/80 backdrop-blur-md text-white px-10 py-5 rounded-[1.8rem] font-black uppercase text-[11px] hover:bg-yellow-500 hover:text-black transition-all flex items-center justify-center gap-3 shadow-xl">VOLUME {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}</button>
                       <button onClick={handleFullscreen} className="bg-zinc-900/80 backdrop-blur-md text-white px-10 py-5 rounded-[1.8rem] font-black uppercase text-[11px] hover:bg-yellow-500 hover:text-black transition-all flex items-center justify-center gap-3 shadow-xl">AMPLIAR VÍDEO <Maximize2 size={12} /></button>
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

                  <div className="relative bg-zinc-950 p-10 md:p-16 rounded-[3rem] md:rounded-[4rem] border border-zinc-900 overflow-hidden shadow-3xl">
                    {isEditingProfile ? (
                      <form onSubmit={handleUpdateProfile} className="space-y-8 relative z-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-2"><label className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 ml-4">Nome de Estrada</label><input type="text" required className="w-full bg-zinc-900 border border-zinc-800 text-white px-6 py-4 rounded-2xl outline-none focus:border-yellow-500/50" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} /></div>
                          <div className="space-y-2"><label className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 ml-4">Moto Principal</label><input type="text" className="w-full bg-zinc-900 border border-zinc-800 text-white px-6 py-4 rounded-2xl outline-none focus:border-yellow-500/50" value={editForm.bikeModel} onChange={e => setEditForm({...editForm, bikeModel: e.target.value})} /></div>
                          <div className="space-y-2"><label className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 ml-4">Data de Nascimento</label><input type="date" className="w-full bg-zinc-900 border border-zinc-800 text-white px-6 py-4 rounded-2xl outline-none focus:border-yellow-500/50" value={editForm.birthDate} onChange={e => setEditForm({...editForm, birthDate: e.target.value})} /></div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 ml-4">Tipo de Associação</label>
                            <select className="w-full bg-zinc-900 border border-zinc-800 text-white px-6 py-4 rounded-2xl outline-none focus:border-yellow-500/50" value={editForm.associationType} onChange={e => setEditForm({...editForm, associationType: e.target.value as any})}>
                              <option value="">Selecione...</option>
                              <option value="PILOTO">PILOTO</option>
                              <option value="ESPOSA">ESPOSA</option>
                              <option value="ASSOCIADO">ASSOCIADO</option>
                            </select>
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 ml-4">Foto de Perfil</label>
                            <div className="flex gap-4">
                              <input type="file" ref={fileInputRef} className="hidden" accept=".jpg,.jpeg,.png" onChange={handleFileChange} />
                              <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-between bg-zinc-900 border border-zinc-800 text-zinc-400 px-6 py-4 rounded-2xl outline-none hover:bg-zinc-800 transition-all text-sm font-bold">Selecionar Foto <Upload size={18} /></button>
                              {editForm.avatar && <img src={editForm.avatar} alt="Preview" className="w-14 h-14 rounded-xl object-cover border border-zinc-800" />}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <button type="submit" disabled={isUpdating} className="flex-1 bg-yellow-500 text-black py-5 rounded-2xl font-black uppercase flex items-center justify-center gap-2">{isUpdating ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Salvar</>}</button>
                          <button type="button" onClick={() => setIsEditingProfile(false)} className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-400 py-5 rounded-2xl font-black uppercase">Cancelar</button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex flex-col md:flex-row items-center md:items-start gap-10 md:gap-16 relative z-10">
                        <div className="relative shrink-0">
                          <div className="absolute -inset-2 bg-gradient-to-tr from-yellow-500 to-red-600 rounded-[2.5rem] blur-sm opacity-50"></div>
                          <img src={user?.avatar} alt="Avatar" className="relative w-48 h-48 md:w-64 md:h-64 rounded-[2.2rem] border-4 border-zinc-950 object-cover shadow-2xl" />
                          <div className="absolute -bottom-4 -right-4 bg-yellow-500 text-black p-3 rounded-2xl shadow-xl transform rotate-12"><Award size={24} strokeWidth={3} /></div>
                        </div>
                        <div className="flex-1 text-center md:text-left space-y-8">
                          <div>
                            <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-4">
                              <span className="bg-yellow-500 text-black px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">Membro Ativo</span>
                              <span className="bg-zinc-800 text-zinc-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-zinc-700">Capítulo Aparecida</span>
                            </div>
                            <h2 className="text-5xl md:text-7xl lg:text-8xl font-oswald font-black text-white uppercase italic tracking-tighter leading-none mb-2">{user?.name}</h2>
                            <p className="text-zinc-500 font-black uppercase tracking-[0.4em] text-[10px] md:text-xs italic">{user?.email}</p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                            <div className="bg-zinc-900/60 border border-zinc-800/80 p-6 md:p-8 rounded-[2rem] flex flex-col hover:border-yellow-500/30 transition-all group/card text-left">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-2">Motocicleta</span>
                                <div className="flex items-center gap-4"><Bike size={24} className="text-yellow-500" /><span className="font-bold text-white text-lg italic">{user?.bikeModel}</span></div>
                            </div>
                            <div className="bg-zinc-900/60 border border-zinc-800/80 p-6 md:p-8 rounded-[2rem] flex flex-col hover:border-pink-500/30 transition-all group/card text-left">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-2">Aniversário</span>
                                <div className="flex items-center gap-4"><Cake size={24} className="text-pink-500" /><span className="font-bold text-white text-lg italic">{formatDate(user?.birthDate)}</span></div>
                            </div>
                            <div className="bg-zinc-900/60 border border-zinc-800/80 p-6 md:p-8 rounded-[2rem] flex flex-col hover:border-blue-500/30 transition-all group/card text-left">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-2">Associação</span>
                                <div className="flex items-center gap-4"><Briefcase size={24} className="text-blue-500" /><span className="font-bold text-white text-lg italic uppercase">{user?.associationType || 'ASSOCIADO'}</span></div>
                            </div>
                          </div>
                          <div className="pt-4 flex flex-col sm:flex-row gap-4">
                             <button onClick={() => setIsEditingProfile(true)} className="flex-1 bg-white text-black py-4 rounded-2xl font-black uppercase text-[10px] hover:bg-yellow-500 transition-all shadow-xl">Editar Perfil</button>
                             <button onClick={handlePasswordChange} className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-400 py-4 rounded-2xl font-black uppercase text-[10px] hover:text-white transition-all">Alterar Senha</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {currentView === 'tracking' && <RouteTracker onSave={handleSaveRoute} />}
              {currentView === 'my-routes' && (
                <div className="space-y-16">
                  <header className="flex items-center gap-4"><div className="w-2 h-10 bg-red-600 rounded-full"></div><h2 className="text-4xl font-oswald font-black text-white italic uppercase tracking-tighter">Mural de <span className="text-yellow-500">Missões</span></h2></header>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {routes.length > 0 ? routes.map(route => (
                      <div key={route.id} className="bg-zinc-950 rounded-[2.5rem] border border-zinc-900 overflow-hidden shadow-2xl group flex flex-col">
                        <MapView points={route.points} className="h-48 grayscale group-hover:grayscale-0 transition-all duration-500" />
                        <div className="p-8"><h3 className="text-2xl font-oswald font-black text-white uppercase italic truncate">{route.title}</h3><div className="flex items-center justify-between mt-4 text-zinc-500 text-[10px] font-bold uppercase tracking-widest"><span>{route.distance} Rodados</span><button onClick={() => fetchInsights(route)} className="p-2 bg-zinc-900 rounded-lg text-yellow-500 hover:bg-yellow-500 hover:text-black transition-all"><Zap size={14}/></button></div></div>
                      </div>
                    )) : <div className="col-span-full py-32 text-center text-zinc-600 uppercase italic">Nenhuma missão no horizonte...</div>}
                  </div>
                </div>
              )}

              {currentView === 'explorer' && (
                <div className="space-y-12">
                  <header className="flex items-center gap-4"><div className="w-2 h-10 bg-yellow-500 rounded-full"></div><h2 className="text-5xl font-oswald font-black text-white italic uppercase tracking-tighter">Rotas <span className="text-yellow-500">Icônicas</span></h2></header>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {iconicRoutes.map(route => (
                      <div key={route.id} className="bg-zinc-900/50 rounded-[3rem] overflow-hidden border border-zinc-800 hover:border-yellow-500/30 transition-all group shadow-2xl flex flex-col relative">
                        {route.isOfficial && <div className="absolute top-6 right-6 z-20 transform rotate-12 drop-shadow-2xl"><div className="border-[5px] border-yellow-500 text-yellow-500 px-6 py-2 rounded-2xl font-oswald font-black uppercase text-[12px] bg-black/95">OFICIAL L.A.M.A.</div></div>}
                        <div className="h-64 relative overflow-hidden"><img src={route.thumbnail} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80" alt={route.title} /></div>
                        <div className="p-10 flex-1 flex flex-col space-y-6"><h3 className="text-3xl font-oswald font-black text-white uppercase italic tracking-tighter">{route.title}</h3><p className="text-zinc-500 text-sm leading-relaxed">{route.description}</p><button onClick={() => fetchInsights(route)} className="w-full bg-zinc-800 hover:bg-yellow-500 hover:text-black text-white py-5 rounded-2xl font-black uppercase text-[10px] transition-all flex items-center justify-center gap-3"><Zap size={16} /> Briefing</button></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentView === 'clubhouse' && (
                <div className="space-y-12">
                  <header className="flex items-center gap-4"><div className="w-2 h-10 bg-yellow-500 rounded-full"></div><h2 className="text-5xl font-oswald font-black text-white italic uppercase tracking-tighter">Casa <span className="text-yellow-500">Club</span></h2></header>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="bg-zinc-950 p-8 md:p-12 rounded-[3rem] border border-zinc-900 flex flex-col justify-center space-y-8">
                      <h3 className="text-3xl font-oswald font-black text-white uppercase italic tracking-tighter">Ponto de <span className="text-yellow-500">Encontro</span></h3>
                      <p className="text-zinc-400 text-lg">{CLUBHOUSE_ADDRESS}</p>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CLUBHOUSE_MARK_NAME)}`} target="_blank" className="flex-1 bg-white text-black py-4 rounded-2xl font-black uppercase text-center flex items-center justify-center gap-3">Google Maps <ExternalLink size={18}/></a>
                        <a href={`https://waze.com/ul?q=${encodeURIComponent(CLUBHOUSE_MARK_NAME)}&navigate=yes`} target="_blank" className="flex-1 bg-[#33ccff] text-black py-4 rounded-2xl font-black uppercase text-center flex items-center justify-center gap-3">Waze <ExternalLink size={18}/></a>
                      </div>
                    </div>
                    <MapView points={[{...CLUBHOUSE_COORDS, timestamp: Date.now()}]} className="h-[400px] shadow-3xl" isInteractive />
                  </div>
                </div>
              )}

              {currentView === 'admin' && isAdmin && (
                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                  <header className="flex items-center gap-4"><div className="w-2 h-10 bg-red-600 rounded-full"></div><h2 className="text-4xl font-oswald font-black text-white italic uppercase tracking-tighter">Painel de <span className="text-yellow-500">Controle</span></h2></header>
                  <div className="bg-zinc-950 p-8 md:p-12 rounded-[3rem] border border-zinc-900 shadow-3xl">
                    <div className="flex items-center gap-4 mb-10"><Users className="text-yellow-500" size={32} /><h3 className="text-2xl font-oswald font-black text-white uppercase italic tracking-tighter">Membros do Capítulo</h3></div>
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-900">
                            <th className="pb-4 px-4 text-[10px] font-black uppercase tracking-widest text-zinc-600">Nome Completo</th>
                            <th className="pb-4 px-4 text-[10px] font-black uppercase tracking-widest text-zinc-600">Nascimento</th>
                            <th className="pb-4 px-4 text-[10px] font-black uppercase tracking-widest text-zinc-600">Moto</th>
                            <th className="pb-4 px-4 text-[10px] font-black uppercase tracking-widest text-zinc-600">Associação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900/50">
                          {getSortedMembersByBirthMonth().map((member) => (
                            <tr key={member.id} className="group hover:bg-zinc-900/30 transition-all">
                              <td className="py-6 px-4">
                                <div className="flex items-center gap-4">
                                  <img src={member.avatar} className="w-12 h-12 rounded-2xl border border-zinc-800 object-cover" alt={member.name} />
                                  <span className="font-bold text-white uppercase text-sm">{member.name}</span>
                                </div>
                              </td>
                              <td className="py-6 px-4">
                                <span className="text-yellow-500 font-mono text-sm font-black italic">{formatDate(member.birthDate)}</span>
                              </td>
                              <td className="py-6 px-4">
                                <span className="font-bold text-zinc-400 text-sm italic">{member.bikeModel || 'N/A'}</span>
                              </td>
                              <td className="py-6 px-4">
                                <span className="bg-zinc-900 text-zinc-400 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-zinc-800">{member.associationType || 'ASSOCIADO'}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <footer className="mt-16 py-8 text-center border-t border-zinc-900/50">
              <p className="text-[10px] italic text-zinc-600 uppercase tracking-widest">Developed by Antunes Rider</p>
            </footer>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
