"use client";

import { useState, useEffect } from "react";
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
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const router = useRouter();

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
        });
        return true;
      } else if (response.status === 401) {
        // 401错误表示会话已失效，立即重定向到登录页面
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
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
        });
      } else if (response.status === 401) {
        // 尝试刷新令牌
        const refreshed = await refreshToken();
        if (!refreshed) {
          // refreshToken 函数已经处理了重定向，这里只需要设置状态
          setAuthState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      } else {
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    } catch (error) {
      console.error("检查认证状态失败:", error);
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
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
      });

      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("登出失败:", error);
    }
  };

  // 组件挂载时检查认证状态
  useEffect(() => {
    checkAuth();
  }, []);

  // 定期刷新令牌（每20分钟检查一次）
  useEffect(() => {
    if (authState.isAuthenticated) {
      const interval = setInterval(() => {
        refreshToken();
      }, 20 * 60 * 1000); // 20分钟

      return () => clearInterval(interval);
    }
  }, [authState.isAuthenticated]);

  return {
    ...authState,
    logout,
    checkAuth,
    refreshToken,
  };
}
