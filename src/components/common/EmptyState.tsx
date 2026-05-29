import React from 'react';
import {StyleSheet, View, Text} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {COLORS, SPACING} from '../../constants';
import AppButton from './AppButton';

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  isDark?: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'inbox-outline',
  title,
  subtitle,
  actionLabel,
  onAction,
  isDark = false,
}) => {
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const subColor = isDark ? COLORS.textSecondaryDark : COLORS.textSecondary;

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons
        name={icon}
        size={72}
        color={COLORS.placeholder}
        style={styles.icon}
      />
      <Text style={[styles.title, {color: textColor}]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, {color: subColor}]}>{subtitle}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <AppButton
          title={actionLabel}
          onPress={onAction}
          style={styles.button}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxl,
  },
  icon: {
    marginBottom: SPACING.lg,
    opacity: 0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  button: {
    marginTop: SPACING.md,
    minWidth: 150,
  },
});

export default EmptyState;
