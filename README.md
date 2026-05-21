# Sovereign Accounting & Management System

Unified accounting and management system for Dormitory, Garage, and Rental Houses.

## Features
- **Dormitory Management:** Multi-dormitory support, floor-based layouts, and automated utility calculation.
- **Garage Management:** Job tracking, status updates, and automated income logging.
- **Rental House Management:** Monthly rent tracking and payment history.
- **Accounting Dashboard:** Global income/expense analysis with SVG charts and CSV/Excel export.
- **Customer Registry:** Centralized tenant/customer management with LINE integration support.
- **LINE OA Integration:** 
  - Automated balance checking ("เช็คยอด").
  - Summary commands ("สรุปวันนี้", "ยอดเงิน").
  - Manual transaction logging via chat.
  - Webhook-driven notifications.

## Quick Start (Docker)
1. **Configure Environment:**
   - Copy `backend/.env.example` to `backend/.env` and fill in your secrets.
   - Copy `frontend/.env.example` to `frontend/.env`.
2. **Start the System:**
   ```bash
   docker-compose up --build
   ```
3. **Access:**
   - Dashboard: `http://localhost:3000`
   - API Docs: `http://localhost:8000/docs`

## Manual Setup
### Backend (FastAPI)
1. `cd backend`
2. `pip install -r requirements.txt`
3. `uvicorn main:app --reload`

### Frontend (Next.js)
1. `cd frontend`
2. `npm install`
3. `npm run dev`

## LINE Webhook Setup
To enable LINE integration:
1. Use `ngrok` or a similar tool to tunnel port 8000.
2. Set the Webhook URL in LINE Developers Console to `https://your-domain.ngrok-free.app/webhook`.
3. Ensure `LINE_CHANNEL_SECRET` and `LINE_CHANNEL_ACCESS_TOKEN` are set in `backend/.env`.
