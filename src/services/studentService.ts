import {supabase} from '../supabase/client';
import {
  Student,
  AddStudentForm,
  RenewStudentForm,
  ApiResponse,
  PaginatedResponse,
  StudentFilter,
  UserRole,
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
  createdByRole: UserRole,
  form: AddStudentForm,
): Promise<ApiResponse<Student>> => {
  try {
    let imageUrl: string | null = null;

    if (form.image) {
      const uploadResult = await uploadImage(
        form.image,
        SUPABASE_BUCKETS.STUDENT_IMAGES,
        `${gymId}`,
      );
      if (uploadResult.error) {
        return {data: null, error: `Image upload failed: ${uploadResult.error}`};
      }
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

    const isAdminOrManager = createdByRole === 'Admin' || createdByRole === 'Manager';

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
        verification_status: isAdminOrManager ? 'Approved' : 'Pending',
        is_active: isAdminOrManager,
      })
      .select()
      .single();

    if (error) return {data: null, error: error.message};

    // Record payment — roll back student on failure to stay consistent
    if (form.amount_paid > 0) {
      const {error: paymentError} = await supabase.from('payments').insert({
        gym_id: gymId,
        student_id: data.id,
        amount: form.amount_paid,
        payment_method: form.payment_type,
        received_by: createdBy,
        payment_date: form.joining_date,
        package_id: form.package_id,
      });
      if (paymentError) {
        await supabase.from('students').delete().eq('id', data.id);
        return {data: null, error: 'Failed to record payment — student creation rolled back.'};
      }
    }

    // Trainer adds → create verification request (cancel any prior pending one first)
    if (!isAdminOrManager) {
      await supabase
        .from('verification_requests')
        .update({status: 'Rejected', rejection_reason: 'Superseded by new submission'})
        .eq('student_id', data.id)
        .eq('status', 'Pending');
      await supabase.from('verification_requests').insert({
        gym_id: gymId,
        student_id: data.id,
        trainer_id: createdBy,
        status: 'Pending',
      });
    }

    return {data: data as Student, error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};

// ---- Renew student membership ----
export const renewStudent = async (
  studentId: string,
  gymId: string,
  renewedBy: string,
  renewedByRole: UserRole,
  form: RenewStudentForm,
): Promise<ApiResponse<Student>> => {
  try {
    const isAdminOrManager = renewedByRole === 'Admin' || renewedByRole === 'Manager';

    let membershipExpiry: string | null = null;
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

    const {data, error} = await supabase
      .from('students')
      .update({
        package_id: form.package_id,
        joining_date: form.joining_date,
        membership_expiry: membershipExpiry,
        payment_type: form.payment_type,
        amount_paid: form.amount_paid,
        notes: form.notes || null,
        verification_status: isAdminOrManager ? 'Approved' : 'Pending',
        is_active: isAdminOrManager,
      })
      .eq('id', studentId)
      .select()
      .single();

    if (error) return {data: null, error: error.message};

    if (form.amount_paid > 0) {
      const {error: paymentError} = await supabase.from('payments').insert({
        gym_id: gymId,
        student_id: studentId,
        amount: form.amount_paid,
        payment_method: form.payment_type,
        received_by: renewedBy,
        payment_date: form.joining_date,
        package_id: form.package_id,
      });
      if (paymentError) {
        return {data: null, error: 'Failed to record payment. Please try again.'};
      }
    }

    if (!isAdminOrManager) {
      // Cancel any prior pending request before creating a new one
      await supabase
        .from('verification_requests')
        .update({status: 'Rejected', rejection_reason: 'Superseded by renewal submission'})
        .eq('student_id', studentId)
        .eq('status', 'Pending');
      await supabase.from('verification_requests').insert({
        gym_id: gymId,
        student_id: studentId,
        trainer_id: renewedBy,
        status: 'Pending',
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
  gymId?: string,
): Promise<ApiResponse<Student>> => {
  try {
    let query = supabase
      .from('students')
      .update(updates)
      .eq('id', studentId);
    if (gymId) query = query.eq('gym_id', gymId);
    const {data, error} = await query.select().single();

    if (error) return {data: null, error: error.message};
    return {data: data as Student, error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};

// ---- Delete student ----
export const deleteStudent = async (
  studentId: string,
  gymId?: string,
): Promise<ApiResponse<null>> => {
  try {
    let query = supabase.from('students').delete().eq('id', studentId);
    if (gymId) query = query.eq('gym_id', gymId);
    const {error} = await query;
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
  trainerId?: string,
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

    // Trainers only see their own submitted requests
    if (trainerId) {
      query = query.eq('trainer_id', trainerId);
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
    const {data: verif} = await supabase
      .from('verification_requests')
      .select('student_id')
      .eq('id', verificationId)
      .single();

    const {error} = await supabase
      .from('verification_requests')
      .update({status: 'Approved', verified_by: verifiedBy})
      .eq('id', verificationId);

    if (error) return {data: null, error: error.message};

    if (verif?.student_id) {
      await supabase
        .from('students')
        .update({
          is_active: true,
          verification_status: 'Approved',
          verified_by: verifiedBy,
          verified_at: new Date().toISOString(),
        })
        .eq('id', verif.student_id);
    }

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
    const {data: verif} = await supabase
      .from('verification_requests')
      .select('student_id')
      .eq('id', verificationId)
      .single();

    const {error} = await supabase
      .from('verification_requests')
      .update({
        status: 'Rejected',
        verified_by: verifiedBy,
        rejection_reason: reason,
      })
      .eq('id', verificationId);

    if (error) return {data: null, error: error.message};

    if (verif?.student_id) {
      await supabase
        .from('students')
        .update({is_active: false, verification_status: 'Rejected'})
        .eq('id', verif.student_id);
    }

    return {data: null, error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};

// ---- Sync expired memberships ----
// Sets is_active=false for any student whose membership_expiry has passed.
// Called before loading dashboard stats to keep counts accurate.
export const syncExpiredMemberships = async (gymId: string): Promise<void> => {
  const today = dayjs().format('YYYY-MM-DD');
  await supabase
    .from('students')
    .update({is_active: false})
    .eq('gym_id', gymId)
    .eq('is_active', true)
    .not('membership_expiry', 'is', null)
    .lt('membership_expiry', today);
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

// ---- Get all expired + expiring students (for ExpiryList screen & dashboard alerts) ----
// Returns: ALL expired (no past limit) + expiring within 30 days
// Sorted: recently expired first, then soonest expiring (client-side after fetch)
export const getExpiryAlerts = async (
  gymId: string,
  trainerId?: string,
): Promise<ApiResponse<Student[]>> => {
  try {
    const today = dayjs().format('YYYY-MM-DD');
    const in7Days = dayjs().add(7, 'day').format('YYYY-MM-DD');

    // Fetch expired students (all past, no lower bound)
    let expiredQuery = supabase
      .from('students')
      .select('*, package:packages(name, type), trainer:users!students_trainer_id_fkey(id, name)')
      .eq('gym_id', gymId)
      .not('membership_expiry', 'is', null)
      .lt('membership_expiry', today)
      .order('membership_expiry', {ascending: false}); // most recently expired first

    // Fetch expiring-soon students (today to 7 days ahead)
    let expiringQuery = supabase
      .from('students')
      .select('*, package:packages(name, type), trainer:users!students_trainer_id_fkey(id, name)')
      .eq('gym_id', gymId)
      .not('membership_expiry', 'is', null)
      .gte('membership_expiry', today)
      .lte('membership_expiry', in7Days)
      .order('membership_expiry', {ascending: true}); // soonest expiry first

    if (trainerId) {
      expiredQuery = expiredQuery.eq('trainer_id', trainerId);
      expiringQuery = expiringQuery.eq('trainer_id', trainerId);
    }

    const [expiredRes, expiringRes] = await Promise.all([expiredQuery, expiringQuery]);

    if (expiredRes.error) return {data: null, error: expiredRes.error.message};
    if (expiringRes.error) return {data: null, error: expiringRes.error.message};

    // Merge: recently expired first, then soonest expiring
    const combined = [
      ...(expiredRes.data as Student[]),
      ...(expiringRes.data as Student[]),
    ];

    return {data: combined, error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};
