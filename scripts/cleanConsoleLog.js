#!/usr/bin/env node

/**
 * 清理代码中的console.log语句
 * 保留console.error和console.warn，移除console.log和console.info
 */

const fs = require('fs');
const path = require('path');

// 需要清理的文件模式
const TARGET_FILES = [
  'src/**/*.ts',
  'src/**/*.tsx', 
  'public/validation-worker.js',
  'src/lib/**/*.ts'
];

// 需要排除的目录和文件
const EXCLUDE_PATTERNS = [
  'node_modules',
  '.git',
  'scripts/', // 排除脚本目录
  '__tests__', // 排除测试文件
  '.test.', // 排除测试文件
  '.spec.' // 排除测试文件
];

// 需要保留的console类型（错误和警告）
const KEEP_CONSOLE_TYPES = ['error', 'warn'];

// 需要移除的console类型
const REMOVE_CONSOLE_TYPES = ['log', 'info', 'debug', 'trace'];

/**
 * 检查文件是否应该被处理
 */
function shouldProcessFile(filePath) {
  // 检查是否在排除列表中
  for (const pattern of EXCLUDE_PATTERNS) {
    if (filePath.includes(pattern)) {
      return false;
    }
  }
  
  // 检查文件扩展名
  const ext = path.extname(filePath);
  return ['.ts', '.tsx', '.js', '.jsx'].includes(ext);
}

/**
 * 清理文件中的console语句
 */
function cleanConsoleInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let cleanedContent = content;
    let removedCount = 0;
    
    // 匹配console语句的正则表达式
    // 匹配 console.log(...), console.info(...) 等
    const consoleRegex = /console\.(log|info|debug|trace)\s*\([^;]*\);?/g;
    
    // 更复杂的匹配，处理多行console语句
    const multiLineConsoleRegex = /console\.(log|info|debug|trace)\s*\(\s*[\s\S]*?\);/g;
    
    // 先处理单行console语句
    cleanedContent = cleanedContent.replace(consoleRegex, (match, type) => {
      if (REMOVE_CONSOLE_TYPES.includes(type)) {
        removedCount++;
        return ''; // 移除整行
      }
      return match; // 保留
    });
    
    // 处理多行console语句
    cleanedContent = cleanedContent.replace(multiLineConsoleRegex, (match, type) => {
      if (REMOVE_CONSOLE_TYPES.includes(type)) {
        removedCount++;
        return ''; // 移除
      }
      return match; // 保留
    });
    
    // 清理空行（连续的空行合并为单个空行）
    cleanedContent = cleanedContent.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // 如果有修改，写回文件
    if (cleanedContent !== content) {
      fs.writeFileSync(filePath, cleanedContent, 'utf8');
      console.log(`✅ 清理 ${filePath}: 移除 ${removedCount} 个console语句`);
      return removedCount;
    }
    
    return 0;
  } catch (error) {
    console.error(`❌ 处理文件失败 ${filePath}:`, error.message);
    return 0;
  }
}

/**
 * 递归遍历目录
 */
function walkDirectory(dir, callback) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!EXCLUDE_PATTERNS.some(pattern => filePath.includes(pattern))) {
        walkDirectory(filePath, callback);
      }
    } else if (shouldProcessFile(filePath)) {
      callback(filePath);
    }
  }
}

/**
 * 主函数
 */
function main() {
  console.log('🧹 开始清理console.log语句...');
  console.log(`📋 保留类型: ${KEEP_CONSOLE_TYPES.join(', ')}`);
  console.log(`🗑️ 移除类型: ${REMOVE_CONSOLE_TYPES.join(', ')}`);
  console.log('');
  
  let totalFiles = 0;
  let totalRemoved = 0;
  
  // 处理src目录
  if (fs.existsSync('src')) {
    walkDirectory('src', (filePath) => {
      totalFiles++;
      totalRemoved += cleanConsoleInFile(filePath);
    });
  }
  
  // 处理public/validation-worker.js
  if (fs.existsSync('public/validation-worker.js')) {
    totalFiles++;
    totalRemoved += cleanConsoleInFile('public/validation-worker.js');
  }
  
  console.log('');
  console.log('📊 清理完成统计:');
  console.log(`📁 处理文件数: ${totalFiles}`);
  console.log(`🗑️ 移除console语句: ${totalRemoved}`);
  console.log('');
  console.log('✅ 清理完成！');
  console.log('💡 提示: console.error 和 console.warn 已保留用于错误处理');
}

// 运行清理
if (require.main === module) {
  main();
}

module.exports = { cleanConsoleInFile, shouldProcessFile };
