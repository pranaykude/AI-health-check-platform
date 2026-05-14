# HealthCheck — AI Voice Agent

## Module 1: Core Foundation

A foundational CRUD system for managing health check clients, built with Express, MongoDB, and React.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Express.js, Mongoose, express-validator |
| Frontend | React (Vite), TailwindCSS v4 |
| Database | MongoDB (local) |

### Getting Started

#### Prerequisites
- Node.js 18+
- MongoDB running locally on port 27017

#### Backend
```bash
cd server
npm install
npm run dev
```
Server runs on http://localhost:5000

#### Frontend
```bash
cd client
npm install
npm run dev
```
Client runs on http://localhost:5173

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/clients/stats` | Client statistics |
| `GET` | `/api/clients` | List clients (paginated) |
| `GET` | `/api/clients/:id` | Get single client |
| `POST` | `/api/clients` | Create client |
| `PUT` | `/api/clients/:id` | Update client |
| `DELETE` | `/api/clients/:id` | Delete client |

#### Query Parameters (GET /api/clients)
- `page` — Page number (default: 1)
- `limit` — Items per page (default: 20, max: 100)
- `search` — Search by name, phone, or product
- `status` — Filter: `active` or `inactive`
- `language` — Filter: `en` or `hi`
