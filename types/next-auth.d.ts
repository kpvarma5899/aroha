import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      phone: string;
      account: "citizen" | "staff";
      role: string;
      username?: string;
    } & DefaultSession["user"];
  }

  interface User {
    phone?: string;
    account?: "citizen" | "staff";
    role?: string;
    username?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    phone?: string;
    account?: "citizen" | "staff";
    role?: string;
    username?: string;
  }
}
