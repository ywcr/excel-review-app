# 快速测试指南 - 日期间隔验证修复

## ⚡ 快速测试步骤

### 1. 清除浏览器缓存 ⭐ **必须执行**

**方法1: 快捷键**
- Windows: `Ctrl + Shift + Delete`
- Mac: `Cmd + Shift + Delete`
- 选择"缓存的图片和文件"
- 点击"清除数据"

**方法2: 强制刷新**
- Windows: `Ctrl + F5`
- Mac: `Cmd + Shift + R`

**方法3: 开发者工具**
- 打开开发者工具 (F12)
- Network 标签
- 勾选 "Disable cache"

### 2. 打开开发者工具

- 按 `F12` 或 `Ctrl+Shift+I` (Windows)
- 按 `Cmd+Option+I` (Mac)
- 切换到 **Console** 标签

### 3. 上传测试文件

- 选择任务类型: **民营医院拜访**
- 上传文件: `卓联凯11月证据链.xlsx`
- 点击"开始验证"

### 4. 查看关键日志

在Console中查找以下关键信息：

#### ✅ 成功的标志

```
✓ 中文日期解析成功: 2025年11月1日 -> 2025-11-01
```

如果看到这个，说明日期解析成功！

#### ✅ 分组统计

```
📊 [DateInterval] 分组统计: {totalGroups: 16, ...}
```

`totalGroups` 应该 > 0

#### ✅ 检测到违规

```
❌ 发现违规！
```

应该能看到第7行的重复拜访被检测出来

---

## 🔍 问题排查

### 问题1: 仍然看到"日期解析失败"

```
⚠️ 日期解析失败
```

**原因**: 浏览器缓存未清除
**解决**: 
1. 完全关闭浏览器
2. 重新打开
3. 按 `Ctrl+F5` 强制刷新

### 问题2: totalGroups 为 0

```
📊 [DateInterval] 分组统计: {totalGroups: 0, ...}
```

**原因**: 日期解析失败或字段映射错误
**检查**: 
1. 查看是否有"中文日期解析成功"的日志
2. 检查 `dataKeys` 中是否包含正确的字段名

### 问题3: 没有看到任何日志

**原因**: Worker文件未更新
**解决**:
1. 检查 `public/validation-worker.js` 的修改时间
2. 在开发者工具 Network 标签查看 worker 文件是否重新加载
3. 查看 worker 文件的版本号（URL中的 `?v=...`）

---

## ✅ 预期结果

### 控制台日志应该显示

```
🔄 [CrossRowValidation] 开始跨行验证
  templateName: "民营医院拜访"
  totalDataRows: 28
  totalRules: 15

📋 [CrossRowValidation] 跨行验证规则
  crossRowRulesCount: 3

🔍 [DateInterval] 开始验证规则
  field: "visitStartTime"
  params: {days: 2, groupBy: "hospitalName"}

📝 [DateInterval] 处理第3行
  dateValue: "2025年11月1日"
  ✓ 中文日期解析成功: 2025年11月1日 -> 2025-11-01
  ✓ 添加到分组: 韩文斌|北京市丰台区看丹街道榆树庄村社区卫生服务站

📝 [DateInterval] 处理第7行
  dateValue: "2025年11月1日"
  ✓ 中文日期解析成功: 2025年11月1日 -> 2025-11-01
  ✓ 添加到分组: 韩文斌|北京市丰台区看丹街道榆树庄村社区卫生服务站

📊 [DateInterval] 分组统计
  totalGroups: 16

🔎 [DateInterval] 开始检查日期间隔（要求≥2天）
检查分组: 韩文斌|北京市丰台区看丹街道榆树庄村社区卫生服务站 (2次访问)
  比较: 第3行 → 第7行
    previousDate: "2025-11-01"
    currentDate: "2025-11-01"
    daysDiff: 0
    requiredDays: 2
    isViolation: true
  ❌ 发现违规！

✅ [DateInterval] 验证完成，发现1个错误
```

### 错误列表应该显示

```
第7行: 同一医院2日内不能重复拜访（与第3行冲突，实施人：韩文斌，目标：北京市丰台区看丹街道榆树庄村社区卫生服务站）
```

---

## 📞 如果还有问题

1. **截图控制台日志**发给开发者
2. **特别注意**:
   - 是否看到"中文日期解析成功"
   - `totalGroups` 的值
   - 是否有"发现违规"的日志

3. **检查文件修改时间**:
   ```bash
   ls -la public/validation-worker.js
   ```
   应该是最新的修改时间

---

## 🎉 测试成功标志

- ✅ 看到"中文日期解析成功"
- ✅ `totalGroups > 0`
- ✅ 看到"❌ 发现违规！"
- ✅ 错误列表中显示第7行的错误
- ✅ 错误信息包含"与第3行冲突"

如果以上都满足，说明修复成功！🎊
