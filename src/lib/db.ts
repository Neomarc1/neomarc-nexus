/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/integrations/supabase/client";

/**
 * Loosely typed client used by the generic CRUD modules, where the table name
 * is resolved at runtime. Typed queries should keep using `supabase` directly.
 */
export const db = supabase as any;

export type Row = Record<string, any>;
