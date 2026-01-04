
import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { RouteTracker } from './components/RouteTracker';
import { MapView } from './components/MapView';
import { View, User, Route } from './types';
import { Bike, Compass, Users, Calendar, Trophy, Image as ImageIcon, ExternalLink, Shield, Gauge, ChevronRight, Zap, Map, Volume2, VolumeX, Maximize2, MapPin, Navigation, Lock, Radio, Award, Star, Loader2, Edit2, Save, X, Camera, UserPlus, Key, Trash2, CheckCircle2, Cake } from 'lucide-react';
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
      setIsAuthenticated(false);
      setUser(null);
      setView('home');
      localStorage.clear();
    } catch (err) {
      console.error("Erro no logout:", err);
    } finally {
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
      if (file.size > 800 * 1024) { 
        alert("A imagem deve ser menor que 800KB.");
        return;
      }
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

    try {
      // 1. Atualizar tabela de perfis (mais seguro para dados pesados como base64 no Vercel/Edge)
      const { error: dbError } = await supabase
        .from('profiles')
        .update({
          name: editForm.name,
          bike_model: editForm.bikeModel,
          avatar_url: editForm.avatar,
          birth_date: editForm.birthDate
        })
        .eq('id', user.id);

      if (dbError) throw dbError;

      // 2. Atualizar Auth apenas com textos curtos (evita o erro "Failed to fetch" causado por cabeçalhos gigantes)
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          name: editForm.name,
          bikeModel: editForm.bikeModel
          // NÃO enviamos o avatar aqui para não estourar o limite de payload do Vercel no Auth
        }
      });

      if (authError) throw authError;

      setIsEditingProfile(false);
      alert("Perfil salvo com sucesso!");
      setUser({ ...user, ...editForm });
    } catch (error: any) {
      console.error("Erro ao salvar perfil:", error);
      alert("Erro: Não foi possível salvar. Tente uma imagem de perfil menor.");
    } finally {
      setIsUpdating(false);
    }
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
          <img src={LAMA_LOGO_URL} alt="Logo" className="w-24 h-24 mx-auto mb-6 object-contain" onError={(e) => { (e.target as HTMLImageElement).src = 'https://raw.githubusercontent.com/lamaaparecidabr-lab/LAMA-APARECIDA/main/components/logo.jpg'; }} />
          <h2 className="text-3xl font-oswald text-white font-black uppercase italic tracking-tighter">Sede Virtual</h2>
          <p className="text-zinc-500 text-[10px] mt-2 uppercase tracking-widest font-black">Acesso Exclusivo para Membros</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            required
            className="w-full bg-black/50 border border-zinc-800 text-white px-6 py-4 rounded-2xl outline-none placeholder:text-zinc-800 focus:border-yellow-500/50 transition-all"
            placeholder="Email"
            value={loginForm.email}
            onChange={e => setLoginForm({...loginForm, email: e.target.value})}
          />
          <input
            type="password"
            required
            className="w-full bg-black/50 border border-zinc-800 text-white px-6 py-4 rounded-2xl outline-none placeholder:text-zinc-800 focus:border-yellow-500/50 transition-all"
            placeholder="Senha"
            value={loginForm.password}
            onChange={e => setLoginForm({...loginForm, password: e.target.value})}
          />
          <button type="submit" disabled={isLoading} className="w-full bg-yellow-500 hover:bg-yellow-400 text-black py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3">
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
                    <img src={LAMA_LOGO_URL} alt="Logo" className="w-20 h-20 md:w-28 md:h-28 object-contain" onError={(e) => { (e.target as HTMLImageElement).src = 'https://raw.githubusercontent.com/lamaaparecidabr-lab/LAMA-APARECIDA/main/components/logo.jpg'; }} />
                    <div>
                      <span className="text-yellow-500 font-black uppercase tracking-widest text-xs md:text-lg">LATIN AMERICAN MOTORCYCLE ASSOCIATION</span>
                      <h1 className="text-3xl md:text-5xl font-oswald font-black text-white uppercase italic mt-1 md:mt-2">Capítulo <span className="text-yellow-500">Aparecida</span></h1>
                    </div>
                  </div>
                </header>

                <div className="space-y-6">
                  <h3 className="text-2xl md:text-3xl font-oswald font-black text-white uppercase italic tracking-widest">Respeito <span className="text-yellow-500">& Liberdade</span></h3>
                  
                  <div ref={videoContainerRef} className="relative rounded-3xl md:rounded-[4rem] overflow-hidden bg-zinc-900 border border-zinc-800 aspect-[16/9] md:aspect-[21/9] shadow-3xl">
                    <iframe 
                      ref={videoRef}
                      className="w-full h-full object-cover opacity-60 pointer-events-none"
                      src={`https://www.youtube.com/embed/${YOUTUBE_ID}?autoplay=1&mute=1&loop=1&playlist=${YOUTUBE_ID}&controls=0&enablejsapi=1`} 
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
                     <button onClick={toggleFullScreen} className="bg-zinc-900/80 backdrop-blur-md text-white px-1 md:px-10 py-3 md:py-5 rounded-xl md:rounded-[1.8rem] font-black uppercase text-[7px] md:text-[11px] hover:bg-yellow-500 hover:text-black transition-all flex flex-col md:flex-row items-center justify-center gap-1 md:gap-3 shadow-xl">
                       AMPLIAR <Maximize2 size={12} />
                     </button>
                  </div>
                </div>
              </div>
            )}

            {currentView === 'clubhouse' && (
              <div className="space-y-12">
                <header><h2 className="text-5xl font-oswald font-black text-white italic uppercase">Sede</h2></header>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="bg-zinc-950 p-8 rounded-[3rem] border border-zinc-900 shadow-3xl flex flex-col justify-center">
                    <p className="text-zinc-400 text-lg mb-10">{CLUBHOUSE_ADDRESS}</p>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CLUBHOUSE_MARK_NAME)}`} target="_blank" className="flex-1 bg-white text-black py-4 rounded-2xl font-black uppercase text-center hover:bg-yellow-500 transition-all">Maps</a>
                      <a href={`https://waze.com/ul?q=${encodeURIComponent(CLUBHOUSE_MARK_NAME)}&navigate=yes`} target="_blank" className="flex-1 bg-[#33ccff] text-black py-4 rounded-2xl font-black uppercase text-center hover:bg-yellow-400 transition-all">Waze</a>
                    </div>
                  </div>
                  <MapView points={[{...CLUBHOUSE_COORDS, timestamp: Date.now()}]} className="h-[400px]" isInteractive />
                </div>
              </div>
            )}

            {currentView === 'explorer' && (
              <div className="space-y-12">
                <header><h2 className="text-4xl font-oswald font-black text-white italic uppercase">Icônicas</h2></header>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {iconicRoutes.map(route => (
                    <div key={route.id} className="bg-zinc-950 rounded-[2.5rem] border border-zinc-900 overflow-hidden shadow-2xl group flex flex-col">
                      <img src={route.thumbnail} className="h-64 w-full object-cover group-hover:scale-105 transition-all duration-700" alt={route.title} />
                      <div className="p-10 flex-1 flex flex-col">
                        <h3 className="text-3xl font-oswald font-black text-white uppercase italic mb-4">{route.title}</h3>
                        <p className="text-zinc-500 text-sm mb-8 flex-1">{route.description}</p>
                        <button onClick={() => fetchInsights(route)} className="w-full bg-zinc-900 border border-zinc-800 text-yellow-500 py-4 rounded-2xl font-black uppercase hover:bg-yellow-500 hover:text-black transition-all">Briefing IA</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentView === 'gallery' && (
              <div className="space-y-8 h-full">
                <header><h2 className="text-4xl font-oswald font-bold uppercase text-white italic">Galeria</h2></header>
                <div className="relative bg-zinc-900 rounded-[3rem] border border-zinc-800 flex flex-col items-center justify-center p-12 text-center shadow-2xl min-h-[500px]">
                  <h3 className="text-3xl font-oswald font-bold text-white uppercase italic mb-8">Facebook Oficial</h3>
                  <p className="text-zinc-400 mb-10 max-w-xl">Acompanhe todos os nossos registros e eventos em tempo real na nossa página.</p>
                  <a href="https://www.facebook.com/lamaaparecidabr/photos" target="_blank" className="bg-yellow-500 text-black px-10 py-5 rounded-2xl font-bold uppercase tracking-widest hover:scale-105 transition-all shadow-xl">Acessar Galeria</a>
                </div>
              </div>
            )}

            {currentView === 'profile' && (
              <div className="max-w-5xl mx-auto space-y-10">
                <header className="flex items-center justify-between">
                  <h2 className="text-4xl font-oswald font-black text-white italic uppercase">Perfil</h2>
                  <div className="flex gap-4">
                    <button onClick={() => setIsChangingPassword(!isChangingPassword)} className="px-6 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-widest">Senha</button>
                    <button onClick={() => setIsEditingProfile(!isEditingProfile)} className="px-6 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-widest">Editar</button>
                  </div>
                </header>

                <div className="relative bg-zinc-950 p-8 md:p-16 rounded-[3rem] border border-zinc-900 shadow-3xl">
                  {isEditingProfile ? (
                    <form onSubmit={handleUpdateProfile} className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <input type="text" required className="w-full bg-zinc-900 border border-zinc-800 text-white px-6 py-4 rounded-2xl" placeholder="Nome" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                        <input type="text" className="w-full bg-zinc-900 border border-zinc-800 text-white px-6 py-4 rounded-2xl" placeholder="Motocicleta" value={editForm.bikeModel} onChange={e => setEditForm({...editForm, bikeModel: e.target.value})} />
                        <input type="date" className="w-full bg-zinc-900 border border-zinc-800 text-white px-6 py-4 rounded-2xl" value={editForm.birthDate} onChange={e => setEditForm({...editForm, birthDate: e.target.value})} />
                        <div className="flex items-center gap-4">
                           <label className="flex-1 cursor-pointer bg-zinc-900 border border-zinc-800 border-dashed text-zinc-500 px-6 py-4 rounded-2xl text-center">
                             Foto de Perfil <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                           </label>
                           {editForm.avatar && <img src={editForm.avatar} alt="Preview" className="w-14 h-14 rounded-xl object-cover border border-zinc-800" />}
                        </div>
                      </div>
                      <button type="submit" disabled={isUpdating} className="w-full bg-yellow-500 text-black py-4 rounded-2xl font-black uppercase flex items-center justify-center gap-2">
                        {isUpdating ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> Salvar Perfil</>}
                      </button>
                    </form>
                  ) : isChangingPassword ? (
                    <form onSubmit={handleChangePassword} className="space-y-8">
                       <input type="password" required className="w-full bg-zinc-900 border border-zinc-800 text-white px-6 py-4 rounded-2xl" placeholder="Nova Senha" value={passwordForm.newPassword} onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})} />
                       <input type="password" required className="w-full bg-zinc-900 border border-zinc-800 text-white px-6 py-4 rounded-2xl" placeholder="Confirmar" value={passwordForm.confirmPassword} onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} />
                       <button type="submit" disabled={isUpdating} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black uppercase">Alterar Senha</button>
                    </form>
                  ) : (
                    <div className="flex flex-col md:flex-row items-center gap-10">
                      <img src={user?.avatar} alt="Avatar" className="w-48 h-48 md:w-64 md:h-64 rounded-[2.5rem] object-cover border-4 border-zinc-950" />
                      <div className="text-center md:text-left">
                        <h2 className="text-4xl md:text-7xl font-oswald font-black text-white uppercase italic tracking-tighter mb-4">{user?.name}</h2>
                        <p className="text-zinc-500 italic mb-6">{user?.email}</p>
                        <div className="flex gap-4 justify-center md:justify-start">
                          <div className="bg-zinc-900 p-4 rounded-2xl flex items-center gap-3">
                            <Bike size={20} className="text-yellow-500" />
                            <span className="font-bold text-white uppercase italic">{user?.bikeModel}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentView === 'admin' && user?.role === 'admin' && (
              <div className="max-w-4xl mx-auto space-y-12">
                <header><h2 className="text-4xl font-oswald font-black text-white italic uppercase tracking-tighter">Admin</h2></header>
                <div className="bg-zinc-950 p-8 rounded-[3rem] border border-zinc-900">
                  <h3 className="text-2xl font-oswald font-black text-white uppercase mb-8 flex items-center gap-3">Recrutar Membro</h3>
                  <form onSubmit={handleRegisterNewMember} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <input type="text" required className="w-full bg-zinc-900 border border-zinc-800 text-white px-6 py-4 rounded-2xl" placeholder="Nome" value={newMemberForm.name} onChange={e => setNewMemberForm({...newMemberForm, name: e.target.value})} />
                    <input type="email" required className="w-full bg-zinc-900 border border-zinc-800 text-white px-6 py-4 rounded-2xl" placeholder="Email" value={newMemberForm.email} onChange={e => setNewMemberForm({...newMemberForm, email: e.target.value})} />
                    <input type="text" className="w-full bg-zinc-900 border border-zinc-800 text-white px-6 py-4 rounded-2xl" placeholder="Motocicleta" value={newMemberForm.bikeModel} onChange={e => setNewMemberForm({...newMemberForm, bikeModel: e.target.value})} />
                    <input type="text" required className="w-full bg-zinc-900 border border-zinc-800 text-white px-6 py-4 rounded-2xl" placeholder="Senha" value={newMemberForm.password} onChange={e => setNewMemberForm({...newMemberForm, password: e.target.value})} />
                    <button type="submit" disabled={isUpdating} className="md:col-span-2 bg-yellow-500 text-black py-5 rounded-2xl font-black uppercase">Salvar</button>
                  </form>
                </div>
              </div>
            )}

            {currentView === 'tracking' && <RouteTracker onSave={handleSaveRoute} />}
            
            {currentView === 'my-routes' && (
              <div className="space-y-12">
                <header><h2 className="text-4xl font-oswald font-black text-white italic uppercase tracking-tighter">Mural</h2></header>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {routes.length > 0 ? routes.map(route => (
                    <div key={route.id} className="bg-zinc-950 rounded-[2.5rem] border border-zinc-900 overflow-hidden shadow-2xl group flex flex-col relative">
                      <MapView points={route.points} className="h-48 border-none grayscale group-hover:grayscale-0 transition-all" />
                      {(route.user_id === user?.id || user?.role === 'admin') && (
                        <button onClick={() => handleDeleteRoute(route.id)} className="absolute top-4 right-4 p-3 bg-black/60 backdrop-blur-md rounded-xl text-zinc-500 hover:text-red-500 transition-all z-10"><Trash2 size={16} /></button>
                      )}
                      <div className="p-8">
                         <h3 className="text-2xl font-oswald font-black text-white uppercase italic truncate">{route.title}</h3>
                         <div className="flex items-center justify-between mt-4">
                           <p className="text-zinc-500 text-[10px] font-bold uppercase">{route.distance}</p>
                           <span className={`px-2 py-1 rounded-md text-[9px] uppercase italic border ${getDifficultyColor(route.difficulty)}`}>{route.difficulty}</span>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="col-span-full py-32 text-center text-zinc-500 uppercase italic tracking-widest">Mural vazio...</div>
                  )}
                </div>
              </div>
            )}
            
          </div>
        )}
      </main>

      {insights && insights !== 'carregando' && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in">
          <div className="bg-zinc-950 border border-zinc-900 p-10 rounded-[3rem] max-w-2xl w-full relative shadow-3xl">
            <button onClick={() => setInsights(null)} className="absolute top-6 right-6 text-zinc-600 hover:text-white">✕</button>
            <h3 className="text-2xl font-oswald font-black text-white uppercase italic mb-10">Briefing IA</h3>
            <div className="space-y-6 text-zinc-300">
              {insights.safetyTips.map((tip: string, i: number) => (
                <div key={i} className="p-4 bg-zinc-900/40 rounded-xl border border-zinc-800/50 flex gap-4">
                  <span className="text-yellow-500 font-black italic">0{i+1}</span>
                  <p>{tip}</p>
                </div>
              ))}
              <div className="p-6 bg-yellow-500/5 rounded-2xl border border-yellow-500/10 italic text-zinc-400 text-center">"{insights.scenicHighlight}"</div>
            </div>
          </div>
        </div>
      )}

      {insights === 'carregando' && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <Loader2 className="animate-spin text-yellow-500" size={40} />
        </div>
      )}
    </div>
  );
};

export default App;
