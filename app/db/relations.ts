import { relations } from "drizzle-orm";
import { issues, savedBriefs, users } from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  savedBriefs: many(savedBriefs),
}));

export const savedBriefsRelations = relations(savedBriefs, ({ one }) => ({
  user: one(users, { fields: [savedBriefs.userId], references: [users.id] }),
  issue: one(issues, { fields: [savedBriefs.issueId], references: [issues.id] }),
}));
