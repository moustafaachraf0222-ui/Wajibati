import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'dz.wajibati.live',
  appName: 'Wajibati',
  webDir: 'dist',
  server: {
    url: 'https://wajibati.pages.dev',
    androidScheme: 'https'
  }
};

export default config;
