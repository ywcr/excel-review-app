"use client";

// 用户中心页面

import { useAuth } from '@/hooks/useAuth';
import AuthGuard from '@/components/auth/AuthGuard';
import UserMenu from '@/components/auth/UserMenu';

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        {/* 顶部导航 */}
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">
                  用户中心
                </h1>
              </div>
              <UserMenu />
            </div>
          </div>
        </nav>

        {/* 主要内容 */}
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">个人信息</h2>
            </div>
            
            <div className="px-6 py-4 space-y-6">
              {/* 用户头像 */}
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-medium">
                  {user?.name ? user.name.charAt(0).toUpperCase() : '用'}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {user?.name || '用户'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    用户ID: {user?.id}
                  </p>
                </div>
              </div>

              {/* 基本信息 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    手机号
                  </label>
                  <div className="mt-1 text-sm text-gray-900">
                    {user?.phone ? user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '未绑定'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    登录方式
                  </label>
                  <div className="mt-1 text-sm text-gray-900">
                    手机验证码
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    注册时间
                  </label>
                  <div className="mt-1 text-sm text-gray-900">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleString() : '未知'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    最后登录
                  </label>
                  <div className="mt-1 text-sm text-gray-900">
                    {user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '未知'}
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex space-x-4 pt-6 border-t border-gray-200">
                <button
                  onClick={() => window.location.href = '/'}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  返回首页
                </button>
              </div>
            </div>
          </div>

          {/* 功能说明 */}
          <div className="mt-8 bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">系统功能</h2>
            </div>
            
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Excel 文件验证</h3>
                    <p className="text-sm text-gray-500">支持多种任务类型的Excel文件格式验证</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">前端验证</h3>
                    <p className="text-sm text-gray-500">本地验证，更快更安全</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">错误报告</h3>
                    <p className="text-sm text-gray-500">详细的错误信息和导出功能</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">安全认证</h3>
                    <p className="text-sm text-gray-500">手机验证码登录，保障账户安全</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
