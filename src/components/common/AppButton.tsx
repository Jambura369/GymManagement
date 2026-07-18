import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Text,
  View,
  ActivityIndicator,
  ViewStyle,
  StyleProp,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {BORDER_RADIUS, COLORS, SPACING} from '../../constants';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  mode?: 'contained' | 'outlined' | 'text';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: string;
  color?: string;
  compact?: boolean;
}

const AppButton: React.FC<AppButtonProps> = ({
  title,
  onPress,
  mode = 'contained',
  loading = false,
  disabled = false,
  style,
  icon,
  color,
  compact = false,
}) => {
  const isDisabled = disabled || loading;

  if (mode === 'outlined') {
    const outlineColor = color || COLORS.primary;
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.75}
        style={[
          styles.outlined,
          {borderColor: outlineColor, opacity: isDisabled ? 0.55 : 1},
          compact && styles.compact,
          style,
        ]}>
        {loading ? (
          <ActivityIndicator size="small" color={outlineColor} />
        ) : (
          <View style={styles.row}>
            {icon && (
              <MaterialCommunityIcons
                name={icon}
                size={18}
                color={outlineColor}
                style={styles.iconSpacing}
              />
            )}
            <Text style={[styles.outlinedLabel, {color: outlineColor}]}>{title}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  if (mode === 'text') {
    const textColor = color || COLORS.primary;
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.7}
        style={[styles.textBtn, {opacity: isDisabled ? 0.55 : 1}, compact && styles.compact, style]}>
        <Text style={[styles.textLabel, {color: textColor}]}>{title}</Text>
      </TouchableOpacity>
    );
  }

  // Contained — gradient primary
  const gradientColors = color
    ? [color, color]
    : [COLORS.gradientStart, COLORS.gradientMid, COLORS.gradientEnd];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.82}
      style={[{opacity: isDisabled ? 0.55 : 1, borderRadius: BORDER_RADIUS.lg}, style]}>
      <LinearGradient
        colors={gradientColors as string[]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 0}}
        style={[styles.gradient, compact && styles.compact]}>
        {loading ? (
          <ActivityIndicator size="small" color="#0B0F0E" />
        ) : (
          <View style={styles.row}>
            {icon && (
              <MaterialCommunityIcons
                name={icon}
                size={18}
                color="#0B0F0E"
                style={styles.iconSpacing}
              />
            )}
            <Text style={styles.gradientLabel}>{title}</Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  gradient: {
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.sm + 4,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  compact: {
    paddingVertical: SPACING.xs + 2,
    minHeight: 36,
  },
  gradientLabel: {
    color: '#0B0F0E',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  outlined: {
    borderWidth: 1.5,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.sm + 4,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  outlinedLabel: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  textBtn: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSpacing: {marginRight: 6},
});

export default AppButton;
