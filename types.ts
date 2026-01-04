
export interface User {
  id: string;
  name: string;
  email: string;
  bikeModel?: string;
  avatar?: string;
  birthDate?: string;
  role?: 'admin' | 'member';
}

export interface RoutePoint {
  lat: number;
  lng: number;
  timestamp: number;
}

export interface Route {
  id: string;
  user_id?: string;
  title: string;
  description: string;
  distance: string;
  difficulty: 'Fácil' | 'Moderada' | 'Difícil' | 'Lendária';
  points: RoutePoint[];
  status: 'planejada' | 'concluída' | 'ativa';
  thumbnail?: string;
  isOfficial?: boolean;
}

export type View = 'home' | 'explorer' | 'my-routes' | 'profile' | 'tracking' | 'gallery' | 'clubhouse' | 'admin';
