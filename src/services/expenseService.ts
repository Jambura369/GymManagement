import {supabase} from '../supabase/client';
import {
  Expense,
  AddExpenseForm,
  ApiResponse,
  PaginatedResponse,
  ExpenseFilter,
} from '../types';
import {uploadImage} from './storageService';
import {PAGINATION, SUPABASE_BUCKETS} from '../constants';

export const fetchExpenses = async (
  gymId: string,
  filter: ExpenseFilter = {},
  page: number = 1,
  limit: number = PAGINATION.DEFAULT_LIMIT,
): Promise<ApiResponse<PaginatedResponse<Expense>>> => {
  try {
    let query = supabase
      .from('expenses')
      .select(
        `*, creator:users!expenses_created_by_fkey(id, name)`,
        {count: 'exact'},
      )
      .eq('gym_id', gymId)
      .order('expense_date', {ascending: false})
      .range((page - 1) * limit, page * limit - 1);

    if (filter.search) {
      query = query.ilike('title', `%${filter.search}%`);
    }
    if (filter.category && filter.category !== 'All') {
      query = query.eq('category', filter.category);
    }
    if (filter.date_from) {
      query = query.gte('expense_date', filter.date_from);
    }
    if (filter.date_to) {
      query = query.lte('expense_date', filter.date_to);
    }

    const {data, error, count} = await query;
    if (error) return {data: null, error: error.message};

    return {
      data: {
        data: data as Expense[],
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

export const addExpense = async (
  gymId: string,
  createdBy: string,
  form: AddExpenseForm,
): Promise<ApiResponse<Expense>> => {
  try {
    let receiptUrl: string | null = null;
    if (form.receipt_image) {
      const uploadResult = await uploadImage(
        form.receipt_image,
        SUPABASE_BUCKETS.RECEIPTS,
        `${gymId}/${Date.now()}`,
      );
      receiptUrl = uploadResult.data;
    }

    const {data, error} = await supabase
      .from('expenses')
      .insert({
        gym_id: gymId,
        title: form.title,
        amount: form.amount,
        category: form.category,
        created_by: createdBy,
        expense_date: form.expense_date,
        description: form.description || null,
        receipt_image: receiptUrl,
      })
      .select()
      .single();

    if (error) return {data: null, error: error.message};
    return {data: data as Expense, error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};

export const updateExpense = async (
  expenseId: string,
  updates: Partial<AddExpenseForm>,
): Promise<ApiResponse<Expense>> => {
  try {
    const {data, error} = await supabase
      .from('expenses')
      .update(updates)
      .eq('id', expenseId)
      .select()
      .single();

    if (error) return {data: null, error: error.message};
    return {data: data as Expense, error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};

export const deleteExpense = async (
  expenseId: string,
): Promise<ApiResponse<null>> => {
  try {
    const {error} = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId);
    if (error) return {data: null, error: error.message};
    return {data: null, error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};

export const getExpenseSummary = async (
  gymId: string,
  dateFrom: string,
  dateTo: string,
): Promise<ApiResponse<{total: number; by_category: Record<string, number>}>> => {
  try {
    const {data, error} = await supabase
      .from('expenses')
      .select('amount, category')
      .eq('gym_id', gymId)
      .gte('expense_date', dateFrom)
      .lte('expense_date', dateTo);

    if (error) return {data: null, error: error.message};

    const total = data.reduce((sum, e) => sum + Number(e.amount), 0);
    const by_category: Record<string, number> = {};
    data.forEach(e => {
      by_category[e.category] = (by_category[e.category] || 0) + Number(e.amount);
    });

    return {data: {total, by_category}, error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};
