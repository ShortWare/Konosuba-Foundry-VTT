// Import document classes.
import { KonosubaActor } from "./documents/actor.mjs";
import { KonosubaItem } from "./documents/item.mjs";
// Import sheet classes.
import { KonosubaActorSheet } from "./sheets/actor-sheet.mjs";
import { KonosubaItemSheet } from "./sheets/item-sheet.mjs";
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from "./helpers/templates.mjs";
import { KONOSUBA } from "./helpers/config.mjs";
import { DiceMenu } from "./ui/roll_dice.js";

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once("init", function () {
  game.konosuba = {
    KonosubaActor,
    KonosubaItem,
    rollItemMacro,
  };
  CONFIG.KONOSUBA = KONOSUBA;

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

// If you need to add Handlebars helpers, here is a useful example:
Handlebars.registerHelper("toLowerCase", function (str) {
  return str.toLowerCase();
});

Handlebars.registerHelper("camelToTitle", function (str) {
  return str
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (s) => s.toUpperCase());
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", function () {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => createItemMacro(data, slot));
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
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(data, slot) {
  // First, determine if this is a valid owned item.
  if (data.type !== "Item") return;
  if (!data.uuid.includes("Actor.") && !data.uuid.includes("Token.")) {
    return ui.notifications.warn(
      "You can only create macro buttons for owned Items"
    );
  }
  // If it is, retrieve it based on the uuid.
  const item = await Item.fromDropData(data);

  // Create the macro command using the uuid.
  const command = `game.konosuba.rollItemMacro("${data.uuid}");`;
  let macro = game.macros.find(
    (m) => m.name === item.name && m.command === command
  );
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
      flags: { "konosuba.itemMacro": true },
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function rollItemMacro(itemUuid) {
  // Reconstruct the drop data so that we can load the item.
  const dropData = {
    type: "Item",
    uuid: itemUuid,
  };
  // Load the item from the uuid.
  Item.fromDropData(dropData).then((item) => {
    // Determine if the item loaded and if it's an owned item.
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(
        `Could not find item ${itemName}. You may need to delete and recreate this macro.`
      );
    }

    // Trigger the item roll
    item.roll();
  });
}

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

Hooks.on("chatMessage", (chatLog, messageText, chatData) => {
  if (messageText.startsWith("/doom")) {
    new Dialog({
      title: 'Doom',
      content: `<iframe src="https://js-dos.com/games/doom.exe.html" width="800" height="600" style="border:none;"></iframe>`,
      buttons: {
        ok: { label: 'Close' }
      }
    }, {
      width: 820,
      height: 680
    }).render(true);
    return false;
  }
});