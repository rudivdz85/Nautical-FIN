import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@fin/core', '@fin/logger'],
}

export default nextConfig
