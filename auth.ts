import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { ensureCitizenByPhone } from "@/lib/citizens";
import { verifyOtp } from "@/lib/otp";

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        phone: { label: "Phone", type: "tel" },
        otp: { label: "OTP", type: "text" },
        email: { label: "Email", type: "email" },
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const rawLogin = String(credentials?.username ?? credentials?.email ?? "").trim();
        const login = rawLogin.toLowerCase();
        const logicalLogin = rawLogin.toUpperCase();
        const password = String(credentials?.password ?? "");
        if (rawLogin && password) {
          const staff = await prisma.staff.findFirst({
            where: {
              active: true,
              OR: [
                { username: login },
                { email: login },
                { id: logicalLogin },
                { userCode: logicalLogin },
              ],
            },
          });
          if (!staff) return null;
          const ok = await bcrypt.compare(password, staff.passwordHash);
          if (!ok) return null;
          return {
            id: staff.id,
            email: staff.email ?? undefined,
            name: staff.name,
            account: "staff" as const,
            role: staff.role,
            phone: "",
            username: staff.username,
          };
        }

        const phone = normalizePhone(String(credentials?.phone ?? ""));
        const otp = String(credentials?.otp ?? "");
        if (!phone) return null;
        const ok = await verifyOtp(phone, otp);
        if (!ok) return null;
        const user = await ensureCitizenByPhone(phone);
        return {
          id: user.id,
          phone: user.phone,
          name: user.name ?? undefined,
          account: "citizen" as const,
          role: "citizen",
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.phone = user.phone ?? "";
        token.name = user.name;
        token.email = user.email;
        token.account = user.account ?? "citizen";
        token.role = user.role ?? "citizen";
        token.username = user.username;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.phone = typeof token.phone === "string" ? token.phone : "";
        session.user.name = token.name;
        session.user.email = typeof token.email === "string" ? token.email : "";
        session.user.account = token.account === "staff" ? "staff" : "citizen";
        session.user.role = typeof token.role === "string" ? token.role : "citizen";
        session.user.username = typeof token.username === "string" ? token.username : "";
      }
      return session;
    },
  },
});
