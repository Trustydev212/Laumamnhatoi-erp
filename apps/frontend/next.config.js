/** @type {import('next').NextConfig} */
const nextConfig = {
  // Force App Router - disable Pages Router
  distDir: '.next',
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client']
  },
  // Disable static export errors - allow build to complete
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Cấu hình cho ngrok
  allowedDevOrigins: [
    'ungained-larissa-ligniform.ngrok-free.dev',
    'localhost:3000'
  ],
  webpack: (config, { isServer, dev }) => {
    if (isServer) {
      config.externals.push('@prisma/client')
    }
    
    // Sửa Fast Refresh issues với ngrok
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      }
    }
    
    return config
  },
          // Cấu hình cho ngrok - Proxy API calls only (not frontend routes)
          async rewrites() {
            return [
              {
                source: '/api/:path*',
                destination: 'http://localhost:3001/api/:path*',
              },
              // Only proxy actual API endpoints, not frontend routes
              // Frontend routes like /login, /dashboard, /pos are handled by App Router
            ]
          },
  
  // Cấu hình cho Hot Module Replacement
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // Cấu hình headers cho ngrok
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig