FROM node:20-bullseye

# Install additional terminal utilities
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    ssh \
    git \
    vim \
    nano \
    htop \
    net-tools \
    iputils-ping \
    telnet \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application files
COPY . .

# Create data directory
RUN mkdir -p data

# Build node-pty and copy xterm files
RUN npm run copy-xterm

# Set bash as the default shell
ENV SHELL=/bin/bash

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]