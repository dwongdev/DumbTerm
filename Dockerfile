FROM node:20-bullseye

# Install additional terminal utilities and prerequisites for Starship
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
    fontconfig \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Starship
RUN curl -sS https://starship.rs/install.sh | sh -s -- --yes

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy entrypoint script first and set permissions
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

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
ENTRYPOINT ["/entrypoint.sh"]
CMD ["npm", "start"]