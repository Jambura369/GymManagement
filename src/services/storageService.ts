import {supabase} from '../supabase/client';
import {ApiResponse} from '../types';
import {Platform} from 'react-native';

export const uploadImage = async (
  fileUri: string,
  bucket: string,
  path: string,
): Promise<ApiResponse<string>> => {
  try {
    const fileName = `${path}_${Date.now()}.jpg`;

    // Read file as blob
    const response = await fetch(fileUri);
    const blob = await response.blob();

    const {error} = await supabase.storage
      .from(bucket)
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) return {data: null, error: error.message};

    const {data: urlData} = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return {data: urlData.publicUrl, error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};

export const deleteImage = async (
  bucket: string,
  path: string,
): Promise<ApiResponse<null>> => {
  try {
    const {error} = await supabase.storage.from(bucket).remove([path]);
    if (error) return {data: null, error: error.message};
    return {data: null, error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};

export const getPublicUrl = (bucket: string, path: string): string => {
  const {data} = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};
