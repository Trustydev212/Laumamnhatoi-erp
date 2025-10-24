'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

export default function MobileDebugPage() {
  const { user, login, logout } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [testResults, setTestResults] = useState<any>({});

  useEffect(() => {
    const info = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      hostname: window.location.hostname,
      protocol: window.location.protocol,
      port: window.location.port,
      href: window.location.href,
      localStorage: {
        accessToken: localStorage.getItem('accessToken') ? 'Present' : 'Missing',
        refreshToken: localStorage.getItem('refreshToken') ? 'Present' : 'Missing',
      },
      user: user,
    };
    setDebugInfo(info);
  }, [user]);

  const testAPI = async () => {
    try {
      console.log('🧪 Testing API connection...');
      
      // Test 1: Basic connectivity
      const healthResponse = await api.get('/health');
      console.log('✅ Health check:', healthResponse.data);
      
      // Test 2: Auth profile
      const profileResponse = await api.get('/auth/profile');
      console.log('✅ Profile check:', profileResponse.data);
      
      setTestResults({
        health: '✅ Success',
        profile: '✅ Success',
        error: null,
      });
    } catch (error: any) {
      console.error('❌ API Test failed:', error);
      setTestResults({
        health: '❌ Failed',
        profile: '❌ Failed',
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
  };

  const testLogin = async () => {
    try {
      console.log('🧪 Testing login...');
      const result = await login('admin', 'admin123');
      console.log('✅ Login result:', result);
    } catch (error: any) {
      console.error('❌ Login failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Mobile Debug Page</h1>
        
        {/* Device Info */}
        <div className="bg-white rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold mb-4">Device Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <strong>User Agent:</strong>
              <p className="text-sm text-gray-600 break-all">{debugInfo.userAgent}</p>
            </div>
            <div>
              <strong>Platform:</strong>
              <p className="text-sm text-gray-600">{debugInfo.platform}</p>
            </div>
            <div>
              <strong>Language:</strong>
              <p className="text-sm text-gray-600">{debugInfo.language}</p>
            </div>
            <div>
              <strong>Online:</strong>
              <p className="text-sm text-gray-600">{debugInfo.onLine ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <strong>Screen Size:</strong>
              <p className="text-sm text-gray-600">{debugInfo.screenWidth}x{debugInfo.screenHeight}</p>
            </div>
            <div>
              <strong>Window Size:</strong>
              <p className="text-sm text-gray-600">{debugInfo.windowWidth}x{debugInfo.windowHeight}</p>
            </div>
            <div>
              <strong>URL:</strong>
              <p className="text-sm text-gray-600 break-all">{debugInfo.href}</p>
            </div>
            <div>
              <strong>Protocol:</strong>
              <p className="text-sm text-gray-600">{debugInfo.protocol}</p>
            </div>
          </div>
        </div>

        {/* Storage Info */}
        <div className="bg-white rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold mb-4">Storage Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <strong>Access Token:</strong>
              <p className="text-sm text-gray-600">{debugInfo.localStorage?.accessToken}</p>
            </div>
            <div>
              <strong>Refresh Token:</strong>
              <p className="text-sm text-gray-600">{debugInfo.localStorage?.refreshToken}</p>
            </div>
            <div>
              <strong>User:</strong>
              <p className="text-sm text-gray-600">{user ? `${user.username} (${user.role})` : 'Not logged in'}</p>
            </div>
          </div>
        </div>

        {/* Test Buttons */}
        <div className="bg-white rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold mb-4">API Tests</h2>
          <div className="space-y-4">
            <button
              onClick={testAPI}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Test API Connection
            </button>
            
            <button
              onClick={testLogin}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Test Login
            </button>
            
            <button
              onClick={logout}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Test Results */}
        {Object.keys(testResults).length > 0 && (
          <div className="bg-white rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4">Test Results</h2>
            <div className="space-y-2">
              <div>
                <strong>Health Check:</strong>
                <span className="ml-2">{testResults.health}</span>
              </div>
              <div>
                <strong>Profile Check:</strong>
                <span className="ml-2">{testResults.profile}</span>
              </div>
              {testResults.error && (
                <div>
                  <strong>Error:</strong>
                  <p className="text-sm text-red-600">{testResults.error}</p>
                </div>
              )}
              {testResults.status && (
                <div>
                  <strong>Status Code:</strong>
                  <span className="ml-2">{testResults.status}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
