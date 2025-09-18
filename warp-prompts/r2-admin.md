# R2 System Administration - Warp Integration Prompt

## Context
You are helping with system administration tasks for the CrapGPT platform's Cloudflare R2 unified storage system. This includes monitoring, maintenance, security, and troubleshooting operations.

## System Overview
The CrapGPT platform uses a centralized R2 bucket with strict folder organization:
- **Control Plane**: VPS handles routing, auth, presigned URLs only
- **Worker Execution**: All heavy/risky tasks run remotely via workers
- **Artifact Storage**: Everything stored in R2 with standardized paths
- **Security**: Presigned URLs, virus scanning, content validation

## Administrative Commands

### 1. System Health Check
```bash
# Comprehensive R2 and CrapGPT system health check
crapgpt-health-check() {
  echo "🏥 CrapGPT System Health Check - $(date)"
  echo "================================================"
  
  # Check API endpoints
  echo "🔍 Checking API endpoints..."
  
  # Health check endpoint
  if curl -s -f "$CRAPGPT_API_URL/api/health" > /dev/null; then
    echo "✅ API server is responsive"
  else
    echo "❌ API server is down or unreachable"
  fi
  
  # Check orchestration system
  response=$(curl -s "$CRAPGPT_API_URL/api/orchestration/health" \
    -H "Authorization: Bearer $CRAPGPT_JWT_TOKEN")
  
  if echo "$response" | jq -e '.success' > /dev/null; then
    echo "✅ Orchestration system healthy"
    echo "$response" | jq -r '
      "   🤖 Active agents: \(.activeAgents)
      ⚡ Worker queues: \(.workerQueues)
      🔄 Jobs processing: \(.processingJobs)"
    '
  else
    echo "❌ Orchestration system issues"
  fi
  
  # Check R2 connectivity
  echo "🗄️ Checking R2 storage..."
  test_file="health-check-$(date +%s).txt"
  
  # Try to upload a test file
  response=$(curl -s -X POST "$CRAPGPT_API_URL/api/presign-upload" \
    -H "Authorization: Bearer $CRAPGPT_JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"fileName\": \"$test_file\",
      \"fileType\": \"text/plain\",
      \"uploadType\": \"temp\"
    }")
  
  if echo "$response" | jq -e '.uploadUrl' > /dev/null; then
    upload_url=$(echo "$response" | jq -r '.uploadUrl')
    
    # Upload test content
    if echo "health check test" | curl -s -X PUT "$upload_url" \
      -H "Content-Type: text/plain" --data-binary @-; then
      echo "✅ R2 storage write access working"
    else
      echo "❌ R2 storage write access failed"
    fi
  else
    echo "❌ R2 presigned URL generation failed"
  fi
  
  # Check Redis (if configured)
  if command -v redis-cli &> /dev/null; then
    if redis-cli ping &> /dev/null; then
      echo "✅ Redis connection healthy"
    else
      echo "❌ Redis connection failed"
    fi
  fi
  
  echo "================================================"
  echo "✅ Health check completed"
}
```

### 2. Storage Usage Analytics
```bash
# Analyze R2 storage usage across different folders
crapgpt-storage-analytics() {
  local days="${1:-30}"
  
  echo "📊 CrapGPT Storage Analytics - Last $days days"
  echo "=============================================="
  
  # Get storage usage report
  response=$(curl -s -X POST "$CRAPGPT_API_URL/api/admin/storage-report" \
    -H "Authorization: Bearer $CRAPGPT_JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"days\": $days}")
  
  echo "$response" | jq -r '
    "📁 Total storage used: \(.totalSize | . / 1024 / 1024 / 1024 | floor) GB
    📂 Total files: \(.totalFiles | tonumber)
    
    📋 Breakdown by category:
    👥 User files: \(.categories.users.size | . / 1024 / 1024 | floor) MB (\(.categories.users.files) files)
    🤖 Agent data: \(.categories.agents.size | . / 1024 / 1024 | floor) MB (\(.categories.agents.files) files)
    ⚙️  Worker artifacts: \(.categories.workers.size | . / 1024 / 1024 | floor) MB (\(.categories.workers.files) files)
    🔄 Orchestration: \(.categories.orchestration.size / 1024 / 1024 | floor) MB (\(.categories.orchestration.files) files)
    🔒 Security/quarantine: \(.categories.security.size / 1024 / 1024 | floor) MB (\(.categories.security.files) files)
    
    📈 Growth trends:
    📅 Daily avg: \(.trends.dailyGrowthMB) MB/day
    📊 File types:
    "
  '
  
  echo "$response" | jq -r '.fileTypes[] | "   \(.extension): \(.count) files (\(.sizeMB) MB)"'
  
  # Show largest files
  echo ""
  echo "🔍 Largest files:"
  echo "$response" | jq -r '.largestFiles[] | "   📄 \(.key) - \(.sizeMB) MB"'
}
```

