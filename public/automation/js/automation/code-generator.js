// ==================== 核心代码生成器 ====================

/**
 * 自动化代码生成器类（重构版）
 * 职责单一，只负责代码生成的核心逻辑
 */
class AutomationCodeGenerator {
    constructor(config) {
        this.config = config;
        this.templateManager = new TemplateManager();
        this.validationManager = new ValidationManager();
        this.executionLogicManager = new ExecutionLogicManager();
        this.controlPanelManager = new ControlPanelManager();
        this.questionnaireLogic = QuestionnaireLogicFactory.create(config.name);
    }

    /**
     * 生成单日期自动化代码
     */
    generateCode(data, assignee, date, useApiMode = false) {
        return this.generateCodeInternal({
            data,
            assignee,
            date,
            mode: useApiMode ? 'api' : 'dom',
            includeValidation: true
        }, false);
    }

    /**
     * 生成全日期自动化代码
     */
    generateAllDatesCode(data, assignee, dates, useApiMode = false) {
        return this.generateCodeInternal({
            data,
            assignee,
            mode: useApiMode ? 'api' : 'dom',
            includeValidation: true
        }, true);
    }

    /**
     * 内部代码生成方法
     */
    generateCodeInternal(options, isAllDates = false) {
        const {
            data,
            assignee = "未指定",
            date = this.formatDate(new Date()),
            mode = "dom",
            includeValidation = true
        } = options;

        // 验证输入参数
        this.validateInputs(data, assignee, date);

        // 过滤数据
        const filteredData = this.filterData(data, assignee, date, isAllDates);

        try {
            // 获取模板
            const templateName = this.getTemplateName(mode, isAllDates);
            const template = this.templateManager.getTemplate(templateName);

            // 获取各部分代码
            const questionLogic =
              this.questionnaireLogic.getQuestionLogic() +
              "\n\n" +
              this.questionnaireLogic.getContactCreationLogic();
            const executionLogic = this.getExecutionLogic(mode, isAllDates);
            const validationCode = includeValidation ? this.validationManager.getValidationCode() : '';
            const controlPanelCode = this.getControlPanelCode(isAllDates);
            const channelCommands = this.getChannelCommands();

            // 替换模板占位符
            let result = this.replaceTemplatePlaceholders(template, {
                data: filteredData,
                assignee,
                date,
                questionLogic,
                executionLogic,
                validationCode,
                controlPanelCode,
                channelCommands,
                config: this.config
            });

            // 自检
            this.validateGeneratedCode(result);

            // 自动复制到剪贴板
            this.copyToClipboard(result);

            return result;
        } catch (error) {
            console.error(`❌ 代码生成失败:`, error);
            throw error;
        }
    }

    /**
     * 验证输入参数
     */
    validateInputs(data, assignee, date) {
        if (!data || !Array.isArray(data)) {
            throw new Error(`数据参数无效: ${typeof data}, 期望数组`);
        }
        if (!assignee || typeof assignee !== "string") {
            throw new Error(`指派人参数无效: ${typeof assignee}, 期望字符串`);
        }
        if (!date || typeof date !== "string") {
            throw new Error(`日期参数无效: ${typeof date}, 期望字符串`);
        }
    }

    /**
     * 过滤数据
     */
    filterData(data, assignee, date, isAllDates) {
        if (isAllDates) {
            // 全日期模式：返回指派人的所有数据
            return data.filter(item => item.assignee === assignee);
        } else {
            // 单日期模式：返回指派人在指定日期的数据
            const filtered = data.filter(
                item => item.assignee === assignee && item.time === date
            );
            
            if (filtered.length === 0) {
                const availableAssignees = [...new Set(data.map(item => item.assignee))];
                const availableDates = [...new Set(data.map(item => item.time))];
                throw new Error(
                    `没有找到匹配的数据。可用指派人: [${availableAssignees.join(", ")}], 可用日期: [${availableDates.join(", ")}]`
                );
            }
            
            return filtered;
        }
    }

