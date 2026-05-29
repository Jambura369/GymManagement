import React from 'react';
import {StyleSheet, View, Text, TouchableOpacity} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {BORDER_RADIUS, COLORS, SPACING} from '../../constants';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  color?: string;
  subtitle?: string;
  onPress?: () => void;
  isDark?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color = COLORS.primary,
  subtitle,
  onPress,
  isDark = false,
}) => {
  const cardBg = isDark ? COLORS.cardDark : COLORS.card;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const subColor = isDark ? COLORS.textSecondaryDark : COLORS.textSecondary;

  return (
    <TouchableOpacity
      style={[styles.wrapper]}
      onPress={onPress}
      activeOpacity={onPress ? 0.72 : 1}
      disabled={!onPress}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: cardBg,
            borderColor: isDark ? COLORS.borderDark : COLORS.border,
            shadowColor: color,
          },
        ]}>
        {/* Left color accent bar */}
        <View style={[styles.accentBar, {backgroundColor: color}]} />

        <View style={styles.content}>
          {/* Icon */}
          <View style={[styles.iconContainer, {backgroundColor: color + '18'}]}>
            <MaterialCommunityIcons name={icon} size={22} color={color} />
          </View>

          {/* Stats */}
          <View style={styles.textBlock}>
            <Text
              style={[styles.value, {color: textColor}]}
              numberOfLines={1}
              adjustsFontSizeToFit>
              {value}
            </Text>
            <Text style={[styles.title, {color: subColor}]} numberOfLines={2}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={[styles.subtitle, {color}]}>{subtitle}</Text>
            ) : null}
          </View>

          {/* Arrow if pressable */}
          {onPress && (
            <MaterialCommunityIcons
              name="chevron-right"
              size={16}
              color={subColor}
              style={styles.arrow}
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    margin: SPACING.xs,
  },
  card: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    elevation: 3,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.12,
    shadowRadius: 12,
    overflow: 'hidden',
  },
  accentBar: {
    height: 3,
    width: '100%',
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderTopRightRadius: BORDER_RADIUS.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm + 2,
    gap: SPACING.sm,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textBlock: {flex: 1},
  value: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
  },
  title: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  arrow: {flexShrink: 0},
});

export default StatCard;
