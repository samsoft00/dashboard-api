# Dashboard API 5.0

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
DASHBOARD_VOID_DB_NAME=XXX
DASHBOARD_VOID_DB_HOST=XXX
DASHBOARD_VOID_DB_PORT=3306
DASHBOARD_VOID_DB_USER=XXX
DASHBOARD_VOID_DB_PASS=XXX

#AUTH
DASHBOARD_ACCESS_TOKEN_SECRET=XXX
DASHBOARD_REFRESH_SECRET=XXX

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
