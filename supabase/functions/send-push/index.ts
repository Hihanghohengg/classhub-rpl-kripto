import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function base64UrlEncode(input: ArrayBuffer | string) {
  const bytes =
    typeof input === 'string'
      ? new TextEncoder().encode(input)
      : new Uint8Array(input);

  let binary = '';

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function pemToArrayBuffer(pem: string) {
  const cleanPem = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replaceAll('\n', '')
    .trim();

  const binary = atob(cleanPem);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
}

async function getFirebaseAccessToken() {
  const clientEmail = Deno.env.get('FIREBASE_CLIENT_EMAIL');
  const rawPrivateKey = Deno.env.get('FIREBASE_PRIVATE_KEY');

  if (!clientEmail || !rawPrivateKey) {
    throw new Error('Firebase service account env belum lengkap.');
  }

  const privateKey = rawPrivateKey.replaceAll('\\n', '\n');
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const claim = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaim = base64UrlEncode(JSON.stringify(claim));
  const unsignedJwt = `${encodedHeader}.${encodedClaim}`;

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKey),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsignedJwt)
  );

  const jwt = `${unsignedJwt}.${base64UrlEncode(signature)}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data?.error_description ||
        data?.error ||
        'Gagal mengambil Firebase access token.'
    );
  }

  return data.access_token as string;
}

async function sendToFcm({
  token,
  title,
  body,
  url,
  type
}: {
  token: string;
  title: string;
  body: string;
  url: string;
  type: string;
}) {
  const projectId = Deno.env.get('FIREBASE_PROJECT_ID');

  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID belum diset.');
  }

  const accessToken = await getFirebaseAccessToken();

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: {
          token,
          webpush: {
            notification: {
              title,
              body,
              icon: '/assets/logo.png',
              badge: '/assets/logo.png'
            },
            data: {
              title,
              body,
              url,
              type
            },
            fcm_options: {
              link: url
            }
          }
        }
      })
    }
  );

  const data = await res.json();

  return {
    ok: res.ok,
    status: res.status,
    data
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Method not allowed'
        }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    const {
      title,
      body,
      url = '/',
      type = 'general',
      targetUserIds = null,
      excludeUserId = null
    } = await req.json();

    if (!title || !body) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'title dan body wajib diisi.'
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase env belum lengkap.');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let query = supabase
      .from('notification_tokens')
      .select('id, user_id, token')
      .eq('is_active', true);

    if (Array.isArray(targetUserIds) && targetUserIds.length > 0) {
      query = query.in('user_id', targetUserIds);
    }

    if (excludeUserId) {
      query = query.neq('user_id', excludeUserId);
    }

    const { data: tokens, error: tokenError } = await query;

    if (tokenError) {
      throw new Error(tokenError.message);
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          sent: 0,
          failed: 0,
          message: 'Tidak ada token aktif.'
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    let sent = 0;
    let failed = 0;
    const errors = [];

    for (const item of tokens) {
      const result = await sendToFcm({
        token: item.token,
        title,
        body,
        url,
        type
      });

      if (result.ok) {
        sent += 1;
      } else {
        failed += 1;

        errors.push({
          token_id: item.id,
          status: result.status,
          data: result.data
        });

        const errorCode =
          result.data?.error?.details?.[0]?.errorCode ||
          result.data?.error?.status;

        if (
          errorCode === 'UNREGISTERED' ||
          errorCode === 'INVALID_ARGUMENT' ||
          errorCode === 'NOT_FOUND'
        ) {
          await supabase
            .from('notification_tokens')
            .update({
              is_active: false,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent,
        failed,
        errors
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});