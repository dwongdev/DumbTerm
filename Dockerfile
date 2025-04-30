FROM node:20-bullseye-slim

# Install additional terminal utilities and prerequisites
RUN apt-get update && apt upgrade -y && apt-get install -y \
    apt-utils \
    curl \
    wget \
    ssh \
    git \
    vim \
    nano \
    htop \
    net-tools \
    iputils-ping \
    fontconfig \
    unzip \
    locales \
    traceroute \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Configure locales
RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && \
    locale-gen en_US.UTF-8 && \
    update-locale LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8

# Set environment variables for locale
ENV LANG=en_US.UTF-8 \
    LANGUAGE=en_US:en \
    LC_ALL=en_US.UTF-8

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