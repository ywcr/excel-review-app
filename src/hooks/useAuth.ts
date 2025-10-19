"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  username: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sessionExpiryWarning: boolean; // 会话即将过期警告
  lastActivity: number; // 最后活动时间
}

// 会话配置
const SESSION_CONFIG = {
  HEARTBEAT_INTERVAL: 15 * 60 * 1000, // 15分钟心跳检测（从5分钟延长到15分钟）
  ACTIVITY_TIMEOUT: 24 * 60 * 60 * 1000, // 24小时无活动超时（从30分钟延长到24小时）
  EXPIRY_WARNING_TIME: 30 * 60 * 1000, // 剩余30分钟时提醒（从5分钟延长到30分钟）
};

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    sessionExpiryWarning: false,
    lastActivity: Date.now(),
  });

  const router = useRouter();
  
  // 🚀 认证检查缓存：避免短时间内重复检查
  const lastAuthCheckRef = useRef<number>(0);
  const AUTH_CACHE_DURATION = 30 * 1000; // 30秒内复用认证状态

  // 刷新令牌
  const refreshToken = async (): Promise<boolean> => {
    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setAuthState({
          user: data.user,
          isLoading: false,
          isAuthenticated: true,
          sessionExpiryWarning: false,
          lastActivity: Date.now(),
        });
        return true;
      } else if (response.status === 401) {
        // 401错误表示会话已失效，立即重定向到登录页面
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          sessionExpiryWarning: false,
          lastActivity: Date.now(),
        });
        router.push("/login?message=session_expired");
        return false;
      } else {
        return false;
      }
    } catch (error) {
      console.error("刷新令牌失败:", error);
      return false;
    }
  };

  // 检查认证状态
  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setAuthState({
          user: data.user,
          isLoading: false,
          isAuthenticated: true,
          sessionExpiryWarning: false,
          lastActivity: Date.now(),
        });
      } else if (response.status === 401) {
        // 尝试刷新令牌
        // const refreshed = await refreshToken();
        // if (!refreshed) {
        //   // refreshToken 函数已经处理了重定向，这里只需要设置状态
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          sessionExpiryWarning: false,
          lastActivity: Date.now(),
        });
        router.push("/login?message=session_expired");
        // }
      } else {
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          sessionExpiryWarning: false,
          lastActivity: Date.now(),
        });
      }
    } catch (error) {
      console.error("检查认证状态失败:", error);
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        sessionExpiryWarning: false,
        lastActivity: Date.now(),
      });
    }
  };

  // 登出
  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        sessionExpiryWarning: false,
        lastActivity: Date.now(),
      });

      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("登出失败:", error);
    }
  };

  // 更新活动时间
  const updateActivity = () => {
    setAuthState((prev) => ({
      ...prev,
      lastActivity: Date.now(),
      sessionExpiryWarning: false, // 有活动时清除警告
    }));
  };

  // 组件挂载时检查认证状态
  useEffect(() => {
    checkAuth();

    // 添加全局活动监听器
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    const handleActivity = () => {
      updateActivity();
    };

    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, []);

  // 心跳检测和活动超时检测
  useEffect(() => {
    if (!authState.isAuthenticated) return;

    // 定期心跳检测
    const heartbeatInterval = setInterval(
      async () => {
        console.log("[AUTH] 执行心跳检测");
        try {
          const response = await fetch("/api/auth/me", {
            credentials: "include",
          });

          if (!response.ok) {
            console.warn("[AUTH] 会话已失效");
            setAuthState({
              user: null,
              isLoading: false,
              isAuthenticated: false,
              sessionExpiryWarning: false,
              lastActivity: Date.now(),
            });
            router.push("/login?message=session_expired");
          }
        } catch (error) {
          console.error("[AUTH] 心跳检测失败:", error);
        }
      },
      SESSION_CONFIG.HEARTBEAT_INTERVAL
    );

    // 活动超时检测
    const activityCheckInterval = setInterval(() => {
      const timeSinceLastActivity = Date.now() - authState.lastActivity;

      // 如果接近超时，显示警告
      if (
        timeSinceLastActivity >=
        SESSION_CONFIG.ACTIVITY_TIMEOUT - SESSION_CONFIG.EXPIRY_WARNING_TIME
      ) {
        if (!authState.sessionExpiryWarning) {
          console.warn("[AUTH] 会话即将过期，显示警告");
          setAuthState((prev) => ({
            ...prev,
            sessionExpiryWarning: true,
          }));
        }
      }

      // 如果超时，登出
      if (timeSinceLastActivity >= SESSION_CONFIG.ACTIVITY_TIMEOUT) {
        console.warn("[AUTH] 会话超时，自动登出");
        logout();
      }
    }, 60 * 1000); // 每分钟检查一次

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(activityCheckInterval);
    };
  }, [authState.isAuthenticated, authState.lastActivity]);

  // 🚀 优化后的认证检查：使用本地缓存和节流机制
  const ensureAuthenticated = async (): Promise<boolean> => {
    // 1. 首先检查本地认证状态
    if (!authState.isAuthenticated) {
      console.log("[AUTH] 用户未认证");
      return false;
    }

    // 2. 检查最近活动时间，如果最近有活动则信任当前状态
    const timeSinceLastActivity = Date.now() - authState.lastActivity;
    if (timeSinceLastActivity < 5 * 60 * 1000) { // 5分钟内有活动
      // 更新活动时间
      updateActivity();
      console.log("[AUTH] 最近有活动，信任当前认证状态");
      return true;
    }

    // 3. 节流：避免短时间内重复检查
    const now = Date.now();
    if (now - lastAuthCheckRef.current < AUTH_CACHE_DURATION) {
      console.log("[AUTH] 使用缓存的认证状态（30秒内已检查）");
      updateActivity();
      return true;
    }

    // 4. 如果距离上次活动较久，发起快速验证
    console.log("[AUTH] 发起后台认证验证");
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });

      lastAuthCheckRef.current = now;

      if (response.ok) {
        console.log("[AUTH] 认证状态有效");
        updateActivity();
        return true;
      } else {
        console.warn("[AUTH] 认证状态失效");
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          sessionExpiryWarning: false,
          lastActivity: Date.now(),
        });
        router.push("/login?message=session_expired");
        return false;
      }
    } catch (error) {
      console.error("[AUTH] 会话验证失败:", error);
      // 网络错误时，如果本地状态仍然有效，允许继续
      // 避免因临时网络问题阻止用户操作
      console.warn("[AUTH] 网络错误，信任本地状态");
      return authState.isAuthenticated;
    }
  };

  // 延长会话（用户主动请求）
  const extendSession = async () => {
    console.log("[AUTH] 用户请求延长会话");
    updateActivity();
    const success = await refreshToken();
    if (success) {
      console.log("[AUTH] 会话延长成功");
    }
    return success;
  };

  return {
    ...authState,
    logout,
    checkAuth,
    refreshToken,
    ensureAuthenticated,
    updateActivity,
    extendSession,
  };
}
