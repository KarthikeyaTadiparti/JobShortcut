# Job Shortcut

Job Shortcut is a job search and tracking portal designed to help users discover active job opportunities and allow administrators to manage listings.

## 🚀 Features
* **User Job Board**: Search, filter, and view live job opportunities (Freshers, Experienced, Remote).
* **Admin Dashboard**: Secure administrative panel to log in, add, edit, and delete job postings.
* **Responsive UI**: Sleek, modern, and fully animated interface optimized for desktop and mobile devices.

---

## 🛠️ Tech Stack

### Frontend
* **Framework**: React 19, Vite 8, TypeScript
* **Styling**: Tailwind CSS v4, shadcn/ui, Radix UI Primitives, Framer Motion
* **State Management**: Redux Toolkit, Redux Persist
* **API Fetching**: TanStack React Query

### Backend
* **Runtime & Framework**: Node.js, Express (v5), TypeScript (ES Modules)
* **Database & ORM**: PostgreSQL, Drizzle ORM, Drizzle Kit

---

## 📂 Project Structure
* `frontend/` - React single-page application.
* `backend/` - Node.js Express server and Drizzle DB schemas.

---

## 💻 Getting Started

### Prerequisites
* Node.js (v20+)
* PostgreSQL Database

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/KarthikeyaTadiparti/JobShortcut.git
   cd JobShortcut
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables in both `frontend/.env` and `backend/.env` (refer to `.env.example` inside those folders).

### Running Locally
You can run the application using the following commands from the root directory:

* Run the backend dev server:
  ```bash
  npm run server
  ```
* Run the frontend dev client:
  ```bash
  npm run client
  ```
* Launch Drizzle Studio database viewer:
  ```bash
  npm run studio
  ```
