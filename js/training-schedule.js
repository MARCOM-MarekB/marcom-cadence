import { currentUserId, supabase } from "./supabase.js";
import { toIsoDate } from "./dates.js";

const TABLE = "training_schedules";

/** Schedule used until one is saved: Monday 19:30 and Thursday 20:00, two hours each. */
export const DEFAULT_SESSIONS = [
  { day: 0, start: "19:30", durationMin: 120 },
  { day: 3, start: "20:00", durationMin: 120 },
];

/**
 * Reads the sessions from schedule content. Invalid sessions are skipped.
 * @param {Record<string, *> | null} content The row content.
 * @returns {Array<{day: number, start: string, durationMin: number}>} Sessions in week order.
 */
export function toSessions(content) {
  return (content?.sessions ?? [])
    .filter((session) => Number.isInteger(session.day) && session.day >= 0 && session.day <= 6
      && /^\d{2}:\d{2}$/.test(session.start ?? "")
      && typeof session.durationMin === "number" && session.durationMin > 0)
    .map((session) => ({ day: session.day, start: session.start, durationMin: session.durationMin }))
    .sort((a, b) => a.day - b.day || a.start.localeCompare(b.start));
}

/**
 * Reads the schedule in use today: the one with the latest start date that is not in the future.
 * @returns {Promise<{validFrom: string, sessions: ReturnType<typeof toSessions>} | null>} The schedule, or null when none is saved.
 */
export async function fetchCurrentSchedule() {
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
  return data ? { validFrom: data.valid_from, sessions: toSessions(data.content) } : null;
}

/**
 * Saves the schedule as valid from today. Saving again on the same day replaces that day's version;
 * versions from earlier days stay unchanged.
 * @param {Array<{day: number, start: string, durationMin: number}>} sessions The sessions.
 * @returns {Promise<string>} The start date of the saved version.
 */
export async function saveSchedule(sessions) {
  const validFrom = toIsoDate(new Date());
  const { error } = await supabase
    .from(TABLE)
    .upsert(
      { user_id: await currentUserId(), valid_from: validFrom, content: { sessions } },
      { onConflict: "user_id,valid_from" },
    );
  if (error) {
    throw error;
  }
  return validFrom;
}
