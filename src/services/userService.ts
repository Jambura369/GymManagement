import {supabase} from '../supabase/client';
import {User, AddUserForm, ApiResponse} from '../types';
import {uploadImage} from './storageService';
import {SUPABASE_BUCKETS} from '../constants';

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
    // Save admin session before creating the new user account.
    // Calling supabase.auth.signUp() replaces the current session when
    // email-confirmation is disabled, which would silently log out the admin.
    const {data: {session: adminSession}} = await supabase.auth.getSession();

    const {data: authData, error: authError} = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });

    if (authError || !authData.user) {
      return {data: null, error: authError?.message || 'Failed to create auth'};
    }

    // Restore the admin session immediately if it was replaced.
    if (adminSession) {
      const {error: restoreError} = await supabase.auth.setSession({
        access_token: adminSession.access_token,
        refresh_token: adminSession.refresh_token,
      });
      if (restoreError) {
        return {data: null, error: 'Admin session could not be restored. Please log in again.'};
      }
    }

    let avatarUrl: string | null = null;
    if (form.avatar) {
      const uploadResult = await uploadImage(
        form.avatar,
        SUPABASE_BUCKETS.STAFF_IMAGES,
        `${gymId}/${authData.user.id}`,
      );
      avatarUrl = uploadResult.data;
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
        avatar: avatarUrl,
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
  updates: {
    gym_name?: string;
    gym_logo?: string | null;
    owner_name?: string;
    phone?: string;
    address?: string;
    payment_qr?: string | null;
  },
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
