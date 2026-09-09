const { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    AttachmentBuilder 
} = require('discord.js');
const { Card } = require('canvacord');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel, Partials.Message]
});

const PREFIX = '!';

client.once('ready', () => {
    console.log(`🤖 Bot is online as: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // ==========================================
    // 1. أمر !post - إنتاج بروفايل ديسكورد حقيقي
    // ==========================================
    if (command === 'post') {
        try {
            const loadingMsg = await message.reply('⏳ جاري إنشاء صورة البروفايل المعالجة...');

            // جلب بيانات العضو والبنر الكاملة من الديسكورد API
            const fetchedUser = await client.users.fetch(message.author.id, { force: true });

            const avatarUrl = fetchedUser.displayAvatarURL({ extension: 'png', size: 1024, forceStatic: false });
            const bannerUrl = fetchedUser.bannerURL({ extension: 'png', size: 1024, forceStatic: false }) || 'https://i.imgur.com/8Q9Z5ZB.png';

            // إنشاء كارت بروفايل حقيقي يشبه واجهة ديسكورد باستخدام Canvacord
            const profileCard = new Card()
                .setAvatar(avatarUrl)
                .setBackground(bannerUrl)
                .setTitle(fetchedUser.globalName || fetchedUser.username)
                .setDescription(`@${fetchedUser.username}`)
                .setColor('#2b2d31');

            const cardBuffer = await profileCard.build();
            const attachment = new AttachmentBuilder(cardBuffer, { name: 'profile-card.png' });

            // زر التنزيل
            const downloadBtn = new ButtonBuilder()
                .setCustomId(`download_profile_${fetchedUser.id}`)
                .setLabel('📥 تنزيل الصور (PFP & Banner)')
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder().addComponents(downloadBtn);

            const embed = new EmbedBuilder()
                .setTitle(`🎨 بروفايل ديسكورد: ${fetchedUser.username}`)
                .setImage('attachment://profile-card.png')
                .setColor('#5865F2')
                .setFooter({ text: 'صورة ثابتة وغير قابلة للحذف مدى الحياة' })
                .setTimestamp();

            await loadingMsg.delete();
            await message.channel.send({
                embeds: [embed],
                files: [attachment],
                components: [row]
            });

        } catch (error) {
            console.error('Error in !post command:', error);
            message.reply('❌ حدث خطأ أثناء جلب بيانات البروفايل.');
        }
    }

    // ==========================================
    // 2. أمر !pfp - رفع أفتار من الهاتف
    // ==========================================
    if (command === 'pfp') {
        const attachment = message.attachments.first();
        if (!attachment) {
            return message.reply('❌ يرجى إرفاق صورة الأفتار من الهاتف مع الأمر `!pfp`');
        }

        const embed = new EmbedBuilder()
            .setTitle('👤 Avatar Asset')
            .setImage(attachment.url)
            .setColor('#23a55a')
            .setFooter({ text: `تم الرفع بواسطة: ${message.author.tag}` })
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
        if (message.deletable) await message.delete();
    }

    // ==========================================
    // 3. أمر !banner - رفع بنر من الهاتف
    // ==========================================
    if (command === 'banner') {
        const attachment = message.attachments.first();
        if (!attachment) {
            return message.reply('❌ يرجى إرفاق صورة البنر من الهاتف مع الأمر `!banner`');
        }

        const embed = new EmbedBuilder()
            .setTitle('🌌 Banner Asset')
            .setImage(attachment.url)
            .setColor('#f0b232')
            .setFooter({ text: `تم الرفع بواسطة: ${message.author.tag}` })
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
        if (message.deletable) await message.delete();
    }
});

// ==========================================
// التعامل مع الضغط على زر التنزيل (Download Button)
// ==========================================
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId.startsWith('download_profile_')) {
        const userId = interaction.customId.split('_')[2];

        try {
            const user = await client.users.fetch(userId, { force: true });

            const avatarUrl = user.displayAvatarURL({ extension: 'gif', size: 2048, forceStatic: false });
            const bannerUrl = user.bannerURL({ extension: 'gif', size: 2048, forceStatic: false });

            let msgText = `📥 **روابط التحميل المباشرة لبروفايل ${user.tag}:**\n\n`;
            msgText += `👤 **Avatar/PFP:** ${avatarUrl}\n`;
            if (bannerUrl) {
                msgText += `🌌 **Banner:** ${bannerUrl}\n`;
            } else {
                msgText += `🌌 **Banner:** لا يوجد بنر مخصص لهذا الحساب.\n`;
            }

            // إرسال الصور في الخاص
            try {
                await interaction.user.send({ content: msgText });
                await interaction.reply({ 
                    content: '✅ تم إرسال روابط الصور والجيفات المباشرة إلى رسائلك الخاصة (DM)!', 
                    ephemeral: true 
                });
            } catch (dmErr) {
                // في حال كان الخاص مغلقاً يتم إظهاره للعضو وحده بالروم (Ephemeral)
                await interaction.reply({ 
                    content: `⚠️ الخاص لديك مغلق! إليك الروابط مباشرة:\n${msgText}`, 
                    ephemeral: true 
                });
            }

        } catch (err) {
            console.error('Button Interaction Error:', err);
            await interaction.reply({ content: '❌ حدث خطأ أثناء استخراج الصور.', ephemeral: true });
        }
    }
});

// تسجيل الدخول باستخدام التوكن من متغيرة البيئة في Railway
client.login(process.env.DISCORD_TOKEN);
