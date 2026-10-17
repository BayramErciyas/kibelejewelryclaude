import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { seedProducts } from "../lib/seed.js";

const nodes = new Map();
function element(selector) {
  if (!nodes.has(selector)) {
    nodes.set(selector, {
      value: selector === "#metal" ? "All" : selector === "#sort" ? "featured" : "",
      textContent: "",
      innerHTML: "",
      open: false,
      style: {
        setProperty(key, value) {
          this[key] = value;
        },
      },
      classList: {
        values: new Set(),
        add(name) {
          this.values.add(name);
        },
        remove(name) {
          this.values.delete(name);
        },
        contains(name) {
          return this.values.has(name);
        },
        toggle(name, value) {
          const enabled = value ?? !this.values.has(name);
          enabled ? this.values.add(name) : this.values.delete(name);
          return enabled;
        },
      },
      addEventListener() {},
      setAttribute(name, value) {
        this[name] = value;
      },
      scrollIntoView() {},
      focus() {},
      showModal() {
        this.open = true;
      },
      close() {
        this.open = false;
      },
    });
  }
  return nodes.get(selector);
}
const catalog = seedProducts.map((product) => ({
  ...product,
  price: product.id === 1 ? 125.55 : product.price,
  description: product.detail,
  images: [product.image],
  stock: 2,
  active: true,
}));
const root = element("root");
const context = vm.createContext({
  console,
  Intl,
  URL,
  URLSearchParams,
  localStorage: { getItem: () => null, setItem() {} },
  document: {
    querySelector: element,
    querySelectorAll: () => [],
    documentElement: root,
    addEventListener() {},
  },
  window: {
    scrollY: 0,
    innerHeight: 900,
    matchMedia: () => ({ matches: false }),
    addEventListener() {},
    location: { assign() {} },
  },
  fetch: async () => ({ ok: true, json: async () => ({ products: catalog, settings: {} }) }),
  BroadcastChannel: class {
    postMessage() {}
  },
  setInterval() {},
  setTimeout() {},
  clearTimeout() {},
  requestAnimationFrame() {},
});
vm.runInContext(fs.readFileSync("public/app.js", "utf8"), context);
await new Promise(setImmediate);
const run = (code) => vm.runInContext(code, context);
assert.equal(run("products.length"), 6);
assert.equal(run("catalogLoaded"), true);
run("filterCategory('Rings')");
assert(element("#result-count").textContent.startsWith("1"));
run("resetFilters(); filterMetal('Silver')");
assert(element("#result-count").textContent.startsWith("2"));
run("resetFilters(); getElement('#search').value = 'LUMIÈRE'; renderProducts()");
assert(element("#result-count").textContent.startsWith("1"));
run("resetFilters(); toggleFavorite(1)");
assert.equal(run("favorites.length"), 1);
// Favoriler ve sepet artık ayrı sayfalardır; yönlendirme hatasız çalışmalı.
run("showFavorites(); openCart()");
// Arama: Türkçe sözcükler İngilizce kategorilerle eşleşir.
assert(run("searchProducts('yüzük').length") > 0);
assert.equal(run("searchProducts('').length"), 0);
// Sepet sayfası: dolu ve boş durumlar.
run("cart = [{ id: 1, size: 'One size', qty: 1 }]");
run("renderCartPage()");
assert(element("#cart-page").innerHTML.includes("cart-row"));
run("cart = []; renderCartPage()");
assert(element("#cart-page").innerHTML.includes("Alışverişe Devam Et"));
// Türkçe açılışta ondalık ayırıcı virgüldür.
assert(run("formatPrice(125.55)").includes("125,55"));
run("openProduct(1)");
assert(element("#modal-content").innerHTML.includes("gallery-thumbs"));
element("#size").value = "One size";
run("addToCart(1); changeQty(0, 1); changeQty(0, 1)");
assert.equal(run("cart[0].qty"), 2);
assert.equal(run("total()"), 251.1);
run("products[0].stock = 0; reconcileCart()");
assert.equal(run("cart.length"), 0);
assert.equal(run("escapeHtml('<script>')"), "&lt;script&gt;");
run("window.scrollY = 180; updateCampaignHeader()");
assert.equal(root.style["--header-progress"], "1");
run("toggleMenu(true)");
assert.equal(element("#main-nav").inert, false);
run("toggleMenu(false)");
assert.equal(element("#main-nav").inert, true);
assert.equal(run("language"), "tr", "Site Türkçe açılmalı");
run("toggleLanguage()");
assert.equal(root.lang, "en");
run("toggleLanguage()");
assert.equal(root.lang, "tr");
console.log(
  "PASS: storefront loading, category/material/search filters, favorites, gallery, cents, cart stock, escaping, scroll, menu and language.",
);
