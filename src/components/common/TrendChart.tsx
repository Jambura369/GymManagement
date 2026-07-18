import React from 'react';
import {StyleSheet, View, Text} from 'react-native';
import Svg, {Polyline, Circle} from 'react-native-svg';
import {COLORS, FONT_SIZE, FONT_WEIGHT} from '../../theme';

interface TrendChartProps {
  points: {label: string; value: number}[];
  width: number;
  height?: number;
  color?: string;
}

// Minimal, chrome-free line chart (no gridlines/axes) matching the brand's
// flat dashboard style. Built on react-native-svg directly instead of a
// charting lib so it stays visually consistent with the rest of the UI.
const TrendChart: React.FC<TrendChartProps> = ({
  points,
  width,
  height = 110,
  color = COLORS.primary,
}) => {
  if (points.length === 0) {
    return (
      <View style={[styles.empty, {width, height}]}>
        <Text style={styles.emptyText}>No data yet</Text>
      </View>
    );
  }

  const padding = 12;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const values = points.map(p => p.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = padding + (points.length === 1 ? chartWidth / 2 : (i / (points.length - 1)) * chartWidth);
    const y = padding + chartHeight - ((p.value - min) / range) * chartHeight;
    return {x, y};
  });

  const polylinePoints = coords.map(c => `${c.x},${c.y}`).join(' ');

  return (
    <View>
      <Svg width={width} height={height}>
        <Polyline
          points={polylinePoints}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {coords.map((c, i) => (
          <Circle key={i} cx={c.x} cy={c.y} r={i === coords.length - 1 ? 4 : 0} fill={color} />
        ))}
      </Svg>
      <View style={[styles.labelRow, {width}]}>
        {points.map((p, i) => (
          <Text key={i} style={styles.label}>
            {p.label}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  empty: {alignItems: 'center', justifyContent: 'center'},
  emptyText: {fontSize: FONT_SIZE.sm, color: COLORS.textSecondary},
  labelRow: {flexDirection: 'row', justifyContent: 'space-between'},
  label: {fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium, color: COLORS.textSecondary},
});

export default TrendChart;
