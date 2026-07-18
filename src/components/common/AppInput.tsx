import React from 'react';
import {StyleSheet, View, Text, StyleProp, ViewStyle} from 'react-native';
import {TextInput} from 'react-native-paper';
import {COLORS, SPACING} from '../../constants';

interface AppInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  numberOfLines?: number;
  disabled?: boolean;
  right?: React.ReactNode;
  left?: React.ReactNode;
  onBlur?: () => void;
  editable?: boolean;
  maxLength?: number;
  style?: StyleProp<ViewStyle>;
}

const AppInput: React.FC<AppInputProps> = ({
  label,
  value,
  onChangeText,
  error,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  multiline = false,
  numberOfLines = 1,
  disabled = false,
  right,
  left,
  onBlur,
  editable = true,
  maxLength,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <TextInput
        label={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        numberOfLines={numberOfLines}
        disabled={disabled}
        editable={editable}
        maxLength={maxLength}
        onBlur={onBlur}
        mode="outlined"
        error={!!error}
        right={right}
        left={left}
        style={styles.input}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: 'transparent',
  },
  error: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 2,
    marginLeft: SPACING.sm,
  },
});

export default AppInput;
