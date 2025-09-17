// ==================== 工具函数库 ====================

/**
 * 日志工具类
 */
class Logger {
    static logInfo(message) {
        this.addLog(message, 'info');
    }

    static logSuccess(message) {
        this.addLog(message, 'success');
    }

    static logWarning(message) {
        this.addLog(message, 'warning');
    }

    static logError(message) {
        this.addLog(message, 'error');
    }

    static logCommand(message) {
        this.addLog(message, 'command');
    }

    static addLog(message, type = 'info') {
        const logContainer = document.getElementById('logContainer');
        if (!logContainer) return;
        
        const logEntry = document.createElement('div');
        logEntry.className = `log-${type}`;
        logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    static clearLogs() {
        const logContainer = document.getElementById('logContainer');
        if (logContainer) {
            logContainer.innerHTML = '';
        }
    }
}

/**
 * Toast通知工具类
 */
class Toast {
    static show(message, type = 'info', duration = CONFIG.defaults.toastDuration) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            ${message}
            <button class="close-btn" onclick="this.parentElement.remove()">×</button>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, duration);
    }

    static success(message, duration) {
        this.show(message, 'success', duration);
    }

    static error(message, duration) {
        this.show(message, 'error', duration);
    }

    static warning(message, duration) {
        this.show(message, 'warning', duration);
    }

    static info(message, duration) {
        this.show(message, 'info', duration);
    }
}

/**
 * 本地存储工具类
 */
class Storage {
    static get(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : defaultValue;
        } catch (error) {
            Logger.logWarning(`⚠️ 读取本地存储失败: ${key}`);
            return defaultValue;
        }
    }

    static set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            Logger.logWarning(`⚠️ 保存本地存储失败: ${key}`);
            return false;
        }
    }

    static remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            Logger.logWarning(`⚠️ 删除本地存储失败: ${key}`);
            return false;
        }
    }

    static clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            Logger.logWarning(`⚠️ 清空本地存储失败`);
            return false;
        }
    }
}

/**
 * DOM操作工具类
 */
class DOMUtils {
    static getElementById(id) {
        return document.getElementById(id);
    }

    static querySelector(selector) {
        return document.querySelector(selector);
    }

    static querySelectorAll(selector) {
        return document.querySelectorAll(selector);
    }

    static createElement(tag, className = '', innerHTML = '') {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (innerHTML) element.innerHTML = innerHTML;
        return element;
    }

    static show(element) {
        if (typeof element === 'string') {
            element = this.getElementById(element);
        }
        if (element) element.style.display = 'block';
    }

    static hide(element) {
        if (typeof element === 'string') {
            element = this.getElementById(element);
        }
        if (element) element.style.display = 'none';
    }

    static toggle(element) {
        if (typeof element === 'string') {
            element = this.getElementById(element);
        }
        if (element) {
            element.style.display = element.style.display === 'none' ? 'block' : 'none';
        }
    }

    static addClass(element, className) {
        if (typeof element === 'string') {
            element = this.getElementById(element);
        }
        if (element) element.classList.add(className);
    }

    static removeClass(element, className) {
        if (typeof element === 'string') {
            element = this.getElementById(element);
        }
        if (element) element.classList.remove(className);
    }

    static toggleClass(element, className) {
        if (typeof element === 'string') {
            element = this.getElementById(element);
        }
        if (element) element.classList.toggle(className);
    }
}

/**
 * 数据验证工具类
 */
class Validator {
    static isNotEmpty(value) {
        return value !== null && value !== undefined && value !== '';
    }

    static isValidDate(dateString) {
        const regex = /^\d{2}\.\d{2}$/;
        return regex.test(dateString);
    }

    static isValidEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    static isValidPhone(phone) {
        const regex = /^1[3-9]\d{9}$/;
        return regex.test(phone);
    }

    static formatDate(dateString) {
        if (!dateString) return '';
        
        const raw = dateString.toString().trim();
        const parts = raw.split('.');
        
        if (parts.length >= 2) {
            const mm = (parts[0] || '').toString().padStart(2, '0');
            const dd = (parts[1] || '').toString();
            const dd2 = dd.length === 1 ? dd + '0' : dd.padEnd(2, '0');
            return `${mm}.${dd2}`;
        }
        
        return raw;
    }
}

/**
 * 数组工具类
 */
class ArrayUtils {
    static groupBy(array, key) {
        return array.reduce((groups, item) => {
            const group = item[key];
            if (!groups[group]) {
                groups[group] = [];
            }
            groups[group].push(item);
            return groups;
        }, {});
    }

    static unique(array) {
        return [...new Set(array)];
    }

    static sortBy(array, key, ascending = true) {
        return array.sort((a, b) => {
            const aVal = a[key];
            const bVal = b[key];
            
            if (ascending) {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });
    }

    static chunk(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
}

/**
 * 字符串工具类
 */
class StringUtils {
    static isEmpty(str) {
        return !str || str.trim().length === 0;
    }

    static truncate(str, length, suffix = '...') {
        if (str.length <= length) return str;
        return str.substring(0, length) + suffix;
    }

    static capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    static camelCase(str) {
        return str.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '');
    }

    static kebabCase(str) {
        return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    }
}

// 全局导出
window.Logger = Logger;
window.Toast = Toast;
window.Storage = Storage;
window.DOMUtils = DOMUtils;
window.Validator = Validator;
window.ArrayUtils = ArrayUtils;
window.StringUtils = StringUtils;
