"use client";

// 登录表单组件

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function LoginForm() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const { signin, sendCode, adminLogin } = useAuth();
  const router = useRouter();

  // 倒计时效果
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 验证手机号格式
  const isValidPhone = (phone: string) => {
    return /^1[3-9]\d{9}$/.test(phone);
  };

  // 发送验证码
  const handleSendCode = async () => {
    if (!isValidPhone(phone)) {
      setError('请输入正确的手机号');
      return;
    }

    setIsSendingCode(true);
    setError('');

    try {
      const result = await sendCode(phone);
      
      if (result.success) {
        setMessage('验证码已发送');
        setCountdown(60);
      } else {
        setError(result.message);
        if (result.cooldown) {
          setCountdown(result.cooldown);
        }
      }
    } catch (error) {
      setError('发送验证码失败，请稍后重试');
    } finally {
      setIsSendingCode(false);
    }
  };

  // 用户登录
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidPhone(phone)) {
      setError('请输入正确的手机号');
      return;
    }

    if (!code || code.length !== 6) {
      setError('请输入6位验证码');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await signin(phone, code);
      router.push('/');
    } catch (error) {
      setError(error instanceof Error ? error.message : '登录失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 管理员登录
  const handleAdminLogin = async () => {
    setIsLoading(true);
    setError('');

    try {
      await adminLogin();
      router.push('/');
    } catch (error) {
      setError(error instanceof Error ? error.message : '管理员登录失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            登录到 Excel 审核系统
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            使用手机验证码快速登录
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            {/* 手机号输入 */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                手机号
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="请输入手机号"
                maxLength={11}
              />
            </div>

            {/* 验证码输入 */}
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                验证码
              </label>
              <div className="mt-1 flex space-x-2">
                <input
                  id="code"
                  name="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="flex-1 appearance-none relative block px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="请输入验证码"
                  maxLength={6}
                />
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={!isValidPhone(phone) || isSendingCode || countdown > 0}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSendingCode ? '发送中...' : countdown > 0 ? `${countdown}s` : '发送验证码'}
                </button>
              </div>
            </div>
          </div>

          {/* 错误信息 */}
          {error && (
            <div className="text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          {/* 成功信息 */}
          {message && (
            <div className="text-green-600 text-sm text-center">
              {message}
            </div>
          )}

          {/* 登录按钮 */}
          <div>
            <button
              type="submit"
              disabled={isLoading || !isValidPhone(phone) || code.length !== 6}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  登录中...
                </>
              ) : (
                '登录'
              )}
            </button>
          </div>

          {/* 管理员登录 */}
          <div className="text-center">
            <button
              type="button"
              onClick={handleAdminLogin}
              disabled={isLoading}
              className="text-sm text-blue-600 hover:text-blue-500 underline"
            >
              管理员直接登录
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
