import { collectionPages, informationPages } from "./page-config.js";
const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
  );
/** Ortak kabuk tek yerde tutulur: logo, menü, sepet, alt bölüm ve scriptler. */
export function createPageRenderer({
  shell,
  productList,
  collectionLayout,
  materialsContent,
  worldContent,
  accountContent = "",
  utilityLayout = "",
  utilityContent = {},
}) {
  const home = shell.replace("<!-- PRODUCT_LIST -->", productList);
  function renderInner(config, content, path, kind = "collection", layout = collectionLayout) {
    let main = layout.replace("<!-- PAGE_CONTENT -->", content);
    const tokens = {
      TITLE_EN: config.en,
      TITLE_TR: config.tr,
      DESCRIPTION_EN: config.descriptionEn,
      DESCRIPTION_TR: config.descriptionTr,
      PAGE_IMAGE: config.image,
    };
    for (const [name, value] of Object.entries(tokens))
      main = main.replaceAll("{{" + name + "}}", escapeHtml(value));
    let html = home
      .replace(/<main>[\s\S]*?<\/main>/, main)
      .replace(
        /<body[^>]*>/,
        `<body class="inner-page" ${["favorites", "cart", "login"].includes(kind) ? "" : "data-campaign-banner"} data-page-kind="${kind}" data-default-category="${config.category || "All"}" data-default-material="${config.material || "All"}" data-default-series="${config.series || ""}">`,
      )
      .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(config.en)} — KİBELE</title>`)
      .replace(
        /<link rel="preload" as="image" href="[^"]*"\s*\/?>/,
        `<link rel="preload" as="image" href="${config.image}" />`,
      )
      .replace(/content="Explore KİBELE,[^"]*"/, `content="${escapeHtml(config.descriptionEn)}"`);
    html = html.replace(/<nav id="main-nav"[\s\S]*?<\/nav>/, (menu) =>
      menu.replace(`href="${path}"`, `href="${path}" aria-current="page"`),
    );
    html = html.replace('class="skip" href="#collection"', 'class="skip" href="#page-main"');
    return { html, status: 200 };
  }
  return {
    home,
    collection(slug) {
      const config = Object.hasOwn(collectionPages, slug) ? collectionPages[slug] : null;
      if (!config) {
        return {
          html: home
            .replace(
              /<main>[\s\S]*?<\/main>/,
              '<main id="page-main" class="not-found"><h1>Page not found / Sayfa bulunamadı</h1><a class="button dark" href="/">Ana sayfaya dön / Back to home</a></main>',
            )
            .replace(
              '<body data-page-kind="home"',
              '<body class="inner-page" data-page-kind="info"',
            ),
          status: 404,
        };
      }
      return renderInner(config, productList, "/collections/" + slug);
    },
    account(content) {
      return renderInner(
        informationPages.account,
        accountContent.replace("<!-- ACCOUNT_CONTENT -->", content),
        "/account",
        "info",
      );
    },
    /** Favoriler, sepet ve oturum açma: görselsiz, ortalanmış yardımcı sayfalar. */
    utility(slug) {
      return renderInner(
        informationPages[slug],
        utilityContent[slug] || "",
        "/" + slug,
        slug,
        utilityLayout,
      );
    },
    information(slug) {
      const config = informationPages[slug];
      return renderInner(
        config,
        slug === "materials" ? materialsContent : worldContent,
        "/" + slug,
        "info",
      );
    },
  };
}
