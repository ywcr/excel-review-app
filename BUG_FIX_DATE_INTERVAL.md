# 民营医院拜访日期间隔验证BUG修复

## 🐛 问题描述

**用户报告**: 民营医院拜访Excel文件中，第3行和第7行是同一个实施人在同一天访问同一家医院，但系统无法检测出重复。

**实际情况**:
- 第3行: 韩文斌 访问 北京市丰台区看丹街道榆树庄村社区卫生服务站 - 2025-11-01
- 第7行: 韩文斌 访问 北京市丰台区看丹街道榆树庄村社区卫生服务站 - 2025-11-01
- 间隔: 0天（同一天）
- 规则: 同一医院2日内不能重复拜访

**应该检测出**: ✅ 违规（间隔0天 < 2天）
**实际结果**: ❌ 未检测出

---

## 🔍 根本原因

在 `src/lib/validationRules.ts` 中，民营医院拜访的 `dateInterval` 规则配置**错误**：

### ❌ 错误配置

```typescript
{
  field: "hospitalName",  // ❌ 错误！这是医院名称字段，不是日期字段
  type: "dateInterval",
  params: { days: 2, groupBy: "hospitalName" },
  message: "同一医院2日内不能重复拜访",
}
```

### 问题分析

`validateDateIntervalRule` 函数的工作原理：
1. 从 `rule.field` 指定的列读取**日期值**（通过 `columnIndex`）
2. 从 `params.groupBy` 指定的列读取**分组依据**（如医院名称）
3. 按"实施人+分组依据"进行分组
4. 检查每组内的日期间隔

**错误配置导致**:
- `field: "hospitalName"` → 系统从"医疗机构名称"列读取值
- 医院名称列的值是文本（如"北京市丰台区..."），不是日期
- `extractDate()` 无法解析医院名称为日期，返回 `null`
- 所有行的日期都是 `null`，无法进行间隔计算
- **结果**: 验证规则完全失效

---

## ✅ 修复方案

### 1. 修复民营医院拜访规则

**文件**: `src/lib/validationRules.ts` 第644-654行

```typescript
// ✅ 正确配置
{
  field: "visitStartTime",  // ✓ 正确！从日期字段读取日期
  type: "dateInterval",
  params: { days: 2, groupBy: "hospitalName" },  // groupBy指定分组依据
  message: "同一医院2日内不能重复拜访",
},
{
  field: "visitStartTime",  // ✓ 正确！从日期字段读取日期
  type: "dateInterval",
  params: { days: 7, groupBy: "doctorName" },
  message: "同一医生7日内不能重复拜访",
}
```

### 2. 同时修复其他任务类型

同样的错误也存在于：

#### 基层医疗机构拜访 (第513-523行)
```typescript
{
  field: "visitStartTime",  // ✓ 已修复
  type: "dateInterval",
  params: { days: 2, groupBy: "hospitalName" },
  message: "同一医院2日内不能重复拜访",
}
```

#### 科室拜访 (第372-382行)
```typescript
{
  field: "visitStartTime",  // ✓ 已修复
  type: "dateInterval",
  params: { days: 3, groupBy: "hospitalName" },
  message: "同一医院3日内不能重复拜访",
}
```

---

## 🔧 添加的调试日志

为了方便调试，在 `src/lib/frontendValidator.ts` 中添加了详细的控制台日志：

### 1. 跨行验证入口日志
```
🔄 [CrossRowValidation] 开始跨行验证
  - templateName: 民营医院拜访
  - totalRules: 15
  - crossRowRulesCount: 3
  - crossRowRules: [...]
```

### 2. DateInterval规则日志
```
🔍 [DateInterval] 开始验证规则
  - field: visitStartTime
  - days: 2
  - groupBy: hospitalName
  - columnIndex: 8
  - totalRows: 28

📍 [DateInterval] 列索引映射
  - dateColumnIndex: 8
  - groupColumnIndex: 4
  - implementerColumnIndex: 2
  - fieldMapping: [...]

📝 [DateInterval] 处理第3行
  - dateValue: 45962
  - dateValueType: number
  - groupValue: 北京市丰台区...
  - implementer: 韩文斌
  ✓ 解析结果: 2025-11-01
  ✓ 添加到分组: 韩文斌|北京市丰台区...

📊 [DateInterval] 分组统计
  - totalGroups: 16
  - groups: [...]

🔎 [DateInterval] 开始检查日期间隔（要求≥2天）
  检查分组: 韩文斌|北京市丰台区... (2次访问)
    比较: 第3行 → 第7行
      - previousDate: 2025-11-01
      - currentDate: 2025-11-01
      - daysDiff: 0
      - requiredDays: 2
      - isViolation: true
    ❌ 发现违规！

✅ [DateInterval] 验证完成，发现1个错误
```

