"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAnimations } from '@/components/LightweightAnimations';

interface PerformanceMetrics {
  imageCount: number;
  isProcessing: boolean;
  memoryUsage?: number;
  processingTime?: number;
}

// 性能监控Hook
export function usePerformanceMode() {
  const { config, updateConfig } = useAnimations();
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    imageCount: 0,
    isProcessing: false,
  });

  // 自动性能模式阈值
  const PERFORMANCE_THRESHOLDS = {
    imageCount: 50, // 超过50张图片启用性能模式
    memoryUsage: 500 * 1024 * 1024, // 500MB内存使用
  };

  // 更新性能指标
  const updateMetrics = useCallback((newMetrics: Partial<PerformanceMetrics>) => {
    setMetrics(prev => ({ ...prev, ...newMetrics }));
  }, []);

  // 检查是否应该启用性能模式
  const shouldEnablePerformanceMode = useCallback(() => {
    // 图片数量超过阈值
    if (metrics.imageCount > PERFORMANCE_THRESHOLDS.imageCount) {
      return true;
    }

    // 内存使用超过阈值
    if (metrics.memoryUsage && metrics.memoryUsage > PERFORMANCE_THRESHOLDS.memoryUsage) {
      return true;
    }

    // 正在处理大量数据
    if (metrics.isProcessing && metrics.imageCount > 20) {
      return true;
    }

    return false;
  }, [metrics]);

  // 自动切换性能模式
  useEffect(() => {
    const performanceMode = shouldEnablePerformanceMode();
    
    if (performanceMode !== config.performanceMode) {
      updateConfig({ performanceMode });
      
      // 可选：通知用户性能模式变化
      if (performanceMode) {
        console.log('🚀 启用性能模式：动画已自动禁用以优化大文件处理');
      } else {
        console.log('✨ 恢复动画模式：处理完成，动画效果已恢复');
      }
    }
  }, [shouldEnablePerformanceMode, config.performanceMode, updateConfig]);

  // 监控内存使用（如果可用）
  useEffect(() => {
    const monitorMemory = () => {
      if ('memory' in performance) {
        const memoryInfo = (performance as any).memory;
        updateMetrics({ memoryUsage: memoryInfo.usedJSHeapSize });
      }
    };

    // 每5秒检查一次内存使用
    const interval = setInterval(monitorMemory, 5000);
    return () => clearInterval(interval);
  }, [updateMetrics]);

  return {
    metrics,
    updateMetrics,
    performanceMode: config.performanceMode,
    isAnimationEnabled: config.enabled && !config.reducedMotion && !config.performanceMode,
  };
}

// 性能友好的组件包装器 - 暂时移除以避免编译错误
// export function withPerformanceMode<T extends object>(
//   Component: React.ComponentType<T>
// ) {
//   return function PerformanceAwareComponent(props: T) {
//     const { isAnimationEnabled } = usePerformanceMode();
//
//     return (
//       <div
//         className={isAnimationEnabled ? 'animations-enabled' : 'animations-disabled'}
//         style={{
//           '--animation-enabled': isAnimationEnabled ? '1' : '0',
//           '--animation-duration': isAnimationEnabled ? '0.3s' : '0s',
//         } as React.CSSProperties}
//       >
//         <Component {...props} />
//       </div>
//     );
//   };
// }
