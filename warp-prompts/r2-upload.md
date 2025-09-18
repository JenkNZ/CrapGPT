# R2 Artifact Upload - Warp Integration Prompt

## Context
You are helping with the CrapGPT platform that uses Cloudflare R2 as its unified artifact storage with a standardized folder structure. The R2 service provides secure file upload/download capabilities with presigned URLs.

## Folder Structure
```
bucket/
├── users/{userId}/
│   ├── uploads/
│   │   ├── attachments/
│   │   ├── images/
│   │   └── audio/
│   ├── sessions/{sessionId}/
│   └── temp/
├── agents/{agentId}/
│   ├── memories/
│   ├── artifacts/
│   ├── structured-memories/
│   └── task-completions/
├── orchestration/
│   ├── executions/
│   └── artifacts/
├── workers/{jobType}/
│   ├── jobs/
│   └── artifacts/
├── openops/
│   └── runs/{runId}/
├── mcp/
│   └── calls/{callId}/
└── security/
    └── quarantine/
```

## Commands to Help With

### 1. Upload Files to R2
When user wants to upload files to R2, suggest this workflow:

```bash
# Generate presigned upload URL
curl -X POST http://localhost:3001/api/presign-upload \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "example.pdf",
    "fileType": "application/pdf",
    "uploadType": "attachments"
  }'

# Upload file using presigned URL (response from above)
curl -X PUT "$PRESIGNED_URL" \
  -H "Content-Type: application/pdf" \
  --data-binary @./example.pdf
```

### 2. Download Files from R2
```bash
# Generate presigned download URL
curl -X POST http://localhost:3001/api/presign-download \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fileKey": "users/123/uploads/attachments/example.pdf"
  }'

# Download file using presigned URL
curl "$PRESIGNED_DOWNLOAD_URL" -o downloaded-file.pdf
```

### 3. List User Files
```bash
# List all user files with download URLs
curl -X GET http://localhost:3001/api/user-files \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 4. Batch Upload Multiple Files
```bash
# Create a script for batch uploading
for file in *.pdf *.jpg *.png; do
  if [ -f "$file" ]; then
    echo "Uploading $file..."
    
    # Determine content type
    case "${file##*.}" in
      pdf) content_type="application/pdf" ;;
      jpg|jpeg) content_type="image/jpeg" ;;
      png) content_type="image/png" ;;
      *) content_type="application/octet-stream" ;;
    esac
    
    # Get presigned URL
    response=$(curl -s -X POST http://localhost:3001/api/presign-upload \
      -H "Authorization: Bearer $JWT_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"fileName\": \"$file\",
        \"fileType\": \"$content_type\",
        \"uploadType\": \"attachments\"
      }")
    
    # Extract upload URL from response
    upload_url=$(echo $response | jq -r '.uploadUrl')
    
    # Upload file
    curl -X PUT "$upload_url" \
      -H "Content-Type: $content_type" \
      --data-binary "@$file"
    
    echo "✅ Uploaded $file"
  fi
done
```

## Environment Setup
Suggest users set these environment variables for easier access:

```bash
export CRAPGPT_API_URL=http://localhost:3001
export CRAPGPT_JWT_TOKEN=your_jwt_token_here

# Add to ~/.bashrc or ~/.zshrc for persistence
echo 'export CRAPGPT_API_URL=http://localhost:3001' >> ~/.bashrc
echo 'export CRAPGPT_JWT_TOKEN=your_jwt_token_here' >> ~/.bashrc
```

## Helper Functions
Suggest these bash functions for common operations:

```bash
# Add to ~/.bashrc or ~/.zshrc

