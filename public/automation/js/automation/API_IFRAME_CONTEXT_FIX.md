# API 模式 iframe 上下文修复

## 问题描述

API 模式执行时出现以下错误：

```
errCode: '5000', errMsg: '系统异常！'
```

日志显示关键参数为空或使用默认值：

```javascript
options: "";
questions: "";
types: "";
projectId: "1756460958725101"; // 硬编码的默认值
```

## 根本原因

**脚本在错误的上下文中执行**：

- API 模式的脚本在外层页面（`app.jsp`）执行
- 但问卷的隐藏字段（`questions`, `options`, `types`, `projectId` 等）在 iframe 内的问卷页面（`xfzwj.jsp`）中
- 原有的 `targetWindow` 逻辑无法正确找到 iframe，导致从当前窗口（`window`）读取参数，结果全部为空

## 原有逻辑的问题

```javascript
// 问题代码
const targetWindow =
  typeof contentWindow !== "undefined"
    ? contentWindow
    : document.querySelector("#ssfwIframe")?.contentWindow || window;
```

**问题分析**：

1. `contentWindow` 变量只在 DOM 模式的模板中定义，API 模式中不存在
2. `#ssfwIframe` 选择器可能找不到 iframe（ID 可能不同）
3. 如果找不到 iframe，就回退到 `window`（当前页面），导致读取失败

## 修复方案

### 1. 增强 iframe 查找逻辑

```javascript
let targetWindow = window;

// 优先使用 DOM 模式定义的 contentWindow
if (typeof contentWindow !== "undefined" && contentWindow) {
  targetWindow = contentWindow;
}
// 否则尝试查找 iframe（支持多种问卷类型）
else {
  const iframe =
    document.querySelector("#ssfwIframe") ||
    document.querySelector('iframe[src*="xfzwj"]') || // 消费者问卷
    document.querySelector('iframe[src*="hzwj"]') || // 患者问卷
    document.querySelector('iframe[src*="yswj"]') || // 医生问卷
    document.querySelector('iframe[src*="dywj"]'); // 店员问卷
  if (iframe && iframe.contentWindow) {
    targetWindow = iframe.contentWindow;
  }
}

console.log(
  "🔍 目标窗口:",
  targetWindow === window ? "当前窗口" : "iframe窗口"
);
```

### 1.5. 添加 projectId 的多重获取策略

**问题**：即使找到了 iframe，隐藏字段可能仍然为空。

**解决**：参考"验证遗漏"功能，添加从 URL 获取 projectId 的备选方案：

```javascript
// 辅助函数：从URL获取projectId（与验证功能保持一致）
const getProjectIdFromUrl = () => {
  // 方法1: 从当前页面URL获取
  const urlParams = new URLSearchParams(window.location.search);
  let id = urlParams.get("projectId");
  if (id) return id;

  // 方法2: 从iframe的URL获取
  const iframe =
    document.querySelector("#ssfwIframe") ||
    document.querySelector('iframe[src*="xfzwj"]') ||
    document.querySelector('iframe[src*="hzwj"]') ||
    document.querySelector('iframe[src*="yswj"]') ||
    document.querySelector('iframe[src*="dywj"]');
  if (iframe) {
    try {
      const iframeSrc = iframe.contentWindow.location.href;
      const iframeParams = new URLSearchParams(iframeSrc.split("?")[1]);
      id = iframeParams.get("projectId");
      if (id) return id;
    } catch (e) {
      // 跨域限制，尝试从src属性获取
      const src = iframe.getAttribute("src");
      if (src) {
        const srcParams = new URLSearchParams(src.split("?")[1]);
        id = srcParams.get("projectId");
        if (id) return id;
      }
    }
  }
  return null;
};

// 优先从隐藏字段读取，如果失败则从URL获取
let projectId = getInputValue("projectId", "");
if (!projectId || projectId === config.projectId) {
  const urlProjectId = getProjectIdFromUrl();
  if (urlProjectId) {
    console.log("📋 从URL获取projectId:", urlProjectId);
    projectId = urlProjectId;
  } else {
    projectId = config.projectId || "1756460958725101";
  }
}
```

