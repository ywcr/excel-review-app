# API 签名机制最终修复

## 问题描述

API 模式创建任务时出现两种错误：
1. **验签失败**: `{"code":5000,"message":"安全校验失败-验签失败","data":null,"count":null}`
2. **系统异常**: `{"errCode":"5000","errMsg":"系统异常！"}`

## 根本原因

### 错误理解

之前认为 `encryptedText` 只用于签名验证，所以：
- ❌ 签名时使用前 255 字符
- ❌ 发送时也使用前 255 字符

### 正确理解

**`encryptedText` 有两个用途：**

1. **签名验证**（前端和后端）
   - 前端：使用前 255 字符生成签名
   - 后端：使用前 255 字符验证签名

2. **参数传递**（后端）
   - 后端需要从**完整的** `encryptedText` 中解析业务参数
   - 如果 `encryptedText` 被截断，后端无法获取关键参数，导致"系统异常"

## 对比分析

### 手动创建（成功）

**`encryptedText` 内容：**
```
answer0=甲状腺 / 乳腺结节消结散结&answer1=提到过但未强调&...&answers=...&channelAddress=&corpId=1733101264425101&date=2025-10-06&dcdxName=任玄之&isForward=1&latLng=&memo=...&name=任玄之&projectId=1757128526764101&projectTpl=1757054166586103&recId=&sex=女&sponsorProjectId=1757066425772107&startTime=2025-10-06&title=西黄丸消费者问卷25.9.5（平晓）&way=实名调查
```

**特点：**
- ✅ 包含完整的参数列表
- ✅ 签名使用前 255 字符
- ✅ 发送完整的 `encryptedText`
- ✅ 后端可以从中解析所有必要参数

### 自动化（失败 - 旧版本）

**`encryptedText` 内容（被截断）：**
```
answer0=其他&answer1=提到过但未强调&answer2=中药汤剂&answer3=肿瘤标志物指标稳定&answer4=未解释，直接推荐&answer5=严格按照储存要求存放&answer6=药师主动告知过注意事项&answer7=服药后胃部轻微不适&answer8=老字号品牌，药材质量有保障&answer9=价格偏高&answers=其他#提到过但未强调#中药汤剂#肿瘤标志物指标稳定#未解释，直接推荐#严格按照储存要求存放#药师主动告知过注意事项#服药后胃部轻微不适#老字号品牌，药材质量有保
```

**问题：**
- ❌ 只包含答案数据
- ❌ 缺少 `channelAddress`, `corpId`, `date`, `dcdxName` 等关键参数
- ❌ 后端无法从中解析业务参数
- ❌ 导致"系统异常"

## 解决方案

### 核心逻辑

```javascript
// 1. 生成完整的 encryptedText
const encryptedText = toQueryString(formattedData);
console.log('📝 完整 encryptedText 长度:', encryptedText.length);

// 2. 截取前 255 字符用于签名
const finalEncryptedText = encryptedText.length > 255 
    ? encryptedText.substring(0, 255) 
    : encryptedText;

// 3. 使用截断后的 encryptedText 生成签名
const signature = generateSign(finalEncryptedText, saltData.signkey);

// 4. 发送请求时使用完整的 encryptedText
const ajaxData = {
    // ... 其他字段 ...
    encryptedText: encryptedText  // ⚠️ 使用完整的，不是 finalEncryptedText
};
```

### 关键点

1. **签名生成**: 使用 `finalEncryptedText`（前 255 字符）
2. **请求发送**: 使用 `encryptedText`（完整内容）
3. **后端验签**: 后端也会截取前 255 字符来验证签名
4. **后端解析**: 后端从完整的 `encryptedText` 中解析业务参数

## 修复内容

### 文件：`public/automation/js/automation/execution-logic.js`

**修改位置：** 第 512 行

**修改前：**
```javascript
encryptedText: finalEncryptedText  // ❌ 错误：使用截断后的
```

**修改后：**
```javascript
encryptedText: encryptedText  // ✅ 正确：使用完整的
```

