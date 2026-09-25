import { deviceLabel, pushPrefs, pushSubscribe } from './api';

export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

/** Notifications follow the phone's language (Settings → General → Language), not the app's. */
export const deviceLang = (): 'en' | 'jp' => ((navigator.languages?.[0] ?? navigator.language ?? '').toLowerCase().startsWith('ja') ? 'jp' : 'en');

/** Keeps the bridge's copy of the phone language current; called when the app opens. */
export async function syncPushLanguage() {
  if (!pushSupported() || Notification.permission !== 'granted') return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  const { prefs } = await pushPrefs(sub.endpoint);
  if (prefs && prefs.lang !== deviceLang()) await pushSubscribe(sub.toJSON(), deviceLabel(), { ...prefs, lang: deviceLang() });
}
