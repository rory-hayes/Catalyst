import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1).default("postgresql://postgres:postgres@localhost:5432/blueprint"),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  CRON_SECRET: z.string().default("dev-cron-secret"),
  HUBSPOT_CLIENT_ID: z.string().optional(),
  HUBSPOT_CLIENT_SECRET: z.string().optional(),
  HUBSPOT_SCOPES: z.string().default("crm.objects.deals.read crm.objects.deals.write crm.objects.contacts.read crm.objects.companies.read crm.objects.notes.write"),
  HUBSPOT_OAUTH_REDIRECT_URI: z.string().optional(),
  HUBSPOT_API_BASE_URL: z.string().url().default("https://api.hubapi.com"),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  DEV_USER_EMAIL: z.string().email().default("ae@blueprint.dev"),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  APP_URL: process.env.APP_URL,
  CRON_SECRET: process.env.CRON_SECRET,
  HUBSPOT_CLIENT_ID: process.env.HUBSPOT_CLIENT_ID,
  HUBSPOT_CLIENT_SECRET: process.env.HUBSPOT_CLIENT_SECRET,
  HUBSPOT_SCOPES: process.env.HUBSPOT_SCOPES,
  HUBSPOT_OAUTH_REDIRECT_URI: process.env.HUBSPOT_OAUTH_REDIRECT_URI,
  HUBSPOT_API_BASE_URL: process.env.HUBSPOT_API_BASE_URL,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  DEV_USER_EMAIL: process.env.DEV_USER_EMAIL,
});
