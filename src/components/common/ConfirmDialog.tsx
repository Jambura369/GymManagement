import React from 'react';
import {Text} from 'react-native';
import {Dialog, Portal, Button} from 'react-native-paper';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmColor?: string;
  loading?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  confirmColor,
  loading = false,
}) => {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onCancel}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <Text style={{fontSize: 14}}>{message}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            onPress={onConfirm}
            loading={loading}
            disabled={loading}
            textColor={confirmColor}>
            {confirmLabel}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

export default ConfirmDialog;
