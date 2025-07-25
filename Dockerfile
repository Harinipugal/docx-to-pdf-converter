# Use a Node.js base image that is Debian 11 (bullseye)
FROM node:18-slim-bullseye # Using Node.js 18 LTS (a stable version)

# Set the working directory inside the container
WORKDIR /app

# Install LibreOffice and other necessary system dependencies for headless conversion
# These are the same dependencies we found necessary for the Python version
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libreoffice-writer \
        fonts-liberation \
        unoconv \
        xvfb \
        libfontconfig1 \
        libice6 \
        libsm6 \
        libxrender1 \
        libxtst6 \
        xauth \
        default-jre \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy package.json and package-lock.json (if exists) and install Node.js dependencies
COPY package.json ./
# COPY package-lock.json ./ # Uncomment if you use package-lock.json
RUN npm install --production # Install production dependencies

# Copy all your application files into the container
# This includes server.js, index.html, script.js, style.css etc.
COPY . .

# Expose the port your Node.js app runs on
EXPOSE 5000 # Your Node.js app listens on PORT, which defaults to 5000

# Set environment variables for production
ENV NODE_ENV=production

# Command to run the application
# We start Xvfb and LibreOffice in the background, then run the Node.js server
CMD ["/bin/bash", "-c", " \
    Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 & \
    export DISPLAY=:99 && \
    libreoffice --headless --invisible --nocrashreport --nodefault --nofirststartwizard --nologo --norestore & \
    npm start \
"]