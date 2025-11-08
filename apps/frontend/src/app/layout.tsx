import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from '@/components/error-boundary';
import '@/lib/global-error-handler';
import '@/lib/chunk-error-handler';

// Use system fonts instead of Google Fonts to avoid network issues during build
// This works offline and doesn't require network access
const fontClassName = 'font-sans';

export const metadata: Metadata = {
  title: 'Nhà Tôi ERP - Hệ thống quản lý quán ăn',
  description: 'Hệ thống quản lý quán ăn toàn diện với POS, kho, khách hàng và báo cáo',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Nhà Tôi ERP',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0ea5e9',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className={fontClassName}>
        <ErrorBoundary>
          <Providers>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#22c55e',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
