import { PLAN_LIMITS } from "@/lib/constants";
import connectDB from "@/lib/server/mongodb";
import { generateUniqueID } from "@/models/modelCounter";
import User from "@/models/userModel";
import NextAuth, { NextAuthOptions, Session } from "next-auth";
import { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      try {
        await connectDB();

        if (account?.provider === "google") {
          const email = user.email!;
          const googleId = account.providerAccountId;

          // Check if user exists
          let existingUser = await User.findOne({ email });

          if (existingUser) {
            // User exists - LOGIN
            console.log(`User logged in: ${email}`);

            // Update user info if changed
            if (existingUser.name !== user.name) {
              existingUser.name = user.name!;
              await existingUser.save();
              console.log(`User info updated: ${email}`);
            }
          } else {
            // User doesn't exist - SIGNUP
            const USRID = await generateUniqueID("USR");
            existingUser = await User.create({
              USRID,
              name: user.name,
              email: email,
              image: user.image,
              googleId: googleId,
              userType: "FREE",
              limits: PLAN_LIMITS.FREE,
            });
            console.log(`New user created: ${email}`);
          }

          // Attach database user ID to the session user
          user.id = existingUser.USRID;
          return true;
        }

        return false;
      } catch (error) {
        console.error(" Error in signIn callback:", error);
        return false;
      }
    },

    async jwt({ token, user }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },

    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },

  pages: {
    signIn: "/auth/signin", // Custom sign-in page (optional)
    error: "/auth/error", // Error page
    // signOut: '/auth/signout',
    // verifyRequest: '/auth/verify-request',
  },

  session: {
    strategy: "jwt",
    maxAge: 10 * 24 * 60 * 60, // 30 days
  },

  secret: process.env.NEXTAUTH_SECRET,

  debug: process.env.NODE_ENV === "development",

  events: {
    async signIn({ user, isNewUser }) {
      console.log(`Sign in event - User: ${user.email}, New: ${isNewUser}`);
    },
    async signOut({ token }) {
      console.log(`Sign out event - User: ${token.email}`);
    },
    async createUser({ user }) {
      console.log(`Create user event - User: ${user.email}`);
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
