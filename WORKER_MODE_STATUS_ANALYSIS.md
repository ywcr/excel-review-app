# Worker 模式状态分析报告

## 📋 概述

Worker 模式是 API 自动化的一个**后台执行变体**，使用 Web Worker 在独立线程中执行任务，避免阻塞主线程 UI。

## 🎯 当前状态：**⚠️ 部分可用，但未同步最新优化**

### ✅ 可用的功能

1. **基础结构完整**：

   - 内联 Worker 实现（无需外部脚本文件）
   - 消息通信机制正常
   - 错误处理和回退机制存在

2. **基本签名机制**：

   - HMAC-SHA256 签名实现
   - 参数格式化和排序（`formatParams`）
   - Query String 生成（`toQueryString`）
   - 255 字符截断逻辑

3. **调用接口**：
   ```javascript
   automaticApi(targetDate, startFrom, (useWorker = true));
   ```

### ❌ 缺失的关键优化（未同步）

根据近期对 API 模式的优化，Worker 模式**缺少以下关键修复**：

---

## 🚨 缺失优化 #1: 动态参数读取

### 问题

Worker 模式使用**硬编码的默认值**，无法从页面动态读取参数。

**Worker 代码（第 337-357 行）**：

```javascript
function buildRequestData(task, config) {
  const temp = {
    name: task.name,
    sex: task.sex,
    date: task.date,
    answers: JSON.stringify(task.answers || []), // ❌ 错误：使用 JSON.stringify
    recId: "",
    nvcVal: "",
    latLng: "",
    projectId: (config && config.projectId) || "1756460958725101", // ❌ 硬编码
    corpId: (config && config.corpId) || "1749721838789101", // ❌ 硬编码
    projectTpl: (config && config.projectTpl) || "1756451075934101",
    sponsorProjectId: (config && config.sponsorProjectId) || "1756451241652103",
    // ... 其他字段
  };
  // ...
}
```

**API 模式已修复（第 465-600 行）**：

```javascript
// 动态从页面 hidden input 读取
const getInputValue = (name, fallback = "") => {
  const input = targetWindow.document.querySelector(`input[name="${name}"]`);
  return input ? input.value : fallback;
};

let projectId = getInputValue("projectId", "");
if (!projectId || projectId === config.projectId) {
  const urlProjectId = getProjectIdFromUrl();
  if (urlProjectId) {
    projectId = urlProjectId;
  }
}

const corpId = getInputValue("corpId", config.corpId || "1749721838789101");
// ... 其他参数
```

**影响**：

- Worker 模式无法获取正确的 `projectId`、`corpId` 等参数
- 可能导致提交到错误的项目或公司
- 验签时使用错误的参数

---

## 🚨 缺失优化 #2: 问卷结构字段（questions/options/types）

### 问题

Worker 模式**完全缺少** `questions`、`options`、`types` 字段。

**Worker 代码（第 337-362 行）**：

```javascript
function buildRequestData(task, config) {
  const temp = {
    name: task.name,
    sex: task.sex,
    // ... 其他字段
    // ❌ 缺失：questions、options、types
  };
  // ...
}
```

**API 模式已包含（第 547-560 行）**：

```javascript
const questionsInput = targetWindow.document.querySelector(
  'input[name="questions"]'
);
const optionsInput = targetWindow.document.querySelector(
  'input[name="options"]'
);
const typesInput = targetWindow.document.querySelector('input[name="types"]');

const questionsValue = questionsInput ? questionsInput.value : "";
const optionsValue = optionsInput ? optionsInput.value : "";
const typesValue = typesInput ? typesInput.value : "";

// 添加到 paramsForSign
const paramsForSign = {
  // ... 其他字段
  questions: questionsValue,
  options: optionsValue,
  types: typesValue,
};
```

**影响**：

- 签名中缺少这三个字段
- **验签几乎必然失败**（因为后端期望这些字段在签名中）
- 这是 Worker 模式最严重的问题

---

## 🚨 缺失优化 #3: answers 字段格式错误

### 问题

Worker 模式使用 `JSON.stringify(task.answers)`，而应该使用 `#` 分隔符。

**Worker 代码（第 342 行）**：

```javascript
answers: JSON.stringify(task.answers||[]),  // ❌ 错误格式
```

**API 模式已修复（第 520-521 行）**：

