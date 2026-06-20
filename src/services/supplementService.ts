import {supabase} from '../supabase/client';
import {
  Supplement,
  SupplementTransaction,
  AddSupplementForm,
  StockTransactionForm,
  ApiResponse,
} from '../types';

export const fetchSupplements = async (
  gymId: string,
  search?: string,
): Promise<ApiResponse<Supplement[]>> => {
  try {
    let query = supabase
      .from('supplements')
      .select('*')
      .eq('gym_id', gymId)
      .eq('is_active', true)
      .order('name', {ascending: true});

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const {data, error} = await query;
    if (error) return {data: null, error: error.message};
    return {data: data as Supplement[], error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};

export const getSupplement = async (
  supplementId: string,
): Promise<ApiResponse<Supplement>> => {
  try {
    const {data, error} = await supabase
      .from('supplements')
      .select('*')
      .eq('id', supplementId)
      .single();
    if (error) return {data: null, error: error.message};
    return {data: data as Supplement, error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};

export const addSupplement = async (
  gymId: string,
  form: AddSupplementForm,
): Promise<ApiResponse<Supplement>> => {
  try {
    const {data, error} = await supabase
      .from('supplements')
      .insert({
        gym_id: gymId,
        name: form.name,
        category: form.category || null,
        unit: form.unit || 'pcs',
        cost_price: form.cost_price ?? null,
        selling_price: form.selling_price,
        quantity: form.quantity || 0,
        low_stock_threshold: form.low_stock_threshold ?? 5,
        description: form.description || null,
      })
      .select()
      .single();

    if (error) return {data: null, error: error.message};
    return {data: data as Supplement, error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};

export const updateSupplement = async (
  supplementId: string,
  updates: Partial<AddSupplementForm>,
): Promise<ApiResponse<Supplement>> => {
  try {
    const {data, error} = await supabase
      .from('supplements')
      .update(updates)
      .eq('id', supplementId)
      .select()
      .single();
    if (error) return {data: null, error: error.message};
    return {data: data as Supplement, error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};

export const deleteSupplement = async (
  supplementId: string,
): Promise<ApiResponse<null>> => {
  try {
    const {error} = await supabase
      .from('supplements')
      .update({is_active: false})
      .eq('id', supplementId);
    if (error) return {data: null, error: error.message};
    return {data: null, error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};

export const recordStockTransaction = async (
  gymId: string,
  supplementId: string,
  recordedBy: string,
  form: StockTransactionForm,
): Promise<ApiResponse<SupplementTransaction>> => {
  try {
    const {data, error} = await supabase
      .rpc('record_supplement_transaction', {
        p_gym_id: gymId,
        p_supplement_id: supplementId,
        p_type: form.type,
        p_quantity: form.quantity,
        p_price_per_unit: form.price_per_unit,
        p_student_id: form.student_id || null,
        p_notes: form.notes || null,
        p_recorded_by: recordedBy,
        p_transaction_date: form.transaction_date,
      })
      .single();

    if (error) return {data: null, error: error.message};
    return {data: data as SupplementTransaction, error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};

export const fetchSupplementTransactions = async (
  gymId: string,
  supplementId?: string,
): Promise<ApiResponse<SupplementTransaction[]>> => {
  try {
    let query = supabase
      .from('supplement_transactions')
      .select(
        `*, supplement:supplements(id, name, unit), student:students(id, name), recorder:users!supplement_transactions_recorded_by_fkey(id, name)`,
      )
      .eq('gym_id', gymId)
      .order('transaction_date', {ascending: false})
      .order('created_at', {ascending: false});

    if (supplementId) {
      query = query.eq('supplement_id', supplementId);
    }

    const {data, error} = await query;
    if (error) return {data: null, error: error.message};
    return {data: data as SupplementTransaction[], error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};
