/**
 * Push notifications from the bridge to the owner's installed app (Web Push; iOS 16.4+ for
 * Home Screen apps). The bridge runs around the clock, so notifications arrive with the app
 * closed: the Microsoft number to match when the Mac signs back in, class reminders from TIPS's
 * own class schedule (休補・スケジュール, so cancellations and room changes are real), and new
 * bulletins.
 *
 * Messages use the declarative format (iOS 18.4+ shows them without running app code); the
 * service worker handles the same JSON for browsers without it.
 *
 * ~/.tokaihub/vapid.json    this server's VAPID key pair (0600), made on first use
 * ~/.tokaihub/push.json     subscriptions and their preferences
 * ~/.tokaihub/push-state.json  what was already sent, so a restart does not repeat anything
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import webpush from 'web-push';
import { PERIOD_TIMES } from '../../src/config/periods';

const DIR = path.join(os.homedir(), '.tokaihub');
const file = (n: string) => path.join(DIR, n);
const readJson = <T>(n: string, fallback: T): T => { try { return JSON.parse(fs.readFileSync(file(n), 'utf8')); } catch { return fallback; } };
const writeJson = (n: string, v: unknown) => { fs.mkdirSync(DIR, { recursive: true, mode: 0o700 }); fs.writeFileSync(file(n), JSON.stringify(v, null, 2), { mode: 0o600 }); };

const APP_ORIGIN = (process.env.HUB_APP_ORIGIN ?? 'https://tokaihub.mohamedfuad.com').replace(/\/$/, '');

// ── Keys ────────────────────────────────────────────────────────────────────────────────────
function vapid() {
  let keys = readJson<{ publicKey: string; privateKey: string } | null>('vapid.json', null);
  if (!keys) { keys = webpush.generateVAPIDKeys(); writeJson('vapid.json', keys); }
  return keys;
}
export const vapidPublicKey = () => vapid().publicKey;

// ── Subscriptions ───────────────────────────────────────────────────────────────────────────
export interface PushPrefs {
  /** Minutes before a class starts; 0 turns class reminders off. */
  classMinutes: number;
  bulletins: boolean;
  /** Cancellations, room changes and make-up classes. */
  changes: boolean;
  /** The number to match when the Mac signs back in to Microsoft. */
  signin: boolean;
  lang: 'en' | 'jp';
}
export const DEFAULT_PREFS: PushPrefs = { classMinutes: 15, bulletins: true, changes: true, signin: true, lang: 'jp' };
interface Sub { endpoint: string; keys: { p256dh: string; auth: string }; label: string; createdAt: string; prefs: PushPrefs }

const subs = () => readJson<{ subs: Sub[] }>('push.json', { subs: [] }).subs;
const saveSubs = (list: Sub[]) => writeJson('push.json', { subs: list });

export function subscribe(sub: { endpoint: string; keys: { p256dh: string; auth: string } }, label: string, prefs: Partial<PushPrefs>) {
  if (!/^https:\/\//.test(sub?.endpoint ?? '') || !sub.keys?.p256dh || !sub.keys?.auth) throw Object.assign(new Error('bad subscription'), { status: 400 });
  const list = subs().filter(s => s.endpoint !== sub.endpoint);
  const old = subs().find(s => s.endpoint === sub.endpoint);
  list.push({ endpoint: sub.endpoint, keys: sub.keys, label: String(label).slice(0, 60), createdAt: old?.createdAt ?? new Date().toISOString(), prefs: clean({ ...DEFAULT_PREFS, ...old?.prefs, ...prefs }) });
  saveSubs(list);
}
export function unsubscribe(endpoint: string) { saveSubs(subs().filter(s => s.endpoint !== endpoint)); }
export function prefsOf(endpoint: string) { return subs().find(s => s.endpoint === endpoint)?.prefs ?? null; }
export function hasSubscribers() { return subs().length > 0; }

function clean(p: PushPrefs): PushPrefs {
  return {
    classMinutes: [0, 5, 10, 15, 30, 60].includes(Number(p.classMinutes)) ? Number(p.classMinutes) : 15,
    bulletins: !!p.bulletins, changes: !!p.changes, signin: !!p.signin, lang: p.lang === 'en' ? 'en' : 'jp',
  };
}

// ── Sending ─────────────────────────────────────────────────────────────────────────────────
interface Note { title: string; body: string; navigate: string; tag: string; badge?: number }

async function deliver(s: Sub, n: Note, urgency: 'high' | 'normal', ttl: number) {
  const payload = {
    web_push: 8030, // declarative Web Push: iOS 18.4+ shows this without app code
    notification: { title: n.title, body: n.body, navigate: `${APP_ORIGIN}${n.navigate}`, tag: n.tag, lang: s.prefs.lang === 'en' ? 'en' : 'ja', ...(n.badge !== undefined ? { app_badge: n.badge } : {}) },
  };
  const k = vapid();
  try {
    await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify(payload), {
      TTL: ttl, urgency, vapidDetails: { subject: APP_ORIGIN, publicKey: k.publicKey, privateKey: k.privateKey },
    });
    return true;
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode;
    // The browser dropped the subscription (app removed, permission revoked): forget it.
    if (code === 404 || code === 410) unsubscribe(s.endpoint);
    console.error('[push]', code ?? '', (e as Error).message.split('\n')[0]);
    return false;
  }
}

