import { CALENDLY_URL } from './env';
// Stub: later, resolve provider-specific link from DB
export async function resolveCalendlyUrl(providerId?: string): Promise<string> {
  return CALENDLY_URL;
}
