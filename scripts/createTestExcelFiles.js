// 创建测试Excel文件的脚本
const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");

// 确保测试文件目录存在
const testDir = path.join(__dirname, "../public/test-files");
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

// 1. 创建药店拜访测试文件 - 正确格式（基于真实模板）
function createPharmacyVisitValid() {
  const data = [
    [
      "序号",
      "任务标题",
      "实施人",
      "对接人",
      "零售渠道",
      "渠道地址",
      "拜访开始时间",
      "拜访时长",
      "拜访事项（1）",
      "信息反馈（1）",
      "拜访事项（2）",
      "信息反馈（2）",
      "门头",
      "内部",
    ],
    [
      1,
      "某公司产品北京市药店拜访",
      "张三",
      "王经理",
      "康美药店",
      "北京市朝阳区建国路1号",
      "2024-01-15 09:00",
      90,
      "产品推广",
      "客户反馈良好",
      "价格咨询",
      "价格合理",
      "已拍摄",
      "已拍摄",
    ],
    [
      2,
      "某公司产品北京市药店拜访",
      "李四",
      "李经理",
      "同仁堂药店",
      "北京市西城区前门大街2号",
      "2024-01-15 11:00",
      60,
      "产品介绍",
      "有购买意向",
      "库存了解",
      "库存充足",
      "已拍摄",
      "已拍摄",
    ],
    [
      3,
      "某公司产品北京市药店拜访",
      "张三",
      "赵经理",
      "老百姓药店",
      "北京市海淀区中关村大街3号",
      "2024-01-16 14:00",
      90,
      "市场调研",
      "竞品分析",
      "销售策略",
      "制定方案",
      "已拍摄",
      "已拍摄",
    ],
    [
      4,
      "某公司产品北京市药店拜访",
      "王五",
      "陈经理",
      "益丰药房",
      "北京市东城区王府井大街4号",
      "2024-01-16 10:00",
      75,
      "客户维护",
      "关系良好",
      "后续合作",
      "达成意向",
      "已拍摄",
      "已拍摄",
    ],
    [
      5,
      "某公司产品北京市药店拜访",
      "李四",
      "刘经理",
      "大参林药店",
      "北京市丰台区南三环路5号",
      "2024-01-17 09:30",
      90,
      "新品推介",
      "接受度高",
      "订单洽谈",
      "签订合同",
      "已拍摄",
      "已拍摄",
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "药店拜访");

  const filePath = path.join(testDir, "药店拜访_正确格式.xlsx");
  XLSX.writeFile(wb, filePath);
  console.log("✅ 创建成功:", filePath);
}

// 2. 创建药店拜访测试文件 - 包含各种错误
function createPharmacyVisitWithErrors() {
  const data = [
    [
      "零售渠道",
      "实施人",
      "拜访开始时间",
      "拜访结束时间",
      "拜访持续时间",
      "对接人",
    ],
    ["", "张三", "2024-01-15 09:00", "2024-01-15 10:30", "90", "王经理"], // 缺少零售渠道
    ["同仁堂药店", "", "2024-01-15 11:00", "2024-01-15 12:00", "60", "李经理"], // 缺少实施人
    ["老百姓药店", "张三", "无效日期", "2024-01-16 15:30", "90", "赵经理"], // 日期格式错误
    [
      "康美药店",
      "张三",
      "2024-01-15 09:00",
      "2024-01-15 10:30",
      "30",
      "王经理",
    ], // 重复药店 + 时长不足
    [
      "益丰药房",
      "王五",
      "2024-01-16 07:00",
      "2024-01-16 08:00",
      "60",
      "陈经理",
    ], // 时间范围错误
    [
      "大参林药店",
      "张三",
      "2024-01-16 10:00",
      "2024-01-16 11:00",
      "60",
      "刘经理",
    ], // 张三当天第6家店（超频次）
    [
      "海王星辰",
      "张三",
      "2024-01-16 12:00",
      "2024-01-16 13:00",
      "60",
      "孙经理",
    ],
    [
      "华氏大药房",
      "张三",
      "2024-01-16 14:00",
      "2024-01-16 15:00",
      "60",
      "周经理",
    ],
    ["健之佳", "张三", "2024-01-16 16:00", "2024-01-16 17:00", "60", "吴经理"],
    ["一心堂", "李四", "2024-01-20 09:00", "2024-01-20 10:00", "60", "王经理"], // 同一对接人7日内重复
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "药店拜访");

  const filePath = path.join(testDir, "药店拜访_包含错误.xlsx");
  XLSX.writeFile(wb, filePath);
  console.log("✅ 创建成功:", filePath);
}

// 3. 创建等级医院拜访测试文件 - 正确格式
function createHospitalVisitValid() {
  const data = [
    [
      "医生姓名",
      "医疗机构名称",
      "医疗类型",
      "拜访开始时间",
      "拜访结束时间",
      "实施人",
    ],
    [
      "张医生",
      "北京协和医院",
      "三级甲等",
      "2024-01-15 09:00",
      "2024-01-15 10:00",
      "李代表",
    ],
    [
      "王医生",
      "上海华山医院",
      "三级甲等",
      "2024-01-15 14:00",
      "2024-01-15 15:00",
      "王代表",
    ],
    [
      "李医生",
      "广州中山医院",
      "三级乙等",
      "2024-01-16 10:00",
      "2024-01-16 11:00",
      "李代表",
    ],
    [
      "赵医生",
      "深圳人民医院",
      "二级甲等",
      "2024-01-17 09:00",
      "2024-01-17 10:00",
      "张代表",
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "等级医院拜访");

  const filePath = path.join(testDir, "等级医院拜访_正确格式.xlsx");
  XLSX.writeFile(wb, filePath);
  console.log("✅ 创建成功:", filePath);
}

// 4. 创建等级医院拜访测试文件 - 包含错误
function createHospitalVisitWithErrors() {
  const data = [
    [
      "医生姓名",
      "医疗机构名称",
      "医疗类型",
      "拜访开始时间",
      "拜访结束时间",
      "实施人",
    ],
    [
      "",
      "北京协和医院",
      "三级甲等",
      "2024-01-15 09:00",
      "2024-01-15 10:00",
      "李代表",
    ], // 缺少医生姓名
    [
      "王医生",
      "",
      "三级甲等",
      "2024-01-15 14:00",
      "2024-01-15 15:00",
      "王代表",
    ], // 缺少医院名称
    [
      "李医生",
      "广州中山医院",
      "普通医院",
      "2024-01-16 10:00",
      "2024-01-16 11:00",
      "李代表",
    ], // 医疗类型错误
    [
      "赵医生",
      "北京协和医院",
      "三级甲等",
      "2024-01-15 11:00",
      "2024-01-15 12:00",
      "张代表",
    ], // 重复医院
    [
      "孙医生",
      "上海华山医院",
      "三级甲等",
      "2024-01-16 09:00",
      "2024-01-16 10:00",
      "李代表",
    ], // 李代表当天第5家医院（超频次）
    [
      "周医生",
      "天津医院",
      "三级甲等",
      "2024-01-16 11:00",
      "2024-01-16 12:00",
      "李代表",
    ],
    [
      "吴医生",
      "重庆医院",
      "三级甲等",
      "2024-01-16 14:00",
      "2024-01-16 15:00",
      "李代表",
    ],
    [
      "郑医生",
      "成都医院",
      "三级甲等",
      "2024-01-16 16:00",
      "2024-01-16 17:00",
      "李代表",
    ],
    [
      "张医生",
      "西安医院",
      "三级甲等",
      "2024-01-20 09:00",
      "2024-01-20 10:00",
      "王代表",
    ], // 张医生7日内重复
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "等级医院拜访");

  const filePath = path.join(testDir, "等级医院拜访_包含错误.xlsx");
  XLSX.writeFile(wb, filePath);
  console.log("✅ 创建成功:", filePath);
}

// 5. 创建科室拜访测试文件
function createDepartmentVisit() {
  const data = [
    ["科室名称", "拜访持续时间", "拜访开始时间"],
    ["心内科", "45", "2024-01-15 09:00"],
    ["神经内科", "60", "2024-01-15 14:00"],
    ["", "30", "2024-01-16 10:00"], // 缺少科室名称
    ["骨科", "20", "2024-01-16 15:00"], // 时长不足
    ["儿科", "35", "2024-01-17 09:00"],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "科室拜访");

  const filePath = path.join(testDir, "科室拜访_测试.xlsx");
  XLSX.writeFile(wb, filePath);
  console.log("✅ 创建成功:", filePath);
}

// 6. 创建表头错误的测试文件
function createHeaderErrorFile() {
  const data = [
    ["药店名称", "销售代表", "开始时间", "结束时间"], // 表头不匹配
    ["康美药店", "张三", "2024-01-15 09:00", "2024-01-15 10:30"],
    ["同仁堂药店", "李四", "2024-01-15 11:00", "2024-01-15 12:00"],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

  const filePath = path.join(testDir, "药店拜访_表头错误.xlsx");
  XLSX.writeFile(wb, filePath);
  console.log("✅ 创建成功:", filePath);
}

// 7. 创建多工作表测试文件
function createMultiSheetFile() {
  const wb = XLSX.utils.book_new();

  // 空工作表
  const emptyWs = XLSX.utils.aoa_to_sheet([]);
  XLSX.utils.book_append_sheet(wb, emptyWs, "空工作表");

  // 错误数据工作表
  const errorData = [
    ["错误列1", "错误列2"],
    ["数据1", "数据2"],
  ];
  const errorWs = XLSX.utils.aoa_to_sheet(errorData);
  XLSX.utils.book_append_sheet(wb, errorWs, "错误数据");

  // 正确的药店拜访数据
  const correctData = [
    [
      "零售渠道",
      "实施人",
      "拜访开始时间",
      "拜访结束时间",
      "拜访持续时间",
      "对接人",
    ],
    [
      "康美药店",
      "张三",
      "2024-01-15 09:00",
      "2024-01-15 10:30",
      "90",
      "王经理",
    ],
    [
      "同仁堂药店",
      "李四",
      "2024-01-15 11:00",
      "2024-01-15 12:00",
      "60",
      "李经理",
    ],
  ];
  const correctWs = XLSX.utils.aoa_to_sheet(correctData);
  XLSX.utils.book_append_sheet(wb, correctWs, "药店拜访");

  const filePath = path.join(testDir, "多工作表_测试.xlsx");
  XLSX.writeFile(wb, filePath);
  console.log("✅ 创建成功:", filePath);
}

// 创建测试说明文件
function createTestGuide() {
  const guide = `# Excel验证测试文件说明

## 测试文件列表

### 1. 药店拜访_正确格式.xlsx
- **用途**: 验证正确格式的药店拜访数据
- **预期结果**: 验证通过，无错误
- **包含数据**: 5条正确的药店拜访记录

### 2. 药店拜访_包含错误.xlsx  
- **用途**: 测试各种验证规则的错误检测
- **预期错误**:
  - 必填字段缺失（零售渠道、实施人）
  - 日期格式错误
  - 重复药店拜访
  - 拜访时长不足60分钟
  - 拜访时间超出范围（07:00）
  - 实施人每日拜访超过5家药店
  - 同一对接人7日内重复拜访

### 3. 等级医院拜访_正确格式.xlsx
- **用途**: 验证正确格式的医院拜访数据
- **预期结果**: 验证通过，无错误
- **包含数据**: 4条正确的医院拜访记录

### 4. 等级医院拜访_包含错误.xlsx
- **用途**: 测试医院拜访的各种错误
- **预期错误**:
  - 必填字段缺失（医生姓名、医院名称）
  - 医疗类型格式错误
  - 重复医院拜访
  - 实施人每日拜访超过4家医院
  - 同一医生7日内重复拜访

### 5. 科室拜访_测试.xlsx
- **用途**: 测试科室拜访验证
- **预期错误**:
  - 缺少科室名称
  - 拜访时长不足30分钟

### 6. 药店拜访_表头错误.xlsx
- **用途**: 测试表头验证功能
- **预期结果**: 表头验证失败，提示字段不匹配
- **错误类型**: 表头字段名不符合模板要求

### 7. 多工作表_测试.xlsx
- **用途**: 测试工作表选择功能
- **包含工作表**:
  - 空工作表（应被跳过）
  - 错误数据（表头不匹配）
  - 药店拜访（正确数据）
- **预期行为**: 自动选择"药店拜访"工作表

## 测试步骤

1. 启动开发服务器: \`yarn dev\`
2. 访问前端验证页面: \`http://localhost:3000/frontend-validation\`
3. 选择对应的任务类型
4. 上传测试文件
5. 观察验证结果是否符合预期

## 验证规则测试重点

### 基础验证
- [x] 必填字段验证
- [x] 日期格式验证  
- [x] 医疗等级验证
- [x] 时间范围验证
- [x] 持续时间验证

### 跨行验证
- [x] 唯一性验证（同一药店/医院不能重复）
- [x] 频次验证（每日拜访数量限制）
- [x] 日期间隔验证（7日内不能重复拜访同一对象）

### 表头验证
- [x] 必需字段检查
- [x] 字段名匹配
- [x] 相似字段建议

### 工作表处理
- [x] 自动工作表选择
- [x] 手动工作表选择
- [x] 空工作表处理
`;

  const guidePath = path.join(testDir, "README.md");
  fs.writeFileSync(guidePath, guide, "utf8");
  console.log("✅ 创建测试说明:", guidePath);
}

// 执行所有创建函数
console.log("🚀 开始创建测试Excel文件...\n");

createPharmacyVisitValid();
createPharmacyVisitWithErrors();
createHospitalVisitValid();
createHospitalVisitWithErrors();
createDepartmentVisit();
createHeaderErrorFile();
createMultiSheetFile();
createTestGuide();

console.log("\n✅ 所有测试文件创建完成！");
console.log("📁 文件位置:", testDir);
console.log("\n🧪 现在可以使用这些文件测试验证功能了！");
