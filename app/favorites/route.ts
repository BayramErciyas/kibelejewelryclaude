import { storefrontPages } from "../../lib/storefront";
export function GET() {
  const page = storefrontPages.utility("favorites");
  return new Response(page.html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" },
  });
}