    /**
     * 获取模板名称
     */
    getTemplateName(mode, isAllDates) {
        if (isAllDates) {
            return mode === 'api' ? 'api_all_dates' : 'dom_all_dates';
        } else {
            return mode === 'api' ? 'api_single' : 'dom_single';
        }
    }

    /**
     * 获取执行逻辑
     */
    getExecutionLogic(mode, isAllDates) {
        if (isAllDates) {
            return this.executionLogicManager.getAllDatesExecutionLogic(mode);
        } else {
            return mode === 'api' 
                ? this.executionLogicManager.getApiExecutionLogic()
                : this.executionLogicManager.getDomExecutionLogic();
        }
    }

    /**
     * 获取控制面板代码
     */
    getControlPanelCode(isAllDates) {
        return this.controlPanelManager.getControlPanelCode({
            isAllDates,
            hasChannel: this.config.hasChannel,
            mode: this.config.mode
        });
    }

    /**
     * 获取渠道命令
     */
    getChannelCommands() {
        return this.config.hasChannel 
            ? "console.log('  • startAddChannel() - 创建医院');"
            : "";
    }

    /**
     * 替换模板占位符
     */
    replaceTemplatePlaceholders(template, data) {
        return template
            .replace(/{{DATA}}/g, JSON.stringify(data.data, null, 4))
            .replace(/{{DATE}}/g, data.date)
            .replace(/{{ASSIGNEE}}/g, data.assignee)
            .replace(/{{QUESTION_LOGIC}}/g, data.questionLogic)
            .replace(/{{EXECUTION_LOGIC}}/g, data.executionLogic)
            .replace(/{{VALIDATION_CODE}}/g, data.validationCode)
            .replace(/{{CONTROL_PANEL}}/g, data.controlPanelCode)
            .replace(/{{CHANNEL_COMMANDS}}/g, data.channelCommands)
            .replace(/{{CONFIG}}/g, JSON.stringify(data.config, null, 4))
            .replace(/{{HAS_CHANNEL}}/g, data.config.hasChannel.toString());
    }

    /**
     * 验证生成的代码
     */
    validateGeneratedCode(code) {
        const unreplacedMatches = code.match(/{{[A-Z_]+}}/g);
        if (unreplacedMatches) {
            console.warn("⚠️ 发现未替换的占位符:", unreplacedMatches);
        }
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
     * 复制文本到剪贴板
     */
    copyToClipboard(text) {
        // 检查是否在浏览器环境中
        if (typeof navigator === 'undefined' || typeof window === 'undefined') {
            console.log('⚠️ 当前环境不支持剪贴板操作');
            return;
        }
        
        // 使用现代 Clipboard API
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text)
                .then(() => {
                    console.log("%c✅ 代码已自动复制到剪贴板！", "color: #28a745; font-weight: bold; font-size: 14px;");
                    console.log("💡 提示: 直接在控制台粘贴 (Ctrl+V) 即可执行");
                })
                .catch((err) => {
                    console.warn("Clipboard API 复制失败，尝试使用备用方案:", err);
                    this.fallbackCopyToClipboard(text);
                });
        } else {
            this.fallbackCopyToClipboard(text);
        }
    }

    /**
     * 备用复制方法
     */
    fallbackCopyToClipboard(text) {
        try {
            const textarea = document.createElement("textarea");
            textarea.value = text;
            textarea.style.position = "fixed";
            textarea.style.top = "-999999px";
            textarea.style.left = "-999999px";

            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();

            const successful = document.execCommand("copy");
            document.body.removeChild(textarea);

            if (successful) {
                console.log("%c✅ 代码已自动复制到剪贴板！", "color: #28a745; font-weight: bold; font-size: 14px;");
                console.log("💡 提示: 直接在控制台粘贴 (Ctrl+V) 即可执行");
            } else {
                console.warn("⚠️ 自动复制失败，请手动复制生成的代码");
            }
        } catch (err) {
            console.error("❌ 复制到剪贴板失败:", err);
        }
    }
}

// 导出
window.AutomationCodeGenerator = AutomationCodeGenerator;
