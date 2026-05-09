# Building Survey Server

Introduction
This repository contains the backend server for the Building Survey project used by the Center for Infrastructure Sustainability and Resilience Research (Sharif University). The server implements the REST API, data storage, and admin panel hosting for a mobile/web survey platform used by surveyors and administrators to collect building information.

What it does
- Serves REST APIs for surveyors, group-heads and administrators.
- Stores survey data and execution results in a local SQLite database (`main.db`).
- Integrates with an optional MS SQL server (configuration available in `config/default.json`) for external services.
- Serves a web-based admin panel (static files in `views/dist`).
- Provides API documentation via Swagger at `/api-docs`.
- Uses JWT (RS256) for authentication (private/public keys are under `utils/`).

Tech stack and architecture
- Node.js + Express backend (entry point: `server.js`).
- SQLite (file: `main.db`) is used as the primary datastore for surveys, users and executions (handled by `utils/DatabaseHandler.js`).
- Optional MS SQL connectivity via `mssql` and configuration in `config/default.json`.
- JWT authentication implemented in `utils/jwtRun.js` and enforced by middleware in `utils/VerifyToken.js`.
- Swagger/OpenAPI specification: `openapi.json` (served by `swagger-ui-express`).

Quick start (development)
Prerequisites
- Node.js (tested with Node 12+). Use `node -v` to verify.
- Git (to clone the repository).

Automated setup (recommended)
```bash
# Make setup script executable
chmod +x setup.sh

# Run the setup script
./setup.sh
```

This will:
1. Create `.env` from `.env.example`
2. Generate RSA keys if needed
3. Check dependencies
4. Show you what to do next

Manual setup
If you prefer to set up manually, follow the **"Secrets and Configuration Management"** section below.

Install dependencies
```bash
cd /path/to/building-survey-server
npm install
```

Run in development mode
```bash
# optional: export NODE_ENV=development to use the test port defined in config
export NODE_ENV=development
# start the server
node server.js
# or use nodemon for auto-reload during development
npm run start-dev
```

Notes
- The server reads configuration from `config/default.json` using the `config` package. Change values there (or use environment-specific `config/` files) to customize `port`, `SN` (API prefix), DB connection, and other settings.
- By default the API base prefix is `/api-v1` (see `config/default.json` -> `APAMAN.serverConfig.SN`). Example endpoint: `POST /api-v1/user/login`.

