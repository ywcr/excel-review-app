#!/usr/bin/env node

/**
 * 紧急修复：让validateExcel函数调用validateExcelStreaming
 */

const fs = require('fs');
const path = require('path');

console.log('🚨 应用紧急修复...\n');

const workerFile = path.join(__dirname, '../public/validation-worker.js');
let content = fs.readFileSync(workerFile, 'utf8');

// 查找validateExcel函数
const validateExcelStart = content.indexOf('async function validateExcel(data) {');
if (validateExcelStart === -1) {
  console.error('❌ 找不到validateExcel函数');
  process.exit(1);
}

// 找到函数的结束位置（下一个async function或文件结尾）
let validateExcelEnd = content.indexOf('async function', validateExcelStart + 50);
if (validateExcelEnd === -1) {
  validateExcelEnd = content.length;
}

// 替换validateExcel函数
const newValidateExcel = `async function validateExcel(data) {
  const { fileBuffer, taskName, selectedSheet, template, includeImages } = data;
  
  console.log('validateExcel调用，参数:', {
    taskName,
    selectedSheet,
    templateProvided: !!template,
    includeImages,
    fileSizeMB: (fileBuffer.byteLength / 1024 / 1024).toFixed(2)
  });
  
  // 接收从主线程传递的完整模板
  if (template) {
    templateFromMainThread = template;
  }
  
  try {
    // 直接调用validateExcelStreaming
    const result = await validateExcelStreaming(fileBuffer, taskName, selectedSheet);
    
    // 如果需要包含图片验证
    if (includeImages && result) {
      try {
        sendProgress("🚀 前端解析：正在验证图片...", 85);
        const imageValidationResult = await validateImagesInternal(fileBuffer, selectedSheet);
        result.imageValidation = imageValidationResult;
      } catch (imageError) {
        console.warn('图片验证失败:', imageError);
        result.imageValidation = {
          totalImages: 0,
          blurryImages: 0,
          duplicateGroups: 0,
          results: [],
          warning: '图片验证失败: ' + imageError.message
        };
      }
    }
    
    sendResult(result);
  } catch (error) {
    console.error('validateExcel错误:', error);
    sendError(error.message);
  }
}`;

// 替换函数
content = content.substring(0, validateExcelStart) + 
          newValidateExcel + 
          '\n\n' +
          content.substring(validateExcelEnd);

// 写回文件
fs.writeFileSync(workerFile, content, 'utf8');

console.log('✅ 紧急修复已应用！');
console.log('\n后续步骤：');
console.log('1. 刷新浏览器（Ctrl+Shift+R 或 Cmd+Shift+R）');
console.log('2. 重新上传秦凯拜访.xlsx文件');
console.log('3. 打开浏览器控制台查看详细日志');