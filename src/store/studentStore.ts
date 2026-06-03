import {create} from 'zustand';
import {Student, StudentFilter, VerificationRequest, UserRole, RenewStudentForm} from '../types';
import {
  fetchStudents,
  fetchVerificationRequests,
  addStudent as addStudentService,
  updateStudent as updateStudentService,
  deleteStudent as deleteStudentService,
  renewStudent as renewStudentService,
  approveVerification as approveVerificationService,
  rejectVerification as rejectVerificationService,
} from '../services/studentService';
import {AddStudentForm} from '../types';
import {useAuthStore} from './authStore';
import {useDashboardStore} from './dashboardStore';

interface StudentState {
  students: Student[];
  total: number;
  page: number;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  filter: StudentFilter;
  verificationRequests: VerificationRequest[];
  verificationLoading: boolean;

  fetchStudents: (gymId: string, reset?: boolean) => Promise<void>;
  loadMore: (gymId: string) => Promise<void>;
  addStudent: (gymId: string, createdBy: string, createdByRole: UserRole, form: AddStudentForm) => Promise<{id: string | null; error: string | null}>;
  renewStudent: (studentId: string, gymId: string, renewedBy: string, renewedByRole: UserRole, form: RenewStudentForm) => Promise<boolean>;
  updateStudent: (studentId: string, updates: Partial<Student>) => Promise<boolean>;
  deleteStudent: (studentId: string) => Promise<boolean>;
  setFilter: (filter: Partial<StudentFilter>) => void;
  clearFilter: () => void;
  fetchVerifications: (gymId: string, status?: string, trainerId?: string) => Promise<void>;
  approveVerification: (verificationId: string, verifiedBy: string) => Promise<boolean>;
  rejectVerification: (verificationId: string, verifiedBy: string, reason: string) => Promise<boolean>;
}

export const useStudentStore = create<StudentState>((set, get) => ({
  students: [],
  total: 0,
  page: 1,
  hasMore: false,
  isLoading: false,
  isLoadingMore: false,
  error: null,
  filter: {},
  verificationRequests: [],
  verificationLoading: false,

  fetchStudents: async (gymId, reset = true) => {
    const {filter} = get();
    const page = reset ? 1 : get().page;

    if (reset) {
      set({isLoading: true, students: [], page: 1});
    }

    const result = await fetchStudents(gymId, filter, page);
    if (result.data) {
      set({
        students: reset
          ? result.data.data
          : [...get().students, ...result.data.data],
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
    const result = await fetchStudents(gymId, filter, nextPage);

    if (result.data) {
      set({
        students: [...get().students, ...result.data.data],
        total: result.data.total,
        page: nextPage,
        hasMore: result.data.hasMore,
        isLoadingMore: false,
      });
    } else {
      set({isLoadingMore: false});
    }
  },

  addStudent: async (gymId, createdBy, createdByRole, form) => {
    const result = await addStudentService(gymId, createdBy, createdByRole, form);
    if (result.data) {
      set(state => ({students: [result.data!, ...state.students]}));
      useDashboardStore.getState().refresh(gymId);
      return {id: result.data.id, error: null};
    }
    return {id: null, error: result.error};
  },

  renewStudent: async (studentId, gymId, renewedBy, renewedByRole, form) => {
    const result = await renewStudentService(studentId, gymId, renewedBy, renewedByRole, form);
    if (result.data) {
      set(state => ({
        students: state.students.map(s =>
          s.id === studentId ? {...s, ...result.data!} : s,
        ),
      }));
      useDashboardStore.getState().refresh(gymId);
      return true;
    }
    return false;
  },

  updateStudent: async (studentId, updates) => {
    const gymId = useAuthStore.getState().gym?.id;
    const result = await updateStudentService(studentId, updates, gymId);
    if (result.data) {
      set(state => ({
        students: state.students.map(s =>
          s.id === studentId ? {...s, ...result.data!} : s,
        ),
      }));
      return true;
    }
    return false;
  },

  deleteStudent: async (studentId) => {
    const gymId = useAuthStore.getState().gym?.id;
    const result = await deleteStudentService(studentId, gymId);
    if (!result.error) {
      set(state => ({
        students: state.students.filter(s => s.id !== studentId),
      }));
      if (gymId) useDashboardStore.getState().refresh(gymId);
      return true;
    }
    return false;
  },

  setFilter: filter =>
    set(state => ({filter: {...state.filter, ...filter}})),

  clearFilter: () => set({filter: {}}),

  fetchVerifications: async (gymId, status, trainerId) => {
    set({verificationLoading: true});
    const result = await fetchVerificationRequests(gymId, status, trainerId);
    set({
      verificationRequests: result.data || [],
      verificationLoading: false,
    });
  },

  approveVerification: async (verificationId, verifiedBy) => {
    const result = await approveVerificationService(verificationId, verifiedBy);
    if (!result.error) {
      set(state => ({
        verificationRequests: state.verificationRequests.map(v =>
          v.id === verificationId ? {...v, status: 'Approved' as const} : v,
        ),
      }));
      return true;
    }
    return false;
  },

  rejectVerification: async (verificationId, verifiedBy, reason) => {
    const result = await rejectVerificationService(verificationId, verifiedBy, reason);
    if (!result.error) {
      set(state => ({
        verificationRequests: state.verificationRequests.map(v =>
          v.id === verificationId ? {...v, status: 'Rejected' as const} : v,
        ),
      }));
      return true;
    }
    return false;
  },
}));
