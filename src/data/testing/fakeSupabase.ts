// Test helper: a fake of Supabase's chainable query builder
// (supabase.from('x').select(...).eq(...).single()).
// Every call is recorded; awaiting the chain resolves to `result`.

export type FakeResult = { data: unknown; error: unknown };

export function fakeQuery(result: FakeResult) {
  const calls: { method: string; args: unknown[] }[] = [];
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'insert', 'update', 'delete', 'eq', 'order', 'single']) {
    builder[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    };
  }
  builder.then = (resolve: (r: FakeResult) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return { builder, calls };
}

/** The arguments of the first call to `method`, or undefined. */
export function argsOf(calls: { method: string; args: unknown[] }[], method: string) {
  return calls.find((c) => c.method === method)?.args;
}
