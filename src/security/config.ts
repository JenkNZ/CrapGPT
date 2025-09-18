/**
 * Enterprise Security Configuration for AgentForge
 * Implements SOC 2 compliance and enterprise-grade security measures
 */

export const SECURITY_CONFIG = {
  // Rate limiting configuration
  RATE_LIMITS: {
    API_CALLS_PER_MINUTE: 1000,
    LOGIN_ATTEMPTS_PER_HOUR: 5,
    PASSWORD_RESET_ATTEMPTS_PER_HOUR: 3,
    AGENT_EXECUTIONS_PER_MINUTE: 100,
    CONNECTION_TESTS_PER_MINUTE: 10
  },

  // Encryption settings
  ENCRYPTION: {
    ALGORITHM: 'aes-256-gcm',
    KEY_DERIVATION_ROUNDS: 100000,
    IV_LENGTH: 16,
    TAG_LENGTH: 16,
    SALT_LENGTH: 32
  },

  // Session management
  SESSION: {
    MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
    IDLE_TIMEOUT: 2 * 60 * 60 * 1000, // 2 hours
    SECURE_COOKIES: true,
    HTTP_ONLY: true,
    SAME_SITE: 'strict' as const
  },

  // Password requirements
  PASSWORD_POLICY: {
    MIN_LENGTH: 12,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SYMBOLS: true,
    MAX_REPEATED_CHARS: 2,
    PREVENT_COMMON_PASSWORDS: true,
    HISTORY_CHECK: 5 // Last 5 passwords cannot be reused
  },

  // Audit logging
  AUDIT: {
    LOG_ALL_API_CALLS: true,
    LOG_AUTHENTICATION_EVENTS: true,
    LOG_AUTHORIZATION_FAILURES: true,
    LOG_DATA_ACCESS: true,
    LOG_CONFIGURATION_CHANGES: true,
    RETENTION_DAYS: 90,
    ENABLE_TAMPER_DETECTION: true
  },

  // Content Security Policy
  CSP: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", 'https://apis.google.com'],
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    'img-src': ["'self'", 'data:', 'https:'],
    'connect-src': ["'self'", 'https://api.openai.com', 'https://*.supabase.co'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"]
  },

  // CORS settings
  CORS: {
    ALLOWED_ORIGINS: process.env.NODE_ENV === 'production' 
      ? ['https://app.agentforge.io'] 
      : ['http://localhost:3000', 'http://localhost:3001'],
    ALLOWED_METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    ALLOWED_HEADERS: ['Content-Type', 'Authorization', 'X-Requested-With'],
    CREDENTIALS: true,
    MAX_AGE: 86400 // 24 hours
  },

  // Input validation
  VALIDATION: {
    MAX_REQUEST_SIZE: '10mb',
    MAX_JSON_PAYLOAD: '1mb',
    MAX_URL_LENGTH: 2048,
    MAX_HEADER_SIZE: 8192,
    SANITIZE_HTML: true,
    VALIDATE_JSON_SCHEMA: true
  },

  // API security
  API_SECURITY: {
    REQUIRE_API_KEY: true,
    API_KEY_ROTATION_DAYS: 90,
    ENABLE_REQUEST_SIGNING: true,
    REQUIRE_TLS: true,
    MIN_TLS_VERSION: '1.2',
    ENABLE_HSTS: true,
    HSTS_MAX_AGE: 31536000 // 1 year
  }
};

/**
 * Security headers for all responses
 */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
};

/**
 * Sensitive field patterns for data masking
 */
export const SENSITIVE_FIELDS = [
  'password',
  'secret',
  'token',
  'key',
  'credential',
  'auth',
  'api_key',
  'access_token',
  'refresh_token',
  'private_key',
  'certificate'
];

/**
 * Risk assessment thresholds
 */
export const RISK_THRESHOLDS = {
  HIGH_RISK_ACTIONS: [
    'delete_connection',
    'revoke_connection', 
    'update_security_settings',
    'bulk_operations',
    'admin_actions'
  ],
  SUSPICIOUS_PATTERNS: {
    RAPID_API_CALLS: 100, // per minute
    FAILED_AUTH_ATTEMPTS: 5, // per hour
    UNUSUAL_IP_CHANGES: 3, // per day
    LARGE_DATA_EXPORTS: 1000 // records
  }
};