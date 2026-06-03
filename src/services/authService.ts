import {supabase} from '../supabase/client';
import {ApiResponse, Gym, RegisterGymForm, User} from '../types';
import {uploadImage} from './storageService';
import {SUPABASE_BUCKETS} from '../constants';

const isNetworkError = (err: any): boolean =>
  err?.message?.toLowerCase().includes('network') ||
  err?.message?.toLowerCase().includes('fetch');

const networkErrorMsg = 'No internet connection. Please check your network and try again.';

// ---- Register Gym (Owner Onboarding) ----
export const registerGym = async (
  form: RegisterGymForm,
): Promise<ApiResponse<{user: User; gym: Gym}>> => {
  try {
    // 1. Create Supabase auth user
    const {data: authData, error: authError} = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });

    if (authError || !authData.user) {
      return {data: null, error: authError?.message || 'Registration failed'};
    }

    // Sign in immediately so RLS policies work during gym/user insert.
    // If email confirmation is required, signUp returns no session — tell
    // the user to verify their email rather than showing a generic error.
    if (!authData.session) {
      const {error: signInError} = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      if (signInError) {
        return {
          data: null,
          error:
            'Account created! Please check your email to verify your account, then log in.',
        };
      }
    }

    // 2. Upload gym logo if provided — warn but continue if upload fails
    let gymLogoUrl: string | null = null;
    if (form.gym_logo) {
      const logoResult = await uploadImage(
        form.gym_logo,
        SUPABASE_BUCKETS.GYM_LOGOS,
        `${authData.user.id}/logo`,
      );
      if (logoResult.data) {
        gymLogoUrl = logoResult.data;
      }
      // Upload failure is non-fatal; gym is still created without a logo
    }

    // 3. Upload payment QR if provided
    let paymentQrUrl: string | null = null;
    if (form.payment_qr) {
      const qrResult = await uploadImage(
        form.payment_qr,
        SUPABASE_BUCKETS.PAYMENT_QR,
        `${authData.user.id}/payment_qr`,
      );
      if (qrResult.data) {
        paymentQrUrl = qrResult.data;
      }
    }

    // 4. Register gym + user atomically via SECURITY DEFINER function
    const {data: rpcData, error: rpcError} = await supabase.rpc(
      'register_gym_owner',
      {
        p_gym_name: form.gym_name,
        p_gym_logo: gymLogoUrl,
        p_owner_name: form.owner_name,
        p_phone: form.phone,
        p_email: form.email,
        p_address: form.address,
        p_payment_qr: paymentQrUrl,
      },
    );

    if (rpcError || !rpcData) {
      return {data: null, error: rpcError?.message || 'Failed to create gym'};
    }

    const gymData = rpcData.gym as Gym;
    const userData = rpcData.user as User;

    return {data: {user: userData, gym: gymData}, error: null};
  } catch (err: any) {
    return {data: null, error: isNetworkError(err) ? networkErrorMsg : (err.message || 'Unexpected error')};
  }
};

// ---- Login ----
export const login = async (
  email: string,
  password: string,
): Promise<ApiResponse<{user: User; gym: Gym}>> => {
  try {
    const {data: authData, error: authError} =
      await supabase.auth.signInWithPassword({email, password});

    if (authError || !authData.user) {
      return {data: null, error: authError?.message || 'Login failed'};
    }

    // Fetch user + gym data
    const {data: userData, error: userError} = await supabase
      .from('users')
      .select('*, gym:gyms(*)')
      .eq('auth_id', authData.user.id)
      .single();

    if (userError || !userData) {
      return {data: null, error: userError?.message || 'User profile not found'};
    }

    const gym = userData.gym as unknown as Gym;
    const user = {...userData} as unknown as User;
    delete (user as any).gym;

    if (!user.is_active) {
      await supabase.auth.signOut();
      return {data: null, error: 'Your account has been deactivated. Please contact your admin.'};
    }

    return {data: {user, gym}, error: null};
  } catch (err: any) {
    return {data: null, error: isNetworkError(err) ? networkErrorMsg : (err.message || 'Unexpected error')};
  }
};

// ---- Logout ----
export const logout = async (): Promise<void> => {
  await supabase.auth.signOut();
};

// ---- Get current session ----
export const getCurrentSession = async (): Promise<ApiResponse<{user: User; gym: Gym}>> => {
  try {
    const {data: sessionData} = await supabase.auth.getSession();
    if (!sessionData.session?.user) {
      return {data: null, error: null};
    }

    const {data: userData, error: userError} = await supabase
      .from('users')
      .select('*, gym:gyms(*)')
      .eq('auth_id', sessionData.session.user.id)
      .single();

    if (userError || !userData) {
      return {data: null, error: 'User profile not found'};
    }

    const gym = userData.gym as unknown as Gym;
    const user = {...userData} as unknown as User;
    delete (user as any).gym;

    if (!user.is_active) {
      await supabase.auth.signOut();
      return {data: null, error: 'Your account has been deactivated. Please contact your admin.'};
    }

    return {data: {user, gym}, error: null};
  } catch (err: any) {
    return {data: null, error: isNetworkError(err) ? networkErrorMsg : err.message};
  }
};

// ---- Reset Password ----
export const resetPassword = async (
  email: string,
): Promise<ApiResponse<null>> => {
  try {
    const {error} = await supabase.auth.resetPasswordForEmail(email);
    if (error) return {data: null, error: error.message};
    return {data: null, error: null};
  } catch (err: any) {
    return {data: null, error: isNetworkError(err) ? networkErrorMsg : err.message};
  }
};

// ---- Update FCM Token ----
export const updateFcmToken = async (
  userId: string,
  token: string,
): Promise<void> => {
  await supabase.from('users').update({fcm_token: token}).eq('id', userId);
};
