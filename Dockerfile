FROM node:22-alpine

WORKDIR /app

# Copy package manifests and npm config, then install dependencies
COPY package*.json .npmrc* ./
RUN npm install --legacy-peer-deps

# Copy full application and database engine
COPY . .

# Build production React bundle into dist/
RUN npm run build

# Ensure persistent database directory exists
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Start unified Express + SQLite WAL production server
CMD ["npm", "start"]
