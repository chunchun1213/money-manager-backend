// Session Model
export interface Session {
  id: string; // UUID
  user_id: string; // UUID
  token: string; // JWT
  created_at: string; // ISO 8601
  expires_at: string; // ISO 8601
  revoked: boolean;
  device_info?: {
    user_agent?: string;
    ip?: string;
    platform?: string;
  };
}

// Session creation payload
export interface CreateSessionDto {
  user_id: string;
  token: string;
  expires_at: string;
  device_info?: {
    user_agent?: string;
    ip?: string;
    platform?: string;
  };
}
