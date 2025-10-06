# 验证遗漏功能接口修复

## 问题描述

操作面板中的验证遗漏功能使用的接口与 `wenjuanyanzheng.js` 中的接口不一致，导致验证功能无法正常工作。

## 问题分析

### 原接口（错误）

- **文件**: `public/automation/js/automation/validation-manager.js`
- **接口**: `/lgb/project/submitList`
- **参数格式**:
  ```javascript
  {
    projectId: projectId,
    date: targetDate.replace(/\./g, '-'),
    pageSize: 1000
  }
  ```
- **返回格式**: `result.data`

### 正确接口（参考 wenjuanyanzheng.js）

- **文件**: `src/app/questionnaire-automation/wenjuanyanzheng.js`
- **接口**: `/lgb/workOrder/mobile/list`
- **参数格式**:
  ```javascript
  searchValue=&pageNum=1&pageSize=100000&projectId=${projectId}&queryState=-1&date=${checkDate}
  ```
- **返回格式**: `result.rows` (code: 200)

## 修复方案

### 1. 统一接口地址

将验证功能的接口从 `/lgb/project/submitList` 改为 `/lgb/workOrder/mobile/list`

### 2. 统一参数格式

```javascript
// 修改前
const params = new URLSearchParams({
    projectId: projectId,
    date: targetDate.replace(/\./g, '-'),
    pageSize: 1000
});
const response = await fetch(`${API_BASE_URL}/lgb/project/submitList?${params}`, {...});

// 修改后
const response = await fetch(
    `/lgb/workOrder/mobile/list?searchValue=&pageNum=1&pageSize=100000&projectId=${projectId}&queryState=-1&date=${checkDate}`,
    {...}
);
```

### 3. 统一日期格式处理

```javascript
// 转换日期格式 MM.DD -> YYYY-MM-DD
const year = new Date().getFullYear();
let checkDate = targetDate;

// 如果是 MM.DD 格式，转换为 YYYY-MM-DD
if (targetDate.includes(".")) {
  const [month, day] = targetDate.split(".");
  checkDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}
```

### 4. 统一返回数据处理

```javascript
// 修改前
if (result.code === 0 || result.code === 200) {
  return result.data || [];
}

// 修改后
if (result.code === 200) {
  const createdSurveys = result.rows || [];
  // 提取姓名字段，兼容多种字段名
  return createdSurveys.map((item) => ({
    name: item.workOrderValue || item.patientName || item.consumerName || "",
    ...item,
  }));
}
```

## 修改的文件

### 主要修复

1. `/public/automation/js/automation/validation-manager.js` - 验证管理器
2. `/html/js/automation/validation-manager.js` (同步)

### 补充修复

3. `/public/automation/js/automation/template-manager.js` - 模板管理器（两处）
4. `/html/js/automation/template-manager.js` (同步)

## 补充修复：添加 getProjectIdFromUrl 函数

### 问题

`validateData()` 函数调用了 `getProjectIdFromUrl()` 但该函数未在 `validation-manager.js` 中定义。

### 解决方案

参考 `wenjuanyanzheng.js` 的实现，添加完整的 `getProjectIdFromUrl()` 函数：

```javascript
/**
 * 获取项目ID
 * 参考 wenjuanyanzheng.js 的实现
 */
function getProjectIdFromUrl() {
  // 方法1: 从当前页面URL获取
  const urlParams = new URLSearchParams(window.location.search);
  let projectId = urlParams.get("projectId");

  if (projectId) {
    console.log(`📋 从URL获取projectId: ${projectId}`);
    return projectId;
  }

  // 方法2: 从iframe获取（参考 wenjuanyanzheng.js）
  const iframe = document.querySelector("#ssfwIframe");
  if (iframe) {
    try {
      // 尝试从 iframe 的 contentWindow.location 获取
      const iframeSrc = iframe.contentWindow.location.href;
      const iframeParams = new URLSearchParams(iframeSrc.split("?")[1]);
      projectId = iframeParams.get("projectId");

      if (projectId) {
        console.log(`📋 从iframe获取projectId: ${projectId}`);
        return projectId;
      }
    } catch (error) {
      // 跨域限制，尝试从 iframe.src 获取
      try {
        if (iframe.src) {
          const iframeUrl = new URL(iframe.src);
          projectId = iframeUrl.searchParams.get("projectId");

          if (projectId) {
            console.log(`📋 从iframe.src获取projectId: ${projectId}`);
            return projectId;
          }
        }
      } catch (e) {
        console.warn("⚠️ 无法从iframe获取projectId，可能是跨域限制");
      }
    }
  }

  // 方法3: 使用默认值
  console.warn("⚠️ 无法获取projectId，使用默认值");
  return "1756460958725101";
}
```

### 获取 projectId 的三种方式

1. **从当前页面 URL 获取**

   - 适用于直接在目标页面执行的情况
   - `window.location.search` 中的 `projectId` 参数

2. **从 iframe.contentWindow.location 获取**

   - 适用于页面中有 iframe 的情况
   - 与 `wenjuanyanzheng.js` 的实现一致
   - 可能受跨域限制

3. **从 iframe.src 获取**

   - 跨域限制的备用方案
   - 从 iframe 的 src 属性中提取参数

4. **使用默认值**
   - 所有方法都失败时的兜底方案
   - 默认值：`1756460958725101`

