FROM node:20 AS build
WORKDIR /app
ARG CHATBOT_URL=https://dechet.46.lebondeveloppeur.net
ARG ENVIRONMENT=production
ARG API_URL=https://dechet.46.lebondeveloppeur.net/api
ARG KEYCLOAK_URL=https://dechet.46.lebondeveloppeur.net
ENV ENVIRONMENT=${ENVIRONMENT}
ENV CHATBOT_URL=${CHATBOT_URL}
ENV API_URL=${API_URL}
ENV KEYCLOAK_URL=${KEYCLOAK_URL}

COPY package*.json ./
RUN npm install --force

COPY . .
RUN npm run build -- --configuration=${ENVIRONMENT}

FROM nginx:alpine-slim
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