```javascript
const answersString = requestData.answers
  .filter((a) => a !== undefined)
  .join("#"); // ✅ 正确格式
```

**影响**：

- 后端无法正确解析答案
- 签名也会不匹配
- 导致 `系统异常！` 或 `验签失败`

---

## 🚨 缺失优化 #4: NVCVal（无痕验证值）

### 问题

Worker 模式的 `nvcVal` 永远为空字符串。

**Worker 代码（第 343 行）**：

```javascript
nvcVal:'',  // ❌ 永远为空
```

**API 模式已修复（第 627-658 行）**：

```javascript
const nvcValHidden = getInputValue("nvcVal", "");
let nvcVal = "";
try {
  const nvcObj = targetWindow && targetWindow.nvc;
  if (nvcObj && typeof nvcObj.getNVCValAsync === "function") {
    nvcVal = await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(nvcValHidden);
      }, 3000);

      nvcObj.getNVCValAsync(function (val) {
        clearTimeout(timeout);
        resolve(val || nvcValHidden);
      });
    });
  } else {
    nvcVal = nvcValHidden;
  }
} catch (e) {
  nvcVal = nvcValHidden;
}
```

**影响**：

- 无法通过滑块验证
- 后端可能拒绝请求（安全校验失败）
- **Worker 模式几乎不可用**

---

## 🚨 缺失优化 #5: toQueryString 不应 URL 编码

### 问题

Worker 模式的 `encodeForm` 函数使用了 `encodeURIComponent`，而签名用的 `toQueryString` 也应该避免编码。

**Worker 代码（第 321-329 行）**：

```javascript
function encodeForm(data) {
  const params = [];
  for (const k in data) {
    // ...
    params.push(encodeURIComponent(k) + "=" + encodeURIComponent(v)); // ⚠️ 编码了
  }
  return params.join("&");
}
```

**API 模式已修复（第 148-149 行）**：

```javascript
"function toQueryString(obj){ const part=[]; for(const [key,value] of Object.entries(obj)){ if(typeof value==='object'){ part.push(key+'='+JSON.stringify(value)); }else{ part.push(key+'='+value); } } return part.join('&'); }",
// ⚠️ 不使用 encodeURIComponent
```

**影响**：

- 签名计算可能不匹配
- 虽然请求体需要编码，但签名用的字符串不应编码

---

## 🚨 缺失优化 #6: answerN 参数包含逻辑

### 问题

Worker 模式简单地添加所有 `answerN`，但没有多选字段的特殊处理。

**Worker 代码（第 358 行）**：

```javascript
if (Array.isArray(task.answers)) {
  task.answers.forEach((ans, i) => {
    if (ans !== undefined) {
      temp["answer" + i] = ans;
    }
  });
}
```

**API 模式更详细（第 706-724 行）**：

```javascript
// 添加所有 answerN 到签名（包括多选）
requestData.answers.forEach((answer, index) => {
  if (answer !== undefined && answer !== "") {
    cleanedParamsForSign[`answer${index}`] = answer;
    if (typesValue) {
      const typeList = typesValue.split("#");
      const typeName = (typeList[index] || "").trim();
      console.log(`  ✅ answer${index} (${typeName}): 加入签名`);
    } else {
      console.log(`  ✅ answer${index}: 加入签名`);
    }
  }
});
```

**影响**：

- 没有日志输出，调试困难
- 不检查 `types` 字段来确定题型
- 虽然逻辑相似，但缺少调试能力

---

## 🚨 缺失优化 #7: 盐值并发覆盖问题

### 问题

Worker 模式是**串行执行**，每个任务间隔 `interval` 时间，理论上不存在并发覆盖问题。但是，如果未来改为并发，就会遇到和 `automaticApiFast` 相同的问题。

**Worker 代码（第 370-391 行）**：

```javascript
for(let i=0;i<tasks.length;i++){
  const t=tasks[i];
  try{
    const salt=await getSalt(config);  // ⚠️ 每个任务都获取新盐值
    // ...
  }
  // ...
  if(i<tasks.length-1){
    await new Promise(r=>setTimeout(r, interval));  // ✅ 串行，有间隔
  }
}
```

**当前状态**：

- ✅ 串行执行，不存在并发覆盖
- ⚠️ 但也无法享受 `automaticApiFast` 的并发加速

