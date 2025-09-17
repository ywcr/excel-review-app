# 使用jQuery Ajax替代Fetch修改总结

## 🎯 修改原因

用户建议使用网站已经配置好的 `$.ajax` 替代 `fetch` 请求，因为：

1. **网站已配置好对应的请求头** - 无需手动设置复杂的请求头
2. **与现有代码保持一致** - 网站其他接口都使用 `$.ajax`
3. **自动处理认证和会话** - jQuery会自动处理cookies和会话状态
4. **更好的兼容性** - 避免fetch的兼容性问题

## 🔧 具体修改内容

### 1. API请求修改（execution-logic.js）

#### 修改前：使用fetch
```javascript
// 构建表单数据
const formData = new URLSearchParams();
Object.keys(requestData).forEach(key => {
    if (typeof requestData[key] === 'object') {
        formData.append(key, JSON.stringify(requestData[key]));
    } else {
        formData.append(key, requestData[key]);
    }
});
formData.append('encryptedText', finalEncryptedText);

// 发送API请求
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

const result = await response.json();
```

#### 修改后：使用$.ajax
```javascript
// 添加encryptedText到请求数据
requestData.encryptedText = finalEncryptedText;

// 使用$.ajax发送请求（与网站其他接口保持一致）
const result = await new Promise((resolve, reject) => {
    $.ajax({
        url: config.apiEndpoint,
        type: "POST",
        data: requestData,
        headers: {
            sign: signature,
            signKey: saltData.signkey
        },
        traditional: true,
        success: function(res) {
            resolve(res);
        },
        error: function(xhr, status, error) {
            reject(new Error(`请求失败: ${status} - ${error}`));
        }
    });
});
```

### 2. 动态盐值获取修改（template-manager.js）

#### 修改前：使用fetch
```javascript
const response = await fetch(`${API_BASE_URL}${config.saltEndpoint}`, {
    method: 'GET',
    headers: {
        'accept': '*/*',
        'accept-language': 'zh-CN,zh;q=0.9',
        'x-requested-with': 'XMLHttpRequest'
    },
    credentials: 'include'
});

console.log('HTTP响应状态:', response.status, response.statusText);
const result = await response.json();
```

#### 修改后：使用$.ajax
```javascript
const result = await new Promise((resolve, reject) => {
    $.ajax({
        url: config.saltEndpoint,
        type: "GET",
        traditional: true,
        success: function(res) {
            console.log('✅ 主端点响应成功:', res);
            resolve(res);
        },
        error: function(xhr, status, error) {
            console.error('❌ 主端点请求失败:', status, error);
            reject(new Error(`请求失败: ${status} - ${error}`));
        }
    });
});
```

### 3. 备用端点获取修改

同样的模式应用到备用端点获取，使用 `$.ajax` 替代 `fetch`。

## 📊 修改对比

| 项目 | Fetch方式 | $.ajax方式 |
|------|-----------|------------|
| 请求头设置 | 手动设置多个请求头 | 自动处理，只需设置签名头 |
| 数据格式 | 需要手动构建URLSearchParams | 直接传递对象，jQuery自动处理 |
| 错误处理 | 需要检查response.ok | 内置error回调 |
| 会话管理 | 手动设置credentials | 自动处理cookies |
| 兼容性 | 需要考虑浏览器兼容性 | jQuery处理兼容性 |
| 代码一致性 | 与现有代码不一致 | 与网站其他接口一致 |

## 🚀 优势

### 1. **简化代码**
- 无需手动设置复杂的请求头
- 无需手动构建表单数据
- 无需手动处理响应格式

### 2. **自动处理**
- jQuery自动设置 `Content-Type`
- 自动处理 `X-Requested-With` 头
- 自动管理cookies和会话状态

### 3. **一致性**
- 与 `/lgb/lxrgl/getMessage` 等接口保持一致
- 与 `base-questionnaire.js` 中的其他Ajax调用保持一致
- 遵循网站的统一请求模式

### 4. **可靠性**
- 利用网站已有的配置和中间件
- 减少因手动配置导致的错误
- 更好的错误处理和调试信息

## 🎯 参考模式

修改基于 `base-questionnaire.js` 中的标准模式：

```javascript
$.ajax({
    url: "/lgb/lxrgl/getMessage",
    type: "POST",
    data: {
        recId: "",
        nvcVal: "",
        empRecId: "",
        lxrType: "消费者",
        name: name,
        sex: sex,
        remark: ""
    },
    traditional: true,
    success: function(res) {
        resolve(res);
    },
    error: function(xhr, status, error) {
        reject(error);
    }
});
```

## 📋 总结

通过使用 `$.ajax` 替代 `fetch`：

1. **简化了代码** - 减少了手动配置
2. **提高了可靠性** - 利用网站现有配置
3. **保持了一致性** - 与其他接口统一
4. **改善了维护性** - 更容易调试和维护

现在API请求应该能更稳定地工作，因为它使用了与网站其他功能相同的请求方式！
