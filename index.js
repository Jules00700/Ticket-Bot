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

const { token } = require("./config.json"); // ← TOKEN VANUIT config.json

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

// Support roles per onderwerp (ELK onderwerp 2 roles)
const SUPPORT_MAP = {
  vragen: ["928423586803355700"],
  partner: ["928423586803355700"],
  staff: ["1462155480410620159"],
  dev: ["1462155480410620159"]
};

// Transcript kanalen
const TRANSCRIPT_LOG_CHANNELS = [
  "1462151483720995182"
];

// Category mapping per onderwerp
const CATEGORY_MAP = {
  vragen: "1462144801435815957",   // ← category ID voor vragen
  partner: "1462152699050197095",  // ← category ID voor partner
  staff: "1462157854952652983",     // ← category ID voor unban/rank
  dev: "1462158044505964647"
};

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
      new ButtonBuilder().setCustomId("staff").setLabel("Unban Aanvraag").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("dev").setLabel("Rank Aanvraag").setStyle(ButtonStyle.Danger)
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
      staff: "Unban Aanvraag",
      dev: "Rank Aanvraag"
    };

    if (onderwerpMap[interaction.customId]) {
      await interaction.deferReply({ ephemeral: true });

      const onderwerp = onderwerpMap[interaction.customId];
      const ticketName = `ticket-${ticketCount.toString().padStart(3, "0")}`;
      ticketCount++;

      const supportRoles = SUPPORT_MAP[interaction.customId];

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
        ...supportRoles.map(roleId => ({
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
        parent: CATEGORY_MAP[interaction.customId], // ← juiste category
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
        content: `${interaction.user} <@&${supportRoles[0]}> <@&${supportRoles[1]}>`,
        embeds: [embed],
        components: [row]
      });

      await interaction.editReply({ content: `Je ${onderwerp} ticket is aangemaakt: ${channel}` });
    }

    if (interaction.customId === "close") {
      await interaction.deferReply({ ephemeral: true });

      const supportRoles = SUPPORT_MAP[interaction.customId] || [];

      const overwrites = [
        {
          id: interaction.guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        ...supportRoles.map(roleId => ({
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

      // Transcript sturen naar ALLE ingestelde kanalen
      for (const channelId of TRANSCRIPT_LOG_CHANNELS) {
        const logChannel = interaction.guild.channels.cache.get(channelId);
        if (logChannel) {
          await logChannel.send({
            content: `📄 Transcript van **${interaction.channel.name}**:\n\`\`\`\n${transcript}\n\`\`\``
          });
        }
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

client.login(token); // ← LOGIN MET TOKEN UIT config.json
