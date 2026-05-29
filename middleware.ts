import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

// Protect all ERP screens and internal Odoo BFF API routes
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/odoo/:path*",
  ],
};
