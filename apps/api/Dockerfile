FROM node:20-slim

WORKDIR /app

# Copy the entire monorepo
COPY . .

# Install all dependencies for all workspaces
RUN npm install

# Build the API
RUN cd apps/api && npm run build

# Verify build output
RUN ls -la apps/api/dist

# Expose port
EXPOSE 3001

# Set production env
ENV NODE_ENV=production
ENV PORT=3001

# Start the API
WORKDIR /app/apps/api
CMD ["node", "dist/index.js"]
