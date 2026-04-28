# WeDecide

**WeDecide** is a high-performance, real-time social prediction platform where users engage in market forecasting, earn reputation based on accuracy, and participate in community-driven insights. Built with a focus on speed, aesthetics, and user engagement.

## 🚀 Key Features

- **Real-Time Prediction Markets**: Dynamic odds and probability tracking powered by a specialized Market Maker service.
- **Market Intelligence Hub**: Automated news integration and AI-driven sentiment analysis for informed decision-making.
- **Social Integration**: Live commenting system, real-time activity feeds, and user reputation scoring.
- **Premium UI/UX**: State-of-the-art "Glassmorphism" design with micro-animations, built for both desktop and mobile excellence.
- **Leaderboards**: Competitive tracking of top predictors with detailed performance metrics.

## 🛠 Tech Stack

- **Frontend**: Next.js (App Router), Tailwind CSS, Framer Motion, Lucide React.
- **Backend**: Fastify (Node.js/TypeScript), Socket.io for ultra-low latency updates.
- **Database**: Supabase (PostgreSQL) with Row Level Security (RLS).
- **Caching/Real-time**: Redis for high-frequency market data and session management.
- **Infrastructure**: Docker & Docker Compose for seamless deployment and scaling.

## 🏗 Project Structure

This project follows a monorepo architecture:

- `apps/web`: Next.js frontend application.
- `apps/api`: Fastify backend service.
- `supabase/`: Database migrations and schema definitions.
- `docker-compose.yml`: Full-stack orchestration.

## 🚦 Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Supabase Account

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/MohitKumar-777/WeDecide.git
   ```

2. **Configure Environment Variables**:
   Create `.env` files in `apps/web` and `apps/api` based on the provided examples.

3. **Spin up services**:
   ```bash
   docker-compose up -d
   ```

4. **Install Dependencies**:
   ```bash
   npm install
   ```

## 📜 License

Private Repository - All Rights Reserved.
