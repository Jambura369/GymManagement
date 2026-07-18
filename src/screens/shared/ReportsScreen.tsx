import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {LineChart, PieChart} from 'react-native-chart-kit';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';

import {useAuthStore} from '../../store/authStore';
import {useFeature} from '../../hooks/useFeature';
import {EXPENSE_CATEGORY_COLORS} from '../../constants';
import {COLORS, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING} from '../../theme';
import {getRevenueByDateRange} from '../../services/dashboardService';
import {getExpenseSummary} from '../../services/expenseService';
import {getSalaryTotal} from '../../services/salaryService';
import {supabase} from '../../supabase/client';
import AppHeader from '../../components/common/AppHeader';
import DatePickerModal from '../../components/common/DatePickerModal';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - SPACING.md * 4;

const DATE_RANGES = ['Today', 'This Week', 'This Month', 'Custom'];
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const ReportsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {gym} = useAuthStore();
  const {hasAccess} = useFeature('basic_reports');

  useEffect(() => {
    if (!hasAccess) {
      navigation.replace('FeatureLocked', {
        featureName: 'Reports & Analytics',
        featureIcon: 'chart-bar',
        requiredPlan: 'starter',
        description: 'Detailed reports and analytics are available from the Starter plan.',
      });
    }
  }, [hasAccess, navigation]);

  if (!hasAccess) return null;

  const [dateRange, setDateRange] = useState('This Week');
  const [customFrom, setCustomFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [customTo, setCustomTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [pickerFor, setPickerFor] = useState<'from' | 'to' | null>(null);

  const [weeklyChart, setWeeklyChart] = useState<{labels: string[]; values: number[]} | null>(null);
  const [singleRevenue, setSingleRevenue] = useState(0);
  const [expenseSummary, setExpenseSummary] = useState<{total: number; by_category: Record<string, number>}>({total: 0, by_category: {}});
  const [salaryTotal, setSalaryTotal] = useState(0);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  const getFrom = () => {
    const now = dayjs();
    if (dateRange === 'Today') return now.format('YYYY-MM-DD');
    if (dateRange === 'This Week') return now.startOf('week').format('YYYY-MM-DD');
    if (dateRange === 'This Month') return now.startOf('month').format('YYYY-MM-DD');
    return customFrom;
  };

  const getTo = () => {
    const now = dayjs();
    if (dateRange === 'Today') return now.format('YYYY-MM-DD');
    if (dateRange === 'This Week') return now.endOf('week').format('YYYY-MM-DD');
    if (dateRange === 'This Month') return now.endOf('month').format('YYYY-MM-DD');
    return customTo;
  };

  useEffect(() => {
    loadData();
  }, [dateRange, gym, customFrom, customTo]);

  const loadData = async () => {
    if (!gym) return;
    setLoading(true);
    const from = getFrom();
    const to = getTo();

    if (dateRange === 'This Week') {
      const [paymentsRes, expRes, salRes, recentRes] = await Promise.all([
        supabase.from('payments').select('amount, payment_date').eq('gym_id', gym.id)
          .gte('payment_date', from).lte('payment_date', to),
        getExpenseSummary(gym.id, from, to),
        getSalaryTotal(gym.id, from, to),
        supabase.from('payments')
          .select('id, amount, payment_date, payment_method, students(name)')
          .eq('gym_id', gym.id).order('payment_date', {ascending: false}).limit(5),
      ]);

      if (paymentsRes.data) {
        const byDay: Record<string, number> = {};
        WEEK_DAYS.forEach(d => { byDay[d] = 0; });
        paymentsRes.data.forEach(p => {
          const day = dayjs(p.payment_date).format('ddd');
          if (byDay[day] !== undefined) byDay[day] += Number(p.amount);
        });
        const values = WEEK_DAYS.map(d => byDay[d]);
        setSingleRevenue(values.reduce((s, v) => s + v, 0));
        setWeeklyChart({labels: WEEK_DAYS, values});
      }
      if (expRes.data) setExpenseSummary(expRes.data);
      if (salRes.data !== null) setSalaryTotal(salRes.data);
      if (recentRes.data) setRecentPayments(recentRes.data);
    } else {
      const [revRes, expRes, salRes, recentRes] = await Promise.all([
        getRevenueByDateRange(gym.id, from, to),
        getExpenseSummary(gym.id, from, to),
        getSalaryTotal(gym.id, from, to),
        supabase.from('payments')
          .select('id, amount, payment_date, payment_method, students(name)')
          .eq('gym_id', gym.id).order('payment_date', {ascending: false}).limit(5),
      ]);

      setWeeklyChart(null);
      setSingleRevenue((revRes.data as number) ?? 0);
      if (expRes.data) setExpenseSummary(expRes.data);
      if (salRes.data !== null) setSalaryTotal(salRes.data);
      if (recentRes.data) setRecentPayments(recentRes.data);
    }
    setLoading(false);
  };

  const totalRevenue = singleRevenue;
  const totalExpense = expenseSummary.total + salaryTotal;
  const profit = totalRevenue - totalExpense;

  const chartConfig = {
    backgroundColor: COLORS.surface,
    backgroundGradientFrom: COLORS.surface,
    backgroundGradientTo: COLORS.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(108, 255, 149, ${opacity})`,
    labelColor: () => COLORS.textSecondary,
    style: {borderRadius: 16},
  };

  const revenueChartData = weeklyChart
    ? {labels: weeklyChart.labels, datasets: [{data: weeklyChart.values.map(v => v || 0), color: () => COLORS.primary, strokeWidth: 2}]}
    : null;

  const pieData = Object.entries(expenseSummary.by_category).map(([cat, amount]) => ({
    name: cat,
    population: amount as number,
    color: EXPENSE_CATEGORY_COLORS[cat] || '#9E9E9E',
    legendFontColor: COLORS.textPrimary,
    legendFontSize: 11,
  }));

  const rangeLabel =
    dateRange === 'Today' ? "Today's Revenue" :
    dateRange === 'This Week' ? "This Week's Revenue" :
    dateRange === 'This Month' ? "This Month's Revenue" :
    `${dayjs(customFrom).format('DD MMM')} – ${dayjs(customTo).format('DD MMM YYYY')}`;

  return (
    <View style={[styles.container, {backgroundColor: COLORS.background}]}>
      <AppHeader title="Reports & Analytics" onBack={() => navigation.goBack()} isDark />

      <ScrollView
        contentContainerStyle={[styles.content, {paddingBottom: SPACING.xxl + insets.bottom}]}
        showsVerticalScrollIndicator={false}>

        {/* Date Range Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}>
          {DATE_RANGES.map(range => {
            const isActive = dateRange === range;
            return (
              <TouchableOpacity
                key={range}
                onPress={() => setDateRange(range)}
                activeOpacity={0.75}
                style={[
                  styles.filterTab,
                  isActive
                    ? styles.filterTabActive
                    : {backgroundColor: COLORS.surface, borderColor: COLORS.border},
                ]}>
                <Text
                  style={[
                    styles.filterTabText,
                    {color: isActive ? '#0B0F0E' : COLORS.textPrimary, fontWeight: isActive ? '700' : '500'},
                  ]}>
                  {range}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Custom date pickers */}
        {dateRange === 'Custom' && (
          <View style={styles.customDateRow}>
            <TouchableOpacity
              style={[styles.customDateBtn, {backgroundColor: COLORS.surface}]}
              onPress={() => setPickerFor('from')}>
              <MaterialCommunityIcons name="calendar-start" size={16} color={COLORS.primary} />
              <Text style={[styles.customDateText, {color: COLORS.textPrimary}]}>
                {dayjs(customFrom).format('DD MMM YYYY')}
              </Text>
            </TouchableOpacity>
            <MaterialCommunityIcons name="arrow-right" size={16} color={COLORS.textSecondary} />
            <TouchableOpacity
              style={[styles.customDateBtn, {backgroundColor: COLORS.surface}]}
              onPress={() => setPickerFor('to')}>
              <MaterialCommunityIcons name="calendar-end" size={16} color={COLORS.primary} />
              <Text style={[styles.customDateText, {color: COLORS.textPrimary}]}>
                {dayjs(customTo).format('DD MMM YYYY')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Performance Overview */}
        <Text style={[styles.sectionTitle, {marginTop: SPACING.xs}]}>PERFORMANCE OVERVIEW</Text>

        {revenueChartData ? (
          <View style={styles.chartCard}>
            <LineChart
              data={revenueChartData}
              width={CHART_WIDTH}
              height={180}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              yAxisLabel="₹"
              yAxisSuffix=""
              fromZero
              withInnerLines={false}
              withOuterLines={false}
            />
          </View>
        ) : (
          <View style={styles.singleValueCard}>
            <MaterialCommunityIcons name="cash-check" size={28} color={COLORS.success} />
            <Text style={styles.singleValueLabel}>{rangeLabel}</Text>
            <Text style={[styles.singleValueAmount, {color: COLORS.success}]}>
              ₹{totalRevenue.toLocaleString('en-IN')}
            </Text>
          </View>
        )}

        {/* KPI Cards */}
        <View style={styles.kpiStack}>
          <View style={styles.kpiCard}>
            <View style={styles.kpiLeft}>
              <MaterialCommunityIcons name="trending-up" size={18} color={COLORS.success} />
              <Text style={styles.kpiLabel}>Total Revenue</Text>
            </View>
            <Text style={[styles.kpiValue, {color: COLORS.success}]}>
              ₹{totalRevenue.toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.kpiCard}>
            <View style={styles.kpiLeft}>
              <MaterialCommunityIcons name="trending-down" size={18} color={COLORS.error} />
              <Text style={styles.kpiLabel}>Total Expense</Text>
            </View>
            <Text style={[styles.kpiValue, {color: COLORS.error}]}>
              ₹{totalExpense.toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.kpiCard}>
            <View style={styles.kpiLeft}>
              <MaterialCommunityIcons
                name="cash"
                size={18}
                color={profit >= 0 ? COLORS.primary : COLORS.warning}
              />
              <Text style={styles.kpiLabel}>Net Profit</Text>
            </View>
            <Text style={[styles.kpiValue, {color: profit >= 0 ? COLORS.primary : COLORS.error}]}>
              {profit < 0 ? '-' : ''}₹{Math.abs(profit).toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {/* Expense Mix */}
        {(pieData.length > 0 || salaryTotal > 0) && (
          <>
            <Text style={styles.sectionTitle}>EXPENSE MIX</Text>
            <View style={styles.chartCard}>
              {pieData.length > 0 && (
                <PieChart
                  data={pieData}
                  width={CHART_WIDTH}
                  height={150}
                  chartConfig={chartConfig}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="10"
                  absolute={false}
                />
              )}
              {Object.entries(expenseSummary.by_category).map(([cat, amount]) => (
                <View key={cat} style={styles.expenseRow}>
                  <View style={[styles.catDot, {backgroundColor: EXPENSE_CATEGORY_COLORS[cat] || '#9E9E9E'}]} />
                  <Text style={styles.catName}>{cat}</Text>
                  <Text style={[styles.catAmount, {color: EXPENSE_CATEGORY_COLORS[cat] || '#9E9E9E'}]}>
                    ₹{Number(amount).toLocaleString('en-IN')}
                  </Text>
                </View>
              ))}
              {salaryTotal > 0 && (
                <View style={styles.expenseRow}>
                  <View style={[styles.catDot, {backgroundColor: '#39FF88'}]} />
                  <Text style={styles.catName}>Trainer Salaries</Text>
                  <Text style={[styles.catAmount, {color: '#39FF88'}]}>
                    ₹{salaryTotal.toLocaleString('en-IN')}
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* Recent Activity */}
        {recentPayments.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
            <View style={styles.activityCard}>
              {recentPayments.map((p, idx) => (
                <View
                  key={p.id}
                  style={[
                    styles.activityRow,
                    idx < recentPayments.length - 1 && styles.activityDivider,
                  ]}>
                  <View style={styles.activityIcon}>
                    <MaterialCommunityIcons name="cash-multiple" size={18} color={COLORS.success} />
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityName} numberOfLines={1}>
                      {p.students?.name || 'Member Subscription'}
                    </Text>
                    <Text style={styles.activityDate}>
                      {dayjs(p.payment_date).format('DD MMM, hh:mm A')}
                    </Text>
                  </View>
                  <Text style={styles.activityAmount}>
                    +₹{Number(p.amount).toLocaleString('en-IN')}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <DatePickerModal
        visible={pickerFor === 'from'}
        value={customFrom}
        onConfirm={date => {
          setCustomFrom(date);
          if (dayjs(date).isAfter(dayjs(customTo))) setCustomTo(date);
          setPickerFor(null);
        }}
        onCancel={() => setPickerFor(null)}
        isDark={true}
      />
      <DatePickerModal
        visible={pickerFor === 'to'}
        value={customTo}
        onConfirm={date => {
          setCustomTo(date);
          if (dayjs(date).isBefore(dayjs(customFrom))) setCustomFrom(date);
          setPickerFor(null);
        }}
        onCancel={() => setPickerFor(null)}
        isDark={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {padding: SPACING.md},

  filterScroll: {flexGrow: 0, marginBottom: SPACING.sm},
  filterRow: {flexDirection: 'row', gap: 8, paddingVertical: SPACING.xs},
  filterTab: {paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: 'transparent'},
  filterTabActive: {backgroundColor: COLORS.primary, borderColor: COLORS.primary},
  filterTabText: {fontSize: 13},

  customDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  customDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    elevation: 1,
  },
  customDateText: {fontSize: 13, fontWeight: '600'},

  sectionTitle: {
    fontSize: 11,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },

  chartCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  chart: {borderRadius: RADIUS.md, marginLeft: -SPACING.xs},

  singleValueCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  singleValueLabel: {fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, fontWeight: '600'},
  singleValueAmount: {fontSize: 36, fontWeight: '900'},

  kpiStack: {gap: SPACING.sm, marginBottom: SPACING.md},
  kpiCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kpiLeft: {flexDirection: 'row', alignItems: 'center', gap: SPACING.sm},
  kpiLabel: {fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, fontWeight: '600'},
  kpiValue: {fontSize: 20, fontWeight: FONT_WEIGHT.bold},

  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  catDot: {width: 10, height: 10, borderRadius: 5},
  catName: {flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.textPrimary},
  catAmount: {fontSize: 14, fontWeight: '700'},

  activityCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  activityDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a2e20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityInfo: {flex: 1},
  activityName: {fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textPrimary},
  activityDate: {fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2},
  activityAmount: {fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.success},
});

export default ReportsScreen;
