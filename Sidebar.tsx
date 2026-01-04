
import React from 'react';
import { Home, Compass, Map, User, LogOut, Radio, Image as ImageIcon, MapPin } from 'lucide-react';
import { View } from '../types';

interface SidebarProps {
  currentView: View;
  setView: (view: View) => void;
  onLogout: () => void;
}

const LAMA_LOGO_URL = 'https://raw.githubusercontent.com/lamaaparecidabr-lab/LAMA-APARECIDA/411b86094f7e7539386b7340eb607162cae150b5/components/logo.jpg';

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, onLogout }) => {
  const menuItems = [
    { id: 'home', icon: Home, label: 'Início' },
    { id: 'clubhouse', icon: MapPin, label: 'Sede' },
    { id: 'explorer', icon: Compass, label: 'Icônicas' },
    { id: 'tracking', icon: Radio, label: 'Gravar' },
    { id: 'my-routes', icon: Map, label: 'Rotas' },
    { id: 'gallery', icon: ImageIcon, label: 'Galeria' },
    { id: 'profile', icon: User, label: 'Perfil' },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-80 bg-black border-r border-zinc-900 flex-col h-screen sticky top-0 z-40 shadow-2xl">
        <div className="p-10 flex flex-row items-center gap-6">
          <div className="relative group shrink-0">
            <div className="absolute inset-0 bg-yellow-500/20 blur-3xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
            <img src={LAMA_LOGO_URL} alt="LAMA" className="relative w-16 h-16 object-contain filter drop-shadow-[0_0_15px_rgba(234,179,8,0.4)] transform group-hover:scale-110 transition-transform duration-500" />
          </div>
          <div className="relative">
            <div className="flex flex-col">
              <h1 className="font-oswald text-3xl font-black tracking-[0.10em] uppercase italic leading-[0.75] text-white">
                L.A.M.A.
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-yellow-500 font-black uppercase tracking-[0.2em] text-[15px] font-oswald italic">Aparecida</span>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-6 py-8 overflow-y-auto custom-scrollbar">
          <ul className="space-y-3">
            {menuItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setView(item.id as View)}
                  className={`w-full flex items-center gap-6 px-7 py-4 rounded-[2rem] transition-all relative group overflow-hidden ${
                    currentView === item.id
                      ? 'bg-zinc-900/50 text-yellow-500 border border-yellow-500/20 shadow-[0_10px_30px_-10px_rgba(234,179,8,0.2)]'
                      : 'text-zinc-700 hover:bg-zinc-900/20 hover:text-zinc-400'
                  }`}
                >
                  {currentView === item.id && (
                    <div className="absolute left-0 w-2 h-8 bg-yellow-500 rounded-r-full shadow-[0_0_20px_rgba(234,179,8,0.6)]"></div>
                  )}
                  <item.icon size={20} className={currentView === item.id ? 'scale-110' : ''} />
                  <span className="font-black uppercase tracking-[0.25em] text-[9px] italic leading-none">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-8 border-t border-zinc-900/50">
          <button 
            onClick={onLogout} 
            className="w-full flex items-center gap-6 px-7 py-5 text-zinc-800 hover:text-red-600 hover:bg-red-600/5 rounded-[2rem] transition-all group"
          >
            <LogOut size={22} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-black uppercase tracking-[0.25em] text-[9px]">Sair</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation - Ultra Compacta e Discreta */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl border-t border-zinc-900 p-1 z-[2000] shadow-[0_-5px_30px_rgba(0,0,0,0.8)]">
        <div className="grid grid-cols-4 gap-0">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id as View)}
              className={`flex flex-col items-center justify-center py-1 rounded-lg transition-all duration-200 ${
                currentView === item.id 
                  ? 'text-yellow-500 bg-yellow-500/5' 
                  : 'text-zinc-500 active:bg-zinc-800'
              }`}
            >
              <item.icon 
                size={13} 
                strokeWidth={currentView === item.id ? 3 : 2} 
                className={`mb-0 transition-transform ${currentView === item.id ? 'scale-110' : ''}`}
              />
              <span className="text-[5.5px] font-black uppercase tracking-tight text-center leading-none">
                {item.label}
              </span>
            </button>
          ))}
          <button
            onClick={onLogout}
            className="flex flex-col items-center justify-center py-1 text-red-600/40 active:bg-red-600/10 rounded-lg transition-all"
          >
            <LogOut size={13} />
            <span className="text-[5.5px] font-black uppercase tracking-tight text-center leading-none">Sair</span>
          </button>
        </div>
      </nav>
    </>
  );
};
