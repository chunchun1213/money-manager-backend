// User Model (from Supabase Auth)
export interface User {
  id: string; // UUID
  email: string;
  raw_user_meta_data: {
    name: string;
    avatar_url: string;
    provider: 'google' | 'facebook';
  };
  created_at: string; // ISO 8601
  updated_at: string;
  last_sign_in_at: string | null;
}

// User Profile for API responses
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  provider: 'google' | 'facebook';
  created_at: string;
  last_sign_in_at: string | null;
}
