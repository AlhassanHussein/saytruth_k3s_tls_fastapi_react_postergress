# 🚀 Full-Stack Deployment Guide

This project utilizes a modern stack featuring **FastAPI**, **React**, and **Caddy**, all orchestrated with **Docker Compose**.

## 🛠 Tech Stack
*   **Backend:** [FastAPI](https://fastapi.tiangolo.com) 
*   **Frontend:** [React](https://react.dev) via [Vite](https://vitejs.dev)
*   **Reverse Proxy:** [Caddy](https://caddyserver.com) (Automatic HTTPS & SSL)
*   **Containerization:** [Docker Compose](https://docs.docker.com)
*   **Sqlite:** Sqlite 
---

## 🏃 Getting Started

### 1. Environment Configuration
Ensure you have a `.env` file in the root directory. This file manages your sensitive credentials and environment-specific variables.

### 2. Initialize the Setup
Run the included setup script to prepare your environment:
```bash
source setup.sh
```
3. Choose Your Mode
When prompted by the script, select your desired environment:
dev: For local development with hot-reloading.
prod: For production-ready deployment with optimized builds.
4. Launch the Services
Start the application using Docker:
```
docker compose up
```
5. Access the Application
Once the containers are healthy, view your app in the browser:
Local: http://localhost
Production: https://your-domain-name.com
