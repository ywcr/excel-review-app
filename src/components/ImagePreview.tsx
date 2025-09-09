"use client";

import { useState, useEffect } from "react";

interface ImagePreviewProps {
  imageData: Uint8Array;
  mimeType: string;
  imageId: string;
  className?: string;
}

export function ImagePreview({
  imageData,
  mimeType,
  imageId,
  className = "",
}: ImagePreviewProps) {
  const [imageUrl, setImageUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    try {
      const blob = new Blob([imageData], { type: mimeType });
      const url = URL.createObjectURL(blob);
      setImageUrl(url);
      setLoading(false);

      return () => {
        URL.revokeObjectURL(url);
      };
    } catch (err) {
      setError("图片加载失败");
      setLoading(false);
    }
  }, [imageData, mimeType]);

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded ${className}`}
      >
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-red-50 text-red-600 text-sm rounded ${className}`}
      >
        {error}
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={`图片 ${imageId}`}
      className={`object-contain border rounded ${className}`}
      onError={() => setError("图片显示失败")}
    />
  );
}

interface ImageModalProps {
  imageData: Uint8Array;
  mimeType: string;
  imageId: string;
  position?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageModal({
  imageData,
  mimeType,
  imageId,
  position,
  isOpen,
  onClose,
}: ImageModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="text-lg font-semibold">图片详情</h3>
            <p className="text-sm text-gray-600">
              {imageId} {position && `(${position})`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="p-4 max-h-[70vh] overflow-auto">
          <ImagePreview
            imageData={imageData}
            mimeType={mimeType}
            imageId={imageId}
            className="max-w-full max-h-full"
          />
        </div>
      </div>
    </div>
  );
}

// 添加懒加载支持
interface LazyImagePreviewProps extends ImagePreviewProps {
  lazy?: boolean;
}

export function LazyImagePreview({
  lazy = true,
  ...props
}: LazyImagePreviewProps) {
  const [shouldLoad, setShouldLoad] = useState(!lazy);

  if (!shouldLoad) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 cursor-pointer rounded ${props.className}`}
        onClick={() => setShouldLoad(true)}
      >
        <div className="text-center">
          <svg
            className="w-8 h-8 mx-auto text-gray-400 mb-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-xs text-gray-500">点击加载</p>
        </div>
      </div>
    );
  }

  return <ImagePreview {...props} />;
}
