import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { RouteTracker } from './components/RouteTracker';
import { MapView } from './components/MapView';
import { View, User, Route } from './types';
import { 
  Bike, Compass, Image as ImageIcon, Shield, Map, 
  MapPin, Radio, Award, Loader2, Save, X, Camera, 
  Zap, MessageCircle, Briefcase, Info, Cake, 
  Volume2, VolumeX, Maximize2, Navigation, ChevronRight,
  Star, Users, ExternalLink, Upload, Trash2, ArrowLeft
} from 'lucide-react';
import { getRouteInsights } from './services/geminiService';
import { supabase } from './services/supabaseClient';

const LAMA_LOGO_URL = 'https://raw.githubusercontent.com/lamaaparecidabr-lab/LAMA-APARECIDA/main/components/logo.jpg';
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
    thumbnail: 'https://github.com/lamaaparecidabr-lab/LAMA-APARECIDA-2/blob/main/components/serra-do-rio-do-rastro.jpg?raw=true',
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

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setView] = useState<View>('home');
  const [user, setUser] = useState<User | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [allMembers, setAllMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [editForm, setEditForm] = useState<Partial<User>>({ name: '', bikeModel: '', avatar: '', birthDate: '', associationType: undefined });
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLIFrameElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const syncInProgress = useRef(false);

  useEffect(() => {
    let mounted = true;
    const safetyTimer = setTimeout(() => {
      if (mounted && isLoading) setIsLoading(false);
    }, 10000);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (session?.user) await syncUserData(session.user);
      else {
        setIsAuthenticated(false);
        setUser(null);
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
      const basicUserData: User = {
        id: authUser.id,
        name: authUser.user_metadata?.name || 'Membro L.A.M.A.',
        email: authUser.email || '',
        avatar: authUser.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser.id}`,
        role: authUser.email === ADMIN_EMAIL ? 'admin' : 'member'
      };
      setUser(basicUserData);
      setIsAuthenticated(true);
      const { data: profileData, error } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
      if (profileData && !error) {
        const fullUserData: User = {
          ...basicUserData,
          name: profileData.name || basicUserData.name,
          bikeModel: profileData.bike_model || 'Não informado',
          avatar: profileData.avatar_url || basicUserData.avatar,
          birthDate: profileData.birth_date || '',
          associationType: profileData.association_type || undefined,
          role: profileData.role || basicUserData.role
        };
        setUser(fullUserData);
        setEditForm({
          name: fullUserData.name,
          bikeModel: fullUserData.bikeModel || '',
          avatar: fullUserData.avatar || '',
          birthDate: fullUserData.birthDate || '',
          associationType: fullUserData.associationType
        });
      }
    } catch (err) {
      console.error("Erro na sincronização:", err);
    } finally {
      setIsLoading(false);
      syncInProgress.current = false;
    }
  };

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('id, name, avatar_url, birth_date, bike_model, association_type').order('name', { ascending: true });
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
      const { data, error } = await supabase.from('routes').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        setRoutes(data.map((r: any) => ({
          id: r.id,
          user_id: r.user_id,
          title: r.title,
          description: r.description,
          distance: r.distance,
          difficulty: r.difficulty,
          points: Array.isArray(r.points) ? r.points : [],
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
    } else if (newPassword) alert("A senha deve conter pelo menos 6 caracteres.");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { alert("A imagem deve ter no máximo 2MB."); return; }
      const reader = new FileReader();
      reader.onloadend = () => setEditForm(prev => ({ ...prev, avatar: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleSaveRoute = async (newRoute: Route) => {
    if (!user) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase.from('routes').insert([{
        id: generateUUID(),
        user_id: user.id,
        title: newRoute.title,
        description: newRoute.description,
        distance: newRoute.distance,
        difficulty: newRoute.difficulty,
        points: newRoute.points,
        status: newRoute.status,
        thumbnail: newRoute.thumbnail || 'https://images.unsplash.com/photo-1558981403-c5f91cbba527?q=80&w=800&auto=format&fit=crop',
        is_official: user.role === 'admin'
      }]);
      if (error) throw error;
      await fetchRoutes();
      setView('my-routes');
    } catch (err: any) {
      alert("Erro ao salvar missão no banco de dados: " + (err.message || "Erro desconhecido."));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteRoute = async (routeId: string) => {
    if (!confirm("Deseja realmente excluir esta missão permanentemente?")) return;
    try {
      const { error } = await supabase.from('routes').delete().eq('id', routeId);
      if (error) throw error;
      setRoutes(prev => prev.filter(r => r.id !== routeId));
      if (selectedRoute?.id === routeId) setSelectedRoute(null);
    } catch (err: any) {
      alert("Erro ao excluir missão: " + err.message);
    }
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
    try { await supabase.auth.signOut(); } catch (err) { console.error("Erro ao encerrar sessão:", err); }
    finally {
      setIsAuthenticated(false);
      setUser(null);
      setIsLoading(false);
      setView('home');
    }
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

  const getBirthdaysByMonth = (targetMonth: number) => {
    return allMembers.filter(m => {
      if (!m.birthDate) return false;
      const birthMonth = new Date(m.birthDate).getUTCMonth();
      return birthMonth === targetMonth;
    }).sort((a, b) => new Date(a.birthDate!).getUTCDate() - new Date(b.birthDate!).getUTCDate());
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

  const getDifficultyStyles = (diff: string) => {
    switch (diff) {
      case 'Fácil': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'Moderada': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'Difícil': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'Lendária': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  const isAdmin = user?.role === 'admin' || user?.email === ADMIN_EMAIL;

  const membersWithRoutes = useMemo(() => {
    return allMembers.map(member => ({
      ...member,
      memberRoutes: routes.filter(r => r.user_id === member.id)
    })).filter(m => m.memberRoutes.length > 0);
  }, [allMembers, routes]);

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
                        <img src={LAMA_LOGO_URL} alt="Logo" className="relative w-28 h-28 object-contain filter drop-shadow-[0_0_15px_rgba(234,179,8,0.3)] transform group-hover:scale-110 transition-transform duration-500" />
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
                            <select className="w-full bg-zinc-900 border border-zinc-800 text-white px-6 py-4 rounded-2xl outline-none focus:border-yellow-500/50" value={editForm.associationType || ''} onChange={e => setEditForm({...editForm, associationType: (e.target.value || undefined) as any})}>
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
                          <button type="submit" disabled={isUpdating} className="flex-1 bg-yellow-500 text-black py-5 rounded-2xl font-black uppercase flex items-center justify-center gap-2">{isUpdating ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Salvar Alterações</>}</button>
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
                        <div className="flex-1 text-center md:text-left space-y-8 min-w-0">
                          <div>
                            <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-4">
                              <span className="bg-yellow-500 text-black px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">Membro Ativo</span>
                              <span className="bg-zinc-800 text-zinc-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-zinc-700">Capítulo Aparecida</span>
                            </div>
                            <h2 className="text-5xl md:text-7xl lg:text-8xl font-oswald font-black text-white uppercase italic tracking-tighter leading-none mb-2 truncate">{user?.name}</h2>
                            <p className="text-zinc-500 font-black uppercase tracking-[0.4em] text-[10px] md:text-xs italic truncate">{user?.email}</p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                            <div className="bg-zinc-900/60 border border-zinc-800/80 p-6 md:p-8 rounded-[2rem] flex flex-col hover:border-yellow-500/30 transition-all group/card text-left min-w-0">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-2 shrink-0">Motocicleta</span>
                                <div className="flex items-center gap-4 min-w-0"><Bike size={24} className="text-yellow-500 shrink-0" /><span className="font-bold text-white text-base md:text-lg italic break-words leading-tight">{user?.bikeModel}</span></div>
                            </div>
                            <div className="bg-zinc-900/60 border border-zinc-800/80 p-6 md:p-8 rounded-[2rem] flex flex-col hover:border-pink-500/30 transition-all group/card text-left min-w-0">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-2 shrink-0">Aniversário</span>
                                <div className="flex items-center gap-4 min-w-0"><Cake size={24} className="text-pink-500 shrink-0" /><span className="font-bold text-white text-base md:text-lg italic break-words leading-tight">{formatDate(user?.birthDate)}</span></div>
                            </div>
                            <div className="bg-zinc-900/60 border border-zinc-800/80 p-6 md:p-8 rounded-[2rem] flex flex-col hover:border-blue-500/30 transition-all group/card text-left min-w-0">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-2 shrink-0">Associação</span>
                                <div className="flex items-center gap-4 min-w-0"><Briefcase size={24} className="text-blue-500 shrink-0" /><span className="font-bold text-white text-base md:text-lg italic break-words leading-tight uppercase">{user?.associationType || 'Não informado'}</span></div>
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
                <div className="space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
                  <header className="flex items-center gap-4">
                    <div className="w-2 h-10 bg-red-600 rounded-full"></div>
                    <h2 className="text-4xl font-oswald font-black text-white italic uppercase tracking-tighter">Mural de <span className="text-yellow-500">Missões</span></h2>
                  </header>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-0">
                    <div className="bg-zinc-950 p-6 rounded-[2rem] border border-zinc-900 shadow-xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 text-yellow-500/10 group-hover:text-yellow-500/20 transition-colors"><Cake size={60} /></div>
                      <h3 className="text-lg font-oswald font-black text-white uppercase italic mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-5 bg-yellow-500 rounded-full"></span> Mês Atual
                      </h3>
                      <div className="space-y-3">
                        {getBirthdaysByMonth(new Date().getUTCMonth()).length > 0 ? (
                          getBirthdaysByMonth(new Date().getUTCMonth()).map(member => (
                            <div key={member.id} className="flex items-center justify-between border-b border-zinc-900 pb-2">
                              <div className="flex items-center gap-2">
                                <img src={member.avatar} className="w-6 h-6 rounded-lg object-cover" alt="" />
                                <span className="text-xs font-bold text-zinc-300">{member.name}</span>
                              </div>
                              <span className="text-[10px] font-black text-yellow-500 font-mono italic">{new Date(member.birthDate!).getUTCDate().toString().padStart(2, '0')}</span>
                            </div>
                          ))
                        ) : ( <p className="text-[10px] text-zinc-600 italic uppercase">Sem aniversários este mês</p> )}
                      </div>
                    </div>
                    <div className="bg-zinc-950 p-6 rounded-[2rem] border border-zinc-900 shadow-xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 text-zinc-500/10 group-hover:text-zinc-500/20 transition-colors"><Star size={60} /></div>
                      <h3 className="text-lg font-oswald font-black text-white uppercase italic mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-5 bg-zinc-700 rounded-full"></span> Próximo Mês
                      </h3>
                      <div className="space-y-3">
                        {getBirthdaysByMonth((new Date().getUTCMonth() + 1) % 12).length > 0 ? (
                          getBirthdaysByMonth((new Date().getUTCMonth() + 1) % 12).map(member => (
                            <div key={member.id} className="flex items-center justify-between border-b border-zinc-900 pb-2">
                              <div className="flex items-center gap-2">
                                <img src={member.avatar} className="w-6 h-6 rounded-lg object-cover" alt="" />
                                <span className="text-xs font-bold text-zinc-400">{member.name}</span>
                              </div>
                              <span className="text-[10px] font-black text-zinc-500 font-mono italic">{new Date(member.birthDate!).getUTCDate().toString().padStart(2, '0')}</span>
                            </div>
                          ))
                        ) : ( <p className="text-[10px] text-zinc-600 italic uppercase">Sem aniversários no próximo mês</p> )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-8">
                    <h3 className="text-2xl font-oswald font-black text-white uppercase italic tracking-widest flex items-center gap-3">
                      <Map size={24} className="text-red-600" /> Minhas Missões
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {routes.filter(r => r.user_id === user?.id).length > 0 ? (
                        routes.filter(r => r.user_id === user?.id).map(route => (
                          <div key={route.id} className="bg-zinc-950 rounded-[2.5rem] border border-zinc-900 overflow-hidden shadow-2xl group flex flex-col relative cursor-pointer" onClick={() => setSelectedRoute(route)}>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteRoute(route.id); }} className="absolute top-4 right-4 z-[50] p-3 bg-red-600 text-white rounded-full backdrop-blur-md opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all shadow-xl active:scale-95"><Trash2 size={16} /></button>
                            <MapView points={route.points} className="h-48 grayscale group-hover:grayscale-0 transition-all duration-500" />
                            <div className="p-8">
                              <h3 className="text-2xl font-oswald font-black text-white uppercase italic truncate">{route.title}</h3>
                              <div className="flex items-center justify-between mt-4 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                                <span>{route.distance} Rodados</span>
                                <span className="flex items-center gap-1 text-yellow-500 italic">VER TRAJETO <ChevronRight size={12}/></span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : ( <div className="col-span-full py-20 text-center text-zinc-700 uppercase italic text-sm">Nenhuma missão gravada ainda...</div> )}
                    </div>
                  </div>
                </div>
              )}

              {currentView === 'explorer' && (
                <div className="space-y-12 animate-in fade-in duration-700">
                  <header className="flex items-center gap-4">
                    <div className="w-2 h-10 bg-yellow-500 rounded-full"></div>
                    <h2 className="text-5xl font-oswald font-black text-white italic uppercase tracking-tighter">Rotas <span className="text-yellow-500">Icônicas</span></h2>
                  </header>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {iconicRoutes.map(route => (
                      <div key={route.id} className="bg-zinc-900/50 rounded-[3rem] overflow-hidden border border-zinc-800 hover:border-yellow-500/30 transition-all group shadow-2xl flex flex-col relative">
                        {route.isOfficial && (
                          <div className="absolute top-6 right-6 z-20 transform rotate-12 drop-shadow-2xl">
                            <div className="border-[5px] border-yellow-500 text-yellow-500 px-6 py-2 rounded-2xl font-oswald font-black uppercase text-[12px] bg-black/95">OFICIAL L.A.M.A.</div>
                          </div>
                        )}
                        <div className="h-64 relative overflow-hidden">
                          <img src={route.thumbnail} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80" alt={route.title} />
                        </div>
                        <div className="p-10 flex-1 flex flex-col space-y-6">
                          <div className="flex items-start justify-between gap-4">
                            <h3 className="text-3xl font-oswald font-black text-white uppercase italic tracking-tighter flex-1">{route.title}</h3>
                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border shrink-0 ${getDifficultyStyles(route.difficulty)}`}>{route.difficulty}</span>
                          </div>
                          <p className="text-zinc-500 text-sm leading-relaxed">{route.description}</p>
                          <div className="flex items-center gap-2 text-zinc-600 font-bold text-[10px] uppercase tracking-widest">
                            <Navigation size={12} className="text-yellow-500" />
                            <span>Extensão: {route.distance}</span>
                          </div>
                          <button onClick={() => fetchInsights(route)} className="w-full bg-zinc-800 hover:bg-yellow-500 hover:text-black text-white py-5 rounded-2xl font-black uppercase text-[10px] transition-all flex items-center justify-center gap-3"><Zap size={16} /> Briefing</button>
                        </div>
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
                      <h3 className="text-3xl font-oswald font-black text-white uppercase italic tracking-tighter flex items-center gap-3"><Shield className="text-yellow-500" size={28} /> Ponto de <span className="text-yellow-500">Encontro</span></h3>
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
                            <th className="pb-4 px-4 text-[10px] font-black uppercase tracking-widest text-zinc-600">Data de Nascimento</th>
                            <th className="pb-4 px-4 text-[10px] font-black uppercase tracking-widest text-zinc-600">Moto</th>
                            <th className="pb-4 px-4 text-[10px] font-black uppercase tracking-widest text-zinc-600">Associação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900/50">
                          {getSortedMembersByBirthMonth().map((member) => (
                            <tr key={member.id} className="group hover:bg-zinc-900/30 transition-all">
                              <td className="py-6 px-4"><div className="flex items-center gap-4"><img src={member.avatar} className="w-12 h-12 rounded-2xl border border-zinc-800 object-cover" /><span className="font-bold text-white uppercase text-sm">{member.name}</span></div></td>
                              <td className="py-6 px-4"><span className="text-yellow-500 font-mono text-sm font-black italic">{formatDate(member.birthDate)}</span></td>
                              <td className="py-6 px-4"><span className="font-bold text-zinc-400 text-sm italic">{member.bikeModel || 'N/A'}</span></td>
                              <td className="py-6 px-4"><span className="bg-zinc-900 text-zinc-400 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-zinc-800">{member.associationType || 'ASSOCIADO'}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Botão de acesso exclusivo para as rotas dos membros */}
                    <div className="mt-12 flex justify-center border-t border-zinc-900 pt-12">
                      <button onClick={() => setView('member-routes')} className="bg-yellow-500 hover:bg-yellow-600 text-black px-12 py-5 rounded-2xl font-black uppercase flex items-center gap-4 transition-all shadow-xl shadow-yellow-500/10 active:scale-95">
                        <Map size={20} /> Ver Rotas de Todos os Membros
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {currentView === 'member-routes' && isAdmin && (
                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                  <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-2 h-10 bg-yellow-500 rounded-full"></div>
                      <h2 className="text-4xl font-oswald font-black text-white italic uppercase tracking-tighter">Rotas dos <span className="text-yellow-500">Membros</span></h2>
                    </div>
                    <button onClick={() => setView('admin')} className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 text-zinc-400 px-6 py-3 rounded-xl font-black uppercase text-[10px] hover:text-white transition-all shadow-xl">
                      <ArrowLeft size={16} /> Voltar ao Painel
                    </button>
                  </header>
                  
                  <div className="space-y-20">
                    {membersWithRoutes.length > 0 ? (
                      membersWithRoutes.map(member => (
                        <div key={member.id} className="space-y-8">
                          <div className="flex items-center gap-5 border-b border-zinc-900 pb-6 relative">
                            <div className="w-1.5 h-10 bg-yellow-500/20 absolute -left-4 rounded-full"></div>
                            <img src={member.avatar} className="w-16 h-16 rounded-[1.5rem] border-2 border-zinc-800 object-cover shadow-2xl" />
                            <div>
                              <h3 className="text-2xl font-oswald font-black text-white uppercase italic tracking-tighter">{member.name}</h3>
                              <span className="text-[10px] text-yellow-500/50 font-black uppercase tracking-widest">{member.memberRoutes.length} MISSÕES REGISTRADAS</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {member.memberRoutes.map(route => (
                              <div key={route.id} className="bg-zinc-950 rounded-[2.5rem] border border-zinc-900 overflow-hidden shadow-2xl group flex flex-col relative cursor-pointer" onClick={() => setSelectedRoute(route)}>
                                {isAdmin && (
                                  <button onClick={(e) => { e.stopPropagation(); handleDeleteRoute(route.id); }} className="absolute top-4 right-4 z-[50] p-3 bg-red-600 text-white rounded-full backdrop-blur-md opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all shadow-xl active:scale-95"><Trash2 size={16} /></button>
                                )}
                                <MapView points={route.points} className="h-48 grayscale group-hover:grayscale-0 transition-all duration-500" />
                                <div className="p-8">
                                  <h3 className="text-2xl font-oswald font-black text-white uppercase italic truncate">{route.title}</h3>
                                  <div className="flex items-center justify-between mt-4 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                                    <span>{route.distance} Rodados</span>
                                    <span className="flex items-center gap-1 text-yellow-500 italic">VER TRAJETO <ChevronRight size={12}/></span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-24 text-center">
                        <Map size={48} className="mx-auto text-zinc-800 mb-4 opacity-20" />
                        <p className="text-zinc-600 font-oswald font-black uppercase tracking-widest italic">Nenhuma rota gravada pelos membros ainda.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {currentView === 'gallery' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
                  <header><h2 className="text-4xl font-oswald font-bold uppercase text-white italic">Nossa <span className="text-yellow-500">Galeria</span></h2></header>
                  <div className="relative bg-zinc-900 rounded-[3rem] border border-zinc-800 overflow-hidden min-h-[500px] flex flex-col items-center justify-center p-12 text-center shadow-2xl">
                    <div className="absolute inset-0 opacity-10 grayscale"><img src="https://images.unsplash.com/photo-1558981403-c5f91cbba527?q=80&w=2070&auto=format&fit=crop" className="w-full h-full object-cover" /></div>
                    <div className="relative z-10 space-y-8 max-w-xl">
                      <div className="bg-yellow-500/10 p-6 rounded-full w-fit mx-auto border border-yellow-500/20"><ImageIcon size={64} className="text-yellow-500" /></div>
                      <h3 className="text-3xl font-oswald font-bold text-white uppercase italic">Explore Nossa História no <span className="text-blue-500">Facebook</span></h3>
                      <p className="text-zinc-400 text-lg leading-relaxed">Mantemos nossa galeria oficial atualizada em nossa página do Facebook.</p>
                      <a href="https://www.facebook.com/lamaaparecidabr/photos" target="_blank" className="inline-flex items-center gap-3 bg-yellow-500 hover:bg-yellow-600 text-black px-10 py-5 rounded-2xl font-bold text-lg transition-all transform hover:scale-105 shadow-xl uppercase tracking-widest">ACESSAR GALERIA OFICIAL <ExternalLink size={20} /></a>
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

      {selectedRoute && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 md:p-10">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => setSelectedRoute(null)}></div>
          <div className="relative w-full max-w-6xl bg-zinc-950 rounded-[3rem] border border-zinc-900 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300">
            <div className="absolute top-6 right-6 z-50"><button onClick={() => setSelectedRoute(null)} className="bg-zinc-900 p-4 rounded-full text-zinc-400 hover:text-white border border-zinc-800 transition-all"><X size={24}/></button></div>
            <div className="flex flex-col lg:flex-row h-full max-h-[90vh]">
              <div className="flex-1 h-[40vh] lg:h-auto border-b lg:border-b-0 lg:border-r border-zinc-900"><MapView points={selectedRoute.points} className="h-full rounded-none" isInteractive /></div>
              <div className="w-full lg:w-96 p-10 flex flex-col justify-between space-y-8 overflow-y-auto">
                <div>
                  <header className="space-y-2 mb-8"><span className="text-yellow-500 font-black uppercase text-[10px] tracking-widest">Detalhes da Missão</span><h3 className="text-4xl font-oswald font-black text-white uppercase italic leading-none">{selectedRoute.title}</h3></header>
                  <div className="space-y-6">
                    <div className="flex justify-between items-end border-b border-zinc-900 pb-4"><span className="text-[10px] font-black uppercase text-zinc-600">Distância Total</span><span className="text-2xl font-oswald font-black text-white italic">{selectedRoute.distance}</span></div>
                    <div className="flex justify-between items-end border-b border-zinc-900 pb-4"><span className="text-[10px] font-black uppercase text-zinc-600">Dificuldade</span><span className="text-2xl font-oswald font-black text-red-600 italic uppercase">{selectedRoute.difficulty}</span></div>
                    <p className="text-zinc-500 text-sm leading-relaxed italic">"{selectedRoute.description}"</p>
                  </div>
                </div>
                <button onClick={() => { handleDeleteRoute(selectedRoute.id); setSelectedRoute(null); }} className="w-full flex items-center justify-center gap-3 bg-red-600 text-white py-5 rounded-2xl font-black uppercase text-[10px] hover:bg-red-700 transition-all shadow-xl active:scale-95">EXCLUIR REGISTRO <Trash2 size={16}/></button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;