Where to find the admin panel and API docs
- The admin panel static files are served from `views/dist`. When the server runs, open your server root (e.g. http://localhost:4000/) to access the admin panel.
- API documentation (Swagger UI) is available at: http://<host>:<port>/api-docs

Authentication
- Login endpoints return a JWT (RS256) signed with the private key in `utils/private.key` and verified with `utils/public.key`.
- Surveyor login: POST `<SN>/user/login` with JSON { "username": "...", "password": "...", "client": "..." } returns { token, name, family, role }.
- Group-head / admin login endpoints are under `<SN>/groupHead/login` and `<SN>/admin/login` respectively.
- Send the token in the Authorization header for protected endpoints: `Authorization: Bearer <token>`.

Database (SQLite)
- The local SQLite file used by the server is `main.db` located in the repository root. The connection is created by `utils/DatabaseHandler.js`.
- If you need to move the database file between local machine and server (for example to change schema or inspect data), use scp (example preserved below).

Move `main.db` to/from remote server
```bash
# Download from remote server
scp user@yourserver.example:/path/to/server/main.db ~/local/path/

# Upload to remote server
scp ~/local/path/main.db user@yourserver.example:/path/to/server/
```

Running in the background (pm2)
```bash
# install pm2 (example using yarn)
sudo yarn global add pm2

# start the server using pm2 from the project directory
pm2 start server.js --name building-survey-server

# make pm2 start on boot
pm2 startup
pm2 save

# pm2 helpful commands
pm2 log        # show logs
pm2 monit      # monitor
pm2 list       # list processes
pm2 restart building-survey-server
pm2 reload building-survey-server
pm2 stop building-survey-server
pm2 delete building-survey-server
```

Setting up WebDAV backup (outline directory)
This project contains instructions used in production to mount a Nextcloud / WebDAV location for backups. The server URL used previously was:
```
https://drive.insurer.sharif.ir/remote.php/webdav/
```

Steps (Debian/Ubuntu example)
1. Install davfs2:
```bash
sudo apt-get install davfs2
```
2. Create a mount point:
```bash
mkdir ~/nextcloud
```
3. Add credentials to `/etc/davfs2/secrets` in the format:
```
# /path/to/mount username password
/root/nextcloud john 1234
```
4. If you face permission issues, add `use_locks 0` to `/etc/davfs2/davfs2.conf`.
5. Add fstab entry if you want to mount automatically (be careful editing `/etc/fstab`):
```
https://drive.insurer.sharif.ir/remote.php/webdav/ /root/nextcloud davfs user,rw,noauto 0 0
```
6. Mount/umount for testing:
```bash
mount ~/nextcloud
umount ~/nextcloud
```

Systemd service
If you prefer a native systemd service (example `survey.service` and `run.sh` are referenced in the project root), configure them as follows:
1. Update `WorkingDirectory=` and `ExecStart=` inside `survey.service` to match your server folder and `run.sh`.
2. Ensure `run.sh` points to the correct `node` binary (use `which node` to find it) and make it executable:
```bash
sudo chmod +x run.sh
```
3. Copy the service file to `/etc/systemd/system`:
```bash
sudo cp survey.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl start survey
sudo systemctl enable survey
```
4. Inspect service status and logs:
```bash
sudo systemctl status survey
journalctl -u survey
```

Configuration and secrets
- The default configuration is in `config/default.json`. It contains server ports, API prefix (`SN`), SQL Server settings and other service keys. For production do not commit secrets to source control.
- JWT keys are in `utils/private.key` and `utils/public.key` (used by `utils/jwtRun.js`).

Secrets and Configuration Management
Before running the server, you **must** provide your own configuration and secrets. This repository ships with placeholder values for security.

What needs to be configured
1. **Database credentials** (MS SQL Server) — provide your database server, username, password, and database name.
2. **Firebase Cloud Messaging (FCM) key** — for push notifications to mobile clients.
3. **Payment gateway credentials** (AsanPardakht and PayPec) — for payment processing (if used).
4. **JWT RSA keys** — for signing and verifying authentication tokens.
5. **Server environment** — port, API prefix, and other runtime settings.

Configuration files and environment setup
The application loads configuration from two sources:
- `config/default.json` — main configuration file (contains placeholders; do NOT commit actual secrets).
- `.env` file (optional) — environment variables override; use this for local development.

**IMPORTANT**: Both `config/default.json` and `.env` are in `.gitignore` and should NOT be committed to version control.

Getting started with configuration

Step 1: Set up .env file (development)
1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
2. Edit `.env` and replace all `PLACEHOLDER_*` values with your actual credentials:
```bash
nano .env
```
3. Example filled `.env`:
```
DB_USER=your_actual_username
DB_PASSWORD=your_actual_password
DB_SERVER=192.168.1.100
DB_NAME=your_database_name
FCM_AUTHORIZATION_KEY=key=AAAA...your_key...
ASAN_PARDAKHT_MERCHANT_ID=123456
ASAN_PARDAKHT_USERNAME=your_username
...
```

Step 2: Update config/default.json (if needed)
1. The file `config/default.json` contains placeholders. You can either:
   - **Option A** (recommended): Keep placeholders and use `.env` file + environment variables (dotenv will load them).
   - **Option B**: Directly edit `config/default.json` with your values (but ensure it's in `.gitignore` so you don't commit it by accident).

2. If you want to use environment-specific configurations (for production):
   - Create `config/production.json` with your production settings.
   - Set `NODE_ENV=production` when deploying.
   - Example structure (see `config/default.json.example` for reference).

Step 3: Set up JWT keys (critical for authentication)
**Private and public RSA keys are used for JWT token signing/verification. They are NOT included in the repository for security.**

Generate new RSA key pair:
```bash
# Generate a new 1024-bit RSA private key
openssl genrsa -out utils/private.key 1024

# Extract the public key from the private key
openssl rsa -in utils/private.key -pubout -out utils/public.key
```

Verify the keys were created:
```bash
ls -la utils/
# You should see: private.key and public.key
```

**WARNING**: Do NOT commit these keys to version control. They are listed in `.gitignore` by default.

Step 4: Verify .gitignore protects secrets
Ensure these lines are in `.gitignore`:
```
.env
.env.local
config/default.json
config/*.local.json
utils/private.key
utils/public.key
```

Step 5: Install dependencies and run
```bash
npm install
npm run start-dev
```

Database configuration details
- **File**: `config/default.json` → `APAMAN.dbConfig`
- **Fields**:
  - `user`: SQL Server username (e.g., `ApartmentApp`)
  - `password`: SQL Server password
  - `server`: SQL Server hostname or IP address
  - `port`: SQL Server port (typically 2575 or 1433)
  - `database`: Database name (e.g., `Apartment-New`)

Firebase Cloud Messaging (FCM) configuration
- **File**: `config/default.json` → `APAMAN.fcmConfig`
- **Authorization key format**: `key=AAAA...` (server key from Firebase Console)
- How to get it:
  1. Go to Firebase Console → Your Project → Project Settings → Cloud Messaging
  2. Copy the **Server Key**
  3. Insert it in `authorization` field as `key=YOUR_SERVER_KEY`

Payment Gateway: AsanPardakht configuration
- **File**: `config/default.json` → `APAMAN.asanPardakhtConfig`
- **Fields needed**:
  - `MERCHANT_ID`: Your merchant ID from AsanPardakht
  - `MERCHANT_CONFIG_ID`: Your config ID
  - `USERNAME`: Your username
  - `PASSWORD`: Your password
  - `EncryptionKey`: Base64-encoded encryption key (provided by AsanPardakht)
  - `EncryptionVector`: Base64-encoded IV (provided by AsanPardakht)

Payment Gateway: PayPec configuration
- **File**: `config/default.json` → `APAMAN.payPecConfig`
- **Fields needed**:
  - `LOGIN_ACCOUNT`: Your PayPec login account
  - `TERMINAL_CODE`: Your terminal code

JWT configuration
- **File**: `.env` → `JWT_SUBJECT` (or hardcoded in `utils/jwtRun.js` if not set)
- **Example**: `JWT_SUBJECT=surveys@your-organization.com`
- The JWT tokens are signed with `utils/private.key` and verified with `utils/public.key`

Environment variables reference
See `.env.example` for the complete list. Common variables:
```bash
# Database
DB_USER
DB_PASSWORD
DB_SERVER
DB_PORT
DB_NAME

# Server
NODE_ENV (values: development, production)
SERVER_PORT
TEST_PORT

# Firebase
FCM_AUTHORIZATION_KEY

# Payment Gateways
ASAN_PARDAKHT_MERCHANT_ID
ASAN_PARDAKHT_USERNAME
ASAN_PARDAKHT_PASSWORD
ASAN_PARDAKHT_ENCRYPTION_KEY
ASAN_PARDAKHT_ENCRYPTION_VECTOR
PAY_PEC_LOGIN_ACCOUNT
PAY_PEC_TERMINAL_CODE

# JWT
JWT_SUBJECT
JWT_ISSUER
```

Deployment checklist
- [ ] Generate new RSA keys (`utils/private.key` and `utils/public.key`)
- [ ] Create `config/production.json` (or update `config/default.json`)
- [ ] Set all credentials: database, FCM, payment gateways
- [ ] Set `NODE_ENV=production`
- [ ] Verify `.gitignore` is protecting `config/default.json`, `.env`, and `utils/*.key` files
- [ ] Run `npm install && npm start`
- [ ] Test login and API endpoints

Troubleshooting configuration issues
- **Error: "Cannot find module dotenv"**: Run `npm install` to install dependencies
- **Error: ENOENT: no such file or directory 'utils/private.key'**: Generate RSA keys (see Step 3 above)
- **Login fails with 401**: Check JWT_SUBJECT in `.env` or `utils/jwtRun.js`
- **Database connection fails**: Verify DB_SERVER, DB_USER, DB_PASSWORD, and DB_NAME in `config/default.json` or `.env`
- **Payment endpoints fail**: Verify merchant IDs and credentials in `config/default.json`

API reference and useful endpoints
- Swagger UI: `GET /api-docs` (served from `openapi.json`).
- Example login (surveyor): `POST <SN>/user/login` -> returns a Bearer token.
- Protected endpoints require `Authorization: Bearer <token>` header.
- Admin routes are under `<SN>/admin/*`, group-head routes under `<SN>/groupHead/*`, user (surveyor) routes under `<SN>/user/*`.

Troubleshooting
- If the server fails to start, check `node -v` and confirm dependencies were installed with `npm install`.
- Confirm `main.db` exists and is readable by the process (path: `./main.db`).
- If you changed `config/default.json`, restart the server or the systemd/pm2 service.

Further notes
- This repository contains additional utilities under `utils/` (image uploads, JWT verification, exception handling, logger) and controller implementations under `controllers/` for `user`, `groupHead` and `admin` routes.
- If you are preparing a production deployment, review all secrets in `config/` and `utils/` and replace them with secure environment-specific secrets.

Contact / Attribution
Center for Infrastructure Sustainability and Resilience Research, Sharif University
Maintainer: M.R.Heydarian

