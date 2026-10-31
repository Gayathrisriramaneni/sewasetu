import crypto from 'crypto';
import { normalizeIndianMobile } from '../services/applicationService';

export interface VerificationSession {
  sessionId: string;
  mobile?: string;
  email?: string;
  createdAt: number;
  verified: boolean;
  verificationToken?: string;
  tokenExpiresAt?: number;
  consumed: boolean;
}

class McpTokenManager {
  private sessions: Map<string, VerificationSession> = new Map();
  private tokenIndex: Map<string, string> = new Map(); // token -> sessionId

  public createSession(identifier: string): string {
    const sessionId = 'ses_' + crypto.randomBytes(12).toString('hex');
    const normMobile = normalizeIndianMobile(identifier);

    this.sessions.set(sessionId, {
      sessionId,
      mobile: normMobile || undefined,
      email: !normMobile ? identifier.trim().toLowerCase() : undefined,
      createdAt: Date.now(),
      verified: false,
      consumed: false,
    });
    return sessionId;
  }

  public createMobileSession(mobile: string): string {
    const norm = normalizeIndianMobile(mobile) || mobile.trim();
    return this.createSession(norm);
  }

  public getSession(sessionId: string): VerificationSession | undefined {
    return this.sessions.get(sessionId);
  }

  public issueToken(sessionId: string): string | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const token = 'tok_' + crypto.randomBytes(24).toString('hex');
    session.verified = true;
    session.verificationToken = token;
    session.tokenExpiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes validity
    this.tokenIndex.set(token, sessionId);
    return token;
  }

  public verifyToken(token: string): { valid: boolean; mobile?: string; email?: string; error?: string } {
    if (!token) {
      return { valid: false, error: 'Authentication required: missing verification token.' };
    }

    const sessionId = this.tokenIndex.get(token);
    if (!sessionId) {
      return { valid: false, error: 'Invalid or expired verification token.' };
    }

    const session = this.sessions.get(sessionId);
    if (!session || !session.verificationToken || session.verificationToken !== token) {
      return { valid: false, error: 'Invalid verification token.' };
    }

    if (session.tokenExpiresAt && Date.now() > session.tokenExpiresAt) {
      return { valid: false, error: 'Verification token has expired. Please verify your mobile number again.' };
    }

    if (session.consumed) {
      return { valid: false, error: 'Verification token has already been used for an official submission.' };
    }

    return { valid: true, mobile: session.mobile, email: session.email };
  }

  public consumeToken(token: string): boolean {
    const sessionId = this.tokenIndex.get(token);
    if (!sessionId) return false;
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    session.consumed = true;
    return true;
  }

  public clearAll() {
    this.sessions.clear();
    this.tokenIndex.clear();
  }
}

export const tokenManager = new McpTokenManager();
