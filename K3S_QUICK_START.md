# 🚀 SAYTRUTH K3S QUICK START

Welcome to Kubernetes! This guide gets you running in 5 minutes.

## Prerequisites
- K3s installed: `k3s --version`
- kubectl working: `kubectl get nodes`

## Quick Start (3 Steps)

### 1. Build Docker Images (One Time)
```bash
# From project root
cd backend && docker build -t saytruth-backend:latest .
cd ../frontend && docker build -t saytruth-frontend:latest .
cd ..
```

### 2. Deploy to Dev Environment
```bash
cd k3s/scripts
./switch-env.sh dev

# Wait 1-2 minutes for all pods to start...
```

### 3. Access Your App
```
Frontend: http://localhost
API: http://localhost/api
Kong Admin: http://localhost:8001
```

## Common Commands

```bash
# Check status
./status.sh dev

# View logs
./logs.sh kong dev
./logs.sh backend dev
./logs.sh postgres dev

# Switch to production
./switch-env.sh prod

# Clean everything
./cleanup.sh
```

## What Just Happened?

You deployed 4 services into K3s:
- **PostgreSQL**: Database
- **Backend**: FastAPI server
- **Frontend**: React/Vite app
- **Kong**: API Gateway

All running in isolated `saytruth-dev` namespace!

## Learn More

📚 Read the full guide:
```bash
cat k3s/README_K3S_GUIDE.md
```

### Key Concepts to Understand:
1. **Pod** = Container wrapper
2. **Deployment** = Manages pods
3. **Service** = Networking (DNS names)
4. **Namespace** = Virtual cluster
5. **ConfigMap** = Configuration data
6. **Secret** = Sensitive data
7. **Ingress** = External access (port 80/443)

## Troubleshooting

**Pods not starting?**
```bash
kubectl get pods -n saytruth-dev
kubectl describe pod/pod-name -n saytruth-dev
kubectl logs pod/pod-name -n saytruth-dev
```

**Can't connect to database?**
```bash
# Exec into backend pod
kubectl exec -it pod/backend-xxx -n saytruth-dev -- sh

# Test DNS
$ nslookup postgres-service.saytruth-dev.svc.cluster.local

# Test connection
$ pg_isready -h postgres-service.saytruth-dev.svc.cluster.local -U saytruth_user
```

**Need to change domain?**
Edit these files for production:
- `k3s/frontend/frontend-configmap.yaml` (VITE_API_BASE_URL)
- `k3s/backend/backend-configmap.yaml` (DOMAIN)
- `k3s/ingress/ingress.yaml` (host name)

Then: `./switch-env.sh prod`

## File Structure

```
k3s/
├── scripts/              ← RUN THESE
│   ├── switch-env.sh     ← Main command
│   ├── cleanup.sh
│   └── status.sh
├── namespaces/           ← Kubernetes namespaces
├── postgres/             ← Database files
├── kong/                 ← API Gateway files
├── backend/              ← Backend deployment files
├── frontend/             ← Frontend deployment files
├── ingress/              ← TLS/Ingress files
├── cert-manager/         ← Certificate files
└── README_K3S_GUIDE.md   ← Full educational guide
```

---

**Next Steps:**
1. ✅ Run: `./switch-env.sh dev`
2. ✅ Visit: http://localhost
3. ✅ Read: `k3s/README_K3S_GUIDE.md`
4. ✅ Explore: `kubectl get all -n saytruth-dev`

**Happy Learning! 🎓**
