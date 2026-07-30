# Digital Khata

A digital ledger (khata) app for tracking installment sales, customer payments, and receipts, built with an ASP.NET Core API and a React/Vite frontend.

## Tech Stack

- **Backend**: ASP.NET Core 8 Web API, Entity Framework Core, JWT authentication, SQL Server (falls back to an in-memory database for local development)
- **Frontend**: React 18, Vite, Tailwind CSS, TanStack Query, React Hook Form, React Router

## Getting Started

### Frontend

```bash
cd frontend && npm install && npm run dev
```

The app runs at `http://localhost:5173`. It reads its API base URL from `frontend/.env` (`VITE_API_URL`); if that variable is removed, requests fall back to the relative `/api` path, which is proxied to the backend via `vite.config.js`.

### Backend

```bash
cd backend && dotnet restore && dotnet ef database update && dotnet run
```

The API runs at `http://localhost:5000` by default. If `appsettings.json`'s `ConnectionStrings:DefaultConnection` points at `Server=localhost`, the app uses an in-memory database instead of SQL Server, so `dotnet ef database update` is only required when targeting a real SQL Server instance.

### Default login

A seed admin account is created on first run:

- **Username**: `admin`
- **Password**: `admin123`

## Payment Request Flow

1. Customer logs into portal
2. Clicks "Pay Now" on their installment
3. Selects payment method (EasyPaisa/JazzCash/Bank)
4. Transfers money to shop account
5. Uploads transaction screenshot + enters TXN ID
6. Submits request → Status: PENDING
7. Admin receives WhatsApp notification
8. Admin reviews screenshot in admin panel
9. Admin clicks APPROVE → Payment recorded automatically
   OR Admin clicks REJECT → Customer notified with reason
10. Customer receives WhatsApp notification of result

## Project Structure

```
digital-khata/
├── backend/     ASP.NET Core Web API (Controllers, Models, DTOs, Services, Migrations)
└── frontend/    React + Vite SPA (pages, components, hooks, api clients)
```
