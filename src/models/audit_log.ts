// Audit Log Model
export type AuditAction = 'login' | 'logout' | 'token_validation_failed' | 'account_deleted';
export type AuditResult = 'success' | 'failure';

export interface AuditLog {
  id: string; // UUID
  user_id: string | null; // UUID (nullable after account deletion)
  action: AuditAction;
  timestamp: string; // ISO 8601
  ip_address?: string; // encrypted
  result: AuditResult;
  error_message?: string;
}

// Audit Log creation payload
export interface CreateAuditLogDto {
  user_id?: string | null;
  action: AuditAction;
  ip_address?: string;
  result: AuditResult;
  error_message?: string;
}
