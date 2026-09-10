import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'fr.lasalle.app',
  appName: 'La Salle',
  webDir: 'dist',
  plugins: {
    // OTA : mises à jour JS/HTML livrées sans repasser par le store (voir CAPACITOR-NATIVE.md).
    CapacitorUpdater: { autoUpdate: true },
    // Présentation des notifications push reçues app au premier plan.
    PushNotifications: { presentationOptions: ['badge', 'sound', 'alert'] },
  },
};

export default config;
