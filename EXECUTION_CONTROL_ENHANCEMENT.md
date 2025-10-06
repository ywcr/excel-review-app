# 执行控制与进度显示增强功能

## 功能概述

为批量执行功能添加了完整的执行控制和进度显示系统，包括：
- 实时进度显示
- 暂停/继续/停止控制
- 严重错误自动停止
- 执行统计信息

## 实施日期

2025-10-05

## 问题背景

### 原问题
用户报告在执行批量创建时，如果遇到 `questions/options/types` 字段缺失错误，程序不会停止，而是继续执行后续任务，导致：
1. 大量无效请求
2. 资源浪费
3. 难以定位问题
4. 无法及时干预

### 用户需求
> 出现了这种报错就停止执行，不要一直跑了，操作面板中可以加上对应的进度与开始暂停等操作控制按钮

## 实现功能

### 1. ✅ 执行状态管理

新增全局状态变量：

```javascript
let isRunning = false;      // 是否正在运行
let isPaused = false;        // 是否已暂停
let shouldStop = false;      // 是否需要停止

// 执行统计
let executionStats = {
    total: 0,      // 总任务数
    current: 0,    // 当前进度
    success: 0,    // 成功数
    failed: 0,     // 失败数
    startTime: null // 开始时间
};
```

### 2. ✅ 控制函数

#### `pauseExecution()`
暂停当前执行（批次间暂停）

```javascript
pauseExecution();
// 输出: ⏸️ 已暂停执行
```

#### `resumeExecution()`
继续执行

```javascript
resumeExecution();
// 输出: ▶️ 继续执行
```

#### `stopExecution()`
停止执行

```javascript
stopExecution();
// 输出: ⏹️ 正在停止执行...
```

### 3. ✅ 严重错误检测

在批量执行时自动检测严重错误并立即停止：

```javascript
// 检查是否是严重错误
if (errorMsg.includes('问卷结构字段缺失') || errorMsg.includes('questions/options/types')) {
    criticalError = true;
    console.error('🛑 检测到严重错误，停止执行！');
    console.error('💡 请确保在正确的问卷页面内执行');
    return { success: false, name: item.name, error: true, critical: true };
}
```

**触发条件**：
- `问卷结构字段缺失`
- `questions/options/types` 相关错误

**停止行为**：
- 当前批次完成后立即停止
- 不再执行后续批次
- 显示错误提示

### 4. ✅ 操作面板增强

#### 新增进度显示区域

```
┌─────────────────────────────────┐
│ 🧰 自动化控制台 (API模式)       │
├─────────────────────────────────┤
│ [█████████░░░░░] 45/100 (45%)  │  ← 进度条
│ ✓ 40    ✗ 5    02:30           │  ← 统计信息
│ ────────────────────────────    │
│ [创建联系人]     [快速创建🚀]   │
│ ────────────────────────────    │
│ [单步执行]       [自动执行]     │
│ [快速执行⚡]     [验证遗漏]     │
│ [补充遗漏]       [全部日期]     │
│ ────────────────────────────    │  ← 执行时显示
│ [⏸️ 暂停]       [⏹️ 停止]      │  ← 控制按钮
│ ┌─────────┐  ┌──────────┐      │
│ │日期输入框│  │按日期执行│      │
│ └─────────┘  └──────────┘      │
│ ────────────────────────────    │
│ ▼ 高级选项                      │
└─────────────────────────────────┘
```

**进度条**：
- 显示当前进度（如：45/100）
- 显示百分比（45%）
- 动画效果，平滑过渡

**统计信息**：
- ✓ 成功数（绿色）
- ✗ 失败数（红色）
- 执行时间（MM:SS格式）

**控制按钮**：
- ⏸️ 暂停 - 暂停执行（黄色）
- ▶️ 继续 - 继续执行（绿色，暂停时显示）
- ⏹️ 停止 - 停止执行（红色）

### 5. ✅ 暂停/继续机制

在批次处理循环中添加暂停检查：

```javascript
// 检查是否需要停止
if (shouldStop) {
    console.log('⏹️ 用户请求停止执行');
    break;
}

// 检查是否暂停
while (isPaused && !shouldStop) {
    console.log('⏸️ 执行已暂停，等待继续...');
    updateProgressDisplay();
    await new Promise(resolve => setTimeout(resolve, 1000));
}
```

