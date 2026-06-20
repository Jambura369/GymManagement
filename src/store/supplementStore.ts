import {create} from 'zustand';
import {Supplement, AddSupplementForm} from '../types';
import {
  fetchSupplements,
  addSupplement as addSupplementService,
  updateSupplement as updateSupplementService,
  deleteSupplement as deleteSupplementService,
} from '../services/supplementService';

interface SupplementState {
  supplements: Supplement[];
  isLoading: boolean;
  error: string | null;
  search: string;

  fetchSupplements: (gymId: string) => Promise<void>;
  setSearch: (gymId: string, search: string) => Promise<void>;
  addSupplement: (gymId: string, form: AddSupplementForm) => Promise<boolean>;
  updateSupplement: (supplementId: string, updates: Partial<AddSupplementForm>) => Promise<boolean>;
  deleteSupplement: (supplementId: string) => Promise<boolean>;
  adjustLocalQuantity: (supplementId: string, delta: number) => void;
}

export const useSupplementStore = create<SupplementState>((set, get) => ({
  supplements: [],
  isLoading: false,
  error: null,
  search: '',

  fetchSupplements: async gymId => {
    set({isLoading: true});
    const result = await fetchSupplements(gymId, get().search);
    if (result.data) {
      set({supplements: result.data, isLoading: false, error: null});
    } else {
      set({isLoading: false, error: result.error});
    }
  },

  setSearch: async (gymId, search) => {
    set({search});
    await get().fetchSupplements(gymId);
  },

  addSupplement: async (gymId, form) => {
    const result = await addSupplementService(gymId, form);
    if (result.data) {
      set(state => ({supplements: [result.data!, ...state.supplements]}));
      return true;
    }
    return false;
  },

  updateSupplement: async (supplementId, updates) => {
    const result = await updateSupplementService(supplementId, updates);
    if (result.data) {
      set(state => ({
        supplements: state.supplements.map(s =>
          s.id === supplementId ? {...s, ...result.data!} : s,
        ),
      }));
      return true;
    }
    return false;
  },

  deleteSupplement: async supplementId => {
    const result = await deleteSupplementService(supplementId);
    if (!result.error) {
      set(state => ({
        supplements: state.supplements.filter(s => s.id !== supplementId),
      }));
      return true;
    }
    return false;
  },

  adjustLocalQuantity: (supplementId, delta) =>
    set(state => ({
      supplements: state.supplements.map(s =>
        s.id === supplementId ? {...s, quantity: s.quantity + delta} : s,
      ),
    })),
}));
