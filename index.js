const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

const { token } = require("./config.json");
const fs = require("fs");
const path = require("path");

function splitMessage(text, maxLength = 1900) {
  const parts = [];
  for (let i = 0; i < text.length; i += maxLength) {
    parts.push(text.slice(i, i + maxLength));
  }
  return parts;
}

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

const SUPPORT_MAP = {
  vragen: ["928423586803355700"],
  partner: ["928423586803355700"],
  unban: ["1462155480410620159"],
  rank: ["1462155480410620159"],
  klachten: ["1462155480410620159"]
};

const TRANSCRIPT_LOG_CHANNELS = [
  "1462151483720995182"
];

const CATEGORY_MAP = {
  vragen: "1462144801435815957",
  partner: "1462152699050197095",
  unban: "1462157854952652983",
  rank: "1462158044505964647",
  klachten: "1462189172264669317"
};

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

  // ─────────────────────────────────────────────
  // /closerequest COMMAND
  // ─────────────────────────────────────────────
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "closerequest") {
      const supportRoles = ["928423586803355700", "1462155480410620159"];

      if (!interaction.member.roles.cache.some(r => supportRoles.includes(r.id))) {
        return interaction.reply({ content: "❌ Je hebt geen permissie om dit te doen.", ephemeral: true });
      }

      const opener = interaction.channel.topic;
      if (!opener) {
        return interaction.reply({ content: "❌ Dit is geen ticket kanaal.", ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle("🔒 Verzoek tot sluiten")
        .setDescription(`<@${opener}> wil je bevestigen dat dit ticket gesloten mag worden?`)
        .setColor(0xffcc00);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("close_yes").setLabel("Ja, sluiten").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("close_no").setLabel("Nee").setStyle(ButtonStyle.Danger)
      );

      await interaction.reply({ content: "Vraag verstuurd!", ephemeral: true });
      await interaction.channel.send({ embeds: [embed], components: [row] });
    }
    return;
  }

  // ─────────────────────────────────────────────
  // BUTTONS
  // ─────────────────────────────────────────────
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
        permissionOverwrites: overwrites,
        topic: interaction.user.id // TICKET OPENER OPSLAAN
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
    // CLAIM
    // ─────────────────────────────────────────────
    if (interaction.customId === "claim") {
      await interaction.deferReply({ ephemeral: true });

      const oldName = interaction.channel.name;

      if (oldName.includes("claimed-by-")) {
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
    // CLOSE REQUEST: JA
    // ─────────────────────────────────────────────
    if (interaction.customId === "close_yes") {
      const opener = interaction.channel.topic;

      if (interaction.user.id !== opener) {
        return interaction.reply({ content: "❌ Alleen de ticket-opener kan dit bevestigen.", ephemeral: true });
      }

      const modal = new ModalBuilder()
        .setCustomId("rating_modal")
        .setTitle("⭐ Geef een beoordeling");

      const ratingInput = new TextInputBuilder()
        .setCustomId("rating")
        .setLabel("Hoe beoordeel je de support? (1-5)")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const row = new ActionRowBuilder().addComponents(ratingInput);
      modal.addComponents(row);

      await interaction.showModal(modal);
      return;
    }

    // ─────────────────────────────────────────────
    // CLOSE REQUEST: NEE
    // ─────────────────────────────────────────────
    if (interaction.customId === "close_no") {
      const opener = interaction.channel.topic;

      if (interaction.user.id !== opener) {
        return interaction.reply({ content: "❌ Alleen de ticket-opener kan dit weigeren.", ephemeral: true });
      }

      await interaction.reply({ content: "Ticket blijft open.", ephemeral: false });
      return;
    }

    // ─────────────────────────────────────────────
    // CLOSE (oude knop)
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
      const sorted = messages.reverse();

      let html = `
<html>
<head>
<style>
body { font-family: Arial; background: #1e1e1e; color: white; padding: 20px; }
.msg { margin-bottom: 15px; }
.author { font-weight: bold; color: #4ea1ff; }
.time { color: #aaa; font-size: 12px; }
</style>
</head>
<body>
<h2>Transcript van ${interaction.channel.name}</h2>
`;

      sorted.forEach(m => {
        html += `
  <div class="msg">
    <span class="author">${m.author.tag}</span>
    <span class="time">${m.createdAt.toLocaleString()}</span><br>
    ${m.content || "<i>Geen tekst</i>"}
  </div>
  `;
      });

      html += "</body></html>";

      const filePath = path.join(__dirname, `${interaction.channel.name}.html`);
      fs.writeFileSync(filePath, html);

      for (const channelId of TRANSCRIPT_LOG_CHANNELS) {
        const logChannel = interaction.guild.channels.cache.get(channelId);
        if (logChannel) {
          await logChannel.send({
            content: `📄 HTML Transcript van **${interaction.channel.name}**`,
            files: [filePath]
          });
        }
      }

      await interaction.editReply({ content: "Transcript opgeslagen 📄" });
      return;
    }

  } catch (err) {
    console.error("Interaction error:", err?.message || "Onbekende fout");
    if (interaction.deferred || interaction.replied) {
      interaction.editReply({ content: "Er ging iets mis bij deze actie." });
    } else {
      interaction.reply({ content: "Er ging iets mis bij deze actie.", ephemeral: true });
    }
  }
});

// ─────────────────────────────────────────────
// RATING MODAL SUBMIT
// ─────────────────────────────────────────────

client.on("interactionCreate", async interaction => {
  if (!interaction.isModalSubmit()) return;

  if (interaction.customId === "rating_modal") {
    const rating = interaction.fields.getTextInputValue("rating");

    await interaction.reply({ content: `Bedankt voor je beoordeling! ⭐ **${rating}/5**`, ephemeral: false });

    await interaction.channel.permissionOverwrites.edit(interaction.channel.topic, {
      SendMessages: false
    });

    await interaction.channel.send("🔒 Ticket is nu gesloten.");
  }
});

client.login(token);

