/* KİBELE — Ürün ve fotoğraf API hizmeti
 * GET /api/catalog: Vitrinde yayınlanan ürünler
 * GET /api/admin/catalog: Yönetici kataloğu (taslaklar dahil)
 * POST/PUT/DELETE /api/admin/products: Ürün ekleme/düzenleme/silme
 * POST /api/admin/uploads: Fotoğraf yükleme
 * PATCH /api/admin/settings: Ana sayfa görseli
 * Kalıcı tablo yapıları: db/schema.ts
 */
import { seedProducts } from "./seed.js";
const OWNER_EMAIL = "byrmerc@gmail.com";
const CATEGORIES = ["Rings", "Necklaces", "Earrings", "Bracelets", "Charms"];
const MATERIALS = ["Gold", "Silver", "Gemstone"];
const MAX_IMAGE = 5 * 1024 * 1024;
const now = () => new Date().toISOString();
const json = (data, status = 200) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
class ApiError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
function db(env) {
  if (!env.DB) throw new ApiError("Ürün veritabanı kullanılamıyor.", 503);
  return env.DB;
}
function requireOrigin(request) {
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin)
    throw new ApiError("Bu kaynaktan işlem yapılamaz.", 403);
  const site = request.headers.get("Sec-Fetch-Site");
  if (site === "cross-site") throw new ApiError("Bu kaynaktan işlem yapılamaz.", 403);
}
// YETKİ: Doğrulanmış hesap, ardından kalıcı yönetici kimliği.
async function authorize(request, env) {
  const id = request.headers.get("oai-authenticated-user-id");
  const email = request.headers.get("oai-authenticated-user-email");
  if (!id) throw new ApiError("Yönetim paneli için hesabınızla giriş yapın.", 401);
  const member = await db(env)
    .prepare("SELECT user_id FROM admin_members WHERE user_id = ?")
    .bind(id)
    .first();
  if (member) return id;
  // Bootstrap only the verified owner, then use the stable Site user ID.
  const exists = await db(env).prepare("SELECT user_id FROM admin_members LIMIT 1").first();
  if (!exists && email?.toLowerCase() === OWNER_EMAIL) {
    await db(env)
      .prepare("INSERT OR IGNORE INTO admin_members (user_id,created_at) VALUES (?,?)")
      .bind(id, now())
      .run();
    const allowed = await db(env)
      .prepare("SELECT user_id FROM admin_members WHERE user_id = ?")
      .bind(id)
      .first();
    if (allowed) return id;
  }
  throw new ApiError("Bu hesap ürün yönetimi için yetkili değil.", 403);
}
// VERİ DÖNÜŞÜMÜ: Veritabanındaki kuruş tutarını EUR fiyatına çevirir.
function productFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    detail: row.description,
    category: row.category,
    material: row.material,
    stone: row.stone,
    series: row.series || "",
    price: row.price_cents / 100,
    stock: row.stock,
    active: !!row.active,
    images: JSON.parse(row.images),
    image: JSON.parse(row.images)[0],
    tag: row.tag,
    updatedAt: row.updated_at,
  };
}
function demoProducts() {
  return seedProducts.map((p) => ({
    ...p,
    description: p.detail,
    images: [p.image],
    stock: 10,
    active: true,
    stone: "",
    series: "",
  }));
}
async function initialized(env) {
  return !!(await db(env)
    .prepare("SELECT value FROM store_settings WHERE key = ?")
    .bind("catalog_initialized")
    .first());
}
async function settings(env) {
  const rows = await db(env)
    .prepare("SELECT key,value FROM store_settings WHERE key != ?")
    .bind("catalog_initialized")
    .all();
  return Object.fromEntries(rows.results.map((r) => [r.key, r.value]));
}
async function catalog(env, admin = false) {
  const init = await initialized(env);
  if (!init) return { products: demoProducts(), settings: await settings(env), initialized: false };
  const rows = await db(env)
    .prepare("SELECT * FROM products" + (admin ? "" : " WHERE active = 1") + " ORDER BY id DESC")
    .all();
  return {
    products: rows.results.map(productFromRow),
    settings: await settings(env),
    initialized: true,
  };
}
// İLK KATALOG: Örnek verileri yalnızca ilk yönetim işleminde kaydeder.
async function seed(env, includeExamples = true) {
  if (await initialized(env)) return;
  const ops = [];
  if (includeExamples)
    for (const p of seedProducts)
      ops.push(
        db(env)
          .prepare(
            "INSERT OR IGNORE INTO products (id,name,description,category,material,stone,price_cents,stock,active,images,tag,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
          )
          .bind(
            p.id,
            p.name,
            p.detail,
            p.category,
            p.material,
            "",
            Math.round(p.price * 100),
            10,
            1,
            JSON.stringify([p.image]),
            p.tag,
            now(),
          ),
      );
  ops.push(
    db(env)
      .prepare("INSERT OR IGNORE INTO store_settings (key,value) VALUES (?,?)")
      .bind("catalog_initialized", "true"),
  );
  await db(env).batch(ops);
}
async function validImage(url, env) {
  if (typeof url !== "string") return false;
  if (/^\/?assets\/[a-zA-Z0-9_.-]+\.(jpg|jpeg|png|webp)$/.test(url)) return true;
  const m = url.match(/^\/api\/media\/([a-f0-9-]{36})$/);
  return !!(
    m && (await db(env).prepare("SELECT id FROM image_files WHERE id = ?").bind(m[1]).first())
  );
}
// DOĞRULAMA: Güvenilmeyen form girdilerini kayıttan önce kontrol eder.
async function validateProduct(body, env) {
  const series = body?.series || "";
  if (!["", "cappadocia", "balloon", "turkish-eye"].includes(series))
    throw new ApiError("Geçersiz koleksiyon.");
  if (typeof body !== "object" || !body) throw new ApiError("Ürün bilgileri geçersiz.");
  const name = String(body.name || "").trim(),
    description = String(body.description || "").trim(),
    stone = String(body.stone || "").trim(),
    tag = String(body.tag || "").trim();
  if (!name || name.length > 120) throw new ApiError("Ürün adı 1–120 karakter olmalı.");
  if (description.length > 5000 || stone.length > 100 || tag.length > 60)
    throw new ApiError("Açıklama veya etiket çok uzun.");
  if (!CATEGORIES.includes(body.category) || !MATERIALS.includes(body.material))
    throw new ApiError("Kategori veya materyal geçersiz.");
  if (
    typeof body.price !== "number" ||
    !Number.isFinite(body.price) ||
    body.price < 0.01 ||
    body.price > 1000000
  )
    throw new ApiError("Geçerli bir EUR fiyatı girin.");
  if (!Number.isSafeInteger(body.stock) || body.stock < 0 || body.stock > 1000000)
    throw new ApiError("Stok sıfır veya pozitif tam sayı olmalı.");
  if (typeof body.active !== "boolean") throw new ApiError("Ürün yayın durumu geçersiz.");
  if (!Array.isArray(body.images) || body.images.length < 1 || body.images.length > 8)
    throw new ApiError("Ürün için 1–8 fotoğraf seçin.");
  for (const image of body.images)
    if (!(await validImage(image, env))) throw new ApiError("Geçersiz ürün fotoğrafı.");
  return {
    name,
    description,
    stone,
    tag,
    category: body.category,
    material: body.material,
    series,
    priceCents: Math.round(body.price * 100),
    stock: body.stock,
    active: body.active ? 1 : 0,
    images: JSON.stringify(body.images),
  };
}
async function bodyJson(request) {
  const raw = await request.text();
  if (raw.length > 40000) throw new ApiError("İstek çok büyük.", 413);
  try {
    return JSON.parse(raw);
  } catch {
    throw new ApiError("Geçersiz veri biçimi.");
  }
}
function imageType(bytes) {
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  if (bytes.slice(0, 8).every((v, i) => v === [137, 80, 78, 71, 13, 10, 26, 10][i]))
    return "image/png";
  if (
    new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
  )
    return "image/webp";
  return null;
}
// İSTEK YÖNLENDİRME: Her yazma işleminden önce yetki kontrolü yapılır.
export async function handleCatalog(request, env) {
  try {
    const path = new URL(request.url).pathname,
      method = request.method;
    if (method === "GET" && path === "/api/catalog") return json(await catalog(env));
    const media = path.match(/^\/api\/media\/([a-f0-9-]{36})$/);
    if (method === "GET" && media) {
      const file = await db(env)
        .prepare("SELECT mime FROM image_files WHERE id = ?")
        .bind(media[1])
        .first();
      if (!file || !env.BUCKET) throw new ApiError("Fotoğraf bulunamadı.", 404);
      const obj = await env.BUCKET.get(media[1]);
      if (!obj) throw new ApiError("Fotoğraf bulunamadı.", 404);
      return new Response(obj.body, {
        headers: {
          "Content-Type": file.mime,
          "Cache-Control": "public, max-age=31536000, immutable",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    if (!path.startsWith("/api/admin/")) throw new ApiError("Sayfa bulunamadı.", 404);
    if (method !== "GET") requireOrigin(request);
    await authorize(request, env);
    if (method === "GET" && path === "/api/admin/catalog") return json(await catalog(env, true));
    if (method === "POST" && path === "/api/admin/initialize") {
      await seed(env);
      return json(await catalog(env, true));
    }
    if (method === "POST" && path === "/api/admin/uploads") {
      if (!env.BUCKET) throw new ApiError("Fotoğraf depolaması hazır değil.", 503);
      if (Number(request.headers.get("Content-Length")) > MAX_IMAGE + 100000)
        throw new ApiError("Fotoğraf en fazla 5 MB olabilir.", 413);
      const form = await request.formData(),
        file = form.get("file");
      if (!file || typeof file === "string" || file.size < 12 || file.size > MAX_IMAGE)
        throw new ApiError("5 MB altında JPG, PNG veya WebP fotoğraf seçin.");
      const bytes = new Uint8Array(await file.arrayBuffer()),
        mime = imageType(bytes);
      if (!mime) throw new ApiError("Dosya geçerli JPG, PNG veya WebP değil.");
      const id = crypto.randomUUID();
      await env.BUCKET.put(id, bytes, { httpMetadata: { contentType: mime } });
      try {
        await db(env)
          .prepare("INSERT INTO image_files (id,mime,size,created_at) VALUES (?,?,?,?)")
          .bind(id, mime, bytes.length, now())
          .run();
      } catch (e) {
        await env.BUCKET.delete(id);
        throw e;
      }
      return json({ url: "/api/media/" + id }, 201);
    }
    if (method === "PATCH" && path === "/api/admin/settings") {
      const body = await bodyJson(request);
      if (!(await validImage(body.heroImage, env)))
        throw new ApiError("Geçerli bir açılış fotoğrafı seçin.");
      await db(env)
        .prepare(
          "INSERT INTO store_settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        )
        .bind("heroImage", body.heroImage)
        .run();
      return json({ saved: true });
    }
    const match = path.match(/^\/api\/admin\/products(?:\/(\d+))?$/);
    if (match && (method === "POST" || method === "PUT")) {
      const data = await validateProduct(await bodyJson(request), env);
      await seed(env);
      const vals = [
        data.name,
        data.description,
        data.category,
        data.material,
        data.stone,
        data.priceCents,
        data.stock,
        data.active,
        data.images,
        data.tag,
        now(),
        data.series,
      ];
      if (method === "PUT") {
        if (!match[1]) throw new ApiError("Ürün numarası gerekli.");
        const result = await db(env)
          .prepare(
            "UPDATE products SET name=?,description=?,category=?,material=?,stone=?,price_cents=?,stock=?,active=?,images=?,tag=?,updated_at=?,series=? WHERE id=?",
          )
          .bind(...vals, Number(match[1]))
          .run();
        if (!result.meta.changes) throw new ApiError("Ürün bulunamadı.", 404);
      } else {
        if (match[1]) throw new ApiError("Geçersiz adres.");
        await db(env)
          .prepare(
            "INSERT INTO products (name,description,category,material,stone,price_cents,stock,active,images,tag,updated_at,series) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
          )
          .bind(...vals)
          .run();
      }
      return json(await catalog(env, true), method === "POST" ? 201 : 200);
    }
    if (match && method === "DELETE" && match[1]) {
      await seed(env);
      const result = await db(env)
        .prepare("DELETE FROM products WHERE id=?")
        .bind(Number(match[1]))
        .run();
      if (!result.meta.changes) throw new ApiError("Ürün bulunamadı.", 404);
      return json({ deleted: true });
    }
    throw new ApiError("İşlem bulunamadı.", 404);
  } catch (e) {
    if (e instanceof ApiError) return json({ error: e.message }, e.status);
    console.error("Catalog operation failed:", e?.message);
    return json({ error: "İşlem tamamlanamadı. Lütfen tekrar deneyin." }, 500);
  }
}

export async function canManageCatalog(request, env) {
  try {
    await authorize(request, env);
    return true;
  } catch {
    return false;
  }
}
