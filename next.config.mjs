/** @type {import('next').NextConfig} */
const nextConfig = {
  // 确保静态文件被正确处理
  serverExternalPackages: ["sharp", "jimp"],

  // 配置 webpack 以处理二进制文件和依赖问题
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        sharp: "commonjs sharp",
        jimp: "commonjs jimp",
        // 外部化有问题的依赖
        glob: "commonjs glob",
        archiver: "commonjs archiver",
      });
    }

    // 处理 .xlsx 文件
    config.module.rules.push({
      test: /\.(xlsx|xls)$/,
      type: "asset/resource",
      generator: {
        filename: "static/data/[name][ext]",
      },
    });

    // 忽略有问题的模块
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
    };

    return config;
  },

  // 确保 API 路由有足够的内存
  serverRuntimeConfig: {
    maxRequestSize: "10mb",
  },
};

export default nextConfig;
