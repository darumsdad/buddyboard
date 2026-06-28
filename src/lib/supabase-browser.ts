import { createClient } from "@supabase/supabase-js";

// Singleton — import { supabase } from "@/lib/supabase-browser" in any client component
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
