/* KİBELE — Yönetim paneli
 * Sayfa yapısı: templates/admin.html
 * Tasarım: public/admin.css
 * Veritabanı ve yetkilendirme: lib/catalog-service.js
 * Yönetici yetkisi tarayıcıda değil, sunucuda kontrol edilir.
 */
"use strict";
const getElement = (s) => document.querySelector(s),
  escapeHtml = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
    );
let products = [],
  settings = {},
  editingId = null,
  photos = [],
  uploading = 0,
  dirty = false,
  heroDraft = null;
const categories = {
  Rings: "Yüzük",
  Necklaces: "Kolye",
  Earrings: "Küpe",
  Bracelets: "Bileklik",
  Charms: "Charm",
};
const formatPrice = (n) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "EUR" }).format(n);
// 1. BİLDİRİMLER VE SUNUCU İSTEKLERİ
function notify(text) {
  getElement("#admin-toast").textContent = text;
  getElement("#admin-toast").classList.add("visible");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(
    () => getElement("#admin-toast").classList.remove("visible"),
    4000,
  );
}
async function requestApi(path, options = {}) {
  const response = await fetch(path, { credentials: "same-origin", cache: "no-store", ...options });
  const result = await response.json();
  if (!response.ok) {
    const err = new Error(result.error || "İşlem tamamlanamadı.");
    err.status = response.status;
    throw err;
  }
  return result;
}
function broadcast() {
  try {
    new BroadcastChannel("kibele-catalog").postMessage("updated");
  } catch {}
  try {
    localStorage.setItem("kibele-catalog-updated", String(Date.now()));
  } catch {}
}
function stateError(error) {
  if (error.status === 401 || error.status === 403) {
    getElement("#app-content").hidden = true;
    getElement("#auth-state").hidden = false;
    getElement("#auth-state").innerHTML = /* HTML */ `
      <h2>${error.status === 401 ? "Hesabınızla giriş yapın" : "Bu hesap yetkili değil"}</h2>
      <p>${escapeHtml(error.message)}</p>
      <a class="primary" href="/signin-with-chatgpt?return_to=%2Fadmin" target="_top">
        ChatGPT hesabımla giriş yap
      </a>
      <a class="secondary" href="/">Mağazaya dön</a>
    `;
  } else notify(error.message);
}
// 2. ÜRÜN TABLOSU: Yükleme, arama ve durum filtreleri.
async function loadCatalog() {
  try {
    const data = await requestApi("/api/admin/catalog");
    products = data.products;
    settings = data.settings;
    getElement("#example-notice").hidden = data.initialized;
    getElement("#auth-state").hidden = true;
    getElement("#app-content").hidden = false;
    renderList();
    getElement("#hero-preview").src = settings.heroImage || "/assets/hero.jpg";
    return true;
  } catch (e) {
    stateError(e);
    return false;
  }
}
function renderList() {
  const q = getElement("#admin-search").value.trim().toLocaleLowerCase("tr"),
    filter = getElement("#status-filter").value;
  const list = products.filter(
    (p) =>
      (!q || [p.name, p.stone, p.description].join(" ").toLocaleLowerCase("tr").includes(q)) &&
      (filter === "all" ||
        (filter === "active" && p.active) ||
        (filter === "draft" && !p.active) ||
        (filter === "empty" && p.stock === 0)),
  );
  getElement("#stat-total").textContent = products.length;
  getElement("#stat-active").textContent = products.filter((p) => p.active).length;
  getElement("#stat-empty").textContent = products.filter((p) => p.stock === 0).length;
  getElement("#product-list").innerHTML = list.length
    ? list
        .map(
          (p) => /* HTML */ `
            <tr>
              <td>
                <div class="product-cell">
                  <img src="${escapeHtml(p.image)}" alt="" />
                  <div>
                    <strong>${escapeHtml(p.name)}</strong>
                    <small>${escapeHtml(p.stone || p.material)} · #${p.id}</small>
                  </div>
                </div>
              </td>
              <td>${categories[p.category] || escapeHtml(p.category)}</td>
              <td>${formatPrice(p.price)}</td>
              <td class="${p.stock === 0 ? "stock-empty" : ""}">${p.stock}</td>
              <td>
                <span class="badge ${p.active ? "" : "draft"}">
                  ${p.active ? "Yayında" : "Taslak"}
                </span>
              </td>
              <td>
                <button class="edit-button" onclick="editProduct(${p.id})">Düzenle ↗</button>
              </td>
            </tr>
          `,
        )
        .join("")
    : '<tr><td class="empty" colspan="6">Bu seçime uygun ürün yok. Yeni bir ürün ekleyebilirsiniz.</td></tr>';
}
// 3. PANEL GEÇİŞLERİ VE ÜRÜN FORMU
function switchView(view, force = false) {
  if (uploading) {
    notify("Fotoğraf yüklemesinin bitmesini bekleyin.");
    return;
  }
  if (
    dirty &&
    !force &&
    !window.confirm("Kaydedilmemiş değişiklikleriniz var. Çıkmak istiyor musunuz?")
  )
    return;
  dirty = false;
  ["products", "editor", "appearance"].forEach(
    (x) => (getElement("#" + x + "-view").hidden = x !== view),
  );
  document
    .querySelectorAll(".nav-item")
    .forEach((e) => e.classList.toggle("active", e.dataset.view === view));
  getElement("#breadcrumb").textContent =
    view === "products" ? "Ürünler" : view === "editor" ? "Ürün düzenle" : "Vitrin görseli";
  window.scrollTo({ top: 0, behavior: "instant" });
}
function editProduct(id = null) {
  if (dirty && !window.confirm("Kaydedilmemiş değişikliklerden çıkılsın mı?")) return;
  const p = products.find((p) => p.id === id);
  editingId = p?.id ?? null;
  photos = [...(p?.images || [])];
  getElement("#product-form").reset();
  const form = getElement("#product-form").elements;
  for (const name of [
    "name",
    "description",
    "category",
    "material",
    "stone",
    "series",
    "tag",
    "price",
    "stock",
  ])
    if (p) form[name].value = p[name] ?? "";
  form.active.checked = p ? p.active : true;
  getElement("#editor-title").textContent = p ? "Ürünü düzenle" : "Yeni ürün";
  getElement("#delete-product").hidden = !p;
  getElement("#save-state").textContent = "";
  dirty = false;
  switchView("editor", true);
  renderPhotos();
  updateSaveLabel();
}
function updateSaveLabel() {
  const text = getElement("#product-form").elements.active.checked
    ? "Kaydet ve yayınla"
    : "Taslak olarak kaydet";
  getElement("#save-top").textContent = text;
  getElement("#save-bottom").textContent = text;
}
getElement("#product-form").addEventListener("input", () => {
  dirty = true;
  updateSaveLabel();
});
window.addEventListener("beforeunload", (e) => {
  if (dirty || uploading) {
    e.preventDefault();
    e.returnValue = "";
  }
});
// 4. FOTOĞRAFLAR: Sıralama, kapak seçimi ve yükleme.
function renderPhotos() {
  getElement("#photo-count").textContent = photos.length + " / 8";
  getElement("#photo-grid").innerHTML = photos
    .map(
      (url, i) => /* HTML */ `
        <div class="photo-tile">
          <img src="${escapeHtml(url)}" alt="Ürün fotoğrafı ${i + 1}" />
          ${i === 0 ? '<span class="cover">KAPAK</span>' : ""}
          <div class="photo-actions">
            <button
              type="button"
              aria-label="Fotoğrafı sola taşı"
              onclick="movePhoto(${i},-1)"
              ${i === 0 ? "disabled" : ""}
            >
              ←
            </button>
            <button type="button" onclick="removePhoto(${i})">Kaldır</button>
            <button
              type="button"
              aria-label="Fotoğrafı sağa taşı"
              onclick="movePhoto(${i},1)"
              ${i === photos.length - 1 ? "disabled" : ""}
            >
              →
            </button>
          </div>
        </div>
      `,
    )
    .join("");
  getElement("#upload-zone").hidden = photos.length >= 8;
}
function movePhoto(i, d) {
  [photos[i], photos[i + d]] = [photos[i + d], photos[i]];
  dirty = true;
  renderPhotos();
}
function removePhoto(i) {
  photos.splice(i, 1);
  dirty = true;
  renderPhotos();
}
async function optimizedFile(file) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)
    throw new Error("5 MB altında JPG, PNG veya WebP fotoğraf seçin.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.88));
  if (!blob) throw new Error("Fotoğraf hazırlanamadı.");
  return new File([blob], "jewelry.webp", { type: blob.type });
}
async function upload(file) {
  const optimized = await optimizedFile(file);
  const data = new FormData();
  data.set("file", optimized);
  return (await requestApi("/api/admin/uploads", { method: "POST", body: data })).url;
}
function setBusy(value) {
  getElement("#save-top").disabled = value;
  getElement("#save-bottom").disabled = value;
}
async function uploadProductPhotos(input) {
  if (uploading) return;
  const files = Array.from(input.files);
  if (photos.length + files.length > 8) {
    notify("Bir ürüne en fazla 8 fotoğraf ekleyebilirsiniz.");
    input.value = "";
    return;
  }
  uploading++;
  setBusy(true);
  try {
    for (let i = 0; i < files.length; i++) {
      getElement("#upload-state").textContent = `Fotoğraf yükleniyor… ${i + 1} / ${files.length}`;
      photos.push(await upload(files[i]));
      dirty = true;
      renderPhotos();
    }
    getElement("#upload-state").textContent =
      "Fotoğraflar hazır. Ürünü kaydettiğinizde vitrinde görünür.";
  } catch (e) {
    getElement("#upload-state").textContent = e.message;
    stateError(e);
  } finally {
    uploading--;
    setBusy(false);
    input.value = "";
  }
}
// 5. KALICI KAYIT: Kaydetme, silme ve vitrine yenileme bildirimi.
async function saveProduct() {
  if (uploading) {
    notify("Fotoğraf yüklemesinin bitmesini bekleyin.");
    return;
  }
  if (!photos.length) {
    notify("En az bir ürün fotoğrafı ekleyin.");
    return;
  }
  const f = getElement("#product-form").elements;
  const payload = {
    name: f.name.value,
    description: f.description.value,
    category: f.category.value,
    material: f.material.value,
    stone: f.stone.value,
    series: f.series.value,
    tag: f.tag.value,
    price: Number(f.price.value),
    stock: Number(f.stock.value),
    active: f.active.checked,
    images: photos,
  };
  setBusy(true);
  getElement("#save-state").textContent = "Kaydediliyor…";
  try {
    const result = await requestApi("/api/admin/products" + (editingId ? "/" + editingId : ""), {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    products = result.products;
    settings = result.settings;
    getElement("#example-notice").hidden = true;
    dirty = false;
    broadcast();
    renderList();
    switchView("products", true);
    notify("Ürün kaydedildi. Mağazanız güncellendi.");
  } catch (e) {
    getElement("#save-state").textContent = e.message;
    stateError(e);
  } finally {
    setBusy(false);
  }
}
function askDelete(id) {
  const p = products.find((p) => p.id === id);
  if (!p) return;
  getElement("#delete-name").textContent = p.name;
  getElement("#confirm-delete").onclick = () => deleteProduct(id);
  getElement("#confirm-dialog").showModal();
}
async function deleteProduct(id) {
  getElement("#confirm-delete").disabled = true;
  try {
    await requestApi("/api/admin/products/" + id, { method: "DELETE" });
    dirty = false;
    getElement("#confirm-dialog").close();
    await loadCatalog();
    switchView("products", true);
    broadcast();
    notify("Ürün silindi.");
  } catch (e) {
    stateError(e);
  } finally {
    getElement("#confirm-delete").disabled = false;
  }
}
// 6. ANA SAYFA GÖRSELİ
async function uploadHero(input) {
  const file = input.files[0];
  if (!file) return;
  getElement("#hero-state").textContent = "Fotoğraf hazırlanıyor ve yükleniyor…";
  getElement("#hero-save").disabled = true;
  uploading++;
  try {
    heroDraft = await upload(file);
    getElement("#hero-preview").src = heroDraft;
    getElement("#hero-save").disabled = false;
    dirty = true;
    getElement("#hero-state").textContent = "Fotoğraf hazır. Değişikliği kaydet düğmesine basın.";
  } catch (e) {
    getElement("#hero-state").textContent = e.message;
    stateError(e);
  } finally {
    input.value = "";
    uploading--;
  }
}
async function saveHero() {
  if (!heroDraft) return;
  getElement("#hero-save").disabled = true;
  try {
    await requestApi("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ heroImage: heroDraft }),
    });
    settings.heroImage = heroDraft;
    heroDraft = null;
    dirty = false;
    broadcast();
    getElement("#hero-state").textContent = "Açılış fotoğrafı kaydedildi.";
    notify("Mağazanızın açılış fotoğrafı güncellendi.");
  } catch (e) {
    getElement("#hero-save").disabled = false;
    stateError(e);
  }
}
function restoreHero() {
  heroDraft = "/assets/hero.jpg";
  getElement("#hero-preview").src = heroDraft;
  getElement("#hero-save").disabled = false;
  dirty = true;
  getElement("#hero-state").textContent = "Değişikliği kaydederek örnek görsele dönebilirsiniz.";
}
loadCatalog();
