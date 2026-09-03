import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/auth";

const AUTH_COOKIE = "lorawan_auth";

const PUBLIC_PATHS = new Set([
  "/",
  "/demo",
  "/docs",
  "/status",
  "/robots.txt",
  "/sitemap.xml",
  "/opengraph-image",
  "/icon.svg",
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/setup", // Allow setup
  "/api/lorawan/webhook",
  "/api/v1/ingest", // Allow public ingestion
  "/api/health",
  "/api/maintenance/cleanup",
]);

const PUBLIC_ASSET = /\.(?:avif|css|gif|ico|jpe?g|js|png|svg|webp|woff2?)$/i;

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const host = req.headers.get("host")?.split(":")[0];
  if (host === "app.uplotr.com" && pathname === "/") {
    const appUrl = req.nextUrl.clone();
    appUrl.pathname = "/app";
    return NextResponse.redirect(appUrl);
  }

  if (pathname.startsWith("/_next") || PUBLIC_ASSET.test(pathname) || pathname.startsWith("/docs/")) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const cookieValue = req.cookies.get(AUTH_COOKIE)?.value;
  
  // Verify JWT
  const session = cookieValue ? await verifySession(cookieValue) : null;

  if (session) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
