import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AuthUser, Gym, User} from '../types';
import {getCurrentSession, logout as logoutService, updateFcmToken} from '../services/authService';
import {getFCMToken} from '../services/notificationService';

interface AuthState {
  user: User | null;
  gym: Gym | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  setAuth: (user: User, gym: Gym) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  updateGym: (gym: Partial<Gym>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      gym: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      setAuth: (user, gym) => {
        set({user, gym, isAuthenticated: true, error: null});
        // Update FCM token on login
        getFCMToken().then(token => {
          if (token) {
            updateFcmToken(user.id, token);
          }
        });
      },

      clearAuth: () =>
        set({
          user: null,
          gym: null,
          isAuthenticated: false,
          error: null,
        }),

      setLoading: loading => set({isLoading: loading}),

      setError: error => set({error}),

      logout: async () => {
        await logoutService();
        set({user: null, gym: null, isAuthenticated: false, error: null});
      },

      checkSession: async () => {
        set({isLoading: true});
        const result = await getCurrentSession();
        if (result.data) {
          set({
            user: result.data.user,
            gym: result.data.gym,
            isAuthenticated: true,
          });
        } else {
          set({user: null, gym: null, isAuthenticated: false});
        }
        set({isLoading: false});
      },

      updateUser: user =>
        set(state => ({
          user: state.user ? {...state.user, ...user} : null,
        })),

      updateGym: gym =>
        set(state => ({
          gym: state.gym ? {...state.gym, ...gym} : null,
        })),
    }),
    {
      name: 'gym-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        user: state.user,
        gym: state.gym,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
