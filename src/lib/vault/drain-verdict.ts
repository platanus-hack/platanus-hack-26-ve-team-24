import type { CheckEvent, Verdict } from '@/lib/credential/verify';

/** Runs a verification to the end, ignoring the per-check events. */
export async function drainVerdict(
  generator: AsyncGenerator<CheckEvent, Verdict>,
): Promise<Verdict> {
  let step = await generator.next();
  while (!step.done) step = await generator.next();
  return step.value;
}
