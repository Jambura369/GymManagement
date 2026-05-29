import {supabase} from '../supabase/client';
import {
  Student,
  AddStudentForm,
  ApiResponse,
  PaginatedResponse,
  StudentFilter,
  VerificationRequest,
} from '../types';
import {uploadImage} from './storageService';
import {PAGINATION, SUPABASE_BUCKETS} from '../constants';
import dayjs from 'dayjs';

// ---- Fetch students with filters + pagination ----
export const fetchStudents = async (
  gymId: string,
  filter: StudentFilter = {},
  page: number = 1,
  limit: number = PAGINATION.DEFAULT_LIMIT,
): Promise<ApiResponse<PaginatedResponse<Student>>> => {
  try {
    let query = supabase
      .from('students')
      .select(
        `*, package:packages(id, name, type, price, duration_days), trainer:users!students_trainer_id_fkey(id, name, phone)`,
        {count: 'exact'},
      )
      .eq('gym_id', gymId)
      .order('created_at', {ascending: false})
      .range((page - 1) * limit, page * limit - 1);

    if (filter.search) {
      query = query.or(
        `name.ilike.%${filter.search}%,phone.ilike.%${filter.search}%`,
      );
    }
    if (filter.verification_status && filter.verification_status !== 'All') {
      query = query.eq('verification_status', filter.verification_status);
    }
    if (filter.is_active !== undefined && filter.is_active !== 'All') {
      query = query.eq('is_active', filter.is_active);
    }
    if (filter.trainer_id) {
      query = query.eq('trainer_id', filter.trainer_id);
    }
    if (filter.expiry_filter === 'expired') {
      query = query.lt('membership_expiry', dayjs().format('YYYY-MM-DD'));
    } else if (filter.expiry_filter === 'expiring_7') {
      query = query
        .gte('membership_expiry', dayjs().format('YYYY-MM-DD'))
        .lte('membership_expiry', dayjs().add(7, 'day').format('YYYY-MM-DD'));
    } else if (filter.expiry_filter === 'expiring_3') {
      query = query
        .gte('membership_expiry', dayjs().format('YYYY-MM-DD'))
        .lte('membership_expiry', dayjs().add(3, 'day').format('YYYY-MM-DD'));
    }

    const {data, error, count} = await query;

    if (error) return {data: null, error: error.message};

    return {
      data: {
        data: data as Student[],
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

// ---- Get single student ----
export const getStudent = async (
  studentId: string,
): Promise<ApiResponse<Student>> => {
  try {
    const {data, error} = await supabase
      .from('students')
      .select(
        `*, package:packages(*), trainer:users!students_trainer_id_fkey(id, name, phone, role)`,
      )
      .eq('id', studentId)
      .single();

    if (error) return {data: null, error: error.message};
    return {data: data as Student, error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};

// ---- Add student ----
export const addStudent = async (
  gymId: string,
  createdBy: string,
  form: AddStudentForm,
): Promise<ApiResponse<Student>> => {
  try {
    let imageUrl: string | null = null;

    if (form.image) {
      const uploadResult = await uploadImage(
        form.image,
        SUPABASE_BUCKETS.STUDENT_IMAGES,
        `${gymId}/${Date.now()}`,
      );
      imageUrl = uploadResult.data;
    }

    // Calculate membership expiry
    let membershipExpiry: string | null = null;
    if (form.package_id) {
      const {data: pkg} = await supabase
        .from('packages')
        .select('duration_days')
        .eq('id', form.package_id)
        .single();
      if (pkg) {
        membershipExpiry = dayjs(form.joining_date)
          .add(pkg.duration_days, 'day')
          .format('YYYY-MM-DD');
      }
    }

    const {data, error} = await supabase
      .from('students')
      .insert({
        gym_id: gymId,
        name: form.name,
        phone: form.phone,
        email: form.email || null,
        image: imageUrl,
        joining_date: form.joining_date,
        package_id: form.package_id,
        membership_expiry: membershipExpiry,
        trainer_id: form.trainer_id || null,
        created_by: createdBy,
        payment_type: form.payment_type,
        amount_paid: form.amount_paid,
        notes: form.notes || null,
        verification_status: 'Pending',
        is_active: false,
      })
      .select()
      .single();

    if (error) return {data: null, error: error.message};

    // Record payment
    if (form.amount_paid > 0) {
      await supabase.from('payments').insert({
        gym_id: gymId,
        student_id: data.id,
        amount: form.amount_paid,
        payment_method: form.payment_type,
        received_by: createdBy,
        payment_date: form.joining_date,
        package_id: form.package_id,
      });
    }

    return {data: data as Student, error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};

// ---- Update student ----
export const updateStudent = async (
  studentId: string,
  updates: Partial<Student>,
): Promise<ApiResponse<Student>> => {
  try {
    const {data, error} = await supabase
      .from('students')
      .update(updates)
      .eq('id', studentId)
      .select()
      .single();

    if (error) return {data: null, error: error.message};
    return {data: data as Student, error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};

// ---- Delete student ----
export const deleteStudent = async (
  studentId: string,
): Promise<ApiResponse<null>> => {
  try {
    const {error} = await supabase
      .from('students')
      .delete()
      .eq('id', studentId);
    if (error) return {data: null, error: error.message};
    return {data: null, error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};

// ---- Fetch verification requests ----
export const fetchVerificationRequests = async (
  gymId: string,
  status?: string,
): Promise<ApiResponse<VerificationRequest[]>> => {
  try {
    let query = supabase
      .from('verification_requests')
      .select(
        `*, student:students(id, name, phone, image, joining_date, package_id, amount_paid, payment_type, package:packages(name, type, price)), trainer:users!verification_requests_trainer_id_fkey(id, name, phone)`,
      )
      .eq('gym_id', gymId)
      .order('created_at', {ascending: false});

    if (status && status !== 'All') {
      query = query.eq('status', status);
    }

    const {data, error} = await query;
    if (error) return {data: null, error: error.message};
    return {data: data as VerificationRequest[], error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};

// ---- Approve verification ----
export const approveVerification = async (
  verificationId: string,
  verifiedBy: string,
): Promise<ApiResponse<null>> => {
  try {
    const {error} = await supabase
      .from('verification_requests')
      .update({status: 'Approved', verified_by: verifiedBy})
      .eq('id', verificationId);

    if (error) return {data: null, error: error.message};
    return {data: null, error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};

// ---- Reject verification ----
export const rejectVerification = async (
  verificationId: string,
  verifiedBy: string,
  reason: string,
): Promise<ApiResponse<null>> => {
  try {
    const {error} = await supabase
      .from('verification_requests')
      .update({
        status: 'Rejected',
        verified_by: verifiedBy,
        rejection_reason: reason,
      })
      .eq('id', verificationId);

    if (error) return {data: null, error: error.message};
    return {data: null, error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};

// ---- Get expiring memberships ----
export const getExpiringMemberships = async (
  gymId: string,
  days: number,
): Promise<ApiResponse<Student[]>> => {
  try {
    const {data, error} = await supabase
      .from('students')
      .select('*, package:packages(name, type)')
      .eq('gym_id', gymId)
      .eq('is_active', true)
      .gte('membership_expiry', dayjs().format('YYYY-MM-DD'))
      .lte(
        'membership_expiry',
        dayjs().add(days, 'day').format('YYYY-MM-DD'),
      )
      .order('membership_expiry', {ascending: true});

    if (error) return {data: null, error: error.message};
    return {data: data as Student[], error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};
