import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import crypto from 'crypto';

type User = {
  userId: string;
  email: string;
};

type Env = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  FRONTEND_URL: string;
  BACKEND_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  Bindings: Env;
  Variables: {
    user: User;
  };
};

const prisma = new PrismaClient();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Store refresh tokens (in production, use Redis)
const refreshTokens = new Map<string, { userId: string; email: string }>();

// Generate tokens
const generateAccessToken = (userId: string, email: string, env: Env) => {
  return jwt.sign(
    { userId, email },
    env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '15m' }
  );
};

const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString('hex');
};

// Auth middleware
const authenticateToken = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return c.json({ error: 'Access token required' }, 401);
  }

  try {
    const env = c.env;
    const payload = jwt.verify(
      token,
      env.JWT_SECRET || 'your-secret-key'
    ) as { userId: string; email: string };

    // Verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return c.json({ error: 'User not found' }, 401);
    }

    c.set('user', {
      userId: payload.userId,
      email: payload.email,
    });

    return next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return c.json({ error: 'Token expired' }, 401);
    }
    return c.json({ error: 'Invalid token' }, 403);
  }
};

const router = new Hono<{ Bindings: Env; Variables: { user: User } }>();

// --- Google OAuth ---
router.get('/google', (c) => {
  const env = c.env;
  const GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET;
  const FRONTEND_URL = env.FRONTEND_URL || 'http://localhost:3000';
  const BACKEND_URL = env.BACKEND_URL || 'http://localhost:5001';

  if (!GOOGLE_CLIENT_ID) {
    return c.json({ error: 'Google sign-in is not configured' }, 503);
  }
  const redirectUri = `${BACKEND_URL}/api/auth/google/callback`;
  const scopes = ['email', 'profile'].map(s => `https://www.googleapis.com/auth/userinfo.${s}`).join(' ');
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', GOOGLE_CLIENT_ID);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', scopes);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  
  return c.redirect(url.toString());
});

router.get('/google/callback', async (c) => {
  const env = c.env;
  const GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET;
  const FRONTEND_URL = env.FRONTEND_URL || 'http://localhost:3000';
  const BACKEND_URL = env.BACKEND_URL || 'http://localhost:5001';

  const { code, error } = c.req.query();
  
  if (error || typeof code !== 'string') {
    const message = error === 'access_denied' ? 'Sign-in was cancelled' : 'Google sign-in failed';
    return c.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent(message)}`);
  }
  
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return c.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent('Google sign-in is not configured')}`);
  }
  
  const redirectUri = `${BACKEND_URL}/api/auth/google/callback`;
  
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('Google token exchange failed:', err);
      return c.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent('Google sign-in failed')}`);
    }

    const tokens = await tokenRes.json() as { id_token?: string };
    const idToken = tokens.id_token;
    
    if (!idToken) {
      return c.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent('Google sign-in failed')}`);
    }

    // Decode JWT payload (middle part)
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
    const email = payload.email;
    const name = payload.name || null;

    if (!email) {
      return c.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent('No email from Google')}`);
    }

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: { email, name, password: null },
      });
      await prisma.layout.create({
        data: {
          userId: user.id,
          name: 'Default Layout',
          panes: [],
          grid: { cols: 12, rowHeight: 30, layouts: {} },
        },
      });
    }

    const accessToken = generateAccessToken(user.id, user.email, env);
    const refreshToken = generateRefreshToken();
    refreshTokens.set(refreshToken, { userId: user.id, email: user.email });

    const userPayload = { id: user.id, email: user.email, name: user.name };
    const hash = new URLSearchParams({
      accessToken,
      refreshToken,
      user: JSON.stringify(userPayload),
    }).toString();

    return c.redirect(`${FRONTEND_URL}/auth/callback#${hash}`);
  } catch (err) {
    console.error('Google OAuth error:', err);
    return c.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent('Google sign-in failed')}`);
  }
});

// Register endpoint
router.post('/register', async (c) => {
  try {
    const body = await c.req.parseBody();
    const { email, password, name } = registerSchema.parse(body);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return c.json({ error: 'Email already registered' }, 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email, c.env);
    const refreshToken = generateRefreshToken();

    // Store refresh token
    refreshTokens.set(refreshToken, { userId: user.id, email: user.email });

    // Create default layout for new user
    await prisma.layout.create({
      data: {
        userId: user.id,
        name: 'Default Layout',
        panes: [],
        grid: {
          cols: 12,
          rowHeight: 30,
          layouts: {},
        },
      },
    });

    return c.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: error.errors }, 400);
    }
    console.error('Registration error:', error);
    const message = process.env.NODE_ENV !== 'production' && error instanceof Error
      ? error.message
      : 'Failed to register user';
    return c.json({ error: message }, 500);
  }
});

// Login endpoint
router.post('/login', async (c) => {
  try {
    const body = await c.req.parseBody();
    const { email, password } = loginSchema.parse(body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email, c.env);
    const refreshToken = generateRefreshToken();

    // Store refresh token
    refreshTokens.set(refreshToken, { userId: user.id, email: user.email });

    return c.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: error.errors }, 400);
    }
    console.error('Login error:', error);
    const message = process.env.NODE_ENV !== 'production' && error instanceof Error
      ? error.message
      : 'Failed to login';
    return c.json({ error: message }, 500);
  }
});

// Refresh token endpoint
router.post('/refresh', async (c) => {
  const body = await c.req.parseBody();
  const { refreshToken } = body as { refreshToken?: string };

  if (!refreshToken) {
    return c.json({ error: 'Refresh token required' }, 401);
  }

  const tokenData = refreshTokens.get(refreshToken);
  if (!tokenData) {
    return c.json({ error: 'Invalid refresh token' }, 403);
  }

  // Generate new access token
  const accessToken = generateAccessToken(tokenData.userId, tokenData.email, c.env);

  return c.json({ accessToken });
});

// Logout endpoint
router.post('/logout', authenticateToken, async (c) => {
  const body = await c.req.parseBody();
  const { refreshToken } = body as { refreshToken?: string };

  if (refreshToken) {
    refreshTokens.delete(refreshToken);
  }

  return c.json({ message: 'Logged out successfully' });
});

// Get current user
router.get('/me', authenticateToken, async (c) => {
  try {
    const user = c.get('user');
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        subscription: true,
      },
    });

    if (!dbUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json(dbUser);
  } catch (error) {
    console.error('Get user error:', error);
    return c.json({ error: 'Failed to get user' }, 500);
  }
});

// Update user profile
router.patch('/profile', authenticateToken, async (c) => {
  try {
    const body = await c.req.parseBody();
    const { name } = body as { name?: string };
    const user = c.get('user');

    const dbUser = await prisma.user.update({
      where: { id: user.userId },
      data: { name },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    return c.json(dbUser);
  } catch (error) {
    console.error('Update profile error:', error);
    return c.json({ error: 'Failed to update profile' }, 500);
  }
});

export { router as authRoutes };