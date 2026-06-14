import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@supabase')) return 'supabase';
            if (id.includes('react-router')) return 'router';
            if (id.includes('react-dom') || id.includes('react/')) return 'react-vendor';
            if (id.includes('lucide-react')) return 'icons';
          }
          if (id.includes('AdminDashboard')) return 'admin';
          if (id.includes('ClientDashboard')) return 'client-dashboard';
          if (id.includes('DriverDashboard')) return 'driver-dashboard';
        },
      },
    },
  },
});
