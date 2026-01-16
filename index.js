const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

// ─────────────────────────────────────────────
// INSTELLINGEN
// ─────────────────────────────────────────────
const SUPPORT_ROLES = ["1461473605052399717"];
const TRANSCRIPT_LOG_CHANNEL = "1461764185896779776";

let ticketCount = 1;

client.on("ready", () => {
  console.log(`Bot is online als ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.content === "!ticketsetup") {
    const embed = new EmbedBuilder()
      .setTitle("🎫 Ticket Systeem")
      .setDescription("Klik op een knop hieronder om een ticket te openen")
      .setColor(0x2b2d31);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("vragen").setLabel("Vragen").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("partner").setLabel("Partner").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("staff").setLabel("Staff Sollicitatie").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("dev").setLabel("Dev Sollicitatie").setStyle(ButtonStyle.Danger)
    );

    message.channel.send({ embeds: [embed], components: [row] });
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  try {
    const onderwerpMap = {
      vragen: "Vragen",
      partner: "Partner",
      staff: "Staff Sollicitatie",
      dev: "Dev Sollicitatie"
    };

    if (onderwerpMap[interaction.customId]) {
      await interaction.deferReply({ ephemeral: true });

      const onderwerp = onderwerpMap[interaction.customId];
      const ticketName = `ticket-${ticketCount.toString().padStart(3, "0")}`;
      ticketCount++;

      const overwrites = [
        {
          id: interaction.guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages
          ]
        },
        ...SUPPORT_ROLES.map(roleId => ({
          id: roleId,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages
          ]
        }))
      ];

      const channel = await interaction.guild.channels.create({
        name: ticketName,
        type: ChannelType.GuildText,
        permissionOverwrites: overwrites
      });

      const embed = new EmbedBuilder()
        .setTitle(`📩 ${onderwerp} Ticket`)
        .setDescription(`Welkom ${interaction.user}, leg hier je ${onderwerp.toLowerCase()} uit.`)
        .setColor(0x5865f2);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("close").setLabel("🔒 Sluiten").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("delete").setLabel("🗑️ Verwijderen").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("transcript").setLabel("📄 Transcript").setStyle(ButtonStyle.Primary)
      );

      await channel.send({
        content: `${interaction.user} <@&${SUPPORT_ROLES[0]}>`,
        embeds: [embed],
        components: [row]
      });

      await interaction.editReply({ content: `Je ${onderwerp} ticket is aangemaakt: ${channel}` });
    }

    if (interaction.customId === "close") {
      await interaction.deferReply({ ephemeral: true });

      const overwrites = [
        {
          id: interaction.guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        ...SUPPORT_ROLES.map(roleId => ({
          id: roleId,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages
          ]
        })),
        {
          id: interaction.user.id,
          deny: [PermissionsBitField.Flags.SendMessages]
        }
      ];

      await interaction.channel.permissionOverwrites.set(overwrites);
      await interaction.editReply({ content: "Ticket gesloten 🔒" });
    }

    if (interaction.customId === "delete") {
      await interaction.deferReply({ ephemeral: true });
      await interaction.editReply({ content: "Ticket wordt verwijderd 🗑️" });
      setTimeout(() => interaction.channel.delete().catch(() => {}), 2000);
    }

    if (interaction.customId === "transcript") {
      await interaction.deferReply({ ephemeral: true });

      const messages = await interaction.channel.messages.fetch({ limit: 100 });
      const transcript = messages
        .reverse()
        .map(m => `${m.author.tag}: ${m.content}`)
        .join("\n");

      const logChannel = interaction.guild.channels.cache.get(TRANSCRIPT_LOG_CHANNEL);
      if (logChannel) {
        await logChannel.send({
          content: `📄 Transcript van **${interaction.channel.name}**:\n\`\`\`\n${transcript}\n\`\`\``
        });
      }

      await interaction.editReply({ content: "Transcript opgeslagen 📄" });
    }
  } catch (err) {
    console.error("Interaction error:", err);
    if (interaction.deferred || interaction.replied) {
      interaction.editReply({ content: "Er ging iets mis bij deze actie." });
    } else {
      interaction.reply({ content: "Er ging iets mis bij deze actie.", ephemeral: true });
    }
  }
});

client.login(process.env.TOKEN);
