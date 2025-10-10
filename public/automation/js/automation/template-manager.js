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

// 辅助函数：从URL获取项目ID（参考 wenjuanyanzheng.js）
function getProjectIdFromUrl() {
    // 方法1: 从当前页面URL获取
    const urlParams = new URLSearchParams(window.location.search);
    let projectId = urlParams.get('projectId');
    
    if (projectId) {
        return projectId;
    }
    
    // 方法2: 从iframe获取
    const iframe = document.querySelector('#ssfwIframe');
    if (iframe) {
        try {
            // 尝试从 iframe 的 contentWindow.location 获取
            const iframeSrc = iframe.contentWindow.location.href;
            const iframeParams = new URLSearchParams(iframeSrc.split('?')[1]);
            projectId = iframeParams.get('projectId');
            
            if (projectId) {
                return projectId;
            }
        } catch (error) {
            // 跨域限制，尝试从 iframe.src 获取
            try {
                if (iframe.src) {
                    const iframeUrl = new URL(iframe.src);
                    projectId = iframeUrl.searchParams.get('projectId');
                    
                    if (projectId) {
                        return projectId;
                    }
                }
            } catch (e) {
                // 忽略错误，使用默认值
            }
        }
    }
    
    // 返回默认值
    return '1756460958725101';
}

const PROJECT_ID = getProjectIdFromUrl();

{{VALIDATION_CODE}}

// ==================== 问卷内容抓取与对比 ====================

