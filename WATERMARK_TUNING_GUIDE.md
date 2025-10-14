# 水印检测配置调优指南

## 当前问题
- **假阴性**: 3张有水印的图片 (image196.jpeg, image197.jpeg, image198.png) 未被检测到
- **假阳性**: 0张 - 没有误报
- **结论**: 检测器过于保守，需要降低阈值和放宽门控条件

## 诊断步骤

### 1. 使用独立检测器测试3张水印图片
打开 `watermark-detector-standalone.html`，逐一测试：
- image196.jpeg
- image197.jpeg  
- image198.png

**查看调试信息**，记录以下指标：
- Repeated分支：periodicity, angleCoh, whiteness, repeatedScore, repeatedPassed
- Single分支：textlikeness, overlayConsistency, alphaLike, positionWeight, singleScore, singlePassed
- Baseline分数
- AI分数 (如果启用)
- 最终置信度

### 2. 根据调试信息调整配置

#### 配置文件位置
- 独立检测器: `watermark-detector-standalone.html` (第377-397行)
- 主验证worker: `public/validation-worker.js` (搜索 `const CFG = {`)

#### 当前配置 (watermark-detector-standalone.html)
```javascript
const CFG = {
  preprocess: { maxSize: 1200, edgeThreshold: 30, blurRadius: 1.0 },
  gating: {
    centerEdgePenalty: { centerRatio: 0.60, factor: 0.35 },
    uniformRegionPenalty: { regionScore: 70, whiteness: 15, factor: 0.5 },
    lowAnglePenalty: { angleCoherence: 35, factor: 0.7 }
  },
  repeated: {
    angles: [-45,-30,-15,0,15,30,45],
    thresholds: { periodicity: 58, angleCoherence: 55, whiteness: 25 },
    weights: { periodicity: 0.5, angleCoherence: 0.25, whiteness: 0.15, strokeWidth: 0.10 },
    pass: 45
  },
  single: {
    roi: { edgeBand: 0.15, cornerBox: 0.20 },
    thresholds: { 
      textlikeness: 70, 
      overlayConsistency: 35, 
      alphaLike: 20, 
      alphaLikeStrong: 40, 
      whiteEdgeMin: 20, 
      positionMin: 60, 
      strokeWidthMax: 9 
    },
    weights: { textlikeness: 0.4, overlayConsistency: 0.25, position: 0.2, alphaLike: 0.15 },
    pass: 42
  },
  fusion: { 
    scale: { repeated: 0.7, single: 0.75, baseline: 1.0 }, 
    decision: 45 
  }
};
```

## 调优策略

### A. 降低最终决策阈值 (最快方法)
**目标**: 让更多图片通过检测

```javascript
fusion: { 
  scale: { repeated: 0.7, single: 0.75, baseline: 1.0 }, 
  decision: 35  // 从 45 降低到 35
}
```

### B. 降低Repeated分支阈值
**适用于**: 如果3张图是平铺/重复水印

```javascript
repeated: {
  thresholds: { 
    periodicity: 50,      // 从 58 降低到 50
    angleCoherence: 45,   // 从 55 降低到 45
    whiteness: 20         // 从 25 降低到 20
  },
  pass: 38  // 从 45 降低到 38
}
```

### C. 降低Single分支阈值
**适用于**: 如果3张图是单个Logo/角标水印

```javascript
single: {
  thresholds: { 
    textlikeness: 60,           // 从 70 降低到 60
    overlayConsistency: 28,     // 从 35 降低到 28
    alphaLike: 15,              // 从 20 降低到 15
    alphaLikeStrong: 32,        // 从 40 降低到 32
    whiteEdgeMin: 15,           // 从 20 降低到 15
    positionMin: 50,            // 从 60 降低到 50
    strokeWidthMax: 12          // 从 9 放宽到 12
  },
  pass: 35  // 从 42 降低到 35
}
```

### D. 放宽惩罚项
**目标**: 减少对边缘/区域特征的惩罚

