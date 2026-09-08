Enterimport { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } from "discord.js";
import { createCanvas, loadImage } from "@napi-rs/canvas";

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent
  ] 
});

const mediaStore = new Map<string, Array<{ buffer: Buffer; fileName: string; url: string }>>();

// اسم السيرفر المخصص
const SERVER_NAME = "𝗨𝗟𝗧𝗥𝗔︱ 𝗣𝗙𝗣'𝙨 & 𝗕𝗔𝗡𝗡𝗘𝗥'𝙨";

// دالة لقص وتغطية البانر تلقائياً (Object-Fit: Cover) لمنع التمطيط
function drawImageCover(ctx: any, img: any, x: number, y: number, w: number, h: number) {
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
async function createProfileCard(avatarUrl: string | null, bannerUrl: string | null, username: string): Promise<Buffer> {
  const canvas = createCanvas(600, 400);
  const ctx = canvas.getContext("2d");

  // 1. خلفية الكارت الرئيسية
  ctx.fillStyle = "#0b0b0e";
  ctx.beginPath();
  ctx.roundRect(0, 0, 600, 400, 16);
  ctx.fill();

  // 2. البانر العلوي مع ضبط العرض والتغطية
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
  const [ax, ay, asize] = [35, 155, 110];
  ctx.fillStyle = "#0b0b0e";
  ctx.beginPath();
  ctx.arc(ax + asize / 2, ay + asize / 2, asize / 2 + 7, 0, Math.PI * 2);
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
  const [sx, sy] = [ax + asize - 15, ay + asize - 15];
  ctx.fillStyle = "#0b0b0e"; ctx.beginPath(); ctx.arc(sx, sy, 16, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#f23f43"; ctx.beginPath(); ctx.arc(sx, sy, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#0b0b0e"; ctx.fillRect(sx - 7, sy - 3, 14, 6);

  // 5. الشارات (موقعها في المنتصف الأسفل)
  const badgeY = 255;
  const badgeX = 520;

  ctx.fillStyle = "#9b59b6";
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#57f287";
  ctx.beginPath();
  ctx.arc(badgeX + 30, badgeY, 12, 0, Math.PI * 2);
  ctx.fill();

  // 6. اسم السيرفر بخط عريض تحت الشارات مباشرة
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 16px Sans-Serif";
  ctx.textAlign = "right";
  ctx.fillText(SERVER_NAME, 570, badgeY + 40);

  // إعادة ضبط المحاذاة للنصوص السفلية
  ctx.textAlign = "left";

  // 7. اسم المستخدم والتوقيع
  ctx.fillStyle = "#FFFFFF"; 
  ctx.font = "bold 26px Sans-Serif"; 
  ctx.fillText(username, 35, 310);

  ctx.fillStyle = "#80848E"; 
  ctx.font = "14px Sans-Serif"; 
  ctx.fillText(`by: ${username}`, 35, 340);

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

    const btn = new ActionRowBuilder<ButtonBuilder>().addComponents(
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
