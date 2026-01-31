# 📚 SAYTRUTH K3S DOCUMENTATION INDEX

Welcome! Here's where to find everything you need.

---

## 🚀 **START HERE**

### New to this project?
**→ Read:** [`K3S_QUICK_START.md`](K3S_QUICK_START.md)  
⏱️ 5 minutes | Copy-paste commands to get running

### Want to understand K3s deeply?
**→ Read:** [`k3s/README_K3S_GUIDE.md`](k3s/README_K3S_GUIDE.md)  
📚 2000+ lines | Complete educational guide with diagrams

### Need to change configuration?
**→ Read:** [`K3S_CONFIG_REFERENCE.md`](K3S_CONFIG_REFERENCE.md)  
📝 Step-by-step instructions for all common changes

### Just finished migrating?
**→ Read:** [`K3S_MIGRATION_COMPLETE.md`](K3S_MIGRATION_COMPLETE.md)  
✅ Complete checklist of what was created

---

## 📁 **DIRECTORY STRUCTURE**

```
secrecto_web_live_docker/          ← Project root
├── k3s/                            ← Kubernetes files
│   ├── scripts/                    ← 🎯 MAIN SCRIPTS (run these!)
│   │   ├── switch-env.sh           ⭐ Deploy dev/prod
│   │   ├── status.sh               📊 Check status
│   │   ├── logs.sh                 📋 View logs
│   │   ├── cleanup.sh              🗑️ Delete everything
│   │   └── port-forward.sh         🔌 Port forwarding
│   │
│   ├── namespaces/                 ← Namespace definitions
│   │   ├── dev-namespace.yaml
│   │   └── prod-namespace.yaml
│   │
│   ├── postgres/                   ← Database (PostgreSQL)
│   │   ├── postgres-secrets.yaml
│   │   ├── postgres-service.yaml
│   │   ├── postgres-pvc.yaml
│   │   └── postgres-statefulset.yaml
│   │
│   ├── kong/                       ← API Gateway
│   │   ├── kong-configmap.yaml
│   │   ├── kong-service.yaml
│   │   └── kong-deployment.yaml
│   │
│   ├── backend/                    ← Backend (FastAPI)
│   │   ├── backend-configmap.yaml
│   │   ├── backend-secret.yaml
│   │   ├── backend-service.yaml
│   │   └── backend-deployment.yaml
│   │
│   ├── frontend/                   ← Frontend (React/Vite)
│   │   ├── frontend-configmap.yaml
│   │   ├── frontend-service.yaml
│   │   └── frontend-deployment.yaml
│   │
│   ├── ingress/                    ← Ingress (TLS/Routing)
│   │   └── ingress.yaml
│   │
│   ├── cert-manager/               ← TLS Certificate Management
│   │   ├── cert-manager-rbac.yaml
│   │   └── issuers.yaml
│   │
│   └── README_K3S_GUIDE.md         📚 Full educational guide
│
├── K3S_QUICK_START.md              ⚡ 5-minute quickstart
├── K3S_CONFIG_REFERENCE.md         📝 Configuration guide
├── K3S_MIGRATION_COMPLETE.md       ✅ Migration summary
│
├── backend/                        ← Backend code
│   ├── requirements.txt            ✅ Updated with psycopg2-binary
│   └── ...
│
├── frontend/                       ← Frontend code
│   └── ...
│
└── docker-compose.yml              ← Original Docker setup (legacy)
```

---

## 🎯 **QUICK COMMANDS**

### Deploy Development
```bash
cd k3s/scripts
./switch-env.sh dev
```

### Deploy Production
```bash
./switch-env.sh prod
```

### Check Status
```bash
./status.sh dev
./status.sh prod
```

### View Logs
```bash
./logs.sh kong dev
./logs.sh backend dev
./logs.sh postgres dev
./logs.sh frontend dev
```

### Clean Up
```bash
./cleanup.sh
```

---

## 📖 **LEARNING PATH**

### Level 1: Get Started (2 hours)
- [ ] Read: K3S_QUICK_START.md
- [ ] Run: `./switch-env.sh dev`
- [ ] Visit: http://localhost
- [ ] Check: `./status.sh dev`

### Level 2: Understand Concepts (4 hours)
- [ ] Read: k3s/README_K3S_GUIDE.md (Concepts section)
- [ ] Run: `kubectl get all -n saytruth-dev`
- [ ] Try: `kubectl describe pod/name -n saytruth-dev`
- [ ] View: `./logs.sh component dev`

### Level 3: Hands-On (6 hours)
- [ ] Exec into pod: `kubectl exec -it pod/name -n saytruth-dev -- sh`
- [ ] Test DNS: `nslookup postgres-service...`
- [ ] Port-forward: `./port-forward.sh postgres dev`
- [ ] Modify config: `kubectl edit configmap backend-config -n saytruth-dev`

### Level 4: Production Ready (8 hours)
- [ ] Deploy prod: `./switch-env.sh prod`
- [ ] Monitor: Watch logs for errors
- [ ] Test: Full user flow
- [ ] Read: k3s/README_K3S_GUIDE.md (Advanced section)

---

## 🔍 **KEY CONCEPTS QUICK REFERENCE**

