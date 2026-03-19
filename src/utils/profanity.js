// Common offensive words and slurs — kept minimal but effective
const BLOCKED_WORDS = [
  "shit", "fuck", "fucking", "fucker", "bitch", "ass", "asshole",
  "damn", "dick", "cock", "pussy", "cunt", "bastard", "whore",
  "slut", "fag", "faggot", "nigger", "nigga", "retard", "retarded",
  "douche", "douchebag", "motherfucker", "bullshit", "piss",
  "crap", "twat", "wanker", "jackass", "dipshit", "shitty",
];

/**
 * Checks text for profanity. Returns the offending word if found, or null if clean.
 */
export function checkProfanity(...texts) {
  for (const text of texts) {
    if (!text) continue;
    const words = text.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/);
    for (const word of words) {
      if (BLOCKED_WORDS.includes(word)) {
        return word;
      }
    }
  }
  return null;
}
