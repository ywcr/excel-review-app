"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// 动画配置接口
interface AnimationConfig {
  enabled: boolean;
  reducedMotion: boolean;
  performanceMode: boolean; // 大文件处理时自动启用
}

// 动画上下文
const AnimationContext = createContext<{
  config: AnimationConfig;
  updateConfig: (updates: Partial<AnimationConfig>) => void;
}>({
  config: { enabled: true, reducedMotion: false, performanceMode: false },
  updateConfig: () => {},
});

// 动画提供者组件
export function AnimationProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AnimationConfig>({
    enabled: true,
    reducedMotion: false,
    performanceMode: false,
  });

  // 检测用户的动画偏好
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setConfig(prev => ({ ...prev, reducedMotion: mediaQuery.matches }));

    const handleChange = (e: MediaQueryListEvent) => {
      setConfig(prev => ({ ...prev, reducedMotion: e.matches }));
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const updateConfig = (updates: Partial<AnimationConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  // 应用CSS变量到根元素
  useEffect(() => {
    const root = document.documentElement;
    const shouldAnimate = config.enabled && !config.reducedMotion && !config.performanceMode;
    
    root.style.setProperty('--animation-enabled', shouldAnimate ? '1' : '0');
    root.style.setProperty('--animation-duration', shouldAnimate ? '0.3s' : '0s');
    root.style.setProperty('--animation-timing', 'cubic-bezier(0.4, 0, 0.2, 1)');
  }, [config]);

  return (
    <AnimationContext.Provider value={{ config, updateConfig }}>
      {children}
    </AnimationContext.Provider>
  );
}

// 使用动画配置的Hook
export function useAnimations() {
  return useContext(AnimationContext);
}

// 温馨渐变背景组件
export function GentleGradientBackground({ children, className = "" }: { 
  children: ReactNode; 
  className?: string; 
}) {
  return (
    <div className={`gentle-gradient-bg ${className}`}>
      {children}
      <style jsx>{`
        .gentle-gradient-bg {
          background: linear-gradient(
            135deg,
            #fef7f0 0%,
            #fdf2f8 25%,
            #f0f9ff 50%,
            #f7fee7 75%,
            #fef7f0 100%
          );
          background-size: 400% 400%;
          animation: gentleGradient calc(var(--animation-duration, 0.3s) * 20) ease-in-out infinite;
          transition: all var(--animation-duration, 0.3s) var(--animation-timing, ease);
        }

        @keyframes gentleGradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @media (prefers-reduced-motion: reduce) {
          .gentle-gradient-bg {
            animation: none;
            background: #fefefe;
          }
        }
      `}</style>
    </div>
  );
}

// 温馨按钮组件
export function WarmButton({ 
  children, 
  onClick, 
  disabled = false, 
  variant = 'primary',
  className = "",
  ...props 
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'success';
  className?: string;
  [key: string]: any;
}) {
  const baseClasses = "warm-button transition-all duration-300 ease-out";
  const variantClasses = {
    primary: "warm-button-primary",
    secondary: "warm-button-secondary", 
    success: "warm-button-success"
  };

  return (
    <>
      <button
        className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        onClick={onClick}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
      <style jsx>{`
        .warm-button {
          position: relative;
          overflow: hidden;
          border-radius: 12px;
          padding: 12px 24px;
          font-weight: 500;
          border: none;
          cursor: pointer;
          transform: translateY(0);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .warm-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        }

        .warm-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .warm-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .warm-button-primary {
          background: linear-gradient(135deg, #ec4899 0%, #f97316 100%);
          color: white;
        }

        .warm-button-primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #db2777 0%, #ea580c 100%);
        }

        .warm-button-secondary {
          background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%);
          color: white;
        }

        .warm-button-secondary:hover:not(:disabled) {
          background: linear-gradient(135deg, #7c3aed 0%, #0891b2 100%);
        }

        .warm-button-success {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }

        .warm-button-success:hover:not(:disabled) {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
        }

        @media (prefers-reduced-motion: reduce) {
          .warm-button {
            transition: none;
            transform: none !important;
          }
        }
      `}</style>
    </>
  );
}

// 温馨进度条组件
export function WarmProgressBar({ 
  progress, 
  message = "", 
  className = "" 
}: { 
  progress: number; 
  message?: string; 
  className?: string; 
}) {
  return (
    <div className={`warm-progress-container ${className}`}>
      {message && (
        <div className="warm-progress-message">
          {message}
        </div>
      )}
      <div className="warm-progress-track">
        <div 
          className="warm-progress-fill"
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        />
        <div className="warm-progress-glow" />
      </div>
      <style jsx>{`
        .warm-progress-container {
          width: 100%;
        }

        .warm-progress-message {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 8px;
          text-align: center;
        }

        .warm-progress-track {
          position: relative;
          height: 8px;
          background: #f3f4f6;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .warm-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #ec4899, #f97316, #10b981);
          border-radius: 12px;
          transition: width var(--animation-duration, 0.3s) var(--animation-timing, ease);
          position: relative;
        }

        .warm-progress-glow {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          animation: progressGlow 2s ease-in-out infinite;
          border-radius: 12px;
        }

        @keyframes progressGlow {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @media (prefers-reduced-motion: reduce) {
          .warm-progress-fill {
            transition: none;
          }
          .warm-progress-glow {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

// 成功动画组件
export function SuccessAnimation({ 
  show, 
  message = "完成！", 
  onComplete 
}: { 
  show: boolean; 
  message?: string; 
  onComplete?: () => void; 
}) {
  useEffect(() => {
    if (show && onComplete) {
      const timer = setTimeout(onComplete, 2000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div className="success-animation">
      <div className="success-content">
        <div className="success-icon">✨</div>
        <div className="success-message">{message}</div>
      </div>
      <style jsx>{`
        .success-animation {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 1000;
          animation: successFadeIn var(--animation-duration, 0.3s) var(--animation-timing, ease) forwards;
        }

        .success-content {
          background: white;
          padding: 24px 32px;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          text-align: center;
          border: 2px solid #10b981;
        }

        .success-icon {
          font-size: 48px;
          margin-bottom: 12px;
          animation: successBounce 0.6s var(--animation-timing, ease) infinite alternate;
        }

        .success-message {
          font-size: 18px;
          font-weight: 500;
          color: #10b981;
        }

        @keyframes successFadeIn {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @keyframes successBounce {
          from { transform: scale(1); }
          to { transform: scale(1.1); }
        }

        @media (prefers-reduced-motion: reduce) {
          .success-animation {
            animation: none;
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          .success-icon {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
