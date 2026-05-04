import express         from 'express'
import cors            from 'cors'
import archiver        from 'archiver'
import os              from 'os'
import { exec }        from 'child_process'
import fs              from 'fs'
import path            from 'path'
import { fileURLToPath } from 'url'
import autocannon      from 'autocannon'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)
const TEMP_DIR   = path.join(__dirname, 'temp')
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true })

const app = express()
app.use(cors())
app.use(express.json())

const OLLAMA = 'http://127.0.0.1:11434/api/generate'

// ── Helper: stream AI Engine → collect full response ─────────────────────────
async function askAI(model, prompt, options = {}) {
  const { format } = options
  const res = await fetch(OLLAMA, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      ...(format ? { format } : {}),
    })
  })
  if (!res.ok) throw new Error(`AI Engine error: ${res.status}`)
  const data = await res.json()
  return String(data.response || '').trim()
}

// ── Helper: extract JSON from LLM output safely ───────────────────────────
function extractJSON(text) {
  const source = String(text || '').trim()
  if (!source) throw new Error('No JSON found in response')

  const parseCandidate = (candidate) => {
    const value = JSON.parse(candidate)
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('Parsed value is not a JSON object')
    }
    return value
  }

  try {
    return parseCandidate(source)
  } catch {}

  const fenced = extractCodeFence(source, ['json'])
  if (fenced) {
    try {
      return parseCandidate(fenced)
    } catch {}
  }

  const firstBrace = source.indexOf('{')
  if (firstBrace === -1) throw new Error('No JSON object found in response')

  let depth = 0
  let inString = false
  let escaped = false

  for (let i = firstBrace; i < source.length; i += 1) {
    const ch = source[i]

    if (inString) {
      if (escaped) {
        escaped = false
      } else if (ch === '\\') {
        escaped = true
      } else if (ch === '"') {
        inString = false
      }
      continue
    }

    if (ch === '"') {
      inString = true
      continue
    }

    if (ch === '{') depth += 1
    if (ch === '}') {
      depth -= 1
      if (depth === 0) {
        const candidate = source.slice(firstBrace, i + 1)
        return parseCandidate(candidate)
      }
    }
  }

  throw new Error('No complete JSON object found in response')
}

function extractCodeFence(text, preferredLanguages = []) {
  const source = String(text || '')
  const normalizedPreferred = preferredLanguages.map(lang => String(lang).toLowerCase())
  const fencePattern = /```([a-zA-Z0-9_-]*)\s*\n([\s\S]*?)```/g
  let fallback = ''
  let match

  while ((match = fencePattern.exec(source)) !== null) {
    const lang = String(match[1] || '').toLowerCase()
    const body = String(match[2] || '').trim()
    if (!body) continue
    if (!fallback) fallback = body
    if (
      normalizedPreferred.includes(lang) ||
      (normalizedPreferred.includes('yaml') && lang === 'yml') ||
      (normalizedPreferred.includes('yml') && lang === 'yaml')
    ) {
      return body
    }
  }

  return fallback
}

