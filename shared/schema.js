import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
export const routes = pgTable("routes", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    startingPoint: text("starting_point").notNull(),
    destinations: jsonb("destinations").notNull(),
    transportMode: text("transport_mode").notNull(),
    routeData: jsonb("route_data"),
    createdAt: timestamp("created_at").default(sql `now()`),
});
export const insertRouteSchema = createInsertSchema(routes).pick({
    startingPoint: true,
    destinations: true,
    transportMode: true,
    routeData: true,
});
export const users = pgTable("users", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    username: text("username").notNull().unique(),
    password: text("password").notNull(),
});
export const insertUserSchema = createInsertSchema(users).pick({
    username: true,
    password: true,
});
