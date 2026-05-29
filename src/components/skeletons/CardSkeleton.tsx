import React from 'react';
import {StyleSheet, View} from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import {BORDER_RADIUS, COLORS, SPACING} from '../../constants';

interface CardSkeletonProps {
  count?: number;
  isDark?: boolean;
}

const CardSkeleton: React.FC<CardSkeletonProps> = ({count = 3, isDark = false}) => {
  return (
    <>
      {Array.from({length: count}).map((_, i) => (
        <SkeletonPlaceholder
          key={i}
          backgroundColor={isDark ? COLORS.cardDark : '#E8E8E8'}
          highlightColor={isDark ? '#2D3436' : '#F0F0F0'}
          speed={1200}>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.avatar} />
              <View style={styles.textBlock}>
                <View style={styles.line} />
                <View style={styles.lineShort} />
              </View>
              <View style={styles.badge} />
            </View>
            <View style={styles.lineBottom} />
          </View>
        </SkeletonPlaceholder>
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#E8E8E8',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: SPACING.md,
  },
  textBlock: {
    flex: 1,
  },
  line: {
    height: 14,
    borderRadius: 4,
    marginBottom: 8,
  },
  lineShort: {
    height: 12,
    width: '60%',
    borderRadius: 4,
  },
  badge: {
    width: 70,
    height: 24,
    borderRadius: 12,
  },
  lineBottom: {
    height: 10,
    width: '40%',
    borderRadius: 4,
    marginTop: 4,
  },
});

export default CardSkeleton;
