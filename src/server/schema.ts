import { boolean, integer, numeric, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey(),
  email: varchar('email', { length: 255 }),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  isAdmin: boolean('is_admin').notNull().default(false),
  neonAuthUserId: text('neon_auth_user_id').unique(),
});

export const categories = pgTable('categories', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull(),
  description: text('description'),
  parentId: varchar('parent_id', { length: 50 }),
  imageUrl: text('image_url'),
  displayOrder: integer('display_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable('products', {
  id: text('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 50 }).notNull(),
  categoryId: varchar('category_id', { length: 50 }),
  subcategoryId: varchar('subcategory_id', { length: 50 }),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  originalPrice: numeric('original_price', { precision: 10, scale: 2 }),
  costPrice: numeric('cost_price', { precision: 10, scale: 2 }),
  currency: varchar('currency', { length: 3 }).notNull(),
  imageUrl: text('image_url').notNull(),
  rating: numeric('rating', { precision: 3, scale: 2 }).notNull(),
  reviewCount: integer('review_count').notNull(),
  stockCount: integer('stock_count').notNull(),
  soldCount: integer('sold_count').notNull(),
  inStock: boolean('in_stock').notNull(),
  badge: varchar('badge', { length: 50 }),
  isActive: boolean('is_active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});

export const productPricingSettings = pgTable('product_pricing_settings', {
  productId: text('product_id').primaryKey(),
  purchaseMode: varchar('purchase_mode', { length: 10 }).notNull(),
});
