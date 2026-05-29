import {create} from 'zustand';
import {Expense, ExpenseFilter, AddExpenseForm} from '../types';
import {
  fetchExpenses,
  addExpense as addExpenseService,
  updateExpense as updateExpenseService,
  deleteExpense as deleteExpenseService,
} from '../services/expenseService';

interface ExpenseState {
  expenses: Expense[];
  total: number;
  page: number;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  filter: ExpenseFilter;

  fetchExpenses: (gymId: string, reset?: boolean) => Promise<void>;
  loadMore: (gymId: string) => Promise<void>;
  addExpense: (gymId: string, createdBy: string, form: AddExpenseForm) => Promise<boolean>;
  updateExpense: (expenseId: string, updates: Partial<AddExpenseForm>) => Promise<boolean>;
  deleteExpense: (expenseId: string) => Promise<boolean>;
  setFilter: (filter: Partial<ExpenseFilter>) => void;
  clearFilter: () => void;
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  total: 0,
  page: 1,
  hasMore: false,
  isLoading: false,
  isLoadingMore: false,
  error: null,
  filter: {},

  fetchExpenses: async (gymId, reset = true) => {
    const {filter} = get();
    const page = reset ? 1 : get().page;
    if (reset) set({isLoading: true, expenses: [], page: 1});

    const result = await fetchExpenses(gymId, filter, page);
    if (result.data) {
      set({
        expenses: reset
          ? result.data.data
          : [...get().expenses, ...result.data.data],
        total: result.data.total,
        hasMore: result.data.hasMore,
        isLoading: false,
        error: null,
      });
    } else {
      set({isLoading: false, error: result.error});
    }
  },

  loadMore: async (gymId) => {
    const {hasMore, isLoadingMore, page, filter} = get();
    if (!hasMore || isLoadingMore) return;
    set({isLoadingMore: true});
    const nextPage = page + 1;
    const result = await fetchExpenses(gymId, filter, nextPage);
    if (result.data) {
      set({
        expenses: [...get().expenses, ...result.data.data],
        page: nextPage,
        hasMore: result.data.hasMore,
        isLoadingMore: false,
      });
    } else {
      set({isLoadingMore: false});
    }
  },

  addExpense: async (gymId, createdBy, form) => {
    const result = await addExpenseService(gymId, createdBy, form);
    if (result.data) {
      set(state => ({expenses: [result.data!, ...state.expenses]}));
      return true;
    }
    return false;
  },

  updateExpense: async (expenseId, updates) => {
    const result = await updateExpenseService(expenseId, updates);
    if (result.data) {
      set(state => ({
        expenses: state.expenses.map(e =>
          e.id === expenseId ? {...e, ...result.data!} : e,
        ),
      }));
      return true;
    }
    return false;
  },

  deleteExpense: async (expenseId) => {
    const result = await deleteExpenseService(expenseId);
    if (!result.error) {
      set(state => ({
        expenses: state.expenses.filter(e => e.id !== expenseId),
      }));
      return true;
    }
    return false;
  },

  setFilter: filter =>
    set(state => ({filter: {...state.filter, ...filter}})),

  clearFilter: () => set({filter: {}}),
}));
