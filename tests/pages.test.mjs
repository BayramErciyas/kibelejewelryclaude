import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createPageRenderer } from "../lib/page-renderer.js";
import { collectionPages } from "../lib/page-config.js";
import { seedProducts } from "../lib/seed.js";
const read = (name) => fs.readFileSync("templates/" + name + ".html", "utf8");
const pages = createPageRenderer({
  shell: read("storefront"),
  productList: read("product-list"),
  collectionLayout: read("collection"),
  materialsContent: read("materials"),
  worldContent: read("our-world"),
  utilityLayout: read("utility"),
  utilityContent: { favorites: read("favorites"), cart: read("cart"), login: read("login") },
});
assert(pages.home.includes('class="hero"'));
for (const [slug, config] of Object.entries(collectionPages)) {
  const page = pages.collection(slug);
  assert.equal(page.status, 200);
  assert.equal((page.html.match(/<main(?:\s|>)/g) || []).length, 1);
  assert.equal((page.html.match(/<header /g) || []).length, 1);
  assert.equal((page.html.match(/<footer[ >]/g) || []).length, 1);
  assert(page.html.includes(`data-default-category="${config.category}"`));
  assert(page.html.includes(`data-default-material="${config.material}"`));
  assert(page.html.includes(`<title>${config.en} — KİBELE</title>`));
  assert(page.html.includes(`href="/collections/${slug}" aria-current="page"`));
  assert(page.html.includes('href="/style.css"'));
  assert(page.html.includes('src="/app.js"'));
  assert(page.html.includes('class="hero collection-page-intro"'));
  assert(page.html.includes("data-campaign-banner"));
  assert(page.html.includes(`src="${config.image}"`));
  assert(!page.html.includes("{{TITLE_EN}}"));
  assert(page.html.includes('id="products"'));
}
assert.equal(pages.collection("missing").status, 404);
for (const slug of ["materials", "our-world"]) {
  const page = pages.information(slug);
  assert.equal(page.status, 200);
  assert(page.html.includes("data-campaign-banner"));
  assert(page.html.includes('class="hero collection-page-intro"'));
  assert(!page.html.includes('id="products"'));
  assert(page.html.includes('data-page-kind="info"'));
  assert(page.html.includes(`href="/${slug}" aria-current="page"`));
}
// Yeni yardımcı sayfalar: istek listesi, sepet, oturum açma.
for (const slug of ["favorites", "cart", "login"]) {
  const page = pages.utility(slug);
  assert.equal(page.status, 200);
  assert.equal((page.html.match(/<main(?:\s|>)/g) || []).length, 1);
  assert(page.html.includes('class="utility-page"'));
  assert(page.html.includes(`data-page-kind="${slug}"`));
  assert(!page.html.includes("data-campaign-banner"), "Görselsiz sayfada şeffaf başlık olmamalı");
  assert(!page.html.includes("{{TITLE_EN}}"));
}
assert(pages.utility("cart").html.includes('id="cart-page"'));
assert(pages.utility("favorites").html.includes('id="favorites-list"'));
assert(pages.utility("login").html.includes('id="login-form"'));
for (const marker of ['id="categories"', 'class="feature-split"', 'id="carousel-track"', 'class="club-banner"', 'class="site-footer"'])
  assert(pages.home.includes(marker), marker + " ana sayfada olmalı");
