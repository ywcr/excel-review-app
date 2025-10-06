# API 模式动态参数读取修复

## 问题描述

API 模式自动化创建时，出现以下错误：

- **错误 1**: `{"errCode":"5000","errMsg":"系统异常！"}`
- **错误 2**: `{"code":5000,"message":"安全校验失败-验签失败","data":null,"count":null}`

对比手动创建的成功请求和自动化的失败请求，发现以下关键差异：

### 1. 项目参数不一致

- **问题**: 自动化使用硬编码的默认项目 ID/配置
- **影响**: 后端根据项目配置进行校验，项目不匹配会返回"系统异常"
- **差异示例**:

  ```javascript
  // 自动化（失败）
  projectId: "1756460958725101";
  corpId: "1749721838789101";
  title: "致力庆西黄丸消费者问卷";

  // 手动（成功）
  projectId: "1757128526764101";
  corpId: "1733101264425101";
  title: "西黄丸消费者问卷25.9.5（平晓）";
  ```

### 2. nvcVal（滑块验证）缺失

- **问题**: 自动化请求中 `nvcVal` 为空字符串
- **影响**: 后端风控检测到未通过滑块验证，直接返回"系统异常"
- **差异示例**:

  ```javascript
  // 自动化（失败）
  nvcVal: "";

  // 手动（成功）
  nvcVal: "%257B%2522a%2522%253A%2522FFFF0N0000000000B194%2522%252C..."; // 长JSON字符串
  ```

### 3. 请求上下文不同

- **问题**: referrer 和页面上下文不一致
- **影响**: 部分风控/上下文校验依赖当前页面（tabName、workOrderType）
- **差异示例**:

  ```javascript
  // 自动化（失败）
  referrer: "https://zxyy.ltd/lgb/mobile/app.jsp?flag=true";

  // 手动（成功）
  referrer: "https://zxyy.ltd/lgb/mobile/xfzwj.jsp?t=true&projectId=1757128526764101&...";
  ```

## 根本原因

**自动化脚本使用硬编码的默认值，而不是从当前问卷页面实时读取参数。**

这导致：

1. 项目配置与当前问卷不匹配 → 系统异常
2. 缺少滑块验证值 → 风控拦截
3. 上下文信息不完整 → 校验失败

## 修复方案

### 修改文件

`/Users/yao/Yao/excel-review-app/public/automation/js/automation/execution-logic.js`

### 核心改动

#### 1. 从页面实时读取所有项目参数

**修改前**（硬编码）:

```javascript
projectId: config.projectId || "1756460958725101",
corpId: config.corpId || "1749721838789101",
projectTpl: config.projectTpl || "1756451075934101",
sponsorProjectId: config.sponsorProjectId || "1756451241652103",
title: config.title || "致力庆西黄丸消费者问卷",
memo: config.memo || "为了充分了解客户对于西黄丸产品评价...",
dcdxName: config.dcdxName || "吴承",
nvcVal: "",
channelAddress: "",
latLng: "",
recId: ""
```

**修改后**（动态读取）:

```javascript
// 定义辅助函数从页面读取隐藏字段
const getInputValue = (name, fallback = "") => {
  const input = targetWindow.document.querySelector(`input[name="${name}"]`);
  return input ? input.value : fallback;
};

// 从页面实时读取所有参数
const projectId = getInputValue(
  "projectId",
  config.projectId || "1756460958725101"
);
const corpId = getInputValue("corpId", config.corpId || "1749721838789101");
const projectTpl = getInputValue(
  "projectTpl",
  config.projectTpl || "1756451075934101"
);
const sponsorProjectId = getInputValue(
  "sponsorProjectId",
  config.sponsorProjectId || "1756451241652103"
);
const title = getInputValue("title", config.title || "致力庆西黄丸消费者问卷");
const memo = getInputValue("memo", config.memo || "...");
const way = getInputValue("way", "实名调查");
const dcdxName = getInputValue("dcdxName", config.dcdxName || name);
const channelAddress = getInputValue("channelAddress", "");
const latLng = getInputValue("latLng", "");
const recId = getInputValue("recId", "");
const nvcVal = getInputValue("nvcVal", ""); // ⚠️ 关键：滑块验证值
```