type Kind = 'signin' | 'class' | 'bulletin' | 'change' | 'test';
/** Sends to every subscription whose preferences allow this kind (or one endpoint for tests). */
export async function notify(kind: Kind, note: (lang: 'en' | 'jp') => Note, opts: { endpoint?: string; urgency?: 'high' | 'normal'; ttl?: number } = {}) {
  const targets = subs().filter(s => (opts.endpoint ? s.endpoint === opts.endpoint : true) && (
    kind === 'test' || (kind === 'signin' && s.prefs.signin) || (kind === 'bulletin' && s.prefs.bulletins) || (kind === 'change' && s.prefs.changes) || (kind === 'class' && s.prefs.classMinutes > 0)));
  const results = await Promise.all(targets.map(s => deliver(s, note(s.prefs.lang), opts.urgency ?? 'normal', opts.ttl ?? 3600)));
  return results.filter(Boolean).length;
}

/** The Microsoft number to match, sent the moment Microsoft shows it (the app is often closed). */
export function notifySignin(number: string) {
  void notify('signin', lang => ({
    title: lang === 'en' ? `TIPS sign-in: ${number}` : `TIPSサインイン: ${number}`,
    body: lang === 'en' ? `Enter ${number} in Microsoft Authenticator to let your Mac sign back in to TIPS.` : `Microsoft Authenticatorで ${number} を入力すると、MacがTIPSに再サインインします。`,
    navigate: '/', tag: 'tips-signin',
  }), { urgency: 'high', ttl: 120 });
}

// ── Scheduler: class reminders, schedule changes, new bulletins ─────────────────────────────
// Each stream seeds separately: its first successful read only records what exists, so a failed
// first read never makes everything look new later.
interface State { sent: Record<string, number>; seenBulletins: string[]; seenChanges: string[]; changesSeeded?: boolean; bulletinsSeeded?: boolean }
const loadState = () => readJson<State>('push-state.json', { sent: {}, seenBulletins: [], seenChanges: [] });

type Handle = (feature: string, q: Record<string, string>) => Promise<{ data: any }>;
interface Row { date: string; period: string; code: string; title: string; room: string; status: string }

const periodNo = (p: string) => Number(/\d+/.exec(p.normalize('NFKC'))?.[0]);
const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
/** "9/29" (TIPS leaves the year out) and "2限" → the class's start time. */
export function startOf(row: { date: string; period: string }, from: Date): Date | null {
  const m = /(\d{1,2})\/(\d{1,2})/.exec(row.date);
  const p = Number(/\d+/.exec(row.period)?.[0]);
  const time = PERIOD_TIMES[p]?.[0];
  if (!m || !time) return null;
  const [h, min] = time.split(':').map(Number);
  let year = from.getFullYear();
  // A range that crosses New Year: January dates belong to the next year.
  if (Number(m[1]) < from.getMonth() + 1 - 6) year++;
  return new Date(year, Number(m[1]) - 1, Number(m[2]), h, min);
}

let rows: { row: Row; start: Date }[] = [];
let rowsAt = 0;
let bulletinsAt = 0;
let ticking = false;

/** Called every minute from index.ts. Reads TIPS at most every few hours, as background work. */
export async function tick(handle: Handle, signedIn: boolean) {
  // A slow TIPS read can outlast the minute; an overlapping tick would send reminders twice.
  if (ticking || !hasSubscribers() || !signedIn) return;
  ticking = true;
  try { await tickOnce(handle); } finally { ticking = false; }
}

