import { storefrontPages } from "../../../lib/storefront";
export function GET(request: Request) {
  const slug = new URL(request.url).pathname.split("/").filter(Boolean)[1] || "";
  const page = storefrontPages.collection(slug);
  return new Response(page.html, {
    status: page.status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" },
  });
}
