# 📝 SAYTRUTH K3S CONFIGURATION REFERENCE

Quick reference for modifying K3s deployments.

## 🔧 How to Change Configuration

### 1. Change Domain Name (for Production)

Edit these files:

**File: k3s/frontend/frontend-configmap.yaml**
```yaml
# Around line 9 (production section)
data:
  NODE_ENV: "production"
  VITE_API_BASE_URL: "https://mynewdomain.com"  # ← CHANGE THIS
```

**File: k3s/backend/backend-configmap.yaml**
```yaml
# Around line 11 (production section)
data:
  DOMAIN: "mynewdomain.com"  # ← CHANGE THIS
  DATABASE_URL: "postgresql://..."
```

**File: k3s/ingress/ingress.yaml**
```yaml
# Around line 24 (production ingress)
rules:
- host: mynewdomain.com  # ← CHANGE THIS
```

**File: k3s/cert-manager/issuers.yaml**
```yaml
# Around line 8 (production issuer)
email: your-email@example.com  # ← CHANGE THIS (for Let's Encrypt)
```

**Then redeploy:**
```bash
cd k3s/scripts
./cleanup.sh  # Remove old environment
./switch-env.sh prod  # Deploy with new domain
```

---

### 2. Change Database Credentials

**File: k3s/postgres/postgres-secrets.yaml**
```yaml
# Line 5-7 (development)
stringData:
  POSTGRES_USER: newuser  # ← CHANGE
  POSTGRES_PASSWORD: "NewPassword123!@#"  # ← CHANGE
  POSTGRES_DB: mynewdb  # ← CHANGE
  
# Line 13-15 (production)
stringData:
  POSTGRES_USER: produser  # ← CHANGE
  POSTGRES_PASSWORD: "ProdPassword456!@#"  # ← CHANGE
  POSTGRES_DB: prod_db  # ← CHANGE
```

**Then update backend to use new password:**

**File: k3s/backend/backend-configmap.yaml**
```yaml
# Update DATABASE_URL in both dev and prod sections
# Make sure password matches postgres-secrets.yaml

# Development
DATABASE_URL: "postgresql://newuser:NewPassword123!@#@postgres-service.saytruth-dev.svc.cluster.local:5432/mynewdb"

# Production
DATABASE_URL: "postgresql://produser:ProdPassword456!@#@postgres-service.saytruth-prod.svc.cluster.local:5432/prod_db"
```

**Redeploy:**
```bash
./switch-env.sh dev  # or prod
```

---

### 3. Change Backend Docker Image

**File: k3s/backend/backend-deployment.yaml**

**For development (around line 30):**
```yaml
containers:
- name: backend
  image: saytruth-backend:latest  # ← CHANGE TAG
  # Examples:
  # saytruth-backend:v1.0
  # saytruth-backend:prod
  # saytruth-backend:dev-feature
```

**For production (around line 61):**
```yaml
containers:
- name: backend
  image: saytruth-backend:latest  # ← CHANGE TAG
```

**Trigger rolling update (without deleting namespace):**
```bash
# After pushing new image, trigger restart
kubectl rollout restart deployment/backend -n saytruth-dev
kubectl rollout status deployment/backend -n saytruth-dev -w
```

---

### 4. Change Frontend Docker Image

**File: k3s/frontend/frontend-deployment.yaml**

Same process as backend:

```yaml
# Line 30 (dev)
image: saytruth-frontend:latest

# Line 61 (prod)
image: saytruth-frontend:latest
```

Redeploy:
```bash
kubectl rollout restart deployment/frontend -n saytruth-dev
```

---

### 5. Change Resource Limits

**File: k3s/backend/backend-deployment.yaml**

**Development (line 47-50):**
```yaml
resources:
  requests:  # Minimum guaranteed
    memory: "128Mi"  # ← CHANGE (increase for heavy app)
    cpu: "50m"       # ← CHANGE
  limits:    # Maximum allowed
    memory: "512Mi"  # ← CHANGE
    cpu: "500m"      # ← CHANGE
```

**Production (line 78-81):**
```yaml
resources:
  requests:
    memory: "256Mi"  # ← Larger for production
    cpu: "100m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

**Reference:**
```
1000m = 1 CPU
500m = 0.5 CPU = half a CPU
128Mi = 128 Megabytes
1Gi = 1 Gigabyte = 1024 Megabytes
```

Redeploy:
```bash
kubectl rollout restart deployment/backend -n saytruth-dev
```

---

### 6. Change Database Storage Size

**File: k3s/postgres/postgres-pvc.yaml**

**Development (line 7):**
```yaml
requests:
  storage: 5Gi  # ← CHANGE (dev: small)
