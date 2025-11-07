# API 签名 formatParams 排序问题修复

## 问题描述

即使修复了 URL 编码问题，API 模式仍然出现验签失败：

```
{"code":5000,"message":"安全校验失败-验签失败","data":null,"count":null}
```

## 根本原因

### 我们的 `formatParams` 实现（错误）

```javascript
function formatParams(obj) {
  const out = {};
  for (const k in obj) {
    if (obj[k] !== undefined && obj[k] !== null) {
      out[k] = obj[k];
    }
  }
  return out;
}
```

**问题**: **没有对键进行排序！**

### `dcwj.js` 的实现（正确）

```javascript
function formatParams(arys) {
  let newkey = Object.keys(arys).sort(); // ⚠️ 关键：排序！
  let newObj = Array.isArray(arys) ? [] : {};
  for (let i = 0; i < newkey.length; i++) {
    let currentValue = arys[newkey[i]];
    if (typeof currentValue === "object") {
      if (Array.isArray(currentValue)) {
        let isArrObject = (currentValue || []).every(
          (i) => Object.prototype.toString.call(i) === "[object Object]"
        );
        if (isArrObject) {
          newObj[newkey[i]] = formatParams(currentValue);
        } else {
          newObj[newkey[i]] = currentValue;
        }
      } else {
        newObj[newkey[i]] = formatParams(currentValue);
      }
    } else {
      newObj[newkey[i]] = currentValue;
    }
  }
  return newObj;
}
```

**关键**: 使用 `Object.keys(arys).sort()` 对键进行**字母排序**！

## 问题分析

### 为什么排序很重要？

`encryptedText` 是通过将参数对象转换为查询字符串生成的：

```javascript
const params = {
  name: "任玄之",
  sex: "女",
  date: "2025-09-06",
  answer0: "肿瘤辅助治疗",
  // ...
};

const formattedData = formatParams(params); // ⚠️ 必须排序！
const encryptedText = toQueryString(formattedData);
```

**如果不排序**，参数的顺序可能不一致：

- **前端**: `name=任玄之&sex=女&date=2025-09-06&answer0=...`
- **后端**: `answer0=...&answers=...&channelAddress=&corpId=...&date=2025-09-06&...&name=任玄之&...&sex=女`

**如果排序**，参数顺序一致（字母顺序）：

- **前端**: `answer0=...&answer1=...&...&answers=...&channelAddress=&corpId=...&date=2025-09-06&dcdxName=...&isForward=1&latLng=&memo=...&name=任玄之&...&sex=女&...`
- **后端**: `answer0=...&answer1=...&...&answers=...&channelAddress=&corpId=...&date=2025-09-06&dcdxName=...&isForward=1&latLng=&memo=...&name=任玄之&...&sex=女&...`

**只有顺序一致，生成的 `encryptedText` 才相同，签名才能匹配！**

### 示例对比

**不排序（错误）**:

```javascript
const params = { name: "张三", age: 30, city: "北京" };
const formatted = formatParams(params); // 没有排序
// 结果可能是: { name: "张三", age: 30, city: "北京" }
// 或者: { city: "北京", name: "张三", age: 30 }
// 顺序不确定！
```

**排序（正确）**:

```javascript
const params = { name: "张三", age: 30, city: "北京" };
const formatted = formatParams(params); // 排序
// 结果总是: { age: 30, city: "北京", name: "张三" }
// 按字母顺序！
```

## 解决方案

### 完全按照 `dcwj.js` 实现 `formatParams`

**文件**: `public/automation/js/automation/execution-logic.js`

**修改位置**: 第 232 行

**修改前**:

```javascript
"function formatParams(obj){ const out={}; for(const k in obj){ if(obj[k]!==undefined && obj[k]!==null){ out[k]=obj[k]; } } return out; }",
```

**修改后**:

```javascript
"function formatParams(arys){ let newkey=Object.keys(arys).sort(); let newObj=Array.isArray(arys)?[]:{};  for(let i=0;i<newkey.length;i++){ let currentValue=arys[newkey[i]]; if(typeof currentValue==='object'){ if(Array.isArray(currentValue)){ let isArrObject=(currentValue||[]).every(i=>Object.prototype.toString.call(i)==='[object Object]'); if(isArrObject){ newObj[newkey[i]]=formatParams(currentValue); }else{ newObj[newkey[i]]=currentValue; } }else{ newObj[newkey[i]]=formatParams(currentValue); } }else{ newObj[newkey[i]]=currentValue; } } return newObj; }",
```

### 关键变化

1. **添加排序**: `Object.keys(arys).sort()`
2. **递归处理对象**: 对嵌套对象也进行排序
3. **处理数组**: 正确处理数组类型的值
4. **与 `dcwj.js` 完全一致**: 逐字复制实现

