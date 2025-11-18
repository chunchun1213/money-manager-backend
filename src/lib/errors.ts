// Custom Error Classes

export class InvalidTokenError extends Error {
  constructor(message = '無效的 token') {
    super(message);
    this.name = 'InvalidTokenError';
  }
}

export class ExpiredTokenError extends Error {
  constructor(message = 'Token 已過期') {
    super(message);
    this.name = 'ExpiredTokenError';
  }
}

export class RevokedTokenError extends Error {
  constructor(message = 'Token 已被撤銷') {
    super(message);
    this.name = 'RevokedTokenError';
  }
}

export class OAuthError extends Error {
  constructor(message = 'OAuth 登入失敗') {
    super(message);
    this.name = 'OAuthError';
  }
}

export class DatabaseError extends Error {
  constructor(message = '資料庫操作失敗') {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class EmailConflictError extends Error {
  constructor(message = '此電子郵件已被其他帳號使用，請使用其他方式登入') {
    super(message);
    this.name = 'EmailConflictError';
  }
}
