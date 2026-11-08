import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/+esm";

/** Address of the Supabase project. Public, like the publishable key. */
const SUPABASE_URL = "https://sylmbnnigldjmjxtyeli.supabase.co";

/**
 * Publishable key of the Supabase project. It only identifies the project;
 * Row Level Security decides which rows a signed-in user can reach.
 */
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_SbRDLsC4DH5pk68cia5onw_0rcwi3pE";

/** Database schema holding the app's tables. It must be listed in Exposed schemas in the Data API settings. */
const SCHEMA = "marcom_cadence";

/** Client shared by the whole app. It keeps the login session in browser storage and refreshes it. */
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { db: { schema: SCHEMA } });
