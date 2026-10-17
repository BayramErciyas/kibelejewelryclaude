import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import assert from "node:assert/strict";
import { handleCatalog } from "../lib/catalog-service.js";
const sqlite = new DatabaseSync(":memory:");
for (const file of fs
  .readdirSync("drizzle")
  .filter((file) => file.endsWith(".sql"))
  .sort())
  sqlite.exec(fs.readFileSync("drizzle/" + file, "utf8"));
class Statement {
  constructor(sql, args = []) {
    this.sql = sql;
    this.args = args;
  }
  bind(...args) {
    return new Statement(this.sql, args);
  }
  async first() {
    return sqlite.prepare(this.sql).get(...this.args) || null;
  }
  async all() {
    return { results: sqlite.prepare(this.sql).all(...this.args) };
  }
  async run() {
    const result = sqlite.prepare(this.sql).run(...this.args);
    return {
      meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) },
    };
  }
}
const objects = new Map();
const env = {
  DB: {
    prepare: (sql) => new Statement(sql),
    async batch(stmts) {
      sqlite.exec("BEGIN");
      try {
        const out = [];
        for (const stmt of stmts) out.push(await stmt.run());
        sqlite.exec("COMMIT");
        return out;
      } catch (e) {
        sqlite.exec("ROLLBACK");
        throw e;
      }
    },
  },
  BUCKET: {
    async put(id, bytes) {
      objects.set(id, bytes);
    },
    async get(id) {
      return objects.has(id) ? { body: objects.get(id) } : null;
    },
    async delete(id) {
      objects.delete(id);
    },
  },
};
const auth = {
  "oai-authenticated-user-id": "owner-stable-id",
  "oai-authenticated-user-email": "byrmerc@gmail.com",
};
async function call(path, method = "GET", body, headers = auth) {
  const options = { method, headers: { ...headers } };
  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }
  const response = await handleCatalog(new Request("https://shop.test" + path, options), env);
  return { status: response.status, data: await response.json() };
}
assert.equal((await call("/api/admin/catalog", "GET", undefined, {})).status, 401);
assert.equal(
  (
    await call("/api/admin/catalog", "GET", undefined, {
      "oai-authenticated-user-id": "visitor",
      "oai-authenticated-user-email": "other@test.com",
    })
  ).status,
  403,
);
let result = await call("/api/catalog", "GET", undefined, {});
assert.equal(result.data.products.length, 6);
assert.equal(result.data.initialized, false);
result = await call("/api/admin/catalog");
assert.equal(result.status, 200);
assert.equal(
  (
    await call("/api/admin/catalog", "GET", undefined, {
      "oai-authenticated-user-id": "owner-stable-id",
    })
  ).status,
  200,
  "Membership persists by stable ID",
);
const product = {
  name: "Gerçek ürün testi",
  description: "925 gümüş · açıklama",
  category: "Rings",
  material: "Silver",
  stone: "Zultanite",
  series: "cappadocia",
  price: 125.55,
  stock: 3,
  active: true,
  images: ["assets/ring.jpg"],
  tag: "YENİ",
};
assert.equal(
  (await call("/api/admin/products", "POST", product, { ...auth, Origin: "https://evil.test" }))
    .status,
  403,
);
assert.equal((await call("/api/admin/products", "POST", { ...product, price: -1 })).status, 400);
assert.equal(
  (await call("/api/admin/products", "POST", { ...product, images: ["https://evil.test/x.jpg"] }))
    .status,
  400,
);
result = await call("/api/admin/products", "POST", product);
assert.equal(result.status, 201);
assert.equal(result.data.products.length, 7);
const id = result.data.products.find((p) => p.name === product.name).id;
result = await call("/api/catalog", "GET", undefined, {});
assert.equal(result.data.products.find((p) => p.id === id).price, 125.55);
assert.equal(result.data.products.find((p) => p.id === id).series, "cappadocia");
assert.equal(
  (await call("/api/admin/products/" + id, "PUT", { ...product, stock: -1 })).status,
  400,
);
result = await call("/api/admin/products/" + id, "PUT", {
  ...product,
  price: 200,
  active: false,
  stock: 0,
});
assert.equal(result.status, 200);
result = await call("/api/catalog", "GET", undefined, {});
assert(!result.data.products.some((p) => p.id === id), "Draft hidden from storefront");
const form = new FormData();
form.set(
  "file",
  new File([fs.readFileSync("public/assets/ring.jpg")], "ring.jpg", { type: "image/jpeg" }),
);
let response = await handleCatalog(
  new Request("https://shop.test/api/admin/uploads", { method: "POST", headers: auth, body: form }),
  env,
);
assert.equal(response.status, 201);
const photo = await response.json();
assert(photo.url.startsWith("/api/media/"));
response = await handleCatalog(new Request("https://shop.test" + photo.url), env);
assert.equal(response.status, 200);
assert.equal(response.headers.get("Content-Type"), "image/jpeg");
assert((await response.arrayBuffer()).byteLength > 0);
const bad = new FormData();
bad.set("file", new File(["this is not a valid image"], "bad.jpg", { type: "image/jpeg" }));
response = await handleCatalog(
  new Request("https://shop.test/api/admin/uploads", { method: "POST", headers: auth, body: bad }),
  env,
);
assert.equal(response.status, 400);
result = await call("/api/admin/products/" + id, "PUT", {
  ...product,
  images: [photo.url, "assets/ring.jpg"],
  price: 999,
});
assert.equal(result.status, 200);
result = await call("/api/admin/settings", "PATCH", { heroImage: photo.url });
assert.equal(result.status, 200);
result = await call("/api/catalog", "GET", undefined, {});
assert.equal(result.data.settings.heroImage, photo.url);
assert.equal(result.data.products.find((p) => p.id === id).images.length, 2);
assert.equal((await call("/api/admin/products/" + id, "DELETE")).status, 200);
assert.equal((await call("/api/admin/products/" + id, "DELETE")).status, 404);
// Verify a separate request still reads shared data, and deletion is not reseeded.
for (let seedId = 1; seedId <= 6; seedId++) await call("/api/admin/products/" + seedId, "DELETE");
result = await call("/api/catalog", "GET", undefined, {});
assert.equal(result.data.products.length, 0);
assert.equal(result.data.initialized, true);
console.log(
  "PASS: authentication, stable owner membership, cross-origin rejection, validation, create/edit/delete, hidden drafts, shared persistence, image uploads/readback, invalid files, hero settings, and empty-catalog persistence.",
);
