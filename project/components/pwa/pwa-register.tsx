'use client';

import { useEffect } from 'react';

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // In development or local environments, ensure service workers are unregistered and caches cleared
    if (process.env.NODE_ENV !== 'production' || window.location.hostname === 'localhost') {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
      if ('caches' in window) {
        caches.keys().then((keys) => {
          for (const key of keys) {
            caches.delete(key);
          }
        });
      }
      return;
    }

    // Register service worker on window load in production only
    const handleLoad = () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          // Check for worker updates
          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.addEventListener('statechange', () => {
                if (
                  installingWorker.state === 'installed' &&
                  navigator.serviceWorker.controller
                ) {
                  // New content is available; prompt or silent refresh
                  console.info('[PWA] New version available.');
                }
              });
            }
          });
        })
        .catch((error) => {
          console.warn('[PWA] Service worker registration failed:', error);
        });
    };

    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
    }
  }, []);

  return null;
}
