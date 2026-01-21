import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import type { Express, RequestHandler, Request } from "express";
import connectPg from "connect-pg-simple";
import { authService } from "../auth-service";
import { db } from "../db";
import { users, crmUsers } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  authProvider: "local" | "microsoft" | "replit";
  isDisabled: boolean;
}

declare global {
  namespace Express {
    interface User extends AuthUser {}
  }
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
      sameSite: "lax",
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      async (email, password, done) => {
        try {
          const result = await authService.loginLocalUser(email, password);
          if (!result.success || !result.user) {
            return done(null, false, { message: result.error || "Invalid credentials" });
          }
          
          const authUser: AuthUser = {
            id: result.user.id,
            email: result.user.email!,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            authProvider: result.user.authProvider as any,
            isDisabled: result.user.isDisabled,
          };
          return done(null, authUser);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user: AuthUser, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (!user) {
        return done(null, false);
      }
      
      const authUser: AuthUser = {
        id: user.id,
        email: user.email!,
        firstName: user.firstName,
        lastName: user.lastName,
        authProvider: user.authProvider as any,
        isDisabled: user.isDisabled,
      };
      done(null, authUser);
    } catch (error) {
      done(error);
    }
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const user = req.user as AuthUser;
  if (user.isDisabled) {
    req.logout(() => {});
    return res.status(403).json({ message: "Account is disabled" });
  }
  
  next();
};

export const isAdmin: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const user = req.user as AuthUser;
  const [crmUser] = await db
    .select()
    .from(crmUsers)
    .where(eq(crmUsers.authUserId, user.id))
    .limit(1);
    
  if (!crmUser || crmUser.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  
  next();
};
