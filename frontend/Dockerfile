# Multi-stage build: a Node stage compiles the Vite app, then only the
# static dist/ output ships in the final nginx image — the build toolchain
# (node_modules, source, vite) never reaches the served image.

# --- Build stage ---
# Node version matches CI (.github/workflows/ci.yml's frontend job:
# node-version '22').
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite bakes VITE_* env vars into the built JS at build time, not runtime
# (frontend/src/api/axiosConfig.js reads import.meta.env.VITE_GATEWAY_URL,
# frontend/src/lib/firebase.js reads the six VITE_FIREBASE_* vars) — so
# these have to arrive as build ARGs, not container environment variables,
# or the browser bundle would have no way to pick them up.
#
# VITE_GATEWAY_URL specifically MUST be a host-reachable URL (e.g.
# http://localhost:5000/api), not the gateway's compose service name —
# this bundle runs in the user's browser, outside the Docker network
# entirely, unlike the gateway's own DJANGO_API_URL (server-to-server,
# inside the network, correctly using the ml-backend service name).
ARG VITE_GATEWAY_URL
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ENV VITE_GATEWAY_URL=$VITE_GATEWAY_URL \
    VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET \
    VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID

RUN npm run build

# --- Serve stage ---
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
