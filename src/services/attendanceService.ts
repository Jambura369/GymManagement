import dayjs from 'dayjs';
import {supabase} from '../supabase/client';
import {ApiResponse} from '../types';

export interface AttendanceRecord {
  id: string;
  student_id: string;
  gym_id: string;
  date: string;
  checked_in_at: string;
  checked_out_at: string | null;
  marked_by: string | null;
  created_at: string;
  student?: {
    id: string;
    name: string;
    phone: string;
    image: string | null;
    is_active: boolean;
    membership_expiry: string | null;
  };
}

export interface AttendanceSummary {
  total_days: number;
  this_month: number;
  last_check_in: string | null;
}

// ---- Check In ----
export const checkInStudent = async (
  studentId: string,
  gymId: string,
  markedBy: string,
): Promise<ApiResponse<AttendanceRecord>> => {
  try {
    const today = dayjs().format('YYYY-MM-DD');

    // Guard: check if already checked in today
    const {data: existing} = await supabase
      .from('attendance')
      .select('id, checked_out_at')
      .eq('student_id', studentId)
      .eq('date', today)
      .maybeSingle();

    if (existing) {
      return {data: null, error: 'Already checked in today'};
    }

    const {data, error} = await supabase
      .from('attendance')
      .insert({
        student_id: studentId,
        gym_id: gymId,
        date: today,
        checked_in_at: new Date().toISOString(),
        marked_by: markedBy,
      })
      .select('*')
      .single();

    if (error) return {data: null, error: error.message};
    return {data: data as AttendanceRecord, error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};

// ---- Check Out ----
export const checkOutStudent = async (
  attendanceId: string,
): Promise<ApiResponse<AttendanceRecord>> => {
  try {
    const {data, error} = await supabase
      .from('attendance')
      .update({checked_out_at: new Date().toISOString()})
      .eq('id', attendanceId)
      .select('*')
      .single();

    if (error) return {data: null, error: error.message};
    return {data: data as AttendanceRecord, error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};

// ---- Today's Attendance ----
export const getTodayAttendance = async (
  gymId: string,
): Promise<ApiResponse<AttendanceRecord[]>> => {
  try {
    const today = dayjs().format('YYYY-MM-DD');
    const {data, error} = await supabase
      .from('attendance')
      .select('*, student:students(id, name, phone, image, is_active, membership_expiry)')
      .eq('gym_id', gymId)
      .eq('date', today)
      .order('checked_in_at', {ascending: false});

    if (error) return {data: null, error: error.message};
    return {data: data as AttendanceRecord[], error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};

// ---- Member Attendance History ----
export const getMemberAttendance = async (
  studentId: string,
  limit = 60,
): Promise<ApiResponse<AttendanceRecord[]>> => {
  try {
    const {data, error} = await supabase
      .from('attendance')
      .select('*')
      .eq('student_id', studentId)
      .order('date', {ascending: false})
      .limit(limit);

    if (error) return {data: null, error: error.message};
    return {data: data as AttendanceRecord[], error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};

// ---- Monthly Attendance for a Gym ----
export const getMonthlyAttendance = async (
  gymId: string,
  year: number,
  month: number, // 1-indexed
): Promise<ApiResponse<AttendanceRecord[]>> => {
  try {
    const start = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).format('YYYY-MM-DD');
    const end = dayjs(start).endOf('month').format('YYYY-MM-DD');

    const {data, error} = await supabase
      .from('attendance')
      .select('*, student:students(id, name, phone, image)')
      .eq('gym_id', gymId)
      .gte('date', start)
      .lte('date', end)
      .order('date', {ascending: false});

    if (error) return {data: null, error: error.message};
    return {data: data as AttendanceRecord[], error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};

// ---- Attendance Summary for a Member ----
export const getAttendanceSummary = async (
  studentId: string,
): Promise<AttendanceSummary> => {
  try {
    const thisMonthStart = dayjs().startOf('month').format('YYYY-MM-DD');

    const [{count: total}, {count: thisMonth}, lastRecord] = await Promise.all([
      supabase
        .from('attendance')
        .select('*', {count: 'exact', head: true})
        .eq('student_id', studentId),
      supabase
        .from('attendance')
        .select('*', {count: 'exact', head: true})
        .eq('student_id', studentId)
        .gte('date', thisMonthStart),
      supabase
        .from('attendance')
        .select('checked_in_at')
        .eq('student_id', studentId)
        .order('date', {ascending: false})
        .limit(1)
        .maybeSingle(),
    ]);

    return {
      total_days: total ?? 0,
      this_month: thisMonth ?? 0,
      last_check_in: lastRecord.data?.checked_in_at ?? null,
    };
  } catch {
    return {total_days: 0, this_month: 0, last_check_in: null};
  }
};

// ---- Check if student is checked in today ----
export const getTodayRecord = async (
  studentId: string,
): Promise<AttendanceRecord | null> => {
  try {
    const today = dayjs().format('YYYY-MM-DD');
    const {data} = await supabase
      .from('attendance')
      .select('*')
      .eq('student_id', studentId)
      .eq('date', today)
      .maybeSingle();
    return data as AttendanceRecord | null;
  } catch {
    return null;
  }
};
