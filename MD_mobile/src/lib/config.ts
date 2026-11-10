// URL do back-end Node. Definida em .env (dev) ou eas.json (build).
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000").replace(/\/+$/, "");
