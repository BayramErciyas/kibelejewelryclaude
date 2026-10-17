import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  material: text("material").notNull(),
  stone: text("stone").notNull().default(""),
  series: text("series").notNull().default(""),
  priceCents: integer("price_cents").notNull(),
  stock: integer("stock").notNull().default(0),
  active: integer("active").notNull().default(1),
  images: text("images").notNull(),
  tag: text("tag").notNull().default(""),
  updatedAt: text("updated_at").notNull(),
});
export const adminMembers = sqliteTable("admin_members", {
  userId: text("user_id").primaryKey(),
  createdAt: text("created_at").notNull(),
});
export const storeSettings = sqliteTable("store_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
export const imageFiles = sqliteTable("image_files", {
  id: text("id").primaryKey(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  createdAt: text("created_at").notNull(),
});
