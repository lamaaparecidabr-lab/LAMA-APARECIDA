
/**
 * L.A.M.A. LOCAL ENGINE - DEFINITIVE VERSION
 * 100% Offline / LocalStorage
 */

const DB_KEYS = {
  USERS: 'lama_local_v2_users',
  PROFILES: 'lama_local_v2_profiles',
  ROUTES: 'lama_local_v2_routes',
  SESSION: 'lama_local_v2_session'
};

const getStore = (key: string) => JSON.parse(localStorage.getItem(key) || '[]');
const setStore = (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data));

const ADMIN_EMAIL = 'lama.aparecidabr@gmail.com';

export const supabase: any = {
  auth: {
    getSession: async () => {
      const session = JSON.parse(localStorage.getItem(DB_KEYS.SESSION) || 'null');
      return { data: { session }, error: null };
    },
    signInWithPassword: async ({ email, password }: any) => {
      const users = getStore(DB_KEYS.USERS);
      let user = users.find((u: any) => u.email === email);
      
      // Se o usuário não existir, criamos na hora (Auto-Cadastro)
      if (!user) {
        user = { 
          id: Math.random().toString(36).substr(2, 9), 
          email, 
          password, // Em ambiente local salvamos simples
          user_metadata: { name: email === ADMIN_EMAIL ? 'Admin L.A.M.A.' : 'Novo Piloto' } 
        };
        users.push(user);
        setStore(DB_KEYS.USERS, users);
      } else {
        // Validação de senha simples
        if (user.password !== password) {
          return { data: { session: null }, error: { message: "Senha incorreta para este piloto." } };
        }
      }
      
      const session = { user: { id: user.id, email: user.email, user_metadata: user.user_metadata } };
      localStorage.setItem(DB_KEYS.SESSION, JSON.stringify(session));
      return { data: { session }, error: null };
    },
    signOut: async () => {
      localStorage.removeItem(DB_KEYS.SESSION);
      return { error: null };
    },
    updateUser: async ({ data }: any) => {
      const session = JSON.parse(localStorage.getItem(DB_KEYS.SESSION) || 'null');
      if (session) {
        session.user.user_metadata = { ...session.user.user_metadata, ...data };
        localStorage.setItem(DB_KEYS.SESSION, JSON.stringify(session));
      }
      return { data: session, error: null };
    },
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
  },

  from: (table: string) => {
    const tableKey = table === 'profiles' ? DB_KEYS.PROFILES : DB_KEYS.ROUTES;
    return {
      select: () => ({
        eq: (col: string, val: any) => ({
          maybeSingle: async () => {
            const data = getStore(tableKey);
            const item = data.find((i: any) => i[col] === val);
            return { data: item || null, error: null };
          }
        }),
        order: (col: string, { ascending }: any = {}) => {
          const data = getStore(tableKey);
          const sorted = [...data].sort((a, b) => {
            const valA = a[col] || '';
            const valB = b[col] || '';
            return ascending ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
          });
          return { data: sorted, error: null };
        }
      }),
      upsert: async (item: any) => {
        const data = getStore(tableKey);
        const index = data.findIndex((i: any) => i.id === item.id);
        
        if (table === 'profiles') {
          const session = JSON.parse(localStorage.getItem(DB_KEYS.SESSION) || 'null');
          if (session?.user?.email === ADMIN_EMAIL) {
            item.role = 'admin';
          }
        }

        if (index > -1) data[index] = { ...data[index], ...item };
        else data.push(item);
        setStore(tableKey, data);
        return { error: null };
      },
      insert: async (items: any[]) => {
        const data = getStore(tableKey);
        items.forEach(item => {
          data.push({ 
            id: Math.random().toString(36).substr(2, 9), 
            ...item, 
            created_at: new Date().toISOString() 
          });
        });
        setStore(tableKey, data);
        return { error: null };
      },
      delete: () => ({
        eq: (col: string, val: any) => {
          const data = getStore(tableKey);
          const filtered = data.filter((i: any) => i[col] !== val);
          setStore(tableKey, filtered);
          return { error: null };
        }
      })
    };
  }
};
