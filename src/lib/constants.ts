// Constants

// Token expiry (in seconds)
export const TOKEN_EXPIRY_DAYS = 30;
export const TOKEN_EXPIRY_SECONDS = TOKEN_EXPIRY_DAYS * 24 * 60 * 60; // 2592000 seconds

export const REFRESH_TOKEN_EXPIRY_DAYS = 90;
export const REFRESH_TOKEN_EXPIRY_SECONDS = REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60; // 7776000 seconds

// Audit log retention (in days)
export const AUDIT_LOG_RETENTION_DAYS = 90;

// OAuth providers
export const OAUTH_PROVIDERS = ['google', 'facebook'] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

// Audit actions
export const AUDIT_ACTIONS = [
  'login',
  'logout',
  'token_validation_failed',
  'account_deleted',
] as const;

// Rate limiting
export const RATE_LIMIT_TTL = 60; // seconds
export const RATE_LIMIT_MAX = 10; // requests per TTL

// API Response Status
export const API_SUCCESS = 'success';
export const API_ERROR = 'error';
