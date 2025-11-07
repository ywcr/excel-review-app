# 等级医院拜访日期间隔验证修复

## 问题描述

用户报告：在审核等级医院拜访 Excel 文件时，**11 月 5 日拜访，11 月 7 日又去拜访同一医生，系统没有检测出错误**。

根据规则，同一医生 7 日内不能重复拜访，11 月 5 日到 11 月 7 日只间隔 2 天，应该被检测出来。

## 问题原因

Excel 文件中的日期格式为中文格式：**"2025 年 11 月 5 日"**、**"2025 年 11 月 7 日"**

原代码中的 `extractDate` 和 `parseSimpleDate` 函数无法正确解析这种中文日期格式：

```typescript
// 原代码
if (typeof value === "string") {
  const date = new Date(value); // 无法解析 "2025年11月5日"
  return isNaN(date.getTime()) ? null : date;
}
```

测试结果显示：

- `new Date("2025年11月5日")` => `Invalid Date` ❌
- `new Date("2025-11-05")` => 正常解析 ✓

## 修复方案

在 `src/lib/frontendValidator.ts` 文件中，修改了两个日期解析函数：

### 1. 修复 `extractDate` 函数（第 920-951 行）

添加了中文日期格式的正则匹配：

```typescript
private extractDate(value: any): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "number") {
    // Excel日期序列号
    return new Date((value - 25569) * 86400 * 1000);
  }

  if (typeof value === "string") {
    const str = value.trim();

    // 匹配中文日期格式：2025年11月5日 或 2025年11月5
    const chineseDateMatch = str.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日?$/);
    if (chineseDateMatch) {
      const year = parseInt(chineseDateMatch[1], 10);
      const month = parseInt(chineseDateMatch[2], 10);
      const day = parseInt(chineseDateMatch[3], 10);
      return new Date(year, month - 1, day); // month is 0-indexed
    }

    // 尝试标准格式
    const date = new Date(str);
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
}
```

### 2. 修复 `parseSimpleDate` 函数（第 539-586 行）

同样添加了中文日期格式支持：

```typescript
private parseSimpleDate(value: any): Date | null {
  if (!value) return null;

  if (value instanceof Date) return value;

  const str = value.toString().trim();

  // Handle Excel date numbers (days since 1900-01-01)
  if (/^\d+(\.\d+)?$/.test(str)) {
    const excelDate = parseFloat(str);
    const excelEpoch = new Date(1900, 0, 1);
    const date = new Date(
      excelEpoch.getTime() + (excelDate - 1) * 24 * 60 * 60 * 1000
    );
    return isNaN(date.getTime()) ? null : date;
  }

  // Handle Chinese date format: 2025年11月5日 or 2025年11月5
  const chineseDateMatch = str.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日?$/);
  if (chineseDateMatch) {
    const year = parseInt(chineseDateMatch[1], 10);
    const month = parseInt(chineseDateMatch[2], 10);
    const day = parseInt(chineseDateMatch[3], 10);
    return new Date(year, month - 1, day); // month is 0-indexed
  }

  // Handle various date formats
  let date: Date;

  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [year, month, day] = str.split("-").map(Number);
    date = new Date(year, month - 1, day);
  }
  // Try datetime format (YYYY-MM-DD HH:MM)
  else if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(str)) {
    date = new Date(str);
  }
  // Try other common formats
  else {
    date = new Date(str);
  }

  return isNaN(date.getTime()) ? null : date;
}
```

## 修复验证

### 支持的日期格式

修复后，系统现在支持以下日期格式：

1. ✅ **中文格式**：`2025年11月5日`、`2025年11月5`
2. ✅ **ISO 格式**：`2025-11-05`
3. ✅ **斜杠格式**：`2025/11/05`
4. ✅ **Excel 序列号**：`45600`（数字格式）

### 日期间隔计算验证

| 起始日期           | 结束日期            | 间隔天数 | 是否<7 天 | 应被检测 |
| ------------------ | ------------------- | -------- | --------- | -------- |
| 2025 年 11 月 5 日 | 2025 年 11 月 7 日  | 2 天     | ✓ 是      | ✓ 是     |
| 2025 年 11 月 5 日 | 2025 年 11 月 11 日 | 6 天     | ✓ 是      | ✓ 是     |
| 2025 年 11 月 5 日 | 2025 年 11 月 12 日 | 7 天     | ✗ 否      | ✗ 否     |

## 测试文件

已创建测试文件 `test-date-interval.xlsx`，包含以下测试场景：

1. **张三拜访李医生**：

   - 11 月 5 日：北京协和医院
   - 11 月 7 日：上海华山医院（同一医生，间隔 2 天）
   - **预期**：应检测出错误 ❌

2. **王五拜访王医生**：
   - 11 月 5 日：广州中山医院
   - 11 月 11 日：深圳人民医院（同一医生，间隔 6 天）
   - **预期**：应检测出错误 ❌

## 影响范围

此修复影响以下验证规则：

### 1. 等级医院拜访

- ✅ 同一医院 1 日内不能重复拜访
- ✅ 同一医生 7 日内不能重复拜访

### 2. 基层医疗机构拜访

- ✅ 同一医院 2 日内不能重复拜访
- ✅ 同一医生 7 日内不能重复拜访

### 3. 民营医院拜访

- ✅ 同一医院 2 日内不能重复拜访
- ✅ 同一医生 7 日内不能重复拜访

### 4. 药店拜访

- ✅ 同一药店 2 日内不能重复拜访

### 5. 其他涉及日期间隔的验证

- ✅ 频次验证（按日期统计）
- ✅ 时间范围验证
- ✅ 日期格式验证

## 使用说明

### 前端验证

修复后，前端验证现在可以正确处理中文日期格式的 Excel 文件。用户上传包含"2025 年 11 月 5 日"格式的文件时，系统会：

1. 正确解析日期
2. 计算日期间隔
3. 检测出 7 日内的重复拜访

### 测试步骤

1. 打开前端应用
2. 选择"等级医院拜访"任务类型
3. 上传 `test-date-interval.xlsx` 文件
4. 查看验证结果

**预期结果**：

- 应检测出 2 个日期间隔错误
- 第 2 行：张三拜访李医生（11 月 7 日，与第 1 行 11 月 5 日冲突）
- 第 4 行：王五拜访王医生（11 月 11 日，与第 3 行 11 月 5 日冲突）

## 注意事项

1. **时区问题**：Date 对象在转换为 ISO 字符串时会显示 UTC 时间（比北京时间晚 8 小时），但这不影响日期间隔的计算。

2. **月份索引**：JavaScript 的 Date 对象月份是 0-indexed（0=1 月，11=12 月），代码中已正确处理。

3. **兼容性**：修复保持了对原有日期格式的支持，不会影响现有功能。

4. **正则表达式**：`/^(\d{4})年(\d{1,2})月(\d{1,2})日?$/` 支持：
   - `2025年11月5日`（带"日"）
   - `2025年11月5`（不带"日"）
   - 月份和日期可以是 1 位或 2 位数字

## 修复完成时间

2025 年 11 月 7 日

## 相关文件

- `src/lib/frontendValidator.ts` - 主要修复文件
- `test-date-interval.xlsx` - 测试文件
- `DATE_INTERVAL_FIX.md` - 本文档
