/**
 * 服装季节检测集成模块
 * 供 validation-worker.js 调用，检测图片中人员服装是否符合当前季节
 * 
 * 集成方式：调用Python后端API服务
 */

// 配置
const CLOTHING_API_CONFIG = {
  // API服务地址（Vercel部署使用相对路径）
  BASE_URL: '/api/clothing-detect',
  
  // 默认容差
  DEFAULT_TOLERANCE: 0.2,
  
  // 是否启用（可通过配置开关）
  ENABLED: true,
  
  // 超时时间（毫秒）
  TIMEOUT: 5000,
  
  // 重试次数
  MAX_RETRIES: 1,
  
  // 检测模式：'rule-based' 或 'ai-service'
  MODE: 'rule-based'
};

/**
 * 检查API服务是否可用
 */
async function checkClothingAPIAvailable() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(`${CLOTHING_API_CONFIG.BASE_URL}/`, {
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    if (response.ok) {
      const data = await response.json();
      return data.status === 'running';
    }
    return false;
  } catch (error) {
    console.warn('服装检测API不可用:', error.message);
    return false;
  }
}

/**
 * 获取当前季节信息
 * @param {number} month - 月份（1-12），不传则使用当前月份
 * @returns {Promise<Object>} 季节信息
 */
async function getCurrentSeason(month = null) {
  try {
    const url = month 
      ? `${CLOTHING_API_CONFIG.BASE_URL}?month=${month}`
      : `${CLOTHING_API_CONFIG.BASE_URL}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API返回错误: ${response.status}`);
    }
    
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('获取季节信息失败:', error);
    // 返回默认值（使用当前月份简单判断）
    const currentMonth = month || new Date().getMonth() + 1;
    if ([12, 1, 2].includes(currentMonth)) {
      return { season_name: '冬季', expected_clothing: 'winter' };
    } else if ([6, 7, 8].includes(currentMonth)) {
      return { season_name: '夏季', expected_clothing: 'summer' };
    } else {
      return { season_name: '春秋季', expected_clothing: 'light' };
    }
  }
}

/**
 * 检测单张图片的服装季节合规性
 * @param {Uint8Array|ArrayBuffer} imageData - 图片数据
 * @param {Object} options - 检测选项
 * @param {string} options.expectedSeason - 期望季节 ('summer'/'winter')，不传则自动判断
 * @param {number} options.month - 月份（1-12）
 * @param {number} options.tolerance - 容差（0-1）
 * @returns {Promise<Object>} 检测结果
 */
async function checkClothingSeason(imageData, options = {}) {
  if (!CLOTHING_API_CONFIG.ENABLED) {
    return {
      checked: false,
      reason: 'clothing_check_disabled'
    };
  }
  
  try {
    // 转换图片数据为Base64
    const base64Image = arrayBufferToBase64(imageData);
    
    // 构建请求
    const formData = new FormData();
    formData.append('image_base64', base64Image);
    
    if (options.expectedSeason) {
      formData.append('expected_season', options.expectedSeason);
    }
    if (options.month) {
      formData.append('month', options.month.toString());
    }
    if (options.tolerance !== undefined) {
      formData.append('tolerance', options.tolerance.toString());
    } else {
      formData.append('tolerance', CLOTHING_API_CONFIG.DEFAULT_TOLERANCE.toString());
    }
    
    // 发送请求（带超时和重试）
    const result = await fetchWithRetry(
      `${CLOTHING_API_CONFIG.BASE_URL}`,
      {
        method: 'POST',
        body: formData
      },
      CLOTHING_API_CONFIG.MAX_RETRIES
    );
    
    if (!result.success) {
      return {
        checked: false,
        error: result.error || result.message,
        reason: 'api_error'
      };
    }
    
    // 格式化返回结果
    const data = result.data;
    return {
      checked: true,
      hasPerson: data.has_person,
      personCount: data.person_count,
      seasonName: data.season_name,
      expectedSeason: data.expected_season,
      isTransitionPeriod: data.is_transition_period,
      compliantCount: data.compliant_count,
      complianceRate: data.compliance_rate,
      overallCompliant: data.overall_compliant,
      message: data.message,
      tolerance: data.tolerance,
      persons: data.persons || []
    };
    
  } catch (error) {
    console.error('服装季节检测失败:', error);
    return {
      checked: false,
      error: error.message,
      reason: 'exception'
    };
  }
}

/**
 * 批量检测图片的服装季节（用于Excel中的多张图片）
 * @param {Array<Uint8Array>} imageDataArray - 图片数据数组
 * @param {Object} options - 检测选项
 * @returns {Promise<Array>} 检测结果数组
 */
async function batchCheckClothingSeason(imageDataArray, options = {}) {
  if (!CLOTHING_API_CONFIG.ENABLED) {
    return imageDataArray.map(() => ({
      checked: false,
      reason: 'clothing_check_disabled'
    }));
  }
  
  // 并行检测（限制并发数）
  const MAX_CONCURRENT = 3;
  const results = [];
  
  for (let i = 0; i < imageDataArray.length; i += MAX_CONCURRENT) {
    const batch = imageDataArray.slice(i, i + MAX_CONCURRENT);
    const batchResults = await Promise.all(
      batch.map(imageData => checkClothingSeason(imageData, options))
    );
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * 辅助函数：ArrayBuffer转Base64
 */
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * 辅助函数：带重试的fetch
 */
async function fetchWithRetry(url, options, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), CLOTHING_API_CONFIG.TIMEOUT);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      if (i === retries) {
        throw error;
      }
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

/**
 * 生成服装检测的验证消息（用于Excel验证结果）
 * @param {Object} result - 检测结果
 * @returns {string} 验证消息
 */
function generateClothingValidationMessage(result) {
  if (!result.checked) {
    return ''; // 未检测则不显示消息
  }
  
  if (!result.hasPerson) {
    return ''; // 无人员则不显示
  }
  
  if (result.overallCompliant) {
    return `✓ 服装符合${result.seasonName}要求 (${result.compliantCount}/${result.personCount}人)`;
  } else {
    return `✗ 服装不符合${result.seasonName}要求 (仅${result.compliantCount}/${result.personCount}人符合)`;
  }
}

/**
 * 判断是否需要进行服装检测
 * @param {Object} imageInfo - 图片信息
 * @returns {boolean}
 */
function shouldCheckClothing(imageInfo) {
  // 检测条件：
  // 1. 功能已启用
  // 2. 图片尺寸合理（不是很小的图标）
  // 3. 图片格式支持
  
  if (!CLOTHING_API_CONFIG.ENABLED) {
    return false;
  }
  
  const { width, height, sizeBytes } = imageInfo;
  
  // 图片太小，可能是图标或缩略图
  if (width < 200 || height < 200) {
    return false;
  }
  
  // 图片文件太小
  if (sizeBytes < 10 * 1024) { // 小于10KB
    return false;
  }
  
  return true;
}

// ==================== 导出给 validation-worker.js 使用 ====================

// Worker环境中直接挂载到self
if (typeof self !== 'undefined') {
  self.ClothingSeasonChecker = {
    config: CLOTHING_API_CONFIG,
    checkAPIAvailable: checkClothingAPIAvailable,
    getCurrentSeason: getCurrentSeason,
    checkSingle: checkClothingSeason,
    checkBatch: batchCheckClothingSeason,
    generateMessage: generateClothingValidationMessage,
    shouldCheck: shouldCheckClothing
  };
  
  console.log('✅ 服装季节检测模块已加载');
}
