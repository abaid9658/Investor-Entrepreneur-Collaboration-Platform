# Nexus — Investor & Entrepreneur Collaboration Platform

Nexus is an enterprise-grade collaboration hub designed to connect startup founders with accredited venture investors. It features real-time messaging, a secure encrypted document signature vault, interactive calendars, WebRTC video calling chambers, and payment ledgers with Stripe integration.

---

## 🚀 Key Technical Features

1. **Authentication & Multi-Factor Security**: JWT token rotation with cookie security, account locking rules, and multi-factor validation (MFA) using SMTP-delivered OTP codes.
2. **Scheduling Conflict Mechanics**: Core calendar API with interval collision checks to prevent concurrent meeting times.
3. **WebRTC Video Rooms**: Real-time multi-peer signaling engine via Socket.io to connect raw video/audio tracks directly between peers, with screen-sharing capabilities.
4. **Encrypted Document signature Vault**: Binary magic-bytes validation on uploads, PDF viewer integration, and canvas-drawn/typed digital signature logs.
5. **Ledger Booking & Balance Ledger**: Double-entry ledger architecture keeping track of account balances, transfers, withdrawals, and Stripe payments.
6. **Real-time Notifications**: Socket.io broadcaster delivering push toast notifications instantly.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TypeScript, TailwindCSS, Redux Toolkit, React Query, Socket.io-client, FullCalendar, React PDF Viewer, Framer Motion
- **Backend**: Node.js, Express.js, MongoDB (Mongoose), Socket.io, Winston, Helmet, CORS
- **DevOps**: Docker, Docker Compose, GitHub Actions (CI/CD, Security Scans, Releases)

---

## 📂 Project Architecture

```
├── .github/workflows/       # CI/CD pipelines (CI, CD, Security, Release)
├── Backend/                 # Express backend API
│   ├── config/             # DB & Cloudinary configs
│   ├── controllers/        # Business logic controllers
│   ├── middlewares/        # Authentication, Rate limits, File uploads
│   ├── models/             # Mongoose schemas (11 models)
│   ├── routes/             # REST endpoints routing
│   ├── services/           # Cloudinary & Notification broadcast service
│   ├── tests/              # API Integration tests (Supertest + Jest)
│   └── server.js           # Server entry point (HTTP & WebSockets)
├── Frontend/                # React Vite dashboard
│   ├── src/
│   │   ├── api/            # Axios client, interceptors, and service wrappers
│   │   ├── components/     # UI elements, navbar, sidebar, layout
│   │   ├── context/        # Socket & Auth context hooks
│   │   ├── pages/          # Feature dashboards, calendar, vault, call room
│   │   ├── redux/          # Global store & authSlice state
│   │   └── tests/          # Component & page unit tests (Vitest)
└── docker-compose.yml       # Production docker orchestration
```

---

## 📋 API Documentation

### 🔒 Authentication (Prefix: `/api/auth`)
| Method | Route | Request Payload | Description |
| :--- | :--- | :--- | :--- |
| **POST** | `/register` | `{ name, email, password, role }` | Create new credentials. Returns access token |
| **POST** | `/login` | `{ email, password }` | Authenticates credentials (triggers 2FA email if active) |
| **POST** | `/verify-2fa`| `{ email, code }` | Validate 6-digit OTP code to complete login |
| **POST** | `/forgot-password`| `{ email }` | Dispatches reset password OTP code to registered address |
| **POST** | `/reset-password`| `{ email, code, newPassword }` | Validate reset code and update password |
| **POST** | `/logout` | *None* | Clears secure HTTPOnly cookie refresh token |

### 👤 Profile (Prefix: `/api/profiles`)
| Method | Route | Request Payload | Description |
| :--- | :--- | :--- | :--- |
| **GET** | `/me` | *None* | Get profile metadata of logged-in user |
| **GET** | `/` | *Query: `?role=investor`* | Get all profiles with optional role filter |
| **PUT** | `/me` | `{ bio, startupName, fundingTarget, ... }` | Update user profile |
| **POST** | `/avatar` | `FormData: { avatar: file }` | Upload profile image to Cloudinary storage |

### 📅 Meetings (Prefix: `/api/meetings`)
| Method | Route | Request Payload | Description |
| :--- | :--- | :--- | :--- |
| **POST** | `/` | `{ title, description, startTime, endTime, attendee }` | Create meeting (validates timezone & checks conflicts) |
| **GET** | `/` | *None* | Get all user scheduled meetings |
| **PUT** | `/:id/status`| `{ status: 'accepted' \| 'rejected' \| 'cancelled' }` | Update state transitions. Auto-generates WebRTC room link if accepted |

