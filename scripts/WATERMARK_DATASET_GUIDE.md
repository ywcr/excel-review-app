# 水印数据集采集指南

针对你们的业务场景（药店/医院门头 + 高德/百度/小红书/抖音水印）

## 📦 环境准备

```bash
# 1. 安装 Python 依赖
pip install pillow requests

# 2. （可选）注册免费 API Key
# Pexels: https://www.pexels.com/api/
# Unsplash: https://unsplash.com/developers
# Flickr: https://www.flickr.com/services/api/
```

## 🚀 快速开始（3 步完成）

### 方案 A：使用现有图片生成水印（推荐）

```bash
# 步骤 1: 将你们的无水印门头照片放入 dataset/source/
# 可以是任何药店/医院/诊所门头照片

# 步骤 2: 生成带水印的训练样本
cd scripts
python generate_watermarks.py --source ../dataset/source --output ../dataset/watermarked

# 结果：每张源图片会生成 6 个版本
# - xxx_gaode.jpg (高德地图水印)
# - xxx_baidu.jpg (百度地图水印)
# - xxx_xiaohongshu.jpg (小红书水印)
# - xxx_douyin.jpg (抖音水印)
# - xxx_weibo.jpg (微博水印)
# - xxx_repeated.jpg (重复图案水印)
```

### 方案 B：从网络下载样本

```bash
# 方式 1: 从 Unsplash/Pexels 下载（无水印，需要 API Key）
python scrape_watermarked_images.py --source pexels --query "pharmacy" --count 50

# 方式 2: 手动收集 URL
python scrape_watermarked_images.py --source template  # 生成 urls.txt 模板
# 编辑 urls.txt，添加图片链接
python scrape_watermarked_images.py --source urls
```

### 方案 C：混合方案（最优）

```bash
# 1. 从网络下载无水印底图（50张）
python generate_watermarks.py --download --source ../dataset/source

# 2. 添加你们自己的无水印照片到 dataset/source/（推荐 50-100张）

# 3. 批量生成水印版本
python generate_watermarks.py --source ../dataset/source --output ../dataset/watermarked

# 最终：100-150 张源图 × 6 种水印 = 600-900 张训练样本
```

## 📂 数据集结构

生成后的目录结构：

```
dataset/
├── source/              # 无水印源图片
│   ├── pharmacy_1.jpg
│   ├── pharmacy_2.jpg
│   └── ...
├── watermarked/         # 生成的带水印图片
│   ├── pharmacy_1_gaode.jpg
│   ├── pharmacy_1_baidu.jpg
│   ├── pharmacy_1_xiaohongshu.jpg
│   └── ...
└── scraped/            # 爬取的真实水印图片（可选）
    ├── pexels/
    ├── unsplash/
    └── manual/
```

## 🎯 针对你们业务的具体建议

### 1. 收集源图片（无水印）

**优先级从高到低：**

✅ **来自你们系统的真实照片**（100-200张）
- 从现有审核通过的无水印照片中导出
- 这是最有价值的数据！

✅ **手动拍摄/收集**（50-100张）
- 药店门头照片
- 医院门头照片
- 诊所外观照片
- 药店内部照片

⚠️ **网络下载补充**（50张）
- 使用 Pexels/Unsplash API
- 关键词：`pharmacy`, `drugstore`, `hospital`, `clinic`, `medical store`

### 2. 生成水印样本

```bash
# 只生成常见平台水印
python generate_watermarks.py \
  --source ../dataset/source \
  --output ../dataset/watermarked \
  --platforms gaode baidu xiaohongshu douyin

# 结果：每张源图 × 4 种平台 = 400-800 张训练样本
```

### 3. 手动收集真实水印样本（补充）

**从哪里收集：**

🗺️ **高德/百度地图**
- 搜索 "北京 药店" / "上海 医院"
- 点击街景，截图保存（带水印）
- 目标：50-100 张

📱 **小红书/抖音**
- 搜索 "药店探店" / "医院打卡"
- 保存截图（带平台水印）
- 目标：30-50 张

