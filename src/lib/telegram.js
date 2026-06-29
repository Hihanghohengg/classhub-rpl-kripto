import { supabase } from './supabase.js';

export async function sendTelegramNotification(payload) {
  try {
    const { error } = await supabase.functions.invoke('send-telegram', {
      body: payload
    });

    if (error) {
      console.error('Telegram Error:', error);
    }
  } catch (err) {
    console.error(err);
  }
}