## 全面检查与修复

### 检查范围

对所有自动化相关文件进行了全面检查，确保 `getProjectIdFromUrl` 函数的实现一致性。

### 发现的问题

1. ✅ **validation-manager.js** - 缺少 `getProjectIdFromUrl` 函数定义（已修复）
2. ✅ **template-manager.js** - 有两处 `getProjectIdFromUrl` 函数，实现较简单，未尝试从 `iframe.contentWindow.location` 获取（已修复）

### 其他文件状态

以下文件中的 projectId 使用硬编码或从配置传入，无需修改：

- ✅ `execution-logic.js` - API 模式中使用硬编码或从 config 传入
- ✅ `api-worker.js` - 从 config 传入
- ✅ `api-worker-scheduler.js` - 从 config 传入
- ✅ `api-worker-bridge.js` - 使用硬编码

### 统一后的 getProjectIdFromUrl 实现

所有文件现在使用相同的实现逻辑，与 `wenjuanyanzheng.js` 保持一致：

```javascript
function getProjectIdFromUrl() {
  // 方法1: 从当前页面URL获取
  const urlParams = new URLSearchParams(window.location.search);
  let projectId = urlParams.get("projectId");

  if (projectId) {
    return projectId;
  }

  // 方法2: 从iframe.contentWindow.location获取
  const iframe = document.querySelector("#ssfwIframe");
  if (iframe) {
    try {
      const iframeSrc = iframe.contentWindow.location.href;
      const iframeParams = new URLSearchParams(iframeSrc.split("?")[1]);
      projectId = iframeParams.get("projectId");

      if (projectId) {
        return projectId;
      }
    } catch (error) {
      // 跨域限制，尝试从 iframe.src 获取
      try {
        if (iframe.src) {
          const iframeUrl = new URL(iframe.src);
          projectId = iframeUrl.searchParams.get("projectId");

          if (projectId) {
            return projectId;
          }
        }
      } catch (e) {
        // 忽略错误
      }
    }
  }

  // 返回默认值
  return "1756460958725101";
}
```

## 关键改进

### 1. 接口统一

- ✅ 使用与验证工具相同的接口 `/lgb/workOrder/mobile/list`
- ✅ 确保参数格式完全一致
- ✅ 使用正确的返回码判断 (code: 200)

### 2. 数据兼容性

- ✅ 兼容多种姓名字段：`workOrderValue`、`patientName`、`consumerName`
- ✅ 支持不同的日期格式：`MM.DD` 和 `YYYY-MM-DD`
- ✅ 返回完整的数据对象，方便后续处理

### 3. 错误处理

- ✅ 添加详细的错误日志
- ✅ 接口失败时返回空数组，不中断流程

## 使用方式

修复后，验证功能的使用方式保持不变：

```javascript
// 1. 验证数据完整性
await validateData();

// 2. 显示缺失数据
showMissing();

// 3. 自动补充缺失数据
await updateWithMissing();
```

## 测试验证

### 测试步骤

1. **上传 Excel 文件**

   - 选择问卷类型
   - 上传包含问卷数据的 Excel 文件

2. **生成自动化代码**

   - 选择指派人和日期
   - 生成并复制自动化代码

3. **执行验证**

   - 在目标网站的控制台中粘贴代码
   - 执行 `validateData()` 验证数据
   - 查看验证结果是否正确

4. **检查缺失数据**

   - 执行 `showMissing()` 查看缺失项
   - 确认缺失数据列表准确

5. **自动补充**
   - 执行 `updateWithMissing()` 补充缺失数据
   - 验证补充是否成功

### 预期结果

- ✅ 验证功能能正确获取已创建的问卷列表
- ✅ 能准确识别缺失的数据
- ✅ 缺失数据的姓名字段正确提取
- ✅ 自动补充功能正常工作

## 注意事项

1. **日期格式**

   - 系统会自动处理 `MM.DD` 和 `YYYY-MM-DD` 两种格式
   - 内部统一转换为 `YYYY-MM-DD` 格式调用接口

2. **姓名字段**

   - 系统会自动识别 `workOrderValue`、`patientName`、`consumerName` 三种字段
   - 优先级：`workOrderValue` > `patientName` > `consumerName`

3. **数据量限制**

   - 接口使用 `pageSize=100000` 确保能获取所有数据
   - 如果数据量超过此限制，需要调整参数

4. **跨域问题**
   - 接口使用 `credentials: 'include'` 携带 Cookie
   - 确保在目标网站的控制台中执行

## 相关文件

- `/public/automation/js/automation/validation-manager.js` - 验证管理器
- `/html/js/automation/validation-manager.js` - HTML 版本（同步）
- `/src/app/questionnaire-automation/wenjuanyanzheng.js` - 参考实现
- `/public/automation/js/automation/control-panel.js` - 控制面板
- `/public/automation/js/automation/template-manager.js` - 模板管理器

## 更新日期

2025-10-05

## 后续优化建议

1. **接口配置化**

   - 将接口地址和参数提取到配置文件
   - 便于统一管理和修改

2. **错误提示优化**

   - 添加更友好的错误提示
   - 区分不同类型的错误（网络错误、接口错误、数据错误）

3. **性能优化**

   - 考虑添加缓存机制
   - 避免重复请求相同的数据

4. **测试覆盖**
   - 添加自动化测试
   - 确保接口修改不影响功能
