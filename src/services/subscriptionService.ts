import {apiClient} from './apiClient';
import {ApiResponse, SubscriptionPlan} from '../types';

export type BillingCycle = 'monthly' | 'annual';

interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
}

interface UpgradeOrderResponse {
  order: RazorpayOrder;
  key: string;
  plan: SubscriptionPlan;
  price: number;
  originalPrice: number;
  couponDiscount: number;
  billingCycle: BillingCycle;
  renewsAt: string;
}

export const createUpgradeOrder = async (
  planId: string,
  billingCycle: BillingCycle,
  couponCode?: string,
): Promise<ApiResponse<UpgradeOrderResponse>> => {
  try {
    const {data} = await apiClient.post<UpgradeOrderResponse>('/subscriptions/upgrade', {
      plan_id: planId,
      billing_cycle: billingCycle,
      coupon_code: couponCode,
    });
    return {data, error: null};
  } catch (err: any) {
    return {data: null, error: err.response?.data?.message ?? err.message};
  }
};

export const confirmPayment = async (
  planId: string,
  billingCycle: BillingCycle,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
): Promise<ApiResponse<{success: boolean}>> => {
  try {
    const {data} = await apiClient.post('/subscriptions/activate', {
      plan_id: planId,
      billing_cycle: billingCycle,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
    });
    return {data, error: null};
  } catch (err: any) {
    return {data: null, error: err.response?.data?.message ?? err.message};
  }
};
