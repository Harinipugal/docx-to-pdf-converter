FROM node:lts-bullseye

# Set working directory
WORKDIR /app

# Install LibreOffice and required dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libreoffice \
        xvfb \
        xauth \
        default-jre \
        libxrender1 \
        libxtst6 \
        libfontconfig1 \
        fonts-liberation \
        libice6 \
        libsm6 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy only package files first for layer caching
COPY package*.json ./

# Install production dependencies
RUN npm install --production

# Copy the rest of the application
COPY . .

# Set environment
ENV NODE_ENV=production
ENV DISPLAY=:99

# Expose backend port
EXPOSE 5000

# Final command: Start virtual framebuffer, LibreOffice (once), and Node server
CMD bash -c "Xvfb :99 -screen 0 1024x768x24 & npm start"
