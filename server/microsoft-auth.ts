import crypto from "crypto";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { authService } from "./auth-service";

const MICROSOFT_AUTHORITY_BASE = "https://login.microsoftonline.com";
const MICROSOFT_GRAPH_API = "https://graph.microsoft.com/v1.0";
const MICROSOFT_OPENID_CONFIG_V2 = "https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration";

interface IdTokenPayload {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  tid: string;
  email?: string;
  preferred_username?: string;
  name?: string;
  oid?: string;
}

export interface MicrosoftAuthConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  redirectUri: string;
}

export interface MicrosoftTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  id_token?: string;
}

export interface MicrosoftUserProfile {
  id: string;
  displayName?: string;
  mail?: string;
  givenName?: string;
  surname?: string;
  userPrincipalName?: string;
  jobTitle?: string;
}

export class MicrosoftAuthService {
  private pendingStates = new Map<string, { createdAt: number; redirectTo?: string }>();
  private STATE_EXPIRY_MS = 10 * 60 * 1000;
  private jwksClients = new Map<string, jwksClient.JwksClient>();

  private getJwksClient(tenantId: string): jwksClient.JwksClient {
    const key = tenantId;
    if (!this.jwksClients.has(key)) {
      const client = jwksClient({
        jwksUri: `${MICROSOFT_AUTHORITY_BASE}/${tenantId}/discovery/v2.0/keys`,
        cache: true,
        cacheMaxAge: 86400000,
        rateLimit: true,
      });
      this.jwksClients.set(key, client);
    }
    return this.jwksClients.get(key)!;
  }

  private async getSigningKey(tenantId: string, kid: string): Promise<string> {
    const client = this.getJwksClient(tenantId);
    return new Promise((resolve, reject) => {
      client.getSigningKey(kid, (err, key) => {
        if (err) {
          reject(err);
        } else {
          const signingKey = key?.getPublicKey();
          if (signingKey) {
            resolve(signingKey);
          } else {
            reject(new Error("No signing key found"));
          }
        }
      });
    });
  }

  async verifyIdToken(idToken: string): Promise<IdTokenPayload | null> {
    const config = this.getConfig();
    if (!config) return null;

    try {
      const decoded = jwt.decode(idToken, { complete: true });
      if (!decoded || typeof decoded === "string" || !decoded.header.kid) {
        console.error("Invalid ID token structure");
        return null;
      }

      const kid = decoded.header.kid;
      const tid = (decoded.payload as IdTokenPayload).tid || config.tenantId;
      const tenantForJwks = tid === "common" ? config.tenantId : tid;
      const signingKey = await this.getSigningKey(tenantForJwks, kid);

      const verified = jwt.verify(idToken, signingKey, {
        algorithms: ["RS256"],
        audience: config.clientId,
        issuer: [
          `https://login.microsoftonline.com/${tid}/v2.0`,
          `https://sts.windows.net/${tid}/`,
        ],
        clockTolerance: 300,
      }) as IdTokenPayload;

      return verified;
    } catch (error) {
      console.error("ID token verification failed:", error);
      return null;
    }
  }

  getConfig(): MicrosoftAuthConfig | null {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const tenantId = process.env.MICROSOFT_TENANT_ID || "common";
    const appUrl = process.env.APP_URL || `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER?.toLowerCase()}.repl.co`;
    const redirectUri = `${appUrl}/api/auth/microsoft/callback`;

    if (!clientId || !clientSecret) {
      return null;
    }

    return { clientId, clientSecret, tenantId, redirectUri };
  }

  isConfigured(): boolean {
    return this.getConfig() !== null;
  }

  generateState(): string {
    const state = crypto.randomBytes(32).toString("hex");
    this.pendingStates.set(state, { createdAt: Date.now() });
    this.cleanupExpiredStates();
    return state;
  }

  validateState(state: string): boolean {
    const pendingState = this.pendingStates.get(state);
    if (!pendingState) return false;
    if (Date.now() - pendingState.createdAt > this.STATE_EXPIRY_MS) {
      this.pendingStates.delete(state);
      return false;
    }
    this.pendingStates.delete(state);
    return true;
  }

  private cleanupExpiredStates(): void {
    const now = Date.now();
    for (const [state, data] of this.pendingStates.entries()) {
      if (now - data.createdAt > this.STATE_EXPIRY_MS) {
        this.pendingStates.delete(state);
      }
    }
  }

  getAuthorizationUrl(): string | null {
    const config = this.getConfig();
    if (!config) return null;

    const state = this.generateState();
    const params = new URLSearchParams({
      client_id: config.clientId,
      response_type: "code",
      redirect_uri: config.redirectUri,
      response_mode: "query",
      scope: "openid profile email User.Read",
      state,
      prompt: "select_account",
    });

    return `${MICROSOFT_AUTHORITY_BASE}/${config.tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<MicrosoftTokenResponse | null> {
    const config = this.getConfig();
    if (!config) return null;

    const params = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    });

    try {
      const response = await fetch(
        `${MICROSOFT_AUTHORITY_BASE}/${config.tenantId}/oauth2/v2.0/token`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params.toString(),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error("Token exchange error:", error);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to exchange code for token:", error);
      return null;
    }
  }

  async getUserProfile(accessToken: string): Promise<MicrosoftUserProfile | null> {
    try {
      const response = await fetch(`${MICROSOFT_GRAPH_API}/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("User profile error:", error);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      return null;
    }
  }

  async getOrganizationTenantId(accessToken: string): Promise<string | null> {
    try {
      const response = await fetch(`${MICROSOFT_GRAPH_API}/organization`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json() as { value?: Array<{ id?: string }> };
      return data.value?.[0]?.id || null;
    } catch {
      return null;
    }
  }

  async handleCallback(code: string, state: string, ipAddress?: string, userAgent?: string) {
    if (!this.validateState(state)) {
      return { success: false, error: "Invalid or expired state parameter (possible CSRF attack)" };
    }

    const tokenResponse = await this.exchangeCodeForToken(code);
    if (!tokenResponse) {
      return { success: false, error: "Failed to authenticate with Microsoft" };
    }

    let verifiedClaims: IdTokenPayload | null = null;
    if (tokenResponse.id_token) {
      verifiedClaims = await this.verifyIdToken(tokenResponse.id_token);
      if (!verifiedClaims) {
        console.error("ID token verification failed - rejecting authentication");
        return { success: false, error: "Invalid authentication token from Microsoft" };
      }
    }

    const profile = await this.getUserProfile(tokenResponse.access_token);
    if (!profile) {
      return { success: false, error: "Failed to fetch Microsoft profile" };
    }

    const tenantId = verifiedClaims?.tid 
      || await this.getOrganizationTenantId(tokenResponse.access_token) 
      || this.getConfig()?.tenantId 
      || "unknown";

    if (verifiedClaims && profile.mail) {
      const idTokenEmail = verifiedClaims.email || verifiedClaims.preferred_username;
      if (idTokenEmail && idTokenEmail.toLowerCase() !== profile.mail.toLowerCase()) {
        console.error("Email mismatch between ID token and Graph API profile");
        return { success: false, error: "Authentication data mismatch" };
      }
    }

    return authService.handleMicrosoftSsoCallback(profile, tenantId, ipAddress, userAgent);
  }
}

export const microsoftAuth = new MicrosoftAuthService();
