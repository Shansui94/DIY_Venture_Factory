# Use official Node.js lightweight image
FROM node:18-slim

# Install system dependencies (some audio tools might need libs, but for pure proxy keep it slim)
# RUN apt-get update && apt-get install -y ...

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy server source
COPY server.js .
# Copy .env if you want to bake it in, but BETTER to set env vars in Cloud Run
# COPY .env . 

# Expose port (Cloud Run sets PORT env var, but good for local docker run)
EXPOSE 8080

# Start command
CMD ["npm", "start"]
