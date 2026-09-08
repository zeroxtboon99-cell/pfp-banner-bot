hereimport { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } from "discord.js";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import fs from 'fs';
import path from 'path';
import express from 'express';

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

const app = express();
app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(3000, () => console.log('✅ Web server running'));

const IMAGES_DIR = './images';
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

const mediaStore = new Map();

// ===== اسم السيرفر (عدله هنا) =====
const SERVER_NAME = "𝗨𝗟𝗧𝗥𝗔︱ 𝗣𝗙𝗣'𝙨 & 𝗕𝗔𝗡𝗡𝗘𝗥'𝙨";

// ===== دالة إنشاء البطاقة =====
async function createProfileCard(avatarBuffer, bannerBuffer, username, userId) {
  const canvas = createCanvas(600, 400);
  const ctx = canvas.getContext("2d");

  // خلفية داكنة
  ctx.fillStyle = "#0b0b0e";
  ctx.beginPath();
  ctx.roundRect(0, 0, 600, 400, 16);
  ctx.fill();

  // ===== البانر =====
  if (bannerBuffer) {
    try {
      const bannerImg = await loadImage(bannerBuffer);
      ctx.drawImage(bannerImg, 0, 0, 600, 180);
    } catch {
      ctx.fillStyle = "#2b2d31";
      ctx.fillRect(0, 0, 600, 180);
    }
  } else {
    ctx.fillStyle = "#2b2d31";
    ctx.fillRect(0, 0, 600, 180);
  }

  // ===== الأفاتار =====
  const [ax, ay, asize] = [35, 130, 110];
  ctx.fillStyle = "#0b0b0e";
  ctx.beginPath();
  ctx.arc(ax + asize / 2, ay + asize / 2, asize / 2 + 7, 0, Math.PI * 2);
  ctx.fill();

  if (avatarBuffer) {
    try {
      const avatarImg = await loadImage(avatarBuffer);
      ctx.save();
      ctx.beginPath();
      ctx.arc(ax + asize / 2, ay + asize / 2, asize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(avatarImg, ax, ay, asize, asize);
      ctx.restore();
    } catch {}
  }

  // ===== حالة DND =====
  const [sx, sy] = [ax + asize - 15, ay + asize - 15];
  ctx.fillStyle = "#0b0b0e"; 
  ctx.beginPath(); 
  ctx.arc(sx, sy, 16, 0, Math.PI * 2); 
  ctx.fill();
  ctx.fillStyle = "#f23f43"; 
  ctx.beginPath(); 
  ctx.arc(sx, sy, 11, 0, Math.PI * 2); 
  ctx.fill();
  ctx.fillStyle = "#0b0b0e"; 
  ctx.fillRect(sx - 7, sy - 3, 14, 6);

  // ===== اسم السيرفر (بخط عريض) =====
  ctx.fillStyle = "#FFFFFF"; 
  ctx.font = "bold 26px Sans-Serif"; 
  ctx.textAlign = "center";
  ctx.fillText(SERVER_NAME, 420, 240);

  // ===== اسم المستخدم =====
  ctx.textAlign = "left";
  ctx.fillStyle = "#FFFFFF"; 
  ctx.font = "bold 26px Sans-Serif"; 
  ctx.fillText(username, 35, 310);
  
  // ===== اليوزرنيم =====
  ctx.fillStyle = "#80848E"; 
  ctx.font = "14px Sans-Serif"; 
  ctx.fillText(`@${userId}`, 35, 340);

  return canvas.toBuffer("image/png");
}

// ===== حفظ الصور =====
function saveImage(buffer, filename) {
  const filePath = path.join(IMAGES_DIR, filename);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

// ===== التحقق من الإدارة =====
function isAdmin(member) {
  return member.permissions.has("Administrator");
}

// ===== أوامر البوت =====
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!isAdmin(message.member)) {
    return message.reply("❌ هذا الأمر للإدارة فقط!");
  }

  const command = message.content.trim().toLowerCase();
  const attachments = Array.from(message.attachments.values());

  if (command === "!post") {
    if (attachments.length < 2) {
      return message.reply("⚠️ يرجى إرفاق صورتين: الأولى أفاتار والثانية بانر!");
    }

    try {
      // تحميل الصور
      const avatarRes = await fetch(attachments[0].url);
      const bannerRes = await fetch(attachments[1].url);
      const avatarBuffer = Buffer.from(await avatarRes.arrayBuffer());
      const bannerBuffer = Buffer.from(await bannerRes.arrayBuffer());

      // حفظ الصور الأصلية
      const avatarId = `avatar_${Date.now()}.png`;
      const bannerId = `banner_${Date.now()}.png`;
      saveImage(avatarBuffer, avatarId);
      saveImage(bannerBuffer, bannerId);

      // إنشاء البطاقة
      const cardBuffer = await createProfileCard(
        avatarBuffer, 
        bannerBuffer, 
        message.author.username, 
        message.author.id
      );
      const cardId = `card_${Date.now()}.png`;
      saveImage(cardBuffer, cardId);

      // تخزين الصور للزر (أفاتار + بانر فقط)
      const mediaId = Date.now().toString(36);
      mediaStore.set(mediaId, {
        files: [
          { buffer: avatarBuffer, name: "avatar.png" },
          { buffer: bannerBuffer, name: "banner.png" }
        ]
      });

      // زر التحميل
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`dl|${mediaId}`)
          .setEmoji("📥")
          .setLabel("تحميل")
          .setStyle(ButtonStyle.Primary)
      );

      // إرسال البطاقة
      await message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setImage("attachment://" + cardId)
            .setColor("#8A2BE2")
            .setFooter({ text: `by: ${message.author.username}` })
        ],
        files: [new AttachmentBuilder(cardBuffer, { name: cardId })],
        components: [row]
      });

      await message.delete().catch(() => {});
    } catch (error) {
      console.error(error);
      await message.reply("❌ حدث خطأ!");
    }
  }
});

// ===== زر التحميل =====
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;
  if (!interaction.customId.startsWith("dl|")) return;

  const mediaId = interaction.customId.split("|")[1];
  const data = mediaStore.get(mediaId);

  if (!data) {
    return interaction.reply({ 
      content: "❌ الصور غير موجودة!", 
      ephemeral: true 
    });
  }

  try {
    // ✅ أفاتار + بانر فقط (بدون البطاقة)
    const attachments = data.files.map(f => 
      new AttachmentBuilder(f.buffer, { name: f.name })
    );

    await interaction.reply({
      content: `📥 **الصور المطلوبة:**`,
      files: attachments,
      ephemeral: true
    });

    await interaction.user.send({
      content: "📥 **تفضل الصور في الخاص:**",
      files: attachments
    });

  } catch (error) {
    console.error(error);
    await interaction.reply({ 
      content: "❌ حدث خطأ! تأكد أن الخاص مفتوح.", 
      ephemeral: true 
    });
  }
});

client.once("ready", () => {
  console.log(`✅ Bot is online as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
