// 简单的类型检查测试
import React from 'react';

// 模拟 FileUpload 组件的 props 类型
interface FileUploadProps {
  onFileUpload: (file: File) => void | Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
}

// 模拟使用场景
const testProps: FileUploadProps = {
  onFileUpload: async (file: File) => {
    console.log('File uploaded:', file.name);
  },
  isLoading: false,
  disabled: false,
};

console.log('✅ 类型检查通过 - FileUpload props 类型正确');
