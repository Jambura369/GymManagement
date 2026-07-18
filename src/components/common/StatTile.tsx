import React from 'react';
import {StyleSheet, View, Text, TouchableOpacity} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS} from '../../theme';

interface StatTileProps {
  title: string;
  value: string | number;
  icon: string;
  iconColor?: string;
  valueColor?: string;
  highlighted?: boolean;
  onPress?: () => void;
}

// Square-ish tile used on the redesigned admin dashboard: icon badge top,
// title + value stacked below. `highlighted` adds a tinted border for the
// one stat the screen wants to draw the eye to (e.g. Revenue).
const StatTile: React.FC<StatTileProps> = ({
  title,
  value,
  icon,
  iconColor = COLORS.textPrimary,
  valueColor = COLORS.textPrimary,
  highlighted = false,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={[styles.tile, highlighted && styles.tileHighlighted]}
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
      disabled={!onPress}>
      <View style={[styles.iconBadge, {backgroundColor: iconColor + '20'}]}>
        <MaterialCommunityIcons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={[styles.value, {color: valueColor}]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  tileHighlighted: {
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.primary + '33',
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  value: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
  },
});

export default StatTile;