💡 **使用脚本快速保存链接**
```bash
# 1. 创建 URL 模板
python scrape_watermarked_images.py --source template

# 2. 编辑 urls.txt，粘贴图片链接
# 3. 批量下载
python scrape_watermarked_images.py --source urls
```

## 🔧 高级用法

### 自定义水印样式

编辑 `generate_watermarks.py` 中的配置：

```python
self.watermark_configs = {
    "custom_platform": {
        "text": "自定义水印",
        "position": "bottom-right",  # 可选: top-left, top-right, bottom-left, bottom-right, center
        "color": (255, 255, 255, 180),  # RGBA
        "font_size": 30,
        "offset": (20, 20)  # 边距
    }
}
```

### 批量处理多个文件夹

```bash
# 处理多个子文件夹
for dir in dataset/source/*/; do
    python generate_watermarks.py --source "$dir" --output ../dataset/watermarked
done
```

### 生成不同透明度的水印

```python
# 修改 generate_watermarks.py 中的 add_text_watermark 方法
# 调整 color 参数的第4个值（透明度）
"color": (255, 255, 255, 180),  # 180/255 = 70% 不透明度
```

## 📊 数据集规模建议

根据你们的需求（检测是否有水印），推荐：

| 类型 | 数量 | 来源 |
|-----|------|-----|
| **有水印** | 500-800 张 | 生成 + 真实样本 |
| **无水印** | 500-800 张 | 你们系统导出 |
| **总计** | 1000-1600 张 | - |

**分布建议：**
- 训练集：80% (800-1280 张)
- 验证集：10% (100-160 张)
- 测试集：10% (100-160 张)

## ⚠️ 注意事项

### 1. 版权问题
- ✅ 生成的模拟水印：完全合法，可用于训练
- ⚠️ 爬取的真实图片：仅用于研究学习，不可商用
- ✅ 你们系统的照片：已获授权，可放心使用

### 2. 数据质量
- ✅ 优先使用真实业务场景的照片
- ✅ 保持源图片多样性（不同角度、光线、场景）
- ⚠️ 避免过度依赖生成数据（可能与真实水印有差异）

### 3. 隐私保护
- ⚠️ 如果照片中包含个人信息，需要打码处理
- ⚠️ 不要上传包含敏感信息的医疗照片

## 🧪 测试数据集质量

```python
# 检查数据集
import os
from collections import Counter

def check_dataset(dataset_dir):
    """检查数据集统计信息"""
    files = []
    for root, dirs, filenames in os.walk(dataset_dir):
        for f in filenames:
            if f.endswith(('.jpg', '.jpeg', '.png')):
                files.append(f)
    
    # 统计水印类型
    types = [f.split('_')[-1].split('.')[0] for f in files]
    counts = Counter(types)
    
    print(f"总计: {len(files)} 张图片")
    print("\n水印类型分布:")
    for wtype, count in counts.items():
        print(f"  {wtype}: {count} 张")

check_dataset("../dataset/watermarked")
```

## 📞 常见问题

**Q: 需要多少训练数据？**  
A: 对于二分类（有/无水印），1000-1500 张是合理起点。可以先用 500 张测试，不够再补充。

**Q: 生成的水印和真实水印差距大吗？**  
A: 文字水印模拟效果好（80-90%相似度），但 Logo 水印需要真实样本。建议混合使用。

**Q: 能否直接使用 CLWD 等公开数据集？**  
A: 不推荐。CLWD 主要是通用场景（风景、人物），与你们的业务场景（门店）差异太大，会影响模型效果。

**Q: 如何获取更多真实水印样本？**  
A: 最佳方法是从你们的审核系统中导出已标注的数据。如果数量不够，可以手动在地图软件中截图补充。

## 🚀 下一步

数据集准备好后：

1. **标注数据**：为每张图片打标签（有水印/无水印）
2. **训练模型**：使用 YOLOv8/ResNet 等模型
3. **集成到系统**：替换现有的 CV 检测方法

需要帮助可以随时联系！
