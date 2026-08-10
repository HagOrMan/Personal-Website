import 'server-only';

/**
 * Reads an environment variable the caller cannot run without, throwing a
 * named error rather than quietly continuing with `undefined`.
 *
 * Server-only by design. The lookup is dynamic (`process.env[name]`), and
 * Next.js only inlines *statically* referenced `process.env.NEXT_PUBLIC_*`
 * into client bundles - a dynamic read of one from the browser comes back
 * undefined and would throw here at runtime. Client-visible config therefore
 * has to keep reading `process.env.SOME_NAME` directly; see lib/supabase/env.ts.
 */
export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}
