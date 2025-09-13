"use client";

import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';

interface UseSessionKeepAliveOptions {
  // 是否启用会话保持
  enabled?: boolean;
  // 刷新间隔（毫秒），默认5分钟
  refreshInterval?: number;
  // 任务开始时的回调
  onTaskStart?: () => void;
  // 任务结束时的回调
  onTaskEnd?: () => void;
}

export function useSessionKeepAlive(options: UseSessionKeepAliveOptions = {}) {
  const {
    enabled = false,
    refreshInterval = 5 * 60 * 1000, // 5分钟
    onTaskStart,
    onTaskEnd,
  } = options;

  const { refreshToken, isAuthenticated } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(false);

  // 开始会话保持
  const startKeepAlive = () => {
    if (!isAuthenticated || isActiveRef.current) return;

    isActiveRef.current = true;
    onTaskStart?.();

    // 立即刷新一次令牌
    refreshToken();

    // 设置定期刷新
    intervalRef.current = setInterval(() => {
      if (isActiveRef.current) {
        refreshToken();
      }
    }, refreshInterval);

    console.log('会话保持已启动，每', refreshInterval / 1000 / 60, '分钟刷新一次令牌');
  };

  // 停止会话保持
  const stopKeepAlive = () => {
    if (!isActiveRef.current) return;

    isActiveRef.current = false;
    onTaskEnd?.();

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    console.log('会话保持已停止');
  };

  // 检查是否正在保持会话
  const isKeepAliveActive = () => isActiveRef.current;

  // 当enabled状态改变时，自动开始或停止会话保持
  useEffect(() => {
    if (enabled && isAuthenticated) {
      startKeepAlive();
    } else {
      stopKeepAlive();
    }

    return () => {
      stopKeepAlive();
    };
  }, [enabled, isAuthenticated]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      stopKeepAlive();
    };
  }, []);

  return {
    startKeepAlive,
    stopKeepAlive,
    isKeepAliveActive,
  };
}
