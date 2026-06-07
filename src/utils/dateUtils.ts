import dayjs from 'dayjs';

export interface ExpiryInfo {
  label: string;
  isExpired: boolean;
}

export const formatExpiryLabel = (expiryDate: string): ExpiryInfo => {
  const today = dayjs().startOf('day');
  const expiry = dayjs(expiryDate).startOf('day');
  const diffDays = expiry.diff(today, 'day');

  if (diffDays === 0) return {label: 'Expires today!', isExpired: false};

  if (diffDays > 0) {
    if (diffDays < 30) {
      return {label: `Expires in ${diffDays} day${diffDays === 1 ? '' : 's'}`, isExpired: false};
    }
    const m = Math.floor(diffDays / 30);
    const d = diffDays % 30;
    const label = d > 0
      ? `Expires in ${m}m ${d}d`
      : `Expires in ${m} month${m > 1 ? 's' : ''}`;
    return {label, isExpired: false};
  }

  const abs = Math.abs(diffDays);
  if (abs < 30) {
    return {label: `Expired ${abs} day${abs === 1 ? '' : 's'} ago`, isExpired: true};
  }
  const m = Math.floor(abs / 30);
  const d = abs % 30;
  const label = d > 0
    ? `Expired ${m}m ${d}d ago`
    : `Expired ${m} month${m > 1 ? 's' : ''} ago`;
  return {label, isExpired: true};
};
