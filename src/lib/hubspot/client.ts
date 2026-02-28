import { env } from "@/lib/config/env";

export type HubSpotErrorCode =
  | "permission_missing"
  | "rate_limited"
  | "validation_failed"
  | "network_timeout"
  | "unknown";

export class HubSpotConnectorError extends Error {
  code: HubSpotErrorCode;

  constructor(message: string, code: HubSpotErrorCode) {
    super(message);
    this.code = code;
    this.name = "HubSpotConnectorError";
  }
}

export interface HubSpotDealRecord {
  id: string;
  properties: Record<string, string | null>;
}

interface HubSpotLocalDevRefreshResponse {
  oauthAccessToken: string;
  expiresAtMillis: number;
  scopeGroups?: string[];
}

const HUBSPOT_TIMEOUT_MS = 15_000;

async function hubspotFetch<T>(
  path: string,
  token: string,
  init: RequestInit,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HUBSPOT_TIMEOUT_MS);

  try {
    const response = await fetch(`${env.HUBSPOT_API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });

    if (!response.ok) {
      const body = await response.text();

      if (response.status === 429) {
        throw new HubSpotConnectorError(`HubSpot rate limit reached: ${body}`, "rate_limited");
      }

      if (response.status === 400 || response.status === 422) {
        throw new HubSpotConnectorError(`HubSpot validation failed: ${body}`, "validation_failed");
      }

      if (response.status === 401 || response.status === 403) {
        throw new HubSpotConnectorError(`HubSpot permission missing: ${body}`, "permission_missing");
      }

      throw new HubSpotConnectorError(`HubSpot request failed (${response.status}): ${body}`, "unknown");
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof HubSpotConnectorError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new HubSpotConnectorError("HubSpot request timeout", "network_timeout");
    }

    throw new HubSpotConnectorError("HubSpot unknown failure", "unknown");
  } finally {
    clearTimeout(timeout);
  }
}

export async function getDealById(token: string, crmDealId: string): Promise<HubSpotDealRecord> {
  const properties = [
    "dealname",
    "amount",
    "closedate",
    "dealstage",
    "pipeline",
    "hs_next_step",
    "hs_lastmodifieddate",
    "hs_lastactivitydate",
  ].join(",");

  const response = await hubspotFetch<HubSpotDealRecord>(
    `/crm/v3/objects/deals/${crmDealId}?properties=${encodeURIComponent(properties)}`,
    token,
    { method: "GET" },
  );

  return response;
}

export async function updateDealProperties(
  token: string,
  crmDealId: string,
  properties: Record<string, string | null>,
): Promise<HubSpotDealRecord> {
  return hubspotFetch<HubSpotDealRecord>(`/crm/v3/objects/deals/${crmDealId}`, token, {
    method: "PATCH",
    body: JSON.stringify({ properties }),
  });
}

export async function createDealNote(
  token: string,
  params: {
    crmDealId: string;
    body: string;
    timestamp: string;
  },
): Promise<{ id: string }> {
  return hubspotFetch<{ id: string }>(`/crm/v3/objects/notes`, token, {
    method: "POST",
    body: JSON.stringify({
      properties: {
        hs_note_body: params.body,
        hs_timestamp: params.timestamp,
      },
      associations: [
        {
          to: { id: params.crmDealId },
          types: [
            {
              associationCategory: "HUBSPOT_DEFINED",
              associationTypeId: 214,
            },
          ],
        },
      ],
    }),
  });
}

export async function listRecentDealActivities(
  token: string,
  crmDealId: string,
): Promise<Array<{ id: string; body: string; createdAt: string }>> {
  const response = await hubspotFetch<{
    results: Array<{ id: string; properties: { hs_note_body?: string; hs_timestamp?: string } }>;
  }>(
    `/crm/v3/objects/deals/${crmDealId}/associations/notes`,
    token,
    { method: "GET" },
  );

  return response.results.map((result) => ({
    id: result.id,
    body: result.properties.hs_note_body ?? "",
    createdAt: result.properties.hs_timestamp ?? new Date().toISOString(),
  }));
}

export async function refreshAccessTokenFromPersonalAccessKey(params: {
  encodedOAuthRefreshToken: string;
  portalId?: number;
}): Promise<{
  accessToken: string;
  expiresAt: Date;
  scopes: string[];
}> {
  const response = await fetch(`${env.HUBSPOT_API_BASE_URL}/localdevauth/v1/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      encodedOAuthRefreshToken: params.encodedOAuthRefreshToken,
      ...(params.portalId ? { portalId: params.portalId } : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.text();

    if (response.status === 400 || response.status === 401 || response.status === 403) {
      throw new HubSpotConnectorError(`HubSpot token refresh failed: ${body}`, "permission_missing");
    }

    throw new HubSpotConnectorError(`HubSpot token refresh failed (${response.status}): ${body}`, "unknown");
  }

  const data = (await response.json()) as HubSpotLocalDevRefreshResponse;
  return {
    accessToken: data.oauthAccessToken,
    expiresAt: new Date(data.expiresAtMillis),
    scopes: data.scopeGroups ?? [],
  };
}
