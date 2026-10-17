import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const nodes = new Map(),
  saved = new Map();
function element(selector) {
  if (!nodes.has(selector))
    nodes.set(selector, {
      value: selector === "#metal" ? "All" : selector === "#sort" ? "featured" : "",
      textContent: "",
      innerHTML: "",
      open: false,
      style: {
        setProperty(k, v) {
          this[k] = v;
        },
      },
      classList: {
        items: new Set(),
        add(k) {
          this.items.add(k);
        },
        remove(k) {
          this.items.delete(k);
        },
        contains(k) {
          return this.items.has(k);
        },
        toggle(k, v) {
          v ? this.items.add(k) : this.items.delete(k);
        },
      },
      setAttribute(k, v) {
        this[k] = v;
      },
      querySelectorAll() {
        return [];
      },
      addEventListener() {},
      scrollIntoView() {},
      focus() {},
      showModal() {
        this.open = true;
      },
      close() {
        this.open = false;
      },
    });
  return nodes.get(selector);
}
const context = vm.createContext({
  window: {
    location: { search: "", assign() {} },
    scrollY: 0,
    innerHeight: 900,
    matchMedia: () => ({ matches: false }),
    addEventListener() {},
  },
  document: {
    querySelector: element,
    querySelectorAll: () => [],
    documentElement: element("root"),
    body: { dataset: {} },
    activeElement: element("launch"),
    addEventListener() {},
  },
  Intl,
  URL,
  URLSearchParams,
  console,
  localStorage: {
    getItem: (k) => saved.get(k) ?? null,
    setItem(k, v) {
      saved.set(k, v);
    },
  },
  fetch: async () => ({ ok: true, json: async () => ({ products: [], settings: {} }) }),
  BroadcastChannel: class {},
  requestAnimationFrame: (fn) => {
    fn();
    return 1;
  },
  setInterval() {},
  setTimeout: (fn) => {
    fn();
    return 1;
  },
  clearTimeout() {},
});
for (const file of ["localization.js", "localization-copy.js", "app.js", "region-panel.js"])
  vm.runInContext(fs.readFileSync("public/" + file, "utf8"), context);
await new Promise(setImmediate);
const run = (code) => vm.runInContext(code, context),
  locale = context.window.KibeleLocale;
assert.equal(Object.keys(locale.languages).length, 20);
for (const code of Object.keys(locale.languages)) {
  assert(locale.translate("Country/Region", code));
  assert(locale.translate("Rings", code));
  run(`setLanguage('${code}')`);
  assert.equal(element("root").lang, code);
  assert(run("formatPrice(123.45)").length > 0);
}
run("chooseCountryLanguage('CA','fr',false)");
assert.equal(element("root").lang, "fr");
assert.equal(JSON.parse(saved.get("kibele-country")), "CA");
assert.equal(JSON.parse(saved.get("kibele-language")), "fr");
assert(element("#footer-language-options").innerHTML.includes("Français"));
run("chooseCountryLanguage('TR','fr',false)");
assert.equal(element("root").lang, "fr", "A language unavailable for a country is rejected");
run("chooseCountryLanguage('JP','ja',false)");
assert.equal(element("root").lang, "ja");
assert(element("#region-groups").innerHTML.includes("日本語"));
run("openRegionPanel()");
assert.equal(element("#region-panel").open, true);
assert(element("#region-panel").classList.contains("is-open"));
run("closeRegionPanel()");
assert.equal(element("#region-panel").open, false);
assert.equal(
  locale.translate("Some things<br>stay with you.", "en"),
  "Some things<br>stay with you.",
);
assert(locale.translate("Some things<br>stay with you.", "fr").includes("Certaines"));
// Static fixed strings can switch language and return to their original wording.
const node = { nodeValue: "  Rings  ", parentElement: { closest: () => null } };
context.NodeFilter = { SHOW_TEXT: 4 };
context.document.createTreeWalker = () => {
  let used = false;
  return {
    nextNode() {
      if (used) return null;
      used = true;
      return node;
    },
  };
};
locale.translateTree({ querySelectorAll: () => [] }, "fr");
assert.equal(node.nodeValue.trim(), "Bagues");
locale.translateTree({ querySelectorAll: () => [] }, "ja");
assert.equal(node.nodeValue.trim(), "リング");
locale.translateTree({ querySelectorAll: () => [] }, "en");
assert.equal(node.nodeValue, "  Rings  ");
console.log(
  "PASS: 20 UI languages, locale price formatting, source text roundtrip, region grouping, valid country/language combinations, persisted selection, footer choices and drawer open/close.",
);
