"use client";

import { useState, useEffect } from "react";

interface AtmosphereSettings {
  enableAnimations: boolean;
  enableParticles: boolean;
  enableSounds: boolean;
  theme: "default" | "romantic" | "cute" | "professional";
}

const defaultSettings: AtmosphereSettings = {
  enableAnimations: true,
  enableParticles: true,
  enableSounds: true,
  theme: "cute",
};

export function useAtmosphereSettings() {
  const [settings, setSettings] = useState<AtmosphereSettings>(defaultSettings);

  useEffect(() => {
    const saved = localStorage.getItem("atmosphereSettings");
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (error) {
        console.warn("Failed to parse atmosphere settings:", error);
      }
    }
  }, []);

  const updateSettings = (newSettings: Partial<AtmosphereSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem("atmosphereSettings", JSON.stringify(updated));
  };

  return { settings, updateSettings };
}

interface AtmosphereSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AtmosphereSettings({
  isOpen,
  onClose,
}: AtmosphereSettingsProps) {
  const { settings, updateSettings } = useAtmosphereSettings();

  if (!isOpen) return null;

  const themes = [
    { id: "default", name: "默认", emoji: "💼" },
    { id: "romantic", name: "浪漫", emoji: "💕" },
    { id: "cute", name: "可爱", emoji: "🌸" },
    { id: "professional", name: "专业", emoji: "⚡" },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            ✨ 氛围设置
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          {/* 主题选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              🎨 主题风格
            </label>
            <div className="grid grid-cols-2 gap-2">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => updateSettings({ theme: theme.id as any })}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    settings.theme === theme.id
                      ? "border-pink-500 bg-pink-50"
                      : "border-gray-200 hover:border-pink-300"
                  }`}
                >
                  <div className="text-lg mb-1">{theme.emoji}</div>
                  <div className="text-sm font-medium">{theme.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 功能开关 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                🎭 动画效果
              </label>
              <button
                onClick={() =>
                  updateSettings({
                    enableAnimations: !settings.enableAnimations,
                  })
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.enableAnimations ? "bg-pink-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.enableAnimations
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                ✨ 粒子特效
              </label>
              <button
                onClick={() =>
                  updateSettings({ enableParticles: !settings.enableParticles })
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.enableParticles ? "bg-pink-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.enableParticles ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                🎵 提示音效
              </label>
              <button
                onClick={() =>
                  updateSettings({ enableSounds: !settings.enableSounds })
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.enableSounds ? "bg-pink-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.enableSounds ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 说明文字 */}
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
            💡 这些设置会让您的使用体验更加愉悦！可以随时调整。
          </div>
        </div>
      </div>
    </div>
  );
}
