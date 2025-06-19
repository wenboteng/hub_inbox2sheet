#!/bin/bash

# Add content deduplication environment variable to .env file
# This script adds the ENABLE_CONTENT_DEDUPLICATION variable if it doesn't exist

ENV_FILE=".env"

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "Creating .env file..."
    touch "$ENV_FILE"
fi

# Check if ENABLE_CONTENT_DEDUPLICATION already exists
if ! grep -q "ENABLE_CONTENT_DEDUPLICATION" "$ENV_FILE"; then
    echo "Adding ENABLE_CONTENT_DEDUPLICATION=true to .env file..."
    echo "" >> "$ENV_FILE"
    echo "# Content deduplication settings" >> "$ENV_FILE"
    echo "ENABLE_CONTENT_DEDUPLICATION=true" >> "$ENV_FILE"
    echo "Added ENABLE_CONTENT_DEDUPLICATION=true to .env file"
else
    echo "ENABLE_CONTENT_DEDUPLICATION already exists in .env file"
fi

echo "Environment variable setup complete!" 