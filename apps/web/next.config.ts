import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@fin/core', '@fin/logger'],
  serverExternalPackages: ['pino', 'pino-pretty'],
}

export default nextConfig
