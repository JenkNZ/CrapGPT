# CrapGPT Warp Integration Prompts

This directory contains specialized prompts designed for use with [Warp Terminal](https://www.warp.dev/)'s AI capabilities to make working with the CrapGPT platform's Cloudflare R2 unified storage system easy and efficient.

## What are Warp Prompts?

These prompts are designed to help Warp's AI understand the CrapGPT platform's architecture and provide contextually relevant command suggestions, explanations, and automation scripts for common R2 operations.

## Available Prompts

### 1. `r2-upload.md` - File Upload and Management
- Upload files to R2 with proper folder structure
- Generate presigned URLs for secure uploads
- Batch upload operations
- Download files with presigned URLs
- List and manage user files
- Environment setup and helper functions

**Use case**: When you need to upload files, download artifacts, or manage user file storage.

### 2. `r2-agent-artifacts.md` - Agent Artifact Management
- List and download agent-generated content
- Export agent memories and task completions
- Backup agent data
- Search agent artifacts
- Monitor agent performance
- Clean up old agent data

**Use case**: When working with AI agent outputs, memories, or analyzing agent performance.

### 3. `r2-admin.md` - System Administration
- System health checks
- Storage analytics and monitoring
- Security audits
- Cleanup operations
- Worker queue monitoring
- Configuration management
- Backup and restore procedures
- Performance monitoring

**Use case**: When performing system administration, monitoring, or maintenance tasks.

## How to Use These Prompts

### Method 1: Direct Copy-Paste
1. Open the relevant prompt file
2. Copy the sections you need
3. Paste into Warp's chat interface
4. Ask Warp to generate commands based on the context

### Method 2: Import as Warp Context
1. Copy the entire prompt content
2. Start a new Warp chat session
3. Paste the prompt as context: "Use this context for our conversation: [paste prompt]"
4. Ask specific questions about R2 operations

### Method 3: Reference for Command Generation
1. Keep the prompt files open as reference
2. Ask Warp to generate commands for specific tasks
3. Reference the folder structures and patterns from the prompts

## Example Warp Interactions

### Basic File Upload
```
You: I need to upload a PDF file to CrapGPT's R2 storage
Warp AI: [Uses r2-upload.md context to provide presigned URL workflow]
```

### Agent Data Analysis
```
You: Show me how to export all memories for agent "assistant-123"
Warp AI: [Uses r2-agent-artifacts.md to provide memory export commands]
```

### System Health Check
```
You: I want to check if the CrapGPT system is healthy
Warp AI: [Uses r2-admin.md to provide comprehensive health check commands]
```

## Environment Setup

Before using these prompts, ensure you have these environment variables set:

```bash
export CRAPGPT_API_URL=http://localhost:3001
export CRAPGPT_JWT_TOKEN=your_jwt_token_here

# Optional: Add to shell profile for persistence
echo 'export CRAPGPT_API_URL=http://localhost:3001' >> ~/.bashrc
echo 'export CRAPGPT_JWT_TOKEN=your_jwt_token_here' >> ~/.bashrc
```

## Architecture Context

These prompts assume the following CrapGPT architecture:

### Control Plane (VPS)
- Handles authentication and routing
- Generates presigned URLs
- Never processes heavy workloads
- Manages orchestration decisions

### Worker Execution (Remote)
- Processes all GPU/CPU intensive tasks
- Handles risky operations in sandboxed environments
- Stores results directly to R2

### R2 Storage Structure
```
bucket/
├── users/{userId}/          # User-specific files
├── agents/{agentId}/        # Agent outputs and memories
├── orchestration/           # System orchestration logs
├── workers/{jobType}/       # Worker job artifacts
├── openops/                 # OpenOps workflow data
├── mcp/                     # MCP communication logs
└── security/               # Quarantined files
```

## Security Considerations

All prompts follow these security principles:

1. **Presigned URLs**: Never expose R2 credentials directly
2. **Authentication**: Always require JWT tokens for API access
3. **Validation**: Include file type and size validation
4. **Audit Logging**: Log all file operations for security
5. **Quarantine**: Automatically isolate suspicious files

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check JWT token validity
2. **File Upload Failures**: Verify presigned URL hasn't expired
3. **Missing Files**: Check folder structure and permissions
4. **API Timeouts**: Verify API server is running

### Debug Commands

```bash
# Test API connectivity
curl -s -f "$CRAPGPT_API_URL/api/health"

# Validate JWT token
curl -s -X GET "$CRAPGPT_API_URL/api/user/profile" \
  -H "Authorization: Bearer $CRAPGPT_JWT_TOKEN"

# Check R2 connectivity
crapgpt-health-check
```

## Contributing

To add new Warp prompts:

1. Follow the existing structure and format
2. Include comprehensive command examples
3. Add security considerations
4. Provide usage examples and troubleshooting
5. Update this README with the new prompt

## Integration with Development Workflow

These prompts are designed to integrate seamlessly with the CrapGPT development workflow:

- **Development**: Use for testing file uploads and agent interactions
- **Staging**: Monitor system health and performance
- **Production**: Perform administrative tasks and security audits
- **Debugging**: Analyze logs and system state

## Best Practices

1. **Test with Dry Runs**: Always test destructive operations with dry-run flags
2. **Regular Backups**: Use backup commands before major changes
3. **Monitor Usage**: Regularly check storage analytics
4. **Security Audits**: Run security audits periodically
5. **Performance Monitoring**: Monitor system performance during heavy usage

## Support

For issues with these prompts or the CrapGPT platform:

1. Check the troubleshooting sections in individual prompts
2. Review system logs using the admin commands
3. Run health checks to identify system issues
4. Verify environment configuration

## Version Compatibility

These prompts are designed for:
- CrapGPT Platform v1.0.0+
- Cloudflare R2 API
- Warp Terminal with AI features
- Node.js/JavaScript runtime environment