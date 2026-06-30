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
      const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SERVICE_ROLE_KEY") ?? "");

      const sendMessage = async (pesan: string) => {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: pesan, parse_mode: "HTML" })
        });
      };

      // 1. ROUTING: /start
      if (text.startsWith("/start")) {
        const welcomeText = 
          "🤖 <b>Halo! Saya Bot ClassHub.</b>\n\n" +
          "<b>📌 Menu:</b>\n" +
          "/jadwal - Jadwal tetap mingguan\n" +
          "/tugas - Daftar tugas\n" +
          "/pengumuman - Pengumuman terbaru\n" +
          "/pengganti - Jadwal kelas pengganti\n" +
          "/spin - Spin Wheel";
        await sendMessage(welcomeText);
      }

      // 2. ROUTING: /tugas (Tabel: assignments)
      else if (text.startsWith("/tugas")) {
        const { data: tugasData } = await supabase.from("assignments").select("title, deadline, courses(name)").order("deadline", { ascending: true }).limit(5);
        let balasan = "📝 <b>Daftar Tugas Aktif:</b>\n\n";
        balasan += tugasData?.length ? tugasData.map((i, idx) => `${idx + 1}. <b>${i.title}</b> (${i.courses?.name})\n📅 Deadline: ${new Date(i.deadline).toLocaleDateString('id-ID', { dateStyle: 'full' })}`).join("\n\n") : "Tidak ada tugas aktif.";
        await sendMessage(balasan);
      }

      // 3. ROUTING: /jadwal (Tabel: weekly_schedules)
      else if (text.startsWith("/jadwal")) {
        const dayEng = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date().getDay()];
        const { data: rutin } = await supabase.from("weekly_schedules").select("*, courses(name), time_slots!weekly_schedules_start_slot_id_fkey(start_time), time_slots!weekly_schedules_end_slot_id_fkey(end_time)").eq("day_of_week", dayEng).eq("is_active", true);
        
        let balasan = "📚 <b>Jadwal Kuliah Hari Ini:</b>\n\n";
        balasan += rutin?.length ? rutin.map(i => `<b>[${i.courses?.name}]</b> [${i.time_slots[0]?.start_time?.slice(0,5)}-${i.time_slots[1]?.end_time?.slice(0,5)}]`).join("\n") : "Tidak ada jadwal rutin hari ini.";
        await sendMessage(balasan);
      }

      // 4. ROUTING: /pengganti (Tabel: calendar_events)
      else if (text.startsWith("/pengganti")) {
        const todayISO = new Date().toISOString().slice(0, 10);
        const { data: pengganti } = await supabase.from("calendar_events").select("notes, courses(name)").eq("event_date", todayISO);
        
        let balasan = "🗓 <b>Jadwal Kelas Pengganti Hari Ini:</b>\n\n";
        balasan += pengganti?.length ? pengganti.map(i => `• <b>${i.courses?.name}:</b> ${i.notes}`).join("\n") : "Tidak ada jadwal kelas pengganti.";
        await sendMessage(balasan);
      }

      // 5. ROUTING: /pengumuman (Tabel: announcements)
      else if (text.startsWith("/pengumuman")) {
        const { data: info } = await supabase.from("announcements").select("title, content").order("created_at", { ascending: false }).limit(3);
        
        let balasan = "📢 <b>Pengumuman Terbaru:</b>\n\n";
        balasan += info?.length ? info.map(i => `<b>${i.title}</b>\n${i.content}`).join("\n\n") : "Tidak ada pengumuman saat ini.";
        await sendMessage(balasan);
      }
      
      // 6. ROUTING: /spin
      else if (text.startsWith("/spin")) {
        const kandidat = ["Aishwa", "Faishal", "Nala", "Obed", "Rifa", "Sulthan", "Diro", "Devon", "Alba", "Yasser", "Nelson", "Dota", "Garra", "Radit", "Divo", "Intan", "Igan"];
        await sendMessage(`🎡 <b>Spin Wheel:</b> Terpilih: <b>${kandidat[Math.floor(Math.random() * kandidat.length)]}</b>!`);
      }
    }
    return new Response("OK", { status: 200 });
  } catch (err) {
    return new Response("OK", { status: 200 });
  }
});