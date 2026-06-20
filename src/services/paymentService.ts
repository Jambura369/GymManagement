import {supabase} from '../supabase/client';
import {Payment, ApiResponse, PaginatedResponse} from '../types';
import {PAGINATION} from '../constants';

export const fetchPaymentsByStudent = async (
  studentId: string,
  page: number = 1,
  limit: number = PAGINATION.DEFAULT_LIMIT,
): Promise<ApiResponse<PaginatedResponse<Payment>>> => {
  try {
    const {data, error, count} = await supabase
      .from('payments')
      .select(
        `*, receiver:users!payments_received_by_fkey(id, name), package:packages(id, name, type)`,
        {count: 'exact'},
      )
      .eq('student_id', studentId)
      .order('payment_date', {ascending: false})
      .range((page - 1) * limit, page * limit - 1);

    if (error) return {data: null, error: error.message};

    return {
      data: {
        data: data as Payment[],
        total: count || 0,
        page,
        limit,
        hasMore: (count || 0) > page * limit,
      },
      error: null,
    };
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};

export const getStudentPaymentTotal = async (
  studentId: string,
): Promise<ApiResponse<number>> => {
  try {
    const {data, error} = await supabase
      .from('payments')
      .select('amount')
      .eq('student_id', studentId);

    if (error) return {data: null, error: error.message};
    const total = data.reduce((sum, p) => sum + Number(p.amount), 0);
    return {data: total, error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};
