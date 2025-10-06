# 问卷创建起始位置与操作面板增强功能

## 功能概述

为问卷创建功能添加了起始位置支持，并增强了操作面板，使其功能与联系人创建保持一致，提供了更强大和便捷的操作体验。

## 实施日期

2025-10-05

## 功能清单

### ✅ 1. 问卷创建起始位置支持

为以下函数添加了 `startFrom` 参数：

| 函数                 | 新签名                                               | 说明                       |
| -------------------- | ---------------------------------------------------- | -------------------------- |
| `startApi()`         | `startApi(startFrom)`                                | 单步执行，可从指定位置开始 |
| `automaticApi()`     | `automaticApi(targetDate, startFrom, useWorker)`     | 串行执行，可从指定位置开始 |
| `automaticApiFast()` | `automaticApiFast(batchSize, targetDate, startFrom)` | 并发执行，可从指定位置开始 |

**使用方式**：

```javascript
// 按索引（从1开始）
startApi(25); // 从第25个开始
automaticApi(null, 25); // 从第25个开始自动执行
automaticApiFast(10, null, 25); // 从第25个开始快速执行

// 按姓名
startApi("张三"); // 从"张三"开始
automaticApi(null, "张三"); // 从"张三"开始自动执行
automaticApiFast(10, null, "张三"); // 从"张三"开始快速执行

// 结合日期筛选
automaticApi("09.06", 25); // 筛选9月6日，从第25个开始
automaticApiFast(10, "09.06", 25); // 筛选9月6日，从第25个开始快速执行
```

### ✅ 2. 新增辅助函数

#### `resetProgress()`

重置执行进度到第 1 个任务。

```javascript
resetProgress();
// 输出: ✅ 进度已重置，将从第1个任务开始执行
```

#### `setStartPosition(position)`

设置起始位置，支持数字（索引）或字符串（姓名）。

```javascript
// 设置到第25个
setStartPosition(25);
// 输出: ✅ 起始位置已设置为第 25 个: 张三

// 设置到指定姓名
setStartPosition("李四");
// 输出: ✅ 起始位置已设置为「李四」(第 30 个)

// 无效参数
setStartPosition("不存在的人");
// 输出: ❌ 未找到姓名「不存在的人」
```

### ✅ 3. 操作面板增强

#### 新增按钮

1. **快速创建联系人 🚀** （绿色按钮）

   - 调用 `startAddContactFast()`
   - 点击弹窗输入批次大小（默认 10）

2. **快速执行 ⚡** （绿色按钮）
   - 调用 `automaticApiFast()` 或 `automaticFast()`
   - 点击弹窗输入批次大小（默认 10）

#### 新增高级选项区域（API 模式）

可折叠的高级选项区域，包含：

```
▼ 高级选项
  间隔: [5000] [设置]
  起始: [____] [跳转] [重置]
```

**功能**：

- **间隔设置**：调整 API 请求间隔（毫秒），调用 `setApiInterval()`
- **起始位置**：设置执行起始位置（数字或姓名），调用 `setStartPosition()`
- **重置按钮**：重置进度到第 1 个，调用 `resetProgress()`

### ✅ 4. 控制台使用提示更新

```
可用命令:
  • startAddContact(起始位置) - 创建联系人（串行，安全）
  • startAddContactFast(批量大小, 起始位置) - 快速创建联系人（并发，默认10个/批）
    💡 起始位置可以是数字（如: 25）或姓名（如: "张三"）
  • startApi(起始位置) - 手动执行单个任务
  • automaticApi(日期, 起始位置) - 自动执行（串行，安全）
  • automaticApiFast(批量大小, 日期, 起始位置) - 快速批量执行（并发，默认10个/批）
    💡 起始位置可以是数字（如: 25）或姓名（如: "张三"）
  • setApiInterval(毫秒) - 设置API请求间隔（仅串行模式）
  • resetProgress() - 重置执行进度到第1个
  • setStartPosition(位置) - 设置起始位置
  • validateData() - 验证数据完整性
  • showMissing() - 显示缺失数据
  • updateWithMissing() - 补充缺失数据
```

