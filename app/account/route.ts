import { env } from "cloudflare:workers";
import { storefrontPages } from "../../lib/storefront";
import { canManageCatalog } from "../../lib/catalog-service.js";
export const dynamic = "force-dynamic";
const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] || c,
  );
export async function GET(request: Request) {
  const userId = request.headers.get("oai-authenticated-user-id");
  const email = request.headers.get("oai-authenticated-user-email");
  let content;
  if (userId && email) {
    const admin = await canManageCatalog(request, env);
    content = `<h2 data-en="Welcome back" data-tr="Tekrar hoş geldiniz">Welcome back</h2><p data-en="You are signed in." data-tr="Oturumunuz açık.">You are signed in.</p><p class="account-email" translate="no">${escapeHtml(email)}</p>${admin ? '<a class="button dark" href="/admin" data-en="Manage products" data-tr="Ürünleri yönet">Manage products</a>' : ""}<a class="link-button" href="/signout-with-chatgpt?return_to=%2F" target="_top" data-en="Sign out" data-tr="Oturumu kapat">Sign out</a>`;
  } else
    content =
      '<h2 data-en="Sign in" data-tr="Oturum Açma">Sign in</h2><p data-en="Continue with your ChatGPT account to access your personal space." data-tr="Kişisel alanınıza erişmek için ChatGPT hesabınızla devam edin.">Continue with your ChatGPT account to access your personal space.</p><a class="button dark" href="/signin-with-chatgpt?return_to=%2Faccount" target="_top" data-en="Continue with ChatGPT" data-tr="ChatGPT ile devam et">Continue with ChatGPT</a>';
  const page = storefrontPages.account(content);
  return new Response(page.html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
