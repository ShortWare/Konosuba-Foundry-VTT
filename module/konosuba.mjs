// Import document classes.
import { KonosubaActor } from "./documents/actor.mjs";
import { KonosubaItem } from "./documents/item.mjs";
// Import sheet classes.
import { KonosubaActorSheet } from "./sheets/actor-sheet.mjs";
import { KonosubaItemSheet } from "./sheets/item-sheet.mjs";
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from "./helpers/templates.mjs";
import { DiceMenu } from "./ui/roll_dice.js";

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once("init", function () {
  game.konosuba = {
    KonosubaActor,
    KonosubaItem,
  };

  CONFIG.Combat.initiative = {
    formula: "@combat.combatAttributes.actionPoints",
    decimals: 2,
  };

  CONFIG.Actor.documentClass = KonosubaActor;
  CONFIG.Item.documentClass = KonosubaItem;

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("konosuba", KonosubaActorSheet, {
    makeDefault: true,
    label: "KONOSUBA.SheetLabels.Actor",
  });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("konosuba", KonosubaItemSheet, {
    makeDefault: true,
    label: "KONOSUBA.SheetLabels.Item",
  });

  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

Handlebars.registerHelper("toLowerCase", function (str) {
  return str.toLowerCase();
});

Handlebars.registerHelper("camelToTitle", function (str) {
  return str
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (s) => s.toUpperCase());
});

Handlebars.registerHelper("contains", function (array, item) {
  return Array.isArray(array) && array.includes(item);
});

Handlebars.registerHelper("includes", function (str, search) {
  return str.toLowerCase().includes(search.toLowerCase());
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", function () {
  console.log("[Konosuba System] System loaded successfully");
});

/* -------------------------------------------- */
/*  Re-Roll Logic                               */
/* -------------------------------------------- */

Hooks.on("getChatLogEntryContext", (html, options) => {
  options.push({
    name: "Re-Roll",
    icon: '<i class="fas fa-dice"></i>',
    condition: (li) => {
      const message = game.messages.get(li.data("messageId"));
      const rerollData = message.getFlag("konosuba", "reroll");
      if (!rerollData) return false;

      const actor = game.actors.get(rerollData.actorId);
      if (!actor) return false;

      return game.user.isGM || actor.isOwner;
    },
    callback: (li) => {
      const message = game.messages.get(li.data("messageId"));
      const rerollData = message.getFlag("konosuba", "reroll");
      if (!rerollData) return;

      const actor = game.actors.get(rerollData.actorId);
      if (!actor) return;

      new DiceMenu(actor, rerollData.rollData).render(true);
    },
  });
});

/* -------------------------------------------- */
/*  Action Points                               */
/* -------------------------------------------- */

Hooks.on("createCombat", async (combat) => {
  for (let combatant of combat.combatants) {
    if (combatant.initiative == null) {
      const actor = combatant.actor;
      if (!actor) return;

      await setInitiative(combatant);
    }
  }
});
Hooks.on("createCombatant", async (combatant) => {
  if (combatant.initiative == null) {
    const actor = combatant.actor;
    if (!actor) return;

    await setInitiative(combatant);
  }
});

async function setInitiative(combatant) {
  const actor = combatant.actor;
  if (!actor) return;

  const actionPoints = actor.combat.combatAttributes.actionPoints || 0;
  await combatant.update({ initiative: actionPoints });
}

/* -------------------------------------------- */
/*  Item Utils                                  */
/* -------------------------------------------- */

Hooks.on("preCreateItem", async (item, data, options, userId) => {
  if (!item.actor) return;

  if (item.type == "race") {
    const existingRaces = item.actor.items.filter(
      (i) => i.type === "race" && i.id !== item.id
    );
    if (existingRaces.length > 0) {
      await item.actor.deleteEmbeddedDocuments(
        "Item",
        existingRaces.map((i) => i.id)
      );
    }
  } else if (item.type == "class") {
    const existingRaces = item.actor.items.filter(
      (i) => i.type === "class" && i.id !== item.id
    );
    if (existingRaces.length > 0) {
      await item.actor.deleteEmbeddedDocuments(
        "Item",
        existingRaces.map((i) => i.id)
      );
    }
  }
});

/* -------------------------------------------- */
/*  Chat Messages                               */
/* -------------------------------------------- */

Hooks.on("chatMessage", (chatLog, messageText, chatData) => {
  if (messageText.startsWith("/doom")) {
    new Dialog(
      {
        title: "Doom",
        content: `<iframe src="https://js-dos.com/games/doom.exe.html" width="800" height="600" style="border:none;"></iframe>`,
        buttons: {
          ok: { label: "Close" },
        },
      },
      {
        width: 820,
        height: 680,
      }
    ).render(true);
    return false;
  }
});
