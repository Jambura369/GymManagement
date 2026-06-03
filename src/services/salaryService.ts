import {supabase} from '../supabase/client';
import {TrainerSalary, AddSalaryForm, ApiResponse} from '../types';

export const fetchSalaries = async (
  gymId: string,
  trainerId?: string,
): Promise<ApiResponse<TrainerSalary[]>> => {
  try {
    let query = supabase
      .from('trainer_salary')
      .select(
        `*, trainer:users!trainer_salary_trainer_id_fkey(id, name, phone, role), payer:users!trainer_salary_paid_by_fkey(id, name)`,
      )
      .eq('gym_id', gymId)
      .order('payment_date', {ascending: false});

    if (trainerId) {
      query = query.eq('trainer_id', trainerId);
    }

    const {data, error} = await query;
    if (error) return {data: null, error: error.message};
    return {data: data as TrainerSalary[], error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};

export const paySalary = async (
  gymId: string,
  paidBy: string,
  form: AddSalaryForm,
): Promise<ApiResponse<TrainerSalary>> => {
  try {
    const {data, error} = await supabase
      .from('trainer_salary')
      .insert({
        gym_id: gymId,
        trainer_id: form.trainer_id,
        salary_amount: form.salary_amount,
        payment_date: form.payment_date,
        payment_type: form.payment_type,
        paid_by: paidBy,
        notes: form.notes || null,
      })
      .select()
      .single();

    if (error) return {data: null, error: error.message};

    // Create notification for trainer
    await supabase.from('notifications').insert({
      gym_id: gymId,
      title: 'Salary Paid',
      message: `Your salary of ₹${form.salary_amount} has been paid.`,
      target_role: 'Trainer',
      target_user_id: form.trainer_id,
      notification_type: 'salary',
      reference_id: data.id,
    });

    return {data: data as TrainerSalary, error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};

export const updateSalary = async (
  salaryId: string,
  updates: Partial<{salary_amount: number; payment_date: string; payment_type: string; notes: string | null}>,
): Promise<ApiResponse<TrainerSalary>> => {
  try {
    const {data, error} = await supabase
      .from('trainer_salary')
      .update(updates)
      .eq('id', salaryId)
      .select()
      .single();
    if (error) return {data: null, error: error.message};
    return {data: data as TrainerSalary, error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};

export const deleteSalary = async (salaryId: string): Promise<ApiResponse<null>> => {
  try {
    const {error} = await supabase.from('trainer_salary').delete().eq('id', salaryId);
    if (error) return {data: null, error: error.message};
    return {data: null, error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};

export const getSalaryTotal = async (
  gymId: string,
  dateFrom: string,
  dateTo: string,
): Promise<ApiResponse<number>> => {
  try {
    const {data, error} = await supabase
      .from('trainer_salary')
      .select('salary_amount')
      .eq('gym_id', gymId)
      .gte('payment_date', dateFrom)
      .lte('payment_date', dateTo);

    if (error) return {data: null, error: error.message};
    const total = data.reduce((sum, s) => sum + Number(s.salary_amount), 0);
    return {data: total, error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};
