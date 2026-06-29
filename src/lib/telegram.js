import { supabase } from './supabase.js';

export async function sendTelegramNotification({
  title = '',
  body = '',
  url = ''
}) {
  try {
    const { data, error } = await supabase.functions.invoke(
      'send-telegram',
      {
        body: {
          title,
          body,
          url
        }
      }
    );

    if (error) {
      console.error('Telegram Function Error:', error);
      return false;
    }

    console.log('Telegram Success:', data);
    return true;
  } catch (err) {
    console.error('Telegram Exception:', err);
    return false;
  }
}
