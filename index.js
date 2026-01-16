const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField
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
// INSTELLINGEN (HIER KAN JE ALLES AANPASSEN)
// ─────────────────────────────────────────────

// Support rollen die toegang hebben tot tickets
const SUPPORT_ROLES = [
  "1461473605052399717", // Support role ID
  "987654321098765432"  // Extra role ID (optioneel)
];

// Kanaal waar transcripts naartoe worden gestuurd
const TRANSCRIPT_LOG_CHANNEL = "1461764185896779776"; // Log kanaal ID

let ticketCount = 1;

// ─────────────────────────────────────────────
// BOT ONLINE
// ─────────────────────────────────────────────
client.on("ready", () => {
  console.log(`Bot is online als ${client.user.tag}`);
});

// ─────────────────────────────────────────────
// TICKET PANEL COMMAND
// ─────────────────────────────────────────────
client.on("messageCreate", async (message) => {
  if (message.content === "!ticketpanel") {
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

// ─────────────────────────────────────────────
// BUTTON INTERACTIONS
// ─────────────────────────────────────────────
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const onderwerpMap = {
    vragen: "Vragen",
    partner: "Partner",
    staff: "Staff Sollicitatie",
    dev: "Dev Sollicitatie"
  };

  // ─────────────────────────────────────────────
  // TICKET AANMAKEN
  // ─────────────────────────────────────────────
  if (onderwerpMap[interaction.customId]) {
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
      }
    ];

    SUPPORT_ROLES.forEach(roleId => {
      overwrites.push({
        id: roleId,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages
        ]
      });
    });

    const channel = await interaction.guild.channels.create({
      name: ticketName,
      type: 0,
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

    channel.send({
      content: `${interaction.user} <@&${SUPPORT_ROLES[0]}>`,
      embeds: [embed],
      components: [row]
    });

    interaction.reply({
      content: `Je ${onderwerp} ticket is aangemaakt: ${channel}`,
      ephemeral: true
    });
  }

  // ─────────────────────────────────────────────
  // TICKET SLUITEN (alleen support kan nog typen)
  // ─────────────────────────────────────────────
  if (interaction.customId === "close") {
    const overwrites = [];

    overwrites.push({
      id: interaction.guild.id,
      deny: [PermissionsBitField.Flags.ViewChannel]
    });

    SUPPORT_ROLES.forEach(roleId => {
      overwrites.push({
        id: roleId,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages
        ]
      });
    });

    overwrites.push({
      id: interaction.user.id,
      deny: [PermissionsBitField.Flags.SendMessages]
    });

    await interaction.channel.permissionOverwrites.set(overwrites);

    interaction.reply({ content: "Ticket gesloten 🔒", ephemeral: true });
  }

  // ─────────────────────────────────────────────
  // TICKET VERWIJDEREN
  // ─────────────────────────────────────────────
  if (interaction.customId === "delete") {
    interaction.reply({ content: "Ticket wordt verwijderd 🗑️", ephemeral: true });
    setTimeout(() => interaction.channel.delete().catch(() => {}), 2000);
  }

  // ─────────────────────────────────────────────
  // TRANSCRIPT NAAR LOG KANAAL
  // ─────────────────────────────────────────────
  if (interaction.customId === "transcript") {
    const messages = await interaction.channel.messages.fetch({ limit: 100 });
    const transcript = messages
      .reverse()
      .map(m => `${m.author.tag}: ${m.content}`)
      .join("\n");

    const logChannel = interaction.guild.channels.cache.get(TRANSCRIPT_LOG_CHANNEL);
    if (logChannel) {
      logChannel.send({
        content: `📄 Transcript van **${interaction.channel.name}**:\n\`\`\`\n${transcript}\n\`\`\``
      });
    }

    interaction.reply({ content: "Transcript opgeslagen 📄", ephemeral: true });
  }
});

client.login(process.env.TOKEN);
