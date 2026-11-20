import type { CapacitorConfig } from '@capacitor/cli';

// App Android (Capacitor): empacota o build da web (dist/) num APK.
const config: CapacitorConfig = {
  appId: 'br.passebate.domino',
  appName: 'Passe & Bate',
  webDir: 'dist',
  backgroundColor: '#0c1412',
  android: { allowMixedContent: false },
};

export default config;
