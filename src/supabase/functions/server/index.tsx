import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Browser callers must be explicitly trusted. Extend this list per deployed
// environment with the server-side ALLOWED_ORIGINS Edge Function secret
// (comma-separated, exact origins); do not use a VITE_ variable for it.
const defaultAllowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://maxbearingsja.vercel.app",
  "https://maxbearingsja-git-main-chads-projects-03349a29.vercel.app",
  "https://sourcesevens.vercel.app",
];

const configuredAllowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  ...defaultAllowedOrigins,
  ...configuredAllowedOrigins,
]);

// Enable logger
app.use('*', logger(console.log));

// Enable CORS only for known frontend origins. The callback returns no
// allow-origin header for untrusted origins, so browsers cannot read responses.
app.use(
  "/*",
  cors({
    origin: (origin) => (allowedOrigins.has(origin) ? origin : ""),
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-2ab21562/health", (c) => {
  return c.json({ status: "ok" });
});

// Products endpoints
app.get("/make-server-2ab21562/products", async (c) => {
  try {
    const products = await kv.getByPrefix("product:");
    return c.json({ products: products || [] });
  } catch (error) {
    console.error("Error fetching products:", error);
    return c.json({ error: "Failed to fetch products", details: String(error) }, 500);
  }
});

app.post("/make-server-2ab21562/products", async (c) => {
  try {
    const product = await c.req.json();
    const productId = product.id || `product:${Date.now()}-${Math.random().toString(36).substring(7)}`;
    await kv.set(productId, product);
    return c.json({ success: true, id: productId, product });
  } catch (error) {
    console.error("Error adding product:", error);
    return c.json({ error: "Failed to add product", details: String(error) }, 500);
  }
});

app.put("/make-server-2ab21562/products/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    const existing = await kv.get(id);
    
    if (!existing) {
      return c.json({ error: "Product not found" }, 404);
    }
    
    const updated = { ...existing, ...updates };
    await kv.set(id, updated);
    return c.json({ success: true, product: updated });
  } catch (error) {
    console.error("Error updating product:", error);
    return c.json({ error: "Failed to update product", details: String(error) }, 500);
  }
});

app.delete("/make-server-2ab21562/products/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(id);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    return c.json({ error: "Failed to delete product", details: String(error) }, 500);
  }
});

// Bulk operations
app.post("/make-server-2ab21562/products/bulk", async (c) => {
  try {
    const { products } = await c.req.json();
    const results = [];
    
    for (const product of products) {
      const productId = `product:${Date.now()}-${Math.random().toString(36).substring(7)}`;
      await kv.set(productId, { ...product, id: productId });
      results.push({ id: productId, product });
    }
    
    return c.json({ success: true, count: results.length, products: results });
  } catch (error) {
    console.error("Error bulk importing products:", error);
    return c.json({ error: "Failed to bulk import products", details: String(error) }, 500);
  }
});

app.delete("/make-server-2ab21562/products/bulk/:action", async (c) => {
  try {
    const action = c.req.param("action");
    const allProducts = await kv.getByPrefix("product:");
    
    let deletedCount = 0;
    
    if (action === "purge") {
      // Delete all products
      for (const product of allProducts) {
        await kv.del(product.id);
        deletedCount++;
      }
    } else if (action === "baby" || action === "pharmaceutical") {
      // Delete products by category
      for (const product of allProducts) {
        if (product.category === action) {
          await kv.del(product.id);
          deletedCount++;
        }
      }
    } else {
      return c.json({ error: "Invalid action. Use 'baby', 'pharmaceutical', or 'purge'" }, 400);
    }
    
    return c.json({ success: true, deletedCount });
  } catch (error) {
    console.error("Error bulk deleting products:", error);
    return c.json({ error: "Failed to bulk delete products", details: String(error) }, 500);
  }
});

// User data endpoints
app.get("/make-server-2ab21562/users/:email", async (c) => {
  try {
    const email = c.req.param("email");
    const userData = await kv.get(`user:${email}`);
    
    if (!userData) {
      // Return default user data
      return c.json({
        email,
        cart: [],
        wishlist: [],
        orders: [],
        accountSettings: {
          name: "",
          phone: "",
          address: {
            street: "",
            city: "",
            state: "",
            zip: "",
            country: ""
          }
        }
      });
    }
    
    return c.json(userData);
  } catch (error) {
    console.error("Error fetching user data:", error);
    return c.json({ error: "Failed to fetch user data", details: String(error) }, 500);
  }
});

app.put("/make-server-2ab21562/users/:email", async (c) => {
  try {
    const email = c.req.param("email");
    const userData = await c.req.json();
    await kv.set(`user:${email}`, userData);
    return c.json({ success: true, userData });
  } catch (error) {
    console.error("Error updating user data:", error);
    return c.json({ error: "Failed to update user data", details: String(error) }, 500);
  }
});

Deno.serve(app.fetch);
