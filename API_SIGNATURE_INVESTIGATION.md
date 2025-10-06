# API 签名问题深入调查

## 问题现象

执行 API 模式自动补全时，返回错误：

```json
{
  "errCode": "5000",
  "errMsg": "系统异常！"
}
```

## 关键发现

### 1. encryptedText 内容异常

**失败请求的 encryptedText（URL 解码后）：**

```
answer0=淋巴结肿大 / 炎症肿痛缓解&answer1=未告知&answer2=放疗 / 化疗&answer3=肿瘤标志物指标稳定&answer4=未解释，直接推荐&answer5=严格按照储存要求存放&answer6=未关注&answer7=不清楚疗程时长&answer8=老字号品牌，药材质量有保障&answer9=价格偏高&answers=淋巴结肿大 / 炎症肿痛缓解#未告知#放疗 / 化疗#肿瘤标志物指标稳定#未解释，直接推荐#严格按照储存要求存放#未关注#不清楚疗程时长#老字号品牌，药材质量有保障
```

**问题：只包含答案字段（answer0-9, answers），缺少所有其他参数！**

### 2. 成功请求的 encryptedText（参考）

**URL 解码后的内容（前 255 字符）：**

```
answer0=35~59&answer1=服务周到&answer2=提供更完善的药学服务&answer3=店员形象&answer4=一般&answer5=很专业&answer6=从不&answer7=从不&answer8=否&answer9=价格&answers=35~59#服务周到#提供更完善的药学服务#店员形象#一般#很专业#从不#从不#否#价格#channelAddress=&corpId=1749721838789101&date=2025-09-06&dcdxName=吴承&fieldName
```

**包含完整参数（按字母排序）：**

- `answer0-9` ✅
- `answers` ✅
- `channelAddress` ✅
- `corpId` ✅
- `date` ✅
- `dcdxName` ✅
- `fieldName` (被截断) ✅

## 根本原因分析

### 原因 1：参数排序导致截断位置不当

`formatParams` 函数对参数键进行字母排序：

1. 所有 `answer*` 参数排在最前面（字母 'a' 开头）
2. 其他关键参数排在后面（'c', 'd', 'i', 'm', 'p', 's', 't', 'w' 开头）
3. 截取前 255 字符时，可能只截取到答案部分

### 原因 2：答案内容过长

用户的答案包含中文和特殊字符，URL 编码后长度显著增加：

- `淋巴结肿大 / 炎症肿痛缓解` URL 编码后约 60+ 字节
- 10 个答案 + `answers` 字段，总长度可能超过 500+ 字节

### 原因 3：255 字符限制过于严格

dcwj.js 中的硬编码限制：

```javascript
if (value && value.length > 255) {
  value = value.substring(0, 255);
}
```

这个限制可能导致关键参数被截断。

## 调试步骤

### 步骤 1：添加详细日志

已在 `execution-logic.js` 中添加：

```javascript
console.log("📋 签名前的参数对象 keys:", Object.keys(paramsForSign).sort());
console.log("📋 formatParams 后的 keys:", Object.keys(formattedData));
console.log("📝 完整 encryptedText 长度:", encryptedText.length);
console.log(
  "📝 完整 encryptedText (前200字符):",
  encryptedText.substring(0, 200)
);
console.log("📝 截取后 encryptedText 长度:", finalEncryptedText.length);
console.log("📝 截取后 encryptedText:", finalEncryptedText);
```

### 步骤 2：验证参数对象

检查 `paramsForSign` 是否包含所有必要字段：

- ✅ `name`, `sex`, `date`
- ✅ `answers` (# 分隔的字符串)
- ✅ `answer0-9` (单独的答案字段)
- ✅ `recId`, `latLng`, `channelAddress`
- ✅ `projectId`, `corpId`, `projectTpl`, `sponsorProjectId`, `isForward`
- ✅ `title`, `way`, `startTime`, `memo`, `dcdxName`
- ❌ `fieldName`, `fill`, `nvcVal` (已排除，正确)

### 步骤 3：对比 toQueryString 输出

检查 `toQueryString` 是否正确生成查询字符串：

- 参数顺序（应该按字母排序）
- 参数值是否正确
- 是否需要 URL 编码（注意：dcwj.js 依赖 jQuery 的 `.serialize()` 自动编码）

## 可能的解决方案

### 方案 A：移除 255 字符限制（推荐）

```javascript
// 不截取，使用完整的 encryptedText
const finalEncryptedText = encryptedText;
```

**优点：**

- 确保所有参数都参与签名
- 与实际数据长度匹配

**缺点：**

- 需要确认后端是否支持

### 方案 B：智能截取（备选）

```javascript
// 确保至少包含关键参数
const minRequiredParams = ["corpId", "date", "dcdxName", "projectId"];
let finalEncryptedText = encryptedText;

if (encryptedText.length > 255) {
  // 检查截取后是否包含关键参数
  const truncated = encryptedText.substring(0, 255);
  const hasAllRequired = minRequiredParams.every((param) =>
    truncated.includes(`${param}=`)
  );

  if (!hasAllRequired) {
    console.warn("⚠️ 截取后缺少关键参数，使用完整 encryptedText");
    finalEncryptedText = encryptedText;
  } else {
    finalEncryptedText = truncated;
  }
}
```

### 方案 C：参数重排序（复杂）

修改参数命名，确保关键参数排在前面：

- 将 `answer*` 改为 `zanswer*`（排到最后）
- 或者使用数字前缀：`0_corpId`, `1_date`, ...

**不推荐：** 需要与后端协调，改动太大。

## 测试计划

1. **刷新页面**并重新生成自动化代码
2. 执行 `updateWithMissing()` 触发 API 请求
3. 查看控制台日志：
   - 检查 `paramsForSign` 的 keys
   - 检查完整 `encryptedText` 的内容和长度
   - 检查截取后 `encryptedText` 是否包含关键参数
4. 根据日志结果决定采用哪个方案

## 预期结果

修复后，`encryptedText` 应该包含完整的参数列表（按字母排序）：

```
answer0=...&answer1=...&...&answer9=...&answers=...&channelAddress=&corpId=1749721838789101&date=2025-09-06&dcdxName=吴承&isForward=1&latLng=&memo=...&name=任玄之&projectId=1756460958725101&projectTpl=1756451075934101&recId=&sex=女&sponsorProjectId=1756451241652103&startTime=2025-09-06&title=致力庆西黄丸消费者问卷&way=实名调查
```

## 下一步

**请刷新页面，重新生成代码，然后执行 `updateWithMissing()` 并提供完整的控制台日志。**

特别关注以下日志：

- `📋 签名前的参数对象 keys:`
- `📝 完整 encryptedText 长度:`
- `📝 完整 encryptedText (前200字符):`
- `📝 截取后 encryptedText:`

这些日志将帮助我们确定问题的确切原因。