**特点**：
- 批次间暂停（不会中断当前批次）
- 暂停时每秒检查一次状态
- 可以从暂停状态直接停止

### 6. ✅ 进度实时更新

使用自定义事件通知控制面板更新：

```javascript
function updateProgressDisplay() {
    // 触发自定义事件，通知控制面板更新
    if (typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('executionStatsUpdate', { 
            detail: { 
                ...executionStats, 
                isRunning, 
                isPaused, 
                shouldStop 
            } 
        }));
    }
}
```

控制面板监听更新：

```javascript
window.addEventListener('executionStatsUpdate', function(e){
    var stats = e.detail;
    // 更新进度条
    // 更新统计信息
    // 显示/隐藏控制按钮
});
```

## 执行流程

### 正常执行流程

```
开始执行
    ↓
初始化统计 (total, current=0, success=0, failed=0)
    ↓
显示进度条和统计
    ↓
批次1: 处理10个任务
    ↓ (检查暂停/停止)
批次2: 处理10个任务
    ↓ (检查暂停/停止)
...
    ↓
完成
    ↓
隐藏进度条和控制按钮
```

### 暂停流程

```
执行中...
    ↓
用户点击"暂停"
    ↓
当前批次完成后暂停
    ↓
显示"⏸️ 执行已暂停，等待继续..."
    ↓
显示"▶️ 继续"按钮
    ↓
用户点击"继续"
    ↓
恢复执行
```

### 停止流程

```
执行中...
    ↓
用户点击"停止" 或 检测到严重错误
    ↓
设置 shouldStop = true 或 criticalError = true
    ↓
当前批次完成后停止
    ↓
输出结果统计
    ↓
重置状态，隐藏控制按钮
```

### 严重错误处理流程

```
执行任务
    ↓
捕获错误
    ↓
检查错误类型
    ↓
是严重错误? (questions/options/types缺失)
    ├─ 是 → 设置 criticalError = true
    │        ↓
    │     输出 "🛑 检测到严重错误，停止执行！"
    │        ↓
    │     当前批次完成后立即停止
    │        ↓
    │     输出 "❌ 执行因严重错误而终止！"
    │
    └─ 否 → 记录失败，继续执行
```

## 使用示例

### 场景1：正常批量执行

```javascript
// 开始快速执行
automaticApiFast(10);

// 控制面板自动显示：
// [███████████░░░] 70/100 (70%)
// ✓ 68   ✗ 2   01:24
// [⏸️ 暂停]  [⏹️ 停止]
```

### 场景2：需要暂停

```javascript
// 执行过程中点击"暂停"按钮，或调用：
pauseExecution();

// 控制台输出：
// ⏸️ 已暂停执行
// ⏸️ 执行已暂停，等待继续...

// 控制面板显示：
// [███████████░░░] 70/100 (70%)
// ✓ 68   ✗ 2   01:24
// [▶️ 继续]  [⏹️ 停止]

// 点击"继续"或调用：
resumeExecution();
```

### 场景3：停止执行

```javascript
// 点击"停止"按钮，或调用：
stopExecution();

// 控制台输出：
// ⏹️ 正在停止执行...
// ...
// ⏹️ 执行已被用户停止！
// 📊 总计: 成功 70 个, 失败 2 个
```

### 场景4：遇到严重错误

```javascript
// 执行过程中遇到问卷结构缺失错误

// 控制台输出：
// ❌ [10/100] 失败: 张三 Error: 问卷结构字段缺失 (questions/options/types)
// 🛑 检测到严重错误，停止执行！
// 💡 请确保在正确的问卷页面内执行
// 🛑 检测到严重错误，立即停止执行！
// ...
// ❌ 执行因严重错误而终止！
// 📊 总计: 成功 9 个, 失败 1 个
```

## 修改文件

### 1. `/public/automation/js/automation/execution-logic.js`

**新增变量**：
- `isPaused`, `shouldStop` - 状态控制
- `executionStats` - 执行统计

