import {supabase} from '../supabase/client';
import {DashboardStats, MonthlyChartData, ApiResponse} from '../types';

export const getDashboardStats = async (
  gymId: string,
): Promise<ApiResponse<DashboardStats>> => {
  try {
    const {data, error} = await supabase.rpc('get_dashboard_stats', {
      p_gym_id: gymId,
    });

    if (error) return {data: null, error: error.message};

    const stats = data as DashboardStats;
    stats.profit_this_month =
      stats.revenue_this_month -
      stats.expense_this_month -
      stats.salary_this_month;

    return {data: stats, error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};

export const getRevenueByDateRange = async (
  gymId: string,
  dateFrom: string,
  dateTo: string,
): Promise<ApiResponse<number>> => {
  try {
    const {data, error} = await supabase
      .from('payments')
      .select('amount')
      .eq('gym_id', gymId)
      .gte('payment_date', dateFrom)
      .lte('payment_date', dateTo);

    if (error) return {data: null, error: error.message};
    const total = data.reduce((sum, p) => sum + Number(p.amount), 0);
    return {data: total, error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};

export const getMonthlyRevenue = async (
  gymId: string,
  months: number = 6,
): Promise<ApiResponse<MonthlyChartData[]>> => {
  try {
    const {data, error} = await supabase.rpc('get_monthly_revenue', {
      p_gym_id: gymId,
      p_months: months,
    });

    if (error) return {data: null, error: error.message};
    return {data: data as MonthlyChartData[], error: null};
  } catch (err: any) {
    return {data: null, error: err.message};
  }
};
