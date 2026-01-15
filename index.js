const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel]
});

let ticketCount = 1;

client.on('ready', () => {
  console.log(`Bot is online als ${client.user.tag}`);
});

// Commando om panel te sturen
client.on('messageCreate', async (message) => {
  if (message.content === '!ticketpanel') {
    const embed = new EmbedBuilder()
      .setTitle('🎫 Ticket Systeem')
      .setDescription('Klik op een knop hieronder om een ticket te openen')
      .setColor(0x2b2d31);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('vragen').setLabel('Vragen').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('partner').setLabel('Partner').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('staff').setLabel('Staff Sollicitatie').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('dev').setLabel('Dev Sollicitatie').setStyle(ButtonStyle.Danger)
    );

    message.channel.send({ embeds: [embed], components: [row] });
  }
});

// Ticket aanmaken
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const onderwerp = {
    vragen: 'Vragen',
    partner: 'Partner',
    staff: 'Staff Sollicitatie',
    dev: 'Dev Sollicitatie'
  }[interaction.customId];

  const ticketName = `ticket-${ticketCount.toString().padStart(3, '0')}`;
  ticketCount++;

  const channel = await interaction.guild.channels.create({
    name: ticketName,
    type: 0,
    permissionOverwrites: [
      {
        id: interaction.guild.id,
        deny: [PermissionsBitField.Flags.ViewChannel]
      },
      {
        id: interaction.user.id,
        allow: [PermissionsBitField.Flags.ViewChannel]
      }
    ]
  });

  const embed = new EmbedBuilder()
    .setTitle(`📩 ${onderwerp} Ticket`)
    .setDescription(`Welkom ${interaction.user}, leg hier je ${onderwerp.toLowerCase()} uit.`)
    .setColor(0x5865f2);

  channel.send({ content: `${interaction.user}`, embeds: [embed] });
  interaction.reply({ content: `Je ${onderwerp} ticket is aangemaakt: ${channel}`, ephemeral: true });
});

client.login(process.env.TOKEN);
