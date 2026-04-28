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

## 🚀 Deployment

We recommend deploying **WeDecide** using a combination of **Vercel** and **Render** for optimal performance and reliability.

### 1. Backend Deployment (Render)
The backend is Dockerized and ready for [Render](https://render.com).
1. Connect your repository to Render.
2. Render will automatically detect the `render.yaml` file and prompt you to create the **wedecide-api** service.
3. Add the following Environment Variables in the Render dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `UPSTASH_REDIS_URL`
   - `MSG91_AUTH_KEY`
   - `MSG91_TEMPLATE_ID`

### 2. Frontend Deployment (Vercel)
Deploy the Next.js app to [Vercel](https://vercel.com).
1. Import the repository and select `apps/web` as the **Root Directory**.
2. Add these Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_API_URL` (Link to your Render API URL)

## 📜 License

Private Repository - All Rights Reserved.
