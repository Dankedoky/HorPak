# Project Memory - Sovereign Dormitory System

## Project Context
A unified accounting and management system for Dormitory, Garage, and Rental Houses. The system features a FastAPI backend, a Next.js frontend, and LINE OA integration for automated accounting.

## Tech Stack
- **Backend:** FastAPI, SQLAlchemy (PostgreSQL/SQLite), Linebot SDK v3.
- **Frontend:** Next.js 15+, React 19, Tailwind CSS, Lucide Icons.
- **Deployment:** Docker, Docker Compose, Vercel (Frontend).

## Project State
- **Phase 1 (Accounting MVP):** Completed 100%.
- **Phase 2 (Management & Registry):** Completed 100%.
- **Phase 3 (Deployment & Polish):** Completed 100%.

## Key Accomplishments
- ✅ **Full CRUD for Business Units & Customers:** Centralized registry for all tenants and clients.
- ✅ **Automated Financial Ledger:** Transactions are automatically logged from Dormitory payments, Garage jobs, and House rents.
- ✅ **LINE Webhook Integration:** Support for "เช็คยอด", "สรุปวันนี้", and natural language transaction logging.
- ✅ **Premium UI/UX:** Responsive dashboard with SVG charts, real-time filtering, and date-range transaction history.
- ✅ **1-Click LINE OA Billing Dispatcher:** Fully integrated the bulk billing reminders dispatcher directly on the main dashboard modal, complete with success counts and non-linked room listings.
- ✅ **Interactive Maintenance Ticket Dashboard:** Created a stunning Next.js premium, glassmorphic dashboard `/maintenance` protected by auth rules, which allows stateful transitions and updates pushed back to tenant LINEs.
- ✅ **Financial & Ledger Integrity Safeguards:** Dynamic transaction reversal (Ledger Sync) when room, house, garage job, or invoice status is toggled from Paid back to Pending/Unpaid.
- ✅ **Production-Ready SlipOK API Verification:** Integrated live slip verification via SlipOK in backend `/payment/verify-slip/` with duplicate slip check (`transRef` check) and elegant fallback.
- ✅ **Cascade & Orphan Deletion Protection:** Blocked deletion of Customers and Business Units that have associated ledger history, and implemented auto-clean cascades for Garage Jobs.
- ✅ **Production Ready:** Full Dockerization and environment configuration templates.

## Completed Tasks (Recent)
1. **Phase 2 Complete:** Implemented both 1-Click LINE OA Billing Reminders and the Interactive Maintenance Ticket system.
2. **Private Family ERP & Hyper-Automation Blueprint:** Formulated a complete architectural blueprint and roadmap (`erp_roadmap.md`) mapping restricted access control, LINE OA billing notifications (25th - 5th), daily late fines of 100 THB after the 5th, room maintenance ticketing, and real-time family LINE notification systems.
3. **Financial Integrity & Reversal Sync:** Implemented automatic transaction reversals for Rooms, Houses, Garage Jobs, and Invoices.
3. **SlipOK Integration:** Connected the backend verification endpoint to SlipOK API with duplicate detection.
4. **Relational Deletion Protection:** Secured Customers and Business Units from being hard-deleted when they have active financial records.
5. **Customer Management Module:** Built a professional UI for managing customers with full CRUD and search.

## Future Recommendations
1. **Utility Bill Comparison Metrics:** Implement a visual widget comparing the total utility collected from tenants against actual utility expenses paid out to authorities.
2. **Room Occupancy Statuses:** Enforce explicit occupancy statuses (Vacant, Under Cleaning, Booked with Deposit) to ease family communication.
3. **Granular RBAC System:** Establish Role-Based Access Control to partition administrative rights between family owners (full balance views) and property workers.

