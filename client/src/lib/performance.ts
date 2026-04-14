/**
 * Performance Optimization Utilities
 * Manages GPU acceleration, caching, and browser capabilities detection
 */

// Detect GPU capabilities
export const detectGPUCapability = (): {
  supportsWebGL: boolean;
  supportsWebGL2: boolean;
  supportsTransformZ: boolean;
  supportsBackdropFilter: boolean;
  gpuVendor: string;
} => {
  if (typeof window === 'undefined') {
    return {
      supportsWebGL: false,
      supportsWebGL2: false,
      supportsTransformZ: false,
      supportsBackdropFilter: false,
      gpuVendor: 'unknown',
    };
  }

  // Check WebGL support
  const canvas = document.createElement('canvas');
  const webGL = canvas.getContext('webgl');
  const webGL2 = canvas.getContext('webgl2');
  
  // Get GPU vendor
  let gpuVendor = 'unknown';
  if (webGL) {
    const debugInfo = webGL.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      gpuVendor = webGL.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    }
  }

  // Check CSS support
  const style = document.createElement('div').style;
  const supportsTransformZ = CSS.supports('transform', 'translateZ(0)');
  const supportsBackdropFilter = CSS.supports('backdrop-filter', 'blur(10px)');

  return {
    supportsWebGL: !!webGL,
    supportsWebGL2: !!webGL2,
    supportsTransformZ,
    supportsBackdropFilter,
    gpuVendor,
  };
};

// Apply GPU acceleration classes based on capabilities
export const applyGPUAcceleration = () => {
  if (typeof document === 'undefined') return;

  const gpu = detectGPUCapability();
  const html = document.documentElement;

  // Add data attributes for CSS selectors
  html.setAttribute('data-gpu', gpu.supportsTransformZ ? 'enabled' : 'disabled');
  html.setAttribute('data-webgl', gpu.supportsWebGL ? 'enabled' : 'disabled');
  html.setAttribute('data-backdrop', gpu.supportsBackdropFilter ? 'enabled' : 'disabled');

  // Add class for GPU-accelerated browsers
  if (gpu.supportsTransformZ) {
    html.classList.add('gpu-accelerated');
    console.debug('[GPU] Hardware acceleration enabled');
  } else {
    html.classList.add('gpu-fallback');
    console.debug('[GPU] Fallback mode - using CPU optimization');
  }

  // Log capabilities for debugging
  if (process.env.NODE_ENV === 'development') {
    console.debug('[GPU Capabilities]', {
      webgl: gpu.supportsWebGL,
      webgl2: gpu.supportsWebGL2,
      transforms: gpu.supportsTransformZ,
      backdrop: gpu.supportsBackdropFilter,
      vendor: gpu.gpuVendor,
    });
  }
};

// Optimize animations based on device capabilities
export const getAnimationConfig = () => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gpu = detectGPUCapability();

  return {
    enableAnimations: !prefersReducedMotion,
    useGPUAcceleration: gpu.supportsTransformZ,
    duration: prefersReducedMotion ? 0 : 300,
    durationFast: prefersReducedMotion ? 0 : 150,
    durationSlow: prefersReducedMotion ? 0 : 500,
  };
};

// Monitor performance
export const setupPerformanceMonitoring = () => {
  if (typeof window === 'undefined') return;

  // Monitor Core Web Vitals
  if ('web-vital' in window) {
    // LCP (Largest Contentful Paint)
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        console.debug('[Performance] LCP:', entry.renderTime || entry.loadTime);
      }
    });

    observer.observe({ type: 'largest-contentful-paint', buffered: true });

    // INP (Interaction to Next Paint)
    if ('PerformanceObserver' in window) {
      const inpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.debug('[Performance] INP:', (entry as PerformanceEventTiming).processingDuration);
        }
      });

      try {
        inpObserver.observe({ type: 'event', durationThreshold: 0 });
      } catch (e) {
        // Not all browsers support this
      }
    }
  }
};

