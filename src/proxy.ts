import { NextResponse, type NextRequest } from "next/server";
import { updateAdminSession } from "@/lib/supabase/proxy";

/**
 * First line of defence for /admin: unauthenticated visitors are redirected
 * to /admin/login. Pages ALSO verify admin membership server-side, and the
 * database enforces RLS, so this is not the only protection.
 */
export async function proxy(request: NextRequest) {
  const { response, userId } = await updateAdminSession(request);
  const isLogin = request.nextUrl.pathname === "/admin/login";

  if (!userId && !isLogin) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }
  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
