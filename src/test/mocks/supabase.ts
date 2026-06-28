import { vi } from "vitest";

// Supabase browser mock factory.
// Use in test files:
//   vi.mock("@/lib/supabase-browser", supabaseMockFactory);
//
// For subscribe callback capture, provide a custom factory:
//   let capturedSubscribeCb: (...) => void;
//   vi.mock("@/lib/supabase-browser", () => ({
//     supabase: { channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(),
//       subscribe: vi.fn((cb) => { capturedSubscribeCb = cb; return {}; }) })),
//       removeChannel: vi.fn() } }));

export function supabaseMockFactory() {
  return {
    supabase: {
      channel: vi.fn().mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      }),
      removeChannel: vi.fn(),
    },
  };
}
