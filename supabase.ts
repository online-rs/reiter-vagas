
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hcqpgfyebbxdjmzarnfn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjcXBnZnllYmJ4ZGptemFybmZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4NzgwNDMsImV4cCI6MjA1MjQ1NDA0M30.CbetDcMKTTJAOJa19zrj48w3JIfLIezPjQKIn9n803I';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