assert(pages.utility("cart").html.includes('class="club-banner"'), "Banner tüm sayfalarda görünmeli");
assert(!pages.collection("rings").html.includes('id="categories"'), "Kategori ızgarası yalnızca ana sayfada olmalı");
assert(pages.home.includes('href="/login"') && pages.home.includes('onclick="toggleLanguage()"'));
// Evaluate the shared storefront script with real route defaults and URL filters.
async function client({
  category = "All",
  material = "All",
  kind = "collection",
  path = "/collections/all",
  query = "",
}) {
  const nodes = new Map();
  const missing =
    kind === "info"
      ? new Set(["#products", "#metal", "#collection", "#sort", "#search", "#search-bar"])
      : new Set();
  function element(selector) {
    if (missing.has(selector)) return null;
    if (!nodes.has(selector))
      nodes.set(selector, {
        value: selector === "#metal" ? "All" : selector === "#sort" ? "featured" : "",
        innerHTML: "",
        textContent: "",
        classList: {
          toggle() {},
          remove() {},
          add() {},
          contains() {
            return false;
          },
        },
        style: {
          setProperty(k, v) {
            this[k] = v;
          },
        },
        setAttribute() {},
        addEventListener() {},
        scrollIntoView() {},
        focus() {},
      });
    return nodes.get(selector);
  }
  let url = new URL("https://shop.test" + path + query),
    redirect = null;
  const location = {
    get href() {
      return url.href;
    },
    get search() {
      return url.search;
    },
    assign(value) {
      redirect = value;
    },
  };
  const context = vm.createContext({
    URL,
    URLSearchParams,
    Intl,
    console,
    document: {
      body: { dataset: { pageKind: kind, defaultCategory: category, defaultMaterial: material } },
      querySelector: element,
      querySelectorAll: () => [],
      documentElement: element("root"),
      addEventListener() {},
    },
    window: {
      location,
      history: {
        replaceState(state, title, path) {
          url = new URL(path, url);
        },
        state: null,
      },
      scrollY: 0,
      innerHeight: 900,
      matchMedia: () => ({ matches: false }),
      addEventListener() {},
    },
    localStorage: { getItem: () => null, setItem() {} },
    fetch: async () => ({
      ok: true,
      json: async () => ({
        products: seedProducts.map((p) => ({
          ...p,
          images: [p.image],
          description: p.detail,
          stock: 2,
        })),
        settings: {},
      }),
    }),
    BroadcastChannel: class {},
    setInterval() {},
    setTimeout() {},
    clearTimeout() {},
    requestAnimationFrame() {},
  });
  vm.runInContext(fs.readFileSync("public/app.js", "utf8"), context);
  await new Promise(setImmediate);
  return {
    element,
    run: (s) => vm.runInContext(s, context),
    get url() {
      return url;
    },
    get redirect() {
      return redirect;
    },
  };
}
const rings = await client({
  category: "Rings",
  path: "/collections/rings",
  query: "?material=Gemstone&sort=high&q=lumi%C3%A8re",
});
assert.equal(rings.run("category"), "Rings");
assert.equal(
  rings.element(".hero-image>img").src,
  undefined,
  "Catalog must preserve the category banner photo",
);
assert(rings.element("#result-count").textContent.startsWith("1"));
assert.equal(rings.element("#sort").value, "high");
assert.equal(rings.url.searchParams.get("q"), "lumière");
assert.equal(rings.run("products[0].image"), "/assets/hero.jpg");
assert.equal(rings.element("root").style["--header-progress"], "0");
rings.run("window.scrollY = 90; updateCampaignHeader()");
assert.equal(rings.element("root").style["--header-progress"], "0.5");
rings.run("window.scrollY = 180; updateCampaignHeader()");
assert.equal(rings.element("root").style["--header-progress"], "1");
rings.run("window.scrollY = 0; updateCampaignHeader()");
assert.equal(rings.element("root").style["--header-progress"], "0");
rings.run("resetFilters()");
assert.equal(rings.run("category"), "Rings");
assert.equal(rings.url.search, "");
const gold = await client({
  material: "Gold",
  path: "/collections/gold",
  query: "?material=Silver",
});
assert.equal(gold.element("#metal").value, "Gold");
assert.equal(gold.element("#metal").disabled, true);
assert(gold.element("#result-count").textContent.startsWith("2"));
const info = await client({ kind: "info", path: "/our-world" });
assert.equal(info.run("catalogLoaded"), true);
assert.equal(info.element("root").style["--header-progress"], "0");
info.run("window.scrollY = 180; updateCampaignHeader()");
assert.equal(info.element("root").style["--header-progress"], "1");
info.run("showFavorites()");
assert.equal(info.redirect, "/favorites");
info.run("openCart()");
assert.equal(info.redirect, "/cart");
info.run("submitSiteSearch = submitSiteSearch");
assert(info.run("searchProducts('gold').length") > 0);
console.log(
  "PASS: nine collection routes, shared shell, navigation URLs, 404, information pages, direct category loads, query restoration, absolute photos, shared animated header and info-page actions.",
);
