import { vi } from "vitest";

/**
 * Reusable Supabase mock for @/lib/supabase-browser.
 *
 * Call setupSupabaseMock() at the top of your test file to register the mock.
 * Use captureSubscribeCallback() after setup to grab the subscribe status
 * callback so tests can invoke it manually to simulate SUBSCRIBED /
 * CHANNEL_ERROR / CLOSED events.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let capturedSubscribeCb: ((status: string, err?: any) => void) | null = null;

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockImplementation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (cb?: (status: string, err?: any) => void) => {
      if (cb) capturedSubscribeCb = cb;
      return mockChannel;
    },
  ),
};

export const mockSupabase = {
  channel: vi.fn().mockReturnValue(mockChannel),
  removeChannel: vi.fn(),
};

/**
 * Register vi.mock for @/lib/supabase-browser.
 * Call this once at the module level in your test file (before any imports
 * that would trigger the real module).
 */
export function setupSupabaseMock() {
  vi.mock("@/lib/supabase-browser", () => ({
    supabase: mockSupabase,
  }));
}

/**
 * Returns the subscribe callback captured from the most recent subscribe() call.
 * Call after the component has mounted and the channel.subscribe() has been called.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function captureSubscribeCallback(): (status: string, err?: any) => void {
  if (!capturedSubscribeCb) {
    throw new Error(
      "No subscribe callback captured yet — ensure the component has mounted and called channel.subscribe()",
    );
  }
  return capturedSubscribeCb;
}

/**
 * Reset mock state. Call in beforeEach alongside vi.clearAllMocks().
 */
export function resetSupabaseMock() {
  capturedSubscribeCb = null;
  mockChannel.on.mockReturnThis();
  mockChannel.subscribe.mockImplementation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (cb?: (status: string, err?: any) => void) => {
      if (cb) capturedSubscribeCb = cb;
      return mockChannel;
    },
  );
  mockSupabase.channel.mockReturnValue(mockChannel);
  mockSupabase.removeChannel.mockReset();
}
