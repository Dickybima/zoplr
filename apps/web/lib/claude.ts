import Anthropic from "@anthropic-ai/sdk";

/** Klien Anthropic. Kredensial dibaca dari ANTHROPIC_API_KEY. */
export const anthropic = new Anthropic();

export const DEFAULT_MODEL = process.env.ZOPLR_DEFAULT_MODEL ?? "claude-opus-5-5";

/**
 * Effort untuk chat persona. Chat santai biasanya cukup di "low" dan jauh
 * lebih hemat token; naikkan lewat env jika kualitas jawaban kurang.
 */
export const CHAT_EFFORT = (process.env.ZOPLR_CHAT_EFFORT ?? "low") as
  | "low"
  | "medium"
  | "high"
  | "xhigh"
  | "max";