## 其他发现

### 1. 使用 jQuery 而不是 fetch

`dcwj.js` 使用 `$.ajax` 发送请求：

```javascript
$.ajax({
  url: "../" + tabName + "/" + operation,
  type: "POST",
  data: $("[lay-filter=formFilter]").serialize(),
  headers: {
    sign: signRes,
    signKey: key, // ⚠️ 注意大小写：signKey
  },
  traditional: true, // ⚠️ 重要：设置 traditional
  success: function (data) {
    // ...
  },
});
```

**我们的实现已经使用了 `$.ajax`，这是正确的！**

### 2. `traditional: true` 的作用

设置 `traditional: true` 会影响数组参数的序列化方式：

- **`traditional: false`** (默认): `arr[]=1&arr[]=2`
- **`traditional: true`**: `arr=1&arr=2`

`dcwj.js` 使用 `traditional: true`，我们也应该使用。

**我们的实现已经设置了 `traditional: true`，这是正确的！**

### 3. header 大小写

`dcwj.js` 使用 `signKey`（驼峰命名），而不是 `signkey`（全小写）。

**我们的实现使用的是 `signKey`，这是正确的！**

## 验证方法

### 1. 检查参数顺序

在浏览器控制台中，检查 `formatParams` 的输出：

```javascript
const params = { name: "张三", age: 30, city: "北京" };
const formatted = formatParams(params);
console.log(Object.keys(formatted));
// 应该输出: ["age", "city", "name"]  (字母顺序)
```

### 2. 检查 `encryptedText`

```javascript
console.log(encryptedText);
// 应该看到参数按字母顺序排列:
// answer0=...&answer1=...&...&answers=...&channelAddress=&corpId=...&date=...
```

### 3. 检查 API 响应

```javascript
📥 API响应: {code: 200, message: '操作成功', ...}  ✅
```

## 完整的签名流程

### 1. 构建参数对象

```javascript
const params = {
  name: "任玄之",
  sex: "女",
  date: "2025-09-06",
  answers: "answer1#answer2#...",
  answer0: "answer1",
  answer1: "answer2",
  // ...
  corpId: "1749721838789101",
  projectId: "1756460958725101",
  // ...
};
```

### 2. 格式化参数（排序）

```javascript
const formattedData = formatParams(params);
// 结果: { answer0: "...", answer1: "...", ..., answers: "...", channelAddress: "", corpId: "...", date: "...", ... }
// 键按字母顺序排列！
```

### 3. 生成查询字符串

```javascript
const encryptedText = toQueryString(formattedData);
// 结果: "answer0=...&answer1=...&...&answers=...&channelAddress=&corpId=...&date=..."
// 参数按字母顺序排列！
```

### 4. 截取前 255 字符

```javascript
const finalEncryptedText = encryptedText.substring(0, 255);
```

### 5. 生成签名

```javascript
const signature = generateSign(finalEncryptedText, signkey);
```

### 6. 发送请求

```javascript
$.ajax({
  url: "/api",
  type: "POST",
  data: ajaxData, // 包含所有参数 + encryptedText
  headers: {
    sign: signature,
    signKey: signkey,
  },
  traditional: true,
  success: function (res) {
    // ...
  },
});
```

## 总结

### 三个关键修复

1. **移除 URL 编码**: `toQueryString` 不使用 `encodeURIComponent`
2. **添加参数排序**: `formatParams` 必须对键进行排序
3. **截取 255 字符**: 签名和发送都使用截断后的 `encryptedText`

### 与 `dcwj.js` 完全一致

- ✅ 使用 `$.ajax` 发送请求
- ✅ 设置 `traditional: true`
- ✅ 使用 `signKey`（驼峰命名）
- ✅ `formatParams` 对键进行排序
- ✅ `toQueryString` 不使用 URL 编码
- ✅ 截取前 255 字符用于签名和发送

## 相关文件

- `/Users/yao/Yao/excel-review-app/public/automation/js/automation/execution-logic.js` - 主要修复文件（第 232-233 行）
- `/Users/yao/Yao/project/liuwei/html/zxyy2/zxyy.ltd/lgb/mobile/js/dcwj.js` - 参考实现（第 483-518 行）
- `API_SIGNATURE_URL_ENCODING_FIX.md` - URL 编码问题修复
- `API_SIGNATURE_CORRECT_UNDERSTANDING.md` - 签名机制理解

---

**修复日期**: 2025-10-05  
**问题发现**: `formatParams` 没有对键进行排序  
**解决方案**: 完全按照 `dcwj.js` 实现 `formatParams`，确保参数顺序一致
