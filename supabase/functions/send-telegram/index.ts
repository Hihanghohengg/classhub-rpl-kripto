import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

serve(async (req) => {
  try {
    const update = await req.json();

    // Pastikan ini adalah pesan teks biasa
    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text;

      // 1. Cek apakah teks diawali dengan command /jadwal
      if (text.startsWith("/jadwal")) {
        
        // 2. Koneksi ke Database Supabase
        // Menggunakan SUPABASE_URL bawaan sistem dan SERVICE_ROLE_KEY yang baru diset
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseKey = Deno.env.get("SERVICE_ROLE_KEY") ?? "";
        const supabase = createClient(supabaseUrl, supabaseKey);

        // 3. Ambil data jadwal dari tabel
        const { data: jadwalData, error } = await supabase
          .from("jadwal") 
          .select("mata_pelajaran, jam, dosen")
          .eq("hari", "Senin"); 

        // 4. Format pesan balasan
        let balasan = "📚 <b>Jadwal Hari Ini:</b>\n\n";
        
        if (error || !jadwalData || jadwalData.length === 0) {
          balasan += "<i>Tidak ada jadwal untuk hari ini atau terjadi kesalahan.</i>";
        } else {
          jadwalData.forEach((item, index) => {
            balasan += `${index + 1}. <b>${item.mata_pelajaran}</b> (${item.jam})\n`;
            balasan += `👨‍🏫 Dosen: ${item.dosen}\n\n`;
          });
        }

        // 5. Kirim balasan kembali ke Grup Telegram
        const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: balasan,
            parse_mode: "HTML"
          })
        });
      }
    }

    // WAJIB mengembalikan status 200 OK ke Telegram agar webhook tidak di-spam
    return new Response("OK", { status: 200 });

  } catch (err) {
    console.error("Webhook Error:", err.message);
    // Tetap kembalikan 200 OK saat error agar Telegram berhenti mengirim ulang permintaan
    return new Response("OK", { status: 200 });
  }
});