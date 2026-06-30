import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  try {
    // 1. Menerima payload/data dari aplikasi web ClassHub
    const {
      title = "Pengumuman Baru",
      body = "",
      url = ""
    } = await req.json();

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
        "Content-Type": "application/json"
      }
    });

  } catch (err) {
    // Tangkap error jika terjadi kegagalan
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
});