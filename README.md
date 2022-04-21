# Dashboard API 1.0

## Dashboard API Endpoints

```
Base URL : http://localhost:3000
```

### ENV variables

```
NODE_ENV=development
NODE_CONFIG_DIR=./src/configs

DASHBOARD_BASE_URL=
DASHBOARD_FRONTEND_URL=
DASHBOARD_MAIL_TRANSPORT=
DASHBOARD_MAX_UPLOAD_SIZE=
DASHBOARD_PORT=3081

#Database
DASHBOARD_VOID_DB_NAME=dashboard_service
DASHBOARD_VOID_DB_HOST=127.0.0.1
DASHBOARD_VOID_DB_PORT=3306
DASHBOARD_VOID_DB_USER=root
DASHBOARD_VOID_DB_PASS=adefioye

#AUTH
DASHBOARD_ACCESS_TOKEN_SECRET=32cab542-80f0-43e6-a0ef-c1e2f0a1ae8e
DASHBOARD_REFRESH_SECRET=55cab678-80f0-43e6-a0ef-c1e2f0a1ae2e

#Mail
DASHBOARD_SENDGRID_API_KEY=
```

**BUILD**

```
npm run build
```

**To start server Development**

```
npm run start:dev
```

**To start server Production**

```
npm run start
```