### 3. Security Audit
```bash
# Perform security audit on R2 storage and access patterns
crapgpt-security-audit() {
  local hours="${1:-24}"
  
  echo "🔐 CrapGPT Security Audit - Last $hours hours"
  echo "==========================================="
  
  # Get security report
  response=$(curl -s -X POST "$CRAPGPT_API_URL/api/admin/security-audit" \
    -H "Authorization: Bearer $CRAPGPT_JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"hours\": $hours}")
  
  echo "$response" | jq -r '
    "🔍 Access Summary:
    📥 File uploads: \(.uploads.total) (\(.uploads.successful) successful, \(.uploads.failed) failed)
    📤 File downloads: \(.downloads.total) (\(.downloads.successful) successful, \(.downloads.failed) failed)
    🔒 Authentication failures: \(.authFailures)
    ⚠️  Suspicious activities: \(.suspiciousActivities)
    
    🦠 Security Scanning:
    ✅ Files scanned: \(.scanning.scanned)
    🚫 Files quarantined: \(.scanning.quarantined)
    ⚠️  Scan failures: \(.scanning.failures)
    "
  '
  
  # Show quarantined files
  if [[ $(echo "$response" | jq '.quarantinedFiles | length') -gt 0 ]]; then
    echo "🚨 Quarantined Files:"
    echo "$response" | jq -r '.quarantinedFiles[] | "   ⚠️  \(.filename) - \(.reason) - \(.timestamp)"'
  fi
  
  # Show suspicious activities
  if [[ $(echo "$response" | jq '.suspiciousEvents | length') -gt 0 ]]; then
    echo ""
    echo "🚨 Suspicious Activities:"
    echo "$response" | jq -r '.suspiciousEvents[] | "   ⚠️  \(.type) - \(.details) - \(.timestamp)"'
  fi
}
```

### 4. Cleanup Operations
```bash
# Comprehensive cleanup of old/unused R2 data
crapgpt-cleanup() {
  local days_old="${1:-30}"
  local dry_run="${2:-true}"
  
  echo "🧹 CrapGPT Storage Cleanup - Files older than $days_old days"
  
  if [ "$dry_run" = "true" ]; then
    echo "🔍 DRY RUN MODE - No files will be deleted"
  else
    echo "⚠️  LIVE MODE - Files will be permanently deleted!"
    read -p "Are you sure you want to continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
      echo "❌ Cleanup cancelled"
      return 1
    fi
  fi
  
  echo "================================================"
  
  # Get cleanup candidates
  response=$(curl -s -X POST "$CRAPGPT_API_URL/api/admin/cleanup-candidates" \
    -H "Authorization: Bearer $CRAPGPT_JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"olderThanDays\": $days_old, \"dryRun\": $(if [ "$dry_run" = "true" ]; then echo "true"; else echo "false"; fi)}")
  
  echo "$response" | jq -r '
    "🗑️  Cleanup Summary:
    📄 Temporary files to delete: \(.categories.temp.count) (\(.categories.temp.sizeMB) MB)
    🧠 Old agent memories: \(.categories.memories.count) (\(.categories.memories.sizeMB) MB)
    📊 Worker logs: \(.categories.logs.count) (\(.categories.logs.sizeMB) MB)
    🔄 Orchestration artifacts: \(.categories.orchestration.count) (\(.categories.orchestration.sizeMB) MB)
    
    💾 Total space to free: \(.totalSizeMB) MB
    "
  '
  
  if [ "$dry_run" = "false" ]; then
    echo "$response" | jq -r '"✅ Cleanup completed: \(.deletedCount) files removed"'
  else
    echo ""
    echo "💡 To actually perform cleanup, run:"
    echo "   crapgpt-cleanup $days_old false"
  fi
}
```

