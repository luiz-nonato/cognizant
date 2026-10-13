# BusinessFlow web — Week 3 static build served by nginx (localhost packaging).
# Do NOT bake VITE_API_BEARER_TOKEN into images for any non-local use (SEC-H2).
FROM node:22.14.0-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Browser-reachable API on host loopback (Compose maps api to 127.0.0.1:8000).
ARG VITE_API_BASE_URL=http://127.0.0.1:8000
ARG VITE_CURRENCY_CODE=USD
ARG VITE_USE_MOCK=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_CURRENCY_CODE=$VITE_CURRENCY_CODE \
    VITE_USE_MOCK=$VITE_USE_MOCK

RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
