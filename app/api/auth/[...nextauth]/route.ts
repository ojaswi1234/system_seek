/* eslint-disable @typescript-eslint/no-explicit-any */
import NextAuth, { AuthOptions, Profile, Session } from "next-auth"
import GithubProvider from "next-auth/providers/github"
import { JWT } from "next-auth/jwt";

if (!process.env.GITHUB_ID || !process.env.GITHUB_SECRET) {
  throw new Error("GITHUB_ID and GITHUB_SECRET environment variables are not set.");
}

export const authOptions: AuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
      authorization: { 
      params: { scope: 'read:user user:email repo' } 
    },
    }),
  ],
  callbacks: {
    async jwt({ token, profile, account }: { token: JWT; account?: any; profile?: Profile }) {
      if (profile) {
        token.username = (profile as any).login;
        token.image = (profile as any).avatar_url;
        token.id = (profile as any).id;
      }
      if (account) {
    token.accessToken = account.access_token;
  }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        (session.user as any).username = token.username;
        (session.user as any).image = token.image;
        (session.user as any).id = token.id;
      }
      (session as any).accessToken = token.accessToken;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
