import type { MongoInsightsSection } from '../types';

export const MONGO_INSIGHTS_REFRESH_INTERVAL_MS = 5000;

export const MONGO_INSIGHTS_ENDPOINTS: Record<MongoInsightsSection, string> = {
  overview: '/api/mongodb/instance-insights/overview',
};

export const MONGO_INSIGHTS_SECTIONS: {
  id: MongoInsightsSection;
  label: string;
}[] = [{ id: 'overview', label: 'Overview' }];
