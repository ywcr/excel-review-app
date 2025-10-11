# 边框检测参数调优说明

## 🎯 当前参数配置 (已优化)

### 核心参数
```javascript
BORDER_COLOR_TOLERANCE = 15      // 颜色容差 (0-255)
BORDER_CONSISTENCY_RATIO = 0.90  // 一致性比例 (0-1)
BORDER_MIN_WIDTH = 2             // 最小边框宽度 (像素)
BORDER_MAX_WIDTH = 40            // 最大边框宽度 (像素)
BORDER_BRIGHTNESS_DIFF = 30      // 亮度差异阈值 (0-255)
```

## 📊 参数说明

### 1. BORDER_COLOR_TOLERANCE (颜色容差)
**当前值**: 15
- **作用**: 允许边框内像素的颜色差异范围
- **调低** (如10): 更严格，只检测非常纯的边框，可能漏检
- **调高** (如20): 更宽松，可能将有纹理的区域也识别为边框

### 2. BORDER_CONSISTENCY_RATIO (一致性比例)
**当前值**: 0.90
- **作用**: 要求边框中多少比例的像素颜色一致
- **调低** (如0.85): 更宽松，允许边框有更多杂色/噪点
- **调高** (如0.95): 更严格，边框必须非常纯净

### 3. BORDER_MIN_WIDTH (最小边框宽度)
**当前值**: 2px
- **作用**: 过滤掉过细的边框
- **调低** (如1): 可以检测1px的边框，但可能误报增多
- **调高** (如3): 只检测较宽的边框

### 4. BORDER_MAX_WIDTH (最大边框宽度)
**当前值**: 40px
- **作用**: 防止将大面积纯色区域误判为边框
- **调低** (如30): 更严格，但可能漏检较宽的边框
- **调高** (如50): 可检测更宽的边框，但可能误判内部区域

### 5. BORDER_BRIGHTNESS_DIFF (亮度差异阈值)
**当前值**: 30
- **作用**: 要求边框与紧邻内容的最小亮度差异
- **调低** (如20): 更容易判定为边框，可能将内部白色区域误判为边框
- **调高** (如40): 更严格的边界判断，只有明显的边界才算边框

## 🔧 调优建议

### 场景1：检测不到真实边框
**症状**: n19图片右侧有明显白边，但没有检测出

**可能原因**:
1. 边框颜色不够纯 → 降低 CONSISTENCY_RATIO
2. 边框有轻微渐变 → 提高 COLOR_TOLERANCE
3. 亮度差异不够 → 降低 BRIGHTNESS_DIFF

**建议调整**:
```javascript
BORDER_COLOR_TOLERANCE = 18          // 从15提高到18
BORDER_CONSISTENCY_RATIO = 0.88      // 从0.90降低到0.88
BORDER_BRIGHTNESS_DIFF = 25          // 从30降低到25
```

### 场景2：灯条等内部区域被误判为边框
**症状**: 图片内部的白色灯条被认为是白边

**可能原因**:
1. 亮度差异阈值太低 → 提高 BRIGHTNESS_DIFF
2. 边框太宽 → 降低 MAX_WIDTH
3. 一致性要求太低 → 提高 CONSISTENCY_RATIO

**建议调整**:
```javascript
BORDER_BRIGHTNESS_DIFF = 35          // 从30提高到35
BORDER_MAX_WIDTH = 35                // 从40降低到35
BORDER_CONSISTENCY_RATIO = 0.92      // 从0.90提高到0.92
```

### 场景3：既要检测真边框又要避免误报
**策略**: 采用当前的平衡参数
```javascript
BORDER_COLOR_TOLERANCE = 15          // 中等容差
BORDER_CONSISTENCY_RATIO = 0.90      // 中等要求
BORDER_BRIGHTNESS_DIFF = 30          // 中等阈值
```

## 🧪 快速测试方法

1. **修改参数**: 编辑 `public/validation-worker.js` 第2703-2707行
2. **清除缓存**: 强制刷新浏览器 (Cmd+Shift+R / Ctrl+Shift+F5)
3. **重新验证**: 上传测试文件，查看效果
4. **观察结果**: 
   - 是否检测到真实边框？
   - 是否有误报？
5. **微调**: 根据结果继续调整参数

## 📈 参数敏感度分析

| 参数 | 敏感度 | 影响范围 |
|-----|--------|---------|
| COLOR_TOLERANCE | ★★★☆☆ | 对有渐变/噪点的边框影响大 |
| CONSISTENCY_RATIO | ★★★★☆ | 对所有类型边框都有影响 |
| MIN_WIDTH | ★★☆☆☆ | 主要影响细边框 |
| MAX_WIDTH | ★★★☆☆ | 主要影响粗边框和误判 |
| BRIGHTNESS_DIFF | ★★★★★ | **最重要**，直接决定是否为边框 |

## 💡 推荐配置组合

### 保守配置 (减少误报)
```javascript
BORDER_COLOR_TOLERANCE = 12
BORDER_CONSISTENCY_RATIO = 0.93
BORDER_MIN_WIDTH = 3
BORDER_MAX_WIDTH = 35
BORDER_BRIGHTNESS_DIFF = 35
```

### 平衡配置 (当前使用)
```javascript
BORDER_COLOR_TOLERANCE = 15
BORDER_CONSISTENCY_RATIO = 0.90
BORDER_MIN_WIDTH = 2
BORDER_MAX_WIDTH = 40
BORDER_BRIGHTNESS_DIFF = 30
```

### 激进配置 (检测更多边框)
```javascript
BORDER_COLOR_TOLERANCE = 18
BORDER_CONSISTENCY_RATIO = 0.87
BORDER_MIN_WIDTH = 2
BORDER_MAX_WIDTH = 45
BORDER_BRIGHTNESS_DIFF = 25
```

## 🎯 最终建议

根据实际测试结果，推荐：
1. **先使用平衡配置**测试大量图片
2. **记录漏检和误报的案例**
3. **针对性微调参数**
4. **最终找到适合业务场景的最佳配置**

当前配置应该能：
- ✅ 检测2-40px宽度的边框
- ✅ 允许轻微渐变 (±15色差)
- ✅ 过滤内部纯色区域 (通过亮度差异30)
- ✅ 允许10%的噪点/杂色

如果n19的白边仍检测不出，建议微调为"激进配置"。
