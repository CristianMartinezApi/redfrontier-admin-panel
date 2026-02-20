# Dockerfile para o frontend (panel-admin)
FROM node:18-alpine as build
WORKDIR /app
COPY . .
RUN npm install -g serve
EXPOSE 3000
CMD ["serve", ".", "-l", "3000"]