#### 2. 添加 nvcVal 缺失警告

```javascript
if (!nvcVal) {
  console.warn("⚠️ 未检测到 nvcVal（滑块验证值），可能导致提交失败");
  console.warn("💡 建议：在问卷页面手动完成一次滑块验证后再执行自动化");
}
```

#### 3. 添加参数读取日志

```javascript
console.log("📋 从页面读取的项目参数:", {
  projectId: projectId.substring(0, 10) + "...",
  corpId: corpId.substring(0, 10) + "...",
  title: title.substring(0, 20) + "...",
  hasNvcVal: !!nvcVal,
});
```

#### 4. 在签名和请求中使用动态值

**paramsForSign**（用于签名）:

```javascript
const paramsForSign = {
  name: requestData.name,
  sex: requestData.sex,
  date: requestData.date,
  answers: answersString,
  recId: recId, // 动态读取
  latLng: latLng, // 动态读取
  projectId: projectId, // 动态读取
  corpId: corpId, // 动态读取
  projectTpl: projectTpl, // 动态读取
  sponsorProjectId: sponsorProjectId, // 动态读取
  isForward: 1,
  title: title, // 动态读取
  way: way, // 动态读取
  startTime: requestData.date,
  memo: memo, // 动态读取
  dcdxName: dcdxName, // 动态读取
  channelAddress: channelAddress, // 动态读取
};
```

**ajaxData**（发送请求）:

```javascript
const ajaxData = {
  name: requestData.name,
  sex: requestData.sex,
  date: requestData.date,
  answers: answersString,
  recId: recId,
  nvcVal: nvcVal, // ⚠️ 关键：滑块验证值
  latLng: latLng,
  projectId: projectId,
  corpId: corpId,
  projectTpl: projectTpl,
  sponsorProjectId: sponsorProjectId,
  isForward: 1,
  title: title,
  way: way,
  startTime: requestData.date,
  memo: memo,
  dcdxName: dcdxName,
  fieldName: "性别",
  fill: requestData.sex,
  channelAddress: channelAddress,
  questions: questionsValue,
  options: optionsValue,
  types: typesValue,
  encryptedText: finalEncryptedText,
};
```

## 使用说明

### 前置条件

1. **必须在问卷页面上下文中执行**

   - 确保 iframe 已加载问卷页面（如 `xfzwj.jsp`）
   - 页面中必须包含所有必要的隐藏字段

2. **必须先完成滑块验证**
   - 在执行自动化前，手动在问卷页面完成一次滑块验证
   - 验证成功后，页面会自动注入 `nvcVal` 值
   - 如果没有 `nvcVal`，脚本会发出警告但仍会尝试提交

### 执行流程

1. 打开问卷页面（如 `xfzwj.jsp`）
2. 手动完成一次滑块验证（如果有）
3. 加载自动化脚本
4. 执行 `startApi()` 或 `automaticApi()`
5. 脚本会自动从页面读取所有参数并提交

### 验证方法

执行自动化时，查看控制台日志：

```
📋 从页面读取的项目参数: {
  projectId: '1757128526...',
  corpId: '1733101264...',
  title: '西黄丸消费者问卷25.9.5...',
  hasNvcVal: true
}
```

如果 `hasNvcVal: false`，说明缺少滑块验证，可能导致提交失败。

## 预期效果

修复后，API 模式自动化将：

1. ✅ 使用与当前问卷页面完全一致的项目配置
2. ✅ 包含滑块验证值（如果页面已完成验证）
3. ✅ 携带完整的上下文信息
4. ✅ 通过后端的项目校验、风控校验、签名校验
5. ✅ 成功创建任务或返回业务级错误（如"重复提交"）

## 相关文件

- `execution-logic.js` - 主要修改文件
- `dcwj.js` (参考) - 后端签名验证逻辑
- `xfzwj.jsp` (参考) - 问卷页面结构

## 修复日期

2025-10-05

## 测试建议

1. 在不同的问卷项目中测试（不同的 projectId）
2. 测试有滑块验证和无滑块验证的情况
3. 验证日志输出是否正确显示读取的参数
4. 确认请求成功或返回正确的业务错误（而非"系统异常"）
