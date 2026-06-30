// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

serve(async (req) => {
  try {
    const update = await req.json() as any;

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
          .from("assignments")
          .select("title, deadline, description, courses(name)")
          .order("deadline", { ascending: true })
          .limit(5) as any;

        let balasan = "📝 <b>Daftar Tugas Aktif:</b>\n\n";

        if (error || !tugasData || tugasData.length === 0) {
          balasan += "<i>Saat ini tidak ada tugas aktif atau terjadi kesalahan sistem.</i>";
        } else {
          tugasData.forEach((item: any, index: number) => {
            const courseName = item.courses?.name || "Mata Kuliah";
            balasan += `${index + 1}. <b>${item.title}</b> (${courseName})\n`;
            if (item.deadline) {
              const deadlineDate = new Date(item.deadline);
              balasan += `📅 Deadline: ${deadlineDate.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n`;
            }
            if (item.description) {
              balasan += `ℹ️ Deskripsi: ${item.description}\n`;
            }
            balasan += `\n`;
          });
        }
        await sendMessage(balasan);
      }

      // 3. ROUTING: Perintah /jadwal
      else if (text.startsWith("/jadwal")) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseKey = Deno.env.get("SERVICE_ROLE_KEY") ?? "";
        const supabase = createClient(supabaseUrl, supabaseKey);

        const daysMapping: { [key: string]: string } = {
          "sunday": "Minggu",
          "monday": "Senin",
          "tuesday": "Selasa",
          "wednesday": "Rabu",
          "thursday": "Kamis",
          "friday": "Jumat",
          "saturday": "Sabtu"
        };
        const daysInEnglish = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        const todayIndex = new Date().getDay();
        const hariIniEng = daysInEnglish[todayIndex];
        const hariIniIndo = daysMapping[hariIniEng] || "Hari Ini";

        // Query jadwal mingguan rutin
        const { data: jadwalRutin, error: errorRutin } = await supabase
          .from("weekly_schedules")
          .select(`
            room,
            notes,
            courses(name, lecturer),
            start_slot:time_slots!weekly_schedules_start_slot_id_fkey(start_time),
            end_slot:time_slots!weekly_schedules_end_slot_id_fkey(end_time)
          `)
          .eq("day_of_week", hariIniEng)
          .eq("is_active", true) as any;

        // Query jadwal pengganti hari ini
        const todayISO = new Date().toISOString().slice(0, 10);
        const { data: jadwalPengganti, error: errorPengganti } = await supabase
          .from("calendar_events")
          .select(`
            mode,
            room,
            notes,
            courses(name, lecturer),
            start_slot:time_slots!calendar_events_start_slot_id_fkey(start_time),
            end_slot:time_slots!calendar_events_end_slot_id_fkey(end_time),
            custom_start_time,
            custom_end_time
          `)
          .eq("event_date", todayISO) as any;

        let balasan = `📚 <b>Jadwal Hari Ini (${hariIniIndo}, ${todayISO}):</b>\n\n`;

        let adaJadwal = false;

        if (!errorRutin && jadwalRutin && jadwalRutin.length > 0) {
          balasan += "<b>Jadwal Kuliah Rutin:</b>\n";
          jadwalRutin.forEach((item: any, index: number) => {
            const start = item.start_slot?.start_time ? item.start_slot.start_time.slice(0, 5) : "-";
            const end = item.end_slot?.end_time ? item.end_slot.end_time.slice(0, 5) : "-";
            balasan += `${index + 1}. <b>${item.courses?.name || "Mata Kuliah"}</b> (${start} - ${end})\n`;
            balasan += `👨‍🏫 Dosen: ${item.courses?.lecturer || "-"}\n`;
            if (item.room) balasan += `🏫 Ruang: ${item.room}\n`;
            balasan += `\n`;
          });
          adaJadwal = true;
        }

        if (!errorPengganti && jadwalPengganti && jadwalPengganti.length > 0) {
          balasan += "<b>Jadwal Kelas Pengganti:</b>\n";
          jadwalPengganti.forEach((item: any, index: number) => {
            const start = item.start_slot?.start_time ? item.start_slot.start_time.slice(0, 5) : (item.custom_start_time ? item.custom_start_time.slice(0, 5) : "-");
            const end = item.end_slot?.end_time ? item.end_slot.end_time.slice(0, 5) : (item.custom_end_time ? item.custom_end_time.slice(0, 5) : "-");
            balasan += `${index + 1}. <b>${item.courses?.name || "Mata Kuliah"}</b> (${start} - ${end}) [${item.mode === "online" ? "Daring" : "Luring"}]\n`;
            balasan += `👨‍🏫 Dosen: ${item.courses?.lecturer || "-"}\n`;
            if (item.room) balasan += `🏫 Ruang: ${item.room}\n`;
            if (item.notes) balasan += `📝 Catatan: ${item.notes}\n`;
            balasan += `\n`;
          });
          adaJadwal = true;
        }

        if (!adaJadwal) {
          balasan += "<i>Tidak ada jadwal kuliah rutin maupun pengganti untuk hari ini.</i>";
        }

        await sendMessage(balasan);
      }
    }

    return new Response("OK", { status: 200 });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Webhook Error:", msg);
    return new Response("OK", { status: 200 });
  }
});