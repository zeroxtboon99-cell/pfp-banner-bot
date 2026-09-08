hereconst { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require("discord.js");
const { createCanvas, loadImage } = require("@napi-rs/canvas");

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent
  ] 
});

const mediaStore = new Map();

// اسم السيرفر المخصص
const SERVER_NAME = "Ultra ︱ PFPs & Banners";

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

// دالة تصميم وصنع البطاقة
async function createProfileCard(avatarUrl, bannerUrl, username) {
  // تكبير ارتفاع اللوحة إلى 420px لتتسع لكافة العناصر والنصوص بوضوح
  const canvas = createCanvas(600, 420);
  const ctx = canvas.getContext("2d");

  // 1. خلفية الكارت الرئيسية
  ctx.fillStyle = "#0b0b0e";
  ctx.beginPath();
  ctx.roundRect(0, 0, 600, 420, 16);
  ctx.fill();

  // 2. رسم البانر العلوي (بارتفاع 210px)
  if (bannerUrl) {
    try {
      const bannerImg = await loadImage(bannerUrl);
      drawImageCover(ctx, bannerImg, 0, 0, 600, 210);
    } catch {
      ctx.fillStyle = "#2b2d31";
      ctx.fillRect(0, 0, 600, 210);
    }
  } else {
    ctx.fillStyle = "#2b2d31";
    ctx.fillRect(0, 0, 600, 210);
  }

  // 3. رسم الأفاتار متناسق الأبعاد تماماً (دائرة موزونة)
  const ax = 35;
  const ay = 145;
  const asize = 120;

  // الإطار الأسود حول الأفاتار
  ctx.fillStyle = "#0b0b0e";
  ctx.beginPath();
  ctx.arc(ax + asize / 2, ay + asize / 2, asize / 2 + 6, 0, Math.PI * 2);
  ctx.fill();

  if (avatarUrl) {
    try {
      const avatarImg = await loadImage(avatarUrl);
      ctx.save();
      ctx.beginPath();
      ctx.arc(ax + asize / 2, ay + asize / 2, asize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(avatarImg, ax, ay, asize, asize);
      ctx.restore();
    } catch {}
  }

  // 4. رسم شارة DND الحمراء على حافة الأفاتار
  const sx = ax + asize - 18;
  const sy = ay + asize - 18;
  ctx.fillStyle = "#0b0b0e"; ctx.beginPath(); ctx.arc(sx, sy, 16, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#f23f43"; ctx.beginPath(); ctx.arc(sx, sy, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#0b0b0e"; ctx.fillRect(sx - 7, sy - 3, 14, 6);

  // 5. كتابة اسم السيرفر جهة اليمين بخط واضح جداً وعريض بدون دوائر
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 20px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(SERVER_NAME, 565, 260);

  // 6. كتابة اسم المستخدم وتوقيع الحقوق جهة اليسار تحت الأفاتار
  ctx.textAlign = "left";

  // اسم صاحب الصورة
  ctx.fillStyle = "#FFFFFF"; 
  ctx.font = "bold 26px sans-serif"; 
  ctx.fillText(username, 35, 320);

  // حقوق النشر (by: username)
  ctx.fillStyle = "#949ba4"; 
  ctx.font = "16px sans-serif"; 
  ctx.fillText(`by: ${username}`, 35, 355);

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
      const res = await fetch(att.url);
      savedFiles.push({ buffer: Buffer.from(await res.arrayBuffer()), fileName: att.name, url: att.url });
    }

    const id = Date.now().toString(36);
    mediaStore.set(id, savedFiles);

    const btn = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`dl|${id}`).setEmoji("📥").setStyle(ButtonStyle.Secondary)
    );

    if (command === "!post") {
      const avatarUrl = attachments.length >= 2 ? attachments[0].url : null;
      const bannerUrl = attachments.length >= 2 ? attachments[1].url : attachments[0].url;

      const buffer = await createProfileCard(avatarUrl, bannerUrl, message.author.username);

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
    console.error(err);
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
