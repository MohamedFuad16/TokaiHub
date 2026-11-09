import { afterEach, describe, expect, it, vi } from 'vitest';
import { JOB_LIMIT_MS, JobTimeoutError, runFeature } from './session';

describe('runFeature queue', () => {
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('drops a job that never settles and runs the next one', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const stuck = runFeature('ja_JP', () => new Promise(() => {}));
    const next = runFeature('ja_JP', async () => 'next ran');
    const stuckResult = expect(stuck).rejects.toBeInstanceOf(JobTimeoutError);

    await vi.advanceTimersByTimeAsync(JOB_LIMIT_MS - 1);
    let nextDone = false;
    void next.then(() => { nextDone = true; });
    await vi.advanceTimersByTimeAsync(0);
    expect(nextDone).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await stuckResult;
    await expect(next).resolves.toBe('next ran');
  });

  it('leaves a job that finishes in time alone', async () => {
    await expect(runFeature('ja_JP', async () => 42)).resolves.toBe(42);
  });
});
