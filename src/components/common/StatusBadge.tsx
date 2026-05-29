import React from 'react';
import {StyleSheet, View, Text} from 'react-native';
import {BORDER_RADIUS, VERIFICATION_COLORS, SPACING} from '../../constants';
import {VerificationStatus} from '../../types';

interface StatusBadgeProps {
  status: VerificationStatus | 'Active' | 'Inactive' | 'Expired';
  size?: 'sm' | 'md';
}

const STATUS_COLORS: Record<string, string> = {
  Pending: '#FF9800',
  Approved: '#4CAF50',
  Rejected: '#F44336',
  Active: '#4CAF50',
  Inactive: '#9E9E9E',
  Expired: '#F44336',
};

const StatusBadge: React.FC<StatusBadgeProps> = ({status, size = 'md'}) => {
  const color = STATUS_COLORS[status] || '#9E9E9E';

  return (
    <View
      style={[
        styles.badge,
        {backgroundColor: color + '20', borderColor: color},
        size === 'sm' && styles.badgeSm,
      ]}>
      <View style={[styles.dot, {backgroundColor: color}]} />
      <Text style={[styles.text, {color}, size === 'sm' && styles.textSm]}>
        {status}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    alignSelf: 'flex-start',
    gap: 4,
  },
  badgeSm: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  textSm: {
    fontSize: 10,
  },
});

export default StatusBadge;
