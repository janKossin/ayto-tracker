#!/bin/bash

# Pull the latest changes from git
git pull

# Rebuild and restart the containers
docker compose up -d --build