**优势**：

- 与"验证遗漏"功能使用相同的逻辑
- 多重备选方案，提高成功率
- 即使隐藏字段为空，也能从 URL 获取

### 2. 添加参数缺失检测

```javascript
if (!questionsValue || !optionsValue || !typesValue) {
  console.warn("⚠️ 问卷结构字段缺失:", {
    hasQuestions: !!questionsValue,
    hasOptions: !!optionsValue,
    hasTypes: !!typesValue,
    questionsLength: questionsValue.length,
    optionsLength: optionsValue.length,
    typesLength: typesValue.length,
  });
  console.warn("💡 请确保在问卷页面（xfzwj.jsp等）的 iframe 内执行脚本");
}
```

### 3. 添加项目参数验证

```javascript
console.log("📋 从页面读取的项目参数:", {
  projectId: projectId ? projectId.substring(0, 10) + "..." : "(空)",
  corpId: corpId ? corpId.substring(0, 10) + "..." : "(空)",
  title: title ? title.substring(0, 20) + "..." : "(空)",
  hasNvcVal: !!nvcVal,
  hasQuestions: !!questionsValue,
  hasOptions: !!optionsValue,
  hasTypes: !!typesValue,
});

// 如果关键参数缺失，给出明确提示
if (!projectId || projectId === config.projectId || !questionsValue) {
  console.error("❌ 关键参数缺失或使用了默认值！");
  console.error("💡 解决方案：");
  console.error("   1. 确保在问卷页面（如 xfzwj.jsp）内执行");
  console.error("   2. 或者在外层页面先打开问卷 iframe");
  console.error("   3. 检查 iframe 选择器是否正确");
}
```

## 使用说明

### 正确的执行方式

#### 方式 1：在 iframe 内执行（推荐）

1. 打开问卷页面，确保 iframe 已加载
2. 在浏览器控制台切换到 iframe 上下文
3. 粘贴并执行生成的脚本
4. 执行 `startApi()` 或 `automaticApi()`

#### 方式 2：在外层页面执行

1. 确保问卷 iframe 已加载并可访问
2. 脚本会自动查找 iframe
3. 查看日志确认找到了正确的 iframe：
   ```
   🔍 目标窗口: iframe窗口
   ```
4. 确认参数读取成功（不是空值或默认值）

### 验证方法

执行脚本后，查看控制台日志：

**✅ 成功的标志**：

```
🔍 目标窗口: iframe窗口
📋 从页面读取的项目参数: {
  projectId: '1757128526...',  // 实际项目ID，不是默认值
  corpId: '1733101264...',
  title: '西黄丸消费者问卷25.9.5...',
  hasNvcVal: true,
  hasQuestions: true,
  hasOptions: true,
  hasTypes: true
}
```

**❌ 失败的标志**：

```
🔍 目标窗口: 当前窗口
⚠️ 问卷结构字段缺失: {
  hasQuestions: false,
  hasOptions: false,
  hasTypes: false,
  ...
}
❌ 关键参数缺失或使用了默认值！
```

## 相关修改

### 修改文件

- `public/automation/js/automation/execution-logic.js`

### 关键改动

1. **增强 iframe 查找**：支持多种选择器，覆盖不同问卷类型
2. **添加调试日志**：明确显示使用的窗口上下文
3. **参数验证**：检测并警告参数缺失或使用默认值
4. **用户提示**：提供清晰的错误信息和解决方案

## 预期效果

修复后：

1. ✅ 脚本能正确找到问卷 iframe
2. ✅ 成功读取 `questions`, `options`, `types` 等字段
3. ✅ 使用实际的项目参数，而不是硬编码默认值
4. ✅ API 请求包含完整的签名参数
5. ✅ 后端验签成功，创建任务成功

## 修复日期

2025-10-05

## 相关问题

- API_DYNAMIC_PARAMS_FIX.md - 动态参数读取修复
- API_SIGNATURE_FINAL_FIX.md - 签名验证修复
