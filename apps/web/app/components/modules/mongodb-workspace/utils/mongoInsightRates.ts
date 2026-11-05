import type {
  MongoOpcounters,
  MongoOverviewInsight,
} from '#shared/types/instance-insights.types';

export type MongoOpcounterRates = MongoOpcounters & { total: number };

/**
 * Derives per-second rates from two cumulative `serverStatus.opcounters`
 * samples. Returns null for the first sample, or when the server restarted
 * (counters went backwards) so the UI never shows a negative spike.
 */
export function computeMongoOpcounterRates(
  previous: MongoOverviewInsight | undefined,
  current: MongoOverviewInsight
): MongoOpcounterRates | null {
  if (!previous?.opcounters || !current.opcounters) return null;

  const elapsedSeconds =
    (new Date(current.capturedAt).getTime() -
      new Date(previous.capturedAt).getTime()) /
    1000;
  if (!(elapsedSeconds > 0)) return null;

  const keys = Object.keys(current.opcounters) as (keyof MongoOpcounters)[];
  const rates = {} as MongoOpcounters;

  for (const key of keys) {
    const delta = current.opcounters[key] - previous.opcounters[key];
    if (delta < 0) return null;
    rates[key] = delta / elapsedSeconds;
  }

  return {
    ...rates,
    total: keys.reduce((sum, key) => sum + rates[key], 0),
  };
}
