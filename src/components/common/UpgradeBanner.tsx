import React from 'react';
import {StyleSheet, View, Text, TouchableOpacity} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {COLORS, SPACING, BORDER_RADIUS} from '../../constants';

interface ResourceLimit {
  label: string;
  icon: string;
  current: number;
  limit: number;
  pct: number;
}

interface Props {
  memberCount: number;
  memberLimit: number;
  trainerCount: number;
  trainerLimit: number;
  branchCount?: number;
  branchLimit?: number;
  staffCount?: number;
  staffLimit?: number;
  onUpgrade: () => void;
  isDark?: boolean;
}

function buildResources(props: Props): ResourceLimit[] {
  const resources: ResourceLimit[] = [];

  const add = (label: string, icon: string, current: number, limit: number) => {
    if (limit === -1) return; // unlimited
    const pct = limit > 0 ? Math.round((current / limit) * 100) : 100;
    if (pct >= 80) resources.push({label, icon, current, limit, pct: Math.min(pct, 100)});
  };

  add('Members', 'account-group', props.memberCount, props.memberLimit);
  add('Trainers', 'account-tie', props.trainerCount, props.trainerLimit);
  if (props.branchCount !== undefined && props.branchLimit !== undefined) {
    add('Branches', 'office-building', props.branchCount, props.branchLimit);
  }
  if (props.staffCount !== undefined && props.staffLimit !== undefined) {
    add('Staff', 'account-supervisor', props.staffCount, props.staffLimit);
  }
  return resources;
}

function barColor(pct: number) {
  if (pct >= 100) return COLORS.error;
  if (pct >= 90) return '#F97316';
  return COLORS.warning;
}

const UpgradeBanner: React.FC<Props> = props => {
  const {onUpgrade, isDark} = props;
  const resources = buildResources(props);

  if (resources.length === 0) return null;

  const cardBg = isDark ? '#2A1B1B' : '#FFF7ED';
  const borderColor = isDark ? '#D93B3A40' : '#F59E0B40';
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const subText = isDark ? COLORS.textSecondaryDark : COLORS.textSecondary;

  return (
    <View style={[styles.container, {backgroundColor: cardBg, borderColor}]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name="chart-line-variant" size={18} color={COLORS.warning} />
          <Text style={[styles.title, {color: textColor}]}>Approaching Plan Limits</Text>
        </View>
        <TouchableOpacity style={styles.upgradeBtn} onPress={onUpgrade} activeOpacity={0.8}>
          <Text style={styles.upgradeBtnText}>Upgrade</Text>
        </TouchableOpacity>
      </View>

      {resources.map(r => (
        <View key={r.label} style={styles.resource}>
          <View style={styles.resourceHeader}>
            <View style={styles.resourceLabel}>
              <MaterialCommunityIcons name={r.icon} size={13} color={subText} />
              <Text style={[styles.resourceName, {color: subText}]}>{r.label}</Text>
            </View>
            <Text style={[styles.resourceCount, {color: barColor(r.pct)}]}>
              {r.current}/{r.limit}
              {r.pct >= 100 ? ' (Full)' : ` (${r.pct}%)`}
            </Text>
          </View>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                {width: `${r.pct}%`, backgroundColor: barColor(r.pct)},
              ]}
            />
          </View>
        </View>
      ))}

      <Text style={[styles.hint, {color: subText}]}>
        Upgrade your plan to add more capacity and unlock features.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.sm + 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  title: {fontSize: 13, fontWeight: '700'},
  upgradeBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 4,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  upgradeBtnText: {color: '#0B0F0E', fontSize: 11, fontWeight: '700'},
  resource: {marginBottom: SPACING.xs},
  resourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  resourceLabel: {flexDirection: 'row', alignItems: 'center', gap: 4},
  resourceName: {fontSize: 12},
  resourceCount: {fontSize: 11, fontWeight: '700'},
  track: {
    height: 5,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {height: '100%', borderRadius: 3},
  hint: {fontSize: 11, marginTop: SPACING.xs},
});

export default UpgradeBanner;
