// ==================== UI管理模块 ====================

/**
 * 问卷类型选择器
 */
class QuestionnaireTypeSelector {
    constructor(containerId) {
        this.container = DOMUtils.getElementById(containerId);
        this.selectedType = null;
        this.onSelectionChange = null;
    }

    /**
     * 初始化问卷类型选择器
     */
    initialize() {
        if (!this.container) return;

        this.container.innerHTML = '';

        Object.keys(CONFIG.questionnaireTypes).forEach(key => {
            const config = CONFIG.questionnaireTypes[key];
            const div = DOMUtils.createElement('div', 'questionnaire-type');
            div.dataset.type = key;
            div.innerHTML = `
                <div class="title">${config.name}</div>
                <div class="desc">${config.description}</div>
            `;
            div.onclick = () => this.selectType(key);
            this.container.appendChild(div);
        });
    }

    /**
     * 选择问卷类型
     */
    selectType(type) {
        // 更新UI状态
        DOMUtils.querySelectorAll('.questionnaire-type').forEach(el => {
            DOMUtils.removeClass(el, 'active');
        });
        DOMUtils.addClass(DOMUtils.querySelector(`[data-type="${type}"]`), 'active');

        this.selectedType = type;
        const config = CONFIG.questionnaireTypes[type];

        Logger.logSuccess(`✅ 已选择问卷类型: ${config.name}`);
        Logger.logInfo(`📋 联系人类型: ${config.contactType}`);
        Logger.logInfo(`🏥 需要创建医院: ${config.hasChannel ? '是' : '否'}`);

        if (this.onSelectionChange) {
            this.onSelectionChange(type, config);
        }

        // 不在此处滚动，等上传文件后显示指派人管理时再滚动
    }

    /**
     * 获取选中的类型
     */
    getSelectedType() {
        return this.selectedType;
    }

    /**
     * 获取选中的配置
     */
    getSelectedConfig() {
        return this.selectedType ? CONFIG.questionnaireTypes[this.selectedType] : null;
    }
}

/**
 * 文件上传器
 */
class FileUploader {
    constructor(uploadAreaId, fileInputId) {
        this.uploadArea = DOMUtils.getElementById(uploadAreaId);
        this.fileInput = DOMUtils.getElementById(fileInputId);
        this.onFileLoad = null;
    }

    /**
     * 初始化文件上传器
     */
    initialize() {
        if (!this.uploadArea || !this.fileInput) return;

        // 点击上传
        this.uploadArea.onclick = () => this.fileInput.click();

        // 文件选择
        this.fileInput.onchange = (e) => {
            if (e.target.files.length > 0) {
                this.handleFiles(e.target.files);
            }
        };

        // 拖拽上传
        this.uploadArea.ondragover = (e) => {
            e.preventDefault();
            DOMUtils.addClass(this.uploadArea, 'dragover');
        };

        this.uploadArea.ondragleave = () => {
            DOMUtils.removeClass(this.uploadArea, 'dragover');
        };

        this.uploadArea.ondrop = (e) => {
            e.preventDefault();
            DOMUtils.removeClass(this.uploadArea, 'dragover');
            if (e.dataTransfer.files.length > 0) {
                this.handleFiles(e.dataTransfer.files);
            }
        };
    }

    /**
     * 处理文件
     */
    async handleFiles(files) {
        if (this.onFileLoad) {
            try {
                await this.onFileLoad(files);
            } catch (error) {
                Logger.logError(`文件处理失败: ${error.message}`);
                Toast.error('❌ 文件处理失败');
            }
        }
    }
}

/**
 * 数据预览器
 */
class DataPreviewer {
    constructor(previewId) {
        this.preview = DOMUtils.getElementById(previewId);
    }

    /**
     * 显示数据预览
     */
    displayPreview(data) {
        if (!this.preview) return;

        if (!data || data.length === 0) {
            this.preview.value = '暂无数据';
            return;
        }

        let previewText = `数据预览（前${CONFIG.defaults.maxPreviewData}条）：\n\n`;
        data.slice(0, CONFIG.defaults.maxPreviewData).forEach((item, index) => {
            previewText += `${index + 1}. 姓名: ${item.name}, 性别: ${item.sex}, 时间: ${item.time}, 指派人: ${item.assignee}\n`;
            if (item.hospital) {
                previewText += `   医院: ${item.hospital}, 地址: ${item.address}\n`;
            }
            previewText += '\n';
        });

        this.preview.value = previewText;
    }
}