### 5. Worker Queue Monitoring
```bash
# Monitor worker queue status and job processing
crapgpt-monitor-workers() {
  local interval="${1:-10}"
  
  echo "👷 CrapGPT Worker Queue Monitor"
  echo "Press Ctrl+C to stop"
  echo "Refreshing every ${interval} seconds..."
  echo "======================================"
  
  while true; do
    clear
    echo "👷 Worker Queue Status - $(date)"
    echo "======================================"
    
    # Get worker status
    response=$(curl -s -X GET "$CRAPGPT_API_URL/api/admin/worker-status" \
      -H "Authorization: Bearer $CRAPGPT_JWT_TOKEN")
    
    echo "$response" | jq -r '
      "📋 Queue Status:
      🔄 Jobs processing: \(.processing)
      ⏳ Jobs queued: \(.queued)
      ✅ Jobs completed (24h): \(.completedToday)
      ❌ Jobs failed (24h): \(.failedToday)
      
      📊 Queue Breakdown:"
    '
    
    echo "$response" | jq -r '.queues[] | "   \(.name): \(.pending) pending, \(.processing) processing"'
    
    echo ""
    echo "🏃 Active Workers:"
    echo "$response" | jq -r '.workers[] | "   Worker \(.id): \(.status) - \(.currentJob // "idle")"'
    
    # Show recent job failures if any
    if [[ $(echo "$response" | jq '.recentFailures | length') -gt 0 ]]; then
      echo ""
      echo "⚠️  Recent Failures:"
      echo "$response" | jq -r '.recentFailures[] | "   ❌ \(.jobType) - \(.error) - \(.timestamp)"'
    fi
    
    sleep "$interval"
  done
}
```

### 6. Configuration Management
```bash
# Manage and validate CrapGPT configuration
crapgpt-config() {
  local action="${1:-status}"
  
  case "$action" in
    "status")
      echo "⚙️  CrapGPT Configuration Status"
      echo "==============================="
      
      # Get configuration status
      response=$(curl -s -X GET "$CRAPGPT_API_URL/api/admin/config" \
        -H "Authorization: Bearer $CRAPGPT_JWT_TOKEN")
      
      echo "$response" | jq -r '
        "🗄️  Storage Configuration:
        R2 Endpoint: \(.storage.endpoint)
        R2 Bucket: \(.storage.bucket)
        Max File Size: \(.storage.maxFileSize)
        Virus Scanning: \(.storage.virusScanning)
        
        🔐 Security Settings:
        Presigned URL Expiration: \(.security.presignedExpiration)s
        Download URL Expiration: \(.security.downloadExpiration)s
        Allowed File Types: \(.security.allowedTypes | length) types
        
        👷 Worker Configuration:
        Worker Concurrency: \(.workers.concurrency)
        Worker Timeout: \(.workers.timeout)ms
        Max Retries: \(.workers.maxRetries)
        
        🤖 Agent Settings:
        Default Provider: \(.agents.defaultProvider)
        Default Model: \(.agents.defaultModel)
        Memory Limit: \(.agents.memoryLimit)
        "
      '
      ;;
      
    "validate")
      echo "✔️  Validating CrapGPT Configuration"
      echo "===================================="
      
      response=$(curl -s -X POST "$CRAPGPT_API_URL/api/admin/validate-config" \
        -H "Authorization: Bearer $CRAPGPT_JWT_TOKEN")
      
      if echo "$response" | jq -e '.valid' > /dev/null; then
        echo "✅ Configuration is valid"
      else
        echo "❌ Configuration issues found:"
        echo "$response" | jq -r '.errors[] | "   ⚠️  \(.)"'
      fi
      ;;
      
    "reload")
      echo "🔄 Reloading CrapGPT Configuration"
      echo "=================================="
      
      response=$(curl -s -X POST "$CRAPGPT_API_URL/api/admin/reload-config" \
        -H "Authorization: Bearer $CRAPGPT_JWT_TOKEN")
      
      if echo "$response" | jq -e '.success' > /dev/null; then
        echo "✅ Configuration reloaded successfully"
      else
        echo "❌ Configuration reload failed:"
        echo "$response" | jq -r '.error'
      fi
      ;;
      
    *)
      echo "Usage: crapgpt-config [status|validate|reload]"
      ;;
  esac
}
```

