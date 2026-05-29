import React from 'react';
import {StyleSheet, View, Modal, Text} from 'react-native';
import {ActivityIndicator} from 'react-native-paper';
import {COLORS} from '../../constants';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message = 'Please wait...',
}) => {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.text}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    backgroundColor: '#FFFFFF',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    gap: 16,
    minWidth: 160,
  },
  text: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});

export default LoadingOverlay;