## 新操作面板布局

```
┌─────────────────────────────────┐
│ 🧰 自动化控制台 (API模式)  - ×  │
├─────────────────────────────────┤
│ [创建联系人]     [快速创建🚀]   │
│ ────────────────────────────    │
│ [单步执行]       [自动执行]     │
│ [快速执行⚡]     [验证遗漏]     │
│ [补充遗漏]       [全部日期]     │
│ ┌─────────┐  ┌──────────┐      │
│ │日期输入框│  │按日期执行│      │
│ └─────────┘  └──────────┘      │
│ ────────────────────────────    │
│ ▼ 高级选项                      │
│   间隔: [5000] [设置]           │
│   起始: [____] [跳转] [重置]    │
└─────────────────────────────────┘
```

## 实现细节

### 文件修改

#### 1. `/public/automation/js/automation/execution-logic.js`

**新增函数**：

```javascript
// 重置执行进度
function resetProgress() {
    currentIndex = 0;
    console.log('✅ 进度已重置，将从第1个任务开始执行');
}

// 设置起始位置
function setStartPosition(position) {
    if (!data || data.length === 0) {
        console.error('❌ 没有数据可处理');
        return;
    }

    if (typeof position === 'number') {
        // 按索引（从1开始）
        const newIndex = Math.max(0, Math.min(position - 1, data.length - 1));
        currentIndex = newIndex;
        console.log(\`✅ 起始位置已设置为第 \${position} 个: \${data[newIndex].name}\`);
    } else if (typeof position === 'string') {
        // 按姓名查找
        const foundIndex = data.findIndex(item => item.name === position);
        if (foundIndex !== -1) {
            currentIndex = foundIndex;
            console.log(\`✅ 起始位置已设置为「\${position}」(第 \${foundIndex + 1} 个)\`);
        } else {
            console.error(\`❌ 未找到姓名「\${position}」\`);
        }
    } else {
        console.error('❌ 无效的位置参数，请输入数字（索引）或字符串（姓名）');
    }
}
```

**修改函数签名**：

```javascript
// 原：startApi()
// 新：startApi(startFrom = null)

// 原：automaticApi(targetDate = null, useWorker = false)
// 新：automaticApi(targetDate = null, startFrom = null, useWorker = false)

// 原：automaticApiFast(batchSize = 10, targetDate = null)
// 新：automaticApiFast(batchSize = 10, targetDate = null, startFrom = null)
```

**起始位置处理逻辑**：

```javascript
// 处理起始位置
if (startFrom !== null) {
    if (typeof startFrom === 'number') {
        // 按索引（从1开始）
        startIndex = Math.max(0, Math.min(startFrom - 1, dataToProcess.length - 1));
        console.log(\`📍 从第 \${startFrom} 个开始执行\`);
    } else if (typeof startFrom === 'string') {
        // 按姓名查找
        const foundIndex = dataToProcess.findIndex(item => item.name === startFrom);
        if (foundIndex !== -1) {
            startIndex = foundIndex;
            console.log(\`📍 从「\${startFrom}」开始执行（第 \${foundIndex + 1} 个）\`);
        } else {
            console.warn(\`⚠️ 未找到姓名「\${startFrom}」，从头开始\`);
        }
    }
}

// 截取从起始位置开始的数据
if (startIndex > 0) {
    dataToProcess = dataToProcess.slice(startIndex);
    console.log(\`📊 剩余 \${dataToProcess.length} 条数据待处理\`);
}
```

#### 2. `/public/automation/js/automation/control-panel.js`

**新增按钮**：

