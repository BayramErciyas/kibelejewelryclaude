/* KİBELE — Vitrin etkileşimleri
 * Sayfa yapısı: templates/storefront.html
 * Görünüm ve mobil düzen: public/style.css
 * Ürün/fiyat düzenleme: /admin (ürünleri bu dosyaya yazmanız gerekmez)
 */
"use strict";
// 1. SEPET VE FAVORİLER: Sadece ziyaretçinin tarayıcısında saklanır.
function stored(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
// SAYFA BAĞLAMI: Sunucu, kategori sayfasının varsayılanlarını body üzerinde belirtir.
const pageSettings = document.body?.dataset || {};
const pageKind = pageSettings.pageKind || "home";
const defaultCategory = pageSettings.defaultCategory || "All";
const defaultMaterial = pageSettings.defaultMaterial || "All";
const defaultSeries = pageSettings.defaultSeries || "";
const categoryLinks = {
  All: "all",
  Rings: "rings",
  Necklaces: "necklaces",
  Earrings: "earrings",
  Bracelets: "bracelets",
  Charms: "charms",
};
let catalogLoaded = false;
let products = [],
  cart = stored("aurel-cart", []),
  favorites = stored("aurel-favorites", []),
  category = defaultCategory,
  favoritesOnly = false,
  language = stored("kibele-language", "tr");
if (!(window.KibeleLocale?.languages || { en: 1, tr: 1 })[language]) language = "tr";
function t(source, turkishFallback) {
  return (
    window.KibeleLocale?.translate(source, language, turkishFallback) ||
    (language === "tr" && turkishFallback ? turkishFallback : source)
  );
}
const getElement = (s) => document.querySelector(s),
  formatPrice = (n) =>
    new Intl.NumberFormat(window.KibeleLocale?.languages[language]?.locale || t("en-IE", "tr-TR"), {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(n),
  escapeHtml = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
    );
function saveVisitorState() {
  try {
    localStorage.setItem("aurel-cart", JSON.stringify(cart));
    localStorage.setItem("aurel-favorites", JSON.stringify(favorites));
  } catch {}
  updateCount();
}
function showToast(t) {
  getElement("#toast").textContent = t;
  getElement("#toast").classList.add("visible");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => getElement("#toast").classList.remove("visible"), 2600);
}
// 2. ÜRÜN LİSTESİ: Kategori, materyal, arama ve sıralama.
function renderProducts() {
  if (!getElement("#products")) return;
  syncFiltersToUrl();
  let list = products.filter(
    (p) =>
      (defaultSeries !== "cappadocia" ||
        ["cappadocia", "balloon", "turkish-eye"].includes(p.series)) &&
      (category === "All" || p.category === category) &&
      (getElement("#metal").value === "All" || p.material === getElement("#metal").value) &&
      (!favoritesOnly || favorites.includes(p.id)),
  );
  const q = getElement("#search").value.trim().toLocaleLowerCase();
  if (q)
    list = list.filter((p) =>
      [p.name, p.category, p.material, p.detail, p.stone].join(" ").toLocaleLowerCase().includes(q),
    );
  if (getElement("#sort").value !== "featured")
    list.sort((a, b) =>
      getElement("#sort").value === "low" ? a.price - b.price : b.price - a.price,
    );
  getElement("#tabs").innerHTML = ["All", "Rings", "Necklaces", "Earrings", "Bracelets", "Charms"]
    .map(
      (c, i) => /* HTML */ `
        <a
          class="${category === c ? "active" : ""}"
          aria-current="${category === c ? "page" : "false"}"
          href="/collections/${categoryLinks[c]}"
        >
          ${t(c === "All" ? "All jewelry" : c)}
        </a>
      `,
    )
    .join("");
  getElement("#result-count").textContent =
    `${list.length} ${t("pieces")}${favoritesOnly ? " · " + t("Favorites") : ""}`;
  getElement("#products").innerHTML = list.length
    ? list
        .map(
          (p) => /* HTML */ `
            <article>
              <div class="product-image">
                <a href="#product-${p.id}" onclick="event.preventDefault();openProduct(${p.id})">
                  <img
                    src="${escapeHtml(p.image)}"
                    alt="${escapeHtml(p.name)}"
                    loading="lazy"
                    width="600"
                    height="750"
                  />
                </a>
                ${p.tag
                  ? /* HTML */ `
                      <span class="tag">${escapeHtml(p.tag)}</span>
                    `
                  : ""}
                <button
                  class="favorite ${favorites.includes(p.id) ? "saved" : ""}"
                  aria-label="${favorites.includes(p.id)
                    ? "Remove from"
                    : "Add to"} favorites: ${escapeHtml(p.name)}"
                  aria-pressed="${favorites.includes(p.id)}"
                  onclick="toggleFavorite(${p.id})"
                >
                  ${favorites.includes(p.id) ? "♥" : "♡"}
                </button>
                <button class="quick-add" onclick="openProduct(${p.id})">
                  ${t("DISCOVER PIECE +", "ÜRÜNÜ İNCELE +")}
                </button>
              </div>
              <div class="product-info">
                <span class="meta">${escapeHtml(p.stone || p.material)}</span>
                <h3 translate="no">
                  <a href="#product-${p.id}" onclick="event.preventDefault();openProduct(${p.id})">
                    ${escapeHtml(p.name)}
                  </a>
                </h3>
                ${p.stock === 0 ? '<span class="stock-status">Stokta yok / Sold out</span>' : ""}
                <div class="price-row">
                  <span>${formatPrice(p.price)}</span>
                  <span
                    class="swatch"
                    style="background:${p.material === "Silver"
                      ? "#c2c2bf"
                      : p.material === "Gemstone"
                        ? "#91a18d"
                        : "#be9d63"}"
                  ></span>
                </div>
              </div>
            </article>
          `,
        )
        .join("")
    : /* HTML */ `
        <div class="empty">
          ${t("No pieces match your selection.", "Bu seçime uygun ürün yok.")}
          <br />
          <button class="link-button" onclick="resetFilters()">
            ${t("Reset filters", "Filtreleri temizle")}
          </button>
        </div>
      `;
  window.KibeleLocale?.translateTree?.(getElement("#products"), language);
}
function filterCategory(c) {
  category = c;
  favoritesOnly = false;
  renderProducts();
  getElement("nav").classList.remove("open");
}
function filterMetal(m) {
  category = "All";
  favoritesOnly = false;
  getElement("#metal").value = m;
  renderProducts();
}
function resetFilters() {
  category = defaultCategory;
  favoritesOnly = false;
  getElement("#metal").value = defaultMaterial;
  getElement("#sort").value = "featured";
  getElement("#search").value = "";
  renderProducts();
}
function openSearch() {
  openSearchOverlay();
}
function clearSearch() {
  getElement("#search").value = "";
  renderProducts();
}
function toggleFavorite(id) {
  favorites = favorites.includes(id) ? favorites.filter((x) => x !== id) : [...favorites, id];
  saveVisitorState();
  renderProducts();
  renderPageExtras();
  showToast(
    favorites.includes(id)
      ? t("Saved to your favorites", "Favorilerine eklendi")
      : t("Removed from favorites", "Favorilerden çıkarıldı"),
  );
}
function showFavorites() {
  window.location.assign("/favorites");
}
// 3. ÜRÜN DETAYI VE GALERİ: Fotoğraflar, açıklama ve ölçü seçimi.
function openModal(label, content) {
  getElement("#modal-label").textContent = t(label);
  getElement("#modal-content").innerHTML = content;
  window.KibeleLocale?.translateTree?.(getElement("#modal-content"), language);
  if (!getElement("#dialog").open) getElement("#dialog").showModal();
}
function closeModal() {
  getElement("#dialog").close();
}
getElement("#dialog").addEventListener("click", (e) => {
  if (e.target === getElement("#dialog")) {
    let r = e.target.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
      closeModal();
  }
});
function openProduct(id) {
  let p = products.find((x) => x.id === id);
  if (!p) return;
  openModal(
    "THE KİBELE COLLECTION",
    /* HTML */ `
      <div class="detail">
        <div class="detail-gallery">
          <img id="detail-main-image" src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" />
          <div class="gallery-thumbs">
            ${(p.images || [p.image])
              .map(
                (url, i) => /* HTML */ `
                  <button
                    aria-label="Photo ${i + 1}"
                    onclick="document.querySelector('#detail-main-image').src=this.querySelector('img').src"
                  >
                    <img src="${escapeHtml(url)}" alt="${escapeHtml(p.name)} ${i + 1}" />
                  </button>
                `,
              )
              .join("")}
          </div>
        </div>
        <div>
          <span class="eyebrow">
            ${escapeHtml([p.material, p.stone].filter(Boolean).join(" · "))}
          </span>
          <h2 translate="no">${escapeHtml(p.name)}</h2>
          <div>${formatPrice(p.price)}</div>
          <p translate="no">${escapeHtml(p.description || p.detail)}</p>
          <label for="size">${t("Size", "Ölçü")}</label>
          <select id="size">
            ${(p.category === "Rings"
              ? ["EU 50", "EU 52", "EU 54", "EU 56", "EU 58"]
              : p.category === "Necklaces"
                ? ["40 cm", "45 cm", "50 cm"]
                : ["One size"]
            )
              .map(
                (s) => /* HTML */ `
                  <option>${s}</option>
                `,
              )
              .join("")}
          </select>
          <button class="button dark" onclick="addToCart(${id})" ${p.stock === 0 ? "disabled" : ""}>
            ${p.stock === 0
              ? t("Sold out", "Stokta yok")
              : t("Add to bag", "Sepete ekle") + " — " + formatPrice(p.price)}
          </button>
          <div class="notice">
            ${t(
              "Concept piece · Not available for real purchase.",
              "Konsept ürün · Gerçek satış yapılmaz.",
            )}
          </div>
          <details>
            <summary>Details & materials</summary>
            <p>
              ${escapeHtml(p.description || p.detail)}${p.stone ? " · " + escapeHtml(p.stone) : ""}
            </p>
          </details>
          <details>
            <summary>Care & keeping</summary>
            <p>
              Store pieces separately. Clean gently with a soft cloth and avoid harsh chemicals.
              Specific care depends on the metal and stone.
            </p>
          </details>
        </div>
      </div>
    `,
  );
}
// 4. ALIŞVERİŞ SEPETİ: Adet ve mevcut stok denetimleri.
function addToCart(id) {
  const product = products.find((p) => p.id === id);
  const qty = cart.filter((x) => x.id === id).reduce((a, x) => a + x.qty, 0);
  if (!product || product.stock === 0 || qty >= product.stock) {
    showToast(t("Not enough stock.", "Yeterli stok yok."));
    return;
  }
  const size = getElement("#size").value;
  const row = cart.find((x) => x.id === id && x.size === size);
  if (row) row.qty++;
  else cart.push({ id, size, qty: 1 });
  saveVisitorState();
  closeModal();
  showToast(t("Added to your bag", "Sepetine eklendi"));
}
function updateCount() {
  getElement("#count").textContent = cart.reduce((a, x) => a + x.qty, 0);
  const fav = getElement("#fav-count");
  if (fav) fav.textContent = favorites.length;
}
function total() {
  return cart.reduce((a, x) => a + (products.find((p) => p.id === x.id)?.price || 0) * x.qty, 0);
}
function changeQty(i, n) {
  if (n > 0) {
    const p = products.find((p) => p.id === cart[i].id);
    const count = cart.filter((x) => x.id === cart[i].id).reduce((a, x) => a + x.qty, 0);
    if (!p || count >= p.stock) {
      showToast("Not enough stock / Yeterli stok yok");
      return;
    }
  }
  cart[i].qty += n;
  if (cart[i].qty <= 0) cart.splice(i, 1);
  saveVisitorState();
  openCart();
}
function reconcileCart() {
  const used = {};
  cart = cart.filter((x) => {
    const p = products.find((p) => p.id === x.id);
    if (!p || p.stock <= 0) return false;
    const remaining = p.stock - (used[p.id] || 0);
    x.qty = Math.min(x.qty, remaining);
    used[p.id] = (used[p.id] || 0) + x.qty;
    return x.qty > 0;
  });
  saveVisitorState();
}
function openCart() {
  if (pageKind === "cart") renderCartPage();
  else window.location.assign("/cart");
}
// 5. TESLİMAT ÖNİZLEMESİ: Gerçek ödeme veya sipariş oluşturmaz.
function checkout() {
  openModal(
    "CHECKOUT PREVIEW · 1 / 2",
    /* HTML */ `
      <h2 class="cart-title">Delivery details</h2>
      <div class="notice">
        Demo only. Use fictional details. Nothing entered here is sent or saved.
      </div>
      <form id="delivery-form" onsubmit="event.preventDefault();reviewCheckout()">
        <div class="form-grid">
          <label>
            First name
            <input name="first" autocomplete="off" required maxlength="60" />
          </label>
          <label>
            Last name
            <input name="last" autocomplete="off" required maxlength="60" />
          </label>
          <label class="full">
            Email
            <input name="email" type="email" autocomplete="off" required />
          </label>
          <label class="full">
            Address
            <input name="address" autocomplete="off" required />
          </label>
          <label>
            City
            <input name="city" autocomplete="off" required />
          </label>
          <label>
            Country
            <select name="country" required>
              <option value="">Choose a country</option>
              <option>Türkiye</option>
              <option>United Kingdom</option>
              <option>United States</option>
              <option>Germany</option>
              <option>France</option>
              <option>China</option>
              <option>Spain</option>
              <option>Other destination</option>
            </select>
          </label>
          <label>
            Postal code
            <input name="postal" autocomplete="off" required />
          </label>
        </div>
        <br />
        <button class="button dark" type="submit">Review demo selection ↗</button>
        <button type="button" class="link-button" onclick="openCart()">Back to bag</button>
      </form>
    `,
  );
}
function reviewCheckout() {
  const data = new FormData(getElement("#delivery-form"));
  openModal(
    "CHECKOUT PREVIEW · 2 / 2",
    /* HTML */ `
      <h2 class="cart-title">Everything, in one place.</h2>
      <p>
        Delivery preview for ${escapeHtml(data.get("first"))} · ${escapeHtml(data.get("city"))},
        ${escapeHtml(data.get("country"))}
      </p>
      <div class="cart-total">
        <span>Product subtotal</span>
        <span>${formatPrice(total())}</span>
      </div>
      <div class="notice">
        Shipping, duties and taxes require live store configuration. Payment is not connected. No
        card information is requested, no order has been placed and your bag remains saved.
      </div>
      <button
        class="button dark"
        onclick="closeModal();showToast('Preview complete — no order or payment was created.')"
      >
        Finish preview
      </button>
      <button class="link-button" onclick="openCart()">Back to bag</button>
    `,
  );
}
// 6. BİLGİ PENCERELERİ VE DİL: Görünen metinler burada düzenlenebilir.
function openStory() {
  openModal(
    "OUR PERSPECTIVE",
    /* HTML */ `
      <h2 class="cart-title">Objects of lasting beauty.</h2>
      <p style="font-size:15px;line-height:2;max-width:650px">
        This KİBELE concept explores a refined jewelry shopping experience. Its visual language
        brings together sculptural forms, natural light and quiet typography. This edition explores
        how gold, silver and gemstone collections can be presented with clarity and warmth.
      </p>
      <div class="notice">
        The name, photography, copy and catalog are placeholders. The final store can be adapted to
        your own brand and verified product information.
      </div>
    `,
  );
}
function info(type) {
  const texts = {
    care: [
      ["Jewelry care", "Takı bakımı"],
      [
        "Keep jewelry in separate soft pouches. Use a soft, lint-free cloth. Avoid harsh chemicals. Gemstones and plated pieces require care specific to their materials.",
        "Takılarınızı ayrı, yumuşak keselerde saklayın. Tüy bırakmayan yumuşak bir bezle silin. Sert kimyasallardan uzak tutun. Doğal taşlı ve kaplamalı parçalar malzemesine özel bakım ister.",
      ],
    ],
    sizing: [
      ["Find your fit", "Ölçünüzü bulun"],
      [
        "Ring sizes in this demo use EU circumference: 50, 52, 54, 56 and 58 mm. Have a jeweler measure your finger for a reliable fit. Necklace options show chain lengths in centimeters.",
        "Bu önizlemede yüzük ölçüleri AB çevre ölçüsüdür: 50, 52, 54, 56 ve 58 mm. Güvenilir bir ölçü için parmağınızı bir kuyumcuya ölçtürün. Kolye seçeneklerinde zincir uzunluğu santimetre olarak verilir.",
      ],
    ],
    shipping: [
      ["Shipping & returns", "Nakliye, iade ve değişim"],
      [
        "This is a design preview and does not ship products. Shipping destinations, delivery times, duties and return terms must be configured and published before the real store launches.",
        "Bu bir tasarım önizlemesidir ve ürün göndermez. Gerçek mağaza açılmadan önce teslimat bölgeleri, süreleri, vergiler ile iade koşulları belirlenip yayınlanmalıdır.",
      ],
    ],
    legal: [
      ["Legal terms", "Yasal koşullar"],
      [
        "Terms of use, privacy policy, cookie consent and the distance sales agreement must be written and published before the real store launches.",
        "Kullanım koşulları, gizlilik politikası, çerez onayı ve mesafeli satış sözleşmesi, gerçek mağaza açılmadan önce hazırlanıp yayınlanmalıdır.",
      ],
    ],
  };
  const [title, body] = texts[type];
  openModal(
    "A LITTLE GUIDANCE",
    /* HTML */ `
      <h2 class="cart-title">${t(title[0], title[1])}</h2>
      <p style="line-height:2">${t(body[0], body[1])}</p>
    `,
  );
}
function applyLanguage() {
  document.documentElement.lang = language;
  document
    .querySelectorAll("[data-en]")
    .forEach((element) => (element.innerHTML = t(element.dataset.en, element.dataset.tr)));
  const title = getElement("#page-title");
  if (title) document.title = title.textContent + " — KİBELE";
  window.KibeleLocale?.translateTree?.(document, language);
  const search = getElement("#search");
  if (search) search.placeholder = t("Search the collection");
  window.renderFooterLanguages?.();
}
function setLanguage(code) {
  if (!(window.KibeleLocale?.languages || { en: 1, tr: 1 })[code]) return;
  language = code;
  try {
    localStorage.setItem("kibele-language", JSON.stringify(language));
  } catch {}
  applyLanguage();
  renderProducts();
  renderPageExtras();
}
function toggleLanguage() {
  setLanguage(language === "tr" ? "en" : "tr");
}
// Yönetim paneli ayrı bir sayfada açılır.
function openAdmin() {
  window.location.assign("/admin");
}
if (getElement("#products"))
  getElement("#products").innerHTML =
    '<p class="empty">Koleksiyon yükleniyor / Loading collection…</p>';
updateCount();

// One passive scroll listener, coalesced to one update per animation frame.
// 7. MENÜ VE KAYDIRMA: Açılış başlığını küçülten animasyon.
function toggleMenu(force) {
  const nav = getElement("#main-nav");
  const open = typeof force === "boolean" ? force : !nav.classList.contains("open");
  nav.classList.toggle("open", open);
  nav.inert = !open;
  getElement(".campaign-menu").setAttribute("aria-expanded", String(open));
  getElement(".campaign-header").classList.toggle("menu-open", open);
}
getElement("#main-nav").addEventListener("click", (event) => {
  if (event.target.closest("a")) toggleMenu(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    toggleMenu(false);
  }
});
document.addEventListener("click", (event) => {
  if (!event.target.closest("header")) toggleMenu(false);
});
let campaignFrame = 0;
function updateCampaignHeader() {
  const y = Math.max(0, window.scrollY || 0),
    progress = Math.min(1, y / 180);
  document.documentElement.style.setProperty("--header-progress", String(progress));
  getElement(".campaign-header").classList.toggle("is-compact", progress > 0.48);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.style.setProperty(
    "--hero-shift",
    reduce ? "0px" : Math.min(y * 0.1, window.innerHeight * 0.04) + "px",
  );
  campaignFrame = 0;
}
window.addEventListener(
  "scroll",
  () => {
    if (!campaignFrame) campaignFrame = requestAnimationFrame(updateCampaignHeader);
  },
  { passive: true },
);
window.addEventListener("pageshow", updateCampaignHeader);
updateCampaignHeader();

// 8. CANLI KATALOG: Ürünleri /api/catalog üzerinden sunucudan alır.
let catalogLoading = false;
async function refreshCatalog() {
  if (catalogLoading) return;
  catalogLoading = true;
  try {
    const response = await fetch("/api/catalog", { cache: "no-store" });
    if (!response.ok) throw new Error("Catalog unavailable");
    const data = await response.json();
    products = data.products.map((product) => ({
      ...product,
      image: absoluteAssetUrl(product.image),
      images: (product.images || [product.image]).map(absoluteAssetUrl),
    }));
    catalogLoaded = true;
    reconcileCart();
    const hero = document.querySelector(".hero-image>img");
    if (hero && pageKind === "home")
      hero.src = absoluteAssetUrl(data.settings.heroImage || "/assets/hero.jpg");
    renderProducts();
    updateCount();
    renderPageExtras();
  } catch (error) {
    if (!products.length && getElement("#products"))
      getElement("#products").innerHTML =
        '<div class="empty">Koleksiyon yüklenemedi. / Collection unavailable.<br><button class="link-button" onclick="refreshCatalog()">Tekrar dene / Retry</button></div>';
  } finally {
    catalogLoading = false;
  }
}
try {
  const updates = new BroadcastChannel("kibele-catalog");
  updates.onmessage = () => refreshCatalog();
} catch {}
window.addEventListener("storage", (event) => {
  if (event.key === "kibele-catalog-updated") refreshCatalog();
});
window.addEventListener("focus", refreshCatalog);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) refreshCatalog();
});
setInterval(() => {
  if (!document.hidden) refreshCatalog();
}, 60000);
refreshCatalog();

