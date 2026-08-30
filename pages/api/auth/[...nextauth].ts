import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { safeQuery } from "../../../utils/db";
import bcrypt from 'bcryptjs';

// Extend NextAuth typings to handle custom user fields and role-based access
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      email: string;
      role: string;
      status: string;
    }
  }
  
  interface User {
    id: string;
    username: string;
    email: string;
    role: string;
    status: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    email: string;
    role: string;
    status: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { label: "Username or Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          console.log('🔄 Authentication attempt started:', {
            hasIdentifier: !!credentials?.identifier,
            hasPassword: !!credentials?.password
          });

          if (!credentials?.identifier || !credentials?.password) {
            throw new Error('Please enter both username/email and password.');
          }

          const { identifier, password } = credentials;

          // Fetch the user by username or email
          const users = await safeQuery(
            'SELECT id, username, email, password_hash, role, status FROM users WHERE username = ? OR email = ? LIMIT 1',
            [identifier.trim(), identifier.trim()]
          );

          const user = users?.[0];
          
          if (!user) {
            console.log('❌ Auth failed: No user found for identifier:', identifier);
            return null;
          }

          // Check if user is active
          if (user.status !== 'active') {
            console.log('❌ Auth failed: User account is inactive:', identifier);
            throw new Error('Your account is currently inactive. Please contact the administrator.');
          }

          // Verify the password
          const isValid = await bcrypt.compare(password, user.password_hash);

          if (!isValid) {
            console.log('❌ Auth failed: Invalid password for user:', user.username);
            return null;
          }

          console.log('✅ Authentication successful for:', {
            id: user.id,
            username: user.username,
            role: user.role
          });

          return {
            id: String(user.id),
            username: user.username,
            email: user.email,
            role: user.role,
            status: user.status
          };

        } catch (error: any) {
          console.error('💥 NextAuth Authorize Error:', error);
          throw error;
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours session life
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.email = user.email;
        token.role = user.role;
        token.status = user.status;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          id: token.id,
          username: token.username,
          email: token.email,
          role: token.role,
          status: token.status
        };
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth',
    error: '/auth', // redirect to signin on auth errors to show custom error states
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 8 * 60 * 60,
      },
    },
  },
  debug: process.env.NODE_ENV === 'development',
};

export default NextAuth(authOptions);
