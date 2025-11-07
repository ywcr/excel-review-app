# 地图水印特征说明

## ⚠️ 重要补充

在医院/药店场景的200张图片中，除了常规的版权/署名水印外，还包含**地图服务水印**。

---

## 🗺️ 地图水印特征

### 典型内容

```
地图淘金            # 高德地图服务水印
高德地图            # 高德服务标识
百度地图            # 百度服务标识
百度                # 简化版标识
百度地图用户        # UGC内容标注
作者名              # 地图贡献者标识
腾讯地图            # 腾讯服务标识
```

### 视觉特征

| 特征维度 | 地图水印 | 常规水印 |
|---------|---------|---------|
| **透明度** | ⚠️ **极低（OC < 5）** | 低到中（OC 5-30） |
| **可见度** | 几乎不可见，需仔细观察 | 半透明可见 |
| **颜色** | 浅灰色/半透明白色 | 白色/黑色/彩色 |
| **位置** | 左下角/右下角 | 四角或边缘 |
| **字体** | 小号，细线 | 中号，加粗 |
| **融合度** | 与背景高度融合 | 有一定对比度 |

### 检测难点

**地图水印是最难检测的水印类型**：

1. **透明度极低**：OC < 5，接近完全透明
2. **像素值接近背景**：与地图底色几乎一致
3. **尺寸较小**：文字通常很小
4. **边缘模糊**：为了融入背景，边缘被故意模糊化

---

## 📸 应用场景

### 为什么会有地图水印？

医院/药店场景照片中包含地图截图的情况：

```
场景1: 位置展示
  • 医院/药店的地理位置截图
  • 用于说明交通、周边环境
  
场景2: 导航说明  
  • 如何到达该医院/药店的路线图
  • 周边停车场位置
  
场景3: 区域示意
  • 药店分布图（连锁药店）
  • 医院科室分布图
```

---

## 🔍 检测策略调整

### 当前检测器表现

```javascript
// 地图水印的检测难度：

Textlikeness (TL):   可能偏低（40-70）    // 文字很小、模糊
OverlayConsistency (OC):  极低（< 5）     // ⚠️ 关键特征
AlphaLike (AL):      中等（30-60）        // 半透明
PositionWeight (PW): 高（80-100）         // 在角落
Grid:                可能有               // 地图网格线
Concentration:       低（< 1.0）          // 文字很小、分散
```

**问题**：
- OC极低（<5）可能被硬拒绝规则9过滤
- TL较低可能无法通过Single分支的gate
- 小尺寸导致Conc很低

### 建议调整

#### 方案1：放宽cornerTextWatermarkPath的OC要求

```javascript
// 当前代码（test-watermark-images.js 第926行）：
(singleFeatures.overlayConsistency >= 1.5 || singleFeatures.alphaLike >= 60)

// 建议改为：
(singleFeatures.overlayConsistency >= 0.5 ||  // 放宽到0.5，支持地图水印
 singleFeatures.alphaLike >= 60)
```

#### 方案2：增加专门的mapWatermarkPath

```javascript
// 新增地图水印专用路径
const mapWatermarkPath = (
  singleFeatures.positionWeight >= 90 &&        // 在角落
  singleFeatures.overlayConsistency < 5 &&     // 极低OC
  singleFeatures.textlikeness >= 40 &&         // 中等TL
  singleFeatures.textlikeness <= 80 &&         // 但不会太高
  concentrationInfo.concentrationRatio < 1.0 && // 很小、集中度低
  singleFeatures.alphaLike >= 30 &&            // 有一定透明度
  strokeConsistency.textLikeCount < 100        // 文字组件很少
);
```

#### 方案3：OCR识别地图服务商名称

```javascript
const text = extractText(roiImage);

// 地图服务水印关键词
const mapWatermarks = [
  '地图淘金', '高德地图', '百度地图', '腾讯地图',
  '百度', '高德', '腾讯', '谷歌地图',
  '地图数据', 'Map Data', 'Baidu', 'Amap'
];

if (mapWatermarks.some(keyword => text.includes(keyword))) {
  confidence += 60;  // 明确是地图水印
  hasWatermark = true;
}
```