// 从网站页面抓取问卷选项
function extractQuestionOptionsFromPage() {
    try {
        console.log('🔍 开始从页面抓取问卷选项...');
        
        // 方法1: 尝试从DOM结构抓取（当在问卷填写页面时）
        const mainElements = contentWindow.document.querySelectorAll('.main');
        if (mainElements.length >= 2) {
            const questionItems = mainElements[1].querySelectorAll('.layui-form-item');
            const extractedQuestions = [];
            
            questionItems.forEach((item, index) => {
                try {
                    // 获取问题标题
                    const labelElement = item.querySelector('label');
                    const questionTitle = labelElement ? labelElement.innerText.trim() : '';
                    
                    // 获取所有选项
                    const options = [];
                    const inputElements = item.querySelectorAll('input[type="radio"], input[type="checkbox"]');
                    
                    inputElements.forEach(input => {
                        const value = input.value;
                        if (value && value.trim()) {
                            options.push(value.trim());
                        }
                    });
                    
                    if (questionTitle && options.length > 0) {
                        extractedQuestions.push({
                            index: index,
                            title: questionTitle,
                            options: options
                        });
                        console.log(\`  问题 \${index}: \${questionTitle}\`);
                        console.log(\`    选项: [\${options.join(', ')}]\`);
                    }
                } catch (error) {
                    console.warn(\`⚠️ 解析问题 \${index} 时出错:\`, error);
                }
            });
            
            if (extractedQuestions.length > 0) {
                console.log(\`✅ 从DOM结构成功抓取 \${extractedQuestions.length} 个问题\`);
                return extractedQuestions;
            }
        }
        
        // 方法2: 尝试从隐藏字段抓取（备用方案）
        console.log('🔄 尝试从隐藏字段抓取问卷定义...');
        const questionsInput = contentWindow.document.querySelector('input[name="questions"]');
        const optionsInput = contentWindow.document.querySelector('input[name="options"]');
        
        if (questionsInput && optionsInput) {
            const questionsValue = questionsInput.value;
            const optionsValue = optionsInput.value;
            
            if (questionsValue && optionsValue) {
                // 解析问题和选项（格式：问题用#分隔，选项用#分隔，每个问题的选项用|或;分隔）
                const questions = questionsValue.split('#');
                const optionsGroups = optionsValue.split('#');
                
                const extractedQuestions = [];
                questions.forEach((question, index) => {
                    if (question && optionsGroups[index]) {
                        // 尝试用|分隔，如果没有|则用;分隔
                        let options = [];
                        if (optionsGroups[index].includes('|')) {
                            options = optionsGroups[index].split('|').filter(opt => opt.trim());
                        } else if (optionsGroups[index].includes(';')) {
                            options = optionsGroups[index].split(';').filter(opt => opt.trim());
                        } else {
                            // 如果都没有，可能是单个选项
                            options = [optionsGroups[index]].filter(opt => opt.trim());
                        }
                        
                        if (options.length > 0) {
                            extractedQuestions.push({
                                index: index,
                                title: question.trim(),
                                options: options.map(opt => opt.trim())
                            });
                            console.log(\`  问题 \${index}: \${question.trim()}\`);
                            console.log(\`    选项: [\${options.join(', ')}]\`);
                        }
                    }
                });
                
                if (extractedQuestions.length > 0) {
                    console.log(\`✅ 从隐藏字段成功抓取 \${extractedQuestions.length} 个问题\`);
                    return extractedQuestions;
                }
            }
        }
        
        console.warn('⚠️ 未能从页面抓取到问卷内容');
        console.log(\`✅ 成功抓取 0 个问题\`);
        return null;
    } catch (error) {
        console.error('❌ 抓取问卷选项失败:', error);
        return null;
    }
}

// 对比并更新问卷答案函数
function compareAndUpdateQuestions(extractedQuestions) {
    if (!extractedQuestions || extractedQuestions.length === 0) {
        console.warn('⚠️ 没有抓取到问卷内容，使用默认配置');
        return false;
    }
    
    console.log('🔄 开始对比问卷内容...');
    let hasChanges = false;
    
    extractedQuestions.forEach(question => {
        const index = question.index;
        const answerFuncName = \`_answer\${index}\`;
        
        // 检查答案函数是否存在
        if (typeof window[answerFuncName] !== 'function') {
            console.log(\`⚠️ 问题 \${index} 没有对应的答案函数，跳过\`);
            return;
        }
        
        // 获取当前答案函数的选项（通过检查函数源码）
        const currentFunc = window[answerFuncName];
        const funcSource = currentFunc.toString();
        
        // 尝试从函数源码中提取选项数组
        let currentOptions = [];
        try {
            // 匹配 const option = [...] 或 const option=[...]
            const optionMatch = funcSource.match(/const\\s+option\\s*=\\s*\\[([^\\]]+)\\]/);
            if (optionMatch) {
                // 提取选项字符串，去掉引号和空格
                currentOptions = optionMatch[1]
                    .split(',')
                    .map(opt => opt.trim().replace(/^['"]|['"]$/g, ''))
                    .filter(opt => opt);
            }
        } catch (error) {
            console.warn(\`⚠️ 无法解析问题 \${index} 的原选项\`, error);
        }
        
        // 检查选项是否匹配
        let allOptionsMatch = true;
        for (const option of question.options) {
            if (!funcSource.includes(option)) {
                allOptionsMatch = false;
                break;
            }
        }
        
        if (!allOptionsMatch) {
            console.log(\`🔄 问题 \${index} 的选项不匹配，更新答案函数\`);
            if (currentOptions.length > 0) {
                console.log(\`  原选项: [\${currentOptions.join(', ')}]\`);
            } else {
                console.log(\`  原选项: (无法从函数源码中提取)\`);
            }
            console.log(\`  新选项: [\${question.options.join(', ')}]\`);
            
            // 动态生成新的答案函数
            const newFunction = generateAnswerFunction(question);
            window[answerFuncName] = newFunction;
            hasChanges = true;
        } else {
            console.log(\`✅ 问题 \${index} 的选项匹配\`);
        }
    });
    
    if (hasChanges) {
        console.log('✅ 问卷内容已更新为网站最新版本');
    } else {
        console.log('✅ 问卷内容与网站一致，无需更新');
    }
    
    return hasChanges;
}

// 校验问卷内容是否匹配（仅校验，不改动答案函数）
function verifyQuestionnaireContent(showAlert = true) {
    try {
        const extractedQuestions = extractQuestionOptionsFromPage();
        if (!extractedQuestions || extractedQuestions.length === 0) {
            console.error('❌ 无法读取当前页面的问卷结构，已终止执行');
            if (showAlert) alert('❌ 无法读取当前页面的问卷结构，已终止执行');
            return false;
        }

        const expectedDef = buildExpectedQuestionnaireDefinition();
        let mismatch = false;
        const details = [];

        // 将提取结果转索引映射
        const pageMap = {};
        extractedQuestions.forEach(q => { pageMap[q.index] = q.options || []; });

        // 对比期望与页面
        Object.keys(expectedDef).forEach(k => {
            const idx = parseInt(k, 10);
            const expectedOpts = expectedDef[idx] || [];
            const pageOpts = pageMap[idx] || [];
            if (expectedOpts.length === 0) return; // 没有明确期望则跳过
            const missing = expectedOpts.filter(o => !pageOpts.includes(o));
            if (missing.length > 0) {
                mismatch = true;
                details.push({ index: idx, missing, pageOpts });
            }
        });

        if (mismatch) {
            console.error('❌ 问卷不匹配，详情: ', details);
            if (showAlert) alert('❌ 当前页面问卷内容与所选类型不匹配，已终止执行');
            return false;
        }

        console.log('✅ 问卷内容与所选类型匹配');
        return true;
    } catch (e) {
        console.error('❌ 校验问卷内容失败:', e);
        if (showAlert) alert('❌ 校验问卷内容失败，已终止执行');
        return false;
    }
}

// 构建期望的问卷定义（从答案函数中解析）
function buildExpectedQuestionnaireDefinition() {
    const expected = {};

    // 通用：解析 _answerN 函数中的 const option = [...]
    for (let i = 0; i < 50; i++) {
        const name = \`_answer\${i}\`;
        const fn = window[name];
        if (typeof fn !== 'function') continue;
        try {
            const src = fn.toString();
            const m = src.match(/const\\s+option\\s*=\\s*\\[([^\\]]+)\\]/);
            if (m) {
                expected[i] = m[1]
                    .split(',')
                    .map(str => str.trim().replace(/^['"]|['"]$/g, ''))
                    .filter(Boolean);
            }
        } catch {}
    }

    // 平晓特殊规则：明确第1题与第4题的选项集合
    try {
        if (typeof config !== 'undefined' && config.variant === "pingxiao") {
            // 仅要求第1题包含配置的选项；第4题为依赖题，由运行时逻辑自适应页面可选项
            expected[0] = ['肿瘤辅助治疗','甲状腺 / 乳腺结节消结散结','淋巴结肿大 / 炎症肿痛缓解','中医辨证热毒壅结证'];
        }
    } catch {}

    return expected;
}

// 确认匹配，否则中止
async function ensureQuestionnaireMatchesOrAbort() {
    const ok = verifyQuestionnaireContent(true);
    if (!ok) throw new Error('问卷不匹配');
}

// 生成答案函数
function generateAnswerFunction(question) {
    const options = question.options;
    
    // 根据选项数量和类型生成合适的随机逻辑
    return function() {
        const index = Math.floor(Math.random() * options.length);
        return options[index];
    };
}

// 初始化问卷内容检查（在执行创建任务前调用）
async function initializeQuestionnaireContent() {
    console.log('📋 初始化问卷内容检查...');
    
    // 等待页面加载完成
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 抓取页面问卷内容
    const extractedQuestions = extractQuestionOptionsFromPage();
    
    // 对比并更新
    if (extractedQuestions) {
        compareAndUpdateQuestions(extractedQuestions);
    }
    
    console.log('✅ 问卷内容检查完成');
}

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
console.log('  • startAddContact(起始位置) - 创建联系人（串行，安全）');
console.log('  • startAddContactFast(批量大小, 起始位置) - 快速创建联系人（并发，默认10个/批）');
console.log('    💡 起始位置可以是数字（如: 25）或姓名（如: "张三"）');
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

// 辅助函数：从URL获取项目ID（参考 wenjuanyanzheng.js）
function getProjectIdFromUrl() {
    // 方法1: 从当前页面URL获取
    const urlParams = new URLSearchParams(window.location.search);
    let projectId = urlParams.get('projectId');
    
    if (projectId) {
        return projectId;
    }
    
    // 方法2: 从iframe获取
    const iframe = document.querySelector('#ssfwIframe');
    if (iframe) {
        try {
            // 尝试从 iframe 的 contentWindow.location 获取
            const iframeSrc = iframe.contentWindow.location.href;
            const iframeParams = new URLSearchParams(iframeSrc.split('?')[1]);
            projectId = iframeParams.get('projectId');
            
            if (projectId) {
                return projectId;
            }
        } catch (error) {
            // 跨域限制，尝试从 iframe.src 获取
            try {
                if (iframe.src) {
                    const iframeUrl = new URL(iframe.src);
                    projectId = iframeUrl.searchParams.get('projectId');
                    
                    if (projectId) {
                        return projectId;
                    }
                }
            } catch (e) {
                // 忽略错误，使用默认值
            }
        }
    }
    
    // 返回默认值
    return '1756460958725101';
}

const PROJECT_ID = getProjectIdFromUrl();

{{VALIDATION_CODE}}

// ==================== 问卷内容抓取与对比 ====================

// 从网站页面抓取问卷选项
function extractQuestionOptionsFromPage() {
    try {
        console.log('🔍 开始从页面抓取问卷选项...');
        
        const contentWindow = document.querySelector('#ssfwIframe')?.contentWindow ?? window;
        
        // 方法1: 尝试从DOM结构抓取（当在问卷填写页面时）
        const mainElements = contentWindow.document.querySelectorAll('.main');
        if (mainElements.length >= 2) {
            const questionItems = mainElements[1].querySelectorAll('.layui-form-item');
            const extractedQuestions = [];
            
            questionItems.forEach((item, index) => {
                try {
                    // 获取问题标题
                    const labelElement = item.querySelector('label');
                    const questionTitle = labelElement ? labelElement.innerText.trim() : '';
                    
                    // 获取所有选项
                    const options = [];
                    const inputElements = item.querySelectorAll('input[type="radio"], input[type="checkbox"]');
                    
                    inputElements.forEach(input => {
                        const value = input.value;
                        if (value && value.trim()) {
                            options.push(value.trim());
                        }
                    });
                    
                    if (questionTitle && options.length > 0) {
                        extractedQuestions.push({
                            index: index,
                            title: questionTitle,
                            options: options
                        });
                        console.log(\`  问题 \${index}: \${questionTitle}\`);
                        console.log(\`    选项: [\${options.join(', ')}]\`);
                    }
                } catch (error) {
                    console.warn(\`⚠️ 解析问题 \${index} 时出错:\`, error);
                }
            });
            
            if (extractedQuestions.length > 0) {
                console.log(\`✅ 从DOM结构成功抓取 \${extractedQuestions.length} 个问题\`);
                return extractedQuestions;
            }
        }
        
        // 方法2: 尝试从隐藏字段抓取（备用方案）
        console.log('🔄 尝试从隐藏字段抓取问卷定义...');
        const questionsInput = contentWindow.document.querySelector('input[name="questions"]');
        const optionsInput = contentWindow.document.querySelector('input[name="options"]');
        
        if (questionsInput && optionsInput) {
            const questionsValue = questionsInput.value;
            const optionsValue = optionsInput.value;
            
            if (questionsValue && optionsValue) {
                // 解析问题和选项（格式：问题用#分隔，选项用#分隔，每个问题的选项用|或;分隔）
                const questions = questionsValue.split('#');
                const optionsGroups = optionsValue.split('#');
                
                const extractedQuestions = [];
                questions.forEach((question, index) => {
                    if (question && optionsGroups[index]) {
                        // 尝试用|分隔，如果没有|则用;分隔
                        let options = [];
                        if (optionsGroups[index].includes('|')) {
                            options = optionsGroups[index].split('|').filter(opt => opt.trim());
                        } else if (optionsGroups[index].includes(';')) {
                            options = optionsGroups[index].split(';').filter(opt => opt.trim());
                        } else {
                            // 如果都没有，可能是单个选项
                            options = [optionsGroups[index]].filter(opt => opt.trim());
                        }
                        
                        if (options.length > 0) {
                            extractedQuestions.push({
                                index: index,
                                title: question.trim(),
                                options: options.map(opt => opt.trim())
                            });
                            console.log(\`  问题 \${index}: \${question.trim()}\`);
                            console.log(\`    选项: [\${options.join(', ')}]\`);
                        }
                    }
                });
                
                if (extractedQuestions.length > 0) {
                    console.log(\`✅ 从隐藏字段成功抓取 \${extractedQuestions.length} 个问题\`);
                    return extractedQuestions;
                }
            }
        }
        
        console.warn('⚠️ 未能从页面抓取到问卷内容');
        console.log(\`✅ 成功抓取 0 个问题\`);
        return null;
    } catch (error) {
        console.error('❌ 抓取问卷选项失败:', error);
        return null;
    }
}

// 对比并更新问卷答案函数
function compareAndUpdateQuestions(extractedQuestions) {
    if (!extractedQuestions || extractedQuestions.length === 0) {
        console.warn('⚠️ 没有抓取到问卷内容，使用默认配置');
        return false;
    }
    
    console.log('🔄 开始对比问卷内容...');
    let hasChanges = false;
    
    extractedQuestions.forEach(question => {
        const index = question.index;
        const answerFuncName = \`_answer\${index}\`;
        
        // 检查答案函数是否存在
        if (typeof window[answerFuncName] !== 'function') {
            console.log(\`⚠️ 问题 \${index} 没有对应的答案函数，跳过\`);
            return;
        }
        
        // 获取当前答案函数的选项（通过检查函数源码）
        const currentFunc = window[answerFuncName];
        const funcSource = currentFunc.toString();
        
        // 尝试从函数源码中提取选项数组
        let currentOptions = [];
        try {
            // 匹配 const option = [...] 或 const option=[...]
            const optionMatch = funcSource.match(/const\\s+option\\s*=\\s*\\[([^\\]]+)\\]/);
            if (optionMatch) {
                // 提取选项字符串，去掉引号和空格
                currentOptions = optionMatch[1]
                    .split(',')
                    .map(opt => opt.trim().replace(/^['"]|['"]$/g, ''))
                    .filter(opt => opt);
            }
        } catch (error) {
            console.warn(\`⚠️ 无法解析问题 \${index} 的原选项\`, error);
        }
        
        // 检查选项是否匹配
        let allOptionsMatch = true;
        for (const option of question.options) {
            if (!funcSource.includes(option)) {
                allOptionsMatch = false;
                break;
            }
        }
        
        if (!allOptionsMatch) {
            console.log(\`🔄 问题 \${index} 的选项不匹配，更新答案函数\`);
            if (currentOptions.length > 0) {
                console.log(\`  原选项: [\${currentOptions.join(', ')}]\`);
            } else {
                console.log(\`  原选项: (无法从函数源码中提取)\`);
            }
            console.log(\`  新选项: [\${question.options.join(', ')}]\`);
            
            // 动态生成新的答案函数
            const newFunction = generateAnswerFunction(question);
            window[answerFuncName] = newFunction;
            hasChanges = true;
        } else {
            console.log(\`✅ 问题 \${index} 的选项匹配\`);
        }
    });
    
    if (hasChanges) {
        console.log('✅ 问卷内容已更新为网站最新版本');
    } else {
        console.log('✅ 问卷内容与网站一致，无需更新');
    }
    
    return hasChanges;
}

// 校验问卷内容是否匹配（仅校验，不改动答案函数）
function verifyQuestionnaireContent(showAlert = true) {
    try {
        const extractedQuestions = extractQuestionOptionsFromPage();
        if (!extractedQuestions || extractedQuestions.length === 0) {
            console.error('❌ 无法读取当前页面的问卷结构，已终止执行');
            if (showAlert) alert('❌ 无法读取当前页面的问卷结构，已终止执行');
            return false;
        }

        const expectedDef = buildExpectedQuestionnaireDefinition();
        let mismatch = false;
        const details = [];

        // 将提取结果转索引映射
        const pageMap = {};
        extractedQuestions.forEach(q => { pageMap[q.index] = q.options || []; });

        // 对比期望与页面
        Object.keys(expectedDef).forEach(k => {
            const idx = parseInt(k, 10);
            const expectedOpts = expectedDef[idx] || [];
            const pageOpts = pageMap[idx] || [];
            if (expectedOpts.length === 0) return; // 没有明确期望则跳过
            const missing = expectedOpts.filter(o => !pageOpts.includes(o));
            if (missing.length > 0) {
                mismatch = true;
                details.push({ index: idx, missing, pageOpts });
            }
        });

        if (mismatch) {
            console.error('❌ 问卷不匹配，详情: ', details);
            if (showAlert) alert('❌ 当前页面问卷内容与所选类型不匹配，已终止执行');
            return false;
        }

        console.log('✅ 问卷内容与所选类型匹配');
        return true;
    } catch (e) {
        console.error('❌ 校验问卷内容失败:', e);
        if (showAlert) alert('❌ 校验问卷内容失败，已终止执行');
        return false;
    }
}

// 构建期望的问卷定义（从答案函数中解析）
function buildExpectedQuestionnaireDefinition() {
    const expected = {};

    // 通用：解析 _answerN 函数中的 const option = [...]
    for (let i = 0; i < 50; i++) {
        const name = '_answer' + i;
        const fn = window[name];
        if (typeof fn !== 'function') continue;
        try {
            const src = fn.toString();
            const m = src.match(/const\\s+option\\s*=\\s*\\[([^\\]]+)\\]/);
            if (m) {
                expected[i] = m[1]
                    .split(',')
                    .map(str => str.trim().replace(/^['"]|['"]$/g, ''))
                    .filter(Boolean);
            }
        } catch {}
    }

    // 平晓特殊规则：明确第1题与第4题的选项集合
    try {
        if (typeof config !== 'undefined' && config.variant === 'pingxiao') {
            // 仅要求第1题包含配置的选项；第4题为依赖题，由运行时逻辑自适应页面可选项
            expected[0] = ['肿瘤辅助治疗','甲状腺 / 乳腺结节消结散结','淋巴结肿大 / 炎症肿痛缓解','中医辨证热毒壅结证'];
        }
    } catch {}

    return expected;
}

// 确认匹配，否则中止
async function ensureQuestionnaireMatchesOrAbort() {
    const ok = verifyQuestionnaireContent(true);
    if (!ok) throw new Error('问卷不匹配');
}

// 生成答案函数
function generateAnswerFunction(question) {
    const options = question.options;
    
    // 根据选项数量和类型生成合适的随机逻辑
    return function() {
        const index = Math.floor(Math.random() * options.length);
        return options[index];
    };
}

// 初始化问卷内容检查（在执行创建任务前调用）
async function initializeQuestionnaireContent() {
    console.log('📋 初始化问卷内容检查...');
    
    // 等待页面加载完成
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 抓取页面问卷内容
    const extractedQuestions = extractQuestionOptionsFromPage();
    
    // 对比并更新
    if (extractedQuestions) {
        compareAndUpdateQuestions(extractedQuestions);
    }
    
    console.log('✅ 问卷内容检查完成');
}

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
    // 用于创建（/add）
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
                    reject(new Error('请求失败: ' + status + ' - ' + error));
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
                    reject(new Error('备用端点请求失败: ' + status + ' - ' + error));
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

// 获取动态盐值（用于更新 /mobileUpd）
async function createDynamicsSaltForUpdate() {
    try {
        const endpoint = (config && config.saltEndpointUpdate) 
            ? config.saltEndpointUpdate 
            : (config && config.saltEndpoint 
                ? (config.saltEndpoint.replace(/add$/, 'mobileUpd').replace('/add', '/mobileUpd'))
                : '/lgb/payMerge/createDynamicsSalt?methodName=/xfzwj/mobileUpd');
        console.log('🔍 获取更新用动态盐值...', endpoint);
        const result = await new Promise((resolve, reject) => {
            $.ajax({
                url: endpoint,
                type: "GET",
                traditional: true,
                success: function(res) { resolve(res); },
                error: function(xhr, status, error) { reject(new Error('请求失败: ' + status + ' - ' + error)); }
            });
        });
        if (result && result.code === 0) {
            return await processSaltData(result.data);
        }
        throw new Error(\`获取更新盐值失败: \${result && result.message}\`);
    } catch (e) {
        console.error('❌ 获取更新盐值失败:', e);
        throw e;
    }
}

// 处理盐值数据
async function processSaltData(data) {
    console.log('✅ 动态盐值获取成功:', data);

    // 验证返回的数据结构
    if (!data) {
        throw new Error(\`动态盐值数据为空\`);
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

// ==================== 辅助工具函数 ====================
// 优先使用外部签名工具库（automation-sign-utils.js）
// 如果未加载，则内联定义（向后兼容）

if (typeof AutomationSignUtils !== 'undefined') {
    // 使用外部工具库
    var formatParams = AutomationSignUtils.formatParams;
    var toQueryString = AutomationSignUtils.toQueryString;
    var sha256 = AutomationSignUtils.sha256;
    var hmac = AutomationSignUtils.hmac;
    var sign = AutomationSignUtils.sign;
    var hex = AutomationSignUtils.hex;
    console.log('✅ 使用外部签名工具库 (v' + AutomationSignUtils.version + ')');
} else {
    // 内联定义（向后兼容）
    console.warn('⚠️ 未检测到签名工具库，使用内联定义');
    console.warn('💡 建议在控制台执行前先加载 automation-sign-utils.js 以减少代码体积');
    
    function sha256(data) {
        if (typeof CryptoJS !== 'undefined' && CryptoJS.SHA256) {
            return CryptoJS.SHA256(data);
        }
        throw new Error('SHA-256实现不可用');
    }
    
    function hmac(key, data) {
        const encoder = new TextEncoder("utf-8");
        const keyBytes = typeof key === 'string' ? encoder.encode(key) : key;
        const dataBytes = typeof data === 'string' ? encoder.encode(data) : data;
        
        if (typeof CryptoJS !== 'undefined' && CryptoJS.HmacSHA256) {
            const keyStr = typeof key === 'string' ? key : new TextDecoder().decode(key);
            const dataStr = typeof data === 'string' ? data : new TextDecoder().decode(data);
            const result = CryptoJS.HmacSHA256(dataStr, keyStr);
            
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
}

{{QUESTION_LOGIC}}

{{EXECUTION_LOGIC}}

// 启动提示
console.log('%c🎉 自动化代码加载成功！', 'color: #28a745; font-weight: bold; font-size: 16px;');
console.log('💡 输入 help() 查看所有可用命令');

// 帮助函数
function help() {
    console.log('%c📖 可用命令列表', 'color: #17a2b8; font-weight: bold;');
    console.log('');
    console.log('📝 问卷执行:');
{{CHANNEL_COMMANDS}}
    console.log('  • startApi(起始位置) - 手动执行单个任务');
    console.log('  • automaticApi(日期, 起始位置) - 自动执行（串行，安全）');
    console.log('  • automaticApiFast(批量大小, 日期, 起始位置) - 快速批量执行（并发，默认10个/批）');
    console.log('');
    console.log('👥 联系人管理:');
    console.log('  • startAddContact(起始位置) - 创建联系人（串行，安全）');
    console.log('  • startAddContactFast(批量大小, 起始位置) - 快速创建联系人（并发，默认10个/批）');
    console.log('');
    console.log('⚙️ 执行配置:');
    console.log('  • setApiInterval(毫秒) - 设置API请求间隔（仅串行模式）');
    console.log('  • resetProgress() - 重置执行进度到第1个');
    console.log('  • setStartPosition(位置) - 设置起始位置（数字或姓名）');
    console.log('');
    console.log('🎮 执行控制:');
    console.log('  • pauseExecution() - 暂停当前执行');
    console.log('  • resumeExecution() - 继续执行');
    console.log('  • stopExecution() - 停止执行');
    console.log('');
    console.log('🔍 数据验证:');
    console.log('  • validateData() - 验证数据完整性');
    console.log('  • showMissing() - 显示缺失数据');
    console.log('  • updateWithMissing() - 补充缺失数据');
    console.log('');
    console.log('🔄 智能更新:');
    console.log('  • updateByOrderApi(日期, 起始位置) - 按data顺序匹配工单ID并更新');
    console.log('    💡 例: updateByOrderApi("10.09") - 更新所有10.09的工单');
    console.log('    💡 例: updateByOrderApi(null, 5) - 从第5个开始更新所有工单');
    console.log('    💡 例: updateByOrderApi("10.09", "张三") - 从张三开始更新10.09工单');
    console.log('  • updateByDateApi(日期) - 按日期批量更新所有工单');
    console.log('  • revokeByDateApi(日期) - 按日期批量撤销工单');
    console.log('  • cacheQuestionnaireStructure() - 手动缓存问卷结构（在工单列表页更新时使用）');
    console.log('  • clearQuestionnaireCache() - 清除缓存');
    console.log('');
    console.log('💡 提示: 起始位置可以是数字（如: 25）或姓名（如: "张三"）');
}

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
