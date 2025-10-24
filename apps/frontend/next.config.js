/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client']
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
          // Cấu hình cho ngrok - Proxy API calls
          async rewrites() {
            return [
              {
                source: '/api/:path*',
                destination: 'http://localhost:3001/:path*',
              },
              {
                source: '/auth/:path*',
                destination: 'http://localhost:3001/auth/:path*',
              },
              {
                source: '/admin/:path*',
                destination: 'http://localhost:3001/admin/:path*',
              },
              {
                source: '/pos/:path*',
                destination: 'http://localhost:3001/pos/:path*',
              },
              {
                source: '/reports/:path*',
                destination: 'http://localhost:3001/reports/:path*',
              },
              {
                source: '/inventory/:path*',
                destination: 'http://localhost:3001/inventory/:path*',
              },
              {
                source: '/customers/:path*',
                destination: 'http://localhost:3001/customers/:path*',
              },
              {
                source: '/payments/:path*',
                destination: 'http://localhost:3001/payments/:path*',
              },
              {
                source: '/shifts/:path*',
                destination: 'http://localhost:3001/shifts/:path*',
              },
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