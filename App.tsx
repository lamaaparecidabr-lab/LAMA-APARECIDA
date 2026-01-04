
import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { RouteTracker } from './components/RouteTracker';
import { MapView } from './components/MapView';
import { View, User, Route } from './types';
import { Bike, Compass, Users, Calendar, Trophy, Image as ImageIcon, ExternalLink, Shield, Gauge, ChevronRight, Zap, Map, Volume2, VolumeX, Maximize2, MapPin, Navigation, Lock, Radio, Award, Star, Loader2, Edit2, Save, X, Camera, UserPlus, Key, Trash2, CheckCircle2, Cake } from 'lucide-react';
import { getRouteInsights } from './services/geminiService';
import { supabase } from './services/supabaseClient';

// URL robusta do GitHub (Raw) para garantir carregamento em produção
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
    description: 'Trajeto clássico entre Goiânia e Caldas Novas via BR-153 e GO-217.',
    distance: '170 km',
    difficulty: 'Fácil',
    points: [],
    status: 'planejada',
    thumbnail: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=800&auto=format&fit=crop',
    isOfficial: false
  }
];

const SUPERUSER_EMAIL = 'lama.aparecidabr@gmail.com';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setView] = useState<View>('home');
  const [user, setUser] = useState<User | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [newMemberForm, setNewMemberForm] = useState({ email: '', password: '', name: '', bikeModel: '' });
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [editForm, setEditForm] = useState({ name: '', bikeModel: '', avatar: '', birthDate: '' });
  const [insights, setInsights] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLIFrameElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        syncUserData(session.user);
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchRoutes();
    }
  }, [isAuthenticated]);

  const syncUserData = async (supabaseUser: any, retryCount = 0) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, name, bike_model, avatar_url, birth_date')
        .eq('id', supabaseUser.id)
        .single();

      if (error && retryCount < 3) {
        setTimeout(() => syncUserData(supabaseUser, retryCount + 1), 500);
        return;
      }

      const userData: User = {
        id: supabaseUser.id,
        name: profile?.name || supabaseUser.user_metadata?.name || 'Membro L.A.M.A.',
        email: supabaseUser.email || '',
        bikeModel: profile?.bike_model || supabaseUser.user_metadata?.bikeModel || 'Não informado',
        avatar: profile?.avatar_url || supabaseUser.user_metadata?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${supabaseUser.id}`,
        birthDate: profile?.birth_date || '',
        role: (profile?.role as 'admin' | 'member') || (supabaseUser.email === SUPERUSER_EMAIL ? 'admin' : 'member')
      };
      
      setUser(userData);
      setEditForm({
        name: userData.name,
        bikeModel: userData.bikeModel || '',
        avatar: userData.avatar || '',
        birthDate: userData.birthDate || ''
      });
      setIsAuthenticated(true);
    } catch (err) {
      console.error("Erro na sincronização:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await syncUserData(session.user);
      } else {
        setIsLoading(false);
      }
    } catch (e) {
      setIsLoading(false);
    }
  };

  const fetchRoutes = async () => {
    const { data, error } = await supabase
      .from('routes')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const mappedRoutes = data.map(r => ({
        ...r,
        isOfficial: r.is_official
      }));
      setRoutes(mappedRoutes);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginForm.email.trim(),
      password: loginForm.password,
    });

    if (error) {
      alert("Radar falhou: " + error.message);
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      // O listener onAuthStateChange cuidará de setar Authenticated para false
    } catch (err) {
      console.error("Erro no logout:", err);
      // Fallback
      setIsAuthenticated(false);
      setUser(null);
      setIsLoading(false);
    }
  };

  const handleRegisterNewMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.role !== 'admin') {
      alert("Acesso Negado.");
      return;
    }
    setIsUpdating(true);
    const { error } = await supabase.auth.signUp({
      email: newMemberForm.email.trim(),
      password: newMemberForm.password,
      options: {
        data: {
          name: newMemberForm.name,
          bikeModel: newMemberForm.bikeModel,
          role: 'member'
        }
      }
    });

    if (error) {
      alert("Erro no recrutamento: " + error.message);
    } else {
      alert(`Novo membro recrutado!`);
      setNewMemberForm({ email: '', password: '', name: '', bikeModel: '' });
    }
    setIsUpdating(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsUpdating(true);
    const { error: dbError } = await supabase
      .from('profiles')
      .update({
        name: editForm.name,
        bike_model: editForm.bikeModel,
        avatar_url: editForm.avatar,
        birth_date: editForm.birthDate
      })
      .eq('id', user.id);

    if (dbError) {
      alert("Falha na telemetria.");
    } else {
      setIsEditingProfile(false);
      alert("Perfil atualizado!");
      setUser({ ...user, ...editForm });
    }
    setIsUpdating(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert("As senhas não batem!");
      return;
    }
    setIsUpdating(true);
    const { error } = await supabase.auth.updateUser({
      password: passwordForm.newPassword
    });

    if (error) {
      alert("Erro: " + error.message);
    } else {
      alert("Senha alterada!");
      setIsChangingPassword(false);
      setPasswordForm({ newPassword: '', confirmPassword: '' });
    }
    setIsUpdating(false);
  };

  const handleSaveRoute = async (newRoute: Route) => {
    const { error } = await supabase
      .from('routes')
      .insert([{
        title: newRoute.title,
        description: newRoute.description,
        distance: newRoute.distance,
        difficulty: newRoute.difficulty,
        points: newRoute.points,
        status: newRoute.status,
        thumbnail: newRoute.thumbnail,
        is_official: user?.role === 'admin',
        user_id: user?.id
      }]);

    if (error) {
      alert("Erro ao salvar.");
    } else {
      fetchRoutes();
      alert("Mural atualizado!");
    }
  };

  const handleDeleteRoute = async (routeId: string) => {
    if (!confirm("Deseja apagar?")) return;
    const { error } = await supabase.from('routes').delete().eq('id', routeId);
    if (!error) setRoutes(routes.filter(r => r.id !== routeId));
  };

  const fetchInsights = async (route: Route) => {
    setInsights('carregando');
    const result = await getRouteInsights(route.title, "Brasil");
    setInsights(result);
  };

  const toggleMute = () => {
    if (videoRef.current?.contentWindow) {
      const command = isMuted ? 'unMute' : 'mute';
      videoRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: command, args: [] }), '*');
      setIsMuted(!isMuted);
    }
  };

  const toggleFullScreen = () => {
    if (videoContainerRef.current) {
      if (document.fullscreenElement) document.exitFullscreen();
      else videoContainerRef.current.requestFullscreen();
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Fácil': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'Moderada': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'Difícil': return 'bg-orange-600/10 text-orange-600 border-orange-600/20';
      case 'Lendária': return 'bg-red-600/10 text-red-600 border-red-600/20';
      default: return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
    }
  };

  const publicViews = ['home', 'clubhouse'];
  const needsAuth = !isAuthenticated && !publicViews.includes(currentView);

  const renderLogin = () => (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900/95 border border-zinc-800 p-8 md:p-12 rounded-[2.5rem] shadow-2xl backdrop-blur-xl">
        <div className="text-center mb-10">
          <img src={LAMA_LOGO_URL} alt="Logo" className="w-24 h-24 mx-auto mb-6 object-contain" />
          <h2 className="text-3xl font-oswald text-white font-black uppercase italic tracking-tighter">Sede Virtual</h2>
          <p className="text-zinc-500 text-[10px] mt-2 uppercase tracking-widest font-black">Acesso Exclusivo para Membros</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 ml-4">Email</label>
            <input
              type="email"
              required
              className="w-full bg-black/50 border border-zinc-800 text-white px-6 py-4 rounded-2xl outline-none placeholder:text-zinc-800 focus:border-yellow-500/50 transition-all"
              placeholder="membro@lama.com"
              value={loginForm.email}
              onChange={e => setLoginForm({...loginForm, email: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 ml-4">Senha</label>
            <input
              type="password"
              required
              className="w-full bg-black/50 border border-zinc-800 text-white px-6 py-4 rounded-2xl outline-none placeholder:text-zinc-800 focus:border-yellow-500/50 transition-all"
              placeholder="••••••••"
              value={loginForm.password}
              onChange={e => setLoginForm({...loginForm, password: e.target.value})}
            />
          </div>
          <button type="submit" disabled={isLoading} className="w-full bg-yellow-500 hover:bg-yellow-400 text-black py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3">
            {isLoading ? <Loader2 className="animate-spin" size={16} /> : <>Entrar na Sede <Zap size={16} /></>}
          </button>
        </form>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6">
        <Loader2 className="text-yellow-500 animate-spin" size={48} />
        <p className="text-yellow-500 font-oswald font-bold uppercase tracking-widest animate-pulse italic">Validando Radar...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#050505] text-zinc-300">
      <Sidebar user={user} currentView={currentView} setView={setView} onLogout={handleLogout} />
      
      <main className="flex-1 p-5 md:p-12 pb-32 md:pb-12 max-w-[1400px] mx-auto w-full overflow-y-auto custom-scrollbar">
        {needsAuth ? renderLogin() : (
          <div className="animate-in fade-in duration-700">
            
            {currentView === 'home' && (
              <div className="space-y-6 md:space-y-8">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-900 pb-12">
                  <div className="flex items-center gap-6 md:gap-10">
                    <img src={LAMA_LOGO_URL} alt="Logo" className="w-20 h-20 md:w-28 md:h-28 object-contain" />
                    <div>
                      <span className="text-yellow-500 font-black uppercase tracking-widest text-xs md:text-lg">LATIN AMERICAN MOTORCYCLE ASSOCIATION</span>
                      <h1 className="text-3xl md:text-5xl font-oswald font-black text-white uppercase italic mt-1 md:mt-2">Capítulo <span className="text-yellow-500">Aparecida</span></h1>
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
                      src={`https://www.youtube.com/embed/${YOUTUBE_ID}?autoplay=1&mute=1&loop=1&playlist=${YOUTUBE_ID}&controls=0&enablejsapi=1`} 
                      frameBorder="0"
                    ></iframe>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 md:flex md:flex-wrap md:gap-4 items-center justify-start">
                     <button onClick={() => setView('clubhouse')} className="bg-white text-black px-1 md:px-12 py-3 md:py-5 rounded-xl md:rounded-[1.8rem] font-black uppercase text-[7px] md:text-[11px] hover:bg-yellow-500 transition-all shadow-xl flex flex-col md:flex-row items-center justify-center gap-1 md:gap-3">
                       <span className="hidden md:inline">VISITAR</span> SEDE <MapPin size={12} className="md:w-[16px] md:h-[16px]" />
                     </button>
                     <button onClick={toggleMute} className="bg-zinc-900/80 backdrop-blur-md text-white px-1 md:px-10 py-3 md:py-5 rounded-xl md:rounded-[1.8rem] font-black uppercase text-[7px] md:text-[11px] hover:bg-yellow-500 hover:text-black transition-all shadow-xl flex flex-col md:flex-row items-center justify-center gap-1 md:gap-3">
                       VOLUME {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                     </button>
                     <button onClick={toggleFullScreen} className="bg-zinc-900/80 backdrop-blur-md text-white px-1 md:px-10 py-3 md:py-5 rounded-xl md:rounded-[1.8rem] font-black uppercase text-[7px] md:text-[11px] hover:bg-yellow-500 hover:text-black transition-all shadow-xl flex flex-col md:flex-row items-center justify-center gap-1 md:gap-3">
                       <span className="hidden md:inline">AMPLIAR</span> VÍDEO <Maximize2 size={12} />
                     </button>
                  </div>
                </div>
              </div>
            )}

            {currentView === 'admin' && user?.role === 'admin' && (
              <div className="max-w-4xl mx-auto space-y-12">
                <header className="flex items-center gap-4">
                  <div className="w-2 h-10 bg-yellow-500 rounded-full"></div>
                  <h2 className="text-4xl font-oswald font-black text-white italic uppercase tracking-tighter">Administração do <span className="text-yellow-500">Capítulo</span></h2>
                </header>
                <div className="bg-zinc-950 p-8 md:p-12 rounded-[3rem] border border-zinc-900 shadow-3xl">
                  <h3 className="text-2xl font-oswald font-black text-white uppercase mb-8 flex items-center gap-3"><UserPlus size={24} className="text-yellow-500" /> Cadastrar Novo Membro</h3>
                  <form onSubmit={handleRegisterNewMember} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 ml-4">Nome de Estrada</label>
                      <input type="text" required className="w-full bg-zinc-900 border border-zinc-800 text-white px-6 py-4 rounded-2xl outline-none focus:border-yellow-500/50" placeholder="Ex: Relâmpago" value={newMemberForm.name} onChange={e => setNewMemberForm({...newMemberForm, name: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 ml-4">Email Oficial</label>
                      <input type="email" required className="w-full bg-zinc-900 border border-zinc-800 text-white px-6 py-4 rounded-2xl outline-none focus:border-yellow-500/50" placeholder="membro@lama.com" value={newMemberForm.email} onChange={e => setNewMemberForm({...newMemberForm, email: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 ml-4">Motocicleta</label>
                      <input type="text" className="w-full bg-zinc-900 border border-zinc-800 text-white px-6 py-4 rounded-2xl outline-none focus:border-yellow-500/50" placeholder="Harley-Davidson Fat Boy" value={newMemberForm.bikeModel} onChange={e => setNewMemberForm({...newMemberForm, bikeModel: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 ml-4">Senha Provisória</label>
                      <input type="text" required className="w-full bg-zinc-900 border border-zinc-800 text-white px-6 py-4 rounded-2xl outline-none focus:border-yellow-500/50" placeholder="mudar123" value={newMemberForm.password} onChange={e => setNewMemberForm({...newMemberForm, password: e.target.value})} />
                    </div>
                    <button type="submit" disabled={isUpdating} className="md:col-span-2 bg-yellow-500 hover:bg-yellow-400 text-black py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 flex items-center justify-center gap-3">
                      {isUpdating ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> Confirmar Cadastro</>}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {currentView === 'profile' && (
              <div className="max-w-5xl mx-auto space-y-10">
                <header className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-10 bg-yellow-500 rounded-full"></div>
                    <h2 className="text-4xl font-oswald font-black text-white italic uppercase tracking-tighter">Área do <span className="text-yellow-500">Membro</span></h2>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => setIsChangingPassword(!isChangingPassword)} className="flex items-center gap-2 px-6 py-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-red-600 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest">
                      <Key size={14} /> Alterar Senha
                    </button>
                    <button onClick={() => setIsEditingProfile(!isEditingProfile)} className="flex items-center gap-2 px-6 py-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-yellow-500 hover:text-black transition-all text-[10px] font-black uppercase tracking-widest">
                      <Edit2 size={14} /> Editar Perfil
                    </button>
                  </div>
                </header>

                <div className="relative bg-zinc-950 p-8 md:p-16 rounded-[2rem] md:rounded-[3rem] border border-zinc-900 shadow-3xl overflow-hidden">
                  {isEditingProfile ? (
                    <form onSubmit={handleUpdateProfile} className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 ml-4">Nome de Estrada</label>
                          <input type="text" required className="w-full bg-zinc-900 border border-zinc-800 text-white px-6 py-4 rounded-2xl outline-none" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 ml-4">Máquina Principal</label>
                          <input type="text" className="w-full bg-zinc-900 border border-zinc-800 text-white px-6 py-4 rounded-2xl outline-none" value={editForm.bikeModel} onChange={e => setEditForm({...editForm, bikeModel: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 ml-4">Data de Nascimento</label>
                          <input type="date" className="w-full bg-zinc-900 border border-zinc-800 text-white px-6 py-4 rounded-2xl outline-none" value={editForm.birthDate} onChange={e => setEditForm({...editForm, birthDate: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 ml-4">Foto de Perfil (Max 2MB)</label>
                          <div className="flex items-center gap-4">
                            <label className="flex-1 cursor-pointer bg-zinc-900 border border-zinc-800 border-dashed hover:border-yellow-500/50 text-zinc-500 hover:text-white px-6 py-4 rounded-2xl transition-all flex items-center justify-center gap-3">
                              <Camera size={20} />
                              <span className="text-[10px] font-black uppercase tracking-widest">Selecionar Foto</span>
                              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                            </label>
                            {editForm.avatar && (
                              <img src={editForm.avatar} alt="Preview" className="w-14 h-14 rounded-xl object-cover border border-zinc-800" />
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end gap-4">
                        <button type="button" onClick={() => setIsEditingProfile(false)} className="px-8 py-4 text-zinc-500 font-black uppercase text-[10px] hover:text-white transition-all">Cancelar</button>
                        <button type="submit" disabled={isUpdating} className="bg-yellow-500 text-black px-12 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-yellow-400 transition-all">
                          {isUpdating ? <Loader2 className="animate-spin" size={14} /> : "Salvar Perfil"}
                        </button>
                      </div>
                    </form>
                  ) : isChangingPassword ? (
                    <form onSubmit={handleChangePassword} className="space-y-8">
                       <h3 className="text-2xl font-oswald font-black text-white uppercase italic">Redefinir <span className="text-red-600">Código de Acesso</span></h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 ml-4">Nova Senha</label>
                          <input type="password" required className="w-full bg-zinc-900 border border-zinc-800 text-white px-6 py-4 rounded-2xl outline-none" value={passwordForm.newPassword} onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 ml-4">Confirmar Nova Senha</label>
                          <input type="password" required className="w-full bg-zinc-900 border border-zinc-800 text-white px-6 py-4 rounded-2xl outline-none" value={passwordForm.confirmPassword} onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} />
                        </div>
                      </div>
                      <div className="flex justify-end gap-4">
                        <button type="button" onClick={() => setIsChangingPassword(false)} className="px-8 py-4 text-zinc-500 font-black uppercase text-[10px] hover:text-white transition-all">Voltar</button>
                        <button type="submit" disabled={isUpdating} className="bg-red-600 text-white px-12 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-red-500 transition-all">
                          {isUpdating ? <Loader2 className="animate-spin" size={14} /> : "Trocar Senha"}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-10 md:gap-16">
                      <div className="relative shrink-0">
                         <div className="absolute inset-0 bg-yellow-500/10 blur-3xl rounded-full"></div>
                         <img src={user?.avatar} alt="Avatar" className="relative w-48 h-48 md:w-64 md:h-64 rounded-[2rem] md:rounded-[2.5rem] border-4 border-zinc-950 object-cover shadow-2xl" />
                         {user?.role === 'admin' && (
                           <div className="absolute -top-4 -right-4 bg-yellow-500 text-black px-4 py-2 rounded-xl font-black text-[10px] uppercase italic shadow-xl z-30">
                             SUPERUSER
                           </div>
                         )}
                      </div>
                      <div className="flex-1 space-y-6 md:space-y-8 text-center md:text-left">
                        <div>
                          <span className="inline-block px-3 py-1 bg-yellow-500/10 text-yellow-500 text-[10px] font-black uppercase rounded-lg mb-4">
                            {user?.role === 'admin' ? 'Administrador L.A.M.A.' : 'Membro Capítulo Aparecida'}
                          </span>
                          <h2 className="text-4xl md:text-7xl font-oswald font-black text-white uppercase italic tracking-tighter leading-none mb-4">LAMA: <span className="text-yellow-500">{user?.name}</span></h2>
                          <p className="text-zinc-500 font-black uppercase tracking-widest text-[10px] md:text-xs italic">{user?.email}</p>
                        </div>
                        
                        <div className="flex flex-wrap gap-4 md:gap-6 justify-center md:justify-start">
                          <div className="bg-zinc-900/40 p-5 md:p-6 rounded-[1.5rem] border border-zinc-900/50 flex items-center gap-4 shadow-lg min-w-[200px]">
                            <div className="p-3 bg-yellow-500/10 rounded-xl"><Bike size={20} className="text-yellow-500" /></div>
                            <div className="text-left">
                                <span className="text-[8px] text-zinc-600 font-black uppercase tracking-widest">Máquina</span>
                                <p className="font-bold text-white text-base tracking-tight uppercase italic truncate">{user?.bikeModel}</p>
                            </div>
                          </div>

                          {user?.birthDate && (
                            <div className="bg-zinc-900/40 p-5 md:p-6 rounded-[1.5rem] border border-zinc-900/50 flex items-center gap-4 shadow-lg min-w-[200px]">
                              <div className="p-3 bg-red-600/10 rounded-xl"><Cake size={20} className="text-red-600" /></div>
                              <div className="text-left">
                                  <span className="text-[8px] text-zinc-600 font-black uppercase tracking-widest">Nascimento</span>
                                  <p className="font-bold text-white text-base tracking-tight uppercase italic">{new Date(user.birthDate).toLocaleDateString('pt-BR')}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
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
                    <div key={route.id} className="bg-zinc-950 rounded-[2.5rem] border border-zinc-900 overflow-hidden shadow-2xl group hover:border-yellow-500/30 transition-all flex flex-col relative">
                      <MapView points={route.points} className="h-48 border-none rounded-none grayscale group-hover:grayscale-0 transition-all" />
                      
                      {(route.user_id === user?.id || user?.role === 'admin') && (
                        <button 
                          onClick={() => handleDeleteRoute(route.id)}
                          className="absolute top-4 right-4 p-3 bg-black/60 backdrop-blur-md rounded-xl text-zinc-500 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 z-10"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}

                      <div className="p-8">
                        <div className="flex justify-between items-start mb-2">
                           <h3 className="text-2xl font-oswald font-black text-white uppercase italic tracking-tighter truncate max-w-[70%]">{route.title}</h3>
                           {route.isOfficial && <span className="bg-yellow-500 text-black text-[8px] px-2 py-0.5 rounded font-black uppercase italic">Oficial</span>}
                        </div>
                        <div className="flex items-center justify-between mt-4">
                           <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">{route.distance} Rodados</p>
                           <span className={`px-2 py-1 rounded-md font-black text-[9px] uppercase italic border ${getDifficultyColor(route.difficulty)}`}>{route.difficulty}</span>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="col-span-full py-32 text-center bg-zinc-900/10 rounded-[3rem] border border-dashed border-zinc-800 text-zinc-500 font-black uppercase italic tracking-widest">Aguardando telemetria...</div>
                  )}
                </div>
              </div>
            )}

            {currentView === 'clubhouse' && (
              <div className="space-y-12">
                <header className="flex items-center gap-6">
                   <div className="w-3 h-14 bg-yellow-500 rounded-full"></div>
                   <h2 className="text-5xl md:text-6xl font-oswald font-black text-white italic uppercase tracking-tighter">Casa <span className="text-yellow-500">Club</span></h2>
                </header>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16">
                  <div className="bg-zinc-950 p-8 md:p-16 rounded-[2rem] md:rounded-[3rem] border border-zinc-900 shadow-3xl">
                    <h3 className="text-3xl md:text-4xl font-oswald font-black text-white uppercase italic mb-8">Ponto de <span className="text-yellow-500">Encontro</span></h3>
                    <p className="text-zinc-400 text-lg md:text-xl font-light leading-relaxed mb-10">{CLUBHOUSE_ADDRESS}</p>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CLUBHOUSE_MARK_NAME)}`} target="_blank" rel="noopener noreferrer" className="flex-1 bg-white text-black px-6 md:px-12 py-4 md:py-6 rounded-2xl md:rounded-3xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-4 hover:bg-yellow-500 transition-all shadow-2xl">
                        Abrir no Maps <ExternalLink size={20} />
                      </a>
                      <a href={`https://waze.com/ul?q=${encodeURIComponent(CLUBHOUSE_MARK_NAME)}&navigate=yes`} target="_blank" rel="noopener noreferrer" className="flex-1 bg-[#33ccff] text-black px-6 md:px-12 py-4 md:py-6 rounded-2xl md:rounded-3xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-4 hover:bg-yellow-400 transition-all shadow-2xl">
                        Abrir no Waze <Navigation size={20} />
                      </a>
                    </div>
                  </div>
                  <MapView points={[{...CLUBHOUSE_COORDS, timestamp: Date.now()}]} className="h-[300px] md:h-[500px] shadow-3xl" isInteractive />
                </div>
              </div>
            )}

            {currentView === 'explorer' && (
              <div className="space-y-12">
                <header className="flex items-center gap-4">
                   <div className="w-2 h-10 bg-yellow-500 rounded-full"></div>
                   <h2 className="text-4xl font-oswald font-black text-white italic uppercase tracking-tighter">Rotas <span className="text-yellow-500">Icônicas</span></h2>
                </header>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {iconicRoutes.map(route => (
                    <div key={route.id} className="bg-zinc-950 rounded-[2.5rem] border border-zinc-900 overflow-hidden shadow-2xl flex flex-col group relative">
                      {route.isOfficial && (
                        <div className="absolute top-6 left-6 z-30 bg-yellow-500 text-black px-5 py-2.5 rounded-sm font-black text-[11px] uppercase italic shadow-[4px_4px_0px_rgba(0,0,0,0.4)] transform -rotate-12 border-4 border-black inline-block tracking-tighter">
                          OFICIAL L.A.M.A.
                        </div>
                      )}
                      <div className="h-64 overflow-hidden relative">
                         <img src={route.thumbnail} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={route.title} />
                         <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all"></div>
                      </div>
                      <div className="p-10 flex-1">
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="text-3xl font-oswald font-black text-white uppercase italic tracking-tighter">{route.title}</h3>
                        </div>
                        <p className="text-zinc-500 text-sm leading-relaxed mb-8">{route.description}</p>
                        <div className="flex items-center justify-between mb-8">
                           <span className="text-zinc-400 font-black uppercase text-[10px] tracking-widest">{route.distance}</span>
                           <span className={`px-3 py-1 rounded-lg font-black text-[10px] uppercase italic border ${getDifficultyColor(route.difficulty)}`}>
                             {route.difficulty}
                           </span>
                        </div>
                        <button onClick={() => fetchInsights(route)} className="w-full bg-zinc-900 border border-zinc-800 text-yellow-500 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-yellow-500 hover:text-black transition-all">Briefing IA</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentView === 'gallery' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
                <header>
                  <h2 className="text-4xl font-oswald font-bold uppercase text-white italic">Nossa <span className="text-yellow-500">Galeria</span></h2>
                  <p className="text-zinc-400 mt-2">Registros históricos e momentos da irmandade.</p>
                </header>

                <div className="relative bg-zinc-900 rounded-[2.5rem] md:rounded-[3rem] border border-zinc-800 overflow-hidden min-h-[400px] md:min-h-[500px] flex flex-col items-center justify-center p-8 md:p-12 text-center shadow-2xl">
                  <div className="absolute inset-0 opacity-10 grayscale">
                    <img src="https://images.unsplash.com/photo-1558981403-c5f91cbba527?q=80&w=2070&auto=format&fit=crop" alt="Background" className="w-full h-full object-cover" />
                  </div>
                  
                  <div className="relative z-10 space-y-6 md:space-y-8 max-w-xl">
                    <div className="bg-yellow-500/10 p-4 md:p-6 rounded-full w-fit mx-auto border border-yellow-500/20">
                      <ImageIcon size={48} className="text-yellow-500 md:w-[64px] md:h-[64px]" />
                    </div>
                    <h3 className="text-2xl md:text-3xl font-oswald font-bold text-white uppercase italic">Explore Nossa História no <span className="text-blue-500">Facebook</span></h3>
                    <p className="text-zinc-400 text-base md:text-lg leading-relaxed">
                      Mantemos nossa galeria oficial atualizada em nossa página do Facebook.
                    </p>
                    <a 
                      href="https://www.facebook.com/lamaaparecidabr/photos" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-3 bg-yellow-500 hover:bg-yellow-600 text-black px-8 md:px-10 py-4 md:py-5 rounded-2xl font-bold text-sm md:text-lg transition-all transform hover:scale-105 shadow-xl shadow-yellow-500/20 uppercase tracking-widest"
                    >
                      ACESSAR GALERIA <ExternalLink size={20} />
                    </a>
                  </div>
                </div>
              </div>
            )}
            
          </div>
        )}
        
      </main>

      {insights && insights !== 'carregando' && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="bg-zinc-950 border border-zinc-900 p-10 md:p-16 rounded-[2.5rem] md:rounded-[3rem] max-w-2xl w-full relative shadow-3xl">
            <button onClick={() => setInsights(null)} className="absolute top-6 right-6 md:top-8 md:right-8 text-zinc-600 hover:text-white font-black p-2 transition-colors">✕</button>
            <h3 className="text-2xl md:text-3xl font-oswald font-black text-white uppercase italic mb-8 md:mb-10">Briefing de <span className="text-yellow-500">Missão</span></h3>
            <div className="space-y-4 md:space-y-6">
              {insights.safetyTips.map((tip: string, i: number) => (
                <div key={i} className="p-4 md:p-6 bg-zinc-900/40 rounded-xl md:rounded-[1.5rem] border border-zinc-800/50 flex gap-4 text-zinc-300 shadow-sm">
                  <span className="text-yellow-500 font-black italic text-lg md:text-xl">0{i+1}</span>
                  <p className="font-light text-sm md:text-base">{tip}</p>
                </div>
              ))}
              <div className="p-6 md:p-8 bg-yellow-500/5 rounded-2xl md:rounded-[2.5rem] border border-yellow-500/10 italic text-zinc-400 text-center leading-relaxed text-sm md:text-base">"{insights.scenicHighlight}"</div>
            </div>
          </div>
        </div>
      )}

      {insights === 'carregando' && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-zinc-950 border border-zinc-900 p-8 md:p-10 rounded-2xl md:rounded-[2rem] flex flex-col items-center gap-4 shadow-2xl">
            <Loader2 className="animate-spin text-yellow-500" size={40} />
            <p className="text-white font-oswald font-black uppercase italic tracking-widest text-sm">Consultando Gemini...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
