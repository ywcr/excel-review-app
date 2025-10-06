# 浏览器卡死问题排查

## 问题描述

用户报告："开始执行任务 浏览器直接卡死了"

## 可能的原因

### ❌ 不太可能是音频导致

**原因**：

- 静音音频（data URI）几乎不占资源（< 100 bytes）
- 音频循环播放不会阻塞主线程
- 如果是音频问题，会卡在播放时，而不是"开始执行任务"时

### ✅ 更可能的原因

#### 1. 同步获取大量 DOM 元素

```javascript
// 如果执行这类代码可能卡死：
const questions = Array.from(document.querySelectorAll(".question")); // 可能几千个
const options = questions.map((q) => q.querySelectorAll(".option")); // 可能上万个
```

#### 2. 死循环或无限递归

```javascript
// 检查是否有这类问题：
while (isPaused && !shouldStop) {
  // 如果 isPaused 一直为 true，但没有 await，会卡死
  console.log("等待...");
}
```

#### 3. 同步的大量计算

```javascript
// 例如生成签名时的大量字符串操作
for (let i = 0; i < 10000; i++) {
  // 同步处理大量数据
}
```

#### 4. iframe 内容加载未完成

```javascript
// 如果 iframe 还在加载，访问 contentWindow 可能卡死
const iframe = document.querySelector("#ssfwIframe");
const questions =
  iframe.contentWindow.document.querySelector("#questions").value;
```

#### 5. 浏览器开发者工具问题

- 如果开着开发者工具，大量 `console.log` 可能导致卡顿
- 尤其是在循环中打印大对象

## 排查步骤

### 第一步：确认卡死位置

1. **打开浏览器任务管理器**
   - Chrome: Shift + Esc
   - Edge: Shift + Esc
2. **查看 CPU 使用率**

   - 如果 CPU 100%：说明是 JavaScript 死循环或大量计算
   - 如果 CPU 正常：说明是等待某个操作（网络、DOM）

3. **查看内存使用**
   - 如果内存飙升：可能是创建了大量对象

### 第二步：检查控制台最后的日志

请提供控制台最后显示的日志，例如：

```
✅ Excel 数据加载成功
📊 数据统计: 共 100 条
🚀 快速批量执行模式（流式处理）
🎵 后台音频播放器已初始化（静音模式）
📋 检查问卷内容是否需要更新...
<-- 在这里卡住了 -->
```

### 第三步：检查执行的是哪个函数

请告诉我你执行的是：

- `automaticApiFast()` - API 快速模式
- `automaticApi()` - API 串行模式
- `automatic()` - DOM 模式
- `updateWithMissing()` - 补充遗漏
- `startAddContact()` / `startAddContactFast()` - 创建联系人

## 临时解决方案

### 方案 1：禁用音频（测试用）

如果怀疑是音频问题，可以临时禁用：

```javascript
// 在执行前运行：
function startBackgroundAudio() {
  console.log("🔇 音频已禁用（测试）");
}
function stopBackgroundAudio() {
  console.log("🔇 音频已禁用（测试）");
}
```

然后再执行任务，看是否还会卡死。

### 方案 2：降低批次大小

如果是 `automaticApiFast()`，尝试减小批次：

```javascript
automaticApiFast(1); // 一次只处理1个，基本等于串行
```

### 方案 3：使用串行模式

如果快速模式卡死，尝试串行模式：

```javascript
automaticApi(); // 串行模式，更安全
```

### 方案 4：关闭开发者工具

如果开着 DevTools，尝试关闭：

- F12 关闭开发者工具
- 再次执行任务

### 方案 5：刷新页面重试

```javascript
// 1. 刷新页面
location.reload();

// 2. 重新上传 Excel
// 3. 重新生成代码
// 4. 再次执行
```

## 需要的信息

请提供以下信息以便进一步诊断：

1. **执行的函数**

   - 例如：`automaticApiFast(10)`

2. **控制台最后的日志**

   - 截图或复制最后几行

3. **浏览器信息**

   - Chrome/Edge 版本？
   - 开发者工具是否打开？

4. **数据量**

   - Excel 有多少行数据？

5. **卡死时的现象**

   - 标签页显示"未响应"？
   - CPU 使用率高吗？
   - 能否停止（Esc 键）？

6. **是否显示播放图标**
   - 标签页是否有 🔊 图标？
   - （这能确认音频是否播放）

## 紧急修复

如果急需使用，可以先：

1. **完全禁用音频功能**
2. **使用串行模式**（`automaticApi()`）
3. **减小批次大小**（`automaticApiFast(1)`）

我会根据你提供的信息立即修复问题！