---

## 🚨 缺失优化 #8: 执行控制（暂停/恢复/停止）

### 问题

Worker 模式**完全没有**暂停/恢复/停止控制。

**Worker 代码**：

- 没有 `shouldStop`、`isPaused` 检查
- 一旦开始，无法中途停止
- 只能通过 `terminate()` 强制终止 Worker

**API 模式已实现（第 1242-1331 行）**：

```javascript
isRunning = true;
isPaused = false;
shouldStop = false;

for (let i = 0; i < dataToProcess.length; i++) {
  if (shouldStop) {
    console.log("⏹️ 用户请求停止执行");
    break;
  }

  while (isPaused && !shouldStop) {
    console.log("⏸️ 执行已暂停，等待恢复...");
    updateProgressDisplay();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // ... 执行任务
}
```

**影响**：

- 用户体验差
- 无法灵活控制执行
- 紧急情况下只能强制终止

---

## 🚨 缺失优化 #9: 进度显示

### 问题

Worker 模式有基础的进度消息，但没有和 UI 的进度条集成。

**Worker 代码（第 389 行）**：

```javascript
self.postMessage({
  type: "BATCH_PROGRESS",
  data: {
    current: i + 1,
    total: tasks.length,
    successCount: successCount,
    failCount: failCount,
  },
});
```

**主线程接收（第 438-440 行）**：

```javascript
case 'BATCH_PROGRESS':
    console.log(`📋 [Worker] 进度: ${data.current}/${data.total} (成功: ${data.successCount}, 失败: ${data.failCount})`);
    break;  // ❌ 只是 console.log，没有更新 UI
```

**API 模式已实现（第 1299-1307 行）**：

```javascript
// 更新进度
if (
  typeof executionStats !== "undefined" &&
  typeof updateProgressDisplay === "function"
) {
  executionStats.current = i + 1;
  executionStats.success = successCount;
  executionStats.failed = failCount;
  updateProgressDisplay(); // ✅ 更新 UI 进度条
}
```

**影响**：

- 用户看不到实时进度条
- 只能通过控制台看到进度
- 体验不如非 Worker 模式

---

## 🚨 缺失优化 #10: 起始位置/恢复功能

### 问题

Worker 模式不支持 `startFrom` 参数，无法从中间位置恢复执行。

**Worker 接口（第 1357 行）**：

```javascript
async function automaticApiWithWorker(targetDate = null) {
  // ❌ 没有 startFrom 参数
}
```

**API 模式已支持（第 1174 行）**：

```javascript
async function automaticApi(
  targetDate = null,
  startFrom = null,
  useWorker = false
) {
  // ✅ 支持 startFrom
}
```

**影响**：

- 如果 Worker 模式执行到一半失败，无法从失败位置继续
- 必须重新从头开始
- 用户体验差

---

## 🚨 缺失优化 #11: encryptedText 不应发送到请求体

### 问题

虽然 Worker 代码中看起来没有将 `encryptedText` 加入 `temp` 对象，但逻辑不够清晰。

**Worker 代码（第 337-362 行）**：

```javascript
function buildRequestData(task, config) {
  const temp = {
    /* ... */
  };
  // ...
  const formatted = formatParams(temp);
  const encrypted = toQueryString(formatted);
  const finalText =
    encrypted.length > 255 ? encrypted.substring(0, 255) : encrypted;
  return { data: temp, encryptedText: finalText };
}
```

**使用（第 374-381 行）**：

```javascript
const req = buildRequestData(t, config);
const signature = await hmacSHA256Hex(req.encryptedText, salt.signkey);
// ...
const body = encodeForm(req.data); // ⚠️ 看起来没有包含 encryptedText
```

**当前状态**：

- ✅ 看起来是正确的（`encryptedText` 没有加入 `req.data`）
- ⚠️ 但代码可读性差，不够清晰

---

## 🚨 缺失优化 #12: 错误响应处理

### 问题

Worker 模式**将所有请求都视为成功**，只要没有抛出异常。

**Worker 代码（第 372-388 行）**：

