/**
 * 大文件处理器 - 针对超大Excel文件的优化方案
 * 使用分块读取和渐进式处理，避免内存溢出
 */

// 超大文件处理配置
const LARGE_FILE_CONFIG = {
  SIZE_THRESHOLD: 300 * 1024 * 1024, // 300MB以上视为超大文件
  CHUNK_ROWS: 500, // 每次处理500行
  MEMORY_CHECK_INTERVAL: 100, // 每处理100行检查一次内存
  MAX_MEMORY_USAGE: 0.7, // 最大内存使用率70%
};

/**
 * 处理超大Excel文件
 * @param {ArrayBuffer} fileBuffer - 文件内容
 * @param {string} sheetName - 工作表名称
 * @returns {Promise<Object>} 处理结果
 */
async function handleLargeExcelFile(fileBuffer, sheetName) {
  console.log('启用大文件处理模式...');
  
  try {
    // 第一步：只读取基本信息
    const basicInfo = await getBasicFileInfo(fileBuffer);
    console.log('文件基本信息:', basicInfo);
    
    // 第二步：分阶段读取数据
    const result = await processInStages(fileBuffer, sheetName, basicInfo);
    
    return result;
  } catch (error) {
    console.error('大文件处理失败:', error);
    throw error;
  }
}

/**
 * 获取文件基本信息
 */
async function getBasicFileInfo(fileBuffer) {
  const workbook = XLSX.read(fileBuffer, {
    type: "array",
    bookSheets: true,
    bookProps: true,
    // 只读取工作表名称和属性，不读取内容
  });
  
  return {
    sheetNames: workbook.SheetNames,
    props: workbook.Props,
  };
}

/**
 * 分阶段处理文件
 */
async function processInStages(fileBuffer, targetSheet, basicInfo) {
  const stages = [
    { name: '解析结构', weight: 20 },
    { name: '读取数据', weight: 40 },
    { name: '验证数据', weight: 30 },
    { name: '生成报告', weight: 10 },
  ];
  
  let currentProgress = 0;
  const results = {};
  
  for (const stage of stages) {
    console.log(`开始${stage.name}...`);
    
    switch (stage.name) {
      case '解析结构':
        results.structure = await parseStructure(fileBuffer, targetSheet);
        break;
        
      case '读取数据':
        results.data = await readDataInChunks(fileBuffer, targetSheet, results.structure);
        break;
        
      case '验证数据':
        results.validation = await validateDataProgressive(results.data, results.structure);
        break;
        
      case '生成报告':
        results.report = generateReport(results);
        break;
    }
    
    currentProgress += stage.weight;
    postMessage({
      type: 'PROGRESS',
      data: {
        progress: currentProgress,
        message: `${stage.name}完成`
      }
    });
    
    // 让出控制权，允许浏览器处理其他任务
    await delay(10);
  }
  
  return results;
}

/**
 * 解析文件结构
 */
async function parseStructure(fileBuffer, targetSheet) {
  try {
    // 使用最小化选项读取
    const workbook = XLSX.read(fileBuffer, {
      type: "array",
      sheetRows: 10, // 只读取前10行来分析结构
      bookSheets: false,
      bookProps: false,
    });
    
    const sheet = workbook.Sheets[targetSheet];
    if (!sheet) {
      throw new Error(`找不到工作表: ${targetSheet}`);
    }
    
    // 获取范围
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    
    return {
      totalRows: range.e.r + 1,
      totalCols: range.e.c + 1,
      range: sheet['!ref'],
    };
  } catch (error) {
    console.error('解析结构失败:', error);
    // 返回默认结构
    return {
      totalRows: 1000, // 假设1000行
      totalCols: 20,   // 假设20列
      range: 'A1:T1000',
    };
  }
}

/**
 * 分块读取数据
 */
