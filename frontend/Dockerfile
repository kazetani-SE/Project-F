# ============================================================================
# Stage 1: Build React + TypeScript + Vite SPA
# ============================================================================
FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL=/api/v1
ARG VITE_SUPABASE_URL=
ARG VITE_SUPABASE_PUBLISHABLE_KEY=
ARG VITE_USE_MOCK=false
ARG VITE_MOCK_STORAGE=false

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
    VITE_USE_MOCK=$VITE_USE_MOCK \
    VITE_MOCK_STORAGE=$VITE_MOCK_STORAGE

RUN npm run build

# ============================================================================
# Stage 2: Serve SPA & reverse-proxy /api to Backend via Nginx
# ============================================================================
FROM nginx:1.27-alpine AS runtime

RUN rm -f /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:80/healthz > /dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
