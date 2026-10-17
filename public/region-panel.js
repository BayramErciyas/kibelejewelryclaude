/* KİBELE — Sağdan açılan ülke/bölge ve dil paneli.
 * Ülke seçimi gezinme tercihidir; fiyatları dönüştürmez veya teslimat sözü vermez.
 */
const countryGroups = [
  {
    title: "NORTH AMERICA",
    countries: [
      ["US", ["en"]],
      ["CA", ["en", "fr"]],
      ["MX", ["es", "en"]],
    ],
  },
  {
    title: "EUROPE",
    countries: [
      ["AT", ["de", "en"]],
      ["BE", ["nl", "fr", "en"]],
      ["BG", ["en"]],
      ["HR", ["en"]],
      ["CZ", ["cs", "en"]],
      ["DK", ["en"]],
      ["EE", ["en"]],
      ["FI", ["en"]],
      ["FR", ["fr", "en"]],
      ["DE", ["de", "en"]],
      ["GR", ["el", "en"]],
      ["HU", ["hu", "en"]],
      ["IE", ["en"]],
      ["IT", ["it", "en"]],
      ["LV", ["en"]],
      ["LT", ["en"]],
      ["LU", ["de", "fr", "en"]],
      ["NL", ["nl", "en"]],
      ["PL", ["pl", "en"]],
      ["PT", ["pt", "en"]],
      ["RO", ["ro", "en"]],
      ["SK", ["en"]],
      ["SI", ["sl", "en"]],
      ["ES", ["es", "en"]],
      ["SE", ["sv", "en"]],
      ["CH", ["de", "fr", "it", "en"]],
      ["TR", ["en", "tr"]],
      ["GB", ["en"]],
    ],
  },
  {
    title: "OCEANIA",
    countries: [
      ["AU", ["en"]],
      ["NZ", ["en"]],
    ],
  },
  {
    title: "ASIA",
    countries: [
      ["CN", ["zh-Hans", "en"]],
      ["HK", ["zh-Hant", "en"]],
      ["TW", ["zh-Hant", "en"]],
      ["JP", ["ja", "en"]],
      ["KR", ["ko", "en"]],
      ["TH", ["th", "en"]],
      ["IN", ["en"]],
      ["MY", ["en"]],
      ["SG", ["en"]],
      ["AE", ["en"]],
      ["SA", ["en"]],
    ],
  },
  { title: "AFRICA", countries: [["ZA", ["en"]]] },
  {
    title: "OTHER COUNTRIES / REGIONS",
    countries: [
      ["AR", ["es", "en"]],
      ["BR", ["pt", "en"]],
      ["CL", ["es", "en"]],
      ["CO", ["es", "en"]],
      ["OTHER", Object.keys(window.KibeleLocale.languages)],
    ],
  },
];
const countryOptions = new Map(countryGroups.flatMap((group) => group.countries));
let selectedCountry = stored("kibele-country", "TR");
if (!countryOptions.has(selectedCountry)) selectedCountry = "TR";
let regionReturnFocus = null,
  regionCloseTimer = null;
function countryName(code) {
  if (code === "OTHER") return t("OTHER COUNTRIES / REGIONS");
  try {
    return new Intl.DisplayNames([language], { type: "region" }).of(code);
  } catch {
    return code;
  }
}
function renderRegionPanel() {
  const selected = getElement("#current-country");
  if (selected) selected.textContent = countryName(selectedCountry);
  const container = getElement("#region-groups");
  if (!container) return;
  const expanded = new Set(
    Array.from(container.querySelectorAll("details[open]")).map((node) => node.dataset.region),
  );
  container.innerHTML = countryGroups
    .map(
      (group, index) =>
        `<details class="region-group" data-region="${index}" ${expanded.has(String(index)) ? "open" : ""}><summary><span>${escapeHtml(t(group.title))}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 9 7 7 7-7"/></svg></summary><div class="country-list">${group.countries.map(([code, languages]) => `<section class="country-option"><h3>${escapeHtml(countryName(code))}${code === selectedCountry ? '<span aria-hidden="true"> ✓</span>' : ""}</h3><div class="country-languages">${languages.map((codeLanguage) => `<button lang="${codeLanguage}" aria-pressed="${code === selectedCountry && codeLanguage === language}" onclick="chooseCountryLanguage('${code}','${codeLanguage}')">${escapeHtml(window.KibeleLocale.languages[codeLanguage].name)}</button>`).join("")}</div></section>`).join("")}</div></details>`,
    )
    .join("");
  renderFooterLanguages();
}
function renderFooterLanguages() {
  const node = getElement("#footer-language-options");
  if (!node) return;
  node.innerHTML = countryOptions
    .get(selectedCountry)
    .map(
      (code) =>
        `<button lang="${code}" aria-pressed="${language === code}" class="${language === code ? "selected" : ""}" onclick="chooseCountryLanguage('${selectedCountry}','${code}',false)">${escapeHtml(window.KibeleLocale.languages[code].name)}</button>`,
    )
    .join('<span aria-hidden="true"> - </span>');
  const top = getElement("#lang");
  if (top)
    top.innerHTML =
      '<span class="' + (language === "tr" ? "on" : "") + '">TR</span> / <span class="' +
      (language === "en" ? "on" : "") + '">EN</span>';
}
function chooseCountryLanguage(country, code, close = true) {
  if (!countryOptions.get(country)?.includes(code)) return;
  selectedCountry = country;
  try {
    localStorage.setItem("kibele-country", JSON.stringify(country));
  } catch {}
  setLanguage(code);
  renderRegionPanel();
  if (close) closeRegionPanel();
}
function openRegionPanel() {
  const panel = getElement("#region-panel");
  if (!panel) return;
  clearTimeout(regionCloseTimer);
  regionReturnFocus = document.activeElement;
  toggleMenu(false);
  renderRegionPanel();
  if (!panel.open) panel.showModal();
  requestAnimationFrame(() => panel.classList.add("is-open"));
}
function closeRegionPanel() {
  const panel = getElement("#region-panel");
  if (!panel?.open) return;
  panel.classList.remove("is-open");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  regionCloseTimer = setTimeout(
    () => {
      panel.close();
      regionReturnFocus?.focus();
    },
    reduced ? 0 : 220,
  );
}
const regionDialog = getElement("#region-panel");
regionDialog?.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeRegionPanel();
});
regionDialog?.addEventListener("click", (event) => {
  if (event.target === regionDialog) {
    const rect = regionDialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right) closeRegionPanel();
  }
});
renderRegionPanel();
