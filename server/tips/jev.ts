/**
 * TypeSafe's Jev model (https://docs.typesafe.ai/api): send a `state` and typed questions, get
 * probabilities back. The recommender asks it what regular expressions cannot settle from a
 * syllabus: how a course is graded, whether it is taught remotely, whether it continues a course
 * the student passed, and how heavy it is. The key stays on the Mac (~/.tokaihub/hub.env,
 * TYPESAFE_API_KEY) and never reaches the app.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ENDPOINT = 'https://api.typesafe.ai/v1/systemone';

function apiKey(): string | null {
  if (process.env.TYPESAFE_API_KEY) return process.env.TYPESAFE_API_KEY;
  try {
    const env = fs.readFileSync(path.join(os.homedir(), '.tokaihub', 'hub.env'), 'utf8');
    return /^TYPESAFE_API_KEY=["']?([^"'\s]+)["']?/m.exec(env)?.[1] ?? null;
  } catch { return null; }
}

export const jevEnabled = () => apiKey() !== null;

export type Question =
  | { type: 'noul'; instructions: unknown; criteria?: { true?: unknown; false?: unknown } }
  | { type: 'choice'; instructions: unknown; criteria: Record<string, unknown> }
  | { type: 'score'; instructions: unknown; criteria: unknown[] };
export type Answer =
  | { type: 'noul'; noul: number }
  | { type: 'choice'; choice: string; probabilities: Record<string, number>; confidence: number }
  | { type: 'score'; score: number; probabilities: Record<string, number>; confidence: number };

/**
 * One evaluation. Retries 429/529 with backoff as the API asks; returns null without a key or
 * after the retries, so callers fall back to their rule-based answer.
 */
export async function evaluate(state: unknown, questions: Record<string, Question>): Promise<Record<string, Answer> | null> {
  const key = apiKey();
  if (!key) return null;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'jev-latest', state, questions }),
        signal: AbortSignal.timeout(30_000),
      });
      if (res.status === 429 || res.status === 529) { await new Promise(r => setTimeout(r, 1000 * 2 ** attempt)); continue; }
      if (!res.ok) {
        console.error('[jev]', res.status, (await res.text()).slice(0, 200));
        return null;
      }
      return (await res.json()).answers as Record<string, Answer>;
    } catch (e) {
      if (attempt === 3) { console.error('[jev]', (e as Error).message.split('\n')[0]); return null; }
      await new Promise(r => setTimeout(r, 1000 * 2 ** attempt));
    }
  }
  return null;
}
