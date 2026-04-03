import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@resvg/resvg-js', 'sharp'],
  webpack: (config) => {
    // pdfjs-dist에서 canvas 모듈을 사용하지 않도록 설정
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
