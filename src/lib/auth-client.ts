import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";
import { adminClient } from "better-auth/client/plugins";

// usernameClient() is REQUIRED — without it, authClient.signIn.username is not a function
export const authClient = createAuthClient({
  plugins: [usernameClient(), adminClient()],
});
