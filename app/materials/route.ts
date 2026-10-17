import { storefrontPages } from "../../lib/storefront";
export function GET() {
  const page = storefrontPages.information("materials");
  return new Response(page.html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" },
  });
}
