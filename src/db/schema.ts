import { relations, sql } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  username: text("username").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  displayUsername: text("display_username"),
  role: text("role"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    impersonatedBy: text("impersonated_by"),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const camper = pgTable(
  "camper",
  {
    id: text("id").primaryKey(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    code: text("code").notNull().unique(),
    bunk: text("bunk").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("camper_code_idx").on(table.code),
    index("camper_name_idx").on(table.firstName, table.lastName),
  ]
);

export const pool = pgTable("pool", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

// CRITICAL: Do NOT name this table "session" — that name is taken by Better Auth (line 25 of schema.ts)
export const poolSession = pgTable(
  "pool_session",
  {
    id: text("id").primaryKey(),
    poolId: text("pool_id")
      .notNull()
      .references(() => pool.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("active"), // 'active' | 'closed'
    openedById: text("opened_by_id").references(() => user.id, { onDelete: "set null" }),
    openedAt: timestamp("opened_at").defaultNow().notNull(),
    closedAt: timestamp("closed_at"),
  },
  (table) => [
    // Enforces D-01: one active session per pool at a time (DB level)
    uniqueIndex("unique_active_session_per_pool")
      .on(table.poolId)
      .where(sql`status = 'active'`),
    index("pool_session_pool_id_idx").on(table.poolId),
    index("pool_session_status_idx").on(table.status),
  ],
);

export const pair = pgTable("pair", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => poolSession.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pairMember = pgTable(
  "pair_member",
  {
    pairId: text("pair_id")
      .notNull()
      .references(() => pair.id, { onDelete: "cascade" }),
    camperId: text("camper_id")
      .notNull()
      .references(() => camper.id, { onDelete: "cascade" }),
    sessionId: text("session_id") // denormalized for the unique constraint
      .notNull()
      .references(() => poolSession.id, { onDelete: "cascade" }),
  },
  (table) => [
    // Enforces PAIR-04: a camper cannot appear twice in the same session (DB level)
    uniqueIndex("unique_camper_per_session").on(table.camperId, table.sessionId),
    index("pair_member_pair_id_idx").on(table.pairId),
  ],
);

export const poolSessionRelations = relations(poolSession, ({ one, many }) => ({
  pool: one(pool, { fields: [poolSession.poolId], references: [pool.id] }),
  pairs: many(pair),
}));

export const pairRelations = relations(pair, ({ one, many }) => ({
  session: one(poolSession, { fields: [pair.sessionId], references: [poolSession.id] }),
  members: many(pairMember),
}));

export const pairMemberRelations = relations(pairMember, ({ one }) => ({
  pair: one(pair, { fields: [pairMember.pairId], references: [pair.id] }),
  camper: one(camper, { fields: [pairMember.camperId], references: [camper.id] }),
}));