# Upload file to R2
crapgpt-upload() {
  local file="$1"
  local upload_type="${2:-attachments}"
  
  if [ ! -f "$file" ]; then
    echo "❌ File not found: $file"
    return 1
  fi
  
  # Determine content type
  case "${file##*.}" in
    pdf) content_type="application/pdf" ;;
    txt) content_type="text/plain" ;;
    json) content_type="application/json" ;;
    jpg|jpeg) content_type="image/jpeg" ;;
    png) content_type="image/png" ;;
    gif) content_type="image/gif" ;;
    mp3) content_type="audio/mpeg" ;;
    wav) content_type="audio/wav" ;;
    mp4) content_type="video/mp4" ;;
    zip) content_type="application/zip" ;;
    *) content_type="application/octet-stream" ;;
  esac
  
  echo "📤 Uploading $file as $upload_type..."
  
  # Get presigned URL
  response=$(curl -s -X POST "$CRAPGPT_API_URL/api/presign-upload" \
    -H "Authorization: Bearer $CRAPGPT_JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"fileName\": \"$(basename "$file")\",
      \"fileType\": \"$content_type\",
      \"uploadType\": \"$upload_type\"
    }")
  
  # Check for errors
  if echo "$response" | jq -e '.error' > /dev/null; then
    echo "❌ Error: $(echo "$response" | jq -r '.error')"
    return 1
  fi
  
  # Extract upload URL
  upload_url=$(echo "$response" | jq -r '.uploadUrl')
  file_id=$(echo "$response" | jq -r '.fileId')
  
  # Upload file
  if curl -s -X PUT "$upload_url" \
    -H "Content-Type: $content_type" \
    --data-binary "@$file"; then
    echo "✅ Successfully uploaded $file"
    echo "🆔 File ID: $file_id"
    echo "📂 Type: $upload_type"
  else
    echo "❌ Failed to upload $file"
    return 1
  fi
}

# List user files
crapgpt-list() {
  local file_type="${1:-attachments}"
  echo "📋 Listing $file_type files..."
  
  curl -s -X GET "$CRAPGPT_API_URL/api/user-files?type=$file_type" \
    -H "Authorization: Bearer $CRAPGPT_JWT_TOKEN" \
    -H "Content-Type: application/json" | jq -r '
      .files[] | 
      "🆔 \(.fileId)\n📁 \(.originalName)\n📏 \(.size) bytes\n🕐 \(.lastModified)\n🔗 \(.downloadUrl)\n"
    '
}

# Download file by ID
crapgpt-download() {
  local file_id="$1"
  local output_file="$2"
  
  if [ -z "$file_id" ]; then
    echo "❌ Please provide a file ID"
    return 1
  fi
  
  echo "📥 Downloading file $file_id..."
  
  # Get download URL
  response=$(curl -s -X POST "$CRAPGPT_API_URL/api/presign-download" \
    -H "Authorization: Bearer $CRAPGPT_JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"fileId\": \"$file_id\"}")
  
  # Check for errors
  if echo "$response" | jq -e '.error' > /dev/null; then
    echo "❌ Error: $(echo "$response" | jq -r '.error')"
    return 1
  fi
  
  # Extract download info
  download_url=$(echo "$response" | jq -r '.downloadUrl')
  filename=$(echo "$response" | jq -r '.filename')
  
  # Use provided filename or original filename
  output="${output_file:-$filename}"
  
  # Download file
  if curl -s "$download_url" -o "$output"; then
    echo "✅ Downloaded to $output"
  else
    echo "❌ Failed to download file"
    return 1
  fi
}
```

## Usage Examples

After setting up the helper functions, users can:

```bash
# Upload a PDF document
crapgpt-upload document.pdf attachments

# Upload an image
crapgpt-upload screenshot.png images

# Upload audio file
crapgpt-upload recording.wav audio

# List all uploaded attachments
crapgpt-list attachments

# List all uploaded images
crapgpt-list images

# Download a file by ID
crapgpt-download abc-123-def downloaded-file.pdf

# Batch upload all PDFs in current directory
for pdf in *.pdf; do crapgpt-upload "$pdf" attachments; done
```

## Security Notes

- Always use presigned URLs - never expose R2 credentials directly
- JWT tokens should be kept secure and rotated regularly
- Files are automatically scanned and validated before storage
- All uploads are logged for audit purposes
- Files are stored in a standardized folder structure for easy management

## Troubleshooting

Common issues and solutions:

1. **401 Unauthorized**: Check your JWT token is valid and not expired
2. **File too large**: Check R2_MAX_FILE_SIZE environment variable
3. **Invalid file type**: Check ALLOWED_FILE_TYPES configuration
4. **Upload failed**: Verify network connectivity and file permissions
5. **Download failed**: Check if file exists and download URL hasn't expired