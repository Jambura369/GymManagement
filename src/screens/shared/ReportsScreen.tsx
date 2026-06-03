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
import {Card} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {LineChart, BarChart, PieChart} from 'react-native-chart-kit';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';

import {useAuthStore} from '../../store/authStore';
import {useThemeStore} from '../../store/themeStore';
import {COLORS, SPACING, BORDER_RADIUS, EXPENSE_CATEGORY_COLORS} from '../../constants';
import {getMonthlyRevenue} from '../../services/dashboardService';
import {getExpenseSummary} from '../../services/expenseService';
import {getSalaryTotal} from '../../services/salaryService';
import AppHeader from '../../components/common/AppHeader';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - SPACING.md * 4;

const REPORT_TABS = ['Revenue', 'Expenses', 'Profit'];
const DATE_RANGES = ['This Month', 'Last 3 Months', 'Last 6 Months', 'This Year'];

const ReportsScreen: React.FC = () => {
  const navigation = useNavigation();
  const {gym} = useAuthStore();
  const {isDark} = useThemeStore();

  const [activeTab, setActiveTab] = useState('Revenue');
  const [dateRange, setDateRange] = useState('Last 6 Months');
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [expenseSummary, setExpenseSummary] = useState<{total: number; by_category: Record<string, number>}>({total: 0, by_category: {}});
  const [salaryTotal, setSalaryTotal] = useState(0);
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);

  const bgColor = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const cardBg = isDark ? COLORS.cardDark : COLORS.card;

  const getDateRange = () => {
    const now = dayjs();
    switch (dateRange) {
      case 'This Month':
        return {
          from: now.startOf('month').format('YYYY-MM-DD'),
          to: now.endOf('month').format('YYYY-MM-DD'),
          months: 1,
        };
      case 'Last 3 Months': {
        // Align with the monthly chart: start of the month 3 months ago → end of current month
        const start = now.subtract(2, 'month').startOf('month');
        return {
          from: start.format('YYYY-MM-DD'),
          to: now.endOf('month').format('YYYY-MM-DD'),
          months: 3,
        };
      }
      case 'This Year':
        return {
          from: now.startOf('year').format('YYYY-MM-DD'),
          to: now.endOf('year').format('YYYY-MM-DD'),
          months: now.month() + 1,
        };
      default: {
        // Last 6 Months: start of the month 6 months ago → end of current month
        const start = now.subtract(5, 'month').startOf('month');
        return {
          from: start.format('YYYY-MM-DD'),
          to: now.endOf('month').format('YYYY-MM-DD'),
          months: 6,
        };
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [dateRange, gym]);

  const loadData = async () => {
    if (!gym) return;
    setLoading(true);
    const {from, to, months} = getDateRange();
    const [revRes, expRes, salRes] = await Promise.all([
      getMonthlyRevenue(gym.id, months),
      getExpenseSummary(gym.id, from, to),
      getSalaryTotal(gym.id, from, to),
    ]);
    if (revRes.data) setRevenueData(revRes.data);
    if (expRes.data) setExpenseSummary(expRes.data);
    if (salRes.data !== null) setSalaryTotal(salRes.data);
    setLoading(false);
  };

  const totalRevenue = revenueData.reduce((s, d) => s + Number(d.revenue || 0), 0);
  const totalExpense = expenseSummary.total;
  const profit = totalRevenue - totalExpense - salaryTotal;

  const chartConfig = {
    backgroundColor: cardBg,
    backgroundGradientFrom: cardBg,
    backgroundGradientTo: cardBg,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(108, 99, 255, ${opacity})`,
    labelColor: () => isDark ? COLORS.textDark : COLORS.text,
    style: {borderRadius: 16},
    propsForDotsFill: {r: '4', strokeWidth: '2', stroke: COLORS.primary},
  };

  const revenueChartData = {
    labels: revenueData.map(d => d.month_label || ''),
    datasets: [{data: revenueData.map(d => Number(d.revenue || 0)), color: () => COLORS.primary}],
  };

  const pieData = Object.entries(expenseSummary.by_category).map(([cat, amount]) => ({
    name: cat,
    population: amount,
    color: EXPENSE_CATEGORY_COLORS[cat] || '#9E9E9E',
    legendFontColor: isDark ? COLORS.textDark : COLORS.text,
    legendFontSize: 12,
  }));

  return (
    <View style={[styles.container, {backgroundColor: bgColor}]}>
      <AppHeader title="Reports" onBack={() => navigation.goBack()} isDark={isDark} />

      <ScrollView contentContainerStyle={[styles.content, {paddingBottom: SPACING.xxl + insets.bottom}]} showsVerticalScrollIndicator={false}>

        {/* Date Range Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
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
                    : {
                        backgroundColor: isDark ? COLORS.cardDark : '#F3F4F6',
                        borderColor: isDark ? COLORS.border : '#E5E7EB',
                      },
                ]}>
                <Text
                  style={[
                    styles.filterTabText,
                    {
                      color: isActive ? '#FFF' : isDark ? COLORS.textDark : '#374151',
                      fontWeight: isActive ? '700' : '500',
                    },
                  ]}>
                  {range}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <Card style={[styles.summaryCard, {backgroundColor: COLORS.success}]}>
            <Card.Content style={styles.summaryContent}>
              <MaterialCommunityIcons name="trending-up" size={20} color="#FFF" />
              <Text style={styles.summaryLabel}>Revenue</Text>
              <Text style={styles.summaryValue}>₹{totalRevenue.toLocaleString('en-IN')}</Text>
            </Card.Content>
          </Card>
          <Card style={[styles.summaryCard, {backgroundColor: COLORS.error}]}>
            <Card.Content style={styles.summaryContent}>
              <MaterialCommunityIcons name="trending-down" size={20} color="#FFF" />
              <Text style={styles.summaryLabel}>Expense + Salary</Text>
              <Text style={styles.summaryValue}>₹{(totalExpense + salaryTotal).toLocaleString('en-IN')}</Text>
            </Card.Content>
          </Card>
          <Card style={[styles.summaryCard, {backgroundColor: profit >= 0 ? COLORS.primary : COLORS.warning}]}>
            <Card.Content style={styles.summaryContent}>
              <MaterialCommunityIcons name="cash" size={20} color="#FFF" />
              <Text style={styles.summaryLabel}>Profit</Text>
              <Text style={styles.summaryValue}>₹{profit.toLocaleString('en-IN')}</Text>
            </Card.Content>
          </Card>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {REPORT_TABS.map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && {borderBottomWidth: 2, borderBottomColor: COLORS.primary}]}
              onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabText, {color: activeTab === tab ? COLORS.primary : COLORS.textSecondary}]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Revenue Chart */}
        {activeTab === 'Revenue' && revenueData.length > 0 && (
          <Card style={[styles.chartCard, {backgroundColor: cardBg}]}>
            <Card.Title title="Monthly Revenue" titleVariant="titleMedium" />
            <Card.Content>
              <LineChart
                data={revenueChartData}
                width={CHART_WIDTH}
                height={200}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                yAxisLabel="₹"
                yAxisSuffix=""
                fromZero
              />
            </Card.Content>
          </Card>
        )}

        {/* Expense Breakdown */}
        {activeTab === 'Expenses' && (
          <>
            {pieData.length > 0 ? (
              <Card style={[styles.chartCard, {backgroundColor: cardBg}]}>
                <Card.Title title="Expense by Category" titleVariant="titleMedium" />
                <Card.Content>
                  <PieChart
                    data={pieData}
                    width={CHART_WIDTH}
                    height={180}
                    chartConfig={chartConfig}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="15"
                    absolute={false}
                  />
                </Card.Content>
              </Card>
            ) : null}

            {Object.entries(expenseSummary.by_category).map(([cat, amount]) => (
              <Card key={cat} style={[styles.categoryCard, {backgroundColor: cardBg}]}>
                <Card.Content style={styles.categoryContent}>
                  <View style={[styles.catDot, {backgroundColor: EXPENSE_CATEGORY_COLORS[cat] || '#9E9E9E'}]} />
                  <Text style={[styles.catName, {color: textColor}]}>{cat}</Text>
                  <Text style={[styles.catAmount, {color: EXPENSE_CATEGORY_COLORS[cat]}]}>
                    ₹{Number(amount).toLocaleString('en-IN')}
                  </Text>
                </Card.Content>
              </Card>
            ))}

            <Card style={[styles.categoryCard, {backgroundColor: cardBg}]}>
              <Card.Content style={styles.categoryContent}>
                <View style={[styles.catDot, {backgroundColor: COLORS.trainerColor}]} />
                <Text style={[styles.catName, {color: textColor}]}>Trainer Salaries</Text>
                <Text style={[styles.catAmount, {color: COLORS.trainerColor}]}>
                  ₹{salaryTotal.toLocaleString('en-IN')}
                </Text>
              </Card.Content>
            </Card>
          </>
        )}

        {/* Profit Summary */}
        {activeTab === 'Profit' && (
          <Card style={[styles.chartCard, {backgroundColor: cardBg}]}>
            <Card.Title title="Profit Breakdown" titleVariant="titleMedium" />
            <Card.Content>
              {[
                {label: 'Total Revenue', value: totalRevenue, color: COLORS.success, icon: 'trending-up'},
                {label: 'Total Expenses', value: -totalExpense, color: COLORS.error, icon: 'cash-minus'},
                {label: 'Trainer Salaries', value: -salaryTotal, color: COLORS.warning, icon: 'account-tie'},
                {label: 'Net Profit', value: profit, color: profit >= 0 ? COLORS.primary : COLORS.error, icon: 'cash'},
              ].map((item, idx) => (
                <View key={idx} style={styles.profitRow}>
                  <MaterialCommunityIcons name={item.icon} size={20} color={item.color} />
                  <Text style={[styles.profitLabel, {color: textColor}]}>{item.label}</Text>
                  <Text style={[styles.profitValue, {color: item.color}]}>
                    {item.value < 0 ? '-' : ''}₹{Math.abs(item.value).toLocaleString('en-IN')}
                  </Text>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {padding: SPACING.md},
  filterScroll: {flexGrow: 0, flexShrink: 0, marginBottom: SPACING.sm},
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: SPACING.xs,
    alignItems: 'center',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterTabActive: {backgroundColor: COLORS.primary, borderColor: COLORS.primary},
  filterTabText: {fontSize: 13},
  summaryRow: {flexDirection: 'row', gap: SPACING.xs, marginBottom: SPACING.md},
  summaryCard: {flex: 1, borderRadius: BORDER_RADIUS.md, elevation: 2},
  summaryContent: {alignItems: 'center', padding: SPACING.xs, gap: 2},
  summaryLabel: {color: 'rgba(255,255,255,0.8)', fontSize: 9, fontWeight: '600', textAlign: 'center'},
  summaryValue: {color: '#FFF', fontSize: 13, fontWeight: '800'},
  tabRow: {flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: SPACING.md},
  tab: {flex: 1, alignItems: 'center', paddingVertical: SPACING.sm},
  tabText: {fontSize: 14, fontWeight: '600'},
  chartCard: {borderRadius: BORDER_RADIUS.lg, marginBottom: SPACING.md, elevation: 2},
  chart: {borderRadius: BORDER_RADIUS.md},
  categoryCard: {borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.xs, elevation: 1},
  categoryContent: {flexDirection: 'row', alignItems: 'center', gap: SPACING.sm},
  catDot: {width: 12, height: 12, borderRadius: 6},
  catName: {flex: 1, fontSize: 14},
  catAmount: {fontSize: 15, fontWeight: '700'},
  profitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  profitLabel: {flex: 1, fontSize: 14},
  profitValue: {fontSize: 16, fontWeight: '700'},
});

export default ReportsScreen;
