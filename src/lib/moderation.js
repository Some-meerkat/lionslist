import { supabase } from "./supabase";

export async function moderateContent({ name, note, category, imageUrls = [] }) {
  try {
    const { data, error } = await supabase.functions.invoke("moderate-content", {
      body: { name, note, category, imageUrls },
    });
    if (error || !data) {
      console.warn("Moderation service unavailable, allowing listing:", error);
      return { allowed: true };
    }
    return data;
  } catch (err) {
    console.warn("Moderation service error, fail-open:", err);
    return { allowed: true };
  }
}
