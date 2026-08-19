import { relations } from "drizzle-orm";
import { issues, payments, plans, savedBriefs, subscriptions, users } from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  subscriptions: many(subscriptions),
  payments: many(payments),
  savedBriefs: many(savedBriefs),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
  plan: one(plans, { fields: [subscriptions.planId], references: [plans.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, { fields: [payments.userId], references: [users.id] }),
  plan: one(plans, { fields: [payments.planId], references: [plans.id] }),
}));

export const savedBriefsRelations = relations(savedBriefs, ({ one }) => ({
  user: one(users, { fields: [savedBriefs.userId], references: [users.id] }),
  issue: one(issues, { fields: [savedBriefs.issueId], references: [issues.id] }),
}));