**新增函数**：
- `pauseExecution()` - 暂停执行
- `resumeExecution()` - 继续执行
- `stopExecution()` - 停止执行
- `updateProgressDisplay()` - 更新进度显示

**修改函数**：
- `automaticApiFast()` - 添加状态管理和错误检测
- `resetProgress()` - 重置时也重置统计

### 2. `/public/automation/js/automation/control-panel.js`

**新增UI元素**：
- 进度条 (`.acp-progress-bar`)
- 统计信息 (`.acp-stats`)
- 控制按钮 (暂停/继续/停止)

**新增样式**：
- 进度条样式
- 统计信息样式

**新增事件监听**：
- 控制按钮点击事件
- `executionStatsUpdate` 事件监听

### 3. `/public/automation/js/automation/template-manager.js`

**更新使用提示**：
- 添加执行控制部分的说明

## 样式定义

```css
/* 进度条 */
.acp-progress-bar {
  position: relative;
  height: 24px;
  background: #f1f3f5;
  border-radius: 12px;
  overflow: hidden;
}

.acp-progress-fill {
  position: absolute;
  height: 100%;
  background: linear-gradient(90deg, #10b981, #059669);
  transition: width 0.3s ease;
}

.acp-progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 11px;
  font-weight: 600;
  z-index: 1;
}

/* 统计信息 */
.acp-stats {
  display: flex;
  justify-content: space-around;
  padding: 4px 0;
  font-size: 12px;
  font-weight: 500;
}

.acp-stats .stat-success { color: #10b981; }
.acp-stats .stat-failed { color: #ef4444; }
.acp-stats .stat-time { color: #6b7280; }
```

## 测试建议

### 1. 正常执行测试
```javascript
automaticApiFast(10);
// 观察进度条、统计信息是否正常更新
```

### 2. 暂停/继续测试
```javascript
automaticApiFast(10);
// 执行一段时间后点击"暂停"
// 观察是否在批次间暂停
// 点击"继续"，观察是否正常恢复
```

### 3. 停止测试
```javascript
automaticApiFast(10);
// 执行一段时间后点击"停止"
// 观察是否正确停止并输出统计
```

### 4. 严重错误测试
```javascript
// 在错误的页面（非问卷页）执行
automaticApiFast(10);
// 观察是否在第一个错误后立即停止
// 检查是否输出正确的错误提示
```

### 5. 边界测试
```javascript
// 测试快速暂停/继续
pauseExecution();
resumeExecution();
pauseExecution();
stopExecution(); // 从暂停状态直接停止
```

## 注意事项

### ⚠️ 暂停时机

暂停不会立即生效，而是在**批次间**生效：
- 当前批次内的所有任务会完成
- 然后进入暂停状态
- 不会中断正在执行的任务

### ⚠️ 停止时机

停止也是在批次间生效：
- 当前批次完成后停止
- 已发送的请求无法取消

### ⚠️ 严重错误

以下错误被视为严重错误，会立即停止执行：
- 问卷结构字段缺失
- questions/options/types 缺失

**原因**：
- 这类错误通常表示执行环境不正确
- 继续执行只会产生更多失败
- 应该停止并检查环境

### ⚠️ 进度显示

进度显示仅在 API 模式下可用：
- DOM 模式使用不同的执行机制
- 未来可以为 DOM 模式添加类似功能

## 向后兼容性

所有新增功能都是可选的：
- 不使用控制按钮，功能如常
- 不调用控制函数，执行如常
- 进度显示自动出现/消失

## 相关文档

- `QUESTIONNAIRE_START_POSITION_FEATURE.md` - 起始位置功能
- `API_BATCH_CONCURRENT_FEATURE.md` - 批量并发功能
- `AUTOMATION_FUNCTIONS_SUMMARY.md` - 功能总结

## 总结

本次更新实现了：

✅ 实时进度显示（进度条 + 统计信息）  
✅ 执行控制（暂停/继续/停止）  
✅ 严重错误自动停止  
✅ 增强的操作面板UI  
✅ 完整的状态管理  
✅ 实时事件通知机制  

现在用户可以：
- 实时查看执行进度
- 随时暂停/继续/停止执行
- 遇到严重错误时自动停止
- 通过面板或命令控制执行

不再会出现遇到错误却无法停止的问题！

