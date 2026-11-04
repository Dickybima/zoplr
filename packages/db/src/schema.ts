import { index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { AGENT_STATUSES } from "@zoplr/core";

export const agentStatus = pgEnum("agent_status", AGENT_STATUSES);

export const agents = pgTable(
  "agents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    ticker: text("ticker").notNull(),
    description: text("description").notNull().default(""),
    persona: text("persona").notNull(),
    imageUrl: text("image_url"),
    model: text("model"),
    creatorAddress: text("creator_address").notNull(),
    status: agentStatus("status").notNull().default("draft"),
    launchTxHash: text("launch_tx_hash").unique(),
    tokenAddress: text("token_address").unique(),
    chainMode: text("chain_mode").notNull(),
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("agents_status_idx").on(t.status)],
);

export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