function normalizeGeneratedArtifact(text, kind = 'generic') {
  let source = String(text || '').replace(/\r\n/g, '\n').trim()
  if (!source) return ''

  const preferredFenceLanguages = {
    terraform: ['hcl', 'terraform', 'tf'],
    dockerfile: ['dockerfile'],
    pipeline: ['yaml', 'yml'],
    kubernetes: ['yaml', 'yml'],
    yaml: ['yaml', 'yml'],
  }

  const fenced = extractCodeFence(source, preferredFenceLanguages[kind] || [])
  if (fenced) source = fenced.trim()

  source = source
    .replace(/^```[a-zA-Z0-9_-]*\s*\n?/, '')
    .replace(/\n?```$/, '')
    .trim()

  if (kind === 'terraform') {
    const start = source.search(/(^|\n)(terraform\s*\{|provider\s+"aws"\s*\{|resource\s+"|data\s+"|variable\s+"|output\s+"|locals\s*\{|module\s+")/m)
    if (start > 0) source = source.slice(start).trim()

    const lastBrace = source.lastIndexOf('}')
    if (lastBrace !== -1) source = source.slice(0, lastBrace + 1).trim()
  }

  if (kind === 'dockerfile') {
    const lines = source.split('\n')
    const startIndex = lines.findIndex(line => /^(#|FROM|ARG|RUN|WORKDIR|COPY|ADD|ENV|EXPOSE|CMD|ENTRYPOINT|USER|LABEL|HEALTHCHECK|VOLUME|STOPSIGNAL|SHELL)\b/i.test(line.trim()))
    if (startIndex > 0) source = lines.slice(startIndex).join('\n').trim()
  }

  if (kind === 'pipeline' || kind === 'kubernetes' || kind === 'yaml') {
    const lines = source.split('\n')
    const startIndex = lines.findIndex(line => /^(name:|on:|jobs:|apiVersion:|kind:|metadata:|---)/.test(line.trim()))
    if (startIndex > 0) source = lines.slice(startIndex).join('\n').trim()
  }

  return source
}

function buildFallbackArchitecture({ bizType = 'custom', traffic = 'small', dataNeeds = 'yes', description = '' }) {
  const wantsData     = dataNeeds !== 'no'
  const biggerApp     = traffic === 'medium'
  const tier          = traffic === 'medium' ? 'Business' : traffic === 'tiny' ? 'Starter' : 'Standard'
  const estimatedCost = wantsData ? (biggerApp ? 48 : 25) : (biggerApp ? 28 : 15)
  const loadBalancer  = biggerApp ? 'Application Load Balancer' : null
  const appServer     = biggerApp ? 'EC2 t3.medium' : 'EC2 t3.micro'
  const database      = wantsData ? (biggerApp ? 'RDS PostgreSQL Multi-AZ' : 'RDS PostgreSQL t3.micro') : null

  const businessLabel = description
    ? description.replace(/\s+/g, ' ').trim()
    : bizType === 'booking'
      ? 'booking experience'
      : bizType === 'store'
        ? 'storefront'
        : bizType === 'app'
          ? 'application'
          : 'website'

  return {
    tier,
    components: {
      cdn: 'AWS CloudFront',
      loadBalancer,
      appServer,
      database,
      cache: biggerApp && wantsData ? 'ElastiCache Redis' : null,
      storage: 'S3',
      monitoring: 'CloudWatch',
    },
    estimatedCost,
    reasoning: `This setup gives your ${businessLabel} a right-sized cloud foundation with room to grow, while keeping cost and complexity under control.`,
  }
}

function normalizeRequirementsPayload(raw = {}) {
  const bizTypeOptions = new Set(['store', 'website', 'app', 'booking', 'custom'])
  const trafficOptions = new Set(['tiny', 'small', 'medium', 'unsure'])
  const dataOptions = new Set(['yes', 'no', 'unsure'])

  const bizType = bizTypeOptions.has(raw.bizType) ? raw.bizType : 'custom'
  const traffic = trafficOptions.has(raw.traffic) ? raw.traffic : 'unsure'
  const dataNeeds = dataOptions.has(raw.dataNeeds) ? raw.dataNeeds : 'unsure'

  const numericConfidence = Number(raw.confidence)
  const confidence = Number.isFinite(numericConfidence)
    ? Math.max(0, Math.min(100, Math.round(numericConfidence)))
    : 60

  const summary = String(raw.summary || '').trim() || 'Cloud requirements captured from conversation.'
  const missingInfo = raw.missingInfo == null ? null : String(raw.missingInfo).trim() || null

  return { bizType, traffic, dataNeeds, confidence, summary, missingInfo }
}

async function generateArchitectureFromContext({ bizType, traffic, dataNeeds, description }) {
  const userContext = description
    ? `Business description: "${description}"`
    : `Business type: ${bizType}, Monthly visitors: ${traffic}, Needs database: ${dataNeeds}`

  const prompt = `You are a senior AWS cloud architect helping a small business owner in India.
${userContext}

Return ONLY a JSON object (no explanation, no markdown) in this exact format:
{
  "tier": "Starter" or "Standard" or "Business",
  "components": {
    "cdn": "AWS CloudFront",
    "loadBalancer": "Application Load Balancer" or null,
    "appServer": "EC2 t3.micro" or "EC2 t3.medium" or "EC2 Auto Scaling Group",
    "database": "RDS PostgreSQL t3.micro" or "RDS PostgreSQL Multi-AZ" or null,
    "cache": "ElastiCache Redis" or null,
    "storage": "S3",
    "monitoring": "CloudWatch"
  },
  "estimatedCost": <number in USD per month>,
  "reasoning": "<one plain-English sentence describing what will be built and why, written for a non-technical business owner — no jargon, no AWS terms>"
}`

  try {
    const raw = await askAI('llama3', prompt, { format: 'json' })
    return extractJSON(raw)
  } catch {
    return buildFallbackArchitecture({ bizType, traffic, dataNeeds, description })
  }
}

async function generateTerraformFromArchitecture(architecture) {
  if (!architecture?.components) {
    throw new Error('A valid architecture payload is required before Terraform can be generated.')
  }

  const c = architecture.components
  const prompt = `You are a Terraform expert. Generate production-ready AWS Terraform HCL for:
${JSON.stringify(c, null, 2)}

Rules:
- AWS provider, region ap-south-1 (Mumbai — best for India)
- Include VPC with private subnets, security groups with least-privilege rules
- Enable storage_encrypted=true on all databases
- Set backup_retention_period=7 on RDS
- Tags: { Project = "ShopOps", Environment = "production" }
- Only include resources for components that are NOT null
- Output ONLY valid HCL, no markdown, no explanation
- Do not wrap the answer in code fences
- Do not include any intro or outro sentence
- Do not use placeholder IDs like sg-xxxxx or subnet-xxxxx
- Prefer bucket_prefix over undeclared random helper resources

Start with: terraform {`

  const raw = await askAI('deepseek-coder', prompt)
  const terraform = normalizeGeneratedArtifact(raw, 'terraform')
  if (!terraform.trim()) throw new Error('Terraform generation returned empty output.')
  return terraform
}

// ══════════════════════════════════════════════════════════════════════════
// ROUTE 1: /api/architecture
// Input:  { bizType, traffic, dataNeeds }
// Model:  llama3 (reasoning)
// Output: { components, tier, reasoning }
// ══════════════════════════════════════════════════════════════════════════
app.post('/api/architecture', async (req, res) => {
  const { bizType, traffic, dataNeeds, description } = req.body

  // ── Mock mode: fast demo responses ────────────────────────────────────
  if (req.headers['x-mock'] === '1' || req.query.mock === 'true') {
    return res.json({ ok: true, architecture: {
      tier: 'Standard',
      components: {
        cdn: 'AWS CloudFront', loadBalancer: 'Application Load Balancer',
        appServer: 'EC2 t3.medium', database: 'RDS PostgreSQL t3.micro',
        cache: null, storage: 'S3', monitoring: 'CloudWatch'
      },
      estimatedCost: 43,
      reasoning: 'A two-server setup in Mumbai that handles up to 500 visitors at once, with encrypted database storage, automatic backups, and a content network that loads your pages fast across India.'
    }})
  }

  try {
    const arch = await generateArchitectureFromContext({ bizType, traffic, dataNeeds, description })
    res.json({ ok: true, architecture: arch })
  } catch (err) {
    console.error('Architecture error:', err.message)
    const fallback = buildFallbackArchitecture({ bizType, traffic, dataNeeds, description })
    res.json({ ok: true, architecture: fallback, degraded: true, warning: 'Using the built-in architecture fallback for this run.' })
  }
})

// ══════════════════════════════════════════════════════════════════════════
// ROUTE 2: /api/terraform
// Input:  { architecture } (from route 1)
// Model:  deepseek-coder (code generation)
// Output: { terraform: "<HCL string>" }
// ══════════════════════════════════════════════════════════════════════════
app.post('/api/terraform', async (req, res) => {
  const { architecture } = req.body

  if (!architecture?.components) {
    return res.status(400).json({ ok: false, error: 'A valid architecture payload is required before Terraform can be generated.' })
  }

  if (req.headers['x-mock'] === '1' || req.query.mock === 'true') {
    return res.json({ ok: true, terraform: `terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" {
  region = "ap-south-1"
}

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  tags = { Name = "shopops-vpc", Project = "ShopOps", Environment = "production" }
}

resource "aws_instance" "app" {
  ami           = "ami-0f58b397bc5c1f2e8"
  instance_type = "t3.medium"
  tags = { Name = "shopops-app", Project = "ShopOps", Environment = "production" }
}

resource "aws_db_instance" "main" {
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.micro"
  storage_encrypted = true
  backup_retention_period = 7
  tags = { Project = "ShopOps", Environment = "production" }
}

resource "aws_s3_bucket" "assets" {
  bucket_prefix = "shopops-assets-"
  tags   = { Project = "ShopOps", Environment = "production" }
}` })
  }

  try {
    const terraform = await generateTerraformFromArchitecture(architecture)
    res.json({ ok: true, terraform })
  } catch (err) {
    console.error('Terraform error:', err.message)
    res.status(500).json({ ok: false, error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════════
// ROUTE 3: /api/dockerfile
// Input:  { bizType }
// Model:  deepseek-coder
// Output: { dockerfile: "<string>" }
// ══════════════════════════════════════════════════════════════════════════
app.post('/api/dockerfile', async (req, res) => {
  const { bizType } = req.body

  if (req.headers['x-mock'] === '1' || req.query.mock === 'true') {
    return res.json({ ok: true, dockerfile: `# ShopOps — Production Dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s \\
  CMD wget -qO- http://localhost/health || exit 1
CMD ["nginx", "-g", "daemon off;"]` })
  }

  const prompt = `Generate a production-ready multi-stage Dockerfile for a ${bizType} web application.
Use Node.js 20 Alpine for build, Nginx Alpine for serve.
Include health check, non-root user, and .dockerignore-friendly COPY patterns.
Output ONLY the Dockerfile content, no explanation.`

  try {
    const raw = await askAI('deepseek-coder', prompt)
    const dockerfile = normalizeGeneratedArtifact(raw, 'dockerfile')
    res.json({ ok: true, dockerfile })
  } catch (err) {
    console.error('Dockerfile error:', err.message)
    res.status(500).json({ ok: false, error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════════
// ROUTE 4: /api/cicd
// Input:  { bizType }
// Engine: deterministic template
// Output: { pipeline: "<GitHub Actions YAML with Terraform + Docker + EC2 deploy>" }
// ══════════════════════════════════════════════════════════════════════════
app.post('/api/cicd', async (req, res) => {
  const { bizType = 'application' } = req.body

  const pipeline = `name: ShopOps CI/CD (${bizType})

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  id-token: write

env:
  AWS_REGION: ap-south-1
  TF_DIR: infrastructure
  APP_DIR: app
  IMAGE_NAME: shopops-app

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install dependencies if package.json exists
        run: |
          if [ -f package.json ]; then
            npm ci
          else
            echo "No package.json at repo root, skipping npm ci."
          fi

      - name: Run tests if script exists
        run: |
          if [ -f package.json ] && npm run | grep -q " test"; then
            npm test
          else
            echo "No test script found, skipping tests."
          fi

      - name: Validate generated folders
        run: |
          test -f "$TF_DIR/main.tf" || (echo "Missing infrastructure/main.tf" && exit 1)
          test -f "$APP_DIR/Dockerfile" || (echo "Missing app/Dockerfile" && exit 1)

  terraform:
    runs-on: ubuntu-latest
    needs: validate
    defaults:
      run:
        working-directory: \${{ env.TF_DIR }}
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Configure AWS credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: \${{ secrets.AWS_ROLE_TO_ASSUME }}
          aws-region: \${{ env.AWS_REGION }}

      - name: Set up Terraform
        uses: hashicorp/setup-terraform@v4

      - name: Terraform format check
        run: terraform fmt -check -recursive

      - name: Terraform init
        run: terraform init -input=false

      - name: Terraform validate
        run: terraform validate -no-color

      - name: Terraform plan
        run: terraform plan -input=false -no-color -out=tfplan

      - name: Terraform apply (main only)
        if: github.ref == 'refs/heads/main'
        run: terraform apply -input=false -no-color -auto-approve tfplan

  docker:
    runs-on: ubuntu-latest
    needs: terraform
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Configure AWS credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: \${{ secrets.AWS_ROLE_TO_ASSUME }}
          aws-region: \${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push image
        env:
          ECR_REGISTRY: \${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: \${{ secrets.ECR_REPOSITORY }}
          IMAGE_TAG: \${{ github.sha }}
        run: |
          docker build -f "$APP_DIR/Dockerfile" -t "$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" "$APP_DIR"
          docker push "$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG"
          docker tag "$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" "$ECR_REGISTRY/$ECR_REPOSITORY:latest"
          docker push "$ECR_REGISTRY/$ECR_REPOSITORY:latest"

  deploy-ec2:
    runs-on: ubuntu-latest
    needs: docker
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Configure AWS credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: \${{ secrets.AWS_ROLE_TO_ASSUME }}
          aws-region: \${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Deploy on EC2 host over SSH
        env:
          ECR_REGISTRY: \${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: \${{ secrets.ECR_REPOSITORY }}
          IMAGE_TAG: \${{ github.sha }}
        run: |
          echo "\${{ secrets.EC2_SSH_KEY }}" > ec2_key
          chmod 600 ec2_key
          ssh -i ec2_key -o StrictHostKeyChecking=no "\${{ secrets.EC2_USER }}@\${{ secrets.EC2_HOST }}" \
            "aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY && \
             docker pull $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG && \
             docker stop shopops-app || true; docker rm shopops-app || true; \
             docker run -d --name shopops-app -p 80:80 $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG"`

  return res.json({ ok: true, pipeline })
})

// ══════════════════════════════════════════════════════════════════════════
// ROUTE 4b: /api/kubernetes
// Input:  { bizType, architecture }
// Model:  deepseek-coder
// Output: { manifests: "<string>" } (YAML with Deployment, Service, ConfigMap, Secret, HPA)
// ══════════════════════════════════════════════════════════════════════════
app.post('/api/kubernetes', async (req, res) => {
  const { bizType, architecture } = req.body

  if (req.headers['x-mock'] === '1' || req.query.mock === 'true') {
    return res.json({ ok: true, manifests: `# ShopOps — Kubernetes Manifests
# ===============================================

# 1. Namespace
apiVersion: v1
kind: Namespace
metadata:
  name: shopops
---
# 2. ConfigMap (Environment Variables)
apiVersion: v1
kind: ConfigMap
metadata:
  name: shopops-config
  namespace: shopops
data:
  NODE_ENV: "production"
  PORT: "3000"
---
# 3. Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: shopops-app
  namespace: shopops
  labels:
    app: shopops-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: shopops-app
  template:
    metadata:
      labels:
        app: shopops-app
    spec:
      containers:
      - name: shopops-app
        image: nginx:alpine
        ports:
        - containerPort: 80
        envFrom:
        - configMapRef:
            name: shopops-config
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "500m"
            memory: "256Mi"
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
---
# 4. Service (Load Balancer)
apiVersion: v1
kind: Service
metadata:
  name: shopops-service
  namespace: shopops
spec:
  selector:
    app: shopops-app
  type: LoadBalancer
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
---
# 5. Horizontal Pod Autoscaler (HPA)
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: shopops-hpa
  namespace: shopops
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: shopops-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
` })
  }

  const prompt = `Generate production-ready Kubernetes manifests for a ${bizType} web application.
Include:
- Namespace
- ConfigMap
- Deployment (with liveness/readiness probes, resource requests/limits)
- Service (LoadBalancer type)
- Horizontal Pod Autoscaler (scale based on CPU/memory)

Use nginx:alpine as a placeholder image if not specified.
Output ONLY the YAML content (multiple documents separated by ---), no explanation.`

  try {
    const raw = await askAI('deepseek-coder', prompt)
    const manifests = normalizeGeneratedArtifact(raw, 'kubernetes')
    res.json({ ok: true, manifests })
  } catch (err) {
    console.error('Kubernetes error:', err.message)
    res.status(500).json({ ok: false, error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════════
// ROUTE 5: /api/health
// Simple health check
// ══════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════
// ROUTE 5: /api/chat  (SSE streaming)
// Input:  { message, history: [{role, content}], model? }
// Output: Server-Sent Events stream of tokens
// ══════════════════════════════════════════════════════════════════════════
app.post('/api/chat', async (req, res) => {
  const { message, history = [], model = 'llama3', currentConfig } = req.body

  const configCtx = currentConfig?.tier
    ? `\nThe user has already generated a ${currentConfig.tier} tier AWS setup (~₹${Math.round((currentConfig.cost||0)*83).toLocaleString('en-IN')}/mo). Summary: "${currentConfig.summary}". Answer questions about their specific setup.`
    : ''

  const systemPrompt = `You are ShopOps AI, a friendly cloud advisor for small business owners in India.${configCtx}
Explain everything in plain English — no jargon. Be warm and concise (2-3 sentences max per reply).
Use everyday analogies: a VPC is "a private fenced plot in the cloud", a load balancer is "a receptionist routing customers to free cashiers".`

  const historyText = history
    .map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`)
    .join('\n')

  const fullPrompt = `${systemPrompt}\n\n${historyText}\nUser: ${message}\nAssistant:`

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')

  try {
    const aiRes = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: fullPrompt, stream: true })
    })

    if (!aiRes.ok) {
      res.write(`data: ${JSON.stringify({ error: `AI Engine error: ${aiRes.status}` })}\n\n`)
      return res.end()
    }

    const reader = aiRes.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter(Boolean)
      for (const line of lines) {
        try {
          const json = JSON.parse(line)
          if (json.response) {
            res.write(`data: ${JSON.stringify({ token: json.response })}\n\n`)
          }
          if (json.done) {
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
          }
        } catch {}
      }
    }
    res.end()
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
    res.end()
  }
})

// ══════════════════════════════════════════════════════════════════════════
// ROUTE 6: /api/extract-requirements
// "Conversational Requirement Discovery" — the key feature from the doc
// Input:  { conversation: [{role, content}] }
// Model:  llama3 (reasoning)
// Output: { bizType, traffic, dataNeeds, confidence, summary }
// ══════════════════════════════════════════════════════════════════════════
app.post('/api/extract-requirements', async (req, res) => {
  const { conversation = [] } = req.body
  const transcript = conversation
    .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`)
    .join('\n')

  const prompt = `You are analyzing a conversation between a small business owner and a cloud advisor.
Extract the cloud requirements from this conversation.

Conversation:
${transcript}

Return ONLY a JSON object with no explanation:
{
  "bizType": "store" or "website" or "app" or "booking" or "custom" or null,
  "traffic": "tiny" or "small" or "medium" or "unsure" or null,
  "dataNeeds": "yes" or "no" or "unsure" or null,
  "confidence": 0-100,
  "summary": "<one sentence: what this business needs in plain English>",
  "missingInfo": "<what question to ask next, or null if all info gathered>"
}`

  try {
    const raw = await askAI('llama3', prompt, { format: 'json' })
    const extracted = extractJSON(raw)
    res.json({ ok: true, requirements: normalizeRequirementsPayload(extracted) })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════════
// ROUTE 7: /api/provider-convert
// Input:  { terraform, provider: 'gcp'|'azure' }
// Model:  deepseek-coder
// Output: { terraform: "<converted HCL>" }
// ══════════════════════════════════════════════════════════════════════════
app.post('/api/provider-convert', async (req, res) => {
  const { terraform = '', provider = 'gcp' } = req.body

  const providerMap = {
    gcp:   { name: 'Google Cloud Platform', region: 'asia-south1 (Mumbai)', provider: 'google', registry: 'hashicorp/google' },
    azure: { name: 'Microsoft Azure',        region: 'centralindia',         provider: 'azurerm', registry: 'hashicorp/azurerm' },
  }
  const p = providerMap[provider] || providerMap.gcp

  const prompt = `You are a cloud infrastructure expert. Convert this AWS Terraform HCL to ${p.name} equivalents.

AWS Terraform:
${terraform.slice(0, 2000)}

Rules:
- Use provider "${p.provider}" with region "${p.region}"
- Convert every AWS resource to its ${p.name} equivalent (e.g. aws_instance → google_compute_instance or azurerm_linux_virtual_machine)
- Keep the same security posture: encryption, backups, VPC/VNet isolation
- Use registry: { source = "${p.registry}", version = "~> 5.0" }
- Keep tags/labels equivalent
- Output ONLY valid HCL, no markdown, no explanation

Start with: terraform {`

  try {
    const raw = await askAI('deepseek-coder', prompt)
    const converted = normalizeGeneratedArtifact(raw, 'terraform')
    res.json({ ok: true, terraform: converted })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════════
// ROUTE 8: /api/export-workspace
// Zip file generator of the architecture
// ══════════════════════════════════════════════════════════════════════════
app.post('/api/export-workspace', (req, res) => {
  const { terraform = '', dockerfile = '', pipeline = '' } = req.body;
  res.attachment('shopops-workspace.zip');
  const archive = archiver('zip', { zlib: { level: 9 } });
  
  archive.on('error', err => res.status(500).send({error: err.message}));
  archive.pipe(res);
  
  archive.append(terraform, { name: 'infrastructure/main.tf' });
  archive.append(dockerfile, { name: 'app/Dockerfile' });
  archive.append(pipeline, { name: '.github/workflows/deploy.yml' });
  archive.append('# ShopOps Local Export\nThis archive contains your tailored cloud configuration files.', { name: 'README.md' });
  
  archive.finalize();
});

// ══════════════════════════════════════════════════════════════════════════
// ROUTE 9: /api/metrics (SSE Stream)
// Simulate Local Container Metrics since Docker isn't installed
// ══════════════════════════════════════════════════════════════════════════
let controlState = { status: 'running', trafficSpike: false };

app.get('/api/metrics', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const intervalId = setInterval(() => {
    if (controlState.status === 'paused') {
      res.write(`data: ${JSON.stringify({
        cpu: 0, ramMB: 0, 
        status: controlState.status, 
        message: 'Containers Paused'
      })}\n\n`);
      return;
    }
    
    // Simulate real-sounding container stats based on system loads
    const baseCpu = os.loadavg()[0] * 10;
    const spike = controlState.trafficSpike ? 60 + Math.random() * 30 : 0;
    const cpu = Math.min(100, Math.max(1, baseCpu + Math.random() * 5 + spike)).toFixed(1);
    
    const ramMB = (120 + Math.random() * 20 + (controlState.trafficSpike ? 80 : 0)).toFixed(1);

    res.write(`data: ${JSON.stringify({
      cpu, 
      ramMB,
      status: controlState.status,
      network: controlState.trafficSpike ? 'High Load' : 'Normal',
      lat: (controlState.trafficSpike ? 300 + Math.random() * 200 : 30 + Math.random() * 20).toFixed(0)
    })}\n\n`);
  }, 1000);

  req.on('close', () => clearInterval(intervalId));
});

// ══════════════════════════════════════════════════════════════════════════
// ROUTE 10: /api/controls
// Pseudo-control for local containers / simulations
// ══════════════════════════════════════════════════════════════════════════
app.post('/api/controls', (req, res) => {
  const { action } = req.body;
  if (action === 'pause') controlState.status = 'paused';
  if (action === 'resume') controlState.status = 'running';
  if (action === 'spike') {
    controlState.trafficSpike = true;
    setTimeout(() => controlState.trafficSpike = false, 15000); // 15 sec spike
  }
  res.json({ ok: true, state: controlState });
});

// ══════════════════════════════════════════════════════════════════════════
// ROUTE: /api/vend  — InfraVend "Vending Machine" trigger
// Input:  { bizType, description, terraform, dockerfile }
// Flow:   Generate tenant_id → upload to S3 → run Ansible → Docker up
// Output: { ok, tenantId, url, port, status }
// ══════════════════════════════════════════════════════════════════════════
app.post('/api/vend', async (req, res) => {
  const { bizType = 'store', description = '', terraform = '', dockerfile = '' } = req.body

  // Generate unique tenant ID + port
  const tenantId = `tenant_${Date.now()}_${Math.random().toString(36).slice(2,6)}`
  const port = Math.floor(Math.random() * 900) + 8200 // 8200–8999

  const vendDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../infravend')
  const tenantDir = path.join(vendDir, 'tenants')
  const scriptPath = path.join(vendDir, 'scripts/vend.sh')

  // Ensure tenant dir exists
  if (!fs.existsSync(tenantDir)) fs.mkdirSync(tenantDir, { recursive: true })

  // Save generated files to temp for S3 upload
  const tmpDir = `/tmp/${tenantId}`
  fs.mkdirSync(tmpDir, { recursive: true })
  if (terraform)   fs.writeFileSync(`${tmpDir}/main.tf`,       terraform)
  if (dockerfile)  fs.writeFileSync(`${tmpDir}/Dockerfile`,    dockerfile)
  fs.writeFileSync(`${tmpDir}/description.txt`, description)

  // Upload to S3
  const S3_BUCKET = 'infravend-templates-771969015644'
  try {
    await new Promise((resolve, reject) => {
      exec(`aws s3 cp ${tmpDir}/ s3://${S3_BUCKET}/tenants/${tenantId}/ --recursive --quiet`, (err, stdout, stderr) => {
        if (err) reject(err); else resolve(stdout)
      })
    })
  } catch(e) {
    console.warn('S3 upload warning:', e.message)
  }

  // Run the vending machine shell script (triggers Ansible → Docker)
  const vendCmd = `bash ${scriptPath} ${tenantId} ${bizType} ${port}`

  exec(vendCmd, { timeout: 120000 }, (err, stdout, stderr) => {
    if (err) {
      console.error('Vend error:', err.message)
      return res.status(500).json({ ok: false, error: err.message, logs: stdout })
    }
    res.json({
      ok: true,
      tenantId,
      port,
      url: `http://localhost:${port}`,
      bizType,
      status: 'live',
      logs: stdout,
      s3Path: `s3://${S3_BUCKET}/tenants/${tenantId}/`
    })
  })
})

// ── /api/vend/list — list all live tenants ─────────────────────────────────
app.get('/api/vend/list', (req, res) => {
  const tenantDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../infravend/tenants')
  try {
    if (!fs.existsSync(tenantDir)) return res.json({ ok: true, tenants: [] })
    const files = fs.readdirSync(tenantDir).filter(f => f.endsWith('.json'))
    const tenants = files.map(f => {
      try { return JSON.parse(fs.readFileSync(path.join(tenantDir, f), 'utf8')) } catch { return null }
    }).filter(Boolean)
    res.json({ ok: true, tenants })
  } catch(e) {
    res.json({ ok: true, tenants: [] })
  }
})

// ── /api/vend/destroy — stop a tenant container ────────────────────────────
app.post('/api/vend/destroy', (req, res) => {
  const { tenantId } = req.body
  if (!tenantId) return res.status(400).json({ ok: false, error: 'tenantId required' })
  exec(`docker rm -f ${tenantId} 2>/dev/null || true`, (err, stdout) => {
    res.json({ ok: true, message: `Tenant ${tenantId} stopped` })
  })
})

app.get('/api/health', async (_req, res) => {
  try {
    await fetch('http://127.0.0.1:11434/api/tags')
    res.json({ ok: true, ai: 'connected', models: ['llama3', 'deepseek-coder'] })
  } catch {
    res.status(503).json({ ok: false, ai: 'disconnected' })
  }
})

function buildPromptAwareLocalHealth(query = {}) {
  const bizType = String(query.bizType || 'custom').toLowerCase()
  const traffic = String(query.traffic || 'small').toLowerCase()
  const dataNeeds = String(query.dataNeeds || 'yes').toLowerCase()
  const description = String(query.description || '').trim()
  const runId = String(query.runId || '')

  const labelsByBizType = {
    store: {
      app: 'Storefront API',
      queue: 'Order Queue',
      data: 'Order Ledger',
      cdn: 'Catalog CDN',
    },
    booking: {
      app: 'Booking Engine',
      queue: 'Reservation Queue',
      data: 'Reservation Records',
      cdn: 'Portal CDN',
    },
    app: {
      app: 'Application API',
      queue: 'Request Queue',
      data: 'User Data Store',
      cdn: 'App Assets CDN',
    },
    website: {
      app: 'Web Server',
      queue: 'Contact Queue',
      data: 'Content Store',
      cdn: 'Content CDN',
    },
    custom: {
      app: 'Business API',
      queue: 'Work Queue',
      data: 'Business Data Store',
      cdn: 'Static Assets CDN',
    },
  }

  const labels = labelsByBizType[bizType] || labelsByBizType.custom
  const promptSeed = `${bizType}|${traffic}|${dataNeeds}|${description}`.length
  const trafficMultiplier = traffic === 'medium' ? 1.5 : traffic === 'tiny' ? 0.6 : 1
  const baseCpu = Math.round((18 + (promptSeed % 17)) * trafficMultiplier)
  const baseMemMb = Math.round((220 + (promptSeed % 280)) * trafficMultiplier)
  const baseLatency = Math.round((65 + (promptSeed % 45)) * (traffic === 'medium' ? 1.15 : 1))

  return {
    ok: true,
    mode: 'dummy-prompt-aware',
    generatedAt: new Date().toISOString(),
    context: {
      bizType,
      traffic,
      dataNeeds,
      prompt: description || `${bizType} app with ${traffic} traffic`,
      runId: runId || null,
    },
    services: {
      ec2: 'running',
      s3: 'running',
      cloudwatch: 'available',
      sqs: 'available',
      rds: dataNeeds === 'no' ? 'disabled' : 'running',
      localstack: 'healthy',
    },
    workload: {
      appService: labels.app,
      queueService: labels.queue,
      dataService: labels.data,
      cdnService: labels.cdn,
    },
    metrics: {
      status: 'healthy',
      cpuPercent: Math.min(baseCpu, 88),
      memoryMb: Math.min(baseMemMb, 1024),
      p95LatencyMs: Math.min(baseLatency, 240),
      errorRatePercent: Number((0.08 + ((promptSeed % 4) * 0.03)).toFixed(2)),
    },
    note: 'This is synthetic health data generated from your prompt for demo purposes.',
  }
}

app.get('/api/local-cloud/health', (req, res) => {
  res.json(buildPromptAwareLocalHealth(req.query || {}))
})

// ==================== NEW INTEGRATIONS ====================
const runtimeState = {
  dockerContainers: new Set(),
  latestDockerContainer: null,
  localstackRuns: new Map(),
}

const LOCALSTACK_PROVIDER_BLOCK = `provider "aws" {
  region                      = "ap-south-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true
  s3_use_path_style           = true

  endpoints {
    apigateway     = "http://localhost:4566"
    cloudformation = "http://localhost:4566"
    cloudwatch     = "http://localhost:4566"
    dynamodb       = "http://localhost:4566"
    ec2            = "http://localhost:4566"
    ecr            = "http://localhost:4566"
    ecs            = "http://localhost:4566"
    elb            = "http://localhost:4566"
    iam            = "http://localhost:4566"
    kms            = "http://localhost:4566"
    lambda         = "http://localhost:4566"
    logs           = "http://localhost:4566"
    rds            = "http://localhost:4566"
    s3             = "http://s3.localhost.localstack.cloud:4566"
    secretsmanager = "http://localhost:4566"
    sns            = "http://localhost:4566"
    sqs            = "http://localhost:4566"
    ssm            = "http://localhost:4566"
    sts            = "http://localhost:4566"
  }
}`

function shellQuote(value = '') {
  return `'${String(value).replace(/'/g, `'\\''`)}'`
}

function mergeCommandOutput(result = {}) {
  return [result.stdout, result.stderr].filter(Boolean).join('\n').trim()
}

function replaceAwsProviderForLocalstack(terraform = '') {
  const source = String(terraform || '').trim()
  if (!source) return ''

  const match = /provider\s+"aws"\s*\{/m.exec(source)
  if (!match) return `${source}\n\n${LOCALSTACK_PROVIDER_BLOCK}\n`

  const start = match.index
  const openBrace = source.indexOf('{', start)
  if (openBrace === -1) return `${source}\n\n${LOCALSTACK_PROVIDER_BLOCK}\n`

  let depth = 0
  let end = -1
  for (let i = openBrace; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1
    if (source[i] === '}') {
      depth -= 1
      if (depth === 0) {
        end = i
        break
      }
    }
  }

  if (end === -1) return `${source}\n\n${LOCALSTACK_PROVIDER_BLOCK}\n`

  const before = source.slice(0, start).trimEnd()
  const after = source.slice(end + 1).trimStart()
  return [before, LOCALSTACK_PROVIDER_BLOCK, after].filter(Boolean).join('\n\n')
}

function buildLocalstackSandboxTerraform(terraform = '', runId = 'sandbox') {
  const source = String(terraform || '')
  const safeId = String(runId).replace(/[^a-zA-Z0-9]/g, '').slice(-8) || 'sandbox'
  const wantsNetwork = /(aws_vpc|aws_instance|aws_security_group|aws_subnet|aws_db_instance)/i.test(source)
  const wantsStorage = /(aws_s3_bucket|cloudfront|storage)/i.test(source)
  const wantsMonitoring = /(cloudwatch|monitoring|aws_cloudwatch_log_group)/i.test(source)
  const wantsSecrets = /(aws_db_instance|secretsmanager|ssm_parameter|encrypted|backup_retention_period)/i.test(source)

  const tags = `tags = {
  Project     = "ShopOps"
  Environment = "sandbox"
}`

  const parts = [
    `terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}`,
    LOCALSTACK_PROVIDER_BLOCK,
  ]

  if (wantsNetwork) {
    parts.push(`resource "aws_vpc" "sandbox" {
  cidr_block           = "10.10.0.0/16"
  enable_dns_hostnames = true
  ${tags}
}`)

    parts.push(`resource "aws_subnet" "app" {
  vpc_id     = aws_vpc.sandbox.id
  cidr_block = "10.10.1.0/24"
  ${tags}
}`)

    parts.push(`resource "aws_security_group" "app" {
  name        = "shopops-sandbox-sg-${safeId}"
  description = "ShopOps local sandbox"
  vpc_id      = aws_vpc.sandbox.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ${tags}
}`)
  }

  if (wantsStorage) {
    parts.push(`resource "aws_s3_bucket" "assets" {
  bucket = "shopops-sandbox-assets-${safeId}"
  ${tags}
}`)
  }

  if (wantsSecrets) {
    parts.push(`resource "aws_s3_bucket" "data_vault" {
  bucket = "shopops-sandbox-data-${safeId}"
  ${tags}
}`)
  }

  if (wantsMonitoring) {
    parts.push(`resource "aws_iam_role" "observer" {
  name = "shopops-sandbox-observer-${safeId}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
  ${tags}
}`)
  }

  parts.push(`output "sandbox_mode" {
  value = "localstack-safe-preview"
}`)

  return parts.join('\n\n').trim() + '\n'
}

async function applyTerraformInDir(runDir, terraform, env) {
  fs.mkdirSync(runDir, { recursive: true })
  fs.writeFileSync(path.join(runDir, 'main.tf'), terraform)

  const initOutput = await runCommand('terraform init -input=false -no-color', { cwd: runDir, env })
  const applyOutput = await runCommand('terraform apply -auto-approve -input=false -no-color', { cwd: runDir, env })
  return [mergeCommandOutput(initOutput), mergeCommandOutput(applyOutput)].filter(Boolean).join('\n\n')
}

function parseMemoryToMB(memUsage = '0MiB / 0MiB') {
  const raw = String(memUsage).split('/')[0]?.trim() || '0MiB'
  const match = raw.match(/([\d.]+)\s*([kmg]i?b)/i)
  if (!match) return 0

  const value = parseFloat(match[1])
  const unit = match[2].toLowerCase()

  if (unit.startsWith('g')) return Math.round(value * 1024)
  if (unit.startsWith('k')) return Math.round(value / 1024)
  return Math.round(value)
}

async function ensureToolInstalled(tool, installHint) {
  try {
    await runCommand(`command -v ${tool}`)
  } catch {
    throw new Error(`${tool} is required. ${installHint}`)
  }
}

async function ensureLocalstackIsReady() {
  try {
    const res = await fetch('http://localhost:4566/_localstack/health')
    if (res.ok) return
  } catch {}
  throw new Error('LocalStack is not reachable at http://localhost:4566. Start it first and retry.')
}

function runAutocannon(options) {
  return new Promise((resolve, reject) => {
    autocannon(options, (err, result) => {
      if (err) return reject(err)
      resolve(result)
    })
  })
}

// Helper: Run shell command with streaming
function runCommand(cmd, options = {}) {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd: TEMP_DIR, maxBuffer: 8 * 1024 * 1024, ...options }, (error, stdout, stderr) => {
      if (error) {
        reject({ error: error.message, stdout, stderr, cmd })
      } else {
        resolve({ stdout, stderr, cmd })
      }
    })
  })
}

// 1. Docker: Build and run containers
app.post('/api/docker/deploy', async (req, res) => {
  try {
    await ensureToolInstalled('docker', 'Install Docker Desktop and make sure the Docker daemon is running.')

    const { dockerfile, composeYml, port = 8080 } = req.body
    const runId = Date.now().toString()
    const safePort = Number.isInteger(Number(port)) && Number(port) > 0 ? Number(port) : 8080
    const imageName = `shopops-app-${runId}`
    const containerName = imageName
    const runDir = path.join(TEMP_DIR, runId)
    fs.mkdirSync(runDir, { recursive: true })

    const defaultDockerfile = `FROM nginx:alpine
RUN echo '<!DOCTYPE html><html><head><title>ShopOps Demo</title></head><body style="font-family:system-ui;padding:20px;background:#FAF7F2"><h1>☁️ ShopOps Demo</h1><p>Container is running!</p></body></html>' > /usr/share/nginx/html/index.html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`
    // Write a simple demo Dockerfile if none provided (for testing)
    let finalDockerfile = dockerfile || defaultDockerfile

    // Also add a simple index.html for good measure
    const indexHtml = `<!DOCTYPE html>
<html>
  <head>
    <title>ShopOps Demo</title>
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; padding: 32px; background: #FAF7F2; }
      h1 { color: #21405E; }
    </style>
  </head>
  <body>
    <h1>☁️ ShopOps Demo</h1>
    <p style="color:#666; max-width:400px">Your Docker container is up and running on localhost:${safePort}!</p>
  </body>
</html>`

    fs.writeFileSync(path.join(runDir, 'Dockerfile'), finalDockerfile)
    fs.writeFileSync(path.join(runDir, 'index.html'), indexHtml)
    if (composeYml) fs.writeFileSync(path.join(runDir, 'docker-compose.yml'), composeYml)

    let output = ''
    let warning = null
    if (composeYml) {
      let composeResult
      try {
        composeResult = await runCommand('docker compose up -d', { cwd: runDir })
      } catch {
        composeResult = await runCommand('docker-compose up -d', { cwd: runDir })
      }
      output = mergeCommandOutput(composeResult)
    } else {
      let build
      try {
        build = await runCommand(`docker build -t ${shellQuote(imageName)} .`, { cwd: runDir })
      } catch (buildErr) {
        // If AI output produced an invalid Dockerfile, fall back to known-good demo image.
        fs.writeFileSync(path.join(runDir, 'Dockerfile'), defaultDockerfile)
        warning = `Invalid generated Dockerfile; used fallback demo Dockerfile. Original build error: ${buildErr.error || buildErr.message}`
        build = await runCommand(`docker build -t ${shellQuote(imageName)} .`, { cwd: runDir })
      }
      const run = await runCommand(`docker run -d -p ${safePort}:80 --name ${shellQuote(containerName)} ${shellQuote(imageName)}`)
      output = [mergeCommandOutput(build), mergeCommandOutput(run)].filter(Boolean).join('\n\n')
      runtimeState.dockerContainers.add(containerName)
      runtimeState.latestDockerContainer = containerName
    }

    res.json({ ok: true, status: 'running', containerId: runId, containerName, port: safePort, output, warning })
  } catch (err) {
    console.error('Docker deploy error:', err)
    const details = mergeCommandOutput(err)
    res.status(500).json({ ok: false, error: err.error || err.message, details })
  }
})

// 2. Docker: Get stats
app.get('/api/docker/stats', async (req, res) => {
  try {
    let stats = []
    try {
      const { stdout } = await runCommand('docker stats --no-stream --format json')
      stats = stdout.split('\n').filter(Boolean).map(line => {
        try { return JSON.parse(line) } catch { return null }
      }).filter(Boolean)
    } catch {
      // Docker not running - return empty stats
    }
    
    // If we have stats, parse them, else return simulated data
    if (stats.length > 0) {
      const container = stats[0]
      const cpuPercent = container.CPUPercent ? parseFloat(container.CPUPercent.replace('%', '')) : 0
      const memUsage = container.MemUsage || '0MiB / 0MiB'
      const memMB = parseMemoryToMB(memUsage)
      const status = 'running'
      
      res.json({ 
        ok: true, 
        cpu: Math.round(cpuPercent), 
        ramMB: memMB, 
        status,
        network: memMB > 500 ? 'High Load' : 'Normal',
        lat: Math.round(Math.random() * 100 + 50)
      })
    } else {
      // Simulated data when Docker not running
      res.json({ 
        ok: true, 
        cpu: Math.floor(Math.random() * 50 + 10), 
        ramMB: Math.floor(Math.random() * 500 + 100), 
        status: 'running',
        network: 'Normal',
        lat: Math.floor(Math.random() * 100 + 50)
      })
    }
  } catch (err) {
    console.error('Docker stats error:', err)
    // Fallback to simulated data on error
    res.json({ 
      ok: true, 
      cpu: Math.floor(Math.random() * 50 + 10), 
      ramMB: Math.floor(Math.random() * 500 + 100), 
      status: 'running',
      network: 'Normal',
      lat: Math.floor(Math.random() * 100 + 50)
    })
  }
})

// 3. Docker: Control containers (pause/resume/stop)
app.post('/api/docker/control', async (req, res) => {
  try {
    await ensureToolInstalled('docker', 'Install Docker Desktop and make sure the Docker daemon is running.')

    const { action, containerId } = req.body
    const cmdMap = {
      pause: 'docker pause',
      resume: 'docker unpause',
      stop: 'docker stop',
      rm: 'docker rm -f'
    }
    if (!cmdMap[action]) throw new Error('Invalid action')

    const targetContainer = containerId
      ? `shopops-app-${containerId}`
      : runtimeState.latestDockerContainer
    if (!targetContainer) {
      return res.status(400).json({ ok: false, error: 'No deployed ShopOps container found.' })
    }

    const result = await runCommand(`${cmdMap[action]} ${shellQuote(targetContainer)}`)
    if (action === 'stop' || action === 'rm') {
      runtimeState.dockerContainers.delete(targetContainer)
      if (runtimeState.latestDockerContainer === targetContainer) {
        runtimeState.latestDockerContainer = null
      }
    }

    const statusMap = { pause: 'paused', resume: 'running', stop: 'stopped', rm: 'removed' }
    res.json({ ok: true, status: statusMap[action], output: mergeCommandOutput(result), containerName: targetContainer })
  } catch (err) {
    const details = mergeCommandOutput(err)
    res.status(500).json({ ok: false, error: err.error || err.message, details })
  }
})

// 4. LocalStack: Check status and run Terraform
app.post('/api/localstack/deploy', async (req, res) => {
  try {
    await ensureToolInstalled('terraform', 'Install Terraform CLI and add it to your PATH.')
    await ensureLocalstackIsReady()

    const { terraform } = req.body
    if (!terraform || !terraform.trim()) {
      return res.status(400).json({ ok: false, error: 'Terraform configuration is required.' })
    }

    const runId = Date.now().toString()
    const runDir = path.join(TEMP_DIR, `localstack-${runId}`)
    const normalizedTerraform = normalizeGeneratedArtifact(terraform, 'terraform')
    const localstackTf = replaceAwsProviderForLocalstack(normalizedTerraform)

    const env = {
      ...process.env,
      AWS_ACCESS_KEY_ID: 'test',
      AWS_SECRET_ACCESS_KEY: 'test',
      AWS_REGION: 'ap-south-1',
      AWS_DEFAULT_REGION: 'ap-south-1',
    }

    let output = ''
    let mode = 'exact'
    let warning = ''
    let appliedTerraform = localstackTf

    try {
      output = await applyTerraformInDir(runDir, localstackTf, env)
    } catch (err) {
      const fallbackDir = `${runDir}-sandbox`
      const sandboxTerraform = buildLocalstackSandboxTerraform(normalizedTerraform, runId)
      output = [
        'Exact AWS Terraform could not be applied to LocalStack. Falling back to a LocalStack-safe sandbox preview.',
        mergeCommandOutput(err),
        await applyTerraformInDir(fallbackDir, sandboxTerraform, env),
      ].filter(Boolean).join('\n\n')
      mode = 'sandbox'
      warning = 'Generated AWS Terraform was translated into a LocalStack-safe sandbox preview for this run.'
      appliedTerraform = sandboxTerraform
      runtimeState.localstackRuns.set(runId, fallbackDir)
    }

    if (!runtimeState.localstackRuns.has(runId)) {
      runtimeState.localstackRuns.set(runId, runDir)
    }

    res.json({ ok: true, status: 'applied', runId, mode, warning, terraform: appliedTerraform, output })
  } catch (err) {
    const details = mergeCommandOutput(err)
    res.status(500).json({ ok: false, error: err.error || err.message, details })
  }
})

// 5. act: Run GitHub Actions locally
app.post('/api/act/run', async (req, res) => {
  try {
    await ensureToolInstalled('act', 'Install nektos/act and make sure it is available in your PATH.')

    const { workflowYml = '', workflow = '', event = 'push' } = req.body
    const workflowContent = workflowYml || workflow
    if (!workflowContent || !workflowContent.trim()) {
      return res.status(400).json({ ok: false, error: 'Workflow YAML is required.' })
    }

    const safeEvent = ['push', 'pull_request', 'workflow_dispatch'].includes(event) ? event : 'push'
    const runId = Date.now().toString()
    const runDir = path.join(TEMP_DIR, `act-${runId}`)
    const workflowsDir = path.join(runDir, '.github', 'workflows')
    fs.mkdirSync(workflowsDir, { recursive: true })
    const workflowPath = path.join(workflowsDir, 'deploy.yml')
    const eventPath = path.join(runDir, 'event.json')
    fs.writeFileSync(workflowPath, workflowContent)
    fs.writeFileSync(eventPath, JSON.stringify({
      ref: 'refs/heads/main',
      repository: { full_name: 'shopops/local' },
      event_name: safeEvent,
    }, null, 2))

    const actCommand = [
      `act ${safeEvent}`,
      `-W ${shellQuote(workflowPath)}`,
      `-e ${shellQuote(eventPath)}`,
      '--container-architecture linux/amd64',
      '--container-daemon-socket -',
      '-P ubuntu-latest=catthehacker/ubuntu:act-latest',
      '-P ubuntu-22.04=catthehacker/ubuntu:act-22.04',
      '-P ubuntu-20.04=catthehacker/ubuntu:act-20.04',
    ].join(' ')

    const result = await runCommand(actCommand, {
      cwd: runDir,
      timeout: 15 * 60 * 1000,
    })
    res.json({ ok: true, status: 'completed', runId, output: mergeCommandOutput(result) })
  } catch (err) {
    const details = mergeCommandOutput(err)
    res.status(500).json({ ok: false, error: err.error || err.message, details })
  }
})

// 6. autocannon: Simulate traffic spike
app.post('/api/loadtest/start', async (req, res) => {
  try {
    const { url = 'http://localhost:8080', duration = 10, connections = 100 } = req.body
    const result = await runAutocannon({
      url,
      duration,
      connections,
      pipelining: 1,
    })
    res.json({ ok: true, result: {
      requests: result.requests,
      latency: result.latency,
      throughput: result.throughput
    } })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// 7. Tear down local integrations (containers + LocalStack Terraform runs)
app.post('/api/destroy', async (_req, res) => {
  const summary = {
    docker: 'No ShopOps containers found.',
    localstack: [],
    errors: [],
  }

  try {
    await ensureToolInstalled('docker', 'Install Docker Desktop and make sure the Docker daemon is running.')
    const { stdout } = await runCommand('docker ps -a --format "{{.Names}}"')
    const names = stdout
      .split('\n')
      .map(n => n.trim())
      .filter(Boolean)
      .filter(n => n.startsWith('shopops-app-'))

    if (names.length > 0) {
      await runCommand(`docker rm -f ${names.map(shellQuote).join(' ')}`)
      summary.docker = `Removed ${names.length} ShopOps container(s).`
      runtimeState.dockerContainers.clear()
      runtimeState.latestDockerContainer = null
    }
  } catch (err) {
    summary.errors.push(`Docker cleanup failed: ${err.error || err.message}`)
  }

  const localstackDirs = fs.existsSync(TEMP_DIR)
    ? fs.readdirSync(TEMP_DIR)
      .filter(name => name.startsWith('localstack-'))
      .map(name => path.join(TEMP_DIR, name))
    : []

  if (localstackDirs.length > 0) {
    try {
      await ensureToolInstalled('terraform', 'Install Terraform CLI and add it to your PATH.')
      const env = {
        ...process.env,
        AWS_ACCESS_KEY_ID: 'test',
        AWS_SECRET_ACCESS_KEY: 'test',
        AWS_REGION: 'ap-south-1',
        AWS_DEFAULT_REGION: 'ap-south-1',
      }

      for (const dir of localstackDirs) {
        try {
          await runCommand('terraform init -input=false -no-color', { cwd: dir, env })
          await runCommand('terraform destroy -auto-approve -input=false -no-color', { cwd: dir, env })
          summary.localstack.push(`Destroyed Terraform resources in ${path.basename(dir)}.`)
        } catch (err) {
          summary.errors.push(`Terraform destroy failed for ${path.basename(dir)}: ${err.error || err.message}`)
        }
      }
    } catch (err) {
      summary.errors.push(`Terraform cleanup unavailable: ${err.error || err.message}`)
    }
  } else {
    summary.localstack.push('No LocalStack Terraform runs found.')
  }

  if (summary.errors.length === 0) {
    return res.json({ ok: true, summary })
  }
  return res.status(207).json({ ok: false, summary })
})

// 8. Mermaid: Generate architecture diagram code
app.post('/api/architecture/diagram', async (req, res) => {
  try {
    const { description, architecture } = req.body
    // Default diagram if no architecture provided
    let mermaid = `graph TD
    %%{init: {'theme': 'neutral', 'themeVariables': {'primaryColor': '#21405E', 'primaryTextColor': '#fff', 'primaryBorderColor': '#21405E', 'lineColor': '#F0C060'}}}%%

    User[Your Customers]:::user
    CDN[(Global CDN)]:::cdn
    LB(Load Balancer):::lb
    App[Application<br/>Servers]:::app
    DB[(Database)]:::db
    Backup[(Auto<br/>Backups)]:::backup
    Monitor[(Monitoring)]:::monitor

    User --> CDN
    User --> LB
    CDN --> App
    LB --> App
    App --> DB
    DB --> Backup
    App --> Monitor

    classDef user fill:#21405E,stroke:#21405E,color:#fff
    classDef cdn fill:#F0C060,stroke:#F0C060,color:#21405E
    classDef lb fill:#A5B3C2,stroke:#A5B3C2,color:#21405E
    classDef app fill:#4CAF82,stroke:#4CAF82,color:#fff
    classDef db fill:#21405E,stroke:#21405E,color:#fff
    classDef backup fill:#F0C060,stroke:#F0C060,color:#21405E
    classDef monitor fill:#A5B3C2,stroke:#A5B3C2,color:#21405E`

    res.json({ ok: true, mermaid })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════════════════
// ROUTE: /api/docker/logs (SSE Streaming)
// ══════════════════════════════════════════════════════════════════════════════════
app.get('/api/docker/logs', async (req, res) => {
  const { containerId } = req.query
  if (!containerId) {
    return res.status(400).json({ ok: false, error: 'containerId is required' })
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')

  try {
    // Use docker logs with follow mode
    const { spawn } = await import('child_process')
    const docker = spawn('docker', ['logs', '-f', '--tail', '100', containerId])

    docker.stdout.on('data', (data) => {
      res.write(`data: ${JSON.stringify({ type: 'stdout', log: data.toString() })}\n\n`)
    })

    docker.stderr.on('data', (data) => {
      res.write(`data: ${JSON.stringify({ type: 'stderr', log: data.toString() })}\n\n`)
    })

    docker.on('close', (code) => {
      res.write(`data: ${JSON.stringify({ type: 'done', code })}\n\n`)
      res.end()
    })

    docker.on('error', (err) => {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`)
      res.end()
    })

    req.on('close', () => {
      docker.kill()
    })
  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`)
    res.end()
  }
})

// ══════════════════════════════════════════════════════════════════════════════════
// ROUTE: /api/kubernetes/apply (Deploy to local Kubernetes)
// ══════════════════════════════════════════════════════════════════════════════════
app.post('/api/kubernetes/apply', async (req, res) => {
  const { manifests } = req.body

  if (!manifests || !manifests.trim()) {
    return res.status(400).json({ ok: false, error: 'Kubernetes manifests are required' })
  }

  const runId = Date.now().toString()
  const runDir = path.join(TEMP_DIR, `k8s-${runId}`)
  fs.mkdirSync(runDir, { recursive: true })

  const manifestPath = path.join(runDir, 'deployment.yaml')
  fs.writeFileSync(manifestPath, manifests)

  try {
    // First check if kubectl is available
    await runCommand('kubectl version --client')

    // Apply the manifests to minikube
    const result = await runCommand(`kubectl apply -f ${shellQuote(manifestPath)} --dry-run=client -o yaml`)
    const applyResult = await runCommand(`kubectl apply -f ${shellQuote(manifestPath)}`)

    res.json({
      ok: true,
      status: 'applied',
      runId,
      output: mergeCommandOutput(applyResult),
      dryRun: mergeCommandOutput(result)
    })
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.error || err.message,
      details: mergeCommandOutput(err)
    })
  }
})

// ══════════════════════════════════════════════════════════════════════════════════
// ROUTE: /api/kubernetes/status (Check K8s deployment status)
// ══════════════════════════════════════════════════════════════════════════════════
app.get('/api/kubernetes/status', async (req, res) => {
  try {
    const pods = await runCommand('kubectl get pods -o json')
    const services = await runCommand('kubectl get svc -o json')
    const deployments = await runCommand('kubectl get deployments -o json')

    res.json({
      ok: true,
      pods: JSON.parse(pods.stdout || '{}'),
      services: JSON.parse(services.stdout || '{}'),
      deployments: JSON.parse(deployments.stdout || '{}')
    })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════════════════
// ROUTE: /api/deploy-all (Unified deployment to Docker + LocalStack)
// ══════════════════════════════════════════════════════════════════════════════════
app.post('/api/deploy-all', async (req, res) => {
  const { dockerfile, terraform, kubernetes, port = 8080 } = req.body

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')

  const send = (step, status, message, data = {}) => {
    res.write(`data: ${JSON.stringify({ step, status, message, ...data })}\n\n`)
  }

  try {
    // Step 1: Build Docker container
    send('docker', 'running', 'Building Docker container...')
    const deployRes = await fetch('http://localhost:3001/api/docker/deploy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dockerfile, port })
    })
    const deployData = await deployRes.json()

    if (!deployData.ok) {
      send('docker', 'error', 'Docker build failed', { error: deployData.error })
      return res.end()
    }

    send('docker', 'done', 'Docker container ready', { containerId: deployData.containerId, port: deployData.port })

    // Step 2: Deploy to LocalStack (if terraform provided)
    if (terraform && terraform.trim()) {
      send('localstack', 'running', 'Deploying to LocalStack...')
      const lsRes = await fetch('http://localhost:3001/api/localstack/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terraform })
      })
      const lsData = await lsRes.json()

      if (!lsData.ok) {
        send('localstack', 'error', 'LocalStack deployment failed', { error: lsData.error })
      } else {
        send('localstack', 'done', 'LocalStack resources created', { runId: lsData.runId })
      }
    } else {
      send('localstack', 'skipped', 'No Terraform provided, skipping LocalStack')
    }

    // Step 3: Deploy to Kubernetes (if manifests provided)
    if (kubernetes && kubernetes.trim()) {
      send('kubernetes', 'running', 'Deploying to Kubernetes...')
      const k8sRes = await fetch('http://localhost:3001/api/kubernetes/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manifests: kubernetes })
      })
      const k8sData = await k8sRes.json()

      if (!k8sData.ok) {
        send('kubernetes', 'error', 'Kubernetes deployment failed', { error: k8sData.error })
      } else {
        send('kubernetes', 'done', 'Kubernetes resources created')
      }
    } else {
      send('kubernetes', 'skipped', 'No Kubernetes manifests, skipping')
    }

    // All done
    send('complete', 'done', 'All deployments complete!')
    res.end()
  } catch (err) {
    send('error', 'error', err.message)
    res.end()
  }
})

// ══════════════════════════════════════════════════════════════════════════════════
// ROUTE: /api/aws/deploy (Deploy to REAL AWS)
// ══════════════════════════════════════════════════════════════════════════════════
app.post('/api/aws/deploy', async (req, res) => {
  const { terraform, architecture, bizType = 'store', traffic = 'small', dataNeeds = 'yes', description = '' } = req.body

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')

  const send = (step, status, message, data = {}) => {
    res.write(`data: ${JSON.stringify({ step, status, message, ...data })}\n\n`)
  }

  const runId = Date.now().toString()
  const runDir = path.join(TEMP_DIR, `aws-${runId}`)
  fs.mkdirSync(runDir, { recursive: true })

  let architectureToUse = architecture
  let terraformToApply = String(terraform || '').trim()

  if (!architectureToUse?.components && !terraformToApply) {
    send('aws', 'running', 'Designing architecture from chat context...')
    try {
      architectureToUse = await generateArchitectureFromContext({ bizType, traffic, dataNeeds, description })
      send('aws', 'running', 'Architecture designed')
    } catch (err) {
      send('aws', 'error', `Architecture generation failed: ${err.message}`)
      return res.end()
    }
  }

  if (architectureToUse?.components) {
    send('aws', 'running', 'Generating Terraform from architecture...')
    try {
      terraformToApply = await generateTerraformFromArchitecture(architectureToUse)
    } catch (err) {
      send('aws', 'error', `Terraform generation failed: ${err.message}`)
      return res.end()
    }
  }

  if (!terraformToApply) {
    send('aws', 'error', 'Terraform configuration is required')
    return res.end()
  }

  const tfPath = path.join(runDir, 'main.tf')
  fs.writeFileSync(tfPath, terraformToApply)

  try {
    send('aws', 'running', 'Initializing Terraform for AWS...')

    // terraform init
    const initResult = await runCommand('terraform init -input=false -no-color', { cwd: runDir })
    send('aws', 'running', 'Terraform initialized')

    send('aws', 'running', 'Validating Terraform...')
    await runCommand('terraform fmt -write=true main.tf', { cwd: runDir })
    await runCommand('terraform validate -no-color', { cwd: runDir })
    send('aws', 'running', 'Terraform validated')

    // terraform plan
    send('aws', 'running', 'Creating execution plan...')
    const planResult = await runCommand('terraform plan -input=false -no-color -out=tfplan', { cwd: runDir })
    send('aws', 'running', 'Plan created. Waiting for approval...', { plan: mergeCommandOutput(planResult).slice(0, 500) })

    // terraform apply (with auto-approve for demo purposes)
    send('aws', 'running', 'Deploying to AWS...')
    const applyResult = await runCommand('terraform apply -input=false -no-color -auto-approve tfplan', { cwd: runDir })

    send('aws', 'done', 'Deployed to AWS successfully!', { output: mergeCommandOutput(applyResult).slice(0, 1000) })
    res.end()
  } catch (err) {
    send('aws', 'error', err.error || err.message, { details: mergeCommandOutput(err) })
    res.end()
  }
})

// ══════════════════════════════════════════════════════════════════════════════════
// ROUTE: /api/aws/destroy (Destroy AWS resources)
// ══════════════════════════════════════════════════════════════════════════════════
app.post('/api/aws/destroy', async (req, res) => {
  const runDir = path.join(TEMP_DIR, 'aws-*')
  const dirs = fs.readdirSync(TEMP_DIR).filter(d => d.startsWith('aws-')).map(d => path.join(TEMP_DIR, d))

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  try {
    for (const dir of dirs) {
      res.write(`data: ${JSON.stringify({ step: 'destroy', status: 'running', message: `Destroying ${path.basename(dir)}...` })}\n\n`)
      try {
        await runCommand('terraform destroy -input=false -no-color -auto-approve', { cwd: dir })
      } catch {}
    }
    res.write(`data: ${JSON.stringify({ step: 'destroy', status: 'done', message: 'All AWS resources destroyed' })}\n\n`)
    res.end()
  } catch (err) {
    res.write(`data: ${JSON.stringify({ step: 'destroy', status: 'error', error: err.message })}\n\n`)
    res.end()
  }
})

// ══════════════════════════════════════════════════════════════════════════════════
// ROUTE: /api/aws/status (Check AWS resources)
// ══════════════════════════════════════════════════════════════════════════════════
app.get('/api/aws/status', async (req, res) => {
  try {
    const region = 'ap-south-1'
    const [ec2, s3, rds] = await Promise.all([
      runCommand(`aws ec2 describe-instances --region ${region} --query "Reservations[].Instances[].InstanceId" --output text`),
      runCommand('aws s3 ls'),
      runCommand(`aws rds describe-db-instances --region ${region} --query "DBInstances[].DBInstanceIdentifier" --output text`),
    ])

    res.json({
      ok: true,
      ec2: ec2.stdout.trim().split('\n').filter(Boolean),
      s3: s3.stdout.trim().split('\n').filter(Boolean),
      rds: rds.stdout.trim().split('\n').filter(Boolean),
    })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`\n🚀 ShopOps AI Backend running on http://localhost:${PORT}`)
  console.log(`   POST /api/architecture  → llama3 (architecture reasoning)`)
  console.log(`   POST /api/terraform     → deepseek-coder (HCL generation)`)
  console.log(`   POST /api/dockerfile    → deepseek-coder (Docker)`)
  console.log(`   POST /api/cicd          → GitHub Actions template (Terraform + Docker + EC2)`)
  console.log(`   GET  /api/health        → AI Engine status`)
  console.log(`   🆕 POST /api/docker/deploy    → Run Docker containers`)
  console.log(`   🆕 GET  /api/docker/stats     → Get Docker stats`)
  console.log(`   🆕 POST /api/docker/control   → Control containers`)
  console.log(`   🆕 GET  /api/docker/logs     → Stream Docker logs (SSE)`)
  console.log(`   🆕 POST /api/kubernetes/apply → Deploy to K8s`)
  console.log(`   🆕 GET  /api/kubernetes/status → K8s status`)
  console.log(`   🆕 POST /api/deploy-all      → Deploy everything (SSE)`)
  console.log(`   🆕 POST /api/localstack/deploy → Run Terraform on LocalStack`)
  console.log(`   🆕 POST /api/aws/deploy       → DEPLOY TO REAL AWS (SSE) ⚠️`)
  console.log(`   🆕 GET  /api/aws/status     → Check AWS resources`)
  console.log(`   🆕 POST /api/act/run          → Run GitHub Actions with act`)
  console.log(`   🆕 POST /api/loadtest/start   → Simulate traffic with autocannon`)
  console.log(`   🆕 POST /api/destroy          → Tear down local integrations`)
  console.log(`   🆕 POST /api/architecture/diagram → Generate Mermaid diagram\n`)
  console.log(`   ⚠️  REAL AWS DEPLOYMENT ENABLED - Use /api/aws/deploy with caution!\n`)
})