---

## 📊 影响评估

### 当前召回率分析

如果5张真水印中有地图水印：

```
场景A: 地图水印被检出（当前情况）
  • 可能恰好满足了某些边缘条件
  • 或者该地图水印比普通地图水印更明显

场景B: 地图水印被漏检（风险）
  • OC < 5 触发硬拒绝规则9
  • TL < 68 无法通过Single gate
  • 召回率从100%降低
```

### 真实水印类型分布（推测）

基于5张真水印（image196-200）：

```
可能的分布：
  • 2-3张：版权/署名水印（© 某某医院、摄影师名）
  • 1-2张：地图服务水印（地图淘金、高德地图等）
  • 0-1张：其他类型（时间戳、Logo等）
```

---

## ✅ 行动建议

### 立即执行

1. **确认真水印类型**
   ```bash
   # 手动查看image196-200，确认哪些是地图水印
   ```

2. **调整OC阈值**
   - 如果确有地图水印，将cornerTextWatermarkPath的OC要求从1.5降到0.5
   - 或在规则9中为正角落位置增加OC < 1.5的豁免

3. **OCR验证**
   - 对检测出的水印进行OCR
   - 识别到地图服务商名称时直接标记为真水印

### 中期优化

1. **增加mapWatermarkPath**
   - 专门针对地图水印的特征（极低OC + 角落 + 小尺寸）

2. **地图关键词库**
   - 建立地图服务商名称库
   - 支持中英文、简化写法

3. **特征权重调整**
   - 对于OC < 5的检测，降低OC权重，提高AL和PW权重

---

## 🔧 代码修改示例

### 修改1：放宽cornerTextWatermarkPath

```diff
// test-watermark-images.js 第926行
const cornerTextWatermarkPath = (
  singleFeatures.positionWeight === 100 &&
  singleFeatures.textlikeness >= 85 &&
  concentrationInfo.concentrationRatio >= 1.0 &&
- (singleFeatures.overlayConsistency >= 1.5 || singleFeatures.alphaLike >= 60) &&
+ (singleFeatures.overlayConsistency >= 0.5 || singleFeatures.alphaLike >= 60) &&  // 0.5支持地图水印
  singleFeatures.alphaLike >= 40 &&
  strokeConsistency.textLikeCount >= 50 &&
  strokeConsistency.textLikeCount <= 3000
);
```

### 修改2：规则9豁免极低OC的角落水印

```diff
// test-watermark-images.js 第1364行
if (!cornerLogoPath && !cornerTextWatermarkPath && !edgeTextWatermarkPath && 
    singleFeatures.textlikeness >= 99.5 && 
+   singleFeatures.positionWeight < 100 &&  // 新增：保护正角落（可能是地图水印）
    singleFeatures.overlayConsistency < 5) {
  hardReject = true;
  hardRejectReason = '规则9(策略4强化): 满分TL+极低OC(<5)';
}
```

---

## 📝 总结

### 关键认识

1. **地图水印是最隐蔽的水印类型**
2. **透明度极低（OC < 5）是其核心特征**
3. **需要专门的检测策略才能有效识别**

### 检测优先级

```
高优先级：版权/署名水印（TL高、OC中、易检测）
中优先级：Logo/图形水印（TL中、特征明显）
低优先级：地图服务水印（TL低、OC极低、极难检测）⚠️
```

### 下一步

- [ ] 手动确认image196-200中是否包含地图水印
- [ ] 根据确认结果调整OC阈值
- [ ] 考虑引入OCR识别地图服务商名称
- [ ] 更新文档记录地图水印检测策略

---

*补充说明创建于：2025-01-17*  
*配合主文档：WATERMARK-DETECTION-CONTEXT.md*
