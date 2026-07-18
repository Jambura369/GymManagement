import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS} from '../../theme';

interface FormFieldProps {
  label?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  /** Renders the field as a tappable trigger (date / select). `value` is shown,
   *  or `placeholder` greyed-out when empty. */
  onPress?: () => void;
  /** Read-only display box (no input, no press) — e.g. a computed expiry date. */
  readOnly?: boolean;
  maxLength?: number;
  editable?: boolean;
  style?: StyleProp<ViewStyle>;
}

// Label-above, dark filled input matching the Gymblix UI kit (rounded-xl
// #161D1A box, #9CA3A0 placeholder, lime/error states). Used across the form
// screens so every input reads the same as the design.
const FormField: React.FC<FormFieldProps> = ({
  label,
  value,
  onChangeText,
  onBlur,
  placeholder,
  error,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  multiline = false,
  leftIcon,
  rightIcon,
  onRightIconPress,
  onPress,
  readOnly = false,
  maxLength,
  editable = true,
  style,
}) => {
  const boxStyle = [
    styles.box,
    multiline && styles.boxMultiline,
    error ? styles.boxError : null,
  ];

  const Inner = (
    <>
      {leftIcon && (
        <MaterialCommunityIcons name={leftIcon} size={18} color={COLORS.textSecondary} />
      )}
      {onPress || readOnly ? (
        <Text
          style={[styles.input, !value && styles.placeholderText]}
          numberOfLines={1}>
          {value || placeholder}
        </Text>
      ) : (
        <TextInput
          style={[styles.input, multiline && styles.inputMultiline]}
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textSecondary}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          maxLength={maxLength}
          editable={editable}
        />
      )}
      {rightIcon && (
        <TouchableOpacity onPress={onRightIconPress} hitSlop={8} disabled={!onRightIconPress}>
          <MaterialCommunityIcons name={rightIcon} size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>
      )}
    </>
  );

  return (
    <View style={[styles.group, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {onPress ? (
        <TouchableOpacity style={boxStyle} onPress={onPress} activeOpacity={0.7}>
          {Inner}
        </TouchableOpacity>
      ) : (
        <View style={boxStyle}>{Inner}</View>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  group: {marginBottom: SPACING.md},
  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginLeft: 2,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: 52,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
  },
  boxMultiline: {
    minHeight: 96,
    alignItems: 'flex-start',
    paddingVertical: SPACING.sm + 2,
  },
  boxError: {borderColor: COLORS.error},
  input: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
    padding: 0,
  },
  inputMultiline: {textAlignVertical: 'top', minHeight: 72},
  placeholderText: {color: COLORS.textSecondary},
  error: {fontSize: FONT_SIZE.xs, color: COLORS.error, marginTop: SPACING.xs, marginLeft: 2},
});

export default FormField;
