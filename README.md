# 📚 SAYTRUTH K3S DEPLOYMENT GUIDE

## Table of Contents
1. [What is K3s and Why Use It?](#what-is-k3s-and-why-use-it)
2. [Core K3s Concepts](#core-k3s-concepts)
3. [Project Architecture](#project-architecture)
4. [Understanding Ports, ConfigMaps & Secrets](#understanding-ports-configmaps--secrets)
5. [Kubernetes Networking Deep Dive](#kubernetes-networking-deep-dive)
6. [Quick Start](#quick-start)
7. [Environment Management](#environment-management)
8. [Troubleshooting](#troubleshooting)
9. [Advanced Topics](#advanced-topics)

---

## What is K3s and Why Use It?

### K3s vs Kubernetes: The Difference

**Kubernetes (K8s):**
- Full-featured container orchestration platform
- Runs ~30+ components
- Heavy resource requirements (4+ GB RAM recommended)
- Perfect for large production deployments at scale

**K3s:**
- "Lightweight Kubernetes" - Single binary
- Runs only essential components (10-15)
- Minimal resource requirements (512 MB RAM possible)
- Bundles container runtime (containerd) + service mesh (Traefik ingress)
- Perfect for:
  - Learning Kubernetes concepts
  - Edge computing
  - Small to medium deployments
  - CI/CD pipelines
  - Local development

### Why We Chose K3s for SayTruth

✅ **Learning-friendly** - You learn real K8s without complexity  
✅ **Lightweight** - Runs on modest hardware  
✅ **Built-in components** - Traefik ingress, local-path storage  
✅ **Production-capable** - Used by enterprises (Rancher's product)  
✅ **Easy switching** - Dev/prod environments with one script  

---

## Core K3s Concepts

### 1. **Pod** 🐳
The smallest deployable unit in K3s/K8s

```
What is a Pod?
└─ Pod (like a shipping container)
   └─ Container 1 (your app)
   └─ Container 2 (optional sidecar)
   └─ Shared storage
   └─ Network interface
```

**Key points:**
- Pod = wrapper around one or more containers
- Containers in same pod share network (same IP, different ports)
- Most pods have just 1 container
- Pods are ephemeral (can be deleted/recreated anytime)

**Example - our Backend Pod:**
```
saytruth-backend-5d4f8c2a9
├─ Container: FastAPI backend
├─ Port: 8000
├─ Environment: DB_URL, JWT_SECRET (from ConfigMap/Secret)
└─ Storage: mounted from PersistentVolume
```

### 2. **Deployment** 📦
Manages how many Pod replicas to run and keeps them healthy

```
Deployment
└─ Replica Set (manages 3 replicas)
   ├─ Pod 1 (running)
   ├─ Pod 2 (running)
   └─ Pod 3 (running)
```

**What Deployment does:**
- Creates/deletes pods to match desired replica count
- Replaces crashed pods automatically
- Updates pods when image changes
- Enables rolling updates (zero downtime)

**Our setup:**
```
Backend Deployment (1 replica)
└─ 1 Backend Pod (running FastAPI)

Frontend Deployment (1 replica)
└─ 1 Frontend Pod (running React/Vite)

Kong Deployment (1 replica)
└─ 1 Kong Pod (API gateway)
```

### 3. **Service** 🌐
Creates stable DNS names to access pods (like a load balancer + router)

```
Internet Request for "backend-service:8000"
    ↓
Service (stable DNS endpoint)
    ↓
Finds all pods with label: app=backend
    ↓
Randomly picks one pod
    ↓
Forwards traffic to pod:8000
```

**Why we need Services:**
- Pods get random IPs and names (not stable)
- Service provides stable DNS name: `service-name.namespace.svc.cluster.local`
- Services handle load balancing automatically

**Our Services:**
```
backend-service → routes to backend pod (port 8000)
frontend-service → routes to frontend pod (port 3000)
postgres-service → routes to postgres pod (port 5432)
kong-service → routes to kong pod (port 8000)
```

### 4. **StatefulSet** 🗄️
Like Deployment, but for stateful applications (databases)

**Difference:**
- **Deployment**: Pods are interchangeable (replicas can be any pod)
- **StatefulSet**: Pods have stable identities (pod-0, pod-1, etc.)

```
StatefulSet: postgres
└─ Pod: postgres-0 (main database)
   └─ Persistent Volume: /data/postgres (survives pod deletion!)
```

**Why for databases:**
- Data must survive pod crashes
- Each replica needs unique storage
- Predictable pod names (pod-0, pod-1, pod-2)

### 5. **ConfigMap** ⚙️
Stores non-sensitive configuration data (environment variables, config files)

```
ConfigMap: backend-config (namespace: saytruth-dev)
├─ DOMAIN: "localhost"
├─ API_PORT: "8000"
├─ DATABASE_URL: "postgresql://..."
└─ LOG_LEVEL: "INFO"

↓ Injected into Pod as environment variables

Pod sees:
├─ $DOMAIN = "localhost"
├─ $API_PORT = "8000"
├─ $DATABASE_URL = "postgresql://..."
└─ $LOG_LEVEL = "INFO"
```

**Key rule: ConfigMaps are NOT secret - use for public data only!**

### 6. **Secret** 🔐
Stores sensitive data (passwords, API keys, certificates)

```
Secret: backend-secret (namespace: saytruth-dev)
├─ JWT_SECRET: "Z6BkzaWcF7r5cC-VMAumjpBpudSyjGskQ0ObquGJhG0="
├─ ENCRYPTION_KEY: "Vv3oE5-p_z1rM3DqK_u_M-7yY_X8z3R_L_k9wB-nS8E="
└─ (base64 encoded, slightly protected)

↓ Injected into Pod

Pod sees the decoded values as environment variables
```

**Base64 encoding (not encryption!):**
- Secrets are base64-encoded, NOT encrypted by default
- Provides basic obfuscation (don't put in git!)
- For production: enable encryption at rest or use external secret management

### 7. **Namespace** 🏠
Virtual cluster within K3s - isolates resources

```
K3s Cluster
├─ Namespace: saytruth-dev (Development environment)
│  ├─ Pods: backend-dev, frontend-dev, kong-dev, postgres-dev
│  ├─ Services: backend-service, frontend-service, etc.
│  ├─ ConfigMaps: backend-config, frontend-config
│  └─ Secrets: backend-secret, postgres-secret
│
├─ Namespace: saytruth-prod (Production environment)
│  ├─ Pods: backend-prod, frontend-prod, kong-prod, postgres-prod
│  ├─ Services: backend-service, frontend-service, etc.
│  ├─ ConfigMaps: backend-config, frontend-config
│  └─ Secrets: backend-secret, postgres-secret
│
└─ Namespace: kube-system (K3s system services)
   └─ (Traefik ingress, CoreDNS, etc.)
```

**Benefits:**
- Dev pods don't interfere with prod
- Same resource names possible in different namespaces
- Easy cleanup: `kubectl delete namespace saytruth-dev`
- RBAC: different users can access different namespaces

### 8. **PersistentVolume (PV) & PersistentVolumeClaim (PVC)** 💾
Storage that survives pod deletion

```
PersistentVolume (PV)
└─ Actual storage on disk: /var/lib/rancher/k3s/storage/pvc-xxx/data/

PersistentVolumeClaim (PVC)
└─ Pod's request: "I want 5Gi of storage"

Pod mounts PVC:
volumeMounts:
  - name: postgres-storage
    mountPath: /var/lib/postgresql/data

Result:
Pod's /var/lib/postgresql/data/ → PV's /var/lib/rancher/k3s/storage/
```

**How it survives deletion:**
```
Pod dies → Deployment creates new pod → New pod mounts same PVC → Data still there!
```

### 9. **Ingress** 🚪
Exposes services to the internet with HTTP(S) routing

```
Internet (Browser)
    ↓ https://saytruth.duckdns.org
Ingress Controller (Traefik in K3s)
    ├─ Reads Ingress resource
    ├─ Generates TLS certificate (via Cert-Manager)
    ├─ Routes based on hostname/path
    ↓
Kong Service (port 80)
    ↓
Kong Pod (API gateway)
    ├─ Routes /api/* → Backend Service
    └─ Routes /* → Frontend Service
```

---

## Project Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ K3S CLUSTER (saytruth-dev or saytruth-prod namespace)       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ INGRESS (Kong Ingress)                              │    │
│  │ - Listens on ports 80/443                           │    │
│  │ - TLS termination (via Cert-Manager)                │    │
│  │ - Routes all traffic to Kong Service                │    │
│  └────────────────┬────────────────────────────────────┘    │
│                   │                                           │
│  ┌────────────────▼────────────────────────────────────┐    │
│  │ KONG SERVICE (Port 8000 - internal)                 │    │
│  │ - API Gateway                                       │    │
│  │ - Routes requests based on path:                    │    │
│  │   • /api/* → Backend Service                        │    │
│  │   • /* → Frontend Service                           │    │
│  └─────┬──────────────────────────┬──────────────────┘    │
│        │                          │                        │
│  ┌─────▼─────────┐         ┌────▼─────────┐              │
│  │ BACKEND POD   │         │ FRONTEND POD  │              │
│  ├───────────────┤         ├───────────────┤              │
│  │ FastAPI       │         │ React/Vite    │              │
│  │ Port: 8000    │         │ Port: 3000    │              │
│  │ Connects to:  │         │               │              │
│  │ Postgres ───┐ │         └───────────────┘              │
│  └─────────────┼─┘                                         │
│                │                                           │
│  ┌─────────────▼──────────────────────────────────────┐   │
│  │ POSTGRES STATEFULSET                               │   │
│  ├──────────────────────────────────────────────────┤    │
│  │ postgres-0                                         │   │
│  │ Port: 5432                                         │   │
│  │ Storage: PersistentVolume (/data/postgres)        │   │
│  │ Users: saytruth_user (password protected)         │   │
│  │ Database: saytruth_db                             │   │
│  └──────────────────────────────────────────────────┘    │
│                                                            │
└─────────────────────────────────────────────────────────┘
```

### Data Flow Example: User Login

```
1. Browser
   User clicks "Login" button
   POST https://saytruth.duckdns.org/api/auth/login
   
2. TLS/SSL Layer
   Browser ↔ Ingress Controller: HTTPS encrypted

3. Ingress (Kong Ingress)
   Receives HTTPS request
   Decrypts (TLS termination)
   Converts to HTTP (internal)
   Routes to Kong Service

4. Kong Service
   DNS lookup: kong-service → 10.42.1.123 (example IP)
   Sends HTTP request to Kong Pod

5. Kong Pod (API Gateway)
   Analyzes path: /api/auth/login
   Matches route: /api/* → Backend Service
   Forwards to Backend Service

6. Backend Service
   DNS lookup: backend-service → 10.42.1.124
   Sends to Backend Pod

7. Backend Pod (FastAPI)
   Receives POST /api/auth/login
   Validates credentials against PostgreSQL
   (Backend connects to postgres-service:5432)

8. PostgreSQL Pod
   Validates username/password
   Returns user record

9. Backend Pod
   Generates JWT token
   Returns 200 OK + token

10. Response travels back:
    Backend Pod → Backend Service → Kong Pod → Kong Ingress → Browser (HTTPS)
```

---

## Understanding Ports, ConfigMaps & Secrets

### Port Mapping & Networking

#### External Ports (Internet → K3s)
```
Port 80 (HTTP)  → Ingress → Kong Service:8000 → Kong Pod:8000
Port 443 (HTTPS) → Ingress → Kong Service:8000 → Kong Pod:8000
```

#### Internal Ports (Inside K3s)
```
Kong Pod (8000)
  ├─ Route to Backend Service:8000
  │   └─ Backend Pod:8000 (FastAPI)
  │
  ├─ Route to Frontend Service:3000
  │   └─ Frontend Pod:3000 (React)
  │
  └─ Communicates with Postgres Service:5432
      └─ Postgres Pod:5432

Backend Pod (8000)
  └─ Communicates with Postgres Service:5432
     └─ Postgres Pod:5432

Frontend Pod (3000)
  └─ Serves React app
     └─ Browser makes requests to Kong:80/api/*
```

### ConfigMap Example: Backend Configuration

**File: k3s/backend/backend-configmap.yaml**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: backend-config
  namespace: saytruth-dev
data:
  DOMAIN: "localhost"                                    # ← Dev domain
  API_PORT: "8000"
  DATABASE_URL: "postgresql://saytruth_user:pass@postgres-service.saytruth-dev.svc.cluster.local:5432/saytruth_db"
  #                                     ↑                ↑                              ↑
  #                                     username         service DNS name              port
  LOG_LEVEL: "INFO"
```

**How it gets into Backend Pod:**
```yaml
spec:
  template:
    spec:
      containers:
      - name: backend
        envFrom:
        - configMapRef:
            name: backend-config    # ← This line injects ConfigMap as env vars
```

**Inside Backend Pod, the environment becomes:**
```bash
$ echo $DATABASE_URL
postgresql://saytruth_user:pass@postgres-service.saytruth-dev.svc.cluster.local:5432/saytruth_db

$ echo $DOMAIN
localhost
```

### Secret Example: Database Credentials

**File: k3s/postgres/postgres-secrets.yaml**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: postgres-secret
  namespace: saytruth-dev
type: Opaque
stringData:
  POSTGRES_USER: saytruth_user
  POSTGRES_PASSWORD: "DevSecurePass123!@#"  # ← Sensitive!
  POSTGRES_DB: saytruth_db
```

**Inside Postgres Pod:**
```bash
$ echo $POSTGRES_PASSWORD
DevSecurePass123!@#
```

**Why separate ConfigMap + Secret:**
```
ConfigMap (public config):
- Database host: postgres-service
- Port: 5432
- Debug mode: true/false

Secret (sensitive data):
- Database username: saytruth_user
- Database password: ***
- JWT tokens
- Encryption keys
```

---

## Kubernetes Networking Deep Dive

### Service DNS Names (The Magic of K3s Networking)

#### Default Service DNS Format:
```
service-name.namespace.svc.cluster.local
```

**Examples from SayTruth:**
```
postgres-service.saytruth-dev.svc.cluster.local   (Dev Postgres)
postgres-service.saytruth-prod.svc.cluster.local  (Prod Postgres)
backend-service.saytruth-dev.svc.cluster.local    (Dev Backend)
backend-service.saytruth-prod.svc.cluster.local   (Prod Backend)
kong-service.saytruth-dev.svc.cluster.local       (Dev Kong)
kong-service.saytruth-prod.svc.cluster.local      (Prod Kong)
```

### How DNS Resolution Works

```
Step 1: Backend Pod wants to connect to Postgres
        Connection string: postgresql://user:pass@postgres-service.saytruth-dev.svc.cluster.local:5432

Step 2: Backend Pod asks CoreDNS (K3s DNS service)
        "What is the IP for postgres-service.saytruth-dev.svc.cluster.local?"

Step 3: CoreDNS checks the Service
        Service: postgres-service (namespace: saytruth-dev)
        ClusterIP: 10.42.1.100 (assigned by K3s)

Step 4: CoreDNS responds to Backend Pod
        "postgres-service.saytruth-dev.svc.cluster.local = 10.42.1.100"

Step 5: Backend Pod connects to 10.42.1.100:5432

Step 6: Service forwards traffic to Postgres Pod
        Postgres Pod IP: 10.42.1.101 (could be any IP)
        Postgres Pod Port: 5432

Step 7: Connection established!
```

### Pod-to-Pod Communication

```
Backend Pod (IP: 10.42.1.50) wants Backend Pod (IP: 10.42.1.51)

Option 1: Direct IP (not recommended)
Backend Pod → 10.42.1.51:5432
(What if pod dies and is recreated with new IP? Connection breaks!)

Option 2: Via Service DNS (recommended)
Backend Pod → postgres-service:5432
  ↓ (DNS resolves)
Backend Pod → 10.42.1.100:5432 (Service IP)
  ↓ (Service routes)
Postgres Pod → 10.42.1.51:5432
```

### Why Services Matter for Dev vs Prod

**Development Environment:**
```
Backend Pod (Dev 1) connects to:
  postgres-service.saytruth-dev.svc.cluster.local:5432

Production Environment:
Backend Pod (Prod) connects to:
  postgres-service.saytruth-prod.svc.cluster.local:5432

Result: Both use same service name, but different databases!
No code changes needed, just namespace isolation.
```

---

## Quick Start

### Prerequisites
```bash
# 1. K3s installed and running
k3s --version
kubectl get nodes

# 2. Your domain (for prod)
# Using: saytruth.duckdns.org
```

### Step 1: Switch to Dev Environment
```bash
cd k3s/scripts/
./switch-env.sh dev
```

**What this does:**
- Creates `saytruth-dev` namespace
- Deploys PostgreSQL, Backend, Frontend, Kong
- Waits for all pods to be ready
- Shows access URLs

### Step 2: Build Docker Images (ONE TIME)
```bash
# Build backend image
cd backend/
docker build -t saytruth-backend:latest .

# Build frontend image
cd ../frontend/
docker build -t saytruth-frontend:latest .

# Note: Images must be available for K3s to use
# (via docker, or by pushing to registry)
```

### Step 3: Verify Deployment
```bash
# Check status
kubectl get all -n saytruth-dev

# View logs
./scripts/logs.sh kong dev
./scripts/logs.sh backend dev
./scripts/logs.sh postgres dev
./scripts/logs.sh frontend dev
```

### Step 4: Access Your App

**Development:**
```
Frontend: http://localhost
API: http://localhost/api
Kong Admin: http://localhost:8001
```

**Production (after setup):**
```
./switch-env.sh prod

Frontend: https://saytruth.duckdns.org
API: https://saytruth.duckdns.org/api
Kong Admin: (port-forward needed)
```

---

## Environment Management

### Switching Between Dev and Prod

```bash
# Switch to development
./switch-env.sh dev
# ✅ Creates saytruth-dev namespace
# ✅ Deploys all services with dev config
# ✅ HTTP only (no TLS)

# Switch to production
./switch-env.sh prod
# ✅ Deletes saytruth-dev
# ✅ Creates saytruth-prod namespace
# ✅ Deploys with prod config
# ✅ TLS/SSL enabled (Cert-Manager)
# ✅ Larger storage for Postgres (20Gi vs 5Gi)
```

### Changing Configuration

#### Change Domain Name (for production)

**File: k3s/frontend/frontend-configmap.yaml**
```yaml
# Line ~23 (prod section)
VITE_API_BASE_URL: "https://mynewdomain.com"  # Change here
```

**File: k3s/backend/backend-configmap.yaml**
```yaml
# Line ~16 (prod section)
DOMAIN: "mynewdomain.com"  # Change here
```

**File: k3s/ingress/ingress.yaml**
```yaml
# Line ~24 (prod ingress)
- host: mynewdomain.com  # Change here
```

**File: k3s/cert-manager/issuers.yaml**
```yaml
# Line ~8 (prod issuer)
email: your-email@example.com  # For Let's Encrypt
```

Then redeploy:
```bash
./switch-env.sh prod
```

#### Change Database Password

**File: k3s/postgres/postgres-secrets.yaml**
```yaml
# Line ~6
POSTGRES_PASSWORD: "YourNewPassword123!@#"  # Change here

# Line ~12 (prod section too)
POSTGRES_PASSWORD: "YourNewPassword456!@#"  # Change here
```

Redeploy and Postgres will use the new password for next pod.

#### Change Backend/Frontend Image

**File: k3s/backend/backend-deployment.yaml**
```yaml
# Line ~30 (dev) and ~61 (prod)
image: saytruth-backend:latest  # Change tag here
# Examples: saytruth-backend:v1.0, saytruth-backend:prod
```

Redeploy:
```bash
kubectl rollout restart deployment/backend -n saytruth-dev
```

---

## Troubleshooting

### Problem: Pod won't start

```bash
# Check pod status
kubectl get pods -n saytruth-dev
# Shows: CrashLoopBackOff, ImagePullBackOff, Pending, etc.

# View pod logs
kubectl logs pod/backend-xyz -n saytruth-dev

# Describe pod (detailed info)
kubectl describe pod/backend-xyz -n saytruth-dev
```

### Problem: Pod can't connect to database

```bash
# Test DNS resolution inside pod
kubectl exec -it pod/backend-xyz -n saytruth-dev -- sh
$ nslookup postgres-service.saytruth-dev.svc.cluster.local
# Should show: 10.42.x.x

# Test direct connection
$ pg_isready -h postgres-service.saytruth-dev.svc.cluster.local -p 5432 -U saytruth_user
# Should show: accepting connections
```

### Problem: Ingress not working

```bash
# Check Ingress status
kubectl get ingress -n saytruth-dev
kubectl describe ingress kong-ingress -n saytruth-dev

# Check Traefik ingress controller logs
kubectl logs -n kube-system -l app=traefik -f
```

### Problem: TLS Certificate not generating

```bash
# Check cert-manager logs
kubectl logs -n cert-manager -l app=cert-manager -f

# Check certificate resource
kubectl get certificate -n saytruth-prod
kubectl describe certificate kong-tls-prod -n saytruth-prod
```

### Problem: Storage not persisting

```bash
# Check PVC status
kubectl get pvc -n saytruth-dev
kubectl describe pvc postgres-pvc -n saytruth-dev

# Check PV status
kubectl get pv

# Check actual storage on disk
ls -la /var/lib/rancher/k3s/storage/
```

---

## Advanced Topics

### 1. Port Forwarding for Local Testing

```bash
# Forward Kong admin port
./scripts/port-forward.sh kong-admin dev
# Now access Kong admin on http://localhost:8001

# Forward Postgres for external client
./scripts/port-forward.sh postgres dev
# Now connect to postgres on localhost:5432
```

### 2. Executing Commands Inside Pods

```bash
# Enter a pod shell
kubectl exec -it pod/backend-xyz -n saytruth-dev -- /bin/sh

# Run specific command
kubectl exec pod/backend-xyz -n saytruth-dev -- python --version

# Check environment variables
kubectl exec pod/backend-xyz -n saytruth-dev -- env | grep DATABASE_URL
```

### 3. Monitoring & Logs

```bash
# Stream logs from all pods of a service
kubectl logs -l app=backend -n saytruth-dev -f

# Get logs from previous pod (if it crashed)
kubectl logs pod/backend-xyz -n saytruth-dev --previous

# Get logs from all containers
kubectl logs pod/backend-xyz -n saytruth-dev --all-containers=true

# Tail last 500 lines
kubectl logs pod/backend-xyz -n saytruth-dev --tail=500
```

### 4. Scaling (Manual - for learning)

```bash
# Scale backend to 3 replicas
kubectl scale deployment backend --replicas=3 -n saytruth-dev

# Watch them start
kubectl get pods -n saytruth-dev -w

# Scale back down
kubectl scale deployment backend --replicas=1 -n saytruth-dev
```

### 5. Rolling Updates (Zero Downtime Deployments)

```bash
# Update backend image
kubectl set image deployment/backend backend=saytruth-backend:v2.0 -n saytruth-dev

# Watch rolling update
kubectl rollout status deployment/backend -n saytruth-dev -w

# Rollback if something goes wrong
kubectl rollout undo deployment/backend -n saytruth-dev

# View rollout history
kubectl rollout history deployment/backend -n saytruth-dev
```

### 6. ConfigMap/Secret Hot Updates

```bash
# Edit ConfigMap directly
kubectl edit configmap backend-config -n saytruth-dev
# Opens your editor - make changes, save and close

# Update Secret
kubectl edit secret backend-secret -n saytruth-dev

# Note: Pods don't automatically reload config (unless using external config watcher)
# Force pod restart to pick up new config
kubectl rollout restart deployment/backend -n saytruth-dev
```

---

## File Structure Explained

```
k3s/
├── namespaces/
│   ├── dev-namespace.yaml          ← Defines saytruth-dev namespace
│   └── prod-namespace.yaml         ← Defines saytruth-prod namespace
│
├── postgres/
│   ├── postgres-secrets.yaml       ← DB credentials (dev + prod)
│   ├── postgres-service.yaml       ← DNS endpoint for DB (dev + prod)
│   ├── postgres-pvc.yaml           ← Storage request (dev 5Gi, prod 20Gi)
│   └── postgres-statefulset.yaml   ← DB deployment (dev + prod)
│
├── kong/
│   ├── kong-configmap.yaml         ← Kong routes (dev + prod)
│   ├── kong-service.yaml           ← Kong endpoint (dev + prod)
│   └── kong-deployment.yaml        ← Kong deployment (dev + prod)
│
├── backend/
│   ├── backend-configmap.yaml      ← Backend config (dev + prod)
│   ├── backend-secret.yaml         ← Backend secrets (dev + prod)
│   ├── backend-service.yaml        ← Backend endpoint (dev + prod)
│   └── backend-deployment.yaml     ← Backend deployment (dev + prod)
│
├── frontend/
│   ├── frontend-configmap.yaml     ← Frontend config (dev + prod)
│   ├── frontend-service.yaml       ← Frontend endpoint (dev + prod)
│   └── frontend-deployment.yaml    ← Frontend deployment (dev + prod)
│
├── ingress/
│   └── ingress.yaml                ← Ingress rules for Traefik (dev + prod)
│
├── cert-manager/
│   ├── cert-manager-rbac.yaml      ← Cert-Manager permissions
│   └── issuers.yaml                ← Let's Encrypt + Self-signed issuers
│
└── scripts/
    ├── switch-env.sh               ← ⭐ MAIN: Deploy dev/prod
    ├── cleanup.sh                  ← Delete all resources
    ├── status.sh                   ← Check deployment status
    ├── logs.sh                     ← View pod logs
    └── port-forward.sh             ← Forward ports for debugging
```

---

## Useful Kubectl Commands Cheat Sheet

```bash
# Namespaces
kubectl get namespaces
kubectl get all -n saytruth-dev              # Everything in a namespace

# Pods
kubectl get pods -n saytruth-dev
kubectl get pods -n saytruth-dev -o wide     # Show IPs and nodes
kubectl logs pod/name -n saytruth-dev
kubectl exec -it pod/name -n saytruth-dev -- /bin/sh

# Deployments
kubectl get deployments -n saytruth-dev
kubectl describe deployment backend -n saytruth-dev
kubectl rollout status deployment/backend -n saytruth-dev
kubectl rollout restart deployment/backend -n saytruth-dev

# Services
kubectl get services -n saytruth-dev
kubectl get svc -n saytruth-dev               # Short form
kubectl describe svc backend-service -n saytruth-dev

# ConfigMaps & Secrets
kubectl get configmaps -n saytruth-dev
kubectl get secrets -n saytruth-dev
kubectl edit configmap backend-config -n saytruth-dev

# Ingress
kubectl get ingress -n saytruth-dev
kubectl describe ingress kong-ingress -n saytruth-dev

# StatefulSet
kubectl get statefulsets -n saytruth-dev
kubectl get pvc -n saytruth-dev

# Events and troubleshooting
kubectl get events -n saytruth-dev
kubectl describe node                         # Check node resources
kubectl top pods -n saytruth-dev             # CPU/Memory usage
```

---

## Next Steps: Recommended Learning Path

### Week 1: Get Comfortable
1. ✅ Deploy dev environment
2. ✅ Explore pods, services, configmaps with `kubectl` commands
3. ✅ Modify ConfigMap and restart pod
4. ✅ View logs and port-forward

### Week 2: Understand Networking
1. ✅ Exec into a pod and test DNS resolution
2. ✅ Trace a request from browser through Kong to backend
3. ✅ Test database connection from backend pod
4. ✅ Port-forward and connect to Postgres externally

### Week 3: Advanced Operations
1. ✅ Scale services up/down
2. ✅ Update images and trigger rolling restarts
3. ✅ Test failure scenarios (delete pods, watch auto-recovery)
4. ✅ Setup monitoring/logging

### Week 4: Production Readiness
1. ✅ Deploy to prod with TLS
2. ✅ Test Let's Encrypt certificate generation
3. ✅ Setup backups for PostgreSQL
4. ✅ Document runbooks

---

## Resources

- [K3s Official Docs](https://docs.k3s.io/)
- [Kubernetes Concepts](https://kubernetes.io/docs/concepts/)
- [Kong API Gateway](https://docs.konghq.com/)
- [Cert-Manager](https://cert-manager.io/docs/)
- [Traefik Ingress](https://doc.traefik.io/traefik/providers/kubernetes-crd/)

---

**Happy Learning! 🚀**

For questions or issues, check logs and use `kubectl describe` - it's your best friend!