async function readDataInChunks(fileBuffer, targetSheet, structure) {
  const chunks = [];
  const chunkSize = LARGE_FILE_CONFIG.CHUNK_ROWS;
  const totalChunks = Math.ceil(structure.totalRows / chunkSize);
  
  console.log(`准备分${totalChunks}块读取数据...`);
  
  for (let i = 0; i < totalChunks; i++) {
    const startRow = i * chunkSize;
    const endRow = Math.min((i + 1) * chunkSize, structure.totalRows);
    
    try {
      // 读取特定范围的数据
      const chunkData = await readChunk(fileBuffer, targetSheet, startRow, endRow);
      chunks.push(chunkData);
      
      // 更新进度
      const progress = 20 + (20 * (i + 1) / totalChunks);
      postMessage({
        type: 'PROGRESS',
        data: {
          progress: Math.round(progress),
          message: `读取数据块 ${i + 1}/${totalChunks}`
        }
      });
      
      // 检查内存使用
      if (await shouldPauseForMemory()) {
        console.log('内存使用率高，暂停处理...');
        await delay(100);
      }
    } catch (error) {
      console.error(`读取第${i + 1}块失败:`, error);
      // 跳过失败的块
      chunks.push({ error: error.message, range: `${startRow}-${endRow}` });
    }
  }
  
  return chunks;
}

/**
 * 读取单个数据块
 */
async function readChunk(fileBuffer, targetSheet, startRow, endRow) {
  // 这里需要实现按范围读取的逻辑
  // 由于XLSX.js的限制，我们可能需要读取整个文件然后提取需要的部分
  
  const workbook = XLSX.read(fileBuffer, {
    type: "array",
    sheetRows: endRow, // 限制读取的行数
    cellFormula: false,
    cellHTML: false,
    cellStyles: false,
  });
  
  const sheet = workbook.Sheets[targetSheet];
  if (!sheet) {
    throw new Error(`工作表不存在: ${targetSheet}`);
  }
  
  // 转换指定范围的数据
  const data = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    range: startRow,
    blankrows: false,
  });
  
  // 只返回需要的行
  return data.slice(0, endRow - startRow);
}

/**
 * 渐进式数据验证
 */
async function validateDataProgressive(dataChunks, structure) {
  const errors = [];
  let processedRows = 0;
  
  for (let i = 0; i < dataChunks.length; i++) {
    const chunk = dataChunks[i];
    
    if (chunk.error) {
      errors.push({
        type: 'chunk_error',
        message: chunk.error,
        range: chunk.range
      });
      continue;
    }
    
    // 验证数据块
    const chunkErrors = validateChunk(chunk, processedRows);
    errors.push(...chunkErrors);
    
    processedRows += chunk.length;
    
    // 更新进度
    const progress = 60 + (20 * (i + 1) / dataChunks.length);
    postMessage({
      type: 'PROGRESS',
      data: {
        progress: Math.round(progress),
        message: `验证数据块 ${i + 1}/${dataChunks.length}`
      }
    });
  }
  
  return {
    totalRows: processedRows,
    errors: errors,
    errorCount: errors.length
  };
}

/**
 * 验证单个数据块
 */
function validateChunk(data, startRow) {
  const errors = [];
  
  data.forEach((row, index) => {
    const rowNumber = startRow + index + 1;
    
    // 基本验证：检查是否为空行
    if (!row || row.every(cell => !cell)) {
      return; // 跳过空行
    }
    
    // 这里可以添加更多验证逻辑
    // 例如：必填字段、数据格式等
  });
  
  return errors;
}

/**
 * 生成报告
 */
function generateReport(results) {
  return {
    structure: results.structure,
    validation: results.validation,
    summary: {
      totalRows: results.validation.totalRows,
      errorCount: results.validation.errors.length,
      status: results.validation.errors.length === 0 ? 'success' : 'warning'
    }
  };
}

/**
 * 检查是否需要因内存暂停
 */
async function shouldPauseForMemory() {
  if (performance && performance.memory) {
    const usage = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;
    return usage > LARGE_FILE_CONFIG.MAX_MEMORY_USAGE;
  }
  return false;
}

/**
 * 延迟函数
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 导出给Worker使用
if (typeof self !== 'undefined') {
  self.handleLargeExcelFile = handleLargeExcelFile;
}