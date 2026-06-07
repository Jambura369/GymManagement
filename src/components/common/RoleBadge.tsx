import React from 'react';
import {StyleSheet, View, Text} from 'react-native';
import {BORDER_RADIUS, ROLE_COLORS, SPACING} from '../../constants';
import {UserRole} from '../../types';

interface RoleBadgeProps {
  role: UserRole;
  size?: 'sm' | 'md';
  onDark?: boolean;
  style?: object;
}

const RoleBadge: React.FC<RoleBadgeProps> = ({role, size = 'md', onDark = false, style}) => {
  const color = ROLE_COLORS[role] || '#9E9E9E';
  const badgeColor = onDark ? 'rgba(255,255,255,0.9)' : color;
  const bgColor = onDark ? 'rgba(255,255,255,0.15)' : color + '20';
  const borderColor = onDark ? 'rgba(255,255,255,0.6)' : color;

  return (
    <View
      style={[
        styles.badge,
        {backgroundColor: bgColor, borderColor},
        size === 'sm' && styles.badgeSm,
        style,
      ]}>
      <Text
        style={[
          styles.text,
          {color: badgeColor},
          size === 'sm' && styles.textSm,
        ]}>
        {role}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: SPACING.xs,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  textSm: {
    fontSize: 10,
  },
});

export default RoleBadge;