```javascript
gating: {
  centerEdgePenalty: { centerRatio: 0.70, factor: 0.50 },  // 更宽松
  uniformRegionPenalty: { regionScore: 80, whiteness: 10, factor: 0.65 },
  lowAnglePenalty: { angleCoherence: 25, factor: 0.80 }  // 更宽松
}
```

### E. 启用AI检测模式
**目标**: 使用启发式掩膜检测作为备用路径

在独立检测器中勾选 "启用AI检测" 复选框，或在代码中：
```javascript
const AI_MODE = true;  // 强制启用
```

AI模式会计算掩膜启发式分数，如果传统方法失败，AI分数可以作为最终置信度。

## 推荐调优流程

### 第一步：测试并收集数据
1. 使用默认配置测试3张水印图，记录所有分数
2. 找出哪个分支最接近通过（repeated, single, baseline, AI）

### 第二步：针对性调整
- **如果 repeatedScore 接近45但未通过**:
  - 降低 `repeated.pass` 到 38-40
  - 或降低 `repeated.thresholds` 中的门控值
  
- **如果 singleScore 接近42但未通过**:
  - 降低 `single.pass` 到 35-38
  - 或降低 `single.thresholds` 中的门控值
  
- **如果 baseline 接近45但未通过**:
  - 降低 `fusion.decision` 到 35-40
  
- **如果所有分数都很低**:
  - 启用AI检测模式
  - 同时降低 `fusion.decision` 到 30-35

### 第三步：批量测试
1. 将调整后的配置同步到 `validation-worker.js`
2. 重新运行批量检测: 
   ```powershell
   node "D:\yaowei\excel-review-app\process-excel.js" "输入文件.xlsx"
   ```
3. 运行分析脚本:
   ```powershell
   node "D:\yaowei\excel-review-app\batch-test-watermarks.js"
   ```
4. 检查是否：
   - 3张水印图被正确检测 (真阳性 = 3)
   - 没有或只有少量误报 (假阳性 < 5)

### 第四步：微调平衡
- **如果假阳性过多**: 逐步提高阈值
- **如果仍有漏检**: 继续降低阈值
- **目标**: F1分数 > 90%

## 快速开始配置 (保守降低)

如果不确定如何调整，可以使用此"安全"配置：

```javascript
const CFG = {
  preprocess: { maxSize: 1200, edgeThreshold: 30, blurRadius: 1.0 },
  gating: {
    centerEdgePenalty: { centerRatio: 0.65, factor: 0.45 },
    uniformRegionPenalty: { regionScore: 75, whiteness: 12, factor: 0.60 },
    lowAnglePenalty: { angleCoherence: 30, factor: 0.75 }
  },
  repeated: {
    angles: [-45,-30,-15,0,15,30,45],
    thresholds: { periodicity: 52, angleCoherence: 48, whiteness: 22 },
    weights: { periodicity: 0.5, angleCoherence: 0.25, whiteness: 0.15, strokeWidth: 0.10 },
    pass: 40
  },
  single: {
    roi: { edgeBand: 0.15, cornerBox: 0.20 },
    thresholds: { 
      textlikeness: 65, 
      overlayConsistency: 30, 
      alphaLike: 18, 
      alphaLikeStrong: 36, 
      whiteEdgeMin: 17, 
      positionMin: 55, 
      strokeWidthMax: 10 
    },
    weights: { textlikeness: 0.4, overlayConsistency: 0.25, position: 0.2, alphaLike: 0.15 },
    pass: 38
  },
  fusion: { 
    scale: { repeated: 0.7, single: 0.75, baseline: 1.0 }, 
    decision: 38  // 关键: 从45降到38
  }
};
```

## 注意事项

1. **同步配置**: 独立检测器和validation-worker.js必须使用相同配置
2. **增量调整**: 每次只调整一个参数，观察效果
3. **保留备份**: 调整前备份原始配置
4. **测试验证**: 每次调整后运行批量测试脚本验证效果

## 下一步

1. 先用独立检测器手动测试3张水印图
2. 将测试结果和调试日志发给我
3. 我会根据具体数据给出精确的配置调整建议
