import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import connectPg from "connect-pg-simple";
import type { Express, RequestHandler } from "express";
import bcrypt from "bcryptjs";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export function setupAuth(app: Express) {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 7 days

  const pgStore = connectPg(session);
  app.use(
    session({
      secret: process.env.SESSION_SECRET!,
      store: new pgStore({
        pool,
        tableName: "sessions",
        ttl: sessionTtl,
      }),
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: sessionTtl,
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // Setup local strategy
  passport.use(
    new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
      try {
        const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        const user = result.rows[0];

        if (!user) return done(null, false, { message: "Invalid email or password" });

        //const match = await bcrypt.compare(password, user.password);
        //if (!match) return done(null, false, { message: "Invalid email or password" });

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
      done(null, result.rows[0]);
    } catch (err) {
      done(err);
    }
  });

  // ✅ API POST /api/login with custom JSON response
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return res.status(500).json({ message: "Server error" });
      if (!user) return res.status(401).json({ message: info?.message || "Login failed" });

      req.logIn(user, (err) => {
        if (err) return res.status(500).json({ message: "Login error" });
        return res.json({ message: "Logged in successfully", user: { id: user.id, email: user.email } });
      });
    })(req, res, next);
  });

  // ✅ Logout
  app.post("/api/logout", (req, res) => {
    req.logout(() => {
      res.json({ message: "Logged out" });
    });
  });
}

// ✅ Middleware for checking login
export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Unauthorized" });
};
