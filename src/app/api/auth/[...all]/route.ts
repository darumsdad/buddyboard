import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// toNextJsHandler is for App Router — do NOT use toNodeHandler (Pages Router only)
export const { GET, POST } = toNextJsHandler(auth);
