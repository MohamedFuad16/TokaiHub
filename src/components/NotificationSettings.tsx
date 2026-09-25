import React, { useEffect, useState } from 'react';
import { Bell, BellRing, Loader2, Send, Smartphone } from 'lucide-react';
import type { Language } from '../App';
import { deviceLabel, getPushKey, pushPrefs, pushSubscribe, pushTest, pushUnsubscribe, type PushPrefs } from '../lib/api';
import { deviceLang, pushSupported as supported } from '../lib/push';

const t = {
  en: {
    title: 'Notifications', sub: 'Class reminders, schedule changes, new bulletins and TIPS sign-in approvals',
    install: 'Add TokaiHub to your Home Screen (Share → Add to Home Screen), then open it from there to turn notifications on.',
    unsupported: 'This browser cannot receive notifications.',
    blocked: 'Notifications are blocked. Allow them for TokaiHub in iOS Settings → Notifications.',
    blockedBrowser: 'Notifications are blocked for this site. Allow them in the browser\'s site settings, then reload.',
    on: 'Turn on', off: 'Turn off', test: 'Send a test', sent: 'Sent. It should arrive in a few seconds.', notSent: 'Could not send. Try turning notifications off and on.',
    classes: 'Class reminders', minutes: (n: number) => (n ? `${n} min before` : 'Off'), bulletins: 'New bulletins', changes: 'Cancellations and room changes', signin: 'TIPS sign-in number',
    failed: 'Could not turn on notifications',
  },
  jp: {
    title: '通知', sub: '授業のリマインダー、休講・教室変更、新しい掲示、TIPSサインインの承認',
    install: 'TokaiHubをホーム画面に追加し（共有 → ホーム画面に追加）、そこから開くと通知をオンにできます。',
    unsupported: 'このブラウザは通知を受け取れません。',
    blocked: '通知がブロックされています。iOSの設定 → 通知 でTokaiHubを許可してください。',
    blockedBrowser: 'このサイトの通知がブロックされています。ブラウザのサイト設定で許可してから再読み込みしてください。',
    on: 'オンにする', off: 'オフにする', test: 'テスト通知を送る', sent: '送信しました。数秒で届きます。', notSent: '送信できませんでした。通知をオフにしてからもう一度オンにしてください。',
    classes: '授業のリマインダー', minutes: (n: number) => (n ? `${n}分前` : 'オフ'), bulletins: '新しい掲示', changes: '休講・教室変更', signin: 'TIPSサインインの番号',
    failed: '通知をオンにできませんでした',
  },
};

const isIOS = () => /iPhone|iPad/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

function keyBytes(base64: string) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

/**
 * Turns push notifications on for this device and sets what to receive. The Mac's bridge sends
 * them (server/tips/push.ts), so they arrive with the app closed. On iPhone this needs the app
 * installed to the Home Screen (iOS 16.4+), and permission must be asked from a tap.
 */
export default function NotificationSettings({ lang, isDark }: { lang: Language; isDark: boolean }) {
  const tx = t[lang];
  const muted = isDark ? 'text-gray-400' : 'text-gray-500';
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<PushPrefs | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(supported() ? Notification.permission : 'unsupported');

  useEffect(() => {
    if (!supported()) return;
    void navigator.serviceWorker.ready.then(async reg => {
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return;
      setEndpoint(sub.endpoint);
      try { setPrefs((await pushPrefs(sub.endpoint)).prefs); } catch { /* offline: keep the switch on */ }
    });
  }, []);

  const turnOn = async () => {
    setBusy(true); setNote(null);
    try {
      // Asked straight from the tap, as iOS requires.
      const p = await Notification.requestPermission();
      setPermission(p);
      if (p !== 'granted') return;
      const reg = await navigator.serviceWorker.ready;
      const { publicKey } = await getPushKey();
      const sub = (await reg.pushManager.getSubscription()) ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
      const saved = await pushSubscribe(sub.toJSON(), deviceLabel(), { lang: deviceLang() });
      setEndpoint(sub.endpoint); setPrefs(saved.prefs);
    } catch (e) {
      setNote(`${tx.failed}: ${(e as Error).message}`);
    } finally { setBusy(false); }
  };

  const turnOff = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) { await pushUnsubscribe(sub.endpoint).catch(() => {}); await sub.unsubscribe(); }
      setEndpoint(null); setPrefs(null);
    } finally { setBusy(false); }
  };

  const change = async (patch: Partial<PushPrefs>) => {
    if (!endpoint || !prefs) return;
    const next = { ...prefs, ...patch, lang: deviceLang() };
    setPrefs(next);
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await pushSubscribe(sub.toJSON(), deviceLabel(), next).catch(() => {});
  };

  const test = async () => {
    if (!endpoint) return;
    setBusy(true);
    try { setNote((await pushTest(endpoint)).sent ? tx.sent : tx.notSent); } catch { setNote(tx.notSent); } finally { setBusy(false); }
  };

  const blocker = !supported() ? (isIOS() && !standalone() ? tx.install : tx.unsupported)
    : isIOS() && !standalone() ? tx.install
      : permission === 'denied' ? (isIOS() ? tx.blocked : tx.blockedBrowser) : null;
  const row = 'flex items-center justify-between gap-3 min-h-11 px-1 text-sm font-semibold';
  const on = !!endpoint && !!prefs;

  return (
    <div className="p-3 sm:p-4">
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${on ? 'bg-brand-yellow' : isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
          {on ? <BellRing className="w-5 h-5 text-brand-black" /> : <Bell className={`w-5 h-5 ${muted}`} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-sm">{tx.title}</div>
          <div className={`text-xs font-medium ${muted}`}>{tx.sub}</div>
        </div>
        {!blocker && (
          <button onClick={on ? turnOff : turnOn} disabled={busy}
            className={`h-10 px-3 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 ${on ? (isDark ? 'bg-gray-700' : 'bg-gray-100') : 'bg-brand-black text-white'}`}>
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{on ? tx.off : tx.on}
          </button>
        )}
      </div>
      {blocker && <p className={`mt-3 text-xs font-medium flex gap-2 ${muted}`}><Smartphone className="w-4 h-4 shrink-0" />{blocker}</p>}
      {on && (
        <div className="mt-3 space-y-1">
          <label className={row}>
            {tx.classes}
            <select value={prefs.classMinutes} onChange={e => void change({ classMinutes: Number(e.target.value) })}
              className={`h-9 rounded-xl px-2 text-xs font-bold ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
              {[0, 5, 10, 15, 30, 60].map(n => <option key={n} value={n}>{tx.minutes(n)}</option>)}
            </select>
          </label>
          {([['changes', tx.changes], ['bulletins', tx.bulletins], ['signin', tx.signin]] as const).map(([k, label]) => (
            <label key={k} className={`${row} cursor-pointer`}>
              {label}
              <input type="checkbox" checked={prefs[k]} onChange={e => void change({ [k]: e.target.checked })} className="w-5 h-5 accent-black" />
            </label>
          ))}
          <button onClick={test} disabled={busy} className={`mt-2 w-full h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <Send className="w-3.5 h-3.5" />{tx.test}
          </button>
        </div>
      )}
      {note && <p className={`mt-2 text-xs font-semibold ${muted}`}>{note}</p>}
    </div>
  );
}
