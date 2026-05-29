import {create} from 'zustand';
import {DashboardStats, MonthlyChartData} from '../types';
import {getDashboardStats, getMonthlyRevenue} from '../services/dashboardService';

interface DashboardState {
  stats: DashboardStats | null;
  chartData: MonthlyChartData[];
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;

  fetchStats: (gymId: string) => Promise<void>;
  fetchChartData: (gymId: string) => Promise<void>;
  refresh: (gymId: string) => Promise<void>;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useDashboardStore = create<DashboardState>((set, get) => ({
  stats: null,
  chartData: [],
  isLoading: false,
  error: null,
  lastFetched: null,

  fetchStats: async (gymId) => {
    set({isLoading: true, error: null});
    const result = await getDashboardStats(gymId);
    if (result.data) {
      set({stats: result.data, isLoading: false, lastFetched: Date.now()});
    } else {
      set({isLoading: false, error: result.error});
    }
  },

  fetchChartData: async (gymId) => {
    const result = await getMonthlyRevenue(gymId, 6);
    if (result.data) {
      set({chartData: result.data});
    }
  },

  refresh: async (gymId) => {
    await Promise.all([get().fetchStats(gymId), get().fetchChartData(gymId)]);
  },
}));