/**
 * 指派人管理器
 */
class AssigneeManager {
    constructor(listId) {
        this.listContainer = DOMUtils.getElementById(listId);
        this.selectedAssignee = null;
        this.assigneeData = {};
        this.onSelectionChange = null;
    }

    /**
     * 显示指派人列表
     */
    displayList(assigneeData) {
        this.assigneeData = assigneeData;
        if (!this.listContainer) return;

        this.listContainer.innerHTML = '';

        Object.keys(assigneeData).forEach(assignee => {
            const data = assigneeData[assignee];
            const card = DOMUtils.createElement('div', 'assignee-card');
            card.dataset.assignee = assignee;
            
            card.innerHTML = `
                <div class="assignee-name">${assignee}</div>
                <div class="assignee-stats">${data.length}条记录</div>
            `;
            
            card.onclick = () => this.selectAssignee(assignee);
            this.listContainer.appendChild(card);
        });
    }

    /**
     * 选择指派人
     */
    selectAssignee(assignee) {
        // 更新选中状态
        DOMUtils.querySelectorAll('.assignee-card').forEach(card => {
            DOMUtils.removeClass(card, 'selected');
        });
        DOMUtils.addClass(DOMUtils.querySelector(`[data-assignee="${assignee}"]`), 'selected');

        this.selectedAssignee = assignee;

        if (this.onSelectionChange) {
            this.onSelectionChange(assignee, this.assigneeData[assignee]);
        }
    }

    /**
     * 获取选中的指派人
     */
    getSelectedAssignee() {
        return this.selectedAssignee;
    }
}

/**
 * 日期管理器
 */
class DateManager {
    constructor(statusId, titleId) {
        this.statusContainer = DOMUtils.getElementById(statusId);
        this.titleElement = DOMUtils.getElementById(titleId);
        this.selectedDate = null;
        this.onSelectionChange = null;
    }

    /**
     * 显示指派人的日期
     */
    displayAssigneeDates(assignee, data) {
        if (this.titleElement) {
            this.titleElement.textContent = assignee;
        }

        if (!this.statusContainer) return;
        
        if (!data || data.length === 0) {
            this.statusContainer.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">该指派人暂无数据</p>';
            return;
        }

        // 按日期分组
        const dateGroups = ArrayUtils.groupBy(data, 'time');

        this.statusContainer.innerHTML = '';
        
        Object.keys(dateGroups).sort().forEach(date => {
            const items = dateGroups[date];
            const dateItem = DOMUtils.createElement('div', 'date-item');
            dateItem.dataset.date = date;
            dateItem.innerHTML = `
                <div>${date}</div>
                <div class="date-info">${items.length}条记录</div>
            `;
            
            dateItem.onclick = () => this.selectDate(date, items);
            this.statusContainer.appendChild(dateItem);
        });
    }

    /**
     * 选择日期
     */
    selectDate(date, data) {
        // 更新选中状态
        DOMUtils.querySelectorAll('.date-item').forEach(item => {
            DOMUtils.removeClass(item, 'current');
        });
        DOMUtils.addClass(DOMUtils.querySelector(`[data-date="${date}"]`), 'current');

        this.selectedDate = date;
        Logger.logInfo(`📅 选择日期: ${date}, 记录数: ${data.length}`);
        
        if (this.onSelectionChange) {
            this.onSelectionChange(date, data);
        }
    }

    /**
     * 获取选中的日期
     */
    getSelectedDate() {
        return this.selectedDate;
    }
}

/**
 * 模态框管理器
 */
class ModalManager {
    constructor(modalId) {
        this.modal = DOMUtils.getElementById(modalId);
        this.isVisible = false;
    }

    /**
     * 显示模态框
     */
    show() {
        if (this.modal) {
            this.modal.style.display = 'flex';
            this.isVisible = true;
        }
    }

    /**
     * 隐藏模态框
     */
    hide() {
        if (this.modal) {
            this.modal.style.display = 'none';
            this.isVisible = false;
        }
    }

    /**
     * 切换模态框显示状态
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * 检查是否可见
     */
    isShowing() {
        return this.isVisible;
    }
}

// 全局导出
window.QuestionnaireTypeSelector = QuestionnaireTypeSelector;
window.FileUploader = FileUploader;
window.DataPreviewer = DataPreviewer;
window.AssigneeManager = AssigneeManager;
window.DateManager = DateManager;
window.ModalManager = ModalManager;