| Concept | What It Does | Example |
|---------|-------------|---------|
| **Pod** | Container wrapper | Your backend code running in Docker |
| **Deployment** | Manages pods | "Run 1 backend pod always" |
| **Service** | DNS/networking | `backend-service` → routes to backend pod |
| **ConfigMap** | Configuration | Database host, API port, debug flags |
| **Secret** | Sensitive data | Database password, API keys |
| **Namespace** | Virtual cluster | `saytruth-dev` separate from `saytruth-prod` |
| **Ingress** | External access | Maps `saytruth.duckdns.org` → Kong Service |
| **PVC** | Storage request | "I need 5Gi of disk space" |

**Full explanations:** See k3s/README_K3S_GUIDE.md

---

## 🐛 **TROUBLESHOOTING QUICK REFERENCE**

| Problem | Command |
|---------|---------|
| Pod won't start? | `kubectl describe pod/name -n saytruth-dev` |
| What's running? | `kubectl get all -n saytruth-dev` |
| View logs? | `./logs.sh component dev` |
| Inside pod? | `kubectl exec -it pod/name -n saytruth-dev -- sh` |
| Check network? | `kubectl get svc -n saytruth-dev` |
| Test database? | `./port-forward.sh postgres dev` → `psql localhost` |
| Clear everything? | `./cleanup.sh` |

---

## 📋 **CHECKLIST: BEFORE PRODUCTION**

- [ ] Read: K3S_QUICK_START.md
- [ ] Run: `./switch-env.sh dev`
- [ ] Test: Frontend + API working
- [ ] Read: k3s/README_K3S_GUIDE.md (Concepts section)
- [ ] Update: Domain in configuration files
- [ ] Read: K3S_CONFIG_REFERENCE.md (domain section)
- [ ] Run: `./switch-env.sh prod`
- [ ] Verify: HTTPS certificate working
- [ ] Test: Full user workflow
- [ ] Monitor: Logs for 24 hours

---

## 🔗 **EXTERNAL RESOURCES**

- **K3s Docs:** https://docs.k3s.io/
- **Kubernetes Docs:** https://kubernetes.io/docs/
- **Kong Docs:** https://docs.konghq.com/
- **Cert-Manager:** https://cert-manager.io/docs/
- **PostgreSQL:** https://www.postgresql.org/docs/

---

## ✨ **WHAT'S NEW IN THIS SETUP**

### From Docker Compose → K3s

| Aspect | Docker Compose | K3s |
|--------|---|---|
| **Deployment** | Single host | Kubernetes cluster |
| **Networking** | Docker network | Service DNS names |
| **Configuration** | Environment files | ConfigMaps |
| **Secrets** | .env files | Kubernetes Secrets |
| **Storage** | Docker volumes | PersistentVolumes |
| **Ingress** | Caddy reverse proxy | Traefik + Kong |
| **Switching Envs** | Manual scripts | `./switch-env.sh` |
| **Scaling** | Manual restarts | Deployments |
| **Health Checks** | Basic | Liveness + Readiness probes |
| **TLS/SSL** | Caddy | Cert-Manager + Let's Encrypt |

---

## 🎓 **KEY LEARNINGS**

1. **K3s is just Kubernetes** - Learn real K8s concepts, not proprietary tools
2. **Namespaces isolate environments** - dev and prod are completely separate
3. **Services provide DNS** - Pods talk via stable names, not IP addresses
4. **ConfigMaps are configuration** - Non-secret settings
5. **Secrets are sensitive** - Passwords, API keys, certificates
6. **Ingress is your front door** - External access point
7. **Deployments manage pods** - Automatically restart failed pods
8. **PersistentVolumes = storage** - Data survives pod deletion

---

## 🚀 **NEXT STEPS**

**Right Now:**
```bash
cd k3s/scripts
./switch-env.sh dev
```

**In 5 minutes:**
Visit http://localhost

**In 30 minutes:**
Read K3S_QUICK_START.md

**In 2 hours:**
Read k3s/README_K3S_GUIDE.md (first 3 sections)

**In 1 week:**
Deploy to production with `./switch-env.sh prod`

---

## 💡 **PRO TIPS**

✅ Use `kubectl` commands directly - it's more powerful  
✅ Read error messages carefully - they're usually helpful  
✅ Use `kubectl describe` - tells you what's wrong  
✅ Check logs first - most issues are visible there  
✅ Port-forward to debug - access services locally  
✅ Exec into pods - test connectivity  
✅ Watch changes: `kubectl get pods -w -n saytruth-dev`  

---

## 📞 **HELP MATRIX**

| Need | Read This |
|------|-----------|
| Quick start? | K3S_QUICK_START.md |
| Understand K3s? | k3s/README_K3S_GUIDE.md |
| Change config? | K3S_CONFIG_REFERENCE.md |
| Troubleshoot? | k3s/README_K3S_GUIDE.md (Troubleshooting section) |
| Learn kubectl? | k3s/README_K3S_GUIDE.md (Commands Cheat Sheet) |
| What was created? | K3S_MIGRATION_COMPLETE.md |

---

**Ready to begin? → Run:** `./switch-env.sh dev`

**Happy Learning! 🎓🚀**
