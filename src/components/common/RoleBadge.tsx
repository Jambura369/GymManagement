import React from 'react';
import {StyleSheet, View, Text} from 'react-native';
import {BORDER_RADIUS, ROLE_COLORS, SPACING} from '../../constants';
import {UserRole} from '../../types';

interface RoleBadgeProps {
  role: UserRole;
  size?: 'sm' | 'md';
}

const RoleBadge: React.FC<RoleBadgeProps> = ({role, size = 'md'}) => {
  const color = ROLE_COLORS[role] || '#9E9E9E';

  return (
    <View
      style={[
        styles.badge,
        {backgroundColor: color + '20', borderColor: color},
        size === 'sm' && styles.badgeSm,
      ]}>
      <Text
        style={[
          styles.text,
          {color},
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