```javascript
try{
  const salt=await getSalt(config);
  const req=buildRequestData(t, config);
  const signature=await hmacSHA256Hex(req.encryptedText, salt.signkey);
  // ... 发送请求
  const res=await fetch(url, {...});
  const json=await res.json().catch(()=>({}));
  successCount++;  // ❌ 不管响应内容，直接算成功
  self.postMessage({type:'TASK_COMPLETE', data:{ taskData:t, result:json }});
}catch(err){
  failCount++;
  self.postMessage({type:'TASK_ERROR', data:{ taskData:t, error: ... }});
}
```

**API 模式已修复（第 809-833 行）**：

```javascript
// 检查响应
if (typeof result === "number") {
  if (result === 0 || result === 1 || result === 200) {
    return { success: true, data: { code: result } };
  } else {
    throw new Error(`API返回错误码: ${result}`);
  }
}

const code = result.code || result.errCode;
const message = result.message || result.errMsg;

if (
  code === 0 ||
  code === "0" ||
  code === 1 ||
  code === "1" ||
  code === 200 ||
  code === "200"
) {
  return { success: true, data: result };
}

// 错误处理
if (code === 5000 || code === "5000") {
  throw new Error(`系统异常: ${message}`);
}

throw new Error(`API失败: ${message}`);
```

**影响**：

- Worker 模式可能将失败的请求计入成功
- 统计数据不准确
- 用户误以为任务成功完成

---

## 📊 优化对比总结表

| 优化项                              | API 模式    | Worker 模式   | 优先级 |
| ----------------------------------- | ----------- | ------------- | ------ |
| 动态参数读取（projectId/corpId 等） | ✅ 已实现   | ❌ 缺失       | 🔴 高  |
| questions/options/types 字段        | ✅ 已实现   | ❌ 缺失       | 🔴 高  |
| answers 格式（# 分隔符）            | ✅ 已实现   | ❌ 缺失       | 🔴 高  |
| NVCVal 动态获取                     | ✅ 已实现   | ❌ 缺失       | 🔴 高  |
| toQueryString 不编码                | ✅ 已实现   | ⚠️ 需检查     | 🟡 中  |
| answerN 包含逻辑                    | ✅ 详细日志 | ⚠️ 无日志     | 🟢 低  |
| 盐值并发覆盖                        | ✅ 已修复   | ✅ 串行无影响 | 🟢 低  |
| 执行控制（暂停/恢复/停止）          | ✅ 已实现   | ❌ 缺失       | 🟡 中  |
| 进度显示（UI 进度条）               | ✅ 已实现   | ❌ 缺失       | 🟡 中  |
| 起始位置/恢复功能                   | ✅ 已实现   | ❌ 缺失       | 🟡 中  |
| encryptedText 不发送到请求体        | ✅ 已修复   | ✅ 看起来正确 | 🟢 低  |
| 错误响应处理                        | ✅ 详细判断 | ❌ 全算成功   | 🔴 高  |

---

## 🎯 结论

### 当前状态

**Worker 模式目前处于 ⚠️ 不可用状态**，主要原因：

1. **🔴 致命缺陷**：

   - 缺少 `questions/options/types` 字段 → **验签必然失败**
   - `answers` 格式错误 → **后端无法解析**
   - `nvcVal` 为空 → **安全校验失败**
   - 动态参数读取缺失 → **提交到错误的项目**

2. **🟡 体验问题**：

   - 无法暂停/恢复/停止
   - 没有 UI 进度条
   - 无法从中间恢复

3. **🟢 次要问题**：
   - 错误响应处理不完善
   - 调试日志不足

### 建议

#### 方案 1：修复 Worker 模式（工作量大）

需要同步所有 12 项优化，预计工作量：

- 修改 Worker 内联代码（第 313-396 行）
- 修改 `automaticApiWithWorker` 函数（第 1357-1439 行）
- 增加执行控制机制
- 集成进度显示
- 添加起始位置支持

**优点**：

- 后台执行，不阻塞 UI
- 符合最初的设计意图

**缺点**：

- 工作量巨大
- Worker 内运行环境受限（无法访问 DOM）
- `nvcVal` 动态获取可能无法在 Worker 中实现
- 维护成本高（每次优化需要同步到 Worker）

#### 方案 2：弃用 Worker 模式（推荐）

直接使用 `automaticApi`（串行）或 `automaticApiFast`（并发）。

**优点**：

- 功能完整，所有优化都已实现
- 维护简单，只需维护一套代码
- 执行控制完善
- 进度显示准确
- 支持起始位置/恢复

**缺点**：

- 长时间执行可能阻塞 UI（但实际影响很小）
- 无法利用多线程并发（但 `automaticApiFast` 已经有错峰并发）

#### 方案 3：标记为实验性功能

保留 Worker 模式代码，但标记为"实验性/不建议使用"。

**理由**：

- Worker 环境限制（无法访问 DOM、无法获取 nvcVal）
- 维护成本太高
- 实际收益不大（`automaticApiFast` 已经足够快）

---

## 🔧 快速修复建议（如果必须修复 Worker）

如果您决定修复 Worker 模式，以下是**最小可用性修复清单**（只修复致命问题）：

### 修复 1：从主线程传递动态参数

```javascript
// 在 automaticApiWithWorker 中
const dynamicParams = {
  projectId: getInputValue("projectId"),
  corpId: getInputValue("corpId"),
  questions: document.querySelector('input[name="questions"]')?.value || "",
  options: document.querySelector('input[name="options"]')?.value || "",
  types: document.querySelector('input[name="types"]')?.value || "",
  nvcVal: await getNVCVal(), // 主线程获取
};

apiWorker.postMessage({
  type: "BATCH_CREATE",
  data: {
    tasks: tasks,
    config: { ...config, ...dynamicParams }, // 合并动态参数
    interval: apiRequestInterval,
  },
});
```

### 修复 2：Worker 代码更新

```javascript
// 在 buildRequestData 中
function buildRequestData(task, config) {
  const answersString = (task.answers || [])
    .filter((a) => a !== undefined)
    .join("#"); // ✅ 修复

  const temp = {
    name: task.name,
    sex: task.sex,
    date: task.date,
    answers: answersString, // ✅ 修复
    recId: "",
    nvcVal: config.nvcVal || "", // ✅ 修复
    latLng: "",
    projectId: config.projectId, // ✅ 从 config 读取
    corpId: config.corpId,
    // ... 其他字段
    questions: config.questions || "", // ✅ 添加
    options: config.options || "", // ✅ 添加
    types: config.types || "", // ✅ 添加
  };

  // 添加 answerN
  if (Array.isArray(task.answers)) {
    task.answers.forEach((ans, i) => {
      if (ans !== undefined && ans !== "") {
        temp["answer" + i] = ans;
      }
    });
  }

  // ⚠️ 重要：排除 fieldName, fill, nvcVal 从签名
  const paramsForSign = { ...temp };
  delete paramsForSign.fieldName;
  delete paramsForSign.fill;
  delete paramsForSign.nvcVal;

  const formatted = formatParams(paramsForSign); // ✅ 使用过滤后的参数
  const encrypted = toQueryString(formatted);
  const finalText =
    encrypted.length > 255 ? encrypted.substring(0, 255) : encrypted;
  return { data: temp, encryptedText: finalText };
}
```

### 修复 3：错误响应处理

```javascript
// 在 Worker 的请求处理中
const res=await fetch(url, {...});
const json=await res.json().catch(()=>({}));

// ✅ 添加响应检查
const code = json.code || json.errCode;
if (code === 0 || code === '0' || code === 1 || code === '1' || code === 200 || code === '200' || json === 1) {
    successCount++;
    self.postMessage({type:'TASK_COMPLETE', data:{ taskData:t, result:json }});
} else {
    failCount++;
    const errMsg = json.message || json.errMsg || '未知错误';
    self.postMessage({type:'TASK_ERROR', data:{ taskData:t, error: errMsg }});
}
```

---

## 💡 最终建议

**强烈建议采用方案 2：弃用 Worker 模式**

理由：

1. `automaticApi` + `automaticApiFast` 已经满足所有需求
2. Worker 模式维护成本极高（每次优化需要同步两套代码）
3. Worker 环境限制导致某些功能（如 `nvcVal` 动态获取）难以实现
4. 实际测试表明，主线程执行的性能已经足够好

**行动建议**：

1. 在文档中标记 Worker 模式为"已弃用/实验性"
2. 移除或注释掉 Worker 相关代码
3. 引导用户使用 `automaticApi()` 或 `automaticApiFast()`
4. 在控制面板中移除 Worker 相关选项

如果坚持要修复 Worker 模式，请至少完成上述"快速修复建议"中的 3 项修复，否则 Worker 模式将**完全不可用**。