**完整代码：**
```javascript
// ⚠️ 关键：签名使用截断后的encryptedText，但发送时使用完整的encryptedText
// 生成签名（使用截断后的encryptedText）
const signature = generateSign(finalEncryptedText, saltData.signkey);

console.log('🔐 签名参数:', {
    dataLength: finalEncryptedText.length,
    keyLength: saltData.signkey.length,
    key: saltData.signkey.substring(0, 5) + '...'
});
console.log('🔑 签名生成成功:', signature.substring(0, 16) + '...');

// 准备请求数据，按照参考API的格式构建
const ajaxData = {
    // 基本信息
    name: requestData.name,
    sex: requestData.sex,
    date: requestData.date,

    // 答案数据 - 使用 # 分隔的字符串格式
    answers: answersString,

    // 必要的项目字段（参考api.md）
    recId: "",
    nvcVal: "",
    latLng: "",
    projectId: config.projectId || "1756460958725101",
    corpId: config.corpId || "1749721838789101",
    projectTpl: config.projectTpl || "1756451075934101",
    sponsorProjectId: config.sponsorProjectId || "1756451241652103",
    isForward: 1,
    title: config.title || "致力庆西黄丸消费者问卷",
    way: "实名调查",
    startTime: requestData.date,
    memo: config.memo || "为了充分了解客户对于西黄丸产品评价，为更好的做好临床药学服务，促进产品在临床的安全合理的使用，便于下一步市场策略的规划，特进行本次问卷调查。",
    dcdxName: config.dcdxName || "吴承",
    fieldName: "性别",
    fill: requestData.sex,
    channelAddress: "",
    
    // 添加问卷结构字段
    questions: questionsValue,
    options: optionsValue,
    types: typesValue,

    // ⚠️ 重要：发送完整的encryptedText（不截断），后端需要从中解析参数
    encryptedText: encryptedText  // ✅ 使用完整的
};
```

## 验证方法

### 1. 检查日志

执行自动化脚本后，应该看到：

```
📝 完整 encryptedText 长度: 584
📝 完整 encryptedText (前200字符): answer0=其他&answer1=提到过但未强调&...
📝 截取后 encryptedText 长度: 255
⚠️ encryptedText 超过255字符，已截取前255字符用于签名
📝 截取后 encryptedText: answer0=其他&...&answers=其他#...#老字号品牌，药材质量有保
🔐 签名参数: {dataLength: 255, keyLength: 5, key: '11229...'}
🔑 签名生成成功: 646eb86494d2974d...
📤 发送请求数据: {...}
📥 API响应: {code: 200, message: '操作成功', ...}  ✅ 成功
```

### 2. 检查网络请求

在浏览器开发者工具的 Network 标签中，检查 `/lgb/xfzwj/add` 请求的 `body`：

```
encryptedText=answer0%3D...%26channelAddress%3D%26corpId%3D1749721838789101%26date%3D2025-09-06%26...
```

解码后应该包含完整的参数列表，包括 `channelAddress`, `corpId`, `date`, `dcdxName` 等。

## 技术细节

### 为什么需要 255 字符限制？

1. **历史原因**: 可能是数据库字段长度限制或早期设计决策
2. **安全考虑**: 限制签名字符串长度，防止过长的签名计算
3. **性能优化**: 减少签名计算的数据量

### 为什么不能只发送前 255 字符？

因为后端需要从 `encryptedText` 中解析业务参数：

```javascript
// 后端伪代码
const params = parseEncryptedText(encryptedText);
const corpId = params.corpId;  // 如果 encryptedText 被截断，这里会是 undefined
const projectId = params.projectId;  // 同样会缺失
// ... 导致业务逻辑失败，返回"系统异常"
```

### 签名验证流程

1. **前端**:
   ```javascript
   const signature = generateSign(encryptedText.substring(0, 255), signkey);
   ```

2. **后端**:
   ```javascript
   const receivedEncryptedText = request.body.encryptedText;
   const expectedSignature = generateSign(receivedEncryptedText.substring(0, 255), signkey);
   if (receivedSignature !== expectedSignature) {
       return { code: 5000, message: "安全校验失败-验签失败" };
   }
   ```

3. **参数解析**:
   ```javascript
   const params = parseEncryptedText(receivedEncryptedText);  // 使用完整的
   // 继续业务逻辑...
   ```

## 总结

### 关键发现

- **`encryptedText` 有双重用途**: 签名验证 + 参数传递
- **签名使用前 255 字符**: 前端和后端都截取前 255 字符来生成/验证签名
- **参数解析使用完整内容**: 后端需要从完整的 `encryptedText` 中解析业务参数

### 最终方案

- ✅ 生成完整的 `encryptedText`
- ✅ 使用前 255 字符生成签名
- ✅ 发送完整的 `encryptedText` 给后端
- ✅ 后端使用前 255 字符验证签名
- ✅ 后端从完整的 `encryptedText` 中解析参数

### 适用场景

- ✅ **短答案问卷**: 前 255 字符包含所有关键参数 → API 模式完美工作
- ⚠️ **长答案问卷**: 前 255 字符只包含答案，关键参数在后面 → API 模式可能失败
- 💡 **建议**: 对于长答案问卷，优先使用 DOM 模式

## 相关文件

- `/Users/yao/Yao/excel-review-app/public/automation/js/automation/execution-logic.js` - 主要修复文件
- `/Users/yao/Yao/project/liuwei/html/zxyy2/zxyy.ltd/lgb/mobile/js/dcwj.js` - 参考实现
- `API_SIGNATURE_255_LIMIT_EXPLANATION.md` - 255 字符限制说明
- `WHY_MANUAL_WORKS_BUT_AUTO_FAILS.md` - 手动创建成功的原因分析

---

**修复日期**: 2025-10-05  
**修复人员**: AI Assistant  
**问题发现者**: 用户 (yao)
