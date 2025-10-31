import axios from 'axios';

// Detect if running on ngrok
const isNgrok = typeof window !== 'undefined' && 
  (window.location.hostname.includes('ngrok-free.dev') || 
   window.location.hostname.includes('ngrok.io') || 
   window.location.hostname.includes('ngrok.app'));

// Detect mobile device
const isMobile = typeof window !== 'undefined' && 
  (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
   window.innerWidth <= 768);

// Use backend URL - prioritize environment variable, then detect based on environment
// For production with Nginx proxy, use relative path /api
// For development/ngrok, use full URL
const getAPI_URL = () => {
  // If NEXT_PUBLIC_API_URL is set and starts with /, use it as-is (relative path for proxy)
  if (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.startsWith('/')) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // If NEXT_PUBLIC_API_URL is set (full URL), use it
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // Fallback: ngrok or localhost
  return isNgrok 
    ? 'https://yuki-unmandatory-delia.ngrok-free.dev'
    : 'http://localhost:3001';
};

const API_URL = getAPI_URL();
const finalAPI_URL = API_URL || '/api';

// Enhanced Debug API URL
console.log('🌐 API URL:', API_URL);
console.log('🔧 Final API URL:', finalAPI_URL);
console.log('🔍 Is Ngrok:', isNgrok);
console.log('📱 Is Mobile:', isMobile);
console.log('🌍 Current hostname:', typeof window !== 'undefined' ? window.location.hostname : 'server');
console.log('🔧 User Agent:', typeof window !== 'undefined' ? navigator.userAgent : 'server');
console.log('📏 Screen Size:', typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'server');

export const api = axios.create({
  baseURL: finalAPI_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    // Mobile-specific headers
    ...(isMobile && {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    }),
  },
  // Mobile-specific config
  timeout: isMobile ? 30000 : 10000, // Longer timeout for mobile
  withCredentials: false, // Disable to avoid CORS conflicts with ngrok
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    console.log('🔑 API Request - Token:', token ? 'Present' : 'Missing');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${finalAPI_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken } = response.data;
        localStorage.setItem('accessToken', accessToken);

        // Retry the original request
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
