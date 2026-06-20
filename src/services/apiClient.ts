import axios from 'axios';
import {supabase} from '../supabase/client';
import Config from '../config';

// Talks to GymManagmentAdmin/backend (Express + Razorpay), unlike every
// other service in this folder which queries Supabase directly. Used for
// subscription billing, where order creation/signature verification must
// happen server-side with the Razorpay secret key.
export const apiClient = axios.create({
  baseURL: Config.API_BASE_URL,
});

apiClient.interceptors.request.use(async config => {
  const {
    data: {session},
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});