### 📄 Documents (Prefix: `/api/documents`)
| Method | Route | Request Payload | Description |
| :--- | :--- | :--- | :--- |
| **POST** | `/` | `FormData: { document: file, title }` | Upload file. Performs magic bytes inspection & stores in Cloudinary |
| **GET** | `/` | *None* | Get user owned and shared documents |
| **GET** | `/:id/versions`| *None* | Get full iteration revision logs |
| **POST** | `/:id/sign` | `{ signatureImage: "data:image/png;base64,...", signerNote }` | Base64 signature buffer uploaded and registered to document |

### 💳 Payments (Prefix: `/api/payments`)
| Method | Route | Request Payload | Description |
| :--- | :--- | :--- | :--- |
| **GET** | `/balance` | *None* | Fetch ledger accounting balance statement (Available, Pending, Total) |
| **GET** | `/ledger` | *None* | Get user payment transaction lists |
| **POST** | `/intent` | `{ amount, currency, recipientId, description }` | Initialize transaction intent |
| **POST** | `/confirm`| `{ transactionId }` | Complete sandbox ledger transfer & notify users |

---

## 🛠️ Local Installation & Run

### Method 1: Bare Metal
1. **Database Setup**: Make sure a local instance of MongoDB is running, or have a cluster URL ready.
2. **Environment File**: Configure environment variables in `Backend/.env`.
3. **Run Backend**:
   ```bash
   cd Backend
   npm install
   npm run dev
   ```
4. **Run Frontend**:
   ```bash
   cd Frontend
   npm install
   npm run dev
   ```
5. **Access Application**: Open [http://localhost:5173](http://localhost:5173) in your browser.

### Method 2: Docker Compose
1. Ensure Docker Desktop is installed and running.
2. Boot the full stack container pipeline in the root directory:
   ```bash
   docker compose up --build
   ```
3. Frontend will be accessible at [http://localhost:80](http://localhost:80), Backend API at [http://localhost:5000](http://localhost:5000).

---

## 🧪 Testing Suites
- **Backend integration**: Run Jest API route assertions:
  ```bash
  cd Backend
  npm test
  ```
- **Frontend assertions**: Run Vitest component rendering checks:
  ```bash
  cd Frontend
  npm test
  ```

---

## 🌐 Production Deployment Plan

This application is designed to be easily deployed to **Vercel** (for the React Frontend) and **Render** (for the Express Backend).

### 1. Render Deployment (Backend Service)
Since our backend relies on long-running TCP Socket connections for chat messages and WebRTC signaling, Render's **Web Service** type is the best fit.

1. **Create Web Service**:
   - Link your GitHub Repository to Render.
   - Choose the root branch (e.g., `main`).
   - Set the **Root Directory** as `Backend`.
   - Set the **Build Command** as `npm install`.
   - Set the **Start Command** as `node server.js`.
2. **Configure Environment Variables**:
   Inside Render's environment config dashboard, add the following parameters:
   - `PORT`: `5000`
   - `NODE_ENV`: `production`
   - `FRONTEND_URL`: `https://your-vercel-deployment.vercel.app`
   - `MONGODB_URI`: `mongodb+srv://<db_username>:<db_password>@cluster.mongodb.net/nexus`
   - `JWT_SECRET`: `your_jwt_secret_token`
   - `REFRESH_SECRET`: `your_jwt_refresh_token`
   - `SESSION_SECRET`: `your_session_secret`
   - `COOKIE_SECURE`: `true`
   - `CLOUDINARY_CLOUD_NAME`: `your_cloudinary_cloud_name`
   - `CLOUDINARY_API_KEY`: `your_cloudinary_api_key`
   - `CLOUDINARY_API_SECRET`: `your_cloudinary_api_secret`
   - `STRIPE_PUBLISHABLE_KEY`: `pk_test_your_stripe_publishable_key`
   - `STRIPE_SECRET_KEY`: `sk_test_your_stripe_secret_key`
   - `STRIPE_WEBHOOK_SECRET`: `whsec_your_stripe_webhook_secret`
   - `SMTP_HOST`: `smtp.gmail.com`
   - `SMTP_PORT`: `587`
   - `SMTP_USER`: `your_gmail_user@gmail.com`
   - `SMTP_PASS`: `your_gmail_app_password`
   - `FROM_EMAIL`: `your_gmail_user@gmail.com`

### 2. Vercel Deployment (Frontend React App)
1. **Create Vercel Project**:
   - Sign in to Vercel, import your GitHub Repository.
   - Set the **Root Directory** as `Frontend`.
   - Set the **Framework Preset** to `Vite`.
   - Set the **Build Command** as `npm run build`.
   - Set the **Output Directory** as `dist`.
2. **Configure Environment Variables**:
   Add the following environment variable to the Vercel Dashboard:
   - `VITE_API_URL`: `https://your-render-backend-service-url.onrender.com/api`
3. **Configure Rewrites (SPA Routing Support)**:
   Since Vite uses client-side routing, add a `vercel.json` in your `Frontend` folder to redirect all route entries back to `index.html`:
   ```json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```
