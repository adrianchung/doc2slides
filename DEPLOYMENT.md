# Deployment Guide

This guide covers deploying Doc2Slides to Google Cloud Platform using Cloud Run (backend) and Firebase Hosting (frontend).

## Prerequisites

- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed
- [Firebase CLI](https://firebase.google.com/docs/cli) installed (`npm install -g firebase-tools`)
- [Docker](https://docs.docker.com/get-docker/) installed (for local testing)
- A Google Cloud project with billing enabled

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Firebase Hosting                         │
│                   (Static Frontend)                         │
│                                                             │
│  ┌─────────────┐    /api/*     ┌─────────────────────────┐ │
│  │   Users     │ ─────────────▶│     Cloud Run           │ │
│  │             │               │   (Backend API)         │ │
│  │             │◀───────────── │                         │ │
│  └─────────────┘               │  ┌─────────────────┐    │ │
│                                │  │ Secret Manager  │    │ │
│                                │  │ (GEMINI_API_KEY)│    │ │
│                                │  └─────────────────┘    │ │
│                                └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Step 1: Google Cloud Project Setup

### 1.1 Create or Select a Project

```bash
# Create a new project
gcloud projects create doc2slides-prod --name="Doc2Slides"

# Or select existing project
gcloud config set project doc2slides-prod
```

### 1.2 Enable Required APIs

```bash
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com
```

### 1.3 Set Up Secret Manager

Store your Gemini API key securely:

```bash
# Create the secret
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=-

# Grant Cloud Run access to the secret
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:$(gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)')-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Step 2: Deploy Backend to Cloud Run

### 2.1 Build and Push Container

```bash
cd backend

# Configure Docker for Google Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev

# Create Artifact Registry repository (first time only)
gcloud artifacts repositories create doc2slides \
  --repository-format=docker \
  --location=us-central1

# Build and push
PROJECT_ID=$(gcloud config get-value project)
docker build -t us-central1-docker.pkg.dev/$PROJECT_ID/doc2slides/api:latest .
docker push us-central1-docker.pkg.dev/$PROJECT_ID/doc2slides/api:latest
```

### 2.2 Deploy to Cloud Run

```bash
PROJECT_ID=$(gcloud config get-value project)

gcloud run deploy doc2slides-api \
  --image=us-central1-docker.pkg.dev/$PROJECT_ID/doc2slides/api:latest \
  --platform=managed \
  --region=us-central1 \
  --allow-unauthenticated \
  --set-secrets=GEMINI_API_KEY=gemini-api-key:latest \
  --set-env-vars="NODE_ENV=production,ALLOWED_ORIGINS=https://YOUR_DOMAIN.web.app,https://YOUR_CUSTOM_DOMAIN.com"
```

Note the Cloud Run URL from the output (e.g., `https://doc2slides-api-xxxxx-uc.a.run.app`).

### 2.3 Test the Deployment

```bash
# Get the Cloud Run URL
CLOUD_RUN_URL=$(gcloud run services describe doc2slides-api --region=us-central1 --format='value(status.url)')

# Test health endpoint
curl $CLOUD_RUN_URL/health
```

## Step 3: Configure OAuth for Production

### 3.1 Update OAuth Consent Screen

1. Go to [Google Cloud Console > APIs & Services > OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
2. Add your production domain to authorized domains
3. Update app information if needed
4. Click "Publish App" to move from Testing to Production (or add test users)

### 3.2 Update OAuth Credentials

1. Go to [APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials)
2. Edit your OAuth 2.0 Client ID
3. Add authorized JavaScript origins:
   - `https://YOUR_PROJECT_ID.web.app`
   - `https://YOUR_CUSTOM_DOMAIN.com` (if using custom domain)

## Step 4: Deploy Frontend to Firebase Hosting

### 4.1 Initialize Firebase

```bash
cd frontend

# Login to Firebase
firebase login

# Initialize Firebase (select Hosting)
firebase init hosting

# When prompted:
# - Select your Google Cloud project
# - Public directory: dist
# - Single-page app: Yes
# - Don't overwrite index.html
```

### 4.2 Update Firebase Configuration

Edit `frontend/firebase.json`:

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "/api/**",
        "run": {
          "serviceId": "doc2slides-api",
          "region": "us-central1"
        }
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

### 4.3 Build and Deploy

```bash
# Set environment variables for build
export VITE_GOOGLE_CLIENT_ID="your-oauth-client-id.apps.googleusercontent.com"

# Build the frontend
npm run build

# Deploy to Firebase
firebase deploy --only hosting
```

## Step 5: Custom Domain (Optional)

### 5.1 Firebase Hosting Custom Domain

```bash
firebase hosting:channel:deploy production
```

Or configure in [Firebase Console > Hosting > Add custom domain](https://console.firebase.google.com/).

### 5.2 Update CORS Settings

After setting up a custom domain, update Cloud Run:

```bash
gcloud run services update doc2slides-api \
  --region=us-central1 \
  --update-env-vars="ALLOWED_ORIGINS=https://doc2slides.com,https://www.doc2slides.com,https://YOUR_PROJECT.web.app"
```

## Local Development with Docker

Test the full production setup locally:

```bash
# From project root
docker-compose up --build

# Backend: http://localhost:3000
# Frontend: http://localhost:8080
```

## CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - name: Test Backend
        run: |
          cd backend
          npm ci
          npm test
      - name: Test Frontend
        run: |
          cd frontend
          npm ci
          npm test

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}
      - uses: google-github-actions/setup-gcloud@v2
      - name: Configure Docker
        run: gcloud auth configure-docker us-central1-docker.pkg.dev
      - name: Build and Push
        run: |
          cd backend
          docker build -t us-central1-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/doc2slides/api:${{ github.sha }} .
          docker push us-central1-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/doc2slides/api:${{ github.sha }}
      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy doc2slides-api \
            --image=us-central1-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/doc2slides/api:${{ github.sha }} \
            --region=us-central1

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - name: Build
        run: |
          cd frontend
          npm ci
          npm run build
        env:
          VITE_GOOGLE_CLIENT_ID: ${{ secrets.GOOGLE_CLIENT_ID }}
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SA }}
          projectId: ${{ secrets.FIREBASE_PROJECT_ID }}
          channelId: live
          entryPoint: ./frontend
```

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `GCP_SA_KEY` | Service account key JSON for Cloud Run deployment |
| `GCP_PROJECT_ID` | Google Cloud project ID |
| `GOOGLE_CLIENT_ID` | OAuth client ID for frontend |
| `FIREBASE_SA` | Firebase service account key JSON |
| `FIREBASE_PROJECT_ID` | Firebase project ID |

### Create Service Account for CI/CD

```bash
# Create service account
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions"

# Grant permissions
PROJECT_ID=$(gcloud config get-value project)

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Create and download key
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions@$PROJECT_ID.iam.gserviceaccount.com

# Add the contents of github-actions-key.json as GCP_SA_KEY secret in GitHub
```

## Monitoring

### Cloud Run Metrics

View in [Cloud Console > Cloud Run > doc2slides-api > Metrics](https://console.cloud.google.com/run)

Key metrics:
- Request count
- Request latency
- Container instance count
- Memory utilization

### Set Up Alerts

```bash
# Create alert for high error rate
gcloud alpha monitoring policies create \
  --display-name="Doc2Slides High Error Rate" \
  --condition-filter='resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/request_count" AND metric.labels.response_code_class="5xx"' \
  --condition-threshold-value=10 \
  --condition-threshold-comparison=COMPARISON_GT \
  --notification-channels="YOUR_CHANNEL_ID"
```

## Cost Management

### Estimated Monthly Costs

| Service | Free Tier | Beyond Free Tier |
|---------|-----------|------------------|
| Cloud Run | 2M requests, 360K vCPU-sec | ~$0.00002400/vCPU-sec |
| Firebase Hosting | 10GB storage, 360MB/day | ~$0.026/GB |
| Secret Manager | 6 active versions | ~$0.06/version |
| Gemini API | Varies by model | See [pricing](https://ai.google.dev/pricing) |

### Budget Alert

```bash
gcloud billing budgets create \
  --billing-account=YOUR_BILLING_ACCOUNT \
  --display-name="Doc2Slides Budget" \
  --budget-amount=50USD \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90 \
  --threshold-rule=percent=100
```

## Troubleshooting

### Common Issues

**1. CORS Errors**
- Verify `ALLOWED_ORIGINS` includes your frontend domain
- Check that Firebase rewrites are configured correctly

**2. OAuth Errors**
- Ensure production domain is in authorized JavaScript origins
- Verify OAuth consent screen is published (not in testing mode)

**3. Cloud Run Cold Starts**
- Set minimum instances: `gcloud run services update doc2slides-api --min-instances=1`
- Increases cost but eliminates cold start latency

**4. Secret Access Denied**
- Verify IAM binding for Secret Manager access
- Check secret name matches in deployment command

### View Logs

```bash
# Cloud Run logs
gcloud run services logs read doc2slides-api --region=us-central1

# Real-time logs
gcloud run services logs tail doc2slides-api --region=us-central1
```
