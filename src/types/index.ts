/**
 * Professional TypeScript Type Definitions for AgentForge
 * Comprehensive type safety for enterprise-grade application
 */

// ============================================================================
// CORE ENTITY TYPES
// ============================================================================

export interface User {
  id: number;
  email: string;
  username?: string;
  name?: string;
  avatar?: string;
  googleId?: string;
  githubId?: string;
  preferences?: UserPreferences;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  conversations?: Conversation[];
  agentMemories?: AgentMemory[];
  chatSessions?: ChatSession[];
  agentTasks?: AgentTask[];
  toolExecutions?: ToolExecution[];
  connections?: Connection[];
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  notifications: NotificationSettings;
  security: SecuritySettings;
  ui: UIPreferences;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  agentCompletions: boolean;
  securityAlerts: boolean;
  maintenanceUpdates: boolean;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  sessionTimeout: number; // minutes
  allowedIpRanges?: string[];
  requirePasswordChange: boolean;
  auditLogRetention: number; // days
}

export interface UIPreferences {
  sidebarCollapsed: boolean;
  defaultView: 'dashboard' | 'chat' | 'agents' | 'connections';
  itemsPerPage: number;
  showAdvancedFeatures: boolean;
}

// ============================================================================
// AGENT SYSTEM TYPES
// ============================================================================

export interface Agent {
  id: number;
  name: string;
  description: string;
  personality: string;
  personalityTraits: string[];
  defaultProvider: string;
  defaultModel: string;
  memorySettings: AgentMemoryConfig;
  toolAccess: AgentToolConfig;
  tools: string[];
  capabilities: AgentCapabilities;
  providerConfig: ProviderConfig;
  delegationRules?: AgentDelegationRules;
  isActive: boolean;
  canDelegate: boolean;
  createdAt: Date;
  
  // Relations
  memories?: AgentMemory[];
  chatMessages?: ChatMessage[];
  delegatedTasks?: AgentTask[];
  executedTasks?: AgentTask[];
  toolExecutions?: ToolExecution[];
  connections?: AgentConnection[];
}

export interface AgentMemoryConfig {
  maxShortTermMemories: number;
  maxLongTermMemories: number;
  memoryRetentionDays: number;
  autoSummarization: boolean;
  contextWindowSize: number;
  importanceThreshold: number;
}

export interface AgentToolConfig {
  allowedTools: string[];
  restrictedTools: string[];
  requireApproval: string[];
  maxExecutionsPerHour: number;
  timeoutSeconds: number;
}

export interface AgentCapabilities {
  canDelegate: boolean;
  canUseTools: boolean;
  canAccessInternet: boolean;
  canModifyFiles: boolean;
  canExecuteCode: boolean;
  maxDelegationDepth: number;
  supportedLanguages: string[];
  specializations: string[];
}

export interface ProviderConfig {
  primary: string;
  fallbacks: string[];
  routingRules: ProviderRoutingRule[];
  rateLimits: Record<string, number>;
  costOptimization: boolean;
}

export interface ProviderRoutingRule {
  condition: string;
  provider: string;
  model: string;
  priority: number;
}

export interface AgentDelegationRules {
  canDelegateTo: string[];
  autoDelegate: DelegationCondition[];
  requireApproval: boolean;
  maxDelegations: number;
  escalationRules: EscalationRule[];
}

export interface DelegationCondition {
  trigger: string;
  targetAgent: string;
  condition: string;
  priority: number;
}

export interface EscalationRule {
  condition: string;
  targetAgent: string;
  timeout: number;
  maxAttempts: number;
}

// ============================================================================
// MEMORY AND CONTEXT TYPES
// ============================================================================

export interface AgentMemory {
  id: number;
  agentId: number;
  userId: number;
  input: string;
  output: string;
  structuredData?: StructuredMemoryData;
  context?: MemoryContext;
  memoryType: MemoryType;
  importance: number; // 1-10
  tags: string[];
  relatedTaskId?: number;
  createdAt: Date;
}

export type MemoryType = 'short_term' | 'long_term' | 'task' | 'delegation' | 'tool_result' | 'conversation';

export interface StructuredMemoryData {
  entities: Entity[];
  relationships: Relationship[];
  insights: Insight[];
  metadata: Record<string, any>;
}

export interface Entity {
  name: string;
  type: string;
  properties: Record<string, any>;
  confidence: number;
}

export interface Relationship {
  source: string;
  target: string;
  type: string;
  strength: number;
  context?: string;
}

export interface Insight {
  type: string;
  content: string;
  confidence: number;
  sources: string[];
  timestamp: Date;
}

