// ==================== Sheet选择模块 ====================

/**
 * Sheet选择器类
 */
class SheetSelector {
    constructor() {
        this.modal = new ModalManager('sheetModal');
        this.matchInfo = DOMUtils.getElementById('matchInfo');
        this.matchMessage = DOMUtils.getElementById('matchMessage');
        this.sheetList = DOMUtils.getElementById('sheetList');
        this.sheetPreview = DOMUtils.getElementById('sheetPreview');
        this.previewContent = DOMUtils.getElementById('previewContent');
        this.confirmBtn = DOMUtils.getElementById('confirmSheetBtn');
        this.rememberChoice = DOMUtils.getElementById('rememberChoice');
        
        this.selectedSheetName = '';
        this.currentSheets = {};
        this.currentConfig = null;
        this.onConfirm = null;
        
        this.initializeEvents();
    }

    /**
     * 初始化事件监听
     */
    initializeEvents() {
        // 键盘事件
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.isShowing()) {
                this.close();
            }
            if (e.key === 'Enter' && this.modal.isShowing() && this.selectedSheetName) {
                this.confirm();
            }
        });
    }

    /**
     * 显示Sheet选择模态框
     */
    show(config, sheets, reason) {
        this.currentConfig = config;
        this.currentSheets = sheets;
        
        // 显示匹配失败原因
        if (this.matchMessage) {
            this.matchMessage.textContent = reason;
        }

        // 生成Sheet列表
        this.generateSheetList();

        // 显示模态框
        this.modal.show();
        this.selectedSheetName = '';
        this.updateConfirmButton();
    }

    /**
     * 生成Sheet列表
     */
    generateSheetList() {
        if (!this.sheetList) return;

        const sheetNames = Object.keys(this.currentSheets);
        this.sheetList.innerHTML = '';

        sheetNames.forEach(sheetName => {
            const sheetData = this.currentSheets[sheetName];
            const rowCount = sheetData.length;
            const colCount = sheetData[0]?.length || 0;

            // 计算推荐度
            const matcher = new SheetMatcher(this.currentConfig);
            const recommendScore = matcher.calculateRecommendScore(sheetName, this.currentConfig.keywords);
            const isRecommended = recommendScore > 0;

            const div = DOMUtils.createElement('div', `sheet-item ${isRecommended ? 'recommended' : ''}`);
            div.dataset.sheetName = sheetName;
            div.innerHTML = `
                <div class="sheet-name">
                    ${sheetName} ${isRecommended ? '⭐ 推荐' : ''}
                </div>
                <div class="sheet-info">
                    <span>行数: ${rowCount}, 列数: ${colCount}</span>
                    ${isRecommended ? `<span>匹配度: ${recommendScore}/${this.currentConfig.keywords.length}</span>` : ''}
                </div>
            `;

            div.onclick = () => this.selectSheet(sheetName);
            this.sheetList.appendChild(div);
        });
    }

    /**
     * 选择Sheet
     */
    selectSheet(sheetName) {
        // 更新选中状态
        DOMUtils.querySelectorAll('.sheet-item').forEach(item => {
            DOMUtils.removeClass(item, 'selected');
        });
        DOMUtils.addClass(DOMUtils.querySelector(`[data-sheet-name="${sheetName}"]`), 'selected');

        this.selectedSheetName = sheetName;
        this.updateConfirmButton();

        // 显示预览
        this.showPreview(sheetName);
    }

    /**
     * 显示Sheet预览
     */
    showPreview(sheetName) {
        if (!this.sheetPreview || !this.previewContent) return;

        const sheetData = this.currentSheets[sheetName];
        const previewRows = sheetData.slice(0, CONFIG.defaults.previewRows);

        let tableHtml = '<table class="preview-table">';

        previewRows.forEach((row, index) => {
            const isHeader = index === 0;
            tableHtml += `<tr>`;

            row.forEach(cell => {
                const cellContent = cell || '';
                if (isHeader) {
                    tableHtml += `<th>${cellContent}</th>`;
                } else {
                    tableHtml += `<td>${cellContent}</td>`;
                }
            });

            tableHtml += `</tr>`;
        });

        tableHtml += '</table>';

        if (sheetData.length > CONFIG.defaults.previewRows) {
            tableHtml += `<p style="text-align: center; margin-top: 10px; font-size: 11px; color: #666;">... 还有 ${sheetData.length - CONFIG.defaults.previewRows} 行数据</p>`;
        }

        this.previewContent.innerHTML = tableHtml;
        DOMUtils.show(this.sheetPreview);
    }

    /**
     * 更新确认按钮状态
     */
    updateConfirmButton() {
        if (this.confirmBtn) {
            this.confirmBtn.disabled = !this.selectedSheetName;
        }
    }

    /**
     * 确认选择
     */
    confirm() {
        if (!this.selectedSheetName) {
            Toast.error('❌ 请选择一个工作表');
            return;
        }

        // 保存用户偏好
        if (this.rememberChoice && this.rememberChoice.checked) {
            const preferences = Storage.get('sheetPreferences', {});
            preferences[this.currentConfig.type] = this.selectedSheetName;
            Storage.set('sheetPreferences', preferences);
            
            Logger.logInfo(`💾 已保存Sheet选择偏好: ${this.selectedSheetName}`);
            Toast.success(`💾 已保存${this.currentConfig.name}的Sheet偏好`);
        }

        // 关闭模态框
        this.close();

        // 执行回调
        if (this.onConfirm) {
            Logger.logSuccess(`✅ 用户选择工作表: ${this.selectedSheetName}`);
            this.onConfirm(this.selectedSheetName, this.currentSheets[this.selectedSheetName]);
        }
    }

    /**
     * 关闭模态框
     */
    close() {
        this.modal.hide();
        this.selectedSheetName = '';

        // 清理预览
        if (this.sheetPreview) {
            DOMUtils.hide(this.sheetPreview);
        }

        // 重置记住选择
        if (this.rememberChoice) {
            this.rememberChoice.checked = false;
        }
    }

    /**
     * 获取选中的Sheet名称
     */
    getSelectedSheetName() {
        return this.selectedSheetName;
    }
}

