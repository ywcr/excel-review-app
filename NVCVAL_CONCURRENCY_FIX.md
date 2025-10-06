# nvcVal 并发问题修复

## 🎯 核心问题

**症状**：批次执行时，**每一批的第一个请求总是验签失败**，而后续请求成功。

## 🔍 根本原因

### nvcVal 是一次性的！

`nvcVal`（阿里云滑块验证值/无痕验证值）是**一次性令牌**：

- 每次使用后会被后端标记为已使用
- 再次使用同一个 `nvcVal` 会导致验签失败

### 并发执行的问题

在 `automaticApiFast` 批次并发执行时：

```javascript
// 批次中的所有请求几乎同时开始
const promises = batch.map(async (item, idx) => {
  const result = await createTaskApi(item.name, item.sex, item.time);
  // ...
});
await Promise.all(promises); // 并发执行
```

**时序问题**：

1. **批次 1 开始**：许惠乐、戴维洁两个请求几乎同时调用 `createTaskApi`
2. **两个请求都读取同一个 `nvcVal`**：从页面 hidden input 或 `window.nvc` 缓存读取
3. **第二个请求先到达后端**（网络波动或答案较短处理快）
4. **第二个请求使用 `nvcVal`** → 后端验证通过 → **消耗此 `nvcVal`**
5. **第一个请求使用同一个 `nvcVal`** → 后端发现已被使用 → **验签失败**

### 实际日志证据

从用户提供的请求中看到：

**第一个请求（许惠乐 - 验签失败）**：

```
signkey: "67267"
nvcVal: "%257B%2522a%2522%253A%2522FFFF0N0000000000B194%2522..."
响应: {"code":5000,"message":"安全校验失败-验签失败"}
```

**第二个请求（戴维洁 - 成功）**：

```
signkey: "83999"
nvcVal: "%257B%2522a%2522%253A%2522FFFF0N0000000000B194%2522..."  // 相同的 nvcVal！
响应: 1
```

**关键发现**：

- ✅ 两个请求使用了**不同的盐值**（67267 vs 83999）→ 说明盐值获取正常
- ❌ 两个请求使用了**相同的 nvcVal** → 这就是问题所在！
- ⚠️ 第二个请求先完成并成功，说明它先消耗了 `nvcVal`

## ✅ 解决方案

### 强制每次重新获取 nvcVal

修改 `createTaskApi` 函数中的 `nvcVal` 获取逻辑：

**修改前**：

```javascript
const nvcValHidden = getInputValue('nvcVal', '');
let nvcVal = nvcValHidden;  // 直接使用缓存值
try {
    const nvcObj = targetWindow && targetWindow.nvc;
    if (nvcObj && typeof nvcObj.getNVCValAsync === 'function') {
        nvcVal = await new Promise((resolve) => {
            nvcObj.getNVCValAsync(function(val){
                resolve(val || nvcValHidden);  // 如果获取失败，使用缓存值
            });
        });
    }
}
```

**修改后**：

```javascript
// ⚠️ 关键：每个请求都必须获取新的 nvcVal（nvcVal 是一次性的！）
const nvcValHidden = getInputValue("nvcVal", "");
let nvcVal = ""; // ⚠️ 不使用缓存值作为默认值
try {
  const nvcObj = targetWindow && targetWindow.nvc;
  if (nvcObj && typeof nvcObj.getNVCValAsync === "function") {
    // 强制重新获取新的 nvcVal
    nvcVal = await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.warn("⚠️ getNVCValAsync 超时，使用hidden input值");
        resolve(nvcValHidden);
      }, 3000); // ⚠️ 添加超时保护

      try {
        nvcObj.getNVCValAsync(function (val) {
          clearTimeout(timeout);
          if (val) {
            console.log(`✅ [${name}] 获取新的 nvcVal 成功`);
            resolve(val);
          } else {
            console.warn(`⚠️ [${name}] getNVCValAsync 返回空值`);
            resolve(nvcValHidden);
          }
        });
      } catch (e) {
        clearTimeout(timeout);
        console.warn(`⚠️ [${name}] getNVCValAsync 失败:`, e);
        resolve(nvcValHidden);
      }
    });
  } else {
    console.warn(
      `⚠️ [${name}] window.nvc 不可用，使用hidden input（可能失败）`
    );
    nvcVal = nvcValHidden;
  }
} catch (e) {
  console.warn(`⚠️ [${name}] 获取nvcVal异常:`, e);
  nvcVal = nvcValHidden;
}

if (!nvcVal) {
  console.error(`❌ [${name}] nvcVal 为空！将导致验签失败`);
}
```

### 关键改进点

1. **不使用缓存默认值**：

   ```javascript
   let nvcVal = ""; // 而不是 let nvcVal = nvcValHidden;
   ```

2. **超时保护**：

   - 添加 3 秒超时机制
   - 避免 `getNVCValAsync` 挂起导致批次阻塞

3. **详细日志**：

   - 每个请求都显示其 nvcVal 获取状态
   - 帮助诊断并发问题

4. **错误提示**：
   - 如果 `nvcVal` 为空，明确警告
   - 建议用户刷新页面或手动触发滑块验证

## 📊 预期效果

### 修复前

```
📦 批次 1/10: 处理 2 个任务
[API] [1/422] 开始: 许惠乐 ❌ 验签失败（使用了被消耗的 nvcVal）
[API] [2/422] 开始: 戴维洁 ✅ 成功（先消耗了 nvcVal）

📦 批次 2/10: 处理 2 个任务
[API] [3/422] 开始: 张三 ❌ 验签失败
[API] [4/422] 开始: 李四 ✅ 成功

// 每批第一个总是失败
```

### 修复后

```
📦 批次 1/10: 处理 2 个任务
✅ [许惠乐] 获取新的 nvcVal 成功
✅ [戴维洁] 获取新的 nvcVal 成功
[API] [1/422] 开始: 许惠乐 ✅ 成功
[API] [2/422] 开始: 戴维洁 ✅ 成功

📦 批次 2/10: 处理 2 个任务
✅ [张三] 获取新的 nvcVal 成功
✅ [李四] 获取新的 nvcVal 成功
[API] [3/422] 开始: 张三 ✅ 成功
[API] [4/422] 开始: 李四 ✅ 成功

// 所有请求都成功
```

## 🔗 相关技术

### 阿里云无痕验证 (NVC)

- **产品**: 阿里云滑块验证 / 无痕验证
- **nvcVal**: 验证通过后生成的一次性令牌
- **API**: `window.nvc.getNVCValAsync(callback)`
- **特性**:
  - 异步获取
  - 一次性使用
  - 有时效性

### 参考文档

- 原项目实现：`/Users/yao/Yao/project/liuwei/html/zxyy2/zxyy.ltd/lgb/mobile/js/dcwj.js`
- 验证逻辑：每次表单提交前都调用 `getNVCValAsync` 获取新令牌

## 📝 修改文件

- **文件**: `/public/automation/js/automation/execution-logic.js`
- **函数**: `createTaskApi(name, sex, taskDate)`
- **行数**: 607-648

## ⚠️ 注意事项

1. **window.nvc 可用性**：

   - 只有在正确的问卷页面（iframe）中才可用
   - 如果页面未加载滑块验证组件，`getNVCValAsync` 不可用

2. **隐藏字段回退**：

   - 如果 `window.nvc` 不可用，仍会尝试使用 hidden input 中的值
   - 但这个值可能是旧的，导致验签失败
   - **建议**：确保页面已加载验证组件

3. **超时处理**：

   - 3 秒超时可能需要根据实际网络情况调整
   - 超时后会使用 hidden input 值作为回退

4. **串行模式**：
   - `automaticApi`（串行模式）不受此问题影响
   - 因为每个请求之间有 5 秒延迟，不会并发

## 🎯 结论

**核心原则**：`nvcVal` 是一次性的，每个并发请求都必须获取独立的新令牌！

修复后，批次并发执行时，每个请求都会：

1. 调用 `window.nvc.getNVCValAsync` 获取新的 `nvcVal`
2. 使用独立的 `nvcVal` 和独立的盐值生成签名
3. 提交请求，避免 `nvcVal` 冲突

现在批次执行应该不会再出现"第一个总是失败"的问题了！🎉