export interface MemoryContext {
  conversationId?: string;
  taskId?: string;
  toolId?: string;
  triggeredBy?: string;
  environment: Record<string, any>;
  userContext: Record<string, any>;
}

// ============================================================================
// TASK AND EXECUTION TYPES
// ============================================================================

export interface AgentTask {
  id: number;
  delegatingAgentId: number;
  executingAgentId?: number;
  userId: number;
  taskType: TaskType;
  title: string;
  description: string;
  input: string;
  output?: string;
  status: TaskStatus;
  priority: number;
  metadata?: TaskMetadata;
  parentTaskId?: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  
  // Relations
  parentTask?: AgentTask;
  subtasks?: AgentTask[];
  toolExecutions?: ToolExecution[];
}

export type TaskType = 'delegation' | 'tool_execution' | 'multi_provider' | 'workflow' | 'analysis';
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';

export interface TaskMetadata {
  estimatedDuration?: number;
  actualDuration?: number;
  resourceRequirements: ResourceRequirements;
  dependencies: string[];
  retryCount: number;
  maxRetries: number;
  timeout: number;
  tags: string[];
}

export interface ResourceRequirements {
  memory: number; // MB
  cpu: number; // cores
  storage: number; // MB
  networkBandwidth?: number; // Mbps
  gpuRequired: boolean;
}

