# API验签失败修复总结

## 🔍 问题分析

### 错误现象
```
answers=%5Bobject+Object%5D  // answers字段显示为[object Object]
{"code":5000,"message":"安全校验失败-验签失败","data":null,"count":null}
```

### 根本原因
1. **answers对象序列化问题**: `answers=[object Object]` 说明对象没有被正确转换为字符串
2. **缺少必要字段**: 与参考API相比，缺少大量必要的项目字段
3. **数据结构不完整**: 缺少单独的 `answer0`, `answer1` 等字段
4. **签名数据不匹配**: 由于数据结构不完整，导致签名验证失败

## 🛠️ 修复方案

### 1. 修正answers字段序列化

#### 修复前
```javascript
data: requestData,  // jQuery自动处理，但对象变成了[object Object]
```

#### 修复后
```javascript
answers: JSON.stringify(requestData.answers), // 手动序列化为JSON字符串
```

### 2. 添加完整的项目字段

基于 `api.md` 参考文件，添加了所有必要字段：

```javascript
const ajaxData = {
    // 基本信息
    name: requestData.name,
    sex: requestData.sex,
    date: requestData.date,
    answers: JSON.stringify(requestData.answers),
    
    // 必要的项目字段（从参考API获取）
    recId: "",
    nvcVal: "",
    latLng: "",
    projectId: "1756460958725101",
    corpId: "1749721838789101",
    projectTpl: "1756451075934101", 
    sponsorProjectId: "1756451241652103",
    isForward: 1,
    title: "致力庆西黄丸消费者问卷",
    way: "实名调查",
    startTime: requestData.date,
    memo: "为了充分了解客户对于西黄丸产品评价...",
    dcdxName: "吴承",
    fieldName: "性别",
    fill: requestData.sex,
    channelAddress: "",
    encryptedText: finalEncryptedText
};
```

### 3. 添加单独的answer字段

参考API包含 `answer0`, `answer1`, `answer2` 等单独字段：

```javascript
// 添加单独的answer字段（answer0, answer1, answer2...）
Object.keys(requestData.answers).forEach((key, index) => {
    ajaxData[`answer${index}`] = requestData.answers[key];
});
```

### 4. 修正签名数据结构

确保用于签名的数据结构与实际发送的数据结构一致：

```javascript
// 先构建完整的请求数据结构
const tempData = {
    // 包含所有字段的完整数据结构
    ...
};

// 使用完整数据结构生成签名
const formattedData = formatParams(tempData);
const encryptedText = toQueryString(formattedData);
const signature = generateSign(encryptedText, saltData.signkey);
```

## 📊 修复对比

### 修复前的请求数据
```
name=景彬娣&sex=女&date=2025-09-01&answers=[object Object]&encryptedText=...
```

### 修复后的请求数据
```
name=景彬娣&sex=女&date=2025-09-01&
answers={"question_0":"35-45岁","question_1":"企业或公司职工",...}&
answer0=35-45岁&answer1=企业或公司职工&answer2=药店&...&
projectId=1756460958725101&corpId=1749721838789101&...&
encryptedText=...
```

## 🎯 关键修复点

### 1. 对象序列化
- **修复前**: jQuery自动处理导致 `[object Object]`
- **修复后**: 手动使用 `JSON.stringify()` 序列化

### 2. 数据结构完整性
- **修复前**: 只有基本的 name, sex, date, answers 字段
- **修复后**: 包含所有必要的项目字段和单独的answer字段

### 3. 签名数据一致性
- **修复前**: 签名数据与实际发送数据不一致
- **修复后**: 使用完整的数据结构生成签名

### 4. 字段格式标准化
- **修复前**: 缺少项目相关的元数据字段
- **修复后**: 完全按照参考API的格式构建请求

## 🚀 预期效果

### 修复前
```
POST /lgb/xfzwj/add
Body: name=景彬娣&sex=女&answers=[object Object]&...
Response: {"code":5000,"message":"安全校验失败-验签失败"}
```

### 修复后
```
POST /lgb/xfzwj/add
Body: name=景彬娣&sex=女&answers={"question_0":"35-45岁",...}&answer0=35-45岁&...&projectId=1756460958725101&...
Response: {"code":0,"message":"操作成功","data":1}
```

## 📋 参考依据

修复基于 `api.md` 中的完整API请求示例：
- 包含完整的项目元数据字段
- 同时包含 `answers` 和单独的 `answer0-9` 字段
- 使用正确的数据格式和编码方式

## 🎯 总结

通过这次修复：

1. **解决了对象序列化问题** - answers字段现在正确显示为JSON字符串
2. **补全了必要字段** - 包含所有项目相关的元数据
3. **统一了数据结构** - 签名数据与发送数据完全一致
4. **遵循了API规范** - 完全按照参考API的格式构建请求

现在API请求应该能通过验签，成功创建问卷记录！
