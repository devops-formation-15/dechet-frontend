// src/environments/environment.prod.ts
export const environment = {
  production: true,

  API_URL: 'https://dechet.46.lebondeveloppeur.net/api',           // ← HTTPS
  GRAPHHOPPER_KEY: '0f520a1f-6282-4995-bb8f-d285c7cb0f11',

  KEYCLOAK_URL: 'https://dechet.46.lebondeveloppeur.net',     // ← HTTPS + /auth
  KEYCLOAK_REALM: 'dechetrealm',
  KEYCLOAK_CLIENT_ID: 'dechet-frontend',
  CHATBOT_URL: 'https://dechet.46.lebondeveloppeur.net'
};
