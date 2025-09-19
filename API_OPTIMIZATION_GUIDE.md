# API模式优化使用指南

## 更新内容

### 1. API请求间隔时间调整（已完成）
- **默认间隔时间从1.5秒调整为5秒**
- 支持动态配置间隔时间
- 最小间隔限制为500ms，防止请求过快

### 2. Web Worker模式支持（已完成）
- API请求在后台线程执行
- 窗口切换不会影响请求执行
- 提升性能和稳定性

## 使用方法

### 1. 调整API请求间隔

```javascript
// 设置间隔为3秒（3000毫秒）
setApiInterval(3000);

// 设置间隔为10秒（10000毫秒）
setApiInterval(10000);

// 获取当前间隔设置
console.log(getApiInterval()); // 输出当前间隔（毫秒）
```

### 2. 使用Worker模式

#### 方式一：初始化时启用Worker模式
```javascript
// 初始化Worker模式
initWorkerMode();

// 执行自动化任务（将使用Worker模式）
automaticApi();
```

#### 方式二：执行时指定使用Worker
```javascript
// 第二个参数为true表示使用Worker模式
automaticApi(null, true);

// 指定日期并使用Worker模式
automaticApi('09.01', true);
```

#### 切换Worker模式
```javascript
// 启用Worker模式
toggleWorkerMode(true);

// 关闭Worker模式
toggleWorkerMode(false);
```

### 3. 完整使用示例

```javascript
// 1. 设置API请求间隔为5秒
setApiInterval(5000);

// 2. 启用Worker模式
initWorkerMode();

// 3. 执行自动化任务
automaticApi(); // 将使用Worker模式，5秒间隔

// 或者一步到位
automaticApi(null, true); // 自动启用Worker模式
```

## 性能对比

### 传统模式 vs Worker模式

| 特性 | 传统模式 | Worker模式 |
|------|---------|-----------|
| 窗口切换影响 | 可能暂停 | 不受影响 |
| 浏览器标签页切换 | 可能延迟 | 正常执行 |
| CPU占用 | 主线程 | 后台线程 |
| 内存使用 | 较高 | 较低 |
| 稳定性 | 一般 | 更稳定 |

### 执行时间对比（以1000个任务为例）

#### 间隔1.5秒（旧默认值）
- DOM模式：3小时31分钟
- API传统模式：42分钟
- API Worker模式：42分钟（但更稳定）

#### 间隔5秒（新默认值）
- DOM模式：3小时31分钟
- API传统模式：1小时23分钟
- API Worker模式：1小时23分钟（后台执行，不影响其他操作）

## 注意事项

1. **浏览器兼容性**
   - Worker模式需要浏览器支持Web Worker
   - 大部分现代浏览器都支持（Chrome、Firefox、Edge、Safari）
   - IE11及以下版本可能不支持

2. **间隔时间设置**
   - 最小间隔为500ms
   - 建议生产环境使用3-5秒间隔
   - 测试环境可以使用1-2秒间隔

3. **Worker模式限制**
   - Worker中无法直接访问DOM
   - Worker中无法使用jQuery（已改用fetch）
   - 需要确保api-worker.js文件可访问

## 故障排除

### Worker模式无法启用
```javascript
// 检查Worker支持
if (typeof Worker !== 'undefined') {
    console.log('浏览器支持Worker');
} else {
    console.log('浏览器不支持Worker');
}

// 手动测试Worker
const testWorker = new Worker('/automation/js/api-worker.js');
testWorker.addEventListener('message', (e) => {
    console.log('Worker消息:', e.data);
});
```

### API请求失败
```javascript
// 查看详细日志
console.log(getApiInterval()); // 检查间隔设置
console.log(useWorkerMode); // 检查Worker模式状态
```

## 命令速查

```javascript
// 间隔控制
setApiInterval(5000)     // 设置5秒间隔
getApiInterval()         // 获取当前间隔

// Worker模式
initWorkerMode()         // 初始化Worker
toggleWorkerMode(true)   // 启用Worker
toggleWorkerMode(false)  // 关闭Worker

// 执行任务
automaticApi()           // 使用当前模式执行
automaticApi(null, true) // 强制使用Worker执行
automaticApi('09.01')    // 执行指定日期
```