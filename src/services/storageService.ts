import {supabase} from '../supabase/client';
import {ApiResponse} from '../types';

const getMimeType = (uri: string): string => {
  if (uri.startsWith('data:')) {
    const match = uri.match(/^data:([^;]+);/);
    return match?.[1] ?? 'image/jpeg';
  }
  const lower = uri.toLowerCase();
  if (lower.includes('.png') || lower.endsWith('png')) return 'image/png';
  if (lower.includes('.webp') || lower.endsWith('webp')) return 'image/webp';
  if (lower.includes('.gif') || lower.endsWith('gif')) return 'image/gif';
  if (lower.includes('.heic') || lower.endsWith('heic')) return 'image/heic';
  return 'image/jpeg';
};

const getExtension = (mimeType: string): string => {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/heic': 'jpg',
    'image/jpeg': 'jpg',
  };
  return map[mimeType] ?? 'jpg';
};

export const uploadImage = async (
  fileUri: string,
  bucket: string,
  path: string,
  oldPath?: string,
): Promise<ApiResponse<string>> => {
  try {
    if (!fileUri.startsWith('data:')) {
      return {data: null, error: 'Image must be provided as a base64 data URI'};
    }

    const mimeType = getMimeType(fileUri);
    const ext = getExtension(mimeType);
    const fileName = `${path}_${Date.now()}.${ext}`;

    // Decode base64 → Uint8Array.
    // supabase storage-js sends Uint8Array via the direct (non-FormData) code
    // path, setting Content-Type from fileOptions. React Native fetch handles
    // Uint8Array bodies as binary since RN 0.72.
    const base64 = fileUri.split(',')[1];
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const {error} = await supabase.storage
      .from(bucket)
      .upload(fileName, bytes, {contentType: mimeType, upsert: true});

    if (error) return {data: null, error: error.message};

    if (oldPath) {
      // oldPath is a full public URL; extract the storage path after the bucket name
      const marker = `/${bucket}/`;
      const markerIdx = oldPath.indexOf(marker);
      const storagePath =
        markerIdx !== -1 ? oldPath.slice(markerIdx + marker.length) : oldPath;
      if (storagePath) {
        await supabase.storage.from(bucket).remove([storagePath]);
      }
    }

    const {data: urlData} = supabase.storage.from(bucket).getPublicUrl(fileName);
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
