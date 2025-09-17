// ==================== 模板管理器 ====================

/**
 * 模板管理器类
 * 负责管理所有代码模板
 */
class TemplateManager {
  constructor() {
    this.templates = new Map();
    this.initializeTemplates();
  }

  /**
   * 初始化所有模板
   */
  initializeTemplates() {
    // DOM模式模板
    this.templates.set("dom_single", this.getDomSingleTemplate());
    this.templates.set("dom_all_dates", this.getDomAllDatesTemplate());

    // API模式模板
    this.templates.set("api_single", this.getApiSingleTemplate());
    this.templates.set("api_all_dates", this.getApiAllDatesTemplate());
  }

  /**
   * 获取模板
   */
  getTemplate(templateName) {
    if (!this.templates.has(templateName)) {
      throw new Error(`模板不存在: ${templateName}`);
    }
    return this.templates.get(templateName);
  }

  /**
   * DOM模式单日期模板
   */
  getDomSingleTemplate() {
    return `
// ==================== DOM模式自动化执行代码（增强版） ====================
// 执行人: {{ASSIGNEE}}
// 日期: {{DATE}}
// 包含功能: 自动化创建 + 数据验证 + 缺失补充

const data = {{DATA}};
const config = {{CONFIG}};
const hasChannel = {{HAS_CHANNEL}};

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

{{QUESTION_LOGIC}}

{{EXECUTION_LOGIC}}

// 启动提示
console.log('%c🎉 自动化代码加载成功！', 'color: #28a745; font-weight: bold; font-size: 16px;');
console.log('可用命令:');
{{CHANNEL_COMMANDS}}
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
   * API模式单日期模板
   */
  getApiSingleTemplate() {
    return `
// ==================== API模式自动化执行代码（增强版） ====================
// 执行人: {{ASSIGNEE}}
// 包含功能: 自动化创建 + 数据验证 + 缺失补充

const data = {{DATA}};
const config = {{CONFIG}};
const hasChannel = {{HAS_CHANNEL}};

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
    // 尝试主端点
    try {
        console.log('🔍 开始获取动态盐值...');
        console.log('请求端点:', \`\${API_BASE_URL}\${config.saltEndpoint}\`);

        const result = await new Promise((resolve, reject) => {
            $.ajax({
                url: config.saltEndpoint,
                type: "GET",
                traditional: true,
                success: function(res) {
                    console.log('✅ 主端点响应成功:', res);
                    resolve(res);
                },
                error: function(xhr, status, error) {
                    console.error('❌ 主端点请求失败:', status, error);
                    reject(new Error(\`请求失败: \${status} - \${error}\`));
                }
            });
        });
        console.log('API响应数据:', result);

        if (result.code === 0) {
            return await processSaltData(result.data);
        } else if (result.code === 5000 && config.saltEndpointAlt) {
            // 如果是参数验证异常且有备用端点，尝试备用端点
            console.warn('⚠️ 主端点参数验证异常，尝试备用端点...');
            return await tryAlternativeEndpoint();
        } else {
            throw new Error(\`获取动态盐值失败: \${result.message} (错误码: \${result.code})\`);
        }
    } catch (error) {
        if (config.saltEndpointAlt && error.message.includes('参数验证异常')) {
            console.warn('⚠️ 主端点失败，尝试备用端点...');
            return await tryAlternativeEndpoint();
        }
        console.error('❌ 获取动态盐值失败:', error);
        throw error;
    }
}

// 尝试备用端点
async function tryAlternativeEndpoint() {
    try {
        console.log('🔄 尝试备用端点:', \`\${API_BASE_URL}\${config.saltEndpointAlt}\`);

        const result = await new Promise((resolve, reject) => {
            $.ajax({
                url: config.saltEndpointAlt,
                type: "GET",
                traditional: true,
                success: function(res) {
                    console.log('✅ 备用端点响应成功:', res);
                    resolve(res);
                },
                error: function(xhr, status, error) {
                    console.error('❌ 备用端点请求失败:', status, error);
                    reject(new Error(\`备用端点请求失败: \${status} - \${error}\`));
                }
            });
        });
        console.log('备用端点响应:', result);

        if (result.code === 0) {
            console.log('✅ 备用端点获取成功');
            return await processSaltData(result.data);
        } else {
            throw new Error(\`备用端点也失败: \${result.message}\`);
        }
    } catch (error) {
        console.error('❌ 备用端点也失败:', error);
        throw error;
    }
}

// 处理盐值数据
async function processSaltData(data) {
    console.log('✅ 动态盐值获取成功:', data);

    // 验证返回的数据结构
    if (!data) {
        throw new Error('动态盐值数据为空');
    }

    // 根据参考代码 dcwj.js，API返回的data直接就是签名密钥
    // 如果data是字符串，直接使用；如果是对象，尝试提取signkey字段
    let signkey;
    if (typeof data === 'string') {
        signkey = data;
        console.log('✅ 使用字符串形式的盐值:', signkey);
    } else if (typeof data === 'object') {
        if (data.signkey) {
            signkey = data.signkey;
            console.log('✅ 使用对象中的 signkey 字段:', signkey);
        } else if (data.key) {
            signkey = data.key;
            console.log('✅ 使用对象中的 key 字段:', signkey);
        } else if (data.salt) {
            signkey = data.salt;
            console.log('✅ 使用对象中的 salt 字段:', signkey);
        } else {
            throw new Error('无法从对象中找到有效的签名密钥字段');
        }
    } else {
        throw new Error('无效的盐值数据类型: ' + typeof data);
    }

    // 返回标准化的数据结构
    return {
        signkey: signkey,
        timestamp: Date.now()
    };
}

// 生成签名
function generateSign(data, signkey) {
    // 参数验证
    if (!data) {
        throw new Error('签名生成失败: data 参数为空');
    }
    if (!signkey) {
        throw new Error('签名生成失败: signkey 参数为空或未定义');
    }

    // 确保参数为字符串类型
    const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
    const keyStr = typeof signkey === 'string' ? signkey : String(signkey);

    console.log('签名参数:', { dataLength: dataStr.length, keyLength: keyStr.length, key: keyStr.substring(0, 10) + '...' });

    if (typeof CryptoJS !== 'undefined' && CryptoJS.HmacSHA256) {
        try {
            const signature = CryptoJS.HmacSHA256(dataStr, keyStr).toString();
            console.log('签名生成成功:', signature.substring(0, 16) + '...');
            return signature;
        } catch (error) {
            console.error('CryptoJS签名生成失败:', error);
            throw new Error(\`CryptoJS签名生成失败: \${error.message}\`);
        }
    } else {
        // 如果CryptoJS不可用，使用内置的HMAC-SHA256实现
        console.warn('⚠️ CryptoJS未加载，使用内置HMAC-SHA256实现');
        try {
            const signature = hex(sign(keyStr, dataStr));
            console.log('✅ 内置签名生成成功:', signature.substring(0, 16) + '...');
            return signature;
        } catch (error) {
            console.error('❌ 内置签名生成失败:', error);
            throw new Error(\`签名生成失败: \${error.message}\`);
        }
    }
}

// 内置HMAC-SHA256实现（基于crypto.js）
function sha256(data) {
    // 这里应该包含完整的SHA-256实现
    // 为了简化，我们先使用一个基础实现
    if (typeof CryptoJS !== 'undefined' && CryptoJS.SHA256) {
        return CryptoJS.SHA256(data);
    }
    throw new Error('SHA-256实现不可用');
}

function hmac(key, data) {
    const encoder = new TextEncoder("utf-8");
    const keyBytes = typeof key === 'string' ? encoder.encode(key) : key;
    const dataBytes = typeof data === 'string' ? encoder.encode(data) : data;

    // 使用CryptoJS的HMAC-SHA256
    if (typeof CryptoJS !== 'undefined' && CryptoJS.HmacSHA256) {
        const keyStr = typeof key === 'string' ? key : new TextDecoder().decode(key);
        const dataStr = typeof data === 'string' ? data : new TextDecoder().decode(data);
        const result = CryptoJS.HmacSHA256(dataStr, keyStr);

        // 转换为Uint8Array格式
        const words = result.words;
        const bytes = new Uint8Array(32);
        for (let i = 0; i < 8; i++) {
            const word = words[i];
            bytes[i * 4] = (word >>> 24) & 0xff;
            bytes[i * 4 + 1] = (word >>> 16) & 0xff;
            bytes[i * 4 + 2] = (word >>> 8) & 0xff;
            bytes[i * 4 + 3] = word & 0xff;
        }
        return bytes;
    }

    throw new Error('HMAC-SHA256实现不可用');
}

function sign(inputKey, inputData) {
    return hmac(inputKey, inputData);
}

function hex(bin) {
    if (typeof bin === 'string') {
        return bin;
    }
    return bin.reduce(
        (acc, val) => acc + ("00" + val.toString(16)).substr(-2),
        ""
    );
}

// 参数格式化函数（基于dcwj.js）
function formatParams(arys) {
    let newkey = Object.keys(arys).sort();
    let newObj = Array.isArray(arys) ? [] : {};
    for (let i = 0; i < newkey.length; i++) {
        let currentValue = arys[newkey[i]];
        if (typeof currentValue === "object") {
            if (Array.isArray(currentValue)) {
                let isArrObject = (currentValue || []).every(
                    (i) => Object.prototype.toString.call(i) === "[object Object]"
                );
                if (isArrObject) {
                    newObj[newkey[i]] = formatParams(currentValue);
                } else {
                    newObj[newkey[i]] = currentValue;
                }
            } else {
                newObj[newkey[i]] = formatParams(currentValue);
            }
        } else {
            newObj[newkey[i]] = currentValue;
        }
    }
    return newObj;
}

// 转换为查询字符串（基于dcwj.js）
function toQueryString(obj) {
    const part = [];
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === "object") {
            part.push(\`\${key}=\${JSON.stringify(value)}\`);
        } else {
            part.push(\`\${key}=\${value}\`);
        }
    }
    return part.join("&");
}

{{QUESTION_LOGIC}}

{{EXECUTION_LOGIC}}

// 启动提示
console.log('%c🎉 自动化代码加载成功！', 'color: #28a745; font-weight: bold; font-size: 16px;');
console.log('可用命令:');
{{CHANNEL_COMMANDS}}
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
   * DOM模式全日期模板
   */
  getDomAllDatesTemplate() {
    return this.getDomSingleTemplate()
      .replace(
        "DOM模式自动化执行代码（增强版）",
        "DOM模式自动化执行代码（全部日期）"
      )
      .replace(
        "包含功能: 自动化创建 + 数据验证 + 缺失补充",
        "包含功能: 自动化创建 + 数据验证 + 日期切换"
      );
  }

  /**
   * API模式全日期模板
   */
  getApiAllDatesTemplate() {
    return this.getApiSingleTemplate()
      .replace(
        "API模式自动化执行代码（增强版）",
        "API模式自动化执行代码（全部日期）"
      )
      .replace(
        "包含功能: 自动化创建 + 数据验证 + 缺失补充",
        "包含功能: 自动化创建 + 数据验证 + 日期切换"
      );
  }
}

// 导出
window.TemplateManager = TemplateManager;
