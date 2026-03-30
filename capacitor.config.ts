import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ditadointeligente.app',
  appName: 'Ditado Inteligente',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https'
  }
};

export default config;
