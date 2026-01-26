# Use official Node.js lightweight image
FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci

# Copy server source and other necessary files
# Copy source code
COPY . .

# Expose port
EXPOSE 8080

# Start command (uses tsx from dependencies)
CMD ["npm", "start"]
