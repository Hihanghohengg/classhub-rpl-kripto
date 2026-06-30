import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

serve(async (req) => {
  try {
    const update = await req.json();

    // Pastikan ini adalah pesan teks dari user
    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";

      // Fungsi bantuan (Helper) untuk mengirim pesan
      const sendMessage = async (pesan: string) => {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: pesan,
            parse_mode: "HTML"
          })
        });
      };

      // 1. ROUTING: Perintah /start
      if (text.startsWith("/start")) {
        const welcomeText = "🤖 <b>Halo! Saya Bot ClassHub RPL Kriptografi.</b>\n\nPerintah yang tersedia:\n/jadwal - Lihat jadwal hari ini\n/tugas - Lihat daftar tugas";
        await sendMessage(welcomeText);
      }
      
      // 2. ROUTING: Perintah /tugas
      else if (text.startsWith("/tugas")) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseKey = Deno.env.get("SERVICE_ROLE_KEY") ?? "";
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: tugasData, error } = await supabase
          .from("tugas") 
          .select("nama_tugas, deadline, deskripsi")
          .order("deadline", { ascending: true }) 
          .limit(5);

        let balasan = "📝 <b>Daftar Tugas Aktif:</b>\n\n";

        if (error || !tugasData || tugasData.length === 0) {
          balasan += "<i>Saat ini tidak ada tugas aktif atau terjadi kesalahan sistem.</i>";
        } else {
          tugasData.forEach((item, index) => {
            balasan += `${index + 1}. <b>${item.nama_tugas}</b>\n`;
            balasan += `📅 Deadline: ${item.deadline}\n`;
            balasan += `ℹ️ Deskripsi: ${item.deskripsi}\n\n`;
          });
        }
        await sendMessage(balasan);
      }

      // 3. ROUTING: Perintah /jadwal
      else if (text.startsWith("/jadwal")) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseKey = Deno.env.get("SERVICE_ROLE_KEY") ?? "";
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: jadwalData, error } = await supabase
          .from("jadwal") 
          .select("mata_pelajaran, jam, dosen")
          .eq("hari", "Senin"); 

        let balasan = "📚 <b>Jadwal Hari Ini:</b>\n\n";
        
        if (error || !jadwalData || jadwalData.length === 0) {
          balasan += "<i>Tidak ada jadwal untuk hari ini atau terjadi kesalahan.</i>";
        } else {
          jadwalData.forEach((item, index) => {
            balasan += `${index + 1}. <b>${item.mata_pelajaran}</b> (${item.jam})\n`;
            balasan += `👨‍🏫 Dosen: ${item.dosen}\n\n`;
          });
        }
        await sendMessage(balasan);
      }
    }

    return new Response("OK", { status: 200 });

  } catch (err) {
    console.error("Webhook Error:", err.message);
    return new Response("OK", { status: 200 });
  }
});