// 9. SAYFA / URL DURUMU: Filtreler adres çubuğunda tutulur; geri tuşu doğal çalışır.
function absoluteAssetUrl(url) {
  return typeof url === "string" && url.startsWith("assets/") ? "/" + url : url;
}
function syncFiltersToUrl() {
  if (!window.history?.replaceState || !getElement("#metal")) return;
  const url = new URL(window.location.href);
  const values = {
    material: getElement("#metal").value === defaultMaterial ? "" : getElement("#metal").value,
    sort: getElement("#sort").value === "featured" ? "" : getElement("#sort").value,
    q: getElement("#search").value.trim(),
    favorites: favoritesOnly ? "1" : "",
  };
  for (const [name, value] of Object.entries(values))
    value ? url.searchParams.set(name, value) : url.searchParams.delete(name);
  window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
}
function initializePageFilters() {
  const material = getElement("#metal");
  if (!material) {
    applyLanguage();
    return;
  }
  const params = new URLSearchParams(window.location.search || "");
  const chosenMaterial = params.get("material");
  material.value =
    defaultMaterial !== "All"
      ? defaultMaterial
      : ["All", "Gold", "Silver", "Gemstone"].includes(chosenMaterial)
        ? chosenMaterial
        : "All";
  material.disabled = defaultMaterial !== "All";
  if (["low", "high"].includes(params.get("sort"))) getElement("#sort").value = params.get("sort");
  getElement("#search").value = params.get("q") || "";
  favoritesOnly = params.get("favorites") === "1";
  if (params.has("search") || params.has("q")) getElement("#search-bar").hidden = false;
  applyLanguage();
}
// 10. YENİ SAYFALAR: Tam ekran arama, istek listesi, alışveriş çantası, oturum açma.
const trMap = { yüzük: "ring", kolye: "necklace", küpe: "earring", bileklik: "bracelet", altın: "gold", gümüş: "silver", taş: "gemstone", doğal: "gemstone" };
function searchTerms(q) {
  const base = q.trim().toLocaleLowerCase("tr");
  const extra = Object.entries(trMap).filter(([k]) => base.startsWith(k)).map(([, v]) => v);
  return [base, ...extra];
}
function searchProducts(q) {
  const terms = searchTerms(q).filter(Boolean);
  if (!terms.length) return [];
  return products.filter((p) => {
    const hay = [p.name, p.category, p.material, p.detail, p.stone].join(" ").toLocaleLowerCase("tr");
    return terms.some((term) => hay.includes(term));
  });
}
function searchCard(p) {
  return /* HTML */ `
    <button class="search-card" onclick="pickSearchProduct(${p.id})">
      <img src="${escapeHtml(p.image)}" alt="" loading="lazy" />
      <strong translate="no">${escapeHtml(p.name)}</strong>
      <span>${escapeHtml(p.stone || p.material || "")}</span>
    </button>
  `;
}
function pickSearchProduct(id) {
  closeSearchOverlay();
  openProduct(id);
}
function renderSearchOverlay() {
  const overlay = getElement("#search-overlay");
  if (!overlay) return;
  const q = getElement("#site-search").value.trim();
  const found = q ? searchProducts(q) : [];
  const picks = q ? found : products.filter((p) => p.tag).concat(products.filter((p) => !p.tag)).slice(0, 6);
  const suggestions = [
    ["Rings", "Yüzükler", "rings"], ["Necklaces", "Kolyeler", "necklaces"], ["Earrings", "Küpeler", "earrings"],
    ["Bracelets", "Bileklikler", "bracelets"], ["Charms", "Charm", "charms"], ["Cappadocia Collection", "Kapadokya Serisi", "cappadocia"],
  ];
  getElement("#search-suggestions").innerHTML = suggestions
    .map(([en, tr, slug]) => `<li><a href="/collections/${slug}">${t(en, tr)}</a></li>`)
    .join("");
  getElement("#search-heading").textContent = q ? t("Results", "Sonuçlar") : t("Our bestsellers", "Çok satanlar");
  getElement("#search-results").innerHTML = picks.length
    ? picks.slice(0, 6).map(searchCard).join("")
    : `<p class="utility-empty">${t("No pieces match your search.", "Aramanıza uygun ürün bulunamadı.")}</p>`;
  const all = getElement("#search-all");
  all.hidden = !q;
  all.href = "/collections/all?q=" + encodeURIComponent(q);
}
function openSearchOverlay() {
  let overlay = getElement("#search-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "search-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML = /* HTML */ `
      <button class="search-close" aria-label="Close" onclick="closeSearchOverlay()">
        <svg viewBox="0 0 24 24"><path d="m5 5 14 14M19 5 5 19" /></svg>
      </button>
      <div class="search-inner">
        <form class="search-field" onsubmit="event.preventDefault();submitSiteSearch()">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="7.3" /><path d="m16 16 5 5" /></svg>
          <input id="site-search" type="search" autocomplete="off" oninput="renderSearchOverlay()" />
        </form>
        <div class="search-columns">
          <div>
            <h2 id="search-suggestions-title"></h2>
            <ul id="search-suggestions"></ul>
          </div>
          <div>
            <h2 id="search-heading"></h2>
            <div id="search-results" class="search-results"></div>
            <a id="search-all" class="link-button" hidden></a>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener("keydown", (e) => e.key === "Escape" && closeSearchOverlay());
  }
  getElement("#site-search").placeholder = t("Search", "Ara");
  getElement("#search-suggestions-title").textContent = t("Recommendations", "Öneriler");
  getElement("#search-all").textContent = t("See all results ↗", "Tüm sonuçları gör ↗");
  toggleMenu(false);
  overlay.classList.add("open");
  document.body.classList.add("search-open");
  renderSearchOverlay();
  getElement("#site-search").focus();
}
function closeSearchOverlay() {
  getElement("#search-overlay")?.classList.remove("open");
  document.body.classList.remove("search-open");
}
function submitSiteSearch() {
  const q = getElement("#site-search").value.trim();
  if (q) window.location.assign("/collections/all?q=" + encodeURIComponent(q));
}
function renderFavoritesPage() {
  const grid = getElement("#favorites-list");
  if (!grid) return;
  const list = products.filter((p) => favorites.includes(p.id));
  getElement("#favorites-empty").hidden = list.length > 0 || !catalogLoaded;
  grid.innerHTML = list
    .map(
      (p) => /* HTML */ `
        <article>
          <div class="product-image">
            <a href="#product-${p.id}" onclick="event.preventDefault();openProduct(${p.id})">
              <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy" />
            </a>
            <button class="favorite saved" aria-label="${t("Remove from favorites", "Favorilerden çıkar")}" onclick="toggleFavorite(${p.id})">♥</button>
          </div>
          <div class="product-info">
            <span class="meta">${escapeHtml(p.stone || p.material)}</span>
            <h3 translate="no">${escapeHtml(p.name)}</h3>
            <div class="price-row"><span>${formatPrice(p.price)}</span></div>
          </div>
        </article>
      `,
    )
    .join("");
}
function removeFromCart(i) {
  cart.splice(i, 1);
  saveVisitorState();
  renderCartPage();
}
function renderCartPage() {
  const box = getElement("#cart-page");
  if (!box) return;
  if (!catalogLoaded) {
    box.innerHTML = `<p class="utility-empty">${t("Loading…", "Yükleniyor…")}</p>`;
    return;
  }
  reconcileCart();
  box.innerHTML = cart.length
    ? cart
        .map((x, i) => {
          const p = products.find((p) => p.id === x.id);
          return /* HTML */ `
            <div class="cart-row">
              <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" />
              <div>
                <h3 translate="no">${escapeHtml(p.name)}</h3>
                <p>${escapeHtml(x.size)}</p>
                <div class="qty">
                  <button aria-label="−" onclick="changeQty(${i},-1)">−</button>
                  <span>${x.qty}</span>
                  <button aria-label="+" onclick="changeQty(${i},1)">+</button>
                  <button aria-label="${t("Remove item", "Ürünü kaldır")}" onclick="removeFromCart(${i})">×</button>
                </div>
              </div>
              <span>${formatPrice(p.price * x.qty)}</span>
            </div>
          `;
        })
        .join("") +
      /* HTML */ `
        <div class="cart-total"><span>${t("Subtotal", "Ara toplam")}</span><span>${formatPrice(total())}</span></div>
        <p class="small">${t("Shipping and taxes are not calculated in this preview.", "Bu önizlemede kargo ve vergiler hesaplanmaz.")}</p>
        <div class="notice">${t("Preview store. This flow does not collect payments or create orders.", "Deneme mağazası. Bu akış ödeme almaz veya sipariş oluşturmaz.")}</div>
        <button class="button dark" onclick="checkout()">${t("Preview checkout ↗", "Teslimat adımını dene ↗")}</button>
        <a class="button" href="/collections/all">${t("Continue shopping", "Alışverişe Devam Et")}</a>
      `
    : /* HTML */ `
        <div class="utility-center">
          <p><strong>${t("Your shopping bag is empty", "Alışveriş sepetiniz boş")}</strong></p>
          <a class="button" href="/collections/all">${t("Continue shopping", "Alışverişe Devam Et")}</a>
        </div>
      `;
  window.KibeleLocale?.translateTree?.(box, language);
}
let loginBound = false;
function renderPageExtras() {
  renderCarousel();
  if (pageKind === "favorites") renderFavoritesPage();
  if (pageKind === "cart") renderCartPage();
  const login = pageKind === "login" ? getElement("#login-form") : null;
  if (login && !loginBound) {
    loginBound = true;
    login.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = getElement("#login-email").value.trim();
      const error = getElement("#login-error");
      const notice = getElement("#login-notice");
      const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      error.hidden = valid;
      error.textContent = t("Please enter a valid email address.", "Lütfen geçerli bir e-posta adresi girin.");
      notice.hidden = !valid;
      notice.textContent = t(
        "Customer accounts are not active yet. This is a design preview: your email is not sent or saved.",
        "Müşteri hesapları henüz aktif değil. Bu bir tasarım önizlemesidir: e-posta adresiniz gönderilmez veya kaydedilmez.",
      );
    });
  }
}
// 11. ANA SAYFA BÖLÜMLERİ: İlk inişte yavaş belirme ve "Saf Zarafet" kaydırmalı bölümü.
// Belirme, sayfa her yüklendiğinde bir kez çalışır; yukarı-aşağı kaydırınca tekrarlanmaz.
function initReveal() {
  const items = document.querySelectorAll(".reveal");
  if (typeof IntersectionObserver === "undefined" || !items.length) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  document.documentElement.classList.add("reveal-ready");
  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }),
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
  );
  items.forEach((item) => observer.observe(item));
}
function renderCarousel() {
  const track = getElement("#carousel-track");
  if (!track || pageKind !== "home") return;
  const picks = products.filter((p) => p.tag).concat(products.filter((p) => !p.tag)).slice(0, 10);
  track.innerHTML = picks
    .map(
      (p) => /* HTML */ `
        <article class="carousel-card">
          <a href="#product-${p.id}" onclick="event.preventDefault();openProduct(${p.id})">
            <span class="carousel-image"><img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy" /></span>
            <strong translate="no">${escapeHtml(p.name)}</strong>
            <span class="meta">${escapeHtml(p.stone || p.material || "")}</span>
            <span class="price">${formatPrice(p.price)}</span>
          </a>
        </article>
      `,
    )
    .join("");
  updateCarouselButtons();
}
function updateCarouselButtons() {
  const track = getElement("#carousel-track");
  const prev = getElement(".carousel-btn.prev"),
    next = getElement(".carousel-btn.next");
  if (!track || !prev || !next) return;
  prev.hidden = track.scrollLeft <= 4;
  next.hidden = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
}
let carouselFrame = 0;
function slideCarousel(direction) {
  const track = getElement("#carousel-track");
  if (!track) return;
  cancelAnimationFrame(carouselFrame);
  const start = track.scrollLeft,
    distance = direction * track.clientWidth * 0.8,
    max = track.scrollWidth - track.clientWidth,
    target = Math.max(0, Math.min(max, start + distance)),
    duration = 900,
    began = performance.now();
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const step = (now) => {
    const progress = Math.min(1, (now - began) / duration);
    track.scrollLeft = start + (target - start) * ease(progress);
    if (progress < 1) carouselFrame = requestAnimationFrame(step);
  };
  carouselFrame = requestAnimationFrame(step);
}
getElement("#carousel-track")?.addEventListener("scroll", updateCarouselButtons, { passive: true });
document.addEventListener("keydown", (e) => e.key === "Escape" && closeSearchOverlay());
initializePageFilters();
renderPageExtras();
initReveal();
