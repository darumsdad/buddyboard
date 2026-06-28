import { describe, it } from "vitest";

// Wave 0 stub — route handler src/app/api/sessions/[sessionId]/pairs/route.ts
// is created in Plan 05-03. These stubs keep npm test green while enabling
// gate-grep by requirement/threat token.

describe("Route Handler V4 access control", () => {
  it.todo("returns 401 when auth.api.getSession returns null");
  it.todo("returns pairs JSON when authenticated");
});
