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
        // const refreshed = await refreshToken();
        // if (!refreshed) {
        //   // refreshToken 函数已经处理了重定向，这里只需要设置状态
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
        router.push("/login?message=session_expired");
        // }
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

  // 移除自动令牌刷新 - 持久化会话管理
  // 不再需要定期刷新令牌，会话将持续到用户主动登出或账户被删除
  // useEffect(() => {
  //   if (authState.isAuthenticated) {
  //     const interval = setInterval(() => {
  //       refreshToken();
  //     }, 30 * 60 * 1000); // 30分钟
  //
  //     return () => clearInterval(interval);
  //   }
  // }, [authState.isAuthenticated]);

  // 验证前检查登录状态（简化版 - 持久化会话管理）
  const ensureAuthenticated = async (): Promise<boolean> => {
    if (!authState.isAuthenticated) {
      console.log("用户未认证");
      return false;
    }

    // 简单检查当前认证状态，不进行令牌刷新
    // 持久化会话下，只需要验证用户仍然登录即可
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (response.ok) {
        console.log("用户认证状态有效");
        return true;
      } else {
        console.log("用户认证状态无效");
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
        router.push("/login?message=session_expired");
        return false;
      }
    } catch (error) {
      console.error("会话验证失败:", error);
      return false;
    }
  };

  return {
    ...authState,
    logout,
    checkAuth,
    refreshToken,
    ensureAuthenticated,
  };
}
