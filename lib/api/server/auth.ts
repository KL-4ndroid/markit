import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type AppApiServerEnv = Record<string, string | undefined>;

export type AppApiActor = {
  actorId: string;
};

export type AppApiAuthenticationResult =
  | {
      ok: true;
      actor: AppApiActor;
    }
  | {
      ok: false;
      code: 'authentication_required' | 'authentication_unavailable';
    };

export type AppApiTokenVerifier = {
  getUser(token: string): Promise<{
    data: { user: { id?: string | null } | null };
    error: unknown | null;
  }>;
};

export type AuthenticateAppApiRequestOptions = {
  env?: AppApiServerEnv;
  verifier?: AppApiTokenVerifier;
};

const MAX_BEARER_TOKEN_LENGTH = 8_192;

export function getAppApiBearerToken(request: Request): string | null {
  const authorization = request.headers.get('authorization');
  if (!authorization) return null;

  const match = /^Bearer\s+([^\s]+)$/i.exec(authorization.trim());
  if (!match) return null;

  const token = match[1];
  return token.length <= MAX_BEARER_TOKEN_LENGTH ? token : null;
}

export function getAppApiSupabasePublicConfig(
  env: AppApiServerEnv = process.env
): { url: string; publicKey: string } | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publicKey = (
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ?? env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )?.trim();

  if (!url || !publicKey) return null;

  try {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === 'https:';
    const isLocalHttp = parsed.protocol === 'http:'
      && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1');
    if (!isHttps && !isLocalHttp) {
      return null;
    }
  } catch {
    return null;
  }

  return { url, publicKey };
}

function createTokenVerifier(env: AppApiServerEnv): AppApiTokenVerifier | null {
  const config = getAppApiSupabasePublicConfig(env);
  if (!config) return null;

  const client = createClient(config.url, config.publicKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return {
    getUser: token => client.auth.getUser(token),
  };
}

export async function authenticateAppApiRequest(
  request: Request,
  options: AuthenticateAppApiRequestOptions = {}
): Promise<AppApiAuthenticationResult> {
  const token = getAppApiBearerToken(request);
  if (!token) {
    return { ok: false, code: 'authentication_required' };
  }

  const verifier = options.verifier ?? createTokenVerifier(options.env ?? process.env);
  if (!verifier) {
    return { ok: false, code: 'authentication_unavailable' };
  }

  try {
    const { data, error } = await verifier.getUser(token);
    const actorId = data.user?.id?.trim();
    if (error || !actorId) {
      return { ok: false, code: 'authentication_required' };
    }

    return {
      ok: true,
      actor: { actorId },
    };
  } catch {
    return { ok: false, code: 'authentication_unavailable' };
  }
}

export function createAppApiUserSupabaseClient(
  request: Request,
  env: AppApiServerEnv = process.env
): SupabaseClient | null {
  const config = getAppApiSupabasePublicConfig(env);
  const token = getAppApiBearerToken(request);
  if (!config || !token) return null;

  return createClient(config.url, config.publicKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}
