import {supabase} from '../supabase/client';
import {User, AddUserForm, ApiResponse} from '../types';

export const fetchUsers = async (
  gymId: string,
  role?: string,
): Promise<ApiResponse<User[]>> => {
  try {
    let query = supabase
      .from('users')
      .select('*')
      .eq('gym_id', gymId)
      .order('name', {ascending: true});

    if (role) {
      query = query.eq('role', role);
    }

    const {data, error} = await query;
    if (error) return {data: null, error: error.message};
    return {data: data as User[], error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};

export const addUser = async (
  gymId: string,
  form: AddUserForm,
): Promise<ApiResponse<User>> => {
  try {
    // Create auth account
    const {data: authData, error: authError} = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });

    if (authError || !authData.user) {
      return {data: null, error: authError?.message || 'Failed to create auth'};
    }

    const {data, error} = await supabase
      .from('users')
      .insert({
        auth_id: authData.user.id,
        gym_id: gymId,
        name: form.name,
        email: form.email,
        phone: form.phone,
        role: form.role,
        is_active: true,
      })
      .select()
      .single();

    if (error) return {data: null, error: error.message};
    return {data: data as User, error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};

export const updateUser = async (
  userId: string,
  updates: Partial<User>,
): Promise<ApiResponse<User>> => {
  try {
    const {data, error} = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) return {data: null, error: error.message};
    return {data: data as User, error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};

export const toggleUserActive = async (
  userId: string,
  isActive: boolean,
): Promise<ApiResponse<null>> => {
  try {
    const {error} = await supabase
      .from('users')
      .update({is_active: isActive})
      .eq('id', userId);
    if (error) return {data: null, error: error.message};
    return {data: null, error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};

export const updateGymSettings = async (
  gymId: string,
  updates: Record<string, any>,
): Promise<ApiResponse<null>> => {
  try {
    const {error} = await supabase
      .from('gyms')
      .update(updates)
      .eq('id', gymId);
    if (error) return {data: null, error: error.message};
    return {data: null, error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};
