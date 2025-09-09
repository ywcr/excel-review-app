"use client";

// 认证状态管理 Hook

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, AuthResponse, SendCodeResponse } from '@/lib/auth/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signin: (phone: string, code: string, forceLogout?: boolean) => Promise<void>;
  signout: () => Promise<void>;
  sendCode: (phone: string) => Promise<SendCodeResponse>;
  adminLogin: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 获取当前用户信息
  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });

      if (response.ok) {
        const data: AuthResponse = await response.json();
        if (data.success && data.user) {
          setUser({
            id: data.user.id,
            phone: data.user.phone,
            name: data.user.name,
            avatar: data.user.avatar,
            tokenVersion: 1, // 前端不需要真实的tokenVersion
            createdAt: '',
            lastLoginAt: '',
          });
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // 发送验证码
  const sendCode = async (phone: string): Promise<SendCodeResponse> => {
    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone }),
      });

      const data: SendCodeResponse = await response.json();
      return data;
    } catch (error) {
      console.error('发送验证码失败:', error);
      return {
        success: false,
        message: '网络错误，请稍后重试',
      };
    }
  };

  // 用户登录
  const signin = async (phone: string, code: string, forceLogout = false) => {
    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ phone, code, forceLogout }),
      });

      const data: AuthResponse = await response.json();

      if (data.success && data.user) {
        setUser({
          id: data.user.id,
          phone: data.user.phone,
          name: data.user.name,
          avatar: data.user.avatar,
          tokenVersion: 1,
          createdAt: '',
          lastLoginAt: '',
        });
      } else {
        throw new Error(data.message || '登录失败');
      }
    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    }
  };

  // 管理员登录
  const adminLogin = async () => {
    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ adminLogin: true }),
      });

      const data: AuthResponse = await response.json();

      if (data.success && data.user) {
        setUser({
          id: data.user.id,
          phone: data.user.phone,
          name: data.user.name,
          avatar: data.user.avatar,
          tokenVersion: 1,
          createdAt: '',
          lastLoginAt: '',
        });
      } else {
        throw new Error(data.message || '管理员登录失败');
      }
    } catch (error) {
      console.error('管理员登录失败:', error);
      throw error;
    }
  };

  // 用户退出
  const signout = async () => {
    try {
      await fetch('/api/auth/signout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('退出登录失败:', error);
    } finally {
      setUser(null);
    }
  };

  // 刷新用户信息
  const refreshUser = async () => {
    await fetchUser();
  };

  // 初始化时获取用户信息
  useEffect(() => {
    fetchUser();
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signin,
    signout,
    sendCode,
    adminLogin,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
