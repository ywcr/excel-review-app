// ==================== 自动化代码生成模块（增强版） ====================
// 版本: 3.0.0
// 特性:
// 1. 优化的API模式签名生成
// 2. 集成问卷验证功能
// 3. 支持控制台代码片段直接注入
// 4. 缺失数据自动补充功能

/**
 * 自动化代码生成器类（增强版）
 */
class AutomationCodeGeneratorEnhanced {
  constructor(config) {
    this.config = config;
    this.includeValidation = true; // 默认包含验证功能
    this.consoleSnippetMode = true; // 支持控制台代码片段模式
  }

  /**
   * 格式化日期
   */
  formatDate(date) {
    if (typeof date === "string") return date;
    const d = date instanceof Date ? date : new Date();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${month}.${day}`;
  }

  /**
   * 处理数据 - 确保数据格式正确
   */
  processData(data) {
    if (!Array.isArray(data)) {
      throw new Error("数据必须是数组");
    }

    // 确保每个数据项都有必要的字段
    return data
      .map((item, index) => {
        if (!item || typeof item !== "object") {
          console.warn(`数据项 ${index} 格式不正确:`, item);
          return null;
        }

        return {
          name: item.name || "",
          sex: item.sex || "",
          time: item.time || "",
          assignee: item.assignee || "",
          hospital: item.hospital || "",
          address: item.address || "",
          ...item, // 保留其他可能的字段
        };
      })
      .filter((item) => item !== null); // 过滤掉无效数据
  }

  /**
   * 格式化数据为字符串
   */
  formatDataString(data) {
    return JSON.stringify(data, null, 4);
  }

  /**
   * 生成控制台代码片段格式的代码
   * 用于直接在Chrome DevTools的Snippets中执行
   */
  generateConsoleSnippet(data, assignee, date, useApiMode = false) {
    const code = this.generateCode(data, assignee, date, useApiMode);

    // 为代码片段添加元数据和执行包装
    const snippetCode = `
// ==================== 问卷自动化代码片段 ====================
// 执行人: ${assignee}
// 执行日期: ${date}
// 生成时间: ${new Date().toLocaleString()}
// 使用方法: 在 https://zxyy.ltd/lgb/mobile/index.jsp 页面控制台执行

(function() {
    'use strict';
    
    // 检查页面环境
    if (!window.location.href.includes('zxyy.ltd')) {
        console.error('❌ 请在 zxyy.ltd 网站执行此代码');
        return;
    }
    
    ${code}
    
    // 自动显示执行菜单
    console.log('%c🚀 自动化代码已加载成功！', 'color: #28a745; font-weight: bold; font-size: 14px;');
    console.log('%c可用命令:', 'color: #17a2b8; font-weight: bold;');
    console.log('  • %cstart()%c - 手动执行单个任务', 'color: #6f42c1; font-weight: bold;', 'color: #666;');
    console.log('  • %cautomatic()%c - 自动执行所有任务', 'color: #6f42c1; font-weight: bold;', 'color: #666;');
    console.log('  • %cvalidateData()%c - 验证数据完整性', 'color: #6f42c1; font-weight: bold;', 'color: #666;');
    console.log('  • %cshowMissing()%c - 显示缺失的数据', 'color: #6f42c1; font-weight: bold;', 'color: #666;');
    console.log('  • %cupdateWithMissing(data)%c - 更新缺失数据', 'color: #6f42c1; font-weight: bold;', 'color: #666;');
    
    // 将主要函数暴露到全局
    window.questionnaire = {
        start: typeof startApi !== 'undefined' ? startApi : start,
        automatic: typeof automaticApi !== 'undefined' ? automaticApi : automatic,
        validateData,
        showMissing,
        updateWithMissing,
        data: data,
        config: config
    });
    
})();
        `;

    // 自动复制到剪贴板
    this.copyToClipboard(snippetCode);

    return snippetCode;
  }

  /**
   * 生成完整的自动化代码（包含验证功能）
   */
  generateCode(data, assignee, date, useApiMode = false) {
    // 验证输入参数
    if (!data || !Array.isArray(data)) {
      throw new Error(`数据参数无效: ${typeof data}, 期望数组`);
    }

    if (!assignee || typeof assignee !== "string") {
      throw new Error(`指派人参数无效: ${typeof assignee}, 期望字符串`);
    }

    if (!date || typeof date !== "string") {
      throw new Error(`日期参数无效: ${typeof date}, 期望字符串`);
    }

    const filteredData = data.filter(
      (item) => item.assignee === assignee && item.time === date
    );

    if (filteredData.length === 0) {
      const availableAssignees = [
        ...new Set(data.map((item) => item.assignee)),
      ];
      const availableDates = [...new Set(data.map((item) => item.time))];
      throw new Error(
        `没有找到匹配的数据。可用指派人: [${availableAssignees.join(
          ", "
        )}], 可用日期: [${availableDates.join(", ")}]`
      );
    }

    try {
      const codeTemplate = useApiMode
        ? this.getApiCodeTemplateWithValidation()
        : this.getDomCodeTemplateWithValidation();
      const questionLogic = this.getQuestionLogic();
      let executionLogic = useApiMode
        ? this.getApiExecutionLogic()
        : this.getExecutionLogic();

      // 在API模式下，需要先替换executionLogic中的QUESTION_LOGIC占位符
      if (useApiMode) {
        executionLogic = executionLogic.replace(
          "{{QUESTION_LOGIC}}",
          questionLogic
        );
      }

      // 添加验证功能代码
      const validationCode = this.getValidationCode();

      let result = codeTemplate
        .replace(/{{DATA}}/g, JSON.stringify(filteredData, null, 4))
        .replace(/{{DATE}}/g, date)
        .replace(/{{ASSIGNEE}}/g, assignee)
        .replace(/{{QUESTION_LOGIC}}/g, questionLogic)
        .replace(/{{EXECUTION_LOGIC}}/g, executionLogic)
        .replace(/{{VALIDATION_CODE}}/g, validationCode)
        .replace(/{{CONFIG}}/g, JSON.stringify(this.config, null, 4));

      // 自检：确保没有未替换的占位符
      const unreplacedMatches = result.match(/{{[A-Z_]+}}/g);
      if (unreplacedMatches) {
        console.warn("⚠️ 发现未替换的占位符:", unreplacedMatches);
      }

      // 自动复制到剪贴板
      this.copyToClipboard(result);

      return result;
    } catch (error) {
      console.error("❌ 代码生成过程中出错:", error);
      throw new Error(`代码生成失败: ${error.message}`);
    }
  }

  /**
   * 获取验证功能代码
   */
  getValidationCode() {
    return `
// ==================== 数据验证功能 ====================

let validationResults = null;
let missingData = [];

/**
 * 验证数据完整性
 * 检查所有数据是否已成功创建
 */
async function validateData() {
    console.log('%c🔍 开始验证数据...', 'color: #17a2b8; font-weight: bold;');
    
    const projectId = getProjectIdFromUrl();
    if (!projectId) {
        console.error('❌ 无法获取项目ID');
        return false;
    }
    
    // 获取已创建的问卷列表
    const createdList = await getCreatedQuestionnaires(projectId, date);
    const createdNames = new Set(createdList.map(item => item.name));
    
    // 检查缺失的数据
    missingData = data.filter(item => !createdNames.has(item.name));
    
    validationResults = {
        total: data.length,
        created: createdNames.size,
        missing: missingData.length,
        missingList: missingData,
        createdList: Array.from(createdNames)
    };
    
    // 输出验证结果
    console.log('%c📊 验证结果:', 'color: #28a745; font-weight: bold;');
    console.log('总数据量:', validationResults.total);
    console.log('已创建:', validationResults.created);
    console.log('缺失:', validationResults.missing);
    
    if (missingData.length > 0) {
        console.log('%c⚠️ 发现缺失数据:', 'color: #ffc107; font-weight: bold;');
        console.table(missingData.map(item => ({
            姓名: item.name,
            性别: item.sex,
            时间: item.time
        })));
        console.log('💡 提示: 执行 showMissing() 查看详细信息');
        console.log('💡 提示: 执行 updateWithMissing() 自动补充缺失数据');
    } else {
        console.log('%c✅ 所有数据已成功创建！', 'color: #28a745; font-weight: bold;');
    }
    
    return validationResults;
}

/**
 * 获取已创建的问卷列表
 */
async function getCreatedQuestionnaires(projectId, targetDate) {
    try {
        // 构建查询参数
        const params = new URLSearchParams({
            projectId: projectId,
            date: targetDate.replace(/\\./g, '-'),
            pageSize: 1000
        });
        
        const response = await fetch(\`\${API_BASE_URL}/lgb/project/submitList?\${params}\`, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'x-requested-with': 'XMLHttpRequest'
            },
            credentials: 'include'
        });
        
        const result = await response.json();
        if (result.code === 0 || result.code === 200) {
            return result.data || [];
        }
        
        return [];
    } catch (error) {
        console.error('获取已创建列表失败:', error);
        return [];
    }
}

/**
 * 显示缺失的数据
 */
function showMissing() {
    if (!validationResults) {
        console.log('请先执行 validateData() 进行验证');
        return;
    }
    
    if (missingData.length === 0) {
        console.log('%c✅ 没有缺失的数据', 'color: #28a745; font-weight: bold;');
        return;
    }
    
    console.log('%c📋 缺失数据详情:', 'color: #dc3545; font-weight: bold;');
    console.table(missingData);
    
    // 生成JSON格式输出
    const jsonOutput = JSON.stringify(missingData, null, 2);
    console.log('%cJSON格式:', 'color: #6f42c1; font-weight: bold;');
    console.log(jsonOutput);
    
    // 提供复制功能
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(jsonOutput).then(() => {
            console.log('%c✅ JSON已复制到剪贴板', 'color: #28a745;');
        });
    }
    
    return missingData;
}

/**
 * 使用缺失的数据更新当前数据集
 */
async function updateWithMissing(newData = null) {
    if (!validationResults && !newData) {
        console.log('请先执行 validateData() 进行验证，或提供新数据');
        return;
    }
    
    const dataToProcess = newData || missingData;
    
    if (dataToProcess.length === 0) {
        console.log('%c✅ 没有需要更新的数据', 'color: #28a745; font-weight: bold;');
        return;
    }
    
    console.log(\`%c🔄 开始处理 \${dataToProcess.length} 条缺失数据...\`, 'color: #17a2b8; font-weight: bold;');
    
    // 更新全局data变量
    const existingNames = new Set(data.map(item => item.name));
    const uniqueNewData = dataToProcess.filter(item => !existingNames.has(item.name));
    
    if (uniqueNewData.length > 0) {
        data.push(...uniqueNewData);
        console.log(\`✅ 已添加 \${uniqueNewData.length} 条新数据到数据集\`);
    }
    
    // 自动执行缺失的数据
    console.log('%c🚀 开始自动执行缺失数据...', 'color: #6f42c1; font-weight: bold;');
    
    let successCount = 0;
    let failCount = 0;
    
    for (const item of dataToProcess) {
        try {
            console.log(\`处理: \${item.name} (\${item.sex})\`);
            
            if (typeof createTaskApi !== 'undefined') {
                await createTaskApi(item.name, item.sex);
            } else if (typeof createTask !== 'undefined') {
                await createTask(item.name, item.sex);
            }
            
            successCount++;
            
            // 添加延迟避免请求过快
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            console.error(\`❌ 处理失败: \${item.name}\`, error);
            failCount++;
        }
    }
    
    console.log('%c📊 补充完成:', 'color: #28a745; font-weight: bold;');
    console.log('成功:', successCount);
    console.log('失败:', failCount);
    
    // 重新验证
    console.log('%c🔄 重新验证数据...');
    await validateData();
}
`;
  }

  /**
   * 获取带验证功能的API代码模板
   */
  getApiCodeTemplateWithValidation() {
    const hasChannel = this.config.hasChannel;
    return `
// ==================== API模式自动化执行代码（增强版） ====================
// 执行人: {{ASSIGNEE}}
// 日期: {{DATE}}
// 包含功能: 自动化创建 + 数据验证 + 缺失补充

const data = {{DATA}};
const config = {{CONFIG}};
const hasChannel = ${hasChannel};

console.log("数据加载完成，共", data.length, "条");

// 实施时间
let date = '{{DATE}}';
let year = (new Date()).getFullYear();

// API相关配置
const API_BASE_URL = window.location.origin;
const CORP_ID = '1749721838789101';
const PROJECT_TPL = '1756451075934101';
const SPONSOR_PROJECT_ID = '1756451241652103';

// 辅助函数：从URL获取项目ID
function getProjectIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    let projectId = urlParams.get('projectId');
    
    if (!projectId) {
        // 尝试从iframe获取
        const iframe = document.querySelector('#ssfwIframe');
        if (iframe && iframe.src) {
            const iframeUrl = new URL(iframe.src);
            projectId = iframeUrl.searchParams.get('projectId');
        }
    }
    
    // 返回找到的projectId或默认值
    return projectId || '1756460958725101';
}

const PROJECT_ID = getProjectIdFromUrl();

{{VALIDATION_CODE}}

// ==================== 签名算法实现 ====================

// 加载CryptoJS库（如果未加载）
if (typeof CryptoJS === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js';
    document.head.appendChild(script);
    console.log('正在加载CryptoJS库...');
}

// 获取动态盐值
async function createDynamicsSalt() {
    try {
        const response = await fetch(\`\${API_BASE_URL}/lgb/payMerge/createDynamicsSalt?methodName=%2Fxfzwj%2Fadd\`, {
            method: 'GET',
            headers: {
                'accept': '*/*',
                'accept-language': 'zh-CN,zh;q=0.9',
                'x-requested-with': 'XMLHttpRequest'
            },
            credentials: 'include'
        });
        
        const result = await response.json();
        if (result.code === 0) {
            console.log('✅ 动态盐值获取成功:', result.data);
            return result.data;
        } else {
            throw new Error(\`获取动态盐值失败: \${result.message}\`);
        }
    } catch (error) {
        console.error('❌ 获取动态盐值失败:', error);
        throw error;
    }
}

// 生成签名
function generateSign(data, signkey) {
    if (typeof CryptoJS !== 'undefined' && CryptoJS.HmacSHA256) {
        return CryptoJS.HmacSHA256(data, signkey).toString();
    } else {
        console.warn('CryptoJS未加载，使用备用签名方法');
        // 简单的哈希实现作为备用
        let hash = 0;
        const str = data + signkey;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    }
}

{{QUESTION_LOGIC}}

{{EXECUTION_LOGIC}}

// 启动提示
console.log('%c🎉 自动化代码加载成功！', 'color: #28a745; font-weight: bold; font-size: 16px;');
console.log('可用命令:');
${hasChannel ? "console.log('  • startAddChannel() - 创建医院');" : ""}
console.log('  • startAddContact() - 创建联系人');
console.log('  • startApi() - 手动执行单个任务');
console.log('  • automaticApi() - 自动执行所有任务');
console.log('  • validateData() - 验证数据完整性');
console.log('  • showMissing() - 显示缺失数据');
console.log('  • updateWithMissing() - 补充缺失数据');

// 控制面板
{{CONTROL_PANEL}}
`;
  }

  /**
   * 获取带验证功能的DOM代码模板
   */
  getDomCodeTemplateWithValidation() {
    const hasChannel = this.config.hasChannel;
    return `
// ==================== DOM模式自动化执行代码（增强版） ====================
// 执行人: {{ASSIGNEE}}
// 日期: {{DATE}}
// 包含功能: 自动化创建 + 数据验证 + 缺失补充

const data = {{DATA}};
const config = {{CONFIG}};
const hasChannel = ${hasChannel};

console.log("数据加载完成，共", data.length, "条");

// 实施时间
let date = '{{DATE}}';
let year = (new Date()).getFullYear();

// DOM操作相关变量
const contentWindow = document.querySelector('#ssfwIframe')?.contentWindow ?? window;

// API基础配置（用于验证功能）
const API_BASE_URL = window.location.origin;

// 辅助函数：从URL获取项目ID
function getProjectIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    let projectId = urlParams.get('projectId');
    
    if (!projectId) {
        // 尝试从iframe获取
        const iframe = document.querySelector('#ssfwIframe');
        if (iframe && iframe.src) {
            const iframeUrl = new URL(iframe.src);
            projectId = iframeUrl.searchParams.get('projectId');
        }
    }
    
    // 返回找到的projectId或默认值
    return projectId || '1756460958725101';
}

const PROJECT_ID = getProjectIdFromUrl();

{{VALIDATION_CODE}}

// 设置输入框值
function setInputValue(name, value) {
    const items = contentWindow.document.querySelectorAll('.main')[0].querySelectorAll('.layui-form-item');
    for (let item of items) {
        const label = item.querySelector('label').innerText.replace('*', '').replaceAll(' ', '');
        if (label !== name) {
            continue;
        }
        const list = item.querySelectorAll('input');
        list[list.length - 1].value = value;
        return;
    }
}

// 设置选项值
function setOptionValue(index, values) {
    const mainElements = contentWindow.document.querySelectorAll('.main');
    if (mainElements.length < 2) {
        console.error('页面结构异常：找不到足够的.main元素');
        return;
    }
    
    const items = mainElements[1].querySelectorAll('.layui-form-item');
    if (index >= items.length) {
        console.error(\`索引\${index}超出范围\`);
        return;
    }
    
    if (!Array.isArray(values)) {
        values = [values];
    }
    
    values.forEach(val => {
        const targetItem = items[index];
        const inputElement = targetItem.querySelector(\`input[value="\${val}"]\`);
        if (inputElement && inputElement.nextElementSibling) {
            inputElement.nextElementSibling.click();
            console.log(\`成功点击第\${index}个问题的选项: \${val}\`);
        } else {
            console.error(\`第\${index}个问题：未找到选项值为"\${val}"的元素\`);
        }
    });
}

// 随机生成数
function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

// 按比例随机选择答案
function randomAnswerByRate(option1, option2, rate) {
    return Math.random() < rate ? option1[random(0, option1.length - 1)] : option2[random(0, option2.length - 1)];
}

{{QUESTION_LOGIC}}

{{EXECUTION_LOGIC}}

// 启动提示
console.log('%c🎉 自动化代码加载成功！', 'color: #28a745; font-weight: bold; font-size: 16px;');
console.log('可用命令:');
${hasChannel ? "console.log('  • startAddChannel() - 创建医院');" : ""}
console.log('  • startAddContact() - 创建联系人');
console.log('  • start() - 手动执行单个任务');
console.log('  • automatic() - 自动执行或按日期执行');
console.log('  • validateData() - 验证数据完整性');
console.log('  • showMissing() - 显示缺失数据');
console.log('  • updateWithMissing() - 补充缺失数据');

// 控制面板
{{CONTROL_PANEL}}
`;
  }

  /**
   * 获取渠道创建逻辑（医院创建）
   */
  getChannelCreationLogic() {
    return `
// ==================== 医院创建逻辑 ====================

// 创建医院
function addChannel(channelName, address) {
    return new Promise((resolve) => {
        let adcode = getCode(address);
        $.ajax({
            url: "/lgb/qdkh/save",
            type: "POST",
            data: {
                recId: "",
                nvcVal: "",
                empRecId: "",
                channelName: channelName,
                channelType: "医院",
                address: address,
                adcode: adcode,
                remark: ""
            },
            traditional: true,
            success: function(res) {
                setTimeout(function() {
                    resolve();
                }, 2000);
            }
        });
    });
}

// 获取地区代码
function getCode(address) {
    const codes = {
        '北京': '110000',
        '上海': '310000',
        '广州': '440100',
        '深圳': '440300',
        '杭州': '330100',
        '成都': '510100',
        '武汉': '420100',
        '西安': '610100',
        '南京': '320100',
        '重庆': '500000'
    };
    
    for (let city in codes) {
        if (address.includes(city)) {
            return codes[city];
        }
    }
    return '110000'; // 默认北京
}

// 执行创建医院任务
async function startAddChannel() {
    const uniqueHospitals = [...new Set(data.filter(item => item.hospital).map(item => ({
        hospital: item.hospital || '医院',
        address: item.address || '北京市朝阳区'
    })))];
    
    console.log('🏥 准备创建医院，共' + uniqueHospitals.length + '个');
    
    for (let i = 0; i < uniqueHospitals.length; i++) {
        const {hospital, address} = uniqueHospitals[i];
        await addChannel(hospital, address);
        console.log('[' + (i + 1) + '/' + uniqueHospitals.length + '] 医院创建成功：' + hospital);
    }
    console.log('✅ 医院创建完毕！');
}
`;
  }

  /**
   * 获取联系人创建逻辑
   */
  getContactCreationLogic(contactType) {
    return `
// ==================== ${contactType}创建逻辑 ====================

// 查询${contactType}是否存在
function getSame(name, sex) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: "/lgb/lxrgl/getMessage",
            type: "POST",
            data: {
                recId: "",
                nvcVal: "",
                empRecId: "",
                lxrType: "${contactType}",
                name: name,
                sex: sex,
                remark: ""
            },
            traditional: true,
            success: function(res) {
                setTimeout(function() {
                    resolve(res);
                }, 500);
            }
        });
    });
}

// 创建${contactType}
function addContact(name, sex) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: "/lgb/lxrgl/save",
            type: "POST",
            data: {
                recId: "",
                nvcVal: "",
                empRecId: "",
                lxrType: "${contactType}",
                name: name,
                sex: sex,
                remark: ""
            },
            traditional: true,
            success: function(res) {
                setTimeout(function() {
                    resolve();
                }, 2000);
            }
        });
    });
}

// 执行创建${contactType}任务
async function startAddContact() {
    console.log('👥 准备创建${contactType}，共' + data.length + '个');
    
    let successCount = 0;
    let existCount = 0;
    
    for (let i = 0; i < data.length; i++) {
        let name = data[i].name;
        let sex = data[i].sex;
        
        await getSame(name, sex).then(async (res) => {
            if (res.code == 0) {
                await addContact(name, sex);
                console.log('[' + (i + 1) + '/' + data.length + '] 添加成功：' + name);
                successCount++;
            } else {
                console.log('[' + (i + 1) + '/' + data.length + '] ${contactType}已存在：' + name);
                existCount++;
            }
        });
    }
    
    console.log('✅ ${contactType}创建完毕！');
    console.log('📊 统计: 新建' + successCount + '个, 已存在' + existCount + '个');
}
`;
  }

  /**
   * 获得问题逻辑
   */
  getQuestionLogic() {
    // 根据问卷类型返回对应的问题逻辑
    switch (this.config.name) {
      case "西黄消费者问卷":
        return this.getXihuangQuestionLogic();
      case "牛解消费者问卷":
        return this.getNiujieQuestionLogic();
      case "知柏消费者问卷":
        return this.getZhibaiQuestionLogic();
      case "六味患者问卷":
        return this.getLiuweiQuestionLogic();
      case "贴膏患者问卷":
        return this.getTiegaoQuestionLogic();
      default:
        return "// 未定义的问卷类型";
    }
  }

  // 以下为各问卷类型的具体逻辑实现...
  // （这里复用原有的问卷逻辑代码）

  getXihuangQuestionLogic() {
    return `
// ==================== 西黄消费者问卷答题逻辑 ====================

// 1、您的年龄是
function _answer0() {
    const option = ['20 岁以下','21~34 岁', '35~59','60 岁以上'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 2、您选择这家药店购买西黄丸的原因
function _answer1() {
    const option = ['价格实惠', '质量好', '交通便利','药品种类齐全','服务周到'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 3、您希望同仁堂在药店经常开展哪些活动
function _answer2() {
    const option = ['免费测血压', '坐堂医生', '药品促销', '提供更完善的药学服务'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 4、在药店购买西黄丸时，药店的哪种行为对你的购药选择影响最大
function _answer3() {
    const option = ['专业知识', '服务态度', '讲解能力','店员形象'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 5、在您选购西黄丸时，营业人员给您提供服务时的耐心程度如何？
function _answer4() {
    const option = ['很耐心','一般','不耐心'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 6、您在购买西黄丸时，营业人员中医药专业知识如何？
function _answer5() {
    const option = ['很专业', '一般专业','不专业'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 7、在您购买西黄丸时，药师是否详细询问您的疾病情况？
function _answer6() {
    const option = ['每次都是', '多数', '偶尔','从不'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 8、在您购买西黄丸时，药师是否向您说明中成药的使用禁忌和注意事项？
function _answer7() {
    const option = ['每次都是','多数','偶尔','从不'];
    const index = random(0, option.length - 1);
    return option[index];
}

// 9、您是否满意药店推荐给您的西黄丸的药物效果？
function _answer8() {
    return randomAnswerByRate(['是'],['否'],0.18);
}

// 10、您选购西黄丸时一般会考虑的因素?
function _answer9() {
    const option = ['疗效','品牌知名度','价格','味道'];
    const index = random(0, option.length - 1);
    return option[index];
}
`;
  }

  getNiujieQuestionLogic() {
    // 牛解消费者问卷逻辑
    return "// 牛解消费者问卷逻辑待实现";
  }

  getZhibaiQuestionLogic() {
    // 知柏消费者问卷逻辑
    return "// 知柏消费者问卷逻辑待实现";
  }

  getLiuweiQuestionLogic() {
    // 六味患者问卷逻辑
    return "// 六味患者问卷逻辑待实现";
  }

  getTiegaoQuestionLogic() {
    // 贴膏患者问卷逻辑
    return "// 贴膏患者问卷逻辑待实现";
  }

  /**
   * 通用代码生成方法（内部使用）
   * @param {Object} options - 生成选项
   * @param {boolean} isAllDates - 是否为全部日期模式
   * @returns {string} 生成的代码
   */
  generateCodeInternal(options = {}, isAllDates = false) {
    const {
      data,
      assignee = "未指定",
      date = this.formatDate(new Date()),
      mode = this.config.mode || "dom",
      includeValidation = true,
    } = options;

    // 验证数据
    if (!data || !Array.isArray(data)) {
      throw new Error(`数据参数无效: ${typeof data}, 期望数组`);
    }

    console.log(`🔄 生成${isAllDates ? "全部日期" : "单日期"}自动化代码...`);
    console.log("- 指派人:", assignee);
    console.log("- 模式:", mode);
    console.log("- 数据条数:", data.length);

    try {
      // 准备数据
      const processedData = this.processData(data);
      const dataStr = this.formatDataString(processedData);

      // 如果是全部日期模式，提取所有日期
      let dates = [];
      let datesStr = "[]";
      if (isAllDates) {
        dates = [
          ...new Set(processedData.map((item) => item.time || date)),
        ].sort();
        datesStr = JSON.stringify(dates, null, 2);
        console.log("- 日期列表:", dates);
      }

      // 选择模板
      let template;
      if (isAllDates) {
        // 全部日期模式使用专用模板
        template =
          mode === "api"
            ? this.getAllDatesApiCodeTemplate()
            : this.getAllDatesDomCodeTemplate();
      } else {
        // 单日期模式
        if (mode === "api") {
          template = includeValidation
            ? this.getApiCodeTemplateWithValidation()
            : this.getApiCodeTemplate();
        } else {
          template = includeValidation
            ? this.getDomCodeTemplateWithValidation()
            : this.getDomCodeTemplate();
        }
      }

      // 获取问题逻辑和执行逻辑
      const questionLogic = this.getQuestionLogic();
      let executionLogic;
      if (isAllDates) {
        executionLogic =
          mode === "api"
            ? this.getAllDatesApiExecutionLogic()
            : this.getAllDatesDomExecutionLogic();
      } else {
        executionLogic =
          mode === "api"
            ? this.getApiExecutionLogic()
            : this.getExecutionLogic();
      }

      // 验证代码（全部日期模式或需要验证时添加）
      const validationCode =
        isAllDates || includeValidation ? this.getValidationCode() : "";

      // 替换模板占位符
      let result = template
        .replace(/{{DATA}}/g, dataStr)
        .replace(/{{DATE}}/g, isAllDates ? dates[0] || date : date)
        .replace(/{{ASSIGNEE}}/g, assignee)
        .replace(/{{QUESTION_LOGIC}}/g, questionLogic)
        .replace(/{{EXECUTION_LOGIC}}/g, executionLogic)
        .replace(/{{VALIDATION_CODE}}/g, validationCode)
        .replace(/{{CONFIG}}/g, JSON.stringify(this.config, null, 4))
        .replace(/{{CONTROL_PANEL}}/g, this.getControlPanelCode(isAllDates));

      // 全部日期模式的额外替换
      if (isAllDates) {
        result = result.replace(/{{DATES}}/g, datesStr);
      }

      // 自检：确保没有未替换的占位符
      const unreplacedMatches = result.match(/{{[A-Z_]+}}/g);
      if (unreplacedMatches) {
        console.warn("⚠️ 发现未替换的占位符:", unreplacedMatches);
      }

      // 自动复制到剪贴板
      this.copyToClipboard(result);

      return result;
    } catch (error) {
      console.error(
        `❌ ${isAllDates ? "全部日期" : "单日期"}代码生成失败:`,
        error
      );
      throw error;
    }
  }

  /**
   * 生成单日期自动化代码（公开接口）
   * @param {Object} options - 生成选项
   * @returns {string} 生成的代码
   */
  generateCode(options = {}, ...rest) {
    // 兼容旧签名：generateCode(data, assignee, date, useApiMode)
    if (Array.isArray(options)) {
      const data = options;
      const assignee = rest[0];
      const date = rest[1];
      const useApiMode = !!rest[2];
      const mode = useApiMode ? "api" : "dom";
      return this.generateCodeInternal(
        { data, assignee, date, mode, includeValidation: true },
        false
      );
    }
    // 新签名：generateCode({ data, assignee, date, mode, includeValidation })
    return this.generateCodeInternal(options, false);
  }

  /**
   * 生成全部日期自动化代码（公开接口）
   * @param {any} dataOrOptions - 数据或选项对象
   * @param {string} assignee - 指派人（如果dataOrOptions是数组）
   * @param {Array} dates - 日期列表（如果dataOrOptions是数组）
   * @param {boolean} useApiMode - 是否使用API模式（如果dataOrOptions是数组）
   * @returns {string} 生成的代码
   */
  generateAllDatesCode(dataOrOptions, assignee, dates, useApiMode = false) {
    // 处理两种调用方式：
    // 1. 新方式：generateAllDatesCode({ data, assignee, mode })
    // 2. 旧方式：generateAllDatesCode(data, assignee, dates, useApiMode)

    let options;

    if (Array.isArray(dataOrOptions)) {
      // 旧方式，保持向后兼容
      console.log(
        "⚠️ 使用旧的调用方式，建议使用对象参数: generateAllDatesCode({ data, assignee, mode })"
      );
      options = {
        data: dataOrOptions,
        assignee: assignee || "未指定",
        mode: useApiMode ? "api" : "dom",
      };
    } else {
      // 新方式
      options = dataOrOptions || {};

      // 如果没有数据，抛出错误
      if (!options.data) {
        throw new Error("必须提供数据参数");
      }
    }

    return this.generateCodeInternal(options, true);
  }

  /**
   * 获取全部日期的DOM代码模板
   */
  getAllDatesDomCodeTemplate() {
    return `
// ==================== DOM模式自动化执行代码（全部日期） ====================
// 执行人: {{ASSIGNEE}}
// 日期列表: {{DATES}}
// 包含功能: 自动化创建 + 数据验证 + 日期切换

const data = {{DATA}};
const config = {{CONFIG}};
const dates = {{DATES}};

console.log("数据加载完成，共", data.length, "条，涵盖", dates.length, "个日期");

// 实施时间
// 初始化为第一个日期
let date = dates[0] || '09.01';
let year = (new Date()).getFullYear();

// DOM操作相关变量
const contentWindow = document.querySelector('#ssfwIframe')?.contentWindow ?? window;

// API基础配置（用于验证功能）
const API_BASE_URL = window.location.origin;
const PROJECT_ID = getProjectIdFromUrl() || '1756460958725101';

{{VALIDATION_CODE}}

// 设置输入框值
function setInputValue(name, value) {
    const items = contentWindow.document.querySelectorAll('.main')[0].querySelectorAll('.layui-form-item');
    for (let item of items) {
        const label = item.querySelector('label').innerText.replace('*', '').replaceAll(' ', '');
        if (label !== name) {
            continue;
        }
        const list = item.querySelectorAll('input');
        list[list.length - 1].value = value;
        return;
    }
}

// 设置选项值
function setOptionValue(index, values) {
    const mainElements = contentWindow.document.querySelectorAll('.main');
    if (mainElements.length < 2) {
        console.error('页面结构异常：找不到足够的.main元素');
        return;
    }
    
    const items = mainElements[1].querySelectorAll('.layui-form-item');
    if (index >= items.length) {
        console.error(\`索引\${index}超出范围\`);
        return;
    }
    
    if (!Array.isArray(values)) {
        values = [values];
    }
    
    values.forEach(val => {
        const targetItem = items[index];
        const inputElement = targetItem.querySelector(\`input[value="\${val}"]\`);
        if (inputElement && inputElement.nextElementSibling) {
            inputElement.nextElementSibling.click();
            console.log(\`成功点击第\${index}个问题的选项: \${val}\`);
        } else {
            console.error(\`第\${index}个问题：未找到选项值为"\${val}"的元素\`);
        }
    });
}

// 随机生成数
function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

// 按比例随机选择答案
function randomAnswerByRate(option1, option2, rate) {
    return Math.random() < rate ? option1[random(0, option1.length - 1)] : option2[random(0, option2.length - 1)];
}

{{QUESTION_LOGIC}}

{{EXECUTION_LOGIC}}

// 启动提示
console.log('%c🎉 自动化代码加载成功！', 'color: #28a745; font-weight: bold; font-size: 16px;');
console.log('可用命令:');
console.log('  • start() - 手动执行单个任务');
console.log('  • automatic() - 自动执行全部任务（使用各自日期）');
console.log('  • automatic("09.01") - 仅执行指定日期');
console.log('  • executeAllDates() - 按日期顺序执行所有');
console.log('  • validateData() - 验证数据完整性');
console.log('  • showMissing() - 显示缺失数据');

// 控制面板
{{CONTROL_PANEL}}
`;
  }

  /**
   * 获取全部日期的API代码模板
   */
  getAllDatesApiCodeTemplate() {
    return this.getAllDatesDomCodeTemplate()
      .replace("DOM模式", "API模式")
      .replace("// DOM操作相关变量", "// API相关配置");
  }

  /**
   * 获取全部日期的DOM执行逻辑
   */
  getAllDatesDomExecutionLogic() {
    return `
// ==================== 全部日期DOM模式执行逻辑 ====================

// 按日期顺序执行所有任务
async function executeAllDates() {
    console.log('%c🚀 开始执行所有日期的任务', 'color: #17a2b8; font-weight: bold; font-size: 16px;');
    console.log('📅 日期列表:', dates);
    
    for (const targetDate of dates) {
        console.log('');
        console.log('='.repeat(60));
        console.log(\`📅 开始执行日期: \${targetDate}\`);
        console.log('='.repeat(60));
        
        // 执行该日期的所有任务
        await automatic(targetDate);
        
        // 日期间隔延迟
        if (dates.indexOf(targetDate) < dates.length - 1) {
            console.log('');
            console.log('等弇5秒后继续下一个日期...');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    
    console.log('');
    console.log('='.repeat(60));
    console.log('%c🎉 所有日期任务执行完成！', 'color: #28a745; font-weight: bold; font-size: 16px;');
    console.log('='.repeat(60));
    
    // 验证所有数据
    console.log('');
    console.log('🔍 开始验证所有数据...');
    await validateData();
}

${this.getExecutionLogic()}
`;
  }

  /**
   * 获取全部日期的API执行逻辑
   */
  getAllDatesApiExecutionLogic() {
    return this.getAllDatesDomExecutionLogic().replace("DOM模式", "API模式");
  }

  /**
   * 控制面板注入代码
   */
  getControlPanelCode(isAllDates = false) {
    const flag = isAllDates ? "true" : "false";
    const hasChannel = this.config.hasChannel ? "true" : "false";
    return `
// ==================== 自动化控制面板 ====================
(function(){
  try {
    if (document.getElementById('automation-control-panel')) return;

    // 样式
    var style = document.createElement('style');
    style.id = 'automation-control-panel-style';
    style.textContent = "#automation-control-panel{position:fixed;right:20px;bottom:20px;width:320px;background:#fff;border:1px solid #e1e4e8;border-radius:10px;box-shadow:0 12px 30px rgba(0,0,0,.12);font-family:system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue','Noto Sans','Liberation Sans',Arial,'Apple Color Emoji','Segoe UI Emoji';z-index:2147483647;overflow:hidden;}"+
      "#automation-control-panel .acp-header{cursor:move;background:linear-gradient(135deg,#20c997,#17a2b8);color:#fff;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;font-weight:600;}"+
      "#automation-control-panel .acp-title{display:flex;align-items:center;gap:8px;font-size:14px;}"+
      "#automation-control-panel .acp-actions{display:flex;gap:6px;}"+
      "#automation-control-panel .acp-btn{border:0;background:transparent;color:#fff;cursor:pointer;font-size:14px;opacity:.9}"+
      "#automation-control-panel .acp-btn:hover{opacity:1}"+
      "#automation-control-panel .acp-body{padding:12px;display:grid;grid-template-columns:1fr 1fr;gap:8px;}"+
      "#automation-control-panel .acp-row{grid-column:1/-1;display:flex;gap:8px;align-items:center;}"+
      "#automation-control-panel .acp-separator{grid-column:1/-1;height:1px;background:#dee2e6;margin:4px 0;}"+
      "#automation-control-panel input[type='text']{flex:1;border:1px solid #ced4da;border-radius:6px;padding:6px 8px;font-size:13px;}"+
        "#automation-control-panel button.primary{background:#28a745;color:#fff;border:none;border-radius:6px;padding:6px 8px;font-size:13px;cursor:pointer;transition:all .2s}"+
        "#automation-control-panel button.primary:hover{background:#218838;transform:translateY(-1px);box-shadow:0 2px 4px rgba(0,0,0,.1)}"+
        "#automation-control-panel button.secondary{background:#17a2b8;color:#fff;border:none;border-radius:6px;padding:6px 8px;font-size:13px;cursor:pointer;transition:all .2s}"+
        "#automation-control-panel button.secondary:hover{background:#138496;transform:translateY(-1px);box-shadow:0 2px 4px rgba(0,0,0,.1)}"+
        "#automation-control-panel button.light{background:#f1f3f5;color:#212529;border:none;border-radius:6px;padding:6px 8px;font-size:13px;cursor:pointer;transition:all .2s}"+
        "#automation-control-panel button.light:hover{background:#e2e6ea;transform:translateY(-1px);box-shadow:0 2px 4px rgba(0,0,0,.1)}"+
        "#automation-control-panel button.warn{background:#ffc107;color:#212529;border:none;border-radius:6px;padding:6px 8px;font-size:13px;cursor:pointer;transition:all .2s}"+
        "#automation-control-panel button.warn:hover{background:#e0a800;transform:translateY(-1px);box-shadow:0 2px 4px rgba(0,0,0,.1)}"+
        "#automation-control-panel button.error{background:#dc3545;color:#fff;border:none;border-radius:6px;padding:6px 8px;font-size:13px;cursor:pointer;transition:all .2s}"+
        "#automation-control-panel button.error:hover{background:#c82333;transform:translateY(-1px);box-shadow:0 2px 4px rgba(0,0,0,.1)}"+
        "#automation-control-panel button.info{background:#6f42c1;color:#fff;border:none;border-radius:6px;padding:6px 8px;font-size:13px;cursor:pointer;transition:all .2s}"+
        "#automation-control-panel button.info:hover{background:#5e35b1;transform:translateY(-1px);box-shadow:0 2px 4px rgba(0,0,0,.1)}"+
      "#automation-control-panel .muted{color:#6c757d;font-size:12px;}";
    document.head.appendChild(style);

    // 控制面板
    var panel = document.createElement('div');
    panel.id = 'automation-control-panel';

    var header = document.createElement('div');
    header.className = 'acp-header';
    var title = document.createElement('div');
    title.className = 'acp-title';
    var mode = (typeof window.startApi==='function' || typeof window.automaticApi==='function') ? 'API' : 'DOM';
    title.innerHTML = '<span>🧰 自动化控制台</span><span class="muted">(' + mode + '模式)</span>';
    var actions = document.createElement('div'); actions.className='acp-actions';
    var minBtn=document.createElement('button'); minBtn.className='acp-btn'; minBtn.title='最小化'; minBtn.textContent='—';
    var closeBtn=document.createElement('button'); closeBtn.className='acp-btn'; closeBtn.title='关闭'; closeBtn.textContent='×';
    actions.appendChild(minBtn); actions.appendChild(closeBtn);
    header.appendChild(title); header.appendChild(actions);

    var body = document.createElement('div'); body.className='acp-body';

    // 创建联系人按钮总是存在
    var btnAddContact = document.createElement('button'); btnAddContact.className='info'; btnAddContact.textContent='创建联系人'; btnAddContact.title='startAddContact()';
    ${hasChannel === "true" ? `
    // 添加创建医院按钮
    var btnAddChannel = document.createElement('button'); btnAddChannel.className='info'; btnAddChannel.textContent='创建医院'; btnAddChannel.title='startAddChannel()';
    body.appendChild(btnAddChannel);` : ''}
    body.appendChild(btnAddContact);
    
    // 分隔线
    var separator1 = document.createElement('div'); separator1.className='acp-separator';
    body.appendChild(separator1);

    // 控制按钮
    var btnStart = document.createElement('button'); btnStart.className='light'; btnStart.textContent='单步执行'; btnStart.title='start()';
    var btnAuto = document.createElement('button'); btnAuto.className='primary'; btnAuto.textContent='自动执行'; btnAuto.title='automatic()';
    var btnValidate = document.createElement('button'); btnValidate.className='secondary'; btnValidate.textContent='验证数据'; btnValidate.title='validateData()';
    var btnShowMissing = document.createElement('button'); btnShowMissing.className='light'; btnShowMissing.textContent='显示缺失'; btnShowMissing.title='showMissing()';
    var btnUpdateMissing = document.createElement('button'); btnUpdateMissing.className='warn'; btnUpdateMissing.textContent='填充缺失'; btnUpdateMissing.title='updateWithMissing()';
    var btnExecuteAll = document.createElement('button'); btnExecuteAll.className='secondary'; btnExecuteAll.textContent='全部日期'; btnExecuteAll.title='executeAllDates()';
    var btnErrorSummary = document.createElement('button'); btnErrorSummary.className='error'; btnErrorSummary.textContent='错误汇总'; btnErrorSummary.title='showErrorSummary()';

    body.appendChild(btnStart);
    body.appendChild(btnAuto);
    body.appendChild(btnValidate);
    body.appendChild(btnShowMissing);
    body.appendChild(btnUpdateMissing);
    body.appendChild(btnExecuteAll);
    body.appendChild(btnErrorSummary);

    // 日期输入行
    var row = document.createElement('div'); row.className='acp-row';
    var dateInput = document.createElement('input'); dateInput.type='text'; dateInput.placeholder='输入日期 (如 09.01)';
    var runByDateBtn = document.createElement('button'); runByDateBtn.className='secondary'; runByDateBtn.textContent='按日期执行';
    row.appendChild(dateInput); row.appendChild(runByDateBtn);
    body.appendChild(row);

    panel.appendChild(header);
    panel.appendChild(body);
    document.body.appendChild(panel);

    // 拖拽
    (function(){
      var isDown=false, sx=0, sy=0, startRight=0, startBottom=0;
      header.addEventListener('mousedown', function(e){ isDown=true; sx=e.clientX; sy=e.clientY; var rect=panel.getBoundingClientRect(); startRight = window.innerWidth - rect.right; startBottom = window.innerHeight - rect.bottom; document.body.style.userSelect='none'; });
      window.addEventListener('mouseup', function(){ isDown=false; document.body.style.userSelect=''; });
      window.addEventListener('mousemove', function(e){ if(!isDown) return; var dx=e.clientX - sx; var dy=e.clientY - sy; panel.style.right = Math.max(0, startRight - dx) + 'px'; panel.style.bottom = Math.max(0, startBottom - dy) + 'px'; });
    })();

    // 最小化 / 关闭
    var minimized=false;
    minBtn.addEventListener('click', function(){ minimized=!minimized; body.style.display=minimized?'none':'grid'; });
    closeBtn.addEventListener('click', function(){ panel.remove(); });

    // 安全调用函数
    var fns = {
      start: (window.startApi || window.start),
      automatic: (window.automaticApi || window.automatic),
      validateData: window.validateData,
      showMissing: window.showMissing,
      updateWithMissing: window.updateWithMissing,
      executeAllDates: window.executeAllDates,
      showErrorSummary: window.showErrorSummary,${hasChannel === "true" ? `
      startAddChannel: window.startAddChannel,` : ''}
      startAddContact: window.startAddContact
    };
    function call(name, arg){
      var fn = fns[name];
      if (typeof fn !== 'function'){ console.warn('函数不可用:', name); return; }
      try { (arg===undefined) ? fn() : fn(arg); } catch(err){ console.error('执行失败', name, err); }
    }

    // 事件绑定${hasChannel === "true" ? `
    // 医院创建按钮事件
    var channelBtn = body.querySelector('button[title="startAddChannel()"]');
    if (channelBtn) {
      channelBtn.addEventListener('click', function(){ call('startAddChannel'); });
    }` : ''}
    if (btnAddContact) {
      btnAddContact.addEventListener('click', function(){ call('startAddContact'); });
    }
    btnStart.addEventListener('click', function(){ call('start'); });
    btnAuto.addEventListener('click', function(){ call('automatic'); });
    runByDateBtn.addEventListener('click', function(){ var v=(dateInput.value||'').trim(); if(!v){ call('automatic'); } else { call('automatic', v); } });
    btnValidate.addEventListener('click', function(){ call('validateData'); });
    btnShowMissing.addEventListener('click', function(){ call('showMissing'); });
    btnUpdateMissing.addEventListener('click', function(){ call('updateWithMissing'); });

    // 可选按钮
    if (typeof fns.executeAllDates === 'function' && ${flag}) {
      btnExecuteAll.style.display='inline-block';
      btnExecuteAll.addEventListener('click', function(){ call('executeAllDates'); });
    } else {
      btnExecuteAll.style.display='none';
    }
    if (typeof fns.showErrorSummary === 'function') {
      btnErrorSummary.style.display='inline-block';
      btnErrorSummary.addEventListener('click', function(){ call('showErrorSummary'); });
    } else {
      btnErrorSummary.style.display='none';
    }
  } catch(e){ console.warn('初始化控制面板失败:', e); }
})();
`;
  }

  /**
   * 复制文本到剪贴板
   */
  copyToClipboard(text) {
    // 检查是否在浏览器环境中
    if (typeof navigator === 'undefined' || typeof window === 'undefined') {
      // Node.js环境，不执行复制操作
      console.log('⚠️ 当前环境不支持剪贴板操作');
      return;
    }
    
    // 方法51：使用现代 Clipboard API（推荐）
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          console.log(
            "%c✅ 代码已自动复制到剪贴板！",
            "color: #28a745; font-weight: bold; font-size: 14px;"
          );
          console.log("💡 提示: 直接在控制台粘贴 (Ctrl+V) 即可执行");

          // 显示页面提示
          this.showCopySuccessNotification();

          // 显示成功提示（如果有layer）
          if (typeof layer !== "undefined" && layer.msg) {
            layer.msg("代码已复制到剪贴板", { icon: 1, time: 2000 });
          }
        })
        .catch((err) => {
          console.warn("Clipboard API 复制失败，尝试使用备用方案:", err);
          this.fallbackCopyToClipboard(text);
        });
    } else {
      // 方法2：使用传统方式（兼容旧浏览器）
      this.fallbackCopyToClipboard(text);
    }
  }

  /**
   * 备用复制方法（兼容旧浏览器）
   */
  fallbackCopyToClipboard(text) {
    try {
      // 创建临时文本域
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.top = "-999999px";
      textarea.style.left = "-999999px";

      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      // 尝试复制
      const successful = document.execCommand("copy");
      document.body.removeChild(textarea);

      if (successful) {
        console.log(
          "%c✅ 代码已自动复制到剪贴板！",
          "color: #28a745; font-weight: bold; font-size: 14px;"
        );
        console.log("💡 提示: 直接在控制台粘贴 (Ctrl+V) 即可执行");

        // 显示页面提示
        this.showCopySuccessNotification();

        // 显示成功提示（如果有layer）
        if (typeof layer !== "undefined" && layer.msg) {
          layer.msg("代码已复制到剪贴板", { icon: 1, time: 2000 });
        }
      } else {
        console.warn("⚠️ 自动复制失败，请手动复制生成的代码");
        this.showManualCopyPrompt(text);
      }
    } catch (err) {
      console.error("❌ 复制到剪贴板失败:", err);
      this.showManualCopyPrompt(text);
    }
  }

  /**
   * 显示复制成功通知
   */
  showCopySuccessNotification() {
    // 检查是否在浏览器环境中
    if (typeof document === 'undefined') {
      return;
    }
    
    // 创建或更新通知元素
    let notification = document.getElementById("copy-success-notification");
    if (!notification) {
      notification = document.createElement("div");
      notification.id = "copy-success-notification";
      notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 25px;
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                color: white;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(40, 167, 69, 0.3);
                font-size: 16px;
                font-weight: bold;
                z-index: 999999;
                display: flex;
                align-items: center;
                gap: 10px;
                animation: slideIn 0.3s ease-out;
                transition: opacity 0.3s ease-out;
            `;

      // 添加动画样式
      const style = document.createElement("style");
      style.textContent = `
                @keyframes slideIn {
                    from {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); }
                }
            `;
      document.head.appendChild(style);
    }

    // 设置内容
    notification.innerHTML = `
            <span style="font-size: 24px;">✅</span>
            <div>
                <div>代码已自动复制到剪贴板！</div>
                <div style="font-size: 12px; opacity: 0.9; margin-top: 2px;">直接在控制台粘贴 (Ctrl+V) 即可执行</div>
            </div>
        `;

    // 添加到页面
    document.body.appendChild(notification);
    notification.style.animation =
      "slideIn 0.3s ease-out, pulse 0.5s ease-in-out 0.3s";

    // 自动隐藏
    setTimeout(() => {
      notification.style.opacity = "0";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3500);

    // 同时显示在原有的Toast系统中（如果存在）
    // if (typeof Toast !== "undefined" && Toast.success) {
    //   Toast.success("✅ 代码已自动复制到剪贴板！可以粘贴到问卷页面控制台执行");
    // }
  }

  /**
   * 显示手动复制提示
   */
  showManualCopyPrompt(text) {
    // 检查是否在浏览器环境中
    if (typeof window === 'undefined') {
      return;
    }
    
    console.log("💡 提示: 请手动选中下方代码并复制");

    // 如果有layer，显示弹窗
    if (typeof layer !== "undefined" && layer.open) {
      layer.open({
        type: 1,
        title: "请手动复制代码",
        area: ["800px", "600px"],
        content: `<div style="padding: 20px;">
                    <p>自动复制失败，请手动复制下方代码：</p>
                    <textarea style="width: 100%; height: 450px; font-family: monospace; font-size: 12px;" readonly>${text}</textarea>
                    <p style="color: #666; margin-top: 10px;">提示：全选 (Ctrl+A) 后复制 (Ctrl+C)</p>
                </div>`,
        success: function (layero) {
          layero.find("textarea").select();
        },
      });
    }
  }

  /**
   * 获取API执行逻辑
   */
  getApiExecutionLogic() {
    const hasChannel = this.config.hasChannel;
    const contactType = this.config.contactType || '消费者';
    const labelName = this.config.labelName || '姓名';
    
    return `
// ==================== API模式执行逻辑 ====================

${hasChannel ? this.getChannelCreationLogic() : ''}

${this.getContactCreationLogic(contactType)}

// 辅助函数：格式化日期
function formatDate(dateStr) {
    // 将 '9.1' 格式转换为 '09.01' 格式
    if (!dateStr) return null;
    
    const parts = dateStr.split('.');
    if (parts.length !== 2) return dateStr;
    
    const month = parts[0].padStart(2, '0');
    const day = parts[1].padStart(2, '0');
    
    return \`\${month}.\${day}\`;
}

// 生成问卷数据
function generateQuestionnaireData(name, sex, answers, taskDate = null) {
    const actualDate = taskDate || date; // 使用传入的日期或默认日期
    const questions = [
        '您的年龄是',
        '您选择这家药店购买西黄丸的原因',
        '您希望同仁堂在药店经常开展哪些活动',
        '在药店购买西黄丸时，药店的哪种行为对你的购药选择影响最大',
        '在您选购西黄丸时，营业人员给您提供服务时的耐心程度如何？',
        '您在购买西黄丸时，营业人员中医药专业知识如何？',
        '在您购买西黄丸时，药师是否详细询问您的疾病情况？',
        '在您购买西黄丸时，药师是否向您说明中成药的使用禁忌和注意事项？',
        '您是否满意药店推荐给您的西黄丸的药物效果？',
        '您选购西黄丸时一般会考虑的因素?'
    ];
    
    const options = [
        '20 岁以下;21~34 岁;35~59;60 岁以上',
        '价格实惠;质量好;交通便利;药品种类齐全;服务周到',
        '免费测血压;坐堂医生;药品促销;提供更完善的药学服务',
        '专业知识;服务态度;讲解能力;店员形象',
        '很耐心;一般;不耐心',
        '很专业;一般专业;不专业',
        '每次都是;多数;偶尔;从不',
        '每次都是;多数;偶尔;从不',
        '是;否',
        '疗效;品牌知名度;价格;味道'
    ];
    
    const types = ['单选项', '单选项', '多选项', '单选项', '单选项', 
                   '单选项', '单选项', '单选项', '单选项', '单选项'];
    
    // 构建答案参数
    let answerParams = '';
    answers.forEach((answer, index) => {
        answerParams += \`answer\${index}=\${encodeURIComponent(answer)}&\`;
    });
    
    // 构建完整数据
    const formData = {
        recId: '',
        nvcVal: '',
        latLng: '',
        projectId: PROJECT_ID,
        corpId: CORP_ID,
        projectTpl: PROJECT_TPL,
        sponsorProjectId: SPONSOR_PROJECT_ID,
        isForward: 1,
        title: config.name || '问卷调查',
        way: '实名调查',
        startTime: year + '-' + actualDate.replace(/\\./g, '-'),
        memo: '为了充分了解客户评价，促进产品在临床的安全合理使用，特进行本次问卷调查。',
        dcdxName: name,
        fieldName: '性别',
        fill: sex,
        channelAddress: '',
        questions: questions.join('#'),
        options: options.join('#'),
        types: types.join('#'),
        answers: answers.join('#')
    };
    
    // 添加各个答案字段
    answers.forEach((answer, index) => {
        formData[\`answer\${index}\`] = answer;
    });
    
    // 生成encryptedText用于签名
    formData.encryptedText = answerParams + 'answers=' + encodeURIComponent(answers.join('#'));
    
    return formData;
}

// 错误记录数组
const errorRecords = [];
let retryCount = {}; // 记录每个任务的重试次数

// 提交问卷（增强版错误处理）
async function submitQuestionnaire(name, sex, answers, taskDate = null, taskId = null) {
    const actualDate = taskDate || date; // 使用传入的日期或默认日期
    const taskKey = taskId || \`\${name}_\${sex}_\${actualDate}\`;
    
    try {
        // 1. 获取动态盐值
        const signkey = await createDynamicsSalt();
        
        // 2. 生成问卷数据（传入实际日期）
        const questionnaireData = generateQuestionnaireData(name, sex, answers, actualDate);
        
        // 3. 生成签名
        const sign = generateSign(questionnaireData.encryptedText, signkey);
        
        // 4. 提交数据
        const response = await fetch(\`\${API_BASE_URL}/lgb/xfzwj/add\`, {
            method: 'POST',
            headers: {
                'accept': '*/*',
                'accept-language': 'zh-CN,zh;q=0.9',
                'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'sign': sign,
                'signkey': signkey,
                'x-requested-with': 'XMLHttpRequest'
            },
            credentials: 'include',
            body: new URLSearchParams(questionnaireData)
        });
        
        const responseText = await response.text();
        console.log('📋 原始响应:', responseText);
        
        // 尝试解析JSON响应
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (e) {
            // 不是JSON，可能是纯文本响应
            if (responseText.trim() === '1' || responseText.includes('成功')) {
                console.log('✅ 问卷提交成功:', name);
                delete retryCount[taskKey]; // 清除重试计数
                return { success: true, data: responseText };
            } else {
                console.error('❌ 非预期的响应格式:', responseText);
                return { success: false, error: 'UNKNOWN_FORMAT', message: responseText };
            }
        }
        
        // 处理JSON响应
        // 情况1: 验签失败 - 需要重试
        if (result.code === 5000 && result.message && result.message.includes('验签失败')) {
            console.warn('⚠️ 验签失败，准备重试:', name);
            
            // 初始化重试计数
            if (!retryCount[taskKey]) {
                retryCount[taskKey] = 0;
            }
            retryCount[taskKey]++;
            
            if (retryCount[taskKey] <= 3) {
                console.log(\`🔄 第\${retryCount[taskKey]}次重试: \${name}\`);
                
                // 等待一段时间后重试
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // 递归重试
                return await submitQuestionnaire(name, sex, answers, taskDate, taskId);
            } else {
                // 超过3次重试，记录错误并跳过
                const errorRecord = {
                    name: name,
                    sex: sex,
                    time: actualDate,
                    errorType: 'SIGNATURE_ERROR',
                    errorMessage: result.message,
                    retryCount: 3,
                    timestamp: new Date().toISOString()
                };
                errorRecords.push(errorRecord);
                
                console.error('❌ 验签失败超过3次，已记录并跳过:', name);
                console.error('错误详情:', errorRecord);
                
                return { success: false, error: 'SIGNATURE_ERROR_MAX_RETRY', record: errorRecord };
            }
        }
        
        // 情况2: 重复提交 - 记录并跳过
        if ((result.errCode === '5000' || result.errCode === 5000) && 
            result.errMsg && result.errMsg.includes('同一任务下')) {
            
            const errorRecord = {
                name: name,
                sex: sex,
                time: actualDate,
                errorType: 'DUPLICATE_SUBMISSION',
                errorMessage: result.errMsg,
                timestamp: new Date().toISOString()
            };
            errorRecords.push(errorRecord);
            
            console.warn('⚠️ 重复提交，已记录并跳过:', name);
            console.warn('错误详情:', errorRecord);
            
            return { success: false, error: 'DUPLICATE', record: errorRecord };
        }
        
        // 情况3: 成功
        if (result.code === 0 || result.code === 200 || result.code === '0' || result.code === '200') {
            console.log('✅ 问卷提交成功:', name);
            delete retryCount[taskKey]; // 清除重试计数
            return { success: true, data: result };
        }
        
        // 情况4: 其他错误
        const errorRecord = {
            name: name,
            sex: sex,
            time: actualDate,
            errorType: 'OTHER_ERROR',
            errorCode: result.code || result.errCode,
            errorMessage: result.message || result.errMsg || '未知错误',
            timestamp: new Date().toISOString()
        };
        errorRecords.push(errorRecord);
        
        console.error('❌ 提交失败，其他错误:', name);
        console.error('错误详情:', errorRecord);
        
        return { success: false, error: 'OTHER', record: errorRecord };
        
    } catch (error) {
        console.error('❌ 问卷提交异常:', error);
        
        const errorRecord = {
            name: name,
            sex: sex,
            time: actualDate,
            errorType: 'NETWORK_ERROR',
            errorMessage: error.message,
            timestamp: new Date().toISOString()
        };
        errorRecords.push(errorRecord);
        
        return { success: false, error: 'NETWORK', record: errorRecord };
    }
}

// 输出错误记录汇总
function showErrorSummary() {
    if (errorRecords.length === 0) {
        console.log('%c✅ 没有错误记录，所有任务执行成功！', 'color: #28a745; font-weight: bold;');
        return;
    }
    
    console.log('%c❌ 错误记录汇总', 'color: #dc3545; font-weight: bold; font-size: 16px;');
    console.log('总错误数:', errorRecords.length);
    
    // 按错误类型分组
    const errorsByType = {};
    errorRecords.forEach(record => {
        if (!errorsByType[record.errorType]) {
            errorsByType[record.errorType] = [];
        }
        errorsByType[record.errorType].push(record);
    });
    
    // 输出每种错误类型的详情
    Object.keys(errorsByType).forEach(type => {
        const records = errorsByType[type];
        console.log(\`\n%c[\${type}] 共 \${records.length} 条\`, 'color: #ff6b6b; font-weight: bold;');
        
        if (type === 'SIGNATURE_ERROR') {
            console.log('说明: 验签失败，已尝试3次重试');
        } else if (type === 'DUPLICATE_SUBMISSION') {
            console.log('说明: 重复提交，该调查对象已存在');
        } else if (type === 'NETWORK_ERROR') {
            console.log('说明: 网络错误或请求异常');
        } else if (type === 'OTHER_ERROR') {
            console.log('说明: 其他类型错误');
        }
        
        console.table(records.map(r => ({
            姓名: r.name,
            性别: r.sex,
            时间: r.time,
            错误信息: r.errorMessage,
            时间戳: r.timestamp
        })));
    });
    
    // 输出可复制的JSON格式
    console.log('');
    console.log('%c📋 错误记录JSON（可复制）:', 'color: #17a2b8; font-weight: bold;');
    console.log(JSON.stringify(errorRecords, null, 2));
    
    // 提供重新执行失败任务的数据
    const failedData = errorRecords.map(r => ({
        name: r.name,
        sex: r.sex,
        time: r.time,
        assignee: data.find(d => d.name === r.name)?.assignee || ''
    }));
    
    console.log('');
    console.log('%c🔄 需要重新执行的任务数据:', 'color: #ffc107; font-weight: bold;');
    console.log(JSON.stringify(failedData, null, 2));
    
    // 将错误记录保存到全局变量以便后续使用
    window.errorRecords = errorRecords;
    window.failedData = failedData;
    
    console.log('');
    console.log('💡 提示: 错误记录已保存到 window.errorRecords');
    console.log('💡 提示: 失败任务数据已保存到 window.failedData');
    console.log('💡 提示: 执行 updateWithMissing(window.failedData) 可重新尝试失败的任务');
}

// 创建任务（API模式 - 增强版）
async function createTaskApi(name, sex, taskDate = null) {
    const actualDate = taskDate || date;
    console.log(\`🚀 开始创建任务: \${name} (\${sex}) - 日期: \${actualDate}\`);
    
    // 生成答案
    const answers = [
        _answer0(), _answer1(), _answer2(), _answer3(), _answer4(),
        _answer5(), _answer6(), _answer7(), _answer8(), _answer9()
    ];
    
    // 提交问卷（增强版错误处理，传入实际日期）
    const result = await submitQuestionnaire(name, sex, answers, taskDate);
    
    if (result.success) {
        console.log(\`✅ 任务创建成功: \${name}\`);
        return true;
    } else {
        // 错误已在submitQuestionnaire中处理和记录
        if (result.error === 'DUPLICATE') {
            console.log(\`⏭️ 跳过重复任务: \${name}\`);
        } else if (result.error === 'SIGNATURE_ERROR_MAX_RETRY') {
            console.log(\`⏭️ 跳过验签失败任务: \${name}\`);
        } else {
            console.log(\`❌ 任务创建失败: \${name}\`);
        }
        return false;
    }
}

// 手动执行单个任务
let currentIndex = 0;
async function startApi() {
    if (currentIndex >= data.length) {
        console.log('所有任务已完成');
        return;
    }
    
    const item = data[currentIndex];
    await createTaskApi(item.name, item.sex);
    currentIndex++;
    
    console.log(\`进度: \${currentIndex}/\${data.length}\`);
}

// 自动执行所有任务（增强版，支持日期过滤）
async function automaticApi(targetDate = null) {
    let filteredData = data;
    let dateDescription = '';
    
    // 如果指定了日期，则过滤数据
    if (targetDate) {
        // 格式化日期（支持 '9.1' -> '09.01' 格式）
        const formattedDate = formatDate(targetDate);
        filteredData = data.filter(item => item.time === formattedDate);
        dateDescription = \` - 仅执行日期: \${formattedDate}\`;
        
        if (filteredData.length === 0) {
            console.error(\`❌ 没有找到日期为 \${formattedDate} 的数据\`);
            console.log('可用的日期有:', [...new Set(data.map(d => d.time))].sort());
            return null;
        }
    } else {
        dateDescription = ' - 执行所有数据';
    }
    
    console.log('='.repeat(60));
    console.log(\`%c🚀 开始自动执行任务\${dateDescription}\`, 'color: #17a2b8; font-weight: bold; font-size: 16px;');
    console.log(\`📊 待执行任务数: \${filteredData.length} 条\`);
    console.log('='.repeat(60));
    
    // 清空错误记录
    errorRecords.length = 0;
    retryCount = {};
    
    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < filteredData.length; i++) {
        const item = filteredData[i];
        const actualDate = item.time || date; // 使用数据中的实施日期
        console.log(\`\n[\${i + 1}/\${filteredData.length}] 处理: \${item.name} - 日期: \${actualDate}\`);
        
        const success = await createTaskApi(item.name, item.sex, actualDate);
        
        if (success) {
            successCount++;
        } else {
            // 检查是否是跳过的任务
            const lastError = errorRecords[errorRecords.length - 1];
            if (lastError && (lastError.errorType === 'DUPLICATE_SUBMISSION' || 
                             lastError.errorType === 'SIGNATURE_ERROR')) {
                skipCount++;
            } else {
                failCount++;
            }
        }
        
        // 添加延迟（避免请求过快）
        if (i < filteredData.length - 1) {
            console.log('等待2秒...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    console.log('');
    console.log('='.repeat(60));
    console.log('%c🎉 自动执行完成！', 'color: #28a745; font-weight: bold; font-size: 16px;');
    console.log('='.repeat(60));
    
    // 输出执行统计
    console.log('%c📊 执行统计:', 'color: #17a2b8; font-weight: bold;');
    console.log(\`✅ 成功: \${successCount} 条\`);
    console.log(\`❌ 失败: \${failCount} 条\`);
    console.log(\`📋 总计: \${filteredData.length} 条\`);
    
    // 显示错误汇总
    if (errorRecords.length > 0) {
        console.log('');
        showErrorSummary();
    }
    
    // 提示验证
    console.log('');
    console.log('💡 执行 validateData() 验证所有数据');
    console.log('💡 执行 showErrorSummary() 查看错误汇总');
    console.log('💡 执行 showErrorSummary() 查看错误汇总');
    
    return {
        total: filteredData.length,
        success: successCount,
        skip: skipCount,
        fail: failCount,
        errors: errorRecords,
        targetDate: targetDate,
        processedData: filteredData
    };
}

// 兼容层：统一入口，支持新旧调用方式
function automatic(param1, param2) {
    // 判断参数类型
    if (typeof param1 === 'string') {
        // 新方式：automatic('09.01') - 按日期过滤
        return automaticApi(param1);
    } else if (typeof param1 === 'number' && typeof param2 === 'number') {
        // 旧方式：automatic(0, 100) - 按索引范围执行（已弃用，仅为兼容保留）
        console.warn('%c⚠️ 弃用警告: 使用旧的调用方式 automatic(startIdx, maxNum)，建议改用:', 'color: #ff6b6b; font-weight: bold;');
        console.log('  automatic()        - 执行所有数据（使用各自的实施日期）');
        console.log('  automatic("09.01") - 仅执行指定日期的数据');
        const oldData = data.slice(param1, Math.min(param1 + param2, data.length));
        return automaticApiOld(oldData, param1);
    } else if (param1 === undefined) {
        // 默认方式：automatic() - 执行所有数据
        return automaticApi();
    } else {
        console.error('❌ 参数错误！使用方式：');
        console.log('  automatic()        - 执行所有数据');
        console.log('  automatic("09.01") - 仅执行指定日期的数据');
        return null;
    }
}

// [弃用] 旧版本的automaticApi - 仅为兼容保留，建议使用automaticApi(targetDate)
async function automaticApiOld(dataToProcess, startIdx = 0) {
    console.log(\`开始自动执行任务 (旧版本模式，共 \${dataToProcess.length} 条)\`);
    
    // 清空错误记录
    errorRecords.length = 0;
    retryCount = {};
    
    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < dataToProcess.length; i++) {
        const item = dataToProcess[i];
        const actualDate = item.time || date;
        console.log(\`\n[\${i + 1}/\${dataToProcess.length}] 处理: \${item.name} - 日期: \${actualDate}\`);
        
        const success = await createTaskApi(item.name, item.sex, actualDate);
        
        if (success) {
            successCount++;
        } else {
            const lastError = errorRecords[errorRecords.length - 1];
            if (lastError && (lastError.errorType === 'DUPLICATE_SUBMISSION' || 
                             lastError.errorType === 'SIGNATURE_ERROR')) {
                skipCount++;
            } else {
                failCount++;
            }
        }
        
        if (i < dataToProcess.length - 1) {
            console.log('等待2秒...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    console.log('');
    console.log('='.repeat(60));
    console.log('%c🎉 自动执行完成！', 'color: #28a745; font-weight: bold; font-size: 16px;');
    console.log('='.repeat(60));
    
    console.log('%c📊 执行统计:', 'color: #17a2b8; font-weight: bold;');
    console.log(\`✅ 成功: \${successCount} 条\`);
    console.log(\`⏭️ 跳过: \${skipCount} 条（重复或验签失败）\`);
    console.log(\`❌ 失败: \${failCount} 条\`);
    console.log(\`📋 总计: \${dataToProcess.length} 条\`);
    
    if (errorRecords.length > 0) {
        console.log('');
        showErrorSummary();
    }
    
    return {
        total: dataToProcess.length,
        success: successCount,
        skip: skipCount,
        fail: failCount,
        errors: errorRecords
    };
}
`;
  }

  /**
   * 获取DOM执行逻辑
   */
  getExecutionLogic() {
    const hasChannel = this.config.hasChannel;
    const contactType = this.config.contactType || '消费者';
    const labelName = this.config.labelName || '姓名';
    
    return `
// ==================== DOM模式执行逻辑 ====================

${hasChannel ? this.getChannelCreationLogic() : ''}

${this.getContactCreationLogic(contactType)}

// 辅助函数：格式化日期
function formatDate(dateStr) {
    // 将 '9.1' 格式转换为 '09.01' 格式
    if (!dateStr) return null;
    
    const parts = dateStr.split('.');
    if (parts.length !== 2) return dateStr;
    
    const month = parts[0].padStart(2, '0');
    const day = parts[1].padStart(2, '0');
    
    return \`\${month}.\${day}\`;
}

// 创建任务（增强版，支持日期设置）
async function createTask(name, sex, taskDate = null) {
    const actualDate = taskDate || date;
    console.log(\`🚀 开始创建任务: \${name} (\${sex}) - 日期: \${actualDate}\`);
    
    // 设置基本信息
    setInputValue('调查对象', name);
    setInputValue('性别', sex);
    // 显式设置实施日期，使用数据中的实施日期
    setInputValue('实施日期', year + '-' + actualDate.replace(/\\./g, '-'));
    
    // 设置问卷答案
    setOptionValue(0, _answer0());
    setOptionValue(1, _answer1());
    setOptionValue(2, _answer2());
    setOptionValue(3, _answer3());
    setOptionValue(4, _answer4());
    setOptionValue(5, _answer5());
    setOptionValue(6, _answer6());
    setOptionValue(7, _answer7());
    setOptionValue(8, _answer8());
    setOptionValue(9, _answer9());
    
    // 提交表单
    const submitBtn = contentWindow.document.querySelector('.layui-btn-normal');
    if (submitBtn) {
        submitBtn.click();
        console.log(\`✅ 任务创建成功: \${name}\`);
        return true;
    } else {
        console.error('❌ 找不到提交按钮');
        return false;
    }
}

// 手动执行单个任务
let currentIndex = 0;
async function start() {
    if (currentIndex >= data.length) {
        console.log('所有任务已完成');
        return;
    }
    
    const item = data[currentIndex];
    const actualDate = item.time || date; // 使用数据中的实施日期
    await createTask(item.name, item.sex, actualDate);
    currentIndex++;
    
    console.log(\`进度: \${currentIndex}/\${data.length}\`);
}

// 自动执行所有任务（增强版，支持日期过滤）
async function automaticDom(targetDate = null) {
    let filteredData = data;
    let dateDescription = '';
    
    // 如果指定了日期，则过滤数据
    if (targetDate) {
        // 格式化日期（支持 '9.1' -> '09.01' 格式）
        const formattedDate = formatDate(targetDate);
        filteredData = data.filter(item => item.time === formattedDate);
        dateDescription = \` - 仅执行日期: \${formattedDate}\`;
        
        if (filteredData.length === 0) {
            console.error(\`❌ 没有找到日期为 \${formattedDate} 的数据\`);
            console.log('可用的日期有:', [...new Set(data.map(d => d.time))].sort());
            return null;
        }
    } else {
        dateDescription = ' - 执行所有数据';
    }
    
    console.log('='.repeat(60));
    console.log(\`%c🚀 开始自动执行任务\${dateDescription}\`, 'color: #17a2b8; font-weight: bold; font-size: 16px;');
    console.log(\`📊 待执行任务数: \${filteredData.length} 条\`);
    console.log('='.repeat(60));
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < filteredData.length; i++) {
        const item = filteredData[i];
        const actualDate = item.time || date; // 使用数据中的实施日期
        console.log('');
        console.log(\`[\${i + 1}/\${filteredData.length}] 处理: \${item.name} - 日期: \${actualDate}\`);
        
        const success = await createTask(item.name, item.sex, actualDate);
        
        if (success) {
            successCount++;
        } else {
            failCount++;
        }
        
        // 等待页面刷新（DOM模式需要更长的等待时间）
        if (i < filteredData.length - 1) {
            console.log('等待3秒，等待页面刷新...');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
    
    console.log('');
    console.log('='.repeat(60));
    console.log('%c🎉 自动执行完成！', 'color: #28a745; font-weight: bold; font-size: 16px;');
    console.log('='.repeat(60));
    
    // 输出执行统计
    console.log('%c📊 执行统计:', 'color: #17a2b8; font-weight: bold;');
    console.log(\`✅ 成功: \${successCount} 条\`);
    console.log(\`❌ 失败: \${failCount} 条\`);
    console.log(\`📋 总计: \${filteredData.length} 条\`);
    
    console.log('');
    console.log('💡 执行 validateData() 验证所有数据');
    
    return {
        total: filteredData.length,
        success: successCount,
        fail: failCount,
        targetDate: targetDate,
        processedData: filteredData
    };
}

// 兼容层：统一入口，支持新旧调用方式
function automatic(param1, param2) {
    // 判断参数类型
    if (typeof param1 === 'string') {
        // 新方式：automatic('09.01') - 按日期过滤
        return automaticDom(param1);
    } else if (typeof param1 === 'number' && typeof param2 === 'number') {
        // 旧方式：automatic(0, 100) - 按索引范围执行（已弃用，仅为兼容保留）
        console.warn('%c⚠️ 弃用警告: 使用旧的调用方式 automatic(startIdx, maxNum)，建议改用:', 'color: #ff6b6b; font-weight: bold;');
        console.log('  automatic()        - 执行所有数据（使用各自的实施日期）');
        console.log('  automatic("09.01") - 仅执行指定日期的数据');
        return automaticDomOld(param1, param2);
    } else if (param1 === undefined) {
        // 默认方式：automatic() - 执行所有数据
        return automaticDom();
    } else {
        console.error('❌ 参数错误！使用方式：');
        console.log('  automatic()        - 执行所有数据');
        console.log('  automatic("09.01") - 仅执行指定日期的数据');
        return null;
    }
}

// [弃用] 旧版本的automaticDomOld - 仅为兼容保留，建议使用automaticDom(targetDate)
async function automaticDomOld(startIdx = 0, maxNum = data.length) {
    currentIndex = startIdx;
    const endIdx = Math.min(startIdx + maxNum, data.length);
    
    console.log(\`开始自动执行任务 (旧版本模式，从索引 \${startIdx} 到 \${endIdx - 1})\`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = startIdx; i < endIdx; i++) {
        const item = data[i];
        const actualDate = item.time || date;
        console.log(\`[\${i + 1}/\${endIdx}] 处理: \${item.name} - 日期: \${actualDate}\`);
        
        const success = await createTask(item.name, item.sex, actualDate);
        
        if (success) {
            successCount++;
        } else {
            failCount++;
        }
        
        // 等待页面刷新
        if (i < endIdx - 1) {
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
    
    console.log('');
    console.log('='.repeat(60));
    console.log('%c🎉 自动执行完成！', 'color: #28a745; font-weight: bold; font-size: 16px;');
    console.log('='.repeat(60));
    
    console.log('%c📊 执行统计:', 'color: #17a2b8; font-weight: bold;');
    console.log(\`✅ 成功: \${successCount} 条\`);
    console.log(\`❌ 失败: \${failCount} 条\`);
    console.log(\`📋 总计: \${endIdx - startIdx} 条\`);
    
    console.log('');
    console.log('💡 执行 validateData() 验证结果');
    
    return {
        total: endIdx - startIdx,
        success: successCount,
        fail: failCount
    };
}
`;
  }
}

// 导出增强版生成器
if (typeof module !== "undefined" && module.exports) {
  module.exports = AutomationCodeGeneratorEnhanced;
}