```javascript
// 快速创建联系人
var btnAddContactFast = document.createElement("button");
btnAddContactFast.className = "success";
btnAddContactFast.textContent = "快速创建🚀";
btnAddContactFast.title = "startAddContactFast()";

// 快速执行
var btnAutoFast = document.createElement("button");
btnAutoFast.className = "success";
btnAutoFast.textContent = "快速执行⚡";
btnAutoFast.title = "automaticApiFast() or automaticFast()";
```

**新增高级选项区域**：

```javascript
// 高级选项（API模式）
var isApiMode =
  typeof window.startApi === "function" ||
  typeof window.automaticApi === "function";
if (isApiMode) {
  var separator2 = document.createElement("div");
  separator2.className = "acp-separator";
  body.appendChild(separator2);

  var advToggle = document.createElement("div");
  advToggle.className = "acp-adv-toggle";
  advToggle.textContent = "▼ 高级选项";
  body.appendChild(advToggle);

  var advPanel = document.createElement("div");
  advPanel.className = "acp-adv-panel";
  advPanel.style.display = "none";

  // 间隔设置
  var intervalRow = document.createElement("div");
  intervalRow.className = "acp-row";
  // ...

  // 起始位置设置
  var positionRow = document.createElement("div");
  positionRow.className = "acp-row";
  // ...

  body.appendChild(advPanel);

  // 高级选项折叠切换
  advToggle.addEventListener("click", function () {
    if (advPanel.style.display === "none") {
      advPanel.style.display = "block";
      advToggle.textContent = "▲ 高级选项";
    } else {
      advPanel.style.display = "none";
      advToggle.textContent = "▼ 高级选项";
    }
  });
}
```

**新增事件处理**：

```javascript
// 快速创建联系人
if (btnAddContactFast) {
  btnAddContactFast.addEventListener("click", function () {
    var batch = prompt("请输入批次大小（并发数量）:", "10");
    if (batch) call("startAddContactFast", parseInt(batch));
  });
}

// 快速执行
if (btnAutoFast) {
  btnAutoFast.addEventListener("click", function () {
    var batch = prompt("请输入批次大小（并发数量）:", "10");
    if (batch) call("automaticFast", parseInt(batch));
  });
}

// 高级选项事件
if (isApiMode) {
  intervalBtn.addEventListener("click", function () {
    var val = parseInt(intervalInput.value);
    if (val && val > 0) call("setApiInterval", val);
  });

  positionBtn.addEventListener("click", function () {
    var pos = positionInput.value.trim();
    if (!pos) return;
    var num = parseInt(pos);
    call("setStartPosition", isNaN(num) ? pos : num);
  });

  resetBtn.addEventListener("click", function () {
    call("resetProgress");
  });
}
```

**新增样式**：

```javascript
"#automation-control-panel .acp-adv-toggle{grid-column:1/-1;padding:8px;text-align:center;background:#f9fafb;border-radius:6px;cursor:pointer;font-size:13px;font-weight:500;color:#6b7280;}" +
"#automation-control-panel .acp-adv-toggle:hover{background:#f3f4f6;}" +
"#automation-control-panel .acp-adv-panel{grid-column:1/-1;}" +
"#automation-control-panel button.success{background:#10b981;color:#fff;border:none;border-radius:6px;padding:6px 8px;font-size:13px;cursor:pointer;transition:all .2s}" +
"#automation-control-panel button.success:hover{background:#059669;transform:translateY(-1px);box-shadow:0 2px 4px rgba(0,0,0,.1)}" +
```

#### 3. `/public/automation/js/automation/template-manager.js`

**更新使用提示**：

```javascript
console.log("  • startApi(起始位置) - 手动执行单个任务");
console.log("  • automaticApi(日期, 起始位置) - 自动执行（串行，安全）");
console.log(
  "  • automaticApiFast(批量大小, 日期, 起始位置) - 快速批量执行（并发，默认10个/批）"
);
console.log('    💡 起始位置可以是数字（如: 25）或姓名（如: "张三"）');
console.log("  • setApiInterval(毫秒) - 设置API请求间隔（仅串行模式）");
console.log("  • resetProgress() - 重置执行进度到第1个");
console.log("  • setStartPosition(位置) - 设置起始位置");
```

