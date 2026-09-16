// The envelope every server action and route handler returns — see
// architecture.md's Error Handling section and api-route-scaffolder/SKILL.md's
// Envelope Convention. The client never receives raw exception messages,
// stack traces, or Prisma error objects.
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function err(code: string, message: string): ActionResult<never> {
  return { ok: false, error: { code, message } };
}
