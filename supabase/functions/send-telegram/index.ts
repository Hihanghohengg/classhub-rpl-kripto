declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    // 1. Menerima payload/data dari aplikasi web ClassHub
    const {
      title = "Pengumuman Baru",
      body = "",
      url = ""
    } = await req.json() as any;

    const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");

    if (!BOT_TOKEN || !CHAT_ID) {
      throw new Error("Telegram Secret belum diset di Supabase.");
    }

    // 2. Format pesan menggunakan HTML agar rapi
    const text = `<b>${title}</b>\n\n${body}\n\n<a href="${url}">Lihat Detail di Web</a>`;

    // 3. Eksekusi pengiriman pesan ke grup Telegram
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: text,
          parse_mode: "HTML",
          disable_web_page_preview: false
        })
      }
    );

    const result = await res.json();

    // 4. Kembalikan status sukses ke aplikasi web
    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Tangkap error jika terjadi kegagalan
    return new Response(
      JSON.stringify({
        success: false,
        error: msg
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }
});