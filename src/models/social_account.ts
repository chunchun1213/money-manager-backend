// Social Account Model
export interface SocialAccount {
  id: string; // UUID
  user_id: string; // UUID
  provider: 'google' | 'facebook';
  provider_user_id: string;
  linked_at: string; // ISO 8601
}

// Social Account creation payload
export interface CreateSocialAccountDto {
  user_id: string;
  provider: 'google' | 'facebook';
  provider_user_id: string;
}
