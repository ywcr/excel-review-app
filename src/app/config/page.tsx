"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ValidationConfigStore,
  getValidationConfigStore,
} from "@/lib/validationConfigStore";
import {
  ValidationConfig,
  TaskTemplateConfig,
  RuleConfig,
  RULE_TYPE_LABELS,
  RULE_TYPE_DESCRIPTIONS,
} from "@/lib/validation-rules-schema";

// ============== UI 组件 ==============

// Toggle Switch 组件
function Switch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`
        relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
        transition-colors duration-200 ease-in-out focus:outline-none 
        ${checked ? "bg-indigo-600" : "bg-gray-200"}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
      style={{
        backgroundColor: checked ? "#667eea" : "#e5e7eb",
        width: "44px",
        height: "24px",
        padding: "2px",
        borderRadius: "999px",
        border: "none",
        position: "relative",
      }}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
        style={{
          width: "20px",
          height: "20px",
          borderRadius: "50%",
          backgroundColor: "white",
          transform: checked ? "translateX(20px)" : "translateX(0)",
          transition: "transform 0.2s",
        }}
      />
    </button>
  );
}

// 搜索框组件
function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="搜索任务模板..."
        className="w-full px-4 py-2 pl-10 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
        style={{
          width: "100%",
          padding: "10px 16px 10px 40px",
          backgroundColor: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          fontSize: "14px",
          boxSizing: "border-box", // 关键修复
        }}
      />
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
        style={{
          position: "absolute",
          left: "12px",
          top: "50%",
          transform: "translateY(-50%)",
          width: "16px",
          height: "16px",
          color: "#9ca3af",
          pointerEvents: "none",
        }}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    </div>
  );
}

// 规则图标映射
const RULE_TYPE_ICONS: Record<string, string> = {
  required: "📝",
  unique: "🔒",
  timeRange: "⏰",
  duration: "⏳",
  frequency: "🔢",
  dateInterval: "📅",
  dateFormat: "🔡",
  minValue: "📉",
  medicalLevel: "🏥",
  sixMonthsInterval: "📆",
  crossTaskValidation: "🔗",
  prohibitedContent: "🚫",
  sameImplementer: "👤",
};

// 生成规则自然语言摘要
function getRuleSummary(rule: RuleConfig): string | null {
  const params = rule.params as Record<string, any>;
  if (!params) return null;

  switch (rule.type) {
    case "frequency":
      return `限制每日由同一${
        params.groupBy === "implementer" ? "实施人" : "对象"
      }最多执行 ${params.maxPerDay} 次`;
    case "timeRange":
      return `仅允许在 ${params.startHour}:00 至 ${params.endHour}:00 之间`;
    case "duration":
      return `持续时间至少 ${params.minMinutes} 分钟`;
    case "dateInterval":
      return `同一对象需间隔 ${params.days} 天才能再次拜访`;
    case "minValue":
      return `数值不能小于 ${params.minValue}`;
    case "sameImplementer":
      return `强制 ${params.targetField} 与实施人绑定`;
    default:
      return null;
  }
}

// 规则编辑器组件
function RuleEditor({
  rule,
  fieldMappings,
  onUpdate,
  onToggle,
}: {
  rule: RuleConfig;
  fieldMappings: Record<string, string>;
  onUpdate: (updates: Partial<RuleConfig>) => void;
  onToggle: (enabled: boolean) => void;
}) {
  // 根据 fieldMappings 获取中文显示名称
  const displayName = useMemo(() => {
    const entry = Object.entries(fieldMappings).find(
      ([_, en]) => en === rule.field
    );
    return entry ? entry[0] : rule.field;
  }, [fieldMappings, rule.field]);

  const renderParamsEditor = () => {
    if (!rule.params) return <div className="no-params">无需配置参数</div>;
    const params = rule.params as Record<string, unknown>;

    switch (rule.type) {
      case "duration":
        return (
          <div className="params-grid">
            <div className="param-field">
              <label>最小时长 (分钟)</label>
              <input
                type="number"
                value={(params.minMinutes as number) || 60}
                onChange={(e) =>
                  onUpdate({
                    params: {
                      ...params,
                      minMinutes: parseInt(e.target.value) || 60,
                    },
                  })
                }
                min={1}
                className="modern-input"
              />
            </div>
          </div>
        );
      case "frequency":
        return (
          <div className="params-grid">
            <div className="param-field">
              <label>每日上限 (次)</label>
              <input
                type="number"
                value={(params.maxPerDay as number) || 5}
                onChange={(e) =>
                  onUpdate({
                    params: {
                      ...params,
                      maxPerDay: parseInt(e.target.value) || 5,
                    },
                  })
                }
                min={1}
                className="modern-input"
              />
            </div>
          </div>
        );
      case "timeRange":
        return (
          <div className="params-grid col-2">
            <div className="param-field">
              <label>开始时间 (点)</label>
              <input
                type="number"
                value={(params.startHour as number) || 8}
                onChange={(e) =>
                  onUpdate({
                    params: {
                      ...params,
                      startHour: parseInt(e.target.value) || 0,
                    },
                  })
                }
                min={0}
                max={23}
                className="modern-input"
              />
            </div>
            <div className="param-field">
              <label>结束时间 (点)</label>
              <input
                type="number"
                value={(params.endHour as number) || 19}
                onChange={(e) =>
                  onUpdate({
                    params: {
                      ...params,
                      endHour: parseInt(e.target.value) || 24,
                    },
                  })
                }
                min={0}
                max={24}
                className="modern-input"
              />
            </div>
          </div>
        );
      case "dateInterval":
        return (
          <div className="params-grid">
            <div className="param-field">
              <label>间隔周期 (天)</label>
              <input
                type="number"
                value={(params.days as number) || 7}
                onChange={(e) =>
                  onUpdate({
                    params: { ...params, days: parseInt(e.target.value) || 7 },
                  })
                }
                min={1}
                className="modern-input"
              />
            </div>
          </div>
        );
      case "minValue":
        return (
          <div className="params-grid">
            <div className="param-field">
              <label>最小值</label>
              <input
                type="number"
                value={(params.minValue as number) || 1}
                onChange={(e) =>
                  onUpdate({
                    params: {
                      ...params,
                      minValue: parseInt(e.target.value) || 1,
                    },
                  })
                }
                min={0}
                className="modern-input"
              />
            </div>
          </div>
        );
      case "sameImplementer":
        return (
          <div className="params-info">
            <p>
              此规则自动校验 <strong>{params.targetField as string}</strong> 和{" "}
              <strong>
                {(params?.addressField as string) || "(无地址字段)"}
              </strong>{" "}
              与实施人的对应关系。
            </p>
          </div>
        );
      default:
        return <div className="no-params">常规配置</div>;
    }
  };

  return (
    <div className={`rule-card ${rule.enabled ? "enabled" : "disabled"}`}>
      <div className="rule-header">
        <div className="header-icon">{RULE_TYPE_ICONS[rule.type] || "📋"}</div>
        <div className="header-content">
          <div className="header-top">
            <h3 className="rule-title">{displayName}</h3>
            <span className={`rule-badge badge-${rule.type}`}>
              {RULE_TYPE_LABELS[rule.type]}
            </span>
          </div>
          {displayName !== rule.field && (
            <span className="rule-field-code">{rule.field}</span>
          )}
        </div>
        <Switch checked={rule.enabled} onChange={onToggle} />
      </div>

      {rule.enabled && (
        <div className="rule-body">
          <div className="description-section">
            {getRuleSummary(rule) ? (
              <div className="summary-box">
                <span className="summary-icon">💡</span>
                <span className="summary-text">{getRuleSummary(rule)}</span>
              </div>
            ) : (
              <p>{RULE_TYPE_DESCRIPTIONS[rule.type]}</p>
            )}
          </div>

          <div className="settings-section">
            <h4 className="section-label">参数配置</h4>
            {renderParamsEditor()}
          </div>

          <div className="message-section">
            <h4 className="section-label">错误提示</h4>
            <input
              type="text"
              value={rule.message}
              onChange={(e) => onUpdate({ message: e.target.value })}
              className="message-input"
              placeholder="请输入提示信息"
            />
          </div>
        </div>
      )}

      {!rule.enabled && (
        <div className="rule-footer-disabled">
          <p>规则已禁用。启用以编辑配置。</p>
        </div>
      )}
    </div>
  );
}

// 主页面组件
export default function ConfigPage() {
  const [config, setConfig] = useState<ValidationConfig | null>(null);
  const [store, setStore] = useState<ValidationConfigStore | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    const configStore = getValidationConfigStore();
    const loadedConfig = configStore.getConfig();
    setStore(configStore);
    setConfig(loadedConfig);

    // 默认选中第一个模板
    const firstTemplateId = Object.keys(loadedConfig.templates)[0];
    if (firstTemplateId) setSelectedTemplateId(firstTemplateId);
  }, []);

  const templatesList = useMemo(() => {
    if (!config) return [];
    return Object.values(config.templates);
  }, [config]);

  const filteredTemplates = useMemo(() => {
    if (!searchQuery) return templatesList;
    return templatesList.filter((t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [templatesList, searchQuery]);

  const selectedTemplate = useMemo(() => {
    if (!config || !selectedTemplateId) return null;
    return config.templates[selectedTemplateId];
  }, [config, selectedTemplateId]);

  // Actions
  const handleUpdateConfig = (newConfig: ValidationConfig) => {
    if (!store) return;
    store.saveConfig(newConfig);
    setConfig(newConfig);
    showSaveMessage();
  };

  const handleToggleTemplate = (templateName: string, enabled: boolean) => {
    if (!config) return;
    const newConfig = { ...config };
    newConfig.templates[templateName] = {
      ...newConfig.templates[templateName],
      enabled,
    };
    handleUpdateConfig(newConfig);
  };

  const handleUpdateRule = (ruleId: string, updates: Partial<RuleConfig>) => {
    if (!config || !selectedTemplateId) return;
    const newConfig = { ...config };
    const template = newConfig.templates[selectedTemplateId];
    const ruleIndex = template.validationRules.findIndex(
      (r) => r.id === ruleId
    );

    if (ruleIndex >= 0) {
      template.validationRules[ruleIndex] = {
        ...template.validationRules[ruleIndex],
        ...updates,
      };
      handleUpdateConfig(newConfig);
    }
  };

  const handleToggleRule = (ruleId: string, enabled: boolean) => {
    handleUpdateRule(ruleId, { enabled });
  };

  const handleExport = () => store?.exportConfig();

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !store) return;
    try {
      const newConfig = await store.importConfig(file);
      setConfig(newConfig);
      showSaveMessage("导入成功！");
    } catch (error) {
      alert((error as Error).message);
    }
    e.target.value = "";
  };

  const handleReset = () => {
    if (!store) return;
    if (confirm("确定要重置为默认配置吗？")) {
      const defaultConfig = store.resetToDefault();
      setConfig(defaultConfig);
      showSaveMessage("已重置");
    }
  };

  const showSaveMessage = (msg = "已保存") => {
    setSaveMessage(msg);
    setTimeout(() => setSaveMessage(null), 2000);
  };

  if (!config) return <div className="loading">加载中...</div>;

  return (
    <div className="config-container">
      <style jsx>{`
        .config-container {
          display: flex;
          height: 100vh;
          background: #f3f4f6;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            sans-serif;
          overflow: hidden;
        }

        /* 左侧侧边栏 */
        .sidebar {
          width: 300px;
          background: white;
          border-right: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
        }

        .sidebar-header {
          padding: 20px;
          border-bottom: 1px solid #e5e7eb;
        }

        .sidebar-title {
          font-size: 20px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .template-list {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
        }

        .template-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          margin-bottom: 4px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid transparent;
        }

        .template-item:hover {
          background: #f9fafb;
        }

        .template-item.active {
          background: #eef2ff;
          border-color: #c7d2fe;
        }

        .template-item.active .template-name {
          color: #4f46e5;
          font-weight: 600;
        }

        .template-name {
          font-size: 14px;
          color: #374151;
        }

        .template-status {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .status-enabled {
          background: #10b981;
        }
        .status-disabled {
          background: #d1d5db;
        }

        .sidebar-footer {
          padding: 16px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        /* 右侧主要内容区 */
        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: #f9fafb;
        }

        .content-header {
          background: white;
          padding: 24px 32px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-shrink: 0;
        }

        .header-title-area {
          flex: 1;
        }

        .template-title {
          font-size: 24px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .template-desc {
          color: #6b7280;
          font-size: 14px;
          max-width: 600px;
        }

        .rules-container {
          flex: 1;
          overflow-y: auto;
          padding: 32px;
          /* Grid Layout for Rules */
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(450px, 1fr));
          gap: 24px;
          align-content: start;
        }

        .section-title {
          font-size: 16px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 24px;
          grid-column: 1 / -1; /* Title spans full width */
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .section-title::before {
          content: "";
          display: block;
          width: 4px;
          height: 16px;
          background: #4f46e5;
          border-radius: 2px;
        }

        /* 规则卡片样式 */
        .rule-card {
          background: white;
          border-radius: 16px; /* 更大的圆角 */
          margin-bottom: 0px; /* Grid gap handles spacing */
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid #e1e4ea;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02),
            0 2px 4px -1px rgba(0, 0, 0, 0.02);
          overflow: hidden; /* For header bg */
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .rule-card:hover {
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08),
            0 4px 6px -2px rgba(0, 0, 0, 0.04);
          transform: translateY(-2px);
          border-color: #c7d2fe;
        }

        .rule-card.disabled {
          background: #fcfcfc;
          border-color: #f3f4f6;
          box-shadow: none;
          opacity: 0.8;
        }

        /* 头部样式 */
        .rule-header {
          padding: 20px;
          background: #ffffff;
          border-bottom: 1px solid #f3f4f6;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .rule-card.disabled .rule-header {
          background: #fafafa;
        }

        .header-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: #f5f7ff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
          color: #4f46e5;
        }

        .header-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .header-top {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .rule-title {
          font-size: 16px;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
        }

        .rule-badge {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 12px;
          font-weight: 600;
          background: #eff6ff;
          color: #3b82f6;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .rule-field-code {
          font-size: 12px;
          color: #9ca3af;
          font-family: monospace;
        }

        /* 规则主体 */
        .rule-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          flex: 1;
          background: #ffffff;
        }

        .rule-footer-disabled {
          padding: 16px 20px;
          background: #fafafa;
          color: #9ca3af;
          font-size: 13px;
          text-align: center;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .section-label {
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .summary-box {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          background: #fffbeb;
          border: 1px solid #fcd34d;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 0px;
        }

        .summary-icon {
          font-size: 16px;
          line-height: 1.5;
        }

        .summary-text {
          font-size: 13px;
          color: #92400e;
          line-height: 1.6;
          font-weight: 500;
        }

        .description-section p {
          font-size: 13px;
          color: #4b5563;
          line-height: 1.6;
          background: #f9fafb;
          padding: 12px;
          border-radius: 8px;
          margin: 0;
        }

        .settings-section,
        .message-section {
          /* 分隔线效果交给 gap 处理 */
        }

        /* 参数编辑器 */
        .params-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }

        .params-grid.col-2 {
          grid-template-columns: 1fr 1fr;
        }

        .param-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .param-field label {
          font-size: 12px;
          color: #6b7280;
          font-weight: 500;
        }

        .modern-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          color: #1f2937;
          transition: all 0.2s;
          background: #ffffff;
        }

        .modern-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
          outline: none;
        }

        .message-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          color: #4b5563;
          background: #f9fafb;
          transition: all 0.2s;
        }

        .message-input:focus {
          background: #ffffff;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
          outline: none;
        }

        .params-info p {
          font-size: 13px;
          color: #6b7280;
          background: #f0f9ff;
          padding: 10px;
          border-radius: 6px;
          margin: 0;
          border: 1px solid #e0f2fe;
        }

        .no-params {
          font-size: 13px;
          color: #9ca3af;
          font-style: italic;
        }

        /* 按钮样式 */
        .btn {
          width: 100%;
          padding: 10px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .btn-primary {
          background: #4f46e5;
          color: white;
          border: none;
        }
        .btn-primary:hover {
          background: #4338ca;
        }

        .btn-secondary {
          background: white;
          color: #374151;
          border: 1px solid #e5e7eb;
        }
        .btn-secondary:hover {
          background: #f9fafb;
          border-color: #d1d5db;
        }

        .btn-danger {
          background: #fee2e2;
          color: #991b1b;
          border: none;
        }
        .btn-danger:hover {
          background: #fecaca;
        }

        /* Scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }

        .save-toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: #10b981;
          color: white;
          padding: 10px 20px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          animation: fadeUp 0.3s ease;
          z-index: 100;
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          color: #6b7280;
        }
      `}</style>

      {/* 侧边栏 */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-title">
            <span>⚙️ 校验配置</span>
          </div>
          <Link
            href="/"
            className="text-sm text-indigo-600 hover:text-indigo-800 mb-4 block"
            style={{ marginBottom: 16 }}
          >
            ← 返回主页
          </Link>
          <SearchInput value={searchQuery} onChange={setSearchQuery} />
        </div>

        <div className="template-list">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className={`template-item ${
                selectedTemplateId === template.id ? "active" : ""
              }`}
              onClick={() => setSelectedTemplateId(template.id)}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`template-status ${
                    template.enabled ? "status-enabled" : "status-disabled"
                  }`}
                />
                <span className="template-name">{template.name}</span>
              </div>
              <span className="text-xs text-gray-400">
                {template.validationRules.filter((r) => r.enabled).length}规则
              </span>
            </div>
          ))}
          {filteredTemplates.length === 0 && (
            <div className="p-4 text-center text-sm text-gray-400">
              未找到相关模板
            </div>
          )}
        </div>

        <div className="sidebar-footer">
          <button className="btn btn-primary" onClick={handleExport}>
            📤 导出配置
          </button>
          <label className="btn btn-secondary cursor-pointer">
            📥 导入配置
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
              style={{ display: "none" }}
            />
          </label>
          <button className="btn btn-danger" onClick={handleReset}>
            🔄 重置默认
          </button>
        </div>
      </div>

      {/* 右侧主内容 */}
      <div className="main-content">
        {selectedTemplate ? (
          <>
            <div className="content-header">
              <div className="header-title-area">
                <div className="template-title">
                  {selectedTemplate.name}
                  <Switch
                    checked={selectedTemplate.enabled}
                    onChange={(enabled) =>
                      handleToggleTemplate(selectedTemplateId!, enabled)
                    }
                  />
                  {!selectedTemplate.enabled && (
                    <span className="text-sm px-2 py-1 bg-gray-100 text-gray-500 rounded rounded-md font-normal text-sm">
                      已禁用
                    </span>
                  )}
                </div>
                <p className="template-desc">{selectedTemplate.description}</p>
              </div>
            </div>

            <div className="rules-container">
              {!selectedTemplate.enabled ? (
                <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                  <p className="text-gray-500 mb-4">
                    该模板已禁用，启用后可配置规则
                  </p>
                  <button
                    className="btn btn-primary w-auto inline-flex px-6"
                    onClick={() =>
                      handleToggleTemplate(selectedTemplateId!, true)
                    }
                  >
                    启用模板
                  </button>
                </div>
              ) : (
                <>
                  <div className="section-title">
                    校验规则列表 (
                    {
                      selectedTemplate.validationRules.filter((r) => r.enabled)
                        .length
                    }
                    /{selectedTemplate.validationRules.length})
                  </div>
                  {selectedTemplate.validationRules.map((rule) => (
                    <RuleEditor
                      key={rule.id}
                      rule={rule}
                      fieldMappings={selectedTemplate.fieldMappings}
                      onToggle={(enabled) => handleToggleRule(rule.id, enabled)}
                      onUpdate={(updates) => handleUpdateRule(rule.id, updates)}
                    />
                  ))}
                </>
              )}
            </div>
          </>
        ) : (
          <div className="loading">请选择一个任务模板进行配置</div>
        )}
      </div>

      {saveMessage && <div className="save-toast">{saveMessage}</div>}
    </div>
  );
}