```

**Production (line 15):**
```yaml
requests:
  storage: 20Gi  # ← CHANGE (prod: larger)
```

**Note:** To resize existing PVC, delete and redeploy:
```bash
kubectl delete pvc postgres-pvc -n saytruth-dev
kubectl apply -f k3s/postgres/postgres-pvc.yaml
```

**⚠️ WARNING: This deletes the data! Backup first!**

---

### 7. Change Kong Configuration

**File: k3s/kong/kong-configmap.yaml**

```yaml
data:
  kong.yaml: |
    _format_version: "2.1"
    services:
      - name: backend-service
        url: http://backend-service:8000  # ← CHANGE if port different
        routes:
          - name: api-route
            paths:
              - /api  # ← CHANGE path routing
            strip_path: false
      - name: frontend-service
        url: http://frontend-service:3000  # ← CHANGE if port different
        routes:
          - name: frontend-route
            paths:
              - /  # ← CHANGE if needed
            strip_path: false
```

Redeploy:
```bash
kubectl apply -f k3s/kong/kong-configmap.yaml
# Then restart Kong pods to reload config
kubectl rollout restart deployment/kong -n saytruth-dev
```

---

### 8. Add JWT Secrets

**File: k3s/backend/backend-secret.yaml**

```yaml
stringData:
  JWT_SECRET: "your-secret-key-here"  # ← GENERATE NEW
  ENCRYPTION_KEY: "your-encryption-key"  # ← GENERATE NEW
```

**Generate secure secrets:**
```bash
# Generate 32-byte random secret (base64)
openssl rand -base64 32

# Or using Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

### 9. Change Log Level

**File: k3s/backend/backend-configmap.yaml**

```yaml
LOG_LEVEL: "DEBUG"  # ← Can be: DEBUG, INFO, WARNING, ERROR
DEBUG: "true"        # ← Can be: true or false
```

Redeploy:
```bash
kubectl rollout restart deployment/backend -n saytruth-dev
```

---

### 10. Enable More Kong Plugins (Future)

**File: k3s/kong/kong-configmap.yaml**

```yaml
data:
  kong.yaml: |
    _format_version: "2.1"
    services:
      # ... existing config ...
    plugins:
      - name: rate-limiting
        service: backend-service
        config:
          minute: 100  # 100 requests per minute
      - name: cors
        config:
          origins: ["*"]
      - name: request-size-limiting
        config:
          allowed_payload_size: 10
```

---

## ⚡ Useful Commands

```bash
# Apply changes without deleting namespace
kubectl apply -f k3s/backend/backend-configmap.yaml

# View current config
kubectl get configmap backend-config -n saytruth-dev -o yaml

# Edit directly in editor
kubectl edit configmap backend-config -n saytruth-dev

# Restart pods to pick up new config
kubectl rollout restart deployment/backend -n saytruth-dev

# Watch restart progress
kubectl rollout status deployment/backend -n saytruth-dev -w
```

---

## 📋 Change Checklist

When making configuration changes:

- [ ] Edit the YAML file
- [ ] Test in dev first
- [ ] Verify with `kubectl apply -f file.yaml`
- [ ] Restart affected deployments: `kubectl rollout restart deployment/name -n namespace`
- [ ] Check logs: `./logs.sh component dev`
- [ ] If working, apply to prod the same way
- [ ] Test production thoroughly

---

## 🔒 Secret Management Tips

**❌ DON'T:**
```bash
# Don't commit secrets to git
git add k3s/postgres/postgres-secrets.yaml

# Don't use weak passwords
POSTGRES_PASSWORD: "password123"

# Don't hardcode secrets in ConfigMaps
```

**✅ DO:**
```bash
# Add to .gitignore
echo "k3s/*/\*-secrets.yaml" >> .gitignore

# Use strong passwords
openssl rand -base64 32

# Use Secrets for sensitive data
# Use ConfigMaps for public config
```

**Better Practice (Future):**
- Use Sealed Secrets for git-safe secrets
- Use Vault for secret management
- Use RBAC to restrict secret access

---

**Need Help?**
```bash
# View all resources in namespace
kubectl get all -n saytruth-dev

# Describe specific resource
kubectl describe deployment backend -n saytruth-dev

# View configuration
kubectl get configmap backend-config -n saytruth-dev -o yaml

# Follow logs
./logs.sh backend dev
```
