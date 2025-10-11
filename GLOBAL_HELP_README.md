# 全局帮助系统说明

## 📖 概述

为问卷自动化代码生成工具添加了统一的全局帮助系统，用户可以通过 `help()` 命令查看所有可用的命令。

## 🎯 功能特性

### 1. **全局帮助命令** (`globalHelp.js`)
- 显示项目中所有脚本的所有可用命令
- 包括：问卷创建、更新、撤销、验证、音频控制等
- 格式化显示，美观易读

### 2. **模块化帮助**
- 各个脚本（如 `revokeByIds.js`）有自己的 help 实现
- 如果全局 help 不存在，则显示模块自己的帮助信息
- 避免命令冲突

## 📦 文件说明

### `globalHelp.js`
全局帮助命令脚本，包含所有可用命令的完整列表。

**使用方式：**
```javascript
// 在控制台加载
// 方式1：直接粘贴 globalHelp.js 内容
// 方式2：在自动化生成的脚本中包含此文件

// 调用帮助
help()
```

### `revokeByIds.js`
批量撤销工单脚本，包含撤销相关的 help 函数。

**使用方式：**
```javascript
// 加载脚本后
help()  // 如果没有全局help，则显示撤销命令帮助
```

## 🎨 命令分类

### 📝 问卷创建命令
- `start()` / `startApi()` - 手动执行单个任务
- `automatic()` / `automaticApi()` - 自动执行所有任务
- `automaticApiFast(batchSize)` - 快速批量执行
- `setStartPosition(position)` - 设置起始位置
- `executeAllDates()` - 按日期顺序执行
- `pauseExecution()` - 暂停执行
- `resumeExecution()` - 恢复执行
- `stopExecution()` - 停止执行
- `setApiRequestInterval(ms)` - 设置请求间隔

### 🔄 更新问卷命令
- `updateByDateApi("MM.DD")` - 更新指定日期工单
- `updateByOrderApi(date, startFrom)` - 智能匹配更新
- `cacheQuestionnaireStructure()` - 缓存问卷结构
- `clearQuestionnaireCache()` - 清除缓存

### ❌ 撤销问卷命令
- `revokeByDate("MM.DD")` - 按日期撤销
- `revokeAllForDates([...])` - 多日期撤销
- `revokeByIds([...])` - 按ID列表撤销
- `revokeByIds()` - 撤销全部（高危）
- `revokeByDateApi("MM.DD")` - API模式撤销

### 🔍 数据验证命令
- `validateData()` - 验证数据
- `showValidationReport()` - 显示验证报告

### 🎵 后台音频控制
- `startBackgroundAudio()` - 开始播放
- `stopBackgroundAudio()` - 停止播放

## 🚀 使用流程

1. **在自动化工具中生成并复制脚本**
2. **在目标页面的控制台粘贴并执行脚本**
3. **输入 `help()` 查看可用命令**
4. **选择合适的命令执行任务**

## ⚠️ 重要提示

- **撤销操作不可逆**，请谨慎使用
- 所有命令需在**包含 projectId 的页面**中执行
- 批量操作建议**先小范围测试**
- API模式命令间隔默认5秒，可通过 `setApiRequestInterval` 调整

## 📍 集成方式

### 方式1：独立使用
```javascript
// 在控制台直接粘贴 globalHelp.js 内容
// 然后调用
help()
```

### 方式2：集成到自动化生成脚本
在代码生成器中，可以选择性地将 `globalHelp.js` 的内容包含到生成的脚本中：

```javascript
// 在生成的脚本开头添加
${globalHelpContent}

// ... 其他生成的代码
```

### 方式3：模块化加载
```javascript
// 先加载全局help
eval(await fetch('/path/to/globalHelp.js').then(r => r.text()));

// 再加载其他脚本
eval(await fetch('/path/to/revokeByIds.js').then(r => r.text()));
```

## 🔧 扩展说明

### 添加新命令
当添加新的用户可调用命令时，需要：

1. 在 `globalHelp.js` 中添加命令说明
2. 按照分类放入对应的命令组
3. 提供清晰的示例

示例：
```javascript
'║  🆕 newCommand(param)\n' +
'║     新命令的功能说明\n' +
'║     示例：newCommand("example")\n' +
'║\n' +
```

### 自定义样式
可以修改 console.log 的 CSS 样式：

```javascript
console.log('%c内容', 'color: #17a2b8; font-weight: bold;');
```

## 📊 命令统计

当前支持的命令数量：
- **问卷创建**: 9 个命令
- **更新问卷**: 3 个命令
- **撤销问卷**: 5 个命令
- **数据验证**: 2 个命令
- **后台音频**: 2 个命令
- **帮助系统**: 1 个命令

**总计**: 22 个可用命令

## 🎉 更新日志

### 2025-10-10
- ✅ 创建全局帮助系统 `globalHelp.js`
- ✅ 更新 `revokeByIds.js` 支持模块化 help
- ✅ 添加 `revokeByIds()` 无参数撤销全部功能
- ✅ 完善命令文档和使用说明

---

**维护者**: AI Assistant  
**最后更新**: 2025-10-10