async function tickOnce(handle: Handle) {
  const now = new Date();
  const state = loadState();

  // Class schedule for the coming week, refreshed every 3 hours.
  if (Date.now() - rowsAt > 3 * 60 * 60_000) {
    try {
      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const to = new Date(from.getTime() + 8 * 86_400_000);
      const env = await handle('changes', { lang: 'jp', from: ymd(from), to: ymd(to), all: '1', bg: '1' });
      rows = (env.data?.items ?? []).map((r: Row) => ({ row: r, start: startOf(r, from) })).filter((x: any) => x.start) as typeof rows;
      rowsAt = Date.now();
      // Cancellations, room changes and make-ups, once each.
      for (const { row, start } of rows.filter(x => x.row.status !== 'normal')) {
        const key = `${row.date}:${row.period}:${row.code}:${row.status}`;
        if (state.seenChanges.includes(key)) continue;
        state.seenChanges.push(key);
        if (!state.changesSeeded) continue;
        const md = `${start.getMonth() + 1}/${start.getDate()}`;
        await notify('change', lang => ({
          title: lang === 'en'
            ? { cancelled: 'Class cancelled', roomChange: 'Room changed', makeup: 'Make-up class', cancelledMakeup: 'Make-up cancelled' }[row.status] ?? 'Schedule change'
            : { cancelled: '休講', roomChange: '教室変更', makeup: '補講', cancelledMakeup: '補講中止' }[row.status] ?? '授業の変更',
          body: `${row.title} · ${md} ${lang === 'en' ? `period ${periodNo(row.period)}` : row.period}${row.room ? ` · ${row.room}` : ''}`, navigate: '/schedule', tag: `change-${key}`,
        }));
      }
      state.changesSeeded = true;
    } catch (e) { console.error('[push] schedule:', (e as Error).message.split('\n')[0]); }
  }

  // Reminders: each subscription at its own lead time; cancelled classes are skipped.
  for (const s of subs()) {
    const lead = s.prefs.classMinutes;
    if (!lead) continue;
    for (const { row, start } of rows) {
      if (row.status === 'cancelled' || row.status === 'cancelledMakeup') continue;
      const due = start.getTime() - lead * 60_000;
      const key = `${s.endpoint.slice(-24)}:${row.date}:${row.period}:${row.code}`;
      if (Date.now() < due || Date.now() >= start.getTime() || state.sent[key]) continue;
      // Consecutive periods of the same course (1限+2限) get one reminder, for the first.
      const prev = rows.find(x => x.row.code === row.code && x.row.date === row.date && Number(/\d+/.exec(x.row.period)?.[0]) === Number(/\d+/.exec(row.period)?.[0]) - 1);
      state.sent[key] = Date.now();
      if (prev) continue;
      const hm = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
      await notify('class', lang => ({
        title: lang === 'en' ? `${row.title} at ${hm}` : `${hm}から ${row.title}`,
        body: lang === 'en' ? `Period ${periodNo(row.period)}${row.room ? ` · room ${row.room}` : ''}${row.status === 'roomChange' ? ' (room changed)' : ''}` : `${row.period}${row.room ? ` · ${row.room}` : ''}${row.status === 'roomChange' ? '（教室変更）' : ''}`,
        navigate: '/schedule', tag: `class-${row.date}-${row.period}`,
      }), { endpoint: s.endpoint, ttl: lead * 60 });
    }
  }

  // New bulletins, every 20 minutes. The first run only records what exists.
  if (Date.now() - bulletinsAt > 20 * 60_000) {
    try {
      bulletinsAt = Date.now();
      const env = await handle('bulletins', { lang: 'jp', bg: '1' });
      const posts: { id: string; title: string; genre: string; poster: string }[] = env.data?.posts ?? [];
      const fresh = posts.filter(p => !state.seenBulletins.includes(p.id));
      state.seenBulletins = [...new Set([...state.seenBulletins, ...posts.map(p => p.id)])].slice(-2000);
      const seeded = state.bulletinsSeeded;
      state.bulletinsSeeded = true;
      if (seeded && fresh.length) {
        const unread: number | undefined = env.data?.unreadCount;
        if (fresh.length <= 3) {
          for (const p of fresh) {
            await notify('bulletin', () => ({ title: p.title, body: [p.poster, p.genre].filter(Boolean).join(' · '), navigate: `/bulletins/${encodeURIComponent(p.id)}`, tag: `bulletin-${p.id}`, badge: unread }));
          }
        } else {
          await notify('bulletin', lang => ({
            title: lang === 'en' ? `${fresh.length} new bulletins` : `新しい掲示 ${fresh.length}件`,
            body: fresh.slice(0, 3).map(p => p.title).join(' / '), navigate: '/bulletins', tag: 'bulletins-batch', badge: unread,
          }));
        }
      }
    } catch (e) { console.error('[push] bulletins:', (e as Error).message.split('\n')[0]); }
  }

  // Keep only the last two days of reminder keys.
  for (const [k, at] of Object.entries(state.sent)) if (Date.now() - at > 2 * 86_400_000) delete state.sent[k];
  state.seenChanges = state.seenChanges.slice(-500);
  writeJson('push-state.json', state);
}
