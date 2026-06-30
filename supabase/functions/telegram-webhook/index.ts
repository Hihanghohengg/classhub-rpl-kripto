// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

serve(async (req) => {
  try {
    const update = await req.json() as any;

    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";

      const sendMessage = async (pesan: string) => {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: pesan, parse_mode: "HTML" })
        });
      };

      // 1. ROUTING: Perintah /start
      if (text.startsWith("/start")) {
        const welcomeText = 
          "🤖 <b>Halo! Saya Bot ClassHub.</b>\n\n" +
          "Ada yang bisa saya bantu? Kamu mau lihat apa hari ini?\n\n" +
          "<b>📌 Menu Utama:</b>\n" +
          "/jadwal - Jadwal kuliah hari ini\n" +
          "/tugas - Daftar tugas aktif\n" +
          "/pengumuman - Pengumuman & info kelas pengganti\n\n" +
          "<b>🛠 Lainnya:</b>\n" +
          "/spin - Spin Wheel";
        await sendMessage(welcomeText);
      }

      // 2. ROUTING: Perintah /tugas
      else if (text.startsWith("/tugas")) {
        const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SERVICE_ROLE_KEY") ?? "");
        const { data: tugasData, error } = await supabase
          .from("assignments")
          .select("title, deadline, description, courses(name)")
          .order("deadline", { ascending: true })
          .limit(5);

        let balasan = "📝 <b>Daftar Tugas Aktif:</b>\n\n";
        if (error || !tugasData?.length) balasan += "<i>Tidak ada tugas aktif.</i>";
        else {
          tugasData.forEach((item, index) => {
            balasan += `${index + 1}. <b>${item.title}</b> (${item.courses?.name || "-"})\n`;
            balasan += `📅 Deadline: ${new Date(item.deadline).toLocaleDateString('id-ID', { dateStyle: 'full' })}\n\n`;
          });
        }
        await sendMessage(balasan);
      }

      // 3. ROUTING: Perintah /jadwal & /pengumuman
      else if (text.startsWith("/jadwal") || text.startsWith("/pengumuman")) {
        const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SERVICE_ROLE_KEY") ?? "");
        const todayISO = new Date().toISOString().slice(0, 10);
        const dayEng = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date().getDay()];

        const { data: rutin } = await supabase
          .from("weekly_schedules")
          .select("*, courses(name, lecturer), time_slots!weekly_schedules_start_slot_id_fkey(start_time)")
          .eq("day_of_week", dayEng)
          .eq("is_active", true);

        const { data: pengganti } = await supabase
          .from("calendar_events")
          .select("*, courses(name, lecturer), time_slots!calendar_events_start_slot_id_fkey(start_time)")
          .eq("event_date", todayISO);

        let balasan = `📚 <b>Info Hari Ini (${todayISO}):</b>\n\n`;
        
        balasan += "<b>Jadwal Rutin:</b>\n" + (rutin?.length ? rutin.map((i, idx) => 
          `${idx+1}. ${i.courses?.name} (${i.time_slots?.start_time?.slice(0,5) || "??:??"})`
        ).join("\n") : "Tidak ada jadwal rutin.");
        
        balasan += "\n\n<b>Info Kelas/Pengganti:</b>\n" + (pengganti?.length ? pengganti.map((i, idx) => 
          `${idx+1}. ${i.courses?.name} - ${i.notes || "Tanpa catatan"}`
        ).join("\n") : "Tidak ada info khusus.");
        
        await sendMessage(balasan);
      }
      
      // 4. ROUTING: Perintah /spin
      else if (text.startsWith("/spin")) {
        const kandidat = ["Aishwa", "Faishal", "Nala", "Obed", "Rifa", "Sulthan", "Diro", "Devon", "Alba", "Yasser", "Nelson", "Dota", "Garra", "Radit", "Divo", "Intan", "Igan"];
        const pemenang = kandidat[Math.floor(Math.random() * kandidat.length)];
        await sendMessage(`🎡 <b>Spin Wheel berputar...</b>\n\n🎉 Selamat! Yang terpilih adalah: <b>${pemenang}</b>!`);
      }
    }
    return new Response("OK", { status: 200 });
  } catch (err) {
    return new Response("OK", { status: 200 });
  }
});