import fs from 'fs';
import path from 'path';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { encryptToken, decryptToken, EncryptedPayload } from '@/lib/security/token-encryption';

export interface StoredTokenRecord {
  id: string;
  userEmail: string;
  provider: string;
  encryptedAccessToken: EncryptedPayload;
  encryptedRefreshToken: EncryptedPayload;
  expiresAt: string | null;
  scopes: string[];
  status: 'active' | 'revoked' | 'expired';
  revocationReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export class TokenStore {
  private inMemoryCache: Map<string, StoredTokenRecord> = new Map();
  private storageFilePath: string;

  constructor(customStoragePath?: string) {
    const dataDir = path.join(process.cwd(), '.data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch {
        // ignore in readonly environments
      }
    }
    this.storageFilePath = customStoragePath || path.join(dataDir, 'oauth_tokens.json');
    this.loadFromDisk();
  }

  private getCacheKey(userEmail: string, provider: string): string {
    return `${userEmail.toLowerCase()}:${provider.toLowerCase()}`;
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.storageFilePath)) {
        const raw = fs.readFileSync(this.storageFilePath, 'utf8');
        const data = JSON.parse(raw);
        if (Array.isArray(data)) {
          for (const item of data) {
            this.inMemoryCache.set(this.getCacheKey(item.userEmail, item.provider), item);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load oauth tokens from disk:', e);
    }
  }

  private flushToDisk(): void {
    try {
      const items = Array.from(this.inMemoryCache.values());
      const dir = path.dirname(this.storageFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.storageFilePath, JSON.stringify(items, null, 2), 'utf8');
    } catch (e) {
      console.warn('Failed to flush oauth tokens to disk:', e);
    }
  }

  /**
   * Encrypts and saves OAuth2 tokens.
   */
  public async saveToken(params: {
    userEmail: string;
    provider: string;
    accessToken: string;
    refreshToken: string;
    expiresInSeconds?: number;
    scopes?: string[];
  }): Promise<StoredTokenRecord> {
    const { userEmail, provider, accessToken, refreshToken, expiresInSeconds, scopes = [] } = params;

    const encryptedAccess = encryptToken(accessToken);
    const encryptedRefresh = encryptToken(refreshToken);

    const expiresAt = expiresInSeconds 
      ? new Date(Date.now() + expiresInSeconds * 1000).toISOString() 
      : null;

    const record: StoredTokenRecord = {
      id: `tok_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userEmail: userEmail.toLowerCase(),
      provider: provider.toLowerCase(),
      encryptedAccessToken: encryptedAccess,
      encryptedRefreshToken: encryptedRefresh,
      expiresAt,
      scopes,
      status: 'active',
      revocationReason: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.inMemoryCache.set(this.getCacheKey(userEmail, provider), record);
    this.flushToDisk();

    // Sync to Supabase if connected
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from('oauth_tokens').upsert({
          user_email: record.userEmail,
          provider: record.provider,
          encrypted_access_token: record.encryptedAccessToken.cipherText,
          encrypted_refresh_token: record.encryptedRefreshToken.cipherText,
          iv: record.encryptedRefreshToken.iv,
          auth_tag: record.encryptedRefreshToken.authTag,
          expires_at: record.expiresAt,
          scopes: record.scopes,
          status: record.status,
          updated_at: record.updatedAt,
        }, { onConflict: 'user_email,provider' });
      } catch (err) {
        console.warn('Could not sync oauth token to Supabase:', err);
      }
    }

    return record;
  }

  /**
   * Retrieves decrypted access and refresh token.
   */
  public async getToken(userEmail: string, provider: string): Promise<{
    accessToken: string;
    refreshToken: string;
    status: 'active' | 'revoked' | 'expired';
    expiresAt: string | null;
  } | null> {
    const key = this.getCacheKey(userEmail, provider);
    let record = this.inMemoryCache.get(key);

    // Try Supabase if not in memory
    if (!record) {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        try {
          const { data } = await supabase
            .from('oauth_tokens')
            .select('*')
            .eq('user_email', userEmail.toLowerCase())
            .eq('provider', provider.toLowerCase())
            .single();

          if (data) {
            record = {
              id: data.id,
              userEmail: data.user_email,
              provider: data.provider,
              encryptedAccessToken: {
                cipherText: data.encrypted_access_token,
                iv: data.iv,
                authTag: data.auth_tag,
              },
              encryptedRefreshToken: {
                cipherText: data.encrypted_refresh_token,
                iv: data.iv,
                authTag: data.auth_tag,
              },
              expiresAt: data.expires_at,
              scopes: data.scopes || [],
              status: data.status,
              revocationReason: data.revocation_reason,
              createdAt: data.created_at,
              updatedAt: data.updated_at,
            };
            this.inMemoryCache.set(key, record);
          }
        } catch {
          // ignore
        }
      }
    }

    if (!record) return null;

    if (record.status === 'revoked') {
      return {
        accessToken: '',
        refreshToken: '',
        status: 'revoked',
        expiresAt: record.expiresAt,
      };
    }

    try {
      const accessToken = decryptToken(
        record.encryptedAccessToken.cipherText,
        record.encryptedAccessToken.iv,
        record.encryptedAccessToken.authTag
      );

      const refreshToken = decryptToken(
        record.encryptedRefreshToken.cipherText,
        record.encryptedRefreshToken.iv,
        record.encryptedRefreshToken.authTag
      );

      return {
        accessToken,
        refreshToken,
        status: record.status,
        expiresAt: record.expiresAt,
      };
    } catch (decryptErr) {
      console.error('Failed to decrypt stored tokens:', decryptErr);
      return null;
    }
  }

  /**
   * Marks a token as revoked (e.g. after Google returns invalid_grant or user clicks disconnect).
   */
  public async markTokenRevoked(userEmail: string, provider: string, reason?: string): Promise<void> {
    const key = this.getCacheKey(userEmail, provider);
    const record = this.inMemoryCache.get(key);
    if (record) {
      record.status = 'revoked';
      record.revocationReason = reason || 'Revoked by user or provider';
      record.updatedAt = new Date().toISOString();
      this.inMemoryCache.set(key, record);
      this.flushToDisk();
    }

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase
          .from('oauth_tokens')
          .update({
            status: 'revoked',
            revocation_reason: reason || 'Revoked by user or provider',
            updated_at: new Date().toISOString(),
          })
          .eq('user_email', userEmail.toLowerCase())
          .eq('provider', provider.toLowerCase());
      } catch (e) {
        console.warn('Could not mark token revoked in Supabase:', e);
      }
    }
  }

  public getRawRecord(userEmail: string, provider: string): StoredTokenRecord | null {
    return this.inMemoryCache.get(this.getCacheKey(userEmail, provider)) || null;
  }
}

export const tokenStore = new TokenStore();
