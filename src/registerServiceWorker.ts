export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          // SW registered successfully
          if (reg.installing) {
            // Service worker installing
          }
        })
        .catch(() => {
          // Registration failed (e.g. unsupported environment)
        });
    });
  }
}
