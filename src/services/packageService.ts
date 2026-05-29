import {supabase} from '../supabase/client';
import {Package, AddPackageForm, ApiResponse} from '../types';

export const fetchPackages = async (
  gymId: string,
  activeOnly: boolean = true,
): Promise<ApiResponse<Package[]>> => {
  try {
    let query = supabase
      .from('packages')
      .select('*')
      .eq('gym_id', gymId)
      .order('price', {ascending: true});

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const {data, error} = await query;
    if (error) return {data: null, error: error.message};
    return {data: data as Package[], error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};

export const addPackage = async (
  gymId: string,
  form: AddPackageForm,
): Promise<ApiResponse<Package>> => {
  try {
    const {data, error} = await supabase
      .from('packages')
      .insert({
        gym_id: gymId,
        name: form.name,
        type: form.type,
        price: form.price,
        duration_days: form.duration_days,
        description: form.description || null,
      })
      .select()
      .single();

    if (error) return {data: null, error: error.message};
    return {data: data as Package, error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};

export const updatePackage = async (
  packageId: string,
  updates: Partial<AddPackageForm & {is_active: boolean}>,
): Promise<ApiResponse<Package>> => {
  try {
    const {data, error} = await supabase
      .from('packages')
      .update(updates)
      .eq('id', packageId)
      .select()
      .single();

    if (error) return {data: null, error: error.message};
    return {data: data as Package, error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};

export const deletePackage = async (
  packageId: string,
): Promise<ApiResponse<null>> => {
  try {
    const {error} = await supabase
      .from('packages')
      .update({is_active: false})
      .eq('id', packageId);
    if (error) return {data: null, error: error.message};
    return {data: null, error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};
