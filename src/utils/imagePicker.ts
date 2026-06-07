import {Platform, Alert} from 'react-native';
import {launchCamera, launchImageLibrary, ImageLibraryOptions, CameraOptions} from 'react-native-image-picker';
import {PERMISSIONS, request, RESULTS} from 'react-native-permissions';

export interface ImagePickerOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
}

// Centralised compression presets — tune here to affect every upload.
// Approximate output sizes after picker resizes + compresses:
//   AVATAR  ~25–60 KB  (faces shown small — no need for high res)
//   LOGO    ~40–80 KB  (gym logo / QR code — moderate fidelity)
//   RECEIPT ~60–120 KB (expense receipts — text must stay legible)
export const PICKER_PRESETS = {
  AVATAR:  {quality: 0.65, maxWidth: 600,  maxHeight: 600},
  LOGO:    {quality: 0.7,  maxWidth: 800,  maxHeight: 800},
  RECEIPT: {quality: 0.75, maxWidth: 1024, maxHeight: 1024},
} as const;

const DEFAULT_QUALITY = 0.7;
const DEFAULT_MAX_DIM = 800;

const requestCameraPermission = async (): Promise<boolean> => {
  const permission =
    Platform.OS === 'ios'
      ? PERMISSIONS.IOS.CAMERA
      : PERMISSIONS.ANDROID.CAMERA;
  const status = await request(permission);
  if (status !== RESULTS.GRANTED) {
    Alert.alert(
      'Camera Permission Required',
      'Please allow camera access in Settings to take photos.',
    );
    return false;
  }
  return true;
};

// Returns a data URI (data:mime;base64,...) for reliable cross-platform upload.
// Falls back to the file URI if base64 is unavailable.
const assetToUri = (asset: {uri?: string; base64?: string | null; type?: string}): string | null => {
  if (asset.base64 && asset.type) {
    return `data:${asset.type};base64,${asset.base64}`;
  }
  return asset.uri ?? null;
};

const openCamera = async (
  options: ImagePickerOptions,
  onPicked: (uri: string) => void,
) => {
  const granted = await requestCameraPermission();
  if (!granted) return;

  const cameraOptions: CameraOptions = {
    mediaType: 'photo',
    cameraType: 'back',
    quality: (options.quality ?? DEFAULT_QUALITY) as import('react-native-image-picker').PhotoQuality,
    maxWidth: options.maxWidth ?? DEFAULT_MAX_DIM,
    maxHeight: options.maxHeight ?? DEFAULT_MAX_DIM,
    includeBase64: true,
  };
  const result = await launchCamera(cameraOptions);
  if (!result.didCancel && result.assets?.[0]) {
    const uri = assetToUri(result.assets[0]);
    if (uri) onPicked(uri);
  }
};

const openGallery = async (
  options: ImagePickerOptions,
  onPicked: (uri: string) => void,
) => {
  const galleryOptions: ImageLibraryOptions = {
    mediaType: 'photo',
    quality: (options.quality ?? DEFAULT_QUALITY) as import('react-native-image-picker').PhotoQuality,
    maxWidth: options.maxWidth ?? DEFAULT_MAX_DIM,
    maxHeight: options.maxHeight ?? DEFAULT_MAX_DIM,
    includeBase64: true,
  };
  const result = await launchImageLibrary(galleryOptions);
  if (!result.didCancel && result.assets?.[0]) {
    const uri = assetToUri(result.assets[0]);
    if (uri) onPicked(uri);
  }
};

export const showImagePicker = (
  options: ImagePickerOptions,
  onPicked: (uri: string) => void,
) => {
  Alert.alert('Select Image', 'Choose an option', [
    {text: 'Camera', onPress: () => openCamera(options, onPicked)},
    {text: 'Choose from Gallery', onPress: () => openGallery(options, onPicked)},
    {text: 'Cancel', style: 'cancel'},
  ]);
};
