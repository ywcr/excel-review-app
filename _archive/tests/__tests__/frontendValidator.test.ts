import { FrontendExcelValidator } from "../frontendValidator";
import { TASK_TEMPLATES } from "../validationRules";
import * as XLSX from "xlsx";

describe("FrontendValidator Complex Rules", () => {
  let validator: FrontendExcelValidator;

  beforeEach(() => {
    const template = TASK_TEMPLATES["药店拜访"];
    validator = new FrontendExcelValidator(template);
  });

  // 创建测试用的Excel工作簿
  const createTestWorkbook = (data: any[][]) => {
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    return wb;
  };

  describe("Unique Rule Validation", () => {
    it("should detect duplicate values in unique fields", async () => {
      const testData = [
        ["零售渠道", "实施人", "拜访开始时间", "拜访结束时间"],
        ["药店A", "张三", "2024-01-01 09:00", "2024-01-01 10:00"],
        ["药店A", "李四", "2024-01-01 11:00", "2024-01-01 12:00"], // 重复的零售渠道
        ["药店B", "张三", "2024-01-02 09:00", "2024-01-02 10:00"],
      ];

      const workbook = createTestWorkbook(testData);
      validator.loadWorkbook(workbook);
      const result = await validator.validate("Sheet1");

      // 应该检测到重复的零售渠道
      const uniqueErrors = result.errors.filter(
        (error) => error.errorType === "unique"
      );
      expect(uniqueErrors.length).toBeGreaterThan(0);
      expect(uniqueErrors[0].field).toBe("retailChannel");
    });
  });

  describe("Frequency Rule Validation", () => {
    it("should detect frequency violations", async () => {
      const testData = [
        ["零售渠道", "实施人", "拜访开始时间", "拜访结束时间"],
        ["药店A", "张三", "2024-01-01 09:00", "2024-01-01 10:00"],
        ["药店B", "张三", "2024-01-01 11:00", "2024-01-01 12:00"],
        ["药店C", "张三", "2024-01-01 13:00", "2024-01-01 14:00"],
        ["药店D", "张三", "2024-01-01 15:00", "2024-01-01 16:00"],
        ["药店E", "张三", "2024-01-01 17:00", "2024-01-01 18:00"],
        ["药店F", "张三", "2024-01-01 18:00", "2024-01-01 19:00"], // 超过每日5家限制
      ];

      const workbook = createTestWorkbook(testData);
      validator.loadWorkbook(workbook);
      const result = await validator.validate("Sheet1");

      // 应该检测到频次超限
      const frequencyErrors = result.errors.filter(
        (error) => error.errorType === "frequency"
      );
      expect(frequencyErrors.length).toBeGreaterThan(0);
    });
  });

  describe("Date Interval Rule Validation", () => {
    it("should detect date interval violations", async () => {
      const testData = [
        ["零售渠道", "实施人", "拜访开始时间", "对接人"],
        ["药店A", "张三", "2024-01-01 09:00", "王经理"],
        ["药店B", "张三", "2024-01-03 09:00", "王经理"], // 间隔不足7天
        ["药店C", "张三", "2024-01-10 09:00", "李经理"], // 不同对接人，应该没问题
      ];

      const workbook = createTestWorkbook(testData);
      validator.loadWorkbook(workbook);
      const result = await validator.validate("Sheet1");

      // 应该检测到日期间隔违规
      const intervalErrors = result.errors.filter(
        (error) => error.errorType === "dateInterval"
      );
      expect(intervalErrors.length).toBeGreaterThan(0);
    });
  });

  describe("Time Range Rule Validation", () => {
    it("should detect time range violations", async () => {
      const testData = [
        ["零售渠道", "实施人", "拜访开始时间", "拜访结束时间"],
        ["药店A", "张三", "2024-01-01 07:00", "2024-01-01 08:00"], // 早于8点
        ["药店B", "张三", "2024-01-01 20:00", "2024-01-01 21:00"], // 晚于19点
        ["药店C", "张三", "2024-01-01 10:00", "2024-01-01 11:00"], // 正常时间
      ];

      const workbook = createTestWorkbook(testData);
      validator.loadWorkbook(workbook);
      const result = await validator.validate("Sheet1");

      // 应该检测到时间范围违规
      const timeRangeErrors = result.errors.filter(
        (error) => error.errorType === "timeRange"
      );
      expect(timeRangeErrors.length).toBe(2); // 两个时间范围错误
    });
  });

  describe("Duration Rule Validation", () => {
    it("should detect duration violations", async () => {
      const testData = [
        ["零售渠道", "实施人", "拜访开始时间", "拜访持续时间"],
        ["药店A", "张三", "2024-01-01 09:00", "30"], // 少于60分钟
        ["药店B", "张三", "2024-01-01 11:00", "90"], // 正常时长
        ["药店C", "张三", "2024-01-01 13:00", "45"], // 少于60分钟
      ];

      const workbook = createTestWorkbook(testData);
      validator.loadWorkbook(workbook);
      const result = await validator.validate("Sheet1");

      // 应该检测到持续时间违规
      const durationErrors = result.errors.filter(
        (error) => error.errorType === "duration"
      );
      expect(durationErrors.length).toBe(2); // 两个持续时间错误
    });
  });

  describe("Required Field Validation", () => {
    it("should detect missing required fields", async () => {
      const testData = [
        ["零售渠道", "实施人", "拜访开始时间", "拜访结束时间"],
        ["", "张三", "2024-01-01 09:00", "2024-01-01 10:00"], // 缺少零售渠道
        ["药店B", "", "2024-01-01 11:00", "2024-01-01 12:00"], // 缺少实施人
        ["药店C", "张三", "2024-01-01 13:00", "2024-01-01 14:00"], // 正常
      ];

      const workbook = createTestWorkbook(testData);
      validator.loadWorkbook(workbook);
      const result = await validator.validate("Sheet1");

      // 应该检测到必填字段缺失
      const requiredErrors = result.errors.filter(
        (error) => error.errorType === "required"
      );
      expect(requiredErrors.length).toBe(2); // 两个必填字段错误
    });
  });
});
