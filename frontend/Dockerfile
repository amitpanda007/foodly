# Stage 1: Build the React application
FROM node:20-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm install
COPY . .

# Build argument for API URL
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Stage 2: Serve the application with a simple Node.js server
FROM node:20-alpine

WORKDIR /app

# Install 'serve' globally or ensure it's in your package.json dependencies and installed
RUN npm install -g serve

# Copy the build artifacts from the builder stage
COPY --from=builder /app/dist ./dist

# Expose the port (3000 in this example)
EXPOSE 3000

# Command to run the serve command to serve static files
CMD ["serve", "-s", "dist", "-l", "3000"]