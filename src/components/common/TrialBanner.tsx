import React from 'react';
import {StyleSheet, View, Text, TouchableOpacity} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {COLORS, SPACING, BORDER_RADIUS} from '../../constants';

interface Props {
  daysLeft: number;
  expiryDate: string | null;
  onUpgrade: () => void;
  isDark?: boolean;
}

function getUrgency(daysLeft: number): {
  colors: [string, string];
  icon: string;
  label: string;
} {
  if (daysLeft <= 0) {
    return {colors: ['#7F1D1D', '#991B1B'], icon: 'alert-octagon', label: 'Trial Expired'};
  }
  if (daysLeft === 1) {
    return {colors: ['#B91C1C', '#DC2626'], icon: 'alarm', label: 'Last Day!'};
  }
  if (daysLeft <= 3) {
    return {colors: ['#C2410C', '#EA580C'], icon: 'alarm', label: `${daysLeft} days left`};
  }
  if (daysLeft <= 7) {
    return {colors: ['#B45309', '#D97706'], icon: 'clock-alert-outline', label: `${daysLeft} days left`};
  }
  return {colors: [COLORS.primary, COLORS.primaryDark], icon: 'rocket-launch-outline', label: `${daysLeft} days left`};
}

const TrialBanner: React.FC<Props> = ({daysLeft, expiryDate, onUpgrade}) => {
  const {colors, icon, label} = getUrgency(daysLeft);

  // Trial consumption as 0–100%: assumes 14-day trial
  const TRIAL_DAYS = 14;
  const pct = Math.min(100, Math.max(0, Math.round(((TRIAL_DAYS - daysLeft) / TRIAL_DAYS) * 100)));

  const isExpired = daysLeft <= 0;

  return (
    <LinearGradient
      colors={colors}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 0}}
      style={styles.container}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name={icon} size={20} color="#FFF" />
        </View>
        <View style={styles.textBlock}>
          <Text style={styles.title}>
            {isExpired ? 'Free Trial Expired' : 'Free Trial'}
          </Text>
          <Text style={styles.subtitle}>
            {isExpired
              ? 'Upgrade to continue using all features'
              : `${label} · trial ends ${expiryDate ? new Date(expiryDate).toLocaleDateString('en-IN', {day: 'numeric', month: 'short'}) : ''}`}
          </Text>
          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, {width: `${pct}%`}]} />
          </View>
        </View>
        <TouchableOpacity style={styles.upgradeBtn} onPress={onUpgrade} activeOpacity={0.8}>
          <Text style={styles.upgradeBtnText}>Upgrade</Text>
          <MaterialCommunityIcons name="arrow-right" size={14} color={colors[0]} />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm + 2,
    elevation: 4,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textBlock: {flex: 1},
  title: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 1,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    marginBottom: SPACING.xs,
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 2,
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFF',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    flexShrink: 0,
  },
  upgradeBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#111',
  },
});

export default TrialBanner;
