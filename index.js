import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import fetch from 'node-fetch';
import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const client = new Client({
  authStrategy: new LocalAuth(),
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
  },
  takeoverOnConflict: true,
  auth: {
    clientId: 'bot-wa-ai'
  },
  loginStrategy: 'pairing'
});

client.on('ready', () => {
  console.log('✅ Bot WA siap digunakan!');
});

client.on('authenticated', () => {
  console.log('✅ Autentikasi berhasil!');
});

client.on('auth_failure', msg => {
  console.error('❌ Autentikasi gagal:', msg);
});

client.on('pairing-code', (code) => {
  console.log('\n📲 Kode Pairing Kamu:\n');
  console.log(`🔐 Pairing Code: ${code}`);
  console.log('\n➡️ Buka WhatsApp > Perangkat Tertaut > Tautkan Perangkat\n');
});

client.on('message', async (msg) => {
  const input = msg.body;
  const sender = msg.from;

  // Anti-link
  if (/(https?:\/\/|wa\.me)/gi.test(input)) {
    msg.reply('❌ Maaf, link tidak diperbolehkan.');
    return;
  }

  // Download YouTube
  if (input.startsWith('!yt ')) {
    msg.reply('⏳ Sedang mendownload video YouTube...');
    const media = await downloadVideo(input.slice(4), 'yt');
    return media ? msg.reply(media) : msg.reply('❌ Gagal download video.');
  }

  // Download Instagram
  if (input.startsWith('!ig ')) {
    msg.reply('⏳ Sedang mendownload video Instagram...');
    const media = await downloadVideo(input.slice(4), 'ig');
    return media ? msg.reply(media) : msg.reply('❌ Gagal download video.');
  }

  // Download TikTok
  if (input.startsWith('!tt ')) {
    msg.reply('⏳ Sedang mendownload video TikTok...');
    const media = await downloadVideo(input.slice(4), 'tt');
    return media ? msg.reply(media) : msg.reply('❌ Gagal download video.');
  }

  // Deteksi pesan pertama (welcome)
  const chat = await msg.getChat();
  if (!chat.isGroup && chat.messages.size === 1) {
    await msg.reply('👋 Hai! Saya bot AI. Ketik pertanyaanmu atau kirim `menu` untuk tombol.');
  }

  // Tombol interaktif
  if (input.toLowerCase() === 'menu') {
    await client.sendMessage(sender, '📋 Menu Utama:', {
      buttons: [
        { body: '💬 Tanya AI', id: 'ask_ai' },
        { body: '❌ Stop', id: 'stop' },
        { body: 'ℹ️ Info', id: 'info' }
      ],
      title: 'WhatsApp Bot AI',
      footer: 'Pilih salah satu tombol:'
    });
    return;
  }

  // Respon tombol
  if (msg.type === 'buttons_response') {
    if (msg.selectedButtonId === 'ask_ai') {
      msg.reply('Silakan kirim pertanyaan kamu 🤖');
      return;
    }
    if (msg.selectedButtonId === 'stop') {
      msg.reply('Bot dihentikan. Ketik "menu" untuk mulai lagi.');
      return;
    }
    if (msg.selectedButtonId === 'info') {
      msg.reply('Saya adalah bot AI yang menggunakan teknologi ChatGPT dan pairing WhatsApp.');
      return;
    }
  }

  // ChatGPT AI
  const response = await getChatGPTResponse(input);
  if (response) {
    msg.reply(response);
  } else {
    msg.reply('❌ Maaf, saya tidak bisa menjawab saat ini.');
  }
});

client.initialize();

// ==== Fungsi OpenAI ====
async function getChatGPTResponse(message) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: 'POST',
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "Kamu adalah asisten WhatsApp AI yang ramah dan membantu." },
          { role: "user", content: message }
        ]
      })
    });

    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.error('❌ Error dari OpenAI:', err);
    return null;
  }
}

// ==== Fungsi Download Video ====
async function downloadVideo(url, type) {
  try {
    let apiURL;
    if (type === 'yt') {
      apiURL = `https://api.dhamzxploit.my.id/api/youtube?url=${encodeURIComponent(url)}`;
    } else if (type === 'ig') {
      apiURL = `https://api.dhamzxploit.my.id/api/igdl?url=${encodeURIComponent(url)}`;
    } else if (type === 'tt') {
      apiURL = `https://api.dhamzxploit.my.id/api/tiktok?url=${encodeURIComponent(url)}`;
    }

    const res = await axios.get(apiURL);
    const videoURL = type === 'tt' ? res.data.result.video : res.data.result[0]?.url;
    if (!videoURL) return null;

    const videoRes = await axios.get(videoURL, { responseType: 'arraybuffer' });
    const filePath = path.join(__dirname, 'video.mp4');
    fs.writeFileSync(filePath, videoRes.data);

    const media = await MessageMedia.fromFilePath(filePath);
    return media;
  } catch (err) {
    console.error('❌ Error saat download:', err.message);
    return null;
  }
              }
