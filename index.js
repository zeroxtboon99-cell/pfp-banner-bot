const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require("discord.js");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const axios = require("axios");

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent
  ] 
});

const mediaStore = new Map();
const SERVER_NAME = "Ultra ︱ PFPs & Banners";

// دالة جلب الصور بأمان كـ Buffer
async function fetchBuffer(url) {
  const response = await axios.get(url, { responseType: "arraybuffer" });
  return Buffer.from(response.data);
}

// دالة قص وتغطية البانر احترافياً
function drawImageCover(ctx, img, x, y, w, h) {
  const imgRatio = img.width / img.height;
  const targetRatio = w / h;
  let sw, sh, sx, sy;

  if (imgRatio > targetRatio) {
    sh = img.height;
    sw = img.height * targetRatio;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    sw = img.width;
    sh = img.width / targetRatio;
    sx = 0;
    sy = (img.height - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// دالة رسم كارت البروفايل
async function createProfileCard(avatarBuffer, bannerBuffer, username) {
  // أبعاد اللوحة الإجمالية 600x320
  const canvas = createCanvas(600, 320);
  const ctx = canvas.getContext("2d");

  // 1. الخلفية السوداء للكارت
  ctx.fillStyle = "#0b0b0e";
  ctx.beginPath();
  ctx.roundRect(0, 0, 600, 320, 16);
  ctx.fill();

  // 2. البانر العلوي (ارتفاع 160px)
  if (bannerBuffer) {
    try {
      const bannerImg = await loadImage(bannerBuffer);
      drawImageCover(ctx, bannerImg, 0, 0, 600, 160);
    } catch {
      ctx.fillStyle = "#2b2d31";
      ctx.fillRect(0, 0, 600, 160);
    }
  } else {
    ctx.fillStyle = "#2b2d31";
    ctx.fillRect(0, 0, 600, 160);
  }

  // 3. الأفاتار (Avatar)
  const ax = 30, ay = 100, asize = 105;
  
  // حافة سوداء حول الأفاتار
  ctx.fillStyle = "#0b0b0e";
  ctx.beginPath();
  ctx.arc(ax + asize / 2, ay + asize / 2, asize / 2 + 5, 0, Math.PI * 2);
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

  // 4. حالة DND (النقطة الحمراء)
  const sx = ax + asize - 14, sy = ay + asize - 14;
  ctx.fillStyle = "#0b0b0e"; ctx.beginPath(); ctx.arc(sx, sy, 14, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#f23f43"; ctx.beginPath(); ctx.arc(sx, sy, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#0b0b0e"; ctx.fillRect(sx - 5, sy - 2, 10, 4);

  // 5. اسم السيرفر (في جهة اليمين مباشرة - حسب السهم الأول)
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 17px Arial, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(SERVER_NAME, 570, 190);

  // 6. حقوق المستخدم by: username (في جهة اليسار أسفل الكارت - حسب السهم الثاني)
  ctx.textAlign = "left";
  ctx.fillStyle = "#FFFFFF"; 
  ctx.font = "bold 20px Arial, sans-serif"; 
  ctx.fillText(`by: ${username}`, 40, 275);

  return canvas.toBuffer("image/png");
}

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const command = message.content.trim().toLowerCase();
  if (!["!post", "!pfp", "!banner", "!baner"].includes(command)) return;

  const attachments = Array.from(message.attachments.values());
  if (attachments.length === 0) return message.reply("❌ يرجى إرفاق صورة!");

  try {
    const savedFiles = [];
    for (const att of attachments) {
      const buf = await fetchBuffer(att.url);
      savedFiles.push({ buffer: buf, fileName: att.name, url: att.url });
    }

    const id = Date.now().toString(36);
    mediaStore.set(id, savedFiles);

    const btn = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`dl|${id}`).setEmoji("📥").setStyle(ButtonStyle.Secondary)
    );

    if (command === "!post") {
      const avatarUrl = attachments.length >= 2 ? attachments[0].url : null;
      const bannerUrl = attachments.length >= 2 ? attachments[1].url : attachments[0].url;

      const avatarBuffer = avatarUrl ? await fetchBuffer(avatarUrl) : null;
      const bannerBuffer = await fetchBuffer(bannerUrl);

      const buffer = await createProfileCard(avatarBuffer, bannerBuffer, message.author.username);

      await message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setImage("attachment://profile_card.png")
            .setColor("#8A2BE2")
            .setFooter({ text: `by: ${message.author.username}` })
        ],
        files: [new AttachmentBuilder(buffer, { name: "profile_card.png" })],
        components: [btn],
      });
    } else {
      await message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setImage(attachments[0].url)
            .setColor("#8A2BE2")
            .setFooter({ text: `by: ${message.author.username}` })
        ],
        components: [btn],
      });
    }

    setTimeout(() => message.delete().catch(() => {}), 1000);
  } catch (err) {
    console.error("خطأ:", err);
  }
});

client.on("interactionCreate", async (i) => {
  if (!i.isButton() || !i.customId.startsWith("dl|")) return;

  const files = mediaStore.get(i.customId.split("|")[1]);
  if (!files) return i.reply({ content: "❌ تعذر العثور على الصور.", ephemeral: true });

  await i.deferReply({ ephemeral: true });

  const atts = files.map((f) => new AttachmentBuilder(f.buffer, { name: f.fileName }));
  
  try { await i.user.send({ content: "📥 **الملفات الأصلية:**", files: atts }); } catch {}
  await i.editReply({ content: "📥 **تفضل الصور:**", files: atts });
});

client.login(process.env.DISCORD_TOKEN);