### 7. Backup and Restore Operations
```bash
# Create system-wide backup of critical R2 data
crapgpt-system-backup() {
  local backup_type="${1:-incremental}"
  local backup_dir="${2:-./backups/system-$(date +%Y%m%d-%H%M%S)}"
  
  mkdir -p "$backup_dir"
  echo "💼 Creating $backup_type system backup in $backup_dir"
  echo "================================================="
  
  # Create backup manifest
  cat << EOF > "$backup_dir/manifest.json"
{
  "backupType": "$backup_type",
  "timestamp": "$(date -Iseconds)",
  "backupPath": "$backup_dir",
  "platform": "crapgpt",
  "version": "1.0.0"
}
EOF
  
  # Backup configuration
  echo "⚙️  Backing up configuration..."
  curl -s -X GET "$CRAPGPT_API_URL/api/admin/export-config" \
    -H "Authorization: Bearer $CRAPGPT_JWT_TOKEN" > "$backup_dir/config.json"
  
  # Backup agent definitions
  echo "🤖 Backing up agent definitions..."
  curl -s -X GET "$CRAPGPT_API_URL/api/admin/export-agents" \
    -H "Authorization: Bearer $CRAPGPT_JWT_TOKEN" > "$backup_dir/agents.json"
  
  # Backup user data (metadata only, not files)
  echo "👥 Backing up user metadata..."
  curl -s -X GET "$CRAPGPT_API_URL/api/admin/export-users" \
    -H "Authorization: Bearer $CRAPGPT_JWT_TOKEN" > "$backup_dir/users.json"
  
  # Backup critical system logs
  echo "📊 Backing up system logs..."
  curl -s -X POST "$CRAPGPT_API_URL/api/admin/export-logs" \
    -H "Authorization: Bearer $CRAPGPT_JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"type\": \"critical\", \"days\": 7}" > "$backup_dir/system-logs.json"
  
  echo "✅ System backup completed: $backup_dir"
  echo "📦 Backup contents:"
  ls -la "$backup_dir"
}

# Restore from system backup
crapgpt-system-restore() {
  local backup_dir="$1"
  
  if [ ! -d "$backup_dir" ]; then
    echo "❌ Backup directory not found: $backup_dir"
    return 1
  fi
  
  echo "🔄 Restoring from backup: $backup_dir"
  echo "⚠️  WARNING: This will overwrite current system configuration!"
  read -p "Are you sure you want to continue? (yes/no): " confirm
  
  if [ "$confirm" != "yes" ]; then
    echo "❌ Restore cancelled"
    return 1
  fi
  
  # Restore configuration
  if [ -f "$backup_dir/config.json" ]; then
    echo "⚙️  Restoring configuration..."
    curl -s -X POST "$CRAPGPT_API_URL/api/admin/import-config" \
      -H "Authorization: Bearer $CRAPGPT_JWT_TOKEN" \
      -H "Content-Type: application/json" \
      --data-binary "@$backup_dir/config.json"
  fi
  
  # Restore agents
  if [ -f "$backup_dir/agents.json" ]; then
    echo "🤖 Restoring agent definitions..."
    curl -s -X POST "$CRAPGPT_API_URL/api/admin/import-agents" \
      -H "Authorization: Bearer $CRAPGPT_JWT_TOKEN" \
      -H "Content-Type: application/json" \
      --data-binary "@$backup_dir/agents.json"
  fi
  
  echo "✅ System restore completed"
  echo "🔄 Restarting services for changes to take effect..."
  crapgpt-config reload
}
```