---

## 📊 如何在页面调试

### 1. 打开浏览器开发者工具
- Chrome/Edge: `F12` 或 `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
- 切换到 **Console** 标签

### 2. 上传Excel文件进行验证
- 选择任务类型: "民营医院拜访"
- 上传文件: `卓联凯11月证据链.xlsx`
- 点击"开始验证"

### 3. 查看控制台日志

**关键信息**:
1. **规则是否被触发**: 查找 `[CrossRowValidation]` 日志
2. **列索引是否正确**: 查找 `[DateInterval] 列索引映射`
3. **日期是否正确解析**: 查找每行的 `解析结果`
4. **分组是否正确**: 查找 `分组统计`
5. **是否检测到违规**: 查找 `发现违规`

### 4. 常见问题排查

#### 问题1: 看不到日志
- **原因**: 可能是生产环境，console.log被禁用
- **解决**: 在开发环境测试 (`npm run dev`)

#### 问题2: 显示"找不到列索引"
```
⚠️ [CrossRowValidation] 跳过规则（找不到列索引）: visitStartTime
```
- **原因**: 字段映射错误或表头不匹配
- **检查**: `fieldMapping` 中是否有 `visitStartTime` 的映射

#### 问题3: 显示"日期解析失败"
```
⚠️ 日期解析失败
```
- **原因**: 日期格式不支持或列索引错误
- **检查**: `dateValue` 的值和类型

#### 问题4: 没有触发dateInterval规则
```
crossRowRulesCount: 1  // 应该是3
```
- **原因**: 规则配置错误或被过滤掉
- **检查**: `validationRules.ts` 中的规则配置

---

## ✨ 修复后的效果

### 修复前
- ❌ 第3行和第7行重复拜访 → **未检测出**
- 系统显示: "验证通过，未发现错误"

### 修复后
- ✅ 第3行和第7行重复拜访 → **成功检测**
- 系统显示: "第7行: 同一医院2日内不能重复拜访（与第3行冲突，实施人：韩文斌，目标：北京市丰台区看丹街道榆树庄村社区卫生服务站）"

---

## 📝 验证步骤

1. **重新构建项目** (如果需要)
   ```bash
   npm run build
   ```

2. **启动开发服务器**
   ```bash
   npm run dev
   ```

3. **打开浏览器**
   - 访问 `http://localhost:3000`
   - 打开开发者工具 (F12)

4. **上传测试文件**
   - 选择"民营医院拜访"
   - 上传 `卓联凯11月证据链.xlsx`

5. **查看结果**
   - 控制台应显示详细的验证日志
   - 错误列表应显示第7行的重复拜访错误

---

## 🎯 总结

### 核心修复
- **field参数**: 必须指向**日期字段**（`visitStartTime`），用于读取日期值
- **groupBy参数**: 指向**分组字段**（`hospitalName`/`doctorName`），用于分组

### 正确理解
```typescript
{
  field: "visitStartTime",     // 从这个字段读取日期
  type: "dateInterval",
  params: { 
    days: 2,                   // 要求间隔≥2天
    groupBy: "hospitalName"    // 按这个字段分组
  },
  message: "同一医院2日内不能重复拜访"
}
```

### 验证逻辑
1. 从 `visitStartTime` 列读取日期
2. 按 `实施人 + hospitalName` 分组
3. 检查每组内相邻日期的间隔
4. 如果间隔 < 2天，报错

---

## 📅 修复时间
2025年11月10日 22:26

## 📁 相关文件
- `src/lib/validationRules.ts` - 规则配置修复
- `src/lib/frontendValidator.ts` - 添加调试日志
- `diagnose-duplicate-visits.js` - 诊断工具
- `BUG_FIX_DATE_INTERVAL.md` - 本文档
