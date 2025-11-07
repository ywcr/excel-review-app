# API 签名调试分析

## 问题现象

API 请求返回：

```json
{
  "errCode": "5000",
  "errMsg": "系统异常！"
}
```

## 失败请求的 encryptedText 分析

**URL 解码后的内容：**

```
answer0=淋巴结肿大 / 炎症肿痛缓解&answer1=未告知&answer2=放疗 / 化疗&answer3=肿瘤标志物指标稳定&answer4=未解释，直接推荐&answer5=严格按照储存要求存放&answer6=未关注&answer7=不清楚疗程时长&answer8=老字号品牌，药材质量有保障&answer9=价格偏高&answers=淋巴结肿大 / 炎症肿痛缓解#未告知#放疗 / 化疗#肿瘤标志物指标稳定#未解释，直接推荐#严格按照储存要求存放#未关注#不清楚疗程时长#老字号品牌，药材质量有保障
```

**问题：只包含答案字段，缺少关键参数！**

❌ 缺少的字段：

- `corpId`
- `date`
- `dcdxName`
- `projectId`
- `projectTpl`
- `sponsorProjectId`
- `isForward`
- `title`
- `way`
- `startTime`
- `memo`
- `channelAddress`
- `recId`
- `latLng`

## 成功请求的 encryptedText 分析

**URL 解码后的内容（前 255 字符）：**

```
answer0=35~59&answer1=服务周到&answer2=提供更完善的药学服务&answer3=店员形象&answer4=一般&answer5=很专业&answer6=从不&answer7=从不&answer8=否&answer9=价格&answers=35~59#服务周到#提供更完善的药学服务#店员形象#一般#很专业#从不#从不#否#价格#channelAddress=&corpId=1749721838789101&date=2025-09-06&dcdxName=吴承&fieldName
```

✅ 包含完整的参数（按字母排序）

## 根本原因

`formatParams` 函数对参数进行了排序，导致：

1. 所有 `answer0-9` 和 `answers` 排在最前面（字母 'a' 开头）
2. 其他参数（`corpId`, `date` 等）排在后面（字母 'c', 'd' 开头）
3. 截取前 255 字符时，只截取到了答案部分

## 解决方案

### 方案 1：调整截取逻辑（不推荐）

不要在排序后截取，而是在排序前截取。但这会导致签名不一致。

### 方案 2：确保关键参数在前（推荐）

修改参数命名或排序逻辑，确保关键参数不会被截断。但这需要与后端保持一致。

### 方案 3：增加 encryptedText 长度（最推荐）

检查后端是否真的限制在 255 字符，或者是否可以接受更长的字符串。

根据 dcwj.js 的实现：

```javascript
let value = toQueryString(fData);
if (value && value.length > 255) {
  value = value.substring(0, 255);
}
```

这个限制是硬编码的，但我们需要确认：

1. 后端是否真的需要这个限制？
2. 如果需要，如何确保关键参数不被截断？

## 临时解决方案

**检查实际生成的 encryptedText 内容：**

在 `execution-logic.js` 中添加完整的日志：

```javascript
console.log("📝 完整 encryptedText:", encryptedText);
console.log("📝 截取后 encryptedText:", finalEncryptedText);
console.log("📝 encryptedText 包含的参数:", Object.keys(paramsForSign).sort());
```

**验证 paramsForSign 对象：**

```javascript
console.log("📋 paramsForSign 对象:", JSON.stringify(paramsForSign, null, 2));
```

## 下一步行动

1. 添加详细日志，查看实际生成的 `paramsForSign` 对象
2. 确认 `formatParams` 和 `toQueryString` 的输出
3. 对比成功请求和失败请求的完整 `encryptedText`
4. 如果确认是截断问题，考虑移除 255 字符限制或调整参数顺序
