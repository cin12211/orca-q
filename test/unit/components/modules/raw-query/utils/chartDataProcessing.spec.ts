import { describe, it, expect } from 'vitest';
import {
  processLinearChartData,
  processPieChartData,
  processHeatmapChartData,
  processRadarChartData,
} from '~/components/modules/raw-query/modules/chart-builder/utils/chartDataProcessing';

describe('Chart Data Processing Utilities', () => {
  const sampleData = [
    { category: 'A', value: 10, group: 'G1' },
    { category: 'A', value: 20, group: 'G2' },
    { category: 'B', value: 15, group: 'G1' },
    { category: 'B', value: 25, group: 'G2' },
    { category: 'C', value: 30, group: 'G1' },
    { category: 'A', value: 5, group: 'G1' }, // Duplicate category 'A' in 'G1'
  ];

  describe('processLinearChartData', () => {
    it('should aggregate sum correctly without grouping', () => {
      const result = processLinearChartData({
        rows: sampleData,
        xAxisField: 'category',
        yAxisField: 'value',
        aggregation: 'sum',
      });

      // Sum values for A: 10 + 20 + 5 = 35
      // Sum values for B: 15 + 25 = 40
      // Sum values for C: 30
      expect(result).toContainEqual({ x: 'A', y: 35, group: undefined });
      expect(result).toContainEqual({ x: 'B', y: 40, group: undefined });
      expect(result).toContainEqual({ x: 'C', y: 30, group: undefined });
      expect(result.length).toBe(3);
    });

    it('should aggregate count correctly with grouping', () => {
      const result = processLinearChartData({
        rows: sampleData,
        xAxisField: 'category',
        yAxisField: 'value',
        groupByField: 'group',
        aggregation: 'count',
      });

      // A in G1 has: 10, 5 -> count 2
      // A in G2 has: 20 -> count 1
      // B in G1 has: 15 -> count 1
      // B in G2 has: 25 -> count 1
      // C in G1 has: 30 -> count 1
      expect(result).toContainEqual({ x: 'A', y: 2, group: 'G1' });
      expect(result).toContainEqual({ x: 'A', y: 1, group: 'G2' });
      expect(result).toContainEqual({ x: 'B', y: 1, group: 'G1' });
      expect(result).toContainEqual({ x: 'B', y: 1, group: 'G2' });
      expect(result).toContainEqual({ x: 'C', y: 1, group: 'G1' });
    });

    it('should respect sorting and limiting options', () => {
      const result = processLinearChartData({
        rows: sampleData,
        xAxisField: 'category',
        yAxisField: 'value',
        aggregation: 'sum',
        sortBy: 'y-desc', // B (40), A (35), C (30)
        limitRows: 2,
      });

      expect(result[0]).toEqual({ x: 'B', y: 40, group: undefined });
      expect(result[1]).toEqual({ x: 'A', y: 35, group: undefined });
      expect(result.length).toBe(2);
    });
  });

  describe('processPieChartData', () => {
    it('should calculate pie slices correctly', () => {
      const result = processPieChartData({
        rows: sampleData,
        xAxisField: 'category',
        yAxisField: 'value',
        aggregation: 'avg',
        sortBy: 'x-asc',
      });

      // Avg for A: (10 + 20 + 5) / 3 = 11.6667
      // Avg for B: (15 + 25) / 2 = 20
      // Avg for C: 30 / 1 = 30
      expect(result[0]).toEqual({ name: 'A', value: 11.6667 });
      expect(result[1]).toEqual({ name: 'B', value: 20 });
      expect(result[2]).toEqual({ name: 'C', value: 30 });
    });
  });

  describe('processHeatmapChartData', () => {
    it('should build a 2D coordinate matrix', () => {
      const result = processHeatmapChartData({
        rows: sampleData,
        xAxisField: 'category',
        categoryYField: 'group',
        valueField: 'value',
      });

      expect(result.xData).toEqual(['A', 'B', 'C']);
      expect(result.yData).toEqual(['G1', 'G2']);
      // Data is [xIdx, yIdx, aggregatedValue]
      // A (x:0) G1 (y:0) -> sum: 10 + 5 = 15
      // A (x:0) G2 (y:1) -> sum: 20
      // B (x:1) G1 (y:0) -> sum: 15
      // B (x:1) G2 (y:1) -> sum: 25
      // C (x:2) G1 (y:0) -> sum: 30
      // C (x:2) G2 (y:1) -> sum: 0
      expect(result.data).toContainEqual([0, 0, 15]);
      expect(result.data).toContainEqual([0, 1, 20]);
      expect(result.data).toContainEqual([1, 0, 15]);
      expect(result.data).toContainEqual([1, 1, 25]);
      expect(result.data).toContainEqual([2, 0, 30]);
      expect(result.data).toContainEqual([2, 1, 0]);
    });
  });

  describe('processRadarChartData', () => {
    it('should build radar structures with automatic max scale padding', () => {
      const result = processRadarChartData({
        rows: sampleData,
        xAxisField: 'category',
        yAxisField: 'value',
        aggregation: 'max',
      });

      // Max values: A: 20, B: 25, C: 30
      expect(result.categories).toEqual(['A', 'B', 'C']);
      expect(result.values).toEqual([20, 25, 30]);
      // maxVal = max(20, 25, 30) * 1.1 = 33
      expect(result.maxVal).toBeCloseTo(33);
    });
  });
});
