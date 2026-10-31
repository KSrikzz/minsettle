# MinSettle

A modern shared expense tracker and debt settlement platform designed to split group costs and minimize peer-to-peer transactions.



## Features

- **Group Expense Management:** Create groups, invite members with shareable invite codes, and log group expenses.
- **Flexible Splitting Options:** Split costs equally, by percentages, or with custom per-member amounts.
- **Access Control & Permissions:** Only the member who created an expense can edit or delete it; only the group creator can modify or delete group settings.
- **Debt Simplification:** Automatically computes net member balances and calculates the minimal number of peer-to-peer transfers required to clear all debts.
- **Direct UPI Payments:** Generates direct UPI payment links so debtors can pay creditors with one tap through their preferred UPI apps. Payer-restricted settlement confirmation ensures only the member making the transfer can mark it as settled.



## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS, React Router 7
- **Backend:** Node.js, Express, Mongoose
- **Database:** MongoDB
- **Containerization:** Docker, Docker Compose, Nginx



## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose installed



### Option 1: Running with Docker (Recommended)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/<your-username>/MinSettle.git
   cd MinSettle
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```

3. **Start all services:**
   ```bash
   docker compose up --build -d
   ```

4. **Access the application:**
   - **Frontend:** [http://localhost:3000](http://localhost:3000)
   - **Backend API:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

To stop the containers:
```bash
docker compose down
```

## Running Tests

To run the automated test suite for the balance engine and debt simplification services:

```bash
cd backend
npm test
```