## 使用场景

### 场景 1：从中断位置继续

```javascript
// 任务在第50个时中断了
setStartPosition(50);
automaticApi(); // 从第50个继续
```

### 场景 2：分段处理

```javascript
// 先处理前50个
automaticApiFast(10, null, 1); // 从第1个开始

// 等一段时间后处理后50个
automaticApiFast(10, null, 51); // 从第51个开始
```

### 场景 3：按姓名恢复

```javascript
// 记得上次是在"张三"失败的
startApi("张三"); // 从"张三"重新开始
```

### 场景 4：调整执行速度

```javascript
// 服务器响应慢，增加间隔
setApiInterval(10000); // 设置为10秒
automaticApi();

// 服务器响应快，使用并发
automaticApiFast(20); // 每批20个并发
```

### 场景 5：灵活控制

```javascript
// 第一步：重置进度
resetProgress();

// 第二步：设置间隔
setApiInterval(3000);

// 第三步：从指定位置开始
automaticApi(null, 25);
```

## 功能对比

| 功能             | 联系人创建 | 问卷创建（修改前） | 问卷创建（修改后） |
| ---------------- | ---------- | ------------------ | ------------------ |
| 串行执行         | ✅         | ✅                 | ✅                 |
| 并发执行         | ✅         | ✅                 | ✅                 |
| 起始位置（索引） | ✅         | ❌                 | ✅                 |
| 起始位置（姓名） | ✅         | ❌                 | ✅                 |
| 重置进度         | ❌         | ❌                 | ✅                 |
| 设置起始位置     | ❌         | ❌                 | ✅                 |
| 日期筛选         | ❌         | ✅                 | ✅                 |
| 达标检测         | ❌         | ✅                 | ✅                 |
| 面板快速执行按钮 | ❌         | ❌                 | ✅                 |
| 面板高级选项     | ❌         | ❌                 | ✅                 |

## 向后兼容性

所有新增的参数都是可选的，保持向后兼容：

```javascript
// 旧代码仍然有效
startApi(); // ✅ 从当前位置继续
automaticApi(); // ✅ 从头开始
automaticApiFast(10); // ✅ 从头开始

// 新代码提供更多选项
startApi(25); // ✅ 从第25个开始
automaticApi(null, 25); // ✅ 从第25个开始
automaticApiFast(10, null, 25); // ✅ 从第25个开始
```

## 测试建议

1. **起始位置测试**：

   ```javascript
   // 测试按索引
   startApi(5); // 应该从第5个开始

   // 测试按姓名
   startApi("测试姓名"); // 应该找到并从该姓名开始

   // 测试边界
   startApi(999999); // 应该自动调整到最后一个
   startApi(-1); // 应该从第1个开始
   ```

2. **重置功能测试**：

   ```javascript
   setStartPosition(50); // 设置到第50个
   resetProgress(); // 应该重置到第1个
   ```

3. **高级选项测试**：
   - 点击"▼ 高级选项"，面板应展开
   - 输入间隔值，点击"设置"，应该更新间隔
   - 输入位置（数字或姓名），点击"跳转"，应该设置位置
   - 点击"重置"，应该重置进度

## 相关文档

- `API_BATCH_CONCURRENT_FEATURE.md` - 批量并发执行功能
- `CONTACT_CREATION_RESUME_FEATURE.md` - 联系人创建恢复功能
- `AUTOMATION_FUNCTIONS_SUMMARY.md` - 所有自动化功能总结

## 总结

本次更新实现了：

✅ 问卷创建与联系人创建功能对齐  
✅ 增强的操作面板 UI  
✅ 更灵活的执行控制  
✅ 更好的用户体验  
✅ 完全向后兼容

现在问卷创建功能与联系人创建功能在操作体验上已经完全一致，用户可以更灵活地控制任务执行流程！
