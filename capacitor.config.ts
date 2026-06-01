import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'dz.wajibati.app',
  appName: 'Wajibati',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
