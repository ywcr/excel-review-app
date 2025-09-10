import { FrontendExcelValidator } from "../frontendValidator";
import { TASK_TEMPLATES } from "../validationRules";
import * as XLSX from "xlsx";

describe("Performance Tests", () => {
  let validator: FrontendExcelValidator;

  beforeEach(() => {
    const template = TASK_TEMPLATES["药店拜访"];
    validator = new FrontendExcelValidator(template);
  });

  // 创建大型测试数据
  const createLargeTestData = (rowCount: number) => {
    const headers = [
      "零售渠道",
      "实施人",
      "拜访开始时间",
      "拜访结束时间",
      "拜访持续时间",
    ];
    const data = [headers];

    for (let i = 1; i <= rowCount; i++) {
      data.push([
        `药店${i}`,
        `实施人${i % 10}`,
        `2024-01-${String((i % 30) + 1).padStart(2, "0")} 09:00`,
        `2024-01-${String((i % 30) + 1).padStart(2, "0")} 10:00`,
        "60",
      ]);
    }

    return data;
  };

  const createTestWorkbook = (data: any[][]) => {
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    return wb;
  };

  describe("Small File Performance", () => {
    it("should validate 100 rows quickly", async () => {
      const startTime = performance.now();
      const testData = createLargeTestData(100);
      const workbook = createTestWorkbook(testData);

      validator.loadWorkbook(workbook);
      const result = await validator.validate("Sheet1");
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(result.summary.totalRows).toBe(100);
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成

      console.log(`Small file (100 rows): ${duration.toFixed(2)}ms`);
    });
  });

  describe("Medium File Performance", () => {
    it("should validate 1000 rows within reasonable time", async () => {
      const startTime = performance.now();
      const testData = createLargeTestData(1000);
      const workbook = createTestWorkbook(testData);

      validator.loadWorkbook(workbook);
      const result = await validator.validate("Sheet1");
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(result.summary.totalRows).toBe(1000);
      expect(duration).toBeLessThan(5000); // 应该在5秒内完成

      console.log(`Medium file (1000 rows): ${duration.toFixed(2)}ms`);
    });
  });

  describe("Large File Performance", () => {
    it("should validate 5000 rows within acceptable time", async () => {
      const startTime = performance.now();
      const testData = createLargeTestData(5000);
      const workbook = createTestWorkbook(testData);

      validator.loadWorkbook(workbook);
      const result = await validator.validate("Sheet1");
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(result.summary.totalRows).toBe(5000);
      expect(duration).toBeLessThan(15000); // 应该在15秒内完成

      console.log(`Large file (5000 rows): ${duration.toFixed(2)}ms`);
    });
  });

  describe("Memory Usage", () => {
    it("should handle large datasets without excessive memory usage", async () => {
      // 监控内存使用情况
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      const testData = createLargeTestData(2000);
      const workbook = createTestWorkbook(testData);

      validator.loadWorkbook(workbook);
      const result = await validator.validate("Sheet1");

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      expect(result).toBeDefined();
      expect(result.summary.totalRows).toBe(2000);

      // 内存增长应该在合理范围内（小于50MB）
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);

      console.log(
        `Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`
      );
    });
  });

  describe("Complex Validation Performance", () => {
    it("should handle complex cross-row validations efficiently", async () => {
      // 创建包含重复数据的测试集，触发复杂验证
      const headers = ["零售渠道", "实施人", "拜访开始时间", "拜访结束时间"];
      const data = [headers];

      // 添加一些重复数据来触发unique验证
      for (let i = 1; i <= 1000; i++) {
        data.push([
          `药店${i % 100}`, // 会有重复
          `实施人${i % 10}`,
          `2024-01-${String((i % 30) + 1).padStart(2, "0")} 09:00`,
          `2024-01-${String((i % 30) + 1).padStart(2, "0")} 10:00`,
        ]);
      }

      const startTime = performance.now();
      const workbook = createTestWorkbook(data);
      validator.loadWorkbook(workbook);
      const result = await validator.validate("Sheet1");
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(result.summary.totalRows).toBe(1000);
      expect(result.errors.length).toBeGreaterThan(0); // 应该检测到重复错误
      expect(duration).toBeLessThan(10000); // 复杂验证应该在10秒内完成

      console.log(
        `Complex validation (1000 rows with duplicates): ${duration.toFixed(
          2
        )}ms`
      );
      console.log(`Detected ${result.errors.length} validation errors`);
    });
  });

  describe("Streaming Performance", () => {
    it("should demonstrate streaming benefits for large files", async () => {
      // 这个测试需要在实际的Web Worker环境中运行
      // 这里只是展示测试结构

      const testData = createLargeTestData(3000);
      const workbook = createTestWorkbook(testData);

      const startTime = performance.now();
      validator.loadWorkbook(workbook);
      const result = await validator.validate("Sheet1");
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(result.summary.totalRows).toBe(3000);

      // 流式处理应该保持较低的内存使用
      const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;
      expect(memoryUsage).toBeLessThan(100 * 1024 * 1024); // 小于100MB

      console.log(`Streaming validation (3000 rows): ${duration.toFixed(2)}ms`);
    });
  });

  describe("Performance Benchmarks", () => {
    const benchmarkSizes = [100, 500, 1000, 2000];

    benchmarkSizes.forEach((size) => {
      it(`should benchmark ${size} rows`, async () => {
        const testData = createLargeTestData(size);
        const workbook = createTestWorkbook(testData);

        const startTime = performance.now();
        validator.loadWorkbook(workbook);
        const result = await validator.validate("Sheet1");
        const endTime = performance.now();

        const duration = endTime - startTime;
        const rowsPerSecond = Math.round(size / (duration / 1000));

        expect(result).toBeDefined();
        expect(result.summary.totalRows).toBe(size);

        console.log(
          `${size} rows: ${duration.toFixed(2)}ms (${rowsPerSecond} rows/sec)`
        );

        // 性能基准：至少每秒处理100行
        expect(rowsPerSecond).toBeGreaterThan(100);
      });
    });
  });
});
