"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "./useAuth";

interface UseSessionKeepAliveOptions {
  // 是否启用会话保持
  enabled?: boolean;
  // 刷新间隔（毫秒），默认5分钟
  refreshInterval?: number;
  // 任务结束后延续保持时间（毫秒），默认10分钟
  extendedKeepAliveTime?: number;
  // 任务开始时的回调
  onTaskStart?: () => void;
  // 任务结束时的回调
  onTaskEnd?: () => void;
}

export function useSessionKeepAlive(options: UseSessionKeepAliveOptions = {}) {
  const {
    enabled = false,
    refreshInterval = 5 * 60 * 1000, // 5分钟
    extendedKeepAliveTime = 10 * 60 * 1000, // 10分钟
    onTaskStart,
    onTaskEnd,
  } = options;

  const { refreshToken, isAuthenticated } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const extendedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(false);
  const isExtendedRef = useRef(false);

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

    console.log(
      "会话保持已启动，每",
      refreshInterval / 1000 / 60,
      "分钟刷新一次令牌"
    );
  };

  // 停止会话保持（支持延续保持）
  const stopKeepAlive = (immediate: boolean = false) => {
    if (!isActiveRef.current) return;

    isActiveRef.current = false;
    onTaskEnd?.();

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (immediate || !extendedKeepAliveTime) {
      // 立即停止
      if (extendedTimeoutRef.current) {
        clearTimeout(extendedTimeoutRef.current);
        extendedTimeoutRef.current = null;
      }
      isExtendedRef.current = false;
      console.log("会话保持已停止");
    } else {
      // 延续保持一段时间
      isExtendedRef.current = true;
      console.log(
        `任务结束，延续会话保持 ${extendedKeepAliveTime / 1000 / 60} 分钟`
      );

      // 设置延续保持的定时器
      intervalRef.current = setInterval(() => {
        if (isExtendedRef.current) {
          refreshToken();
        }
      }, refreshInterval);

      // 设置延续结束的定时器
      extendedTimeoutRef.current = setTimeout(() => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        isExtendedRef.current = false;
        console.log("延续会话保持已结束");
      }, extendedKeepAliveTime);
    }
  };

  // 检查是否正在保持会话（包括延续保持）
  const isKeepAliveActive = () => isActiveRef.current || isExtendedRef.current;

  // 立即停止所有会话保持
  const forceStopKeepAlive = () => {
    stopKeepAlive(true);
  };

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
      forceStopKeepAlive();
    };
  }, []);

  return {
    startKeepAlive,
    stopKeepAlive,
    forceStopKeepAlive,
    isKeepAliveActive,
  };
}
