# Use official Node.js runtime as a base image
FROM node:18

# Set working directory inside container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy rest of the app files
COPY . .

# Build the NestJS application
RUN npm run build

# Set environment variable for Google Cloud
ENV PORT=8080
EXPOSE 8080

# Start the application
CMD ["node", "dist/main.js"]
