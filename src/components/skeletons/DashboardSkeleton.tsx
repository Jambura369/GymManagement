import React from 'react';
import {StyleSheet, View} from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import {BORDER_RADIUS, COLORS, SPACING} from '../../constants';

interface DashboardSkeletonProps {
  isDark?: boolean;
}

const DashboardSkeleton: React.FC<DashboardSkeletonProps> = ({isDark = false}) => {
  const bg = isDark ? COLORS.cardDark : '#E8E8E8';
  const highlight = isDark ? '#2D3436' : '#F0F0F0';

  return (
    <SkeletonPlaceholder backgroundColor={bg} highlightColor={highlight} speed={1200}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft} />
          <View style={styles.headerRight} />
        </View>
        {/* Stat cards row 1 */}
        <View style={styles.row}>
          {[1, 2].map(i => (
            <View key={i} style={styles.statCard}>
              <View style={styles.statIcon} />
              <View style={styles.statValue} />
              <View style={styles.statLabel} />
            </View>
          ))}
        </View>
        {/* Stat cards row 2 */}
        <View style={styles.row}>
          {[1, 2].map(i => (
            <View key={i} style={styles.statCard}>
              <View style={styles.statIcon} />
              <View style={styles.statValue} />
              <View style={styles.statLabel} />
            </View>
          ))}
        </View>
        {/* Chart placeholder */}
        <View style={styles.chart} />
        {/* List items */}
        {[1, 2, 3].map(i => (
          <View key={i} style={styles.listItem}>
            <View style={styles.listAvatar} />
            <View style={styles.listText}>
              <View style={styles.listLine} />
              <View style={styles.listLineSm} />
            </View>
          </View>
        ))}
      </View>
    </SkeletonPlaceholder>
  );
};

const styles = StyleSheet.create({
  container: {padding: SPACING.md},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  headerLeft: {width: '60%', height: 24, borderRadius: 4},
  headerRight: {width: 40, height: 40, borderRadius: 20},
  row: {flexDirection: 'row', marginBottom: SPACING.sm},
  statCard: {
    flex: 1,
    margin: SPACING.xs,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    backgroundColor: '#E8E8E8',
  },
  statIcon: {width: 48, height: 48, borderRadius: 24, marginBottom: 8},
  statValue: {width: 60, height: 20, borderRadius: 4, marginBottom: 6},
  statLabel: {width: 80, height: 12, borderRadius: 4},
  chart: {
    height: 180,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#E8E8E8',
  },
  listAvatar: {width: 44, height: 44, borderRadius: 22, marginRight: 12},
  listText: {flex: 1},
  listLine: {height: 14, borderRadius: 4, marginBottom: 8},
  listLineSm: {height: 12, width: '50%', borderRadius: 4},
});

export default DashboardSkeleton;
