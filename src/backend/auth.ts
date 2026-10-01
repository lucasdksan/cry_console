import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { authConfig } from "@/backend/auth.config";
import { prisma } from "@/backend/models/prisma";
import {
  findUserByEmail,
  userHasGoogleAccount,
  userHasPassword,
} from "@/backend/models/user.model";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const existing = await findUserByEmail(user.email);

        if (existing && userHasPassword(existing) && !userHasGoogleAccount(existing)) {
          return "/entrar?error=OAuthAccountNotLinked";
        }
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }

      return session;
    },
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
