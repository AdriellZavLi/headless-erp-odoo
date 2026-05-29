import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        username: { label: "Usuario", type: "text", placeholder: "admin" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Por favor, ingresa tu usuario y contraseña.");
        }

        const adminUser = process.env.ADMIN_USERNAME || "admin";
        const adminPass = process.env.ADMIN_PASSWORD || "admin123!";

        // Static credentials check
        if (
          credentials.username === adminUser &&
          credentials.password === adminPass
        ) {
          return {
            id: "usr-admin-001",
            name: "Administrador de Taller",
            email: "taller@masbordados.com",
            username: adminUser,
            role: "admin",
          };
        }

        // Demo user
        if (
          credentials.username === "operador" &&
          credentials.password === "operator123!"
        ) {
          return {
            id: "usr-operator-002",
            name: "Operador de Bordadora",
            email: "operador@masbordados.com",
            username: "operador",
            role: "operator",
          };
        }

        throw new Error("Usuario o contraseña incorrectos.");
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.username = token.username;
        session.user.role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
