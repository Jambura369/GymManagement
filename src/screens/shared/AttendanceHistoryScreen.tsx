import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useThemeStore} from '../../store/themeStore';
import {BORDER_RADIUS, COLORS, SPACING} from '../../constants';
import {RootStackParamList} from '../../types';
import {AttendanceRecord, getAttendanceSummary, getMemberAttendance} from '../../services/attendanceService';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type RouteT = RouteProp<RootStackParamList, 'AttendanceHistory'>;

const AttendanceHistoryScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteT>();
  const {isDark} = useThemeStore();
  const insets = useSafeAreaInsets();

  const {studentId, studentName} = route.params;

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState({total_days: 0, this_month: 0, last_check_in: null as string | null});
  const [loading, setLoading] = useState(true);

  const bgColor = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const cardBg = isDark ? COLORS.cardDark : COLORS.card;

  const load = useCallback(async () => {
    setLoading(true);
    const [histRes, sumRes] = await Promise.all([
      getMemberAttendance(studentId, 90),
      getAttendanceSummary(studentId),
    ]);
    if (histRes.data) setRecords(histRes.data);
    setSummary(sumRes);
    setLoading(false);
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  // Build calendar grid for current month
  const currentMonth = dayjs();
  const daysInMonth = currentMonth.daysInMonth();
  const firstDayOfWeek = currentMonth.startOf('month').day(); // 0=Sun
  const attendedDates = new Set(records.map(r => r.date));

  const calendarCells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({length: daysInMonth}, (_, i) => i + 1),
  ];

  const renderRecord = ({item}: {item: AttendanceRecord}) => (
    <View style={[styles.recordRow, {backgroundColor: cardBg}]}>
      <View style={[styles.dateDot, {backgroundColor: COLORS.success + '20'}]}>
        <MaterialCommunityIcons name="check" size={14} color={COLORS.success} />
      </View>
      <View style={styles.recordInfo}>
        <Text style={[styles.recordDate, {color: textColor}]}>
          {dayjs(item.date).format('ddd, DD MMM YYYY')}
        </Text>
        <Text style={[styles.recordTime, {color: COLORS.textSecondary}]}>
          Check-in: {dayjs(item.checked_in_at).format('h:mm A')}
          {item.checked_out_at ? ` · Out: ${dayjs(item.checked_out_at).format('h:mm A')}` : ' · Still in gym'}
        </Text>
      </View>
      {item.checked_out_at && (
        <Text style={[styles.duration, {color: COLORS.primary}]}>
          {Math.round(dayjs(item.checked_out_at).diff(dayjs(item.checked_in_at), 'minute'))}m
        </Text>
      )}
    </View>
  );

  return (
    <View style={[styles.container, {backgroundColor: bgColor}]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {paddingTop: insets.top + SPACING.sm, backgroundColor: isDark ? COLORS.cardDark : COLORS.card},
        ]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={textColor} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={[styles.title, {color: textColor}]} numberOfLines={1}>
            {studentName}
          </Text>
          <Text style={[styles.subtitle, {color: COLORS.textSecondary}]}>Attendance History</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={r => r.id}
          renderItem={renderRecord}
          contentContainerStyle={[styles.listContent, {paddingBottom: insets.bottom + SPACING.xl}]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {/* Summary Cards */}
              <View style={styles.summaryRow}>
                <View style={[styles.summaryCard, {backgroundColor: COLORS.primary + '15'}]}>
                  <Text style={[styles.summaryValue, {color: COLORS.primary}]}>{summary.total_days}</Text>
                  <Text style={[styles.summaryLabel, {color: COLORS.textSecondary}]}>Total Days</Text>
                </View>
                <View style={[styles.summaryCard, {backgroundColor: COLORS.success + '15'}]}>
                  <Text style={[styles.summaryValue, {color: COLORS.success}]}>{summary.this_month}</Text>
                  <Text style={[styles.summaryLabel, {color: COLORS.textSecondary}]}>This Month</Text>
                </View>
                <View style={[styles.summaryCard, {backgroundColor: COLORS.info + '15'}]}>
                  <Text style={[styles.summaryValue, {color: COLORS.info}]}>
                    {summary.last_check_in ? dayjs(summary.last_check_in).format('DD MMM') : '—'}
                  </Text>
                  <Text style={[styles.summaryLabel, {color: COLORS.textSecondary}]}>Last Visit</Text>
                </View>
              </View>

              {/* Calendar */}
              <View style={[styles.calendarCard, {backgroundColor: cardBg}]}>
                <Text style={[styles.calendarTitle, {color: textColor}]}>
                  {currentMonth.format('MMMM YYYY')}
                </Text>
                <View style={styles.weekRow}>
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                    <Text key={d} style={[styles.weekDay, {color: COLORS.textSecondary}]}>{d}</Text>
                  ))}
                </View>
                <View style={styles.calGrid}>
                  {calendarCells.map((day, idx) => {
                    if (!day) return <View key={`empty-${idx}`} style={styles.calCell} />;
                    const dateStr = currentMonth.date(day).format('YYYY-MM-DD');
                    const isAttended = attendedDates.has(dateStr);
                    const isToday = dayjs().date() === day;
                    return (
                      <View
                        key={day}
                        style={[
                          styles.calCell,
                          isAttended && {backgroundColor: COLORS.success},
                          isToday && !isAttended && {borderWidth: 1.5, borderColor: COLORS.primary},
                        ]}>
                        <Text
                          style={[
                            styles.calDay,
                            {color: isAttended ? '#FFF' : isToday ? COLORS.primary : textColor},
                          ]}>
                          {day}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              <Text style={[styles.sectionTitle, {color: textColor}]}>Recent Visits</Text>
            </>
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <MaterialCommunityIcons name="calendar-blank" size={56} color={COLORS.textSecondary} />
              <Text style={[styles.emptyText, {color: COLORS.textSecondary}]}>No attendance records yet</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
    elevation: 2,
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  backBtn: {width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center'},
  headerTitle: {flex: 1},
  title: {fontSize: 18, fontWeight: '700'},
  subtitle: {fontSize: 12, marginTop: 1},
  listContent: {paddingHorizontal: SPACING.md, paddingTop: SPACING.sm},
  summaryRow: {flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md},
  summaryCard: {flex: 1, borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, alignItems: 'center'},
  summaryValue: {fontSize: 22, fontWeight: '800'},
  summaryLabel: {fontSize: 11, marginTop: 2, fontWeight: '500'},
  calendarCard: {borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, elevation: 1},
  calendarTitle: {fontSize: 15, fontWeight: '700', marginBottom: SPACING.sm},
  weekRow: {flexDirection: 'row', justifyContent: 'space-around', marginBottom: SPACING.xs},
  weekDay: {fontSize: 11, fontWeight: '600', width: 32, textAlign: 'center'},
  calGrid: {flexDirection: 'row', flexWrap: 'wrap'},
  calCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    marginVertical: 2,
  },
  calDay: {fontSize: 12, fontWeight: '600'},
  sectionTitle: {fontSize: 15, fontWeight: '700', marginBottom: SPACING.sm},
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xs,
    elevation: 1,
  },
  dateDot: {width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center'},
  recordInfo: {flex: 1},
  recordDate: {fontSize: 13, fontWeight: '700'},
  recordTime: {fontSize: 11, marginTop: 2},
  duration: {fontSize: 13, fontWeight: '700'},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, paddingTop: SPACING.xxl},
  emptyText: {fontSize: 13, marginTop: SPACING.sm},
});

export default AttendanceHistoryScreen;