### 8. Performance Monitoring
```bash
# Monitor system performance metrics
crapgpt-performance() {
  local duration="${1:-300}"  # 5 minutes default
  local interval="${2:-30}"   # 30 seconds default
  
  echo "📈 CrapGPT Performance Monitor"
  echo "Duration: ${duration}s, Interval: ${interval}s"
  echo "Press Ctrl+C to stop"
  echo "=========================="
  
  local start_time=$(date +%s)
  local end_time=$((start_time + duration))
  
  while [ $(date +%s) -lt $end_time ]; do
    # Get performance metrics
    response=$(curl -s -X GET "$CRAPGPT_API_URL/api/admin/performance" \
      -H "Authorization: Bearer $CRAPGPT_JWT_TOKEN")
    
    echo "📊 $(date) - Performance Metrics:"
    echo "$response" | jq -r '
      "   💾 Memory Usage: \(.memory.used)MB / \(.memory.total)MB (\(.memory.percentage)%)
      ⚡ CPU Usage: \(.cpu.percentage)%
      🌐 Active Connections: \(.network.activeConnections)
      📁 R2 Operations/min: \(.storage.operationsPerMinute)
      🔄 Queue Throughput: \(.workers.jobsPerMinute) jobs/min
      ⏱️  Avg Response Time: \(.api.avgResponseTime)ms
      "
    '
    
    sleep "$interval"
  done
  
  echo "✅ Performance monitoring completed"
}
```

## Usage Examples

```bash
# System health check
crapgpt-health-check

# Storage analytics for last 7 days
crapgpt-storage-analytics 7

# Security audit for last 12 hours
crapgpt-security-audit 12

# Cleanup files older than 14 days (dry run)
crapgpt-cleanup 14 true

# Monitor worker queues every 5 seconds
crapgpt-monitor-workers 5

# Check configuration status
crapgpt-config status

# Validate configuration
crapgpt-config validate

# Create incremental system backup
crapgpt-system-backup incremental ./backups/today

# Monitor performance for 10 minutes
crapgpt-performance 600 30
```

## Emergency Procedures

### System Recovery Commands
```bash
# Emergency stop all workers
curl -X POST "$CRAPGPT_API_URL/api/admin/emergency-stop" \
  -H "Authorization: Bearer $CRAPGPT_JWT_TOKEN"

# Restart orchestration system
curl -X POST "$CRAPGPT_API_URL/api/admin/restart-orchestration" \
  -H "Authorization: Bearer $CRAPGPT_JWT_TOKEN"

# Clear all worker queues
curl -X POST "$CRAPGPT_API_URL/api/admin/clear-queues" \
  -H "Authorization: Bearer $CRAPGPT_JWT_TOKEN"

# Enable maintenance mode
curl -X POST "$CRAPGPT_API_URL/api/admin/maintenance-mode" \
  -H "Authorization: Bearer $CRAPGPT_JWT_TOKEN" \
  -d '{"enabled": true}'
```

## Monitoring Alerts

Set up these monitoring scripts to run via cron:

```bash
# Add to crontab (crontab -e)
# Check system health every 5 minutes
*/5 * * * * /path/to/crapgpt-health-check > /var/log/crapgpt-health.log

# Daily storage analytics
0 2 * * * /path/to/crapgpt-storage-analytics 1 > /var/log/crapgpt-storage.log

# Daily security audit
0 3 * * * /path/to/crapgpt-security-audit 24 > /var/log/crapgpt-security.log

# Weekly cleanup (dry run for review)
0 4 * * 0 /path/to/crapgpt-cleanup 30 true > /var/log/crapgpt-cleanup.log

# Daily system backup
0 1 * * * /path/to/crapgpt-system-backup incremental /backups/daily
```