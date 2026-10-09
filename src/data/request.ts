// Shared wrapper for data-layer calls: check the connection, run the query,
// and turn any failure into a Result with a user-facing message.
import type { Result } from '@/domain/types';

import { MESSAGES, toUserMessage } from './errors';
import { isOnline } from './network';

type Options = {
  /** Message for PostgREST "no row found" (e.g. the deck was deleted meanwhile). */
  notFound?: string;
};

export async function request<T>(work: () => Promise<T>, options: Options = {}): Promise<Result<T>> {
  if (!(await isOnline())) return { ok: false, error: MESSAGES.noConnection };
  try {
    return { ok: true, data: await work() };
  } catch (error) {
    const code = (error as { code?: unknown } | null)?.code;
    if (code === 'PGRST116' && options.notFound) return { ok: false, error: options.notFound };
    return { ok: false, error: toUserMessage(error) };
  }
}

/** Unwraps a Supabase `{ data, error }` response, throwing the error. */
export function unwrap<T>(response: { data: T | null; error: unknown }): T {
  if (response.error) throw response.error;
  return response.data as T;
}
