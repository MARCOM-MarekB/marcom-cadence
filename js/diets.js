import { currentUserId, supabase } from "./supabase.js";
import { toIsoDate } from "./dates.js";

const TABLE = "diets";

/**
 * Reads the diet in use today: the one with the latest start date that is not in the future.
 * @returns {Promise<{validFrom: string, content: Record<string, *>} | null>} The diet, or null when none is saved.
 */
export async function fetchCurrentDiet() {
  const { data, error } = await supabase
    .from(TABLE)
    .select("valid_from, content")
    .lte("valid_from", toIsoDate(new Date()))
    .order("valid_from", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data ? { validFrom: data.valid_from, content: data.content } : null;
}

/**
 * Saves a whole diet as valid from today in one write. Saving again on the same day replaces that day's version;
 * versions from earlier days stay unchanged.
 * @param {Record<string, *>} content The clean diet.
 * @returns {Promise<string>} The start date of the saved version.
 */
export async function saveDiet(content) {
  const validFrom = toIsoDate(new Date());
  const { error } = await supabase
    .from(TABLE)
    .upsert({ user_id: await currentUserId(), valid_from: validFrom, content }, { onConflict: "user_id,valid_from" });
  if (error) {
    throw error;
  }
  return validFrom;
}
