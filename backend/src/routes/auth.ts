import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth';
import crypto from 'crypto';

const router = Router();
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

// Generate tokens
const generateAccessToken = (userId: string, email: string) => {
  return jwt.sign(
    { userId, email },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '15m' }
  );
};

const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString('hex');
};

// Store refresh tokens (in production, use Redis)
const refreshTokens = new Map<string, { userId: string; email: string }>();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

// --- Google OAuth ---
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

router.get('/google', (req, res) => {
  if (!GOOGLE_CLIENT_ID) {
    return res.status(503).json({ error: 'Google sign-in is not configured' });
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
  res.redirect(url.toString());
});

router.get('/google/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error || typeof code !== 'string') {
    const message = error === 'access_denied' ? 'Sign-in was cancelled' : 'Google sign-in failed';
    return res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent(message)}`);
  }
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent('Google sign-in is not configured')}`);
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
      return res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent('Google sign-in failed')}`);
    }
    const tokens = await tokenRes.json();
    const idToken = tokens.id_token;
    if (!idToken) {
      return res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent('Google sign-in failed')}`);
    }
    // Decode JWT payload (middle part)
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
    const email = payload.email;
    const name = payload.name || null;
    if (!email) {
      return res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent('No email from Google')}`);
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
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken();
    refreshTokens.set(refreshToken, { userId: user.id, email: user.email });
    const userPayload = { id: user.id, email: user.email, name: user.name };
    const hash = new URLSearchParams({
      accessToken,
      refreshToken,
      user: JSON.stringify(userPayload),
    }).toString();
    res.redirect(`${FRONTEND_URL}/auth/callback#${hash}`);
  } catch (err) {
    console.error('Google OAuth error:', err);
    res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent('Google sign-in failed')}`);
  }
});

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = registerSchema.parse(req.body);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
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
    const accessToken = generateAccessToken(user.id, user.email);
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

    res.json({
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
      return res.status(400).json({ error: error.errors });
    }
    console.error('Registration error:', error);
    const message = process.env.NODE_ENV !== 'production' && error instanceof Error
      ? error.message
      : 'Failed to register user';
    res.status(500).json({ error: message });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken();

    // Store refresh token
    refreshTokens.set(refreshToken, { userId: user.id, email: user.email });

    res.json({
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
      return res.status(400).json({ error: error.errors });
    }
    console.error('Login error:', error);
    const message = process.env.NODE_ENV !== 'production' && error instanceof Error
      ? error.message
      : 'Failed to login';
    res.status(500).json({ error: message });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required' });
  }

  const tokenData = refreshTokens.get(refreshToken);
  if (!tokenData) {
    return res.status(403).json({ error: 'Invalid refresh token' });
  }

  // Generate new access token
  const accessToken = generateAccessToken(tokenData.userId, tokenData.email);

  res.json({ accessToken });
});

// Logout endpoint
router.post('/logout', authenticateToken, async (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    refreshTokens.delete(refreshToken);
  }

  res.json({ message: 'Logged out successfully' });
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        subscription: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update user profile
router.patch('/profile', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { name },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    res.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export { router as authRoutes };