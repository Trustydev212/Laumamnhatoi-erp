// Global error handler for unhandled errors
export function setupGlobalErrorHandlers() {
  if (typeof window === 'undefined') return;

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Check if it's the zaloJSV2 error
    if (event.reason && typeof event.reason === 'object' && event.reason.message?.includes('zaloJSV2')) {
      console.warn('zaloJSV2 error detected - likely from browser extension or third-party script');
      event.preventDefault(); // Prevent the error from showing in console
    }
  });

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    console.error('Uncaught error:', event.error);
    
    // Check if it's the zaloJSV2 error
    if (event.error && event.error.message?.includes('zaloJSV2')) {
      console.warn('zaloJSV2 error detected - likely from browser extension or third-party script');
      event.preventDefault(); // Prevent the error from showing in console
    }
  });

  // Handle console errors
  const originalConsoleError = console.error;
  console.error = (...args) => {
    const message = args.join(' ');
    if (message.includes('zaloJSV2')) {
      console.warn('zaloJSV2 error suppressed - likely from browser extension');
      return;
    }
    originalConsoleError.apply(console, args);
  };
}

// Initialize on client side
if (typeof window !== 'undefined') {
  setupGlobalErrorHandlers();
}
