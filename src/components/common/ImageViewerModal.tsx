import React from 'react';
import {
  Modal,
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {SCREEN_WIDTH, SCREEN_HEIGHT, SPACING} from '../../constants';

interface Props {
  visible: boolean;
  uri: string | null | undefined;
  onClose: () => void;
}

/**
 * Full-screen tappable image viewer. Used everywhere an uploaded image
 * (logo, QR, receipt, student/staff photo) should be openable in full size.
 */
const ImageViewerModal: React.FC<Props> = ({visible, uri, onClose}) => {
  const insets = useSafeAreaInsets();

  if (!uri) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <StatusBar backgroundColor="rgba(0,0,0,0.95)" barStyle="light-content" />
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={[styles.closeBtn, {top: insets.top + SPACING.sm}]}
          onPress={onClose}
          hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
          <MaterialCommunityIcons name="close" size={28} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.imageWrap}
          activeOpacity={1}
          onPress={onClose}>
          <Image source={{uri}} style={styles.image} resizeMode="contain" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    right: SPACING.md,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrap: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
});

export default ImageViewerModal;
