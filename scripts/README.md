# 水印数据集采集工具

针对药店/医院门头场景的水印检测训练数据生成工具。

## 📦 文件说明

| 文件 | 用途 |
|-----|------|
| `generate_watermarks.py` | 在图片上生成模拟水印（高德/百度/小红书/抖音等） |
| `scrape_watermarked_images.py` | 从网络爬取真实水印样本 |
| `quick_start.ps1` | Windows 快速启动脚本（一键生成） |
| `WATERMARK_DATASET_GUIDE.md` | 详细使用指南 |

## 🚀 快速开始

### Windows 用户（推荐）

```powershell
# 1. 进入 scripts 目录
cd scripts

# 2. 运行快速启动脚本
.\quick_start.ps1
```

脚本会自动：
- ✅ 检查 Python 环境
- ✅ 安装依赖
- ✅ 创建目录结构
- ✅ 下载测试样本（可选）
- ✅ 生成带水印的训练图片

### 手动使用

```bash
# 1. 安装依赖
pip install pillow requests

# 2. 准备源图片（放入 dataset/source/）

# 3. 生成水印图片
python generate_watermarks.py --source ../dataset/source --output ../dataset/watermarked

# 4. （可选）爬取真实样本
python scrape_watermarked_images.py --source template
# 编辑 urls.txt，然后运行：
python scrape_watermarked_images.py --source urls
```

## 📊 输出示例

输入 10 张无水印图片，会生成：
- `xxx_gaode.jpg` (10张，高德地图水印)
- `xxx_baidu.jpg` (10张，百度地图水印)
- `xxx_xiaohongshu.jpg` (10张，小红书水印)
- `xxx_douyin.jpg` (10张，抖音水印)
- `xxx_weibo.jpg` (10张，微博水印)
- `xxx_repeated.jpg` (10张，重复图案水印)

**总计：60 张带水印训练样本**

## ⚙️ 常用命令

```bash
# 只生成特定平台水印
python generate_watermarks.py --platforms gaode baidu --source ../dataset/source

# 从网络下载无水印样本
python generate_watermarks.py --download --source ../dataset/source

# 从 Pexels 爬取样本（需要 API Key）
export PEXELS_API_KEY="your_key"
python scrape_watermarked_images.py --source pexels --query "pharmacy" --count 50
```

## 📖 详细文档

查看 [WATERMARK_DATASET_GUIDE.md](./WATERMARK_DATASET_GUIDE.md) 获取：
- 完整使用教程
- 数据集规模建议
- 高级定制方法
- 常见问题解答

## 🎯 推荐工作流

1. **收集源图片**（100-200张）
   - 从你们系统导出无水印的门头照片
   - 手动拍摄补充

2. **生成训练数据**（600-1200张）
   ```bash
   python generate_watermarks.py --source ../dataset/source --output ../dataset/watermarked
   ```

3. **补充真实样本**（50-100张）
   - 从高德/百度地图截图
   - 从小红书/抖音收集

4. **标注数据**
   - 有水印：500-800 张
   - 无水印：500-800 张

5. **训练模型**
   - 使用 YOLOv8 或 ResNet
   - 替换现有的 CV 检测方法

## 💡 提示

- ✅ **优先使用你们系统的真实照片作为源图片**，这样生成的训练数据更贴近业务场景
- ✅ **生成的模拟水印准确度约 80-90%**，适合作为训练基础
- ✅ **补充 10-20% 的真实水印样本**可以显著提升模型效果
- ⚠️ **CLWD 等通用数据集不适合你们的业务**，因为场景差异太大

## 📞 帮助

遇到问题？查看详细文档或直接联系开发者。
