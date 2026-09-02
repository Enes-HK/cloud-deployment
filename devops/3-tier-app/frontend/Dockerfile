#stage 1 node
FROM node:20-slim AS builder
WORKDIR /app

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json .
RUN npm ci --silent
COPY . .
RUN npm run build

#stage 2 nginx
FROM nginx:1.27-alpine

COPY --from=builder /app/dist/. /usr/share/nginx/html
# overwrite the standard default.conf file that nginx creates with our own config
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Expose port 80 
EXPOSE 80
