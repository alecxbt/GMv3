import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import axios from 'axios';
import { toast } from 'react-toastify';

// --- Interfaces ---
interface Layout {
  id: string;
  name: string;
  userId: string;
  panes?: any[];
  grid: {
    cols?: number;
    rowHeight?: number;
    layouts?: Record<string, any>;
  };
  createdAt: string;
  updatedAt: string;
}

interface Watchlist {
  id: string;
  name: string;
  userId: string;
  symbols: string[];
  createdAt: string;
  updatedAt: string;
}

interface KanbanTask {
  id: string;
  content: string;
  priority?: 'low' | 'medium' | 'high';
  estimatedEffort?: string;
  reason?: string;
  columnId: string;
  projectLabel: string;
}

interface KanbanColumn {
  id: string;
  title: string;
  taskIds: string[];
}

interface KanbanState {
  columns: Record<string, KanbanColumn>;
  columnOrder: string[];
  tasks: Record<string, KanbanTask>;
}

// --- API Configuration ---
// In dev: use empty baseURL so requests hit Vite proxy (localhost:3000/api → 5001)
// In prod or when VITE_API_URL is set: use full backend URL
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const AXIOS_BASE = import.meta.env.VITE_API_URL || '';

function formatAuthError(error: any, fallback: string): string {
  if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
    return 'Cannot connect to server. Make sure the backend is running (npm run dev) and the frontend proxy is active.';
  }
  const data = error.response?.data;
  const status = error.response?.status;
  if (data?.error) {
    const msg = typeof data.error === 'string' ? data.error
      : Array.isArray(data.error) ? data.error[0]?.message : null;
    if (msg) return status === 500 ? `Server error: ${msg}` : msg;
  }
  if (status === 500) return 'Server error. Check the backend logs and ensure DATABASE_URL is set and migrations have run.';
  return error.message || fallback;
}

// --- User Interface ---
interface User {
  id: string;
  email: string;
  name?: string;
  subscription: string;
}

// --- Auth State Interface ---
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  layouts: Layout[];
  watchlists: Watchlist[];
  kanbanBoard: KanbanState;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  setAuthFromOAuth: (accessToken: string, refreshToken: string, user: User) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  fetchUserData: () => Promise<void>; // Fetches layouts, watchlists, and kanban data
  saveKanbanState: (kanbanData: KanbanState) => Promise<void>; // Action to save Kanban state
}

// --- Axios Configuration ---
axios.defaults.baseURL = AXIOS_BASE;

axios.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        await useAuthStore.getState().refreshAccessToken();
        const token = useAuthStore.getState().accessToken;
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return axios(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().logout();
        if (!['/login', '/register', '/auth/callback'].includes(window.location.pathname)) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// --- Zustand Store Definition ---
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      layouts: [],
      watchlists: [],
      kanbanBoard: { columns: {}, columnOrder: [], tasks: {} }, // Initialize kanbanBoard state
      isLoading: false,
      error: null,

      // --- Auth Actions ---
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await axios.post('/api/auth/login', { email, password });
          const { accessToken, refreshToken, user } = response.data;
          set({ user, accessToken, refreshToken, isLoading: false });
          await get().fetchUserData().catch((err) => console.warn('Post-login fetch:', err));
        } catch (error: any) {
          const msg = formatAuthError(error, 'Login failed');
          set({ error: msg, isLoading: false });
          throw error;
        }
      },

      register: async (email, password, name) => {
        set({ isLoading: true, error: null });
        try {
          const response = await axios.post('/api/auth/register', { email, password, name });
          const { accessToken, refreshToken, user } = response.data;
          set({ user, accessToken, refreshToken, isLoading: false });
          // Don't fail registration if post-signup fetch fails (e.g. kanban/layouts)
          await get().fetchUserData().catch((err) => console.warn('Post-registration fetch:', err));
        } catch (error: any) {
          const msg = formatAuthError(error, 'Registration failed');
          set({ error: msg, isLoading: false });
          throw error;
        }
      },

      setAuthFromOAuth: async (accessToken, refreshToken, user) => {
        set({ user, accessToken, refreshToken, error: null });
        await get().fetchUserData().catch((err) => console.warn('Post-OAuth fetch:', err));
      },

      logout: () => {
        const { refreshToken } = get();
        if (refreshToken) {
          axios.post('/api/auth/logout', { refreshToken }).catch(() => {});
        }
        set({
          user: null, accessToken: null, refreshToken: null,
          layouts: [], watchlists: [], kanbanBoard: { columns: {}, columnOrder: [], tasks: {} }, error: null, isLoading: false,
        });
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) throw new Error('No refresh token');
        try {
          const response = await axios.post('/api/auth/refresh', { refreshToken });
          set({ accessToken: response.data.accessToken });
        } catch (error) {
          get().logout();
          throw error;
        }
      },

      checkAuth: async () => {
        const { accessToken, refreshToken } = get();
        if (!accessToken && !refreshToken) return;
        set({ isLoading: true });
        try {
          if (accessToken) {
            const response = await axios.get('/api/auth/me');
            set({ user: response.data, isLoading: false });
            await get().fetchUserData();
            return;
          }
          if (refreshToken) {
            await get().refreshAccessToken();
            const response = await axios.get('/api/auth/me');
            set({ user: response.data, isLoading: false });
            await get().fetchUserData();
            return;
          }
        } catch (error) {
          get().logout();
        }
      },

      // --- User Data Fetching Actions ---
      fetchUserData: async () => {
        if (!get().user) return;
        try {
          const [layoutsRes, watchlistsRes, kanbanRes] = await Promise.all([
            axios.get<Layout[]>('/api/layouts'),
            axios.get<Watchlist[]>('/api/watchlists'),
            axios.get<KanbanState>('/api/kanban'), // Fetch Kanban data
          ]);
          set({
            layouts: layoutsRes.data,
            watchlists: watchlistsRes.data,
            kanbanBoard: kanbanRes.data,
          });
        } catch (error: any) {
          console.error('Error fetching user data:', error);
        }
      },

      // --- Kanban Persistence Actions ---
      saveKanbanState: async (kanbanData: KanbanState) => {
        if (!get().user) return; // Only save if user is logged in
        try {
          // Use Electron IPC if available for local storage
          if (window.electronAPI && typeof window.electronAPI.saveKanbanState === 'function') {
            await window.electronAPI.saveKanbanState(kanbanData);
            // toast.success('Kanban state saved locally!'); // Optionally show toast
          } else {
            // Fallback: Call a backend API to save Kanban state
            // This assumes you have a PUT /api/kanban endpoint that accepts the full state
            await axios.put('/api/kanban', kanbanData);
            toast.success('Kanban state saved!');
          }
        } catch (error: any) {
          console.error('Error saving Kanban state:', error);
          toast.error('Failed to save Kanban state.');
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'gm-terminal-auth',
      storage: createJSONStorage(() => localStorage), // Use localStorage for persistence in browser environments
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        // Layouts, Watchlists, and Kanban data are fetched, not persisted directly in storage
      }),
    }
  )
);

// Export configured axios instance
export { axios as api };