export interface ToolExecution {
  id: number;
  taskId?: number;
  agentId: number;
  userId: number;
  toolName: string;
  toolVersion?: string;
  input: string;
  output?: string;
  status: TaskStatus;
  error?: string;
  executionTime?: number; // milliseconds
  metadata?: ToolExecutionMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface ToolExecutionMetadata {
  inputSchema?: JSONSchema;
  outputSchema?: JSONSchema;
  resourceUsage: ResourceUsage;
  securityContext: SecurityContext;
  auditTrail: AuditEvent[];
}

export interface ResourceUsage {
  cpuTime: number;
  memoryPeak: number;
  networkIO: number;
  diskIO: number;
  apiCalls: number;
}

export interface SecurityContext {
  permissions: string[];
  restrictions: string[];
  auditLevel: 'basic' | 'detailed' | 'full';
  encryptionRequired: boolean;
}

export interface AuditEvent {
  timestamp: Date;
  event: string;
  details: Record<string, any>;
  userId?: number;
  agentId?: number;
}

// ============================================================================
// CONNECTION SYSTEM TYPES
// ============================================================================

export interface Connection {
  id: string;
  userId: number;
  type: ConnectionType;
  name: string;
  description?: string;
  config: EncryptedConfig;
  scopes: ConnectionScope[];
  status: ConnectionStatus;
  lastUsed?: Date;
  expiresAt?: Date;
  metadata?: ConnectionMetadata;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  agentConnections?: AgentConnection[];
  connectionLogs?: ConnectionLog[];
}

export type ConnectionType = 
  | 'aws' | 'azure' | 'gcp' 
  | 'github' | 'gitlab' | 'bitbucket'
  | 'openops' | 'toolhive' | 'arcade' | 'mcpjungle'
  | 'slack' | 'discord' | 'teams'
  | 'salesforce' | 'hubspot' | 'zendesk'
  | 'stripe' | 'paypal' | 'square'
  | 'postgres' | 'mysql' | 'mongodb'
  | 'redis' | 'elasticsearch' | 'clickhouse'
  | 'docker' | 'kubernetes' | 'terraform';

export type ConnectionScope = 'read' | 'write' | 'admin' | 'execute' | 'delete';
export type ConnectionStatus = 'active' | 'inactive' | 'revoked' | 'expired' | 'error';

export interface EncryptedConfig {
  // This would contain encrypted credential data
  // The actual structure varies by connection type
  [key: string]: any;
}

export interface ConnectionMetadata {
  version: string;
  region?: string;
  environment: 'development' | 'staging' | 'production';
  tags: string[];
  healthCheck?: HealthCheckConfig;
  rateLimits?: RateLimitConfig;
  retryPolicy?: RetryPolicyConfig;
}

export interface HealthCheckConfig {
  enabled: boolean;
  interval: number; // seconds
  timeout: number; // seconds
  retries: number;
  endpoint?: string;
}

export interface RateLimitConfig {
  requestsPerSecond: number;
  requestsPerMinute: number;
  requestsPerHour: number;
  burstLimit: number;
}

export interface RetryPolicyConfig {
  maxRetries: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  retryableErrors: string[];
}

export interface AgentConnection {
  id: string;
  agentId: number;
  connectionId: string;
  permissions: ConnectionScope[];
  isRequired: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConnectionLog {
  id: string;
  connectionId: string;
  userId: number;
  agentId?: number;
  action: ConnectionAction;
  context?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export type ConnectionAction = 'created' | 'updated' | 'used' | 'tested' | 'revoked' | 'expired';

// ============================================================================
// CHAT SYSTEM TYPES
// ============================================================================

export interface ChatSession {
  id: number;
  userId: number;
  title: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  messages?: ChatMessage[];
}

export interface ChatMessage {
  id: number;
  sessionId: number;
  agentId?: number;
  role: MessageRole;
  content: string;
  images: string[];
  metadata?: MessageMetadata;
  isStreaming: boolean;
  createdAt: Date;
}

export type MessageRole = 'user' | 'agent' | 'system' | 'tool';

export interface MessageMetadata {
  provider?: string;
  model?: string;
  tokenUsage?: TokenUsage;
  processingTime?: number;
  confidence?: number;
  citations?: Citation[];
  tools?: ToolCall[];
}

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

export interface Citation {
  source: string;
  title?: string;
  url?: string;
  snippet?: string;
  relevance: number;
}

export interface ToolCall {
  name: string;
  input: Record<string, any>;
  output?: Record<string, any>;
  duration: number;
  success: boolean;
}

// ============================================================================
// API AND WORKFLOW TYPES
// ============================================================================

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: APIError;
  metadata?: APIMetadata;
}

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  requestId?: string;
}

export interface APIMetadata {
  requestId: string;
  timestamp: Date;
  duration: number;
  rateLimit?: RateLimitInfo;
  pagination?: PaginationInfo;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: Date;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  triggers: WorkflowTrigger[];
  steps: WorkflowStep[];
  errorHandling: ErrorHandlingConfig;
  timeout: number;
  retryPolicy: RetryPolicyConfig;
  metadata: Record<string, any>;
}

export interface WorkflowTrigger {
  type: 'manual' | 'scheduled' | 'event' | 'webhook';
  config: Record<string, any>;
  conditions?: WorkflowCondition[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'agent' | 'tool' | 'condition' | 'loop' | 'parallel';
  config: Record<string, any>;
  dependencies?: string[];
  errorHandling?: StepErrorHandling;
}

export interface WorkflowCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains';
  value: any;
}

export interface ErrorHandlingConfig {
  strategy: 'fail' | 'retry' | 'skip' | 'fallback';
  maxRetries?: number;
  retryDelay?: number;
  fallbackStep?: string;
  notifications: string[];
}

export interface StepErrorHandling extends ErrorHandlingConfig {
  continueOnError: boolean;
}

// ============================================================================
// JSON SCHEMA AND VALIDATION TYPES
// ============================================================================

export interface JSONSchema {
  type: string;
  properties?: Record<string, JSONSchema>;
  required?: string[];
  items?: JSONSchema;
  enum?: any[];
  const?: any;
  title?: string;
  description?: string;
  examples?: any[];
  default?: any;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  additionalProperties?: boolean | JSONSchema;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
  value?: any;
}

export interface ValidationWarning {
  path: string;
  message: string;
  code: string;
  value?: any;
}

// ============================================================================
// UTILITY AND HELPER TYPES
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

export type Nullable<T> = T | null;

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type WithTimestamps<T> = T & {
  createdAt: Date;
  updatedAt: Date;
};

export type WithOptionalId<T> = Omit<T, 'id'> & { id?: number };

export type EntityState<T> = {
  loading: boolean;
  error: string | null;
  data: T | null;
};

export type ListState<T> = {
  loading: boolean;
  error: string | null;
  items: T[];
  pagination: PaginationInfo | null;
};

// ============================================================================
// ENVIRONMENT AND CONFIGURATION TYPES
// ============================================================================

export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  OPENAI_API_KEY?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  REDIS_URL?: string;
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug' | 'trace';
}

export interface AppConfig {
  app: {
    name: string;
    version: string;
    description: string;
    url: string;
  };
  api: {
    version: string;
    basePath: string;
    timeout: number;
  };
  security: {
    jwtExpirationTime: string;
    bcryptRounds: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
  };
  features: {
    allowSignup: boolean;
    requireEmailVerification: boolean;
    enableTwoFactor: boolean;
    enableAuditLog: boolean;
  };
}

// Export commonly used type combinations
export type AgentWithConnections = Agent & {
  connections: (AgentConnection & { connection: Connection })[];
};

export type TaskWithSubtasks = AgentTask & {
  subtasks: AgentTask[];
  toolExecutions: ToolExecution[];
};

export type UserWithPreferences = User & {
  preferences: UserPreferences;
};