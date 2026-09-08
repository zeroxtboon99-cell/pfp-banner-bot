const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require("discord.js");
const { createCanvas, loadImage } = require("@napi-rs/canvas");

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent
  ] 
});

const mediaStore = new Map();

// اسم السيرفر بدون خطوط معقدة لضمان ظهوره كاملاً
const SERVER_NAME = "Ultra ︱ PFPs & Banners";

// دالة قص وتغطية البانر ليلائم المساحة بدقة
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

// دالة تصميم وصنع الكارت
async function createProfileCard(avatarUrl, bannerUrl, username) {
  const canvas = createCanvas(600, 380);
  const ctx = canvas.getContext("2d");

  // 1. خلفية الكارت الرئيسية
  ctx.fillStyle = "#0b0b0e";
  ctx.beginPath();
  ctx.roundRect(0, 0, 600, 380, 16);
  ctx.fill();

  // 2. البانر العلوي
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

  // 3. الأفاتار (Avatar)
  const [ax, ay, asize] = [30, 150, 105];
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

  // 4. حالة DND الحمراء
  const [sx, sy] = [ax + asize - 14, ay + asize - 14];
  ctx.fillStyle = "#0b0b0e"; ctx.beginPath(); ctx.arc(sx, sy, 15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#f23f43"; ctx.beginPath(); ctx.arc(sx, sy, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#0b0b0e"; ctx.fillRect(sx - 6, sy - 2.5, 12, 5);

  // 5. كتابة اسم السيرفر جهة اليمين بخط عريض ومكان الشارات القديمة
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 18px Arial, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(SERVER_NAME, 570, 250);

  // 6. اسم المستخدم والتوقيع جهة اليسار (أسفل الأفاتار)
  ctx.textAlign = "left";

  // اسم المستخدم الرئيسي
  ctx.fillStyle = "#FFFFFF"; 
  ctx.font = "bold 22px Arial, sans-serif"; 
  ctx.fillText(username, 30, 295);

  // التوقيع (by: username)
  ctx.fillStyle = "#949ba4"; 
  ctx.font = "14px Arial, sans-serif"; 
  ctx.fillText(`by: ${username}`, 30, 325);

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

