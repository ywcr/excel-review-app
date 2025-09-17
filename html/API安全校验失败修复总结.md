# API安全校验失败修复总结

## 🔍 问题分析

### 错误现象
```
{"code":5000,"message":"安全校验失败-2","data":null,"count":null}
```

### 根本原因
通过对比 `api.md` 参考文件和用户的实际请求，发现了多个关键差异：

## 🛠️ 关键问题和修复

### 1. **Content-Type 错误** ❌ → ✅

**错误格式**:
```javascript
"content-type": "application/json"
```

**正确格式**:
```javascript
"content-type": "application/x-www-form-urlencoded; charset=UTF-8"
```

### 2. **请求头字段错误** ❌ → ✅

**错误格式**:
```javascript
"x-signature": "3386b31b37ecc54cf38f6f7311c3de6d36e850c5cfa2baf5b5e51dc07d74c14c",
"x-timestamp": "1758127900534"
```

**正确格式**:
```javascript
"sign": "2cef6bd753eca172999980f9e1f0286165049bcce297c5f56e2daff8f2314cef",
"signKey": "59374"
```

### 3. **请求体格式错误** ❌ → ✅

**错误格式**: JSON格式
```json
{"name":"景彬娣","sex":"女","date":"2025-09-01","answers":{"question_0":"35-45岁",...}}
```

**正确格式**: URL编码的表单数据
```
name=景彬娣&sex=女&date=2025-09-01&answers={"question_0":"35-45岁",...}&encryptedText=name%3D...
```

### 4. **签名数据错误** ❌ → ✅

**错误方式**: 使用JSON字符串签名
```javascript
const dataString = JSON.stringify(requestData);
const signature = generateSign(dataString, saltData.signkey);
```

**正确方式**: 使用encryptedText签名
```javascript
const formattedData = formatParams(requestData);
const encryptedText = toQueryString(formattedData);
const signature = generateSign(encryptedText, saltData.signkey);
```

### 5. **缺少encryptedText字段** ❌ → ✅

**问题**: 请求中没有 `encryptedText` 字段，这是后端验证签名的关键字段

**修复**: 添加 `encryptedText` 字段到表单数据中

## 🔧 具体修复内容

### 1. 修正API请求格式
在 `execution-logic.js` 中：

```javascript
// 修复前
const response = await fetch(`${API_BASE_URL}${config.apiEndpoint}`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
        'X-Timestamp': saltData.timestamp
    },
    body: JSON.stringify(requestData),
    credentials: 'include'
});

// 修复后
const response = await fetch(`${API_BASE_URL}${config.apiEndpoint}`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'accept': '*/*',
        'accept-language': 'zh-CN,zh;q=0.9',
        'x-requested-with': 'XMLHttpRequest',
        'sign': signature,
        'signKey': saltData.signkey
    },
    body: formData.toString(),
    credentials: 'include'
});
```

### 2. 添加参数格式化函数
在 `template-manager.js` 中添加了：

```javascript
// 参数格式化函数（基于dcwj.js）
function formatParams(arys) {
    let newkey = Object.keys(arys).sort();
    let newObj = Array.isArray(arys) ? [] : {};
    // ... 完整的格式化逻辑
    return newObj;
}

// 转换为查询字符串（基于dcwj.js）
function toQueryString(obj) {
    const part = [];
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === "object") {
            part.push(`${key}=${JSON.stringify(value)}`);
        } else {
            part.push(`${key}=${value}`);
        }
    }
    return part.join("&");
}
```

### 3. 修正签名生成流程
```javascript
// 1. 格式化参数
const formattedData = formatParams(requestData);

// 2. 生成encryptedText
const encryptedText = toQueryString(formattedData);
const finalEncryptedText = encryptedText.length > 255 ? encryptedText.substring(0, 255) : encryptedText;

// 3. 使用encryptedText生成签名
const signature = generateSign(finalEncryptedText, saltData.signkey);

// 4. 构建表单数据
const formData = new URLSearchParams();
Object.keys(requestData).forEach(key => {
    if (typeof requestData[key] === 'object') {
        formData.append(key, JSON.stringify(requestData[key]));
    } else {
        formData.append(key, requestData[key]);
    }
});
formData.append('encryptedText', finalEncryptedText);
```

## 📊 修复对比

| 项目 | 修复前 | 修复后 |
|------|--------|--------|
| Content-Type | `application/json` | `application/x-www-form-urlencoded; charset=UTF-8` |
| 签名头 | `x-signature` | `sign` |
| 密钥头 | `x-timestamp` | `signKey` |
| 请求体 | JSON字符串 | URL编码表单 |
| 签名数据 | JSON字符串 | encryptedText |
| encryptedText | ❌ 缺失 | ✅ 包含 |

## 🚀 预期效果

### 修复前
```
POST https://zxyy.ltd/lgb/xfzwj/add
Content-Type: application/json
x-signature: 3386b31b37ecc54cf38f6f7311c3de6d36e850c5cfa2baf5b5e51dc07d74c14c
Body: {"name":"景彬娣",...}

Response: {"code":5000,"message":"安全校验失败-2"}
```

### 修复后
```
POST https://zxyy.ltd/lgb/xfzwj/add
Content-Type: application/x-www-form-urlencoded; charset=UTF-8
sign: 2cef6bd753eca172999980f9e1f0286165049bcce297c5f56e2daff8f2314cef
signKey: 14740
Body: name=景彬娣&sex=女&...&encryptedText=name%3D...

Response: {"code":0,"message":"操作成功","data":1}
```

## 🎯 总结

通过这次修复：

1. **修正了请求格式** - 使用正确的Content-Type和请求头
2. **实现了正确的签名流程** - 基于encryptedText生成签名
3. **添加了必要的字段** - 包含encryptedText用于后端验证
4. **保持了与后端的一致性** - 完全按照dcwj.js的实现方式

现在API请求应该能通过安全校验，不再出现5000错误！
