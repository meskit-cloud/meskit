import { vi } from "vitest";

/**
 * Creates a fluent Supabase query chain mock.
 *
 * All chainable methods (select, insert, update, eq, order, etc.) return `this`
 * so they compose naturally. Terminal methods:
 *   - `.single()`     → resolves with { data, error }
 *   - `.maybeSingle()` → resolves with { data, error }
 *   - `await chain`   → resolves with { data, error } (thenable, for non-.single() queries)
 *
 * Usage:
 *   mockSupabase.from.mockReturnValueOnce(dbChain({ data: myRow }))
 *   mockSupabase.from.mockReturnValueOnce(dbChain({ data: myRows }))
 */
export function dbChain(result: {
  data?: unknown;
  error?: unknown;
  count?: number | null;
} = {}) {
  const resolved = {
    data: result.data !== undefined ? result.data : null,
    error: result.error !== undefined ? result.error : null,
    count: result.count ?? null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {};

  for (const method of [
    "select",
    "insert",
    "update",
    "upsert",
    "delete",
    "eq",
    "neq",
    "gt",
    "gte",
    "lt",
    "lte",
    "in",
    "ilike",
    "order",
    "limit",
  ]) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }

  chain.single = vi.fn().mockResolvedValue(resolved);
  chain.maybeSingle = vi.fn().mockResolvedValue(resolved);

  // Make the chain itself awaitable for queries that don't call .single()
  // e.g.: await supabase.from('units').insert(...).select()
  chain.then = (
    resolve: (v: unknown) => unknown,
    reject?: (e: unknown) => unknown,
  ) => Promise.resolve(resolved).then(resolve, reject);

  return chain;
}

/**
 * Creates a mock Supabase client.
 * Pass `fromChains` to configure what `from()` returns per call (in order).
 */
export function mockSupabaseClient(options: {
  user?: { id: string } | null;
  fromChains?: ReturnType<typeof dbChain>[];
} = {}) {
  const user =
    options.user !== undefined ? options.user : { id: "test-user-id" };

  const fromMock = vi.fn();
  if (options.fromChains) {
    for (const chain of options.fromChains) {
      fromMock.mockReturnValueOnce(chain);
    }
  }

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: fromMock,
  };
}