/**
 * Sheet偏好管理器
 */
class SheetPreferenceManager {
    constructor() {
        this.preferences = Storage.get('sheetPreferences', {});
    }

    /**
     * 获取偏好设置
     */
    getPreference(questionnaireType) {
        return this.preferences[questionnaireType];
    }

    /**
     * 设置偏好
     */
    setPreference(questionnaireType, sheetName) {
        this.preferences[questionnaireType] = sheetName;
        Storage.set('sheetPreferences', this.preferences);
    }

    /**
     * 删除偏好
     */
    removePreference(questionnaireType) {
        delete this.preferences[questionnaireType];
        Storage.set('sheetPreferences', this.preferences);
    }

    /**
     * 清除所有偏好
     */
    clearAll() {
        this.preferences = {};
        Storage.remove('sheetPreferences');
        Logger.logSuccess('✅ 已清除所有Sheet选择偏好');
        Toast.success('✅ 已清除Sheet选择偏好');
    }

    /**
     * 获取所有偏好
     */
    getAllPreferences() {
        return { ...this.preferences };
    }

    /**
     * 加载偏好设置
     */
    load() {
        this.preferences = Storage.get('sheetPreferences', {});
        Logger.logInfo(`📋 已加载Sheet选择偏好: ${Object.keys(this.preferences).length}个`);
    }
}

// 全局函数：清除Sheet偏好设置
window.clearSheetPreferences = function() {
    const manager = new SheetPreferenceManager();
    manager.clearAll();
};

// 全局导出
window.SheetSelector = SheetSelector;
window.SheetPreferenceManager = SheetPreferenceManager;
