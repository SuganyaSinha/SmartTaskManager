import api from './api';
import { ProductivityStats } from '../types/analytics';

export const getProductivityStats = async (
  period: 'day' | 'week' | 'month',
  date: Date,
  timeZone?: string
): Promise<ProductivityStats> => {
  try {
    const response = await api.get('/api/analytics/productivity', {
      params: {
        period,
        date: date.toISOString(),
        timeZone: timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    });
    return response.data;
  } catch (error) {
    console.error('getProductivityStats API call failed:', error);
    throw error;
  }
};
