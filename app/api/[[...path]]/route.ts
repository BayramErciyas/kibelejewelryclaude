import { env } from "cloudflare:workers";
import { handleCatalog } from "../../../lib/catalog-service.js";
export const dynamic = "force-dynamic";
export const GET = (request: Request) => handleCatalog(request, env);
export const POST = (request: Request) => handleCatalog(request, env);
export const PUT = (request: Request) => handleCatalog(request, env);
export const PATCH = (request: Request) => handleCatalog(request, env);
export const DELETE = (request: Request) => handleCatalog(request, env);
