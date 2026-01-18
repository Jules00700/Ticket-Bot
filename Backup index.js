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

const { token } = require("./config.json");

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

// Support roles per onderwerp
const SUPPORT_MAP = {
  vragen: ["928423586803355700"],
  partner: ["928423586803355700"],
  unban: ["1462155480410620159"],
  rank: ["1462155480410620159"],
  klachten: ["1462155480410620159"]
};

// Transcript kanalen
const TRANSCRIPT_LOG_CHANNELS = [
  "1462151483720995182"
];

// Category mapping per onderwerp
const CATEGORY_MAP = {
  vragen: "1462144801435815957",
  partner: "1462152699050197095",
  unban: "1462157854952652983",
  rank: "1462158044505964647",
  klachten: "1462189172264669317"
};

// Aparte counters per onderwerp
let ticketCounters = {
  vragen: 1,
  partner: 1,
  unban: 1,
  rank: 1,
  klachten: 1
};

client.on("ready", () => {
  console.log(`Bot is online als ${client.user.tag}`);
});

// ─────────────────────────────────────────────
// TICKET SETUP
// ─────────────────────────────────────────────

client.on("messageCreate", async (message) => {
  if (message.content === "!ticketsetup") {
    const embed = new EmbedBuilder()
      .setTitle("🎫 Ticket Systeem")
      .setDescription("Klik op een knop hieronder om een ticket te openen")
      .setColor(0x2b2d31);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("vragen").setLabel("Vragen").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("partner").setLabel("Partner").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("unban").setLabel("Unban Aanvraag").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("rank").setLabel("Rank Aanvraag").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("klachten").setLabel("Klachten").setStyle(ButtonStyle.Primary)
    );

    message.channel.send({ embeds: [embed], components: [row] });
  }
});

// ─────────────────────────────────────────────
// INTERACTIONS
// ─────────────────────────────────────────────

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  try {
    const onderwerpMap = {
      vragen: "Vragen",
      partner: "Partner",
      unban: "Unban Aanvraag",
      rank: "Rank Aanvraag",
      klachten: "Klachten"
    };

    // ─────────────────────────────────────────────
    // TICKET AANMAKEN
    // ─────────────────────────────────────────────
    if (onderwerpMap[interaction.customId]) {
      await interaction.deferReply({ ephemeral: true });

      const onderwerp = onderwerpMap[interaction.customId];

      // Per onderwerp eigen teller
      const count = ticketCounters[interaction.customId]++;
      const ticketName = `${interaction.customId}-${count.toString().padStart(3, "0")}`;

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
        parent: CATEGORY_MAP[interaction.customId],
        permissionOverwrites: overwrites
      });

      const embed = new EmbedBuilder()
        .setTitle(`📩 ${onderwerp} Ticket`)
        .setDescription(`Welkom ${interaction.user}, leg hier je ${onderwerp.toLowerCase()} uit.`)
        .setColor(0x5865f2);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("claim").setLabel("📌 Claim").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("close").setLabel("🔒 Sluiten").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("delete").setLabel("🗑️ Verwijderen").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("transcript").setLabel("📄 Transcript").setStyle(ButtonStyle.Success)
      );

      await channel.send({
        content: `${interaction.user} <@&${supportRoles[0]}>`,
        embeds: [embed],
        components: [row]
      });

      await interaction.editReply({ content: `Je ${onderwerp} ticket is aangemaakt: ${channel}` });
      return;
    }

    // ─────────────────────────────────────────────
    // CLAIM (maar één keer)
    // ─────────────────────────────────────────────
    if (interaction.customId === "claim") {
      await interaction.deferReply({ ephemeral: true });

      const oldName = interaction.channel.name;

      // Check of al geclaimd
      if (oldName.includes("claimed-by-")) {
        // Proberen uit de naam te halen wie 'm heeft
        const parts = oldName.split("claimed-by-");
        const claimerName = parts[1] || "iemand";

        await interaction.editReply({
          content: `Dit ticket is al geclaimd door **${claimerName}**.`
        });
        return;
      }

      const claimer = interaction.user.username;
      await interaction.channel.setName(`${oldName}-claimed-by-${claimer}`);

      await interaction.editReply({ content: `Je hebt dit ticket geclaimd.` });
      return;
    }

    // ─────────────────────────────────────────────
    // CLOSE
    // ─────────────────────────────────────────────
    if (interaction.customId === "close") {
      await interaction.deferReply({ ephemeral: true });

      await interaction.channel.permissionOverwrites.edit(interaction.user.id, {
        SendMessages: false
      });

      await interaction.editReply({ content: "Ticket gesloten 🔒" });
      return;
    }

    // ─────────────────────────────────────────────
    // DELETE
    // ─────────────────────────────────────────────
    if (interaction.customId === "delete") {
      await interaction.deferReply({ ephemeral: true });

      await interaction.editReply({ content: "Ticket wordt verwijderd 🗑️" });
      setTimeout(() => interaction.channel.delete().catch(() => {}), 2000);
      return;
    }

    // ─────────────────────────────────────────────
    // TRANSCRIPT
    // ─────────────────────────────────────────────
    if (interaction.customId === "transcript") {
      await interaction.deferReply({ ephemeral: true });

      const messages = await interaction.channel.messages.fetch({ limit: 100 });
      const transcript = messages
        .reverse()
        .map(m => `${m.author.tag}: ${m.content}`)
        .join("\n");

      for (const channelId of TRANSCRIPT_LOG_CHANNELS) {
        const logChannel = interaction.guild.channels.cache.get(channelId);
        if (logChannel) {
          await logChannel.send({
            content: `📄 Transcript van **${interaction.channel.name}**:\n\`\`\`\n${transcript}\n\`\`\``
          });
        }
      }

      await interaction.editReply({ content: "Transcript opgeslagen 📄" });
      return;
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

client.login(token);
