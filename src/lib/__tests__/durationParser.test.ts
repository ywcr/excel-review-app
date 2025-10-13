import { FrontendExcelValidator } from "../frontendValidator";
import { TASK_TEMPLATES } from "../validationRules";

describe("Duration Parser", () => {
  let validator: FrontendExcelValidator;

  beforeEach(() => {
    // 使用药店拜访模板进行测试
    validator = new FrontendExcelValidator(TASK_TEMPLATES["药店拜访"]);
  });

  // 使用反射访问私有方法进行测试
  const parseDuration = (value: any): number | null => {
    return (validator as any).parseDuration(value);
  };

  describe("纯数字格式", () => {
    test("应该正确解析纯数字", () => {
      expect(parseDuration("60")).toBe(60);
      expect(parseDuration("100")).toBe(100);
      expect(parseDuration("0")).toBe(0);
    });

    test("应该正确解析小数", () => {
      expect(parseDuration("60.5")).toBe(60.5);
      expect(parseDuration("1.5")).toBe(1.5);
    });

    test("应该正确解析数字类型", () => {
      expect(parseDuration(60)).toBe(60);
      expect(parseDuration(100.5)).toBe(100.5);
    });
  });

  describe("带中文单位的格式", () => {
    test("应该正确解析'分钟'格式", () => {
      expect(parseDuration("60分钟")).toBe(60);
      expect(parseDuration("100分钟")).toBe(100);
      expect(parseDuration("90分钟")).toBe(90);
    });

    test("应该正确解析带空格的'分钟'格式", () => {
      expect(parseDuration("60 分钟")).toBe(60);
      expect(parseDuration("100 分钟")).toBe(100);
    });

    test("应该正确解析'分'格式", () => {
      expect(parseDuration("60分")).toBe(60);
      expect(parseDuration("90分")).toBe(90);
    });

    test("应该正确解析'小时'格式并转换为分钟", () => {
      expect(parseDuration("1小时")).toBe(60);
      expect(parseDuration("2小时")).toBe(120);
      expect(parseDuration("1.5小时")).toBe(90);
    });

    test("应该正确解析'时'格式", () => {
      expect(parseDuration("1时")).toBe(60);
      expect(parseDuration("2时")).toBe(120);
    });
  });

  describe("带英文单位的格式", () => {
    test("应该正确解析'min'格式", () => {
      expect(parseDuration("60min")).toBe(60);
      expect(parseDuration("90mins")).toBe(90);
      expect(parseDuration("60 minutes")).toBe(60);
    });

    test("应该正确解析'hour'格式并转换为分钟", () => {
      expect(parseDuration("1hour")).toBe(60);
      expect(parseDuration("2hours")).toBe(120);
      expect(parseDuration("1.5h")).toBe(90);
    });
  });

  describe("复合格式", () => {
    test("应该正确解析'小时+分钟'格式", () => {
      expect(parseDuration("1小时30分钟")).toBe(90);
      expect(parseDuration("2小时15分钟")).toBe(135);
    });

    test("应该正确解析简化的复合格式", () => {
      expect(parseDuration("1时30分")).toBe(90);
      expect(parseDuration("2时15分")).toBe(135);
    });

    test("应该正确解析英文复合格式", () => {
      expect(parseDuration("1h30m")).toBe(90);
      expect(parseDuration("2h15m")).toBe(135);
    });

    test("应该正确解析带空格的复合格式", () => {
      expect(parseDuration("1 小时 30 分钟")).toBe(90);
      expect(parseDuration("2 时 15 分")).toBe(135);
    });
  });

  describe("无效格式", () => {
    test("应该对无效格式返回null", () => {
      expect(parseDuration("")).toBe(null);
      expect(parseDuration(null)).toBe(null);
      expect(parseDuration(undefined)).toBe(null);
      expect(parseDuration("abc")).toBe(null);
      expect(parseDuration("分钟60")).toBe(null);
      expect(parseDuration("无效内容")).toBe(null);
    });

    test("应该对负数返回null", () => {
      expect(parseDuration("-60")).toBe(null);
      expect(parseDuration("-1小时")).toBe(null);
    });
  });

  describe("实际验证场景", () => {
    test("药店拜访：应该通过60分钟以上的验证", () => {
      expect(parseDuration("60")).toBe(60); // 恰好60分钟
      expect(parseDuration("60分钟")).toBe(60);
      expect(parseDuration("70分钟")).toBe(70);
      expect(parseDuration("1小时")).toBe(60);
      expect(parseDuration("1.5小时")).toBe(90);
    });

    test("药店拜访：应该识别不足60分钟的情况", () => {
      const duration1 = parseDuration("59分钟");
      expect(duration1).toBe(59);
      expect(duration1! < 60).toBe(true);

      const duration2 = parseDuration("30");
      expect(duration2).toBe(30);
      expect(duration2! < 60).toBe(true);
    });

    test("医院拜访：应该通过100分钟以上的验证", () => {
      expect(parseDuration("100")).toBe(100);
      expect(parseDuration("100分钟")).toBe(100);
      expect(parseDuration("120分钟")).toBe(120);
      expect(parseDuration("2小时")).toBe(120);
    });
  });

  describe("边界情况", () => {
    test("应该处理前后空格", () => {
      expect(parseDuration("  60  ")).toBe(60);
      expect(parseDuration("  60分钟  ")).toBe(60);
    });

    test("应该处理零值", () => {
      expect(parseDuration("0")).toBe(0);
      expect(parseDuration("0分钟")).toBe(0);
    });

    test("应该处理大数值", () => {
      expect(parseDuration("500")).toBe(500);
      expect(parseDuration("500分钟")).toBe(500);
    });
  });
});
