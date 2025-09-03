import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";

export interface ValidationRule {
  field: string;
  type:
    | "required"
    | "unique"
    | "timeRange"
    | "duration"
    | "frequency"
    | "dateInterval"
    | "dateFormat"
    | "minValue";
  params?: any;
  message: string;
}

export interface TaskTemplate {
  name: string;
  serviceCategory: string;
  serviceItem: string;
  feeStandard: string;
  unit: string;
  requirements: string;
  template: string;
  ratio?: string;
  notes?: string;
  sampleLink?: string;
  complianceNotes?: string;
  validationRules: ValidationRule[];
}

export class TemplateParser {
  private templatePath: string;
  private templates: Map<string, TaskTemplate> = new Map();

  constructor() {
    // Try multiple possible paths for the template file
    const possiblePaths = [
      path.join(process.cwd(), "data", "模板总汇.xlsx"),
      path.join(process.cwd(), "src", "data", "模板总汇.xlsx"),
      path.join(__dirname, "..", "..", "data", "模板总汇.xlsx"),
      path.join(__dirname, "..", "..", "..", "data", "模板总汇.xlsx"),
    ];

    // Use the first path that exists
    this.templatePath = possiblePaths[0]; // Default to first path

    // Check which path exists
    try {
      for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
          this.templatePath = testPath;
          console.log("Found template file at:", testPath);
          break;
        }
      }
    } catch (error) {
      console.warn(
        "Could not check file existence, using default path:",
        this.templatePath
      );
    }
  }

  async loadTemplates(): Promise<void> {
    let workbook: XLSX.WorkBook;
    let taskSheet: XLSX.WorkSheet;

    try {
      console.log("Loading templates from:", this.templatePath);

      // Check if file exists
      if (!fs.existsSync(this.templatePath)) {
        throw new Error(`Template file does not exist: ${this.templatePath}`);
      }

      // Check file permissions
      try {
        fs.accessSync(this.templatePath, fs.constants.R_OK);
      } catch (accessError) {
        throw new Error(`Cannot read template file: ${this.templatePath}`);
      }

      // Read file as buffer first, then parse with XLSX
      const buffer = fs.readFileSync(this.templatePath);
      workbook = XLSX.read(buffer, { type: "buffer" });
      taskSheet = workbook.Sheets["任务说明-不用打印"];

      if (!taskSheet) {
        const availableSheets = Object.keys(workbook.Sheets);
        throw new Error(
          `Sheet "任务说明-不用打印" not found. Available sheets: ${availableSheets.join(
            ", "
          )}`
        );
      }
    } catch (error) {
      console.error("Error loading template file:", error);
      throw new Error(
        `Cannot access file ${this.templatePath}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    const data = XLSX.utils.sheet_to_json(taskSheet, { header: 1 }) as any[][];

    // Find header row (row 2, index 1)
    const headerRow = data[1];
    const headers = [
      "服务类别",
      "服务项目",
      "费用标准",
      "计量单位",
      "要求",
      "模板",
      "",
      "项目占比",
      "备注",
      "样表链接",
      "制定合规流程注意事项",
    ];

    // Process data rows starting from row 3 (index 2)
    for (let i = 2; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      const template: TaskTemplate = {
        name: row[1] || "", // 服务项目
        serviceCategory: row[0] || "",
        serviceItem: row[1] || "",
        feeStandard: row[2] || "",
        unit: row[3] || "",
        requirements: row[4] || "",
        template: row[5] || "",
        ratio: row[7] || "",
        notes: row[8] || "",
        sampleLink: row[9] || "",
        complianceNotes: row[10] || "",
        validationRules: this.parseValidationRules(row[1], row[4]), // Parse from service item and requirements
      };

      if (template.name) {
        this.templates.set(template.name, template);
      }
    }

    // Add three hospital visit task types that use the same "医院拜访" template
    this.addHospitalVisitTasks();
  }

  private addHospitalVisitTasks(): void {
    // Since there's no base "医院拜访" template in the Excel file,
    // we need to enhance the existing hospital visit templates with specific validation rules

    const hospitalTasks = [
      {
        name: "等级医院拜访",
        description: "对三甲、二甲等等级医院的拜访活动",
        specificRules: this.getGradedHospitalRules(),
      },
      {
        name: "基层医疗机构拜访",
        description: "对社区卫生服务中心、乡镇卫生院等基层医疗机构的拜访活动",
        specificRules: this.getPrimaryHealthcareRules(),
      },
      {
        name: "民营医院拜访",
        description: "对民营医院、私立医院的拜访活动",
        specificRules: this.getPrivateHospitalRules(),
      },
    ];

    hospitalTasks.forEach((task) => {
      const existingTemplate = this.templates.get(task.name);

      if (existingTemplate) {
        // Get base hospital visit rules (common to all hospital visits)
        const baseHospitalRules = this.getBaseHospitalRules();

        // Combine base hospital rules with specific rules
        const enhancedRules = [
          ...existingTemplate.validationRules,
          ...baseHospitalRules,
          ...task.specificRules,
        ];

        // Update the template with enhanced validation rules
        const enhancedTemplate: TaskTemplate = {
          ...existingTemplate,
          notes: task.description,
          validationRules: enhancedRules,
        };

        this.templates.set(task.name, enhancedTemplate);
      }
    });
  }

  private getBaseHospitalRules(): ValidationRule[] {
    return [
      {
        field: "visit_time",
        type: "dateFormat",
        params: { allowTimeComponent: false },
        message:
          "日期格式错误：不应包含时分秒，应为纯日期格式（如：2025-08-01）",
      },
    ];
  }

  private getGradedHospitalRules(): ValidationRule[] {
    return [
      {
        field: "medical_type",
        type: "medicalLevel",
        params: {
          allowedLevels: ["一级", "二级", "三级"],
          allowedSuffixes: ["甲等", "乙等", "丙等", "特等"],
        },
        message:
          "医疗类型必须填写具体级别，如：一级、二级、三级，或完整格式：一级甲等、二级甲等等",
      },
      {
        field: "hospital_name",
        type: "dateInterval",
        params: { days: 1, groupBy: "hospital_name" },
        message: "同一医院1日内不能重复拜访",
      },
      {
        field: "doctor_name",
        type: "dateInterval",
        params: { days: 7, groupBy: "doctor_name" },
        message: "同一医生7日内不能重复拜访",
      },
      {
        field: "implementer",
        type: "frequency",
        params: { maxPerDay: 4, groupBy: "implementer" },
        message: "同一实施人每日拜访等级医院不能超过4家",
      },
      {
        field: "visit_duration",
        type: "duration",
        params: { minMinutes: 100 },
        message: "等级医院拜访有效时间不能低于100分钟",
      },
      {
        field: "visit_time",
        type: "timeRange",
        params: { startTime: "07:00", endTime: "19:00" },
        message: "等级医院拜访时间必须在07:00-19:00范围内",
      },
    ];
  }

  private getPrimaryHealthcareRules(): ValidationRule[] {
    return [
      {
        field: "medical_type",
        type: "medicalLevel",
        params: {
          allowedLevels: ["一级", "二级", "三级"],
          allowedSuffixes: ["甲等", "乙等", "丙等", "特等"],
        },
        message:
          "医疗类型必须填写具体级别，如：一级、二级、三级，或完整格式：一级甲等、二级甲等等",
      },
      {
        field: "hospital_name",
        type: "dateInterval",
        params: { days: 2, groupBy: "hospital_name" },
        message: "同一医院2日内不能重复拜访",
      },
      {
        field: "doctor_name",
        type: "dateInterval",
        params: { days: 7, groupBy: "doctor_name" },
        message: "同一医生7日内不能重复拜访",
      },
      {
        field: "implementer",
        type: "frequency",
        params: { maxPerDay: 4, groupBy: "implementer" },
        message: "同一实施人每日拜访基层医疗机构不能超过4家",
      },
      {
        field: "visit_duration",
        type: "duration",
        params: { minMinutes: 100 },
        message: "基层医疗机构拜访有效时间不能低于100分钟",
      },
      {
        field: "visit_time",
        type: "timeRange",
        params: { startTime: "07:00", endTime: "19:00" },
        message: "基层医疗机构拜访时间必须在07:00-19:00范围内",
      },
    ];
  }

  private getPrivateHospitalRules(): ValidationRule[] {
    return [
      {
        field: "medical_type",
        type: "medicalLevel",
        params: {
          allowedLevels: ["一级", "二级", "三级"],
          allowedSuffixes: ["甲等", "乙等", "丙等", "特等"],
        },
        message:
          "医疗类型必须填写具体级别，如：一级、二级、三级，或完整格式：一级甲等、二级甲等等",
      },
      {
        field: "hospital_name",
        type: "dateInterval",
        params: { days: 2, groupBy: "hospital_name" },
        message: "同一医院2日内不能重复拜访",
      },
      {
        field: "doctor_name",
        type: "dateInterval",
        params: { days: 7, groupBy: "doctor_name" },
        message: "同一医生7日内不能重复拜访",
      },
      {
        field: "implementer",
        type: "frequency",
        params: { maxPerDay: 4, groupBy: "implementer" },
        message: "同一实施人每日拜访民营医院不能超过4家",
      },
      {
        field: "visit_duration",
        type: "duration",
        params: { minMinutes: 100 },
        message: "民营医院拜访有效时间不能低于100分钟",
      },
      {
        field: "visit_time",
        type: "timeRange",
        params: { startTime: "07:00", endTime: "19:00" },
        message: "民营医院拜访时间必须在07:00-19:00范围内",
      },
    ];
  }

  private parseValidationRules(
    serviceItem: string,
    requirements: string
  ): ValidationRule[] {
    const rules: ValidationRule[] = [];

    if (!requirements) return rules;

    // Parse 药店拜访 specific rules
    if (serviceItem === "药店拜访") {
      // 【1】日内不重复拜访
      if (requirements.includes("【1】日内不重复拜访")) {
        rules.push({
          field: "pharmacy_name",
          type: "dateInterval",
          params: { days: 1, groupBy: "pharmacy_name" },
          message: "同一药店1日内不能重复拜访",
        });
      }

      // 【7】日内对接人不重复拜访
      if (requirements.includes("【7】日内对接人不重复拜访")) {
        rules.push({
          field: "contact_person",
          type: "dateInterval",
          params: { days: 7, groupBy: "contact_person" },
          message: "同一对接人7日内不能重复拜访",
        });
      }

      // 同一实施人每日不超过【5】家
      const dailyLimitMatch =
        requirements.match(/同一实施人每日不超过【(\d+)】家/);
      if (dailyLimitMatch) {
        const limit = parseInt(dailyLimitMatch[1]);
        rules.push({
          field: "implementer",
          type: "frequency",
          params: { maxPerDay: limit, groupBy: "implementer" },
          message: `同一实施人每日拜访不能超过${limit}家药店`,
        });
      }

      // 拜访有效时间不低于【60】分钟
      const durationMatch =
        requirements.match(/拜访有效时间不低于【(\d+)】分钟/);
      if (durationMatch) {
        const minDuration = parseInt(durationMatch[1]);
        rules.push({
          field: "visit_duration",
          type: "duration",
          params: { minMinutes: minDuration },
          message: `拜访有效时间不能低于${minDuration}分钟`,
        });
      }

      // 有效时间范围【08:00—19:00】
      const timeRangeMatch = requirements.match(
        /有效时间范围【(\d{2}:\d{2})—(\d{2}:\d{2})】/
      );
      if (timeRangeMatch) {
        const startTime = timeRangeMatch[1];
        const endTime = timeRangeMatch[2];
        rules.push({
          field: "visit_time",
          type: "timeRange",
          params: { startTime, endTime },
          message: `拜访时间必须在${startTime}-${endTime}范围内`,
        });
      }

      // 添加日期格式验证规则
      rules.push({
        field: "visit_time",
        type: "dateFormat",
        params: { allowTimeComponent: false },
        message:
          "日期格式错误：不应包含时分秒，应为纯日期格式（如：2025-08-01）",
      });
    }

    // Parse 市场调研类任务 specific rules
    const marketResearchTasks = [
      "消费者调研",
      "患者调研",
      "店员调研",
      "药店调研",
    ];
    if (marketResearchTasks.includes(serviceItem)) {
      // 调查对象姓名永远不能重复 / 店员姓名永远不能重复
      if (
        requirements.includes("调查对象姓名永远不能重复") ||
        requirements.includes("店员姓名永远不能重复")
      ) {
        const fieldName =
          serviceItem === "店员调研" ? "employee_name" : "survey_target_name";
        rules.push({
          field: fieldName,
          type: "unique",
          params: { scope: "global" },
          message:
            serviceItem === "店员调研"
              ? "店员姓名永远不能重复"
              : "调查对象姓名永远不能重复",
        });
      }

      // 同一实施人每日不得超过【X】份
      const dailyLimitMatch = requirements.match(
        /同一实施人每日不(?:得超过|超过)【(\d+)】份/
      );
      if (dailyLimitMatch) {
        const limit = parseInt(dailyLimitMatch[1]);
        rules.push({
          field: "implementer",
          type: "frequency",
          params: { maxPerDay: limit, groupBy: "implementer" },
          message: `同一实施人每日不得超过${limit}份`,
        });
      }

      // 同一实施人每日拜访不超过【X】家药店
      const pharmacyVisitMatch = requirements.match(
        /同一实施人每日拜访不超过【(\d+)】家药店/
      );
      if (pharmacyVisitMatch) {
        const limit = parseInt(pharmacyVisitMatch[1]);
        rules.push({
          field: "implementer",
          type: "frequency",
          params: {
            maxPerDay: limit,
            groupBy: "implementer",
            countBy: "pharmacy_name",
          },
          message: `同一实施人每日拜访不超过${limit}家药店`,
        });
      }

      // 每个药店不超过【X】份
      const perPharmacyMatch = requirements.match(/每个药店不超过【(\d+)】份/);
      if (perPharmacyMatch) {
        const limit = parseInt(perPharmacyMatch[1]);
        rules.push({
          field: "pharmacy_name",
          type: "frequency",
          params: { maxPerDay: limit, groupBy: "pharmacy_name" },
          message: `每个药店不超过${limit}份`,
        });
      }

      // 同一任务下同一药店只能调研【1】次
      if (requirements.includes("同一任务下同一药店只能调研【1】次")) {
        rules.push({
          field: "pharmacy_name",
          type: "unique",
          params: { scope: "task" },
          message: "同一任务下同一药店只能调研1次",
        });
      }

      // 添加日期格式验证规则
      rules.push({
        field: "survey_time",
        type: "dateFormat",
        params: { allowTimeComponent: false },
        message:
          "日期格式错误：不应包含时分秒，应为纯日期格式（如：2025-08-01）",
      });
    }

    // Parse 竞品信息收集 specific rules
    if (serviceItem === "竞品信息收集") {
      // 半年内医院不重复
      if (requirements.includes("半年内医院不重复")) {
        rules.push({
          field: "hospital_name",
          type: "dateInterval",
          params: { days: 180, groupBy: "hospital_name" },
          message: "同一医院半年内不能重复收集竞品信息",
        });
      }

      // 添加日期格式验证规则
      rules.push({
        field: "collection_time",
        type: "dateFormat",
        params: { allowTimeComponent: false },
        message:
          "日期格式错误：不应包含时分秒，应为纯日期格式（如：2025-08-01）",
      });
    }

    // Parse 科室拜访 specific rules
    if (serviceItem === "科室拜访") {
      // 【7】日内医生不重复拜访
      if (requirements.includes("【7】日内医生不重复拜访")) {
        rules.push({
          field: "doctor_name",
          type: "dateInterval",
          params: { days: 7, groupBy: "doctor_name" },
          message: "同一医生7日内不能重复拜访",
        });
      }

      // 【3】日内不重复拜访医院
      if (requirements.includes("【3】日内不重复拜访医院")) {
        rules.push({
          field: "hospital_name",
          type: "dateInterval",
          params: { days: 3, groupBy: "hospital_name" },
          message: "同一医院3日内不能重复拜访",
        });
      }

      // 同一实施人每日不超过【4】家医院
      const dailyHospitalMatch =
        requirements.match(/同一实施人每日不超过【(\d+)】家医院/);
      if (dailyHospitalMatch) {
        const limit = parseInt(dailyHospitalMatch[1]);
        rules.push({
          field: "implementer",
          type: "frequency",
          params: { maxPerDay: limit, groupBy: "implementer" },
          message: `同一实施人每日拜访不能超过${limit}家医院`,
        });
      }

      // 拜访有效时间不低于【100】分钟
      const durationMatch =
        requirements.match(/拜访有效时间不低于【(\d+)】分钟/);
      if (durationMatch) {
        const minDuration = parseInt(durationMatch[1]);
        rules.push({
          field: "visit_duration",
          type: "duration",
          params: { minMinutes: minDuration },
          message: `拜访有效时间不能低于${minDuration}分钟`,
        });
      }

      // 有效时间范围【07:00—19:00】
      const timeRangeMatch = requirements.match(
        /有效时间范围【(\d{2}:\d{2})—(\d{2}:\d{2})】/
      );
      if (timeRangeMatch) {
        const startTime = timeRangeMatch[1];
        const endTime = timeRangeMatch[2];
        rules.push({
          field: "visit_time",
          type: "timeRange",
          params: { startTime, endTime },
          message: `拜访时间必须在${startTime}-${endTime}范围内`,
        });
      }

      // 添加日期格式验证规则
      rules.push({
        field: "visit_time",
        type: "dateFormat",
        params: { allowTimeComponent: false },
        message:
          "日期格式错误：不应包含时分秒，应为纯日期格式（如：2025-08-01）",
      });
    }

    // Parse 会议类任务 specific rules (培训会, 科室会, 圆桌会, 学术研讨、病例讨论会)
    const meetingTasks = ["培训会", "科室会", "圆桌会", "学术研讨、病例讨论会"];
    if (meetingTasks.includes(serviceItem)) {
      // 参会人数要求
      let minParticipants = 0;
      if (serviceItem === "培训会" || serviceItem === "学术研讨、病例讨论会") {
        if (requirements.includes("参会人数最少不低于30人")) {
          minParticipants = 30;
        }
      } else if (serviceItem === "科室会" || serviceItem === "圆桌会") {
        if (requirements.includes("参会人数最少不低于5人")) {
          minParticipants = 5;
        }
      }

      if (minParticipants > 0) {
        rules.push({
          field: "participant_count",
          type: "minValue",
          params: { minValue: minParticipants },
          message: `参会人数不能少于${minParticipants}人`,
        });
      }

      // 添加日期格式验证规则
      rules.push({
        field: "meeting_time",
        type: "dateFormat",
        params: { allowTimeComponent: false },
        message:
          "日期格式错误：不应包含时分秒，应为纯日期格式（如：2025-08-01）",
      });
    }

    // Parse 推广活动类任务 specific rules (大型推广活动, 小型推广活动)
    const promotionTasks = ["大型推广活动", "小型推广活动"];
    if (promotionTasks.includes(serviceItem)) {
      // 人数要求
      let minParticipants = 0;
      if (
        serviceItem === "大型推广活动" &&
        requirements.includes("人数需要20人")
      ) {
        minParticipants = 20;
      } else if (
        serviceItem === "小型推广活动" &&
        requirements.includes("人数10人")
      ) {
        minParticipants = 10;
      }

      if (minParticipants > 0) {
        rules.push({
          field: "participant_count",
          type: "minValue",
          params: { minValue: minParticipants },
          message: `参与人数不能少于${minParticipants}人`,
        });
      }

      // 添加日期格式验证规则
      rules.push({
        field: "activity_time",
        type: "dateFormat",
        params: { allowTimeComponent: false },
        message:
          "日期格式错误：不应包含时分秒，应为纯日期格式（如：2025-08-01）",
      });
    }

    // Parse 药店陈列服务 specific rules
    if (serviceItem === "药店陈列服务") {
      // 添加日期格式验证规则
      rules.push({
        field: "service_time",
        type: "dateFormat",
        params: { allowTimeComponent: false },
        message:
          "日期格式错误：不应包含时分秒，应为纯日期格式（如：2025-08-01）",
      });
    }

    // Note: Hospital visit base rules are now handled in addHospitalVisitTasks()
    // to avoid duplication and ensure proper rule application

    return rules;
  }

  getTemplate(serviceName: string): TaskTemplate | undefined {
    return this.templates.get(serviceName);
  }

  getAllTemplates(): TaskTemplate[] {
    return Array.from(this.templates.values());
  }

  getAvailableServices(): string[] {
    return Array.from(this.templates.keys());
  }
}

// Singleton instance
let templateParser: TemplateParser | null = null;

export async function getTemplateParser(): Promise<TemplateParser> {
  if (!templateParser) {
    templateParser = new TemplateParser();
    await templateParser.loadTemplates();
  }
  return templateParser;
}