// Lazy load images with native API
export const setupLazyLoading = () => {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

  const images = document.querySelectorAll('img[data-lazy="true"]');
  const imgObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        const src = img.getAttribute('data-src');
        if (src) {
          img.src = src;
          img.removeAttribute('data-lazy');
          observer.unobserve(img);
        }
      }
    });
  });

  images.forEach((img) => imgObserver.observe(img));
};

// Prefetch critical resources
export const prefetchResource = (href: string, as: 'script' | 'style' | 'image' | 'font') => {
  if (typeof document === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;
  link.as = as;
  document.head.appendChild(link);
};

// Preload critical resources
export const preloadResource = (href: string, as: 'script' | 'style' | 'image' | 'font', type?: string) => {
  if (typeof document === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = as;
  if (type) link.type = type;
  document.head.appendChild(link);
};

// Optimize paint performance
export const optimizePaintPerformance = () => {
  if (typeof document === 'undefined') return;

  // Enable content-visibility for offscreen content
  const styles = document.createElement('style');
  styles.textContent = `
    @supports (content-visibility: auto) {
      .feed-item,
      .card-item,
      .gallery-item {
        content-visibility: auto;
        contain-intrinsic-size: auto 400px;
      }
    }
  `;
  document.head.appendChild(styles);
};

// Request Idle Callback polyfill
export const scheduleIdleTask = (callback: () => void) => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(callback);
  } else {
    setTimeout(callback, 0);
  }
};

// Register Service Worker for caching
export const registerServiceWorker = async () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.debug('[Service Worker] Registered:', registration);
    return registration;
  } catch (error) {
    console.debug('[Service Worker] Registration failed:', error);
  }
};

// Measure Core Web Vitals
export const measureCoreWebVitals = async () => {
  if (typeof window === 'undefined') return;

  const metrics = {
    fcp: 0, // First Contentful Paint
    lcp: 0, // Largest Contentful Paint
    cls: 0, // Cumulative Layout Shift
    fid: 0, // First Input Delay
    ttfb: 0, // Time to First Byte
  };

  // FCP and LCP
  const paintEntries = performance.getEntriesByType('paint') as PerformancePaintTiming[];
  paintEntries.forEach((entry) => {
    if (entry.name === 'first-contentful-paint') metrics.fcp = entry.startTime;
  });

  const lcpEntries = performance.getEntriesByType('largest-contentful-paint') as PerformanceEntry[];
  if (lcpEntries.length > 0) {
    metrics.lcp = (lcpEntries[lcpEntries.length - 1] as any).startTime;
  }

  // TTFB
  const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  if (navEntry) metrics.ttfb = navEntry.responseStart - navEntry.fetchStart;

  return metrics;
};

// Create GPU-accelerated transform string
export const createGPUTransform = (x = 0, y = 0, z = 0, scale = 1, rotate = 0): string => {
  return `translate3d(${x}px, ${y}px, ${z}px) scale(${scale}) rotate(${rotate}deg)`;
};

// Memoization helper for expensive operations
export const memoize = <T extends (...args: any[]) => any>(fn: T): T => {
  const cache = new Map();

  return ((...args: any[]) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
};

// Request animation frame with GPU optimization
export const requestAnimationFrameGPU = (callback: FrameRequestCallback): number => {
  return requestAnimationFrame((timestamp) => {
    // Add GPU acceleration context
    const context = {
      timestamp,
      isGPUAccelerated: detectGPUCapability().supportsTransformZ,
    };
    callback(timestamp);
  });
};

// Initialize all performance optimizations
export const initializePerformanceOptimizations = () => {
  applyGPUAcceleration();
  setupPerformanceMonitoring();
  setupLazyLoading();
  optimizePaintPerformance();
  registerServiceWorker();

  // Schedule non-critical initialization
  scheduleIdleTask(() => {
    measureCoreWebVitals().then((metrics) => {
      console.debug('[Performance Metrics]', metrics);
    });
  });
};
