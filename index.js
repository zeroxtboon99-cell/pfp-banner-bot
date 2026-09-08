import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } from "discord.js";
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

const BADGES = [
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iJTIzNTg2NWYyIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIvPjx0ZXh0IHg9IjEyIiB5PSIxNiIgZm9udC1zaXplPSI4IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk48L3RleHQ+PC9zdmc+",
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iJTIzZjQ3ZmZmIj48cGF0aCBkPSJNMTIgMmwyLjQgNy40SDIybC02IDQuNSAyLjMgNy4xLTYuMy00LjYtNi4zIDQuNiAyLjMtNy4xLTYtNC41aDcuNnoiLz48L3N2Zz4=",
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vbmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iJTIzNTdmMjg3Ij48cGF0aCBkPSJNOS40IDE2LjZMNC44IDEybDQuNi00LjZMOCA2bC02IDYgNiA2IDEuNC0xLjR6bTUuMiAwbDQuNi00LjYtNC42LTQuNkwxNiA2bDYgNi02IDYtMS40LTEuNHoiLz48L3N2Zz4=",
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iJTIzOWI1OWI2Ij48cGF0aCBkPSJNMTIgMkw0IDV2NmMwIDUuNTUgMy44NCAxMC43NCA4IDEyIDQuMTYtMS4yNiA4LTUuNDUgOC0xMlY1bC04LTN6bTAgNEwxNiAxMGgtM3Y2aC0ydi02SDhsNC00eiIvPjwvc3ZnPg=="
];

async function createProfileCard(avatarBuffer, bannerBuffer, username, userId) {
  const canvas = createCanvas(600, 400);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#0b0b0e";
  ctx.beginPath();
  ctx.roundRect(0, 0, 600, 400, 16);
  ctx.fill();

  if (bannerBuffer) {
    try {
      const bannerImg = await loadImage(bannerBuffer);
      ctx.drawImage(bannerImg, 0, 0, 600, 210);
    } catch {
      ctx.fillStyle = "#2b2d31";
      ctx.fillRect(0, 0, 600, 210);
    }
  } else {
    ctx.fillStyle = "#2b2d31";
    ctx.fillRect(0, 0, 600, 210);
  }

  const [ax, ay, asize] = [35, 155, 110];
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

  const boxX = 400, boxY = 225, boxW = 170, boxH = 40;
  ctx.fillStyle = "#111214";
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 8);
  ctx.fill();

  let bx = boxX + 10;
  for (const b64 of BADGES) {
    try {
      const img = await loadImage(b64);
      ctx.drawImage(img, bx, boxY + 8, 24, 24);
    } catch {}
    bx += 31;
  }

  ctx.fillStyle = "#FFFFFF"; 
  ctx.font = "bold 26px Sans-Serif"; 
  ctx.fillText(username, 35, 310);
  ctx.fillStyle = "#80848E"; 
  ctx.font = "14px Sans-Serif"; 
  ctx.fillText(`@${userId}`, 35, 340);

  return canvas.toBuffer("image/png");
}

function saveImage(buffer, filename) {
  const filePath = path.join(IMAGES_DIR, filename);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

function isAdmin(member) {
  return member.permissions.has("Administrator");
}

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
      const avatarRes = await fetch(attachments[0].url);
      const bannerRes = await fetch(attachments[1].url);
      const avatarBuffer = Buffer.from(await avatarRes.arrayBuffer());
      const bannerBuffer = Buffer.from(await bannerRes.arrayBuffer());

      const avatarId = `avatar_${Date.now()}.png`;
      const bannerId = `banner_${Date.now()}.png`;
      saveImage(avatarBuffer, avatarId);
      saveImage(bannerBuffer, bannerId);

      const cardBuffer = await createProfileCard(avatarBuffer, bannerBuffer, message.author.username, message.author.id);
      const cardId = `card_${Date.now()}.png`;
      saveImage(cardBuffer, cardId);

      const mediaId = Date.now().toString(36);
      mediaStore.set(mediaId, {
        files: [
          { buffer: avatarBuffer, name: "avatar.png" },
          { buffer: bannerBuffer, name: "banner.png" },
          { buffer: cardBuffer, name: "profile_card.png" }
        ]
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`dl|${mediaId}`)
          .setEmoji("📥")
          .setLabel("تحميل الصور")
          .setStyle(ButtonStyle.Primary)
      );

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

  if (command === "!pfp") {
    if (attachments.length === 0) {
      return message.reply("⚠️ يرجى إرفاق صورة الأفاتار!");
    }

    try {
      const res = await fetch(attachments[0].url);
      const buffer = Buffer.from(await res.arrayBuffer());
      const filename = `pfp_${Date.now()}.png`;
      saveImage(buffer, filename);

      const mediaId = Date.now().toString(36);
      mediaStore.set(mediaId, {
        files: [{ buffer, name: "avatar.png" }]
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`dl|${mediaId}`)
          .setEmoji("📥")
          .setLabel("تحميل الصورة")
          .setStyle(ButtonStyle.Primary)
      );

      await message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setImage(attachments[0].url)
            .setColor("#8A2BE2")
            .setFooter({ text: `by: ${message.author.username}` })
        ],
        components: [row]
      });

      await message.delete().catch(() => {});
    } catch (error) {
      console.error(error);
      await message.reply("❌ حدث خطأ!");
    }
  }

  if (command === "!banner") {
    if (attachments.length === 0) {
      return message.reply("⚠️ يرجى إرفاق صورة البانر!");
    }

    try {
      const res = await fetch(attachments[0].url);
      const buffer = Buffer.from(await res.arrayBuffer());
      const filename = `banner_${Date.now()}.png`;
      saveImage(buffer, filename);

      const mediaId = Date.now().toString(36);
      mediaStore.set(mediaId, {
        files: [{ buffer, name: "banner.png" }]
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`dl|${mediaId}`)
          .setEmoji("📥")
          .setLabel("تحميل الصورة")
          .setStyle(ButtonStyle.Primary)
      );

      await message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setImage(attachments[0].url)
            .setColor("#8A2BE2")
            .setFooter({ text: `by: ${message.author.username}` })
        ],
        components: [row]
      });

      await message.delete().catch(() => {});
    } catch (error) {
      console.error(error);
      await message.reply("❌ حدث خطأ!");
    }
  }
});

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
