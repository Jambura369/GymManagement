import {Platform, Alert} from 'react-native';
import {launchCamera, launchImageLibrary, ImageLibraryOptions, CameraOptions} from 'react-native-image-picker';
import {PERMISSIONS, request, RESULTS} from 'react-native-permissions';

export interface ImagePickerOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
}

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
    quality: (options.quality ?? 0.8) as import('react-native-image-picker').PhotoQuality,
    ...(options.maxWidth !== undefined && {maxWidth: options.maxWidth}),
    ...(options.maxHeight !== undefined && {maxHeight: options.maxHeight}),
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
    quality: (options.quality ?? 0.8) as import('react-native-image-picker').PhotoQuality,
    ...(options.maxWidth !== undefined && {maxWidth: options.maxWidth}),
    ...(options.maxHeight !== undefined && {maxHeight: options.maxHeight}),
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
