import * as fs from 'fs';
import * as path from 'path';

function getClientsEnvString(): string | undefined {
  // Read .env manually because dotenv truncates multiline strings without double quotes
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const match = envContent.match(/CLIENTS='?(\{[\s\S]*\})'?/);
      if (match) {
        return match[1]; // The raw JSON string
      }
    }
  } catch (e) {
    // Ignore and fallback to process.env
  }
  return process.env.CLIENTS;
}

/**
 * Constructs a standard HotWax URL if not explicitly provided, just like Fulfillment
 */
const resolveUrl = (clientId: string, customUrl?: string): string => {
  if (customUrl) return customUrl;
  return `https://${clientId}.hotwax.io`;
};

export interface ClientConfig {
  clientId: string;
  username?: string;
  password?: string;
  url?: string;
  oms?: string;
  baseUrl: string;
}

/**
 * Retrieves a configuration for a single client
 */
export const getClientConfig = (clientId: string): ClientConfig => {
  if (!clientId) throw new Error('clientId is required.');

  let config: ClientConfig = { clientId, baseUrl: '' };

  // Tier 1: Global CLI Overrides (Highest Priority)
  const baseUrl = process.env.URL;
  const username = process.env.USERNAME;
  const password = process.env.PASSWORD;

  // If ANY of these are provided via CLI/Flat Env, use them and fill gaps from JSON
  if (baseUrl || username || password) {
    config = {
      ...config,
      baseUrl: resolveUrl(clientId, baseUrl),
      username,
      password,
    };
  }

  // Tier 3: Fallback to Structured JSON for missing fields
  const clientsStr = getClientsEnvString();
  if (clientsStr) {
    try {
      // Robustly extract JSON object from the string, ignoring leading/trailing quotes or newlines
      const match = clientsStr.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No JSON object found in CLIENTS env var');
      
      const rawJson = match[0];
      const clientsMap = JSON.parse(rawJson);
      const clientData = clientsMap[clientId] || {};

      config = {
        clientId,
        username: config.username || clientData.username,
        password: config.password || clientData.password,
        url: clientData.url || clientData.baseUrl,
        oms: clientData.oms,
        baseUrl: config.baseUrl || resolveUrl(clientId, clientData.url || clientData.baseUrl)
      };
    } catch (e) {
      console.error(`Configuration [CLIENTS: ${clientId}] - Failed to parse JSON: ${e}`);
    }
  }

  // Ensure we at least have a resolved URL if nothing was found in JSON
  if (!config.baseUrl) {
    config.baseUrl = resolveUrl(clientId);
  }

  return config;
};

/**
 * Discovers all configured clients
 */
export const getAllClients = (): ClientConfig[] => {
  const discoveredIds = new Set<string>();

  const clientsStr = getClientsEnvString();
  if (clientsStr) {
    try {
      const match = clientsStr.match(/\{[\s\S]*\}/);
      if (match) {
        Object.keys(JSON.parse(match[0])).forEach((id) => discoveredIds.add(id));
      }
    } catch (e) {
      console.error('Configuration [CLIENTS] - Failed to parse in getAllClients', e);
    }
  }

  // Fail if no clients are provided
  if (discoveredIds.size === 0) {
    throw new Error('No clients configured. Please define CLIENTS in .env or pass CLI arguments.');
  }

  return Array.from(discoveredIds).map((id) => getClientConfig(id));
};
