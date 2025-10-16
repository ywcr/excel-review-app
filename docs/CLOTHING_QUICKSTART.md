# 服装季节检测 - 快速开始指南

## 🎯 5分钟快速集成

### 第1步：启动后端服务（Windows）

双击运行启动脚本：
```
start_clothing_api.bat
```

或手动运行：
```bash
python api/clothing_season_api.py
```

**验证服务启动**：浏览器访问 http://localhost:8000
应该看到：`{"status": "running", "version": "enhanced"}`

---

### 第2步：集成到validation-worker

打开 `public/validation-worker.js`，在文件开头（约第10行）添加：

```javascript
// 📦 加载服装季节检测模块
try {
  importScripts("/clothing-season-checker.js");
  console.log("✅ 服装季节检测模块已加载");
} catch (error) {
  console.warn("⚠️ 服装季节检测模块加载失败", error);
}
```

---

### 第3步：在图片验证中调用

在 `validation-worker.js` 的图片处理函数中添加检测逻辑。

**找到图片验证位置**（搜索类似 `async function validateImages` 或图片循环处理的地方）：

```javascript
// 示例：在图片信息收集后添加
for (const img of images) {
  // ... 现有的图片验证逻辑 ...
  
  // ✨ 新增：服装季节检测
  if (typeof ClothingSeasonChecker !== 'undefined') {
    const apiAvailable = await ClothingSeasonChecker.checkAPIAvailable();
    
    if (apiAvailable && ClothingSeasonChecker.shouldCheck(img)) {
      try {
        const clothingResult = await ClothingSeasonChecker.checkSingle(
          img.data,  // 图片数据（Uint8Array或ArrayBuffer）
          { tolerance: 0.2 }  // 20%容差
        );
        
        // 保存结果
        img.clothingCheck = clothingResult;
        
        // 生成提示信息
        const message = ClothingSeasonChecker.generateMessage(clothingResult);
        if (message) {
          img.clothingMessage = message;
          
          // 不合规时添加警告
          if (!clothingResult.overallCompliant) {
            img.warnings = img.warnings || [];
            img.warnings.push({
              type: 'clothing_season',
              message: message,
              severity: 'warning'
            });
          }
        }
      } catch (error) {
        console.error('服装检测失败:', img.filename, error);
      }
    }
  }
}
```

---

### 第4步：显示检测结果

在前端UI中显示服装检测结果（修改图片验证结果展示部分）：

```javascript
// 示例：在图片信息显示区域添加
if (image.clothingMessage) {
  const messageClass = image.clothingCheck?.overallCompliant 
    ? 'success' 
    : 'warning';
  
  resultHTML += `
    <div class="clothing-check ${messageClass}">
      ${image.clothingMessage}
    </div>
  `;
}
```

---

## 📝 简化配置

### 只想检测当前季节？

最简单的调用方式（自动判断季节）：

```javascript
const result = await ClothingSeasonChecker.checkSingle(imageData);
```

### 想指定季节？

```javascript
const result = await ClothingSeasonChecker.checkSingle(imageData, {
  expectedSeason: 'summer'  // 或 'winter'
});
```

### 想调整容差？

```javascript
const result = await ClothingSeasonChecker.checkSingle(imageData, {
  tolerance: 0.3  // 30%容差
});
```

---

## 🔧 配置开关

### 启用/禁用功能

编辑 `public/clothing-season-checker.js`：

```javascript
const CLOTHING_API_CONFIG = {
  ENABLED: true,  // 改为 false 禁用功能
  // ...
};
```

### 修改API地址

如果后端部署在其他服务器：

```javascript
const CLOTHING_API_CONFIG = {
  BASE_URL: 'http://your-server:8000',
  // ...
};
```

---

## ✅ 测试验证

### 1. 测试API服务

浏览器访问：
```
http://localhost:8000/docs
```
点击 `GET /api/season/current` -> Try it out -> Execute

应该返回当前季节信息。

### 2. 测试前端集成

1. 打开浏览器开发者工具（F12）
2. 上传包含人物照片的Excel文件
3. 查看控制台，应该看到：
   - `✅ 服装季节检测模块已加载`
   - 服装检测的日志信息

### 3. 验证检测结果

在图片验证结果中，应该看到类似的消息：
- `✓ 服装符合秋季要求 (2/2人)`
- `✗ 服装不符合夏季要求 (仅1/3人符合)`

---

## 🎨 结果示例

### 检测成功（合规）

```json
{
  "checked": true,
  "hasPerson": true,
  "personCount": 2,
  "seasonName": "秋季",
  "compliantCount": 2,
  "complianceRate": 1.0,
  "overallCompliant": true,
  "message": "检测到2人，全部符合秋季着装要求（换季期）"
}
```

### 检测失败（不合规）

```json
{
  "checked": true,
  "hasPerson": true,
  "personCount": 3,
  "seasonName": "夏季",
  "compliantCount": 1,
  "complianceRate": 0.33,
  "overallCompliant": false,
  "message": "检测到3人，仅1人符合夏季着装，不合规"
}
```

### 无人员

```json
{
  "checked": true,
  "hasPerson": false,
  "personCount": 0
}
```

---

## 🚨 常见问题

### ❌ 问题：服务启动失败

**解决**：
1. 确认Python已安装：`python --version`
2. 安装依赖：运行 `start_clothing_api.bat`
3. 检查端口8000是否被占用

### ❌ 问题：前端无法连接API

**解决**：
1. 确认后端服务已启动：访问 http://localhost:8000
2. 检查CORS配置
3. 查看浏览器控制台错误信息

### ❌ 问题：检测结果不准确

**解决**：
1. 检查图片质量（过暗、过亮会影响检测）
2. 增大容差：`tolerance: 0.3`
3. 如果是换季期，系统会自动放宽标准

---

## 📚 进阶配置

详细文档请查看：
- 完整集成指南：`docs/CLOTHING_DETECTION_INTEGRATION.md`
- API文档：http://localhost:8000/docs
- 检测算法说明：`scripts/detect_clothing_enhanced.py`

---

## 💡 实用技巧

### 1. 批量检测多张图片

```javascript
const results = await ClothingSeasonChecker.checkBatch(
  [imageData1, imageData2, imageData3],
  { tolerance: 0.2 }
);
```

### 2. 仅在需要时检测

```javascript
if (ClothingSeasonChecker.shouldCheck(imageInfo)) {
  // 只检测符合条件的图片（尺寸、大小合理）
  const result = await ClothingSeasonChecker.checkSingle(imageData);
}
```

### 3. 模拟不同月份测试

```javascript
// 测试3月（早春）
const result = await ClothingSeasonChecker.checkSingle(imageData, {
  month: 3  // 自动判定为春季，容差放宽
});
```

---

## 🎯 下一步

1. ✅ 启动服务并验证运行正常
2. ✅ 集成到validation-worker
3. ✅ 测试几张包含人物的图片
4. ⭐ 根据需求调整容差和配置
5. 🚀 上线使用！

---

**有问题？**查看完整文档或在项目中提交Issue。
