"use client";

// 用户菜单组件

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, signout } = useAuth();
  const router = useRouter();

  // 点击外部关闭菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await signout();
      router.push('/auth/signin');
    } catch (error) {
      console.error('退出登录失败:', error);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* 用户头像/按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md p-2"
      >
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
          {user.name ? user.name.charAt(0).toUpperCase() : '用'}
        </div>
        <span className="hidden sm:block text-sm font-medium">
          {user.name || '用户'}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1">
            {/* 用户信息 */}
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900">
                {user.name || '用户'}
              </p>
              {user.phone && (
                <p className="text-xs text-gray-500">
                  {user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
                </p>
              )}
            </div>

            {/* 菜单项 */}
            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/auth/profile');
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              个人中心
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                handleSignOut();
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              退出登录
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
