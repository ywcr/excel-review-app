# API 签名机制说明

## 🔍 签名机制分析

根据您的代码分析，系统中存在两种不同的 API 调用方式：

### 1. 不需要签名的接口

**接口列表：**

- `/lgb/lxrgl/save` - 创建联系人
- `/lgb/lxrgl/getMessage` - 查询联系人

**调用方式：**

```javascript
$.ajax({
  url: "/lgb/lxrgl/save",
  type: "POST",
  data: {
    recId: "",
    nvcVal: "",
    empRecId: "",
    lxrType: "消费者",
    name: name,
    sex: sex,
    remark: "",
  },
  traditional: true,
  success: function (res) {
    // 处理响应
  },
});
```

**特点：**

- 直接使用 jQuery 的`$.ajax()`调用
- 只传递基本的 POST 数据
- 不需要任何签名或特殊请求头

### 2. 需要签名的接口

**接口列表：**

- `/lgb/xfzwj/add` - 提交问卷数据

**调用流程：**

1. **获取动态盐值**

   ```javascript
   GET /lgb/payMerge/createDynamicsSalt?methodName=%2Fxfzwj%2Fadd
   ```

2. **生成签名**

   ```javascript
   // 使用signkey生成sign签名
   const sign = generateSign(data, signkey);
   ```

3. **提交数据**
   ```javascript
   POST /lgb/xfzwj/add
   Headers: {
       "sign": "2cef6bd753eca172999980f9e1f0286165049bcce297c5f56e2daff8f2314cef",
       "signkey": "59374"
   }
   ```

## 🔧 签名算法实现

### 当前实现

```javascript
function generateSign(data, signkey) {
  // 使用MD5哈希算法
  const signString = data + signkey;

  if (typeof CryptoJS !== "undefined" && CryptoJS.MD5) {
    return CryptoJS.MD5(signString).toString();
  } else {
    // 备用MD5实现
    return simpleMD5(signString);
  }
}
```

### 签名参数说明

- **data**: 请求数据（当前为空字符串，可能需要根据实际 API 要求调整）
- **signkey**: 从`createDynamicsSalt`接口获取的动态盐值
- **sign**: 使用 MD5 算法生成的签名

## 📋 API 模式中的接口分类

### 问卷相关接口（需要签名）

- `createDynamicsSalt()` - 获取动态盐值
- `submitQuestionnaire()` - 提交问卷数据

### 联系人管理接口（不需要签名）

- `getSame()` - 查询联系人是否存在
- `addHuanzhe()` - 创建联系人

## ⚠️ 注意事项

1. **签名算法**：当前使用 MD5，如果后端使用其他算法需要调整
2. **数据格式**：签名可能需要特定的数据组合方式
3. **库依赖**：已添加 CryptoJS 库支持，同时提供备用实现
4. **错误处理**：包含完整的错误处理机制

## 🛠️ 调试建议

1. **检查签名**：在控制台查看生成的签名是否正确
2. **验证 signkey**：确认动态盐值获取成功
3. **对比请求**：与浏览器开发者工具中的实际请求对比
4. **测试接口**：先测试单个接口调用是否成功

---

**总结**：系统中有两种 API 调用模式，问卷提交需要签名验证，联系人管理不需要。API 模式已根据这个分析进行了相应的实现。
