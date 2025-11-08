/**
 * Chunk Loading Error Handler
 * Tự động xử lý lỗi khi không load được JavaScript chunks
 */

if (typeof window !== 'undefined') {
  // Listen for chunk loading errors
  window.addEventListener('error', (event) => {
    const target = event.target as HTMLElement;
    
    // Kiểm tra nếu là lỗi load script/chunk
    if (
      target &&
      (target.tagName === 'SCRIPT' || target.tagName === 'LINK') &&
      event.error?.name === 'ChunkLoadError'
    ) {
      console.error('❌ ChunkLoadError detected:', event.error);
      
      // Lấy URL của file bị lỗi
      let failedUrl: string | undefined;
      if (target.tagName === 'SCRIPT') {
        failedUrl = (target as HTMLScriptElement).src;
      } else if (target.tagName === 'LINK') {
        failedUrl = (target as HTMLLinkElement).href;
      }
      
      if (failedUrl) {
        console.warn('🔄 Retrying chunk load:', failedUrl);
        
        // Retry sau 1 giây
        setTimeout(() => {
          // Thử reload page nếu retry không thành công
          if (document.readyState === 'complete') {
            console.warn('🔄 Reloading page to fix chunk loading error...');
            window.location.reload();
          }
        }, 1000);
      }
    }
  }, true);

  // Listen for unhandled promise rejections (chunk load errors are often thrown as promises)
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    
    if (
      error?.name === 'ChunkLoadError' ||
      error?.message?.includes('Loading chunk') ||
      error?.message?.includes('Failed to fetch dynamically imported module')
    ) {
      console.error('❌ ChunkLoadError in promise:', error);
      
      // Prevent default error handling
      event.preventDefault();
      
      // Retry by reloading page
      console.warn('🔄 Reloading page to fix chunk loading error...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  });
}

