import { DiceMenu } from "../ui/roll_dice.js";
import { EquipmentMenu } from "../ui/equipment.js";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class KonosubaActorSheet extends ActorSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      //classes: ["konosuba", "sheet", "actor"],
      classes: ["konosuba", "actor-sheet"],
      width: 1076,
      height: 794,
      resizable: false,
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "features",
        },
      ],
    });
  }

  /** @override */
  get template() {
    return `systems/konosuba/templates/actor/actor-${this.actor.type}-sheet.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    this.actor.prepareDerivedData();

    const context = super.getData();
    const actorData = this.actor;

    context.system = actorData.system;
    context.combat = actorData.combat;
    context.flags = actorData.flags;
    context.config = CONFIG.KONOSUBA;

    if (actorData.type == "player") {
      this._prepareItems(context);
      this._prepareCharacterData(context);
    }
    if (actorData.type == "npc") {
      this._prepareItems(context);
    }

    context.raceItem = this.actor.items.find((i) => i.type === "race") || null;
    context.classItem =
      this.actor.items.find((i) => i.type === "class") || null;

    return context;
  }

  /**
   * Character-specific context modifications
   *
   * @param {object} context The context object to mutate
   */
  _prepareCharacterData(context) {
    context.equipment = {};
    for (let key in this.actor.system.equipment) {
      if (this.actor.system.equipment[key] !== "") {
        context.equipment[key] = this.actor.items.get(
          this.actor.system.equipment[key]
        );
      } else {
        context.equipment[key] = null;
      }
    }
  }

  /**
   * Organize and classify Items for Actor sheets.
   *
   * @param {object} context The context object to mutate
   */
  _prepareItems(context) {
    const gear = [];
    const skills = [];

    const allEquippedItems = Object.values(this.actor.system.equipment);

    for (let i of context.items) {
      i.img = i.img || Item.DEFAULT_ICON;
      if (i.type === "item") {
        const isEquipped = allEquippedItems.some((e) => e.itemId === i._id);
        if (!isEquipped) gear.push(i);
      } else if (i.type === "skill") {
        let customRolls = i.system.customRolls;
        let customRollsData = [];
        if (customRolls && !Array.isArray(customRolls)) {
          customRolls = Object.values(customRolls);
        }
        customRolls.forEach((roll) => {
          customRollsData.push({
            name: roll.name,
            check: roll.formula
              .replaceAll("SL", i.system.level.value)
              .replaceAll("CL", context.system.attributes.level.value),
          });
        });
        skills.push(i);
      }
    }

    context.gear = gear;
    context.skills = skills;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    html.find(".roll-dice").click((event) => {
      const button = event.currentTarget;
      const title = button.dataset.rollTitle || "Dice Roller";
      const formula = button.dataset.roll || "1d6";
      const customId = button.dataset.customId || "default-roll";
      new DiceMenu(this.actor, { customId, title, formula }).render(true);
    });

    // XP and Level Calculation
    html
      .find('input[name="system.attributes.xp.value"]')
      .on("change", (event) => {
        const value = event.target.value;

        var lvl = 1;
        var xp = value;
        while (xp >= lvl * 10) {
          xp -= lvl * 10;
          lvl++;
        }

        this.actor.update({ "system.attributes.level.value": lvl });
        this.actor.update({ "system.attributes.xp.value": value });
        this.actor.update({
          "system.attributes.xp.remaining": value - xp + lvl * 10,
        });
      });

    html.on("click", ".item-edit", (ev) => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });

    if (!this.isEditable) return;

    html.on("click", ".item-delete", (ev) => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.delete();
      li.slideUp(200, () => this.render(false));
    });

    // Drag events for macros.
    if (this.actor.isOwner) {
      let handler = (ev) => this._onDragStart(ev);
      html.find(".item").each((i, li) => {
        if (li.classList.contains("inventory-header")) return;
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });
    }

    Hooks.on("renderActorSheet", (app, html, data) => {
      if (!(app.actor.type == "player" || app.actor.type !== "npc")) return;
      if (app._sheetOpened) return;

      app._sheetOpened = true;

      Hooks.once("closeActorSheet", (sheetApp) => {
        if (sheetApp === app) {
          app._sheetOpened = false;
        }
      });
    });

    this._tabs[0].callback = (event, tabs, active) => {
      html[0].dataset.activeTab = active;
    };

    const active = this._tabs[0].active;
    html[0].dataset.activeTab = active;

    // Item Details
    html.on("click", ".item", (ev) => {
      const li = $(ev.currentTarget);
      if (!li || !li.data("itemId")) return;

      const item = this.actor.items.get(li.data("itemId"));
      if (!item || item.type != "item") return;

      const itemDetails = html.find("#item-details");
      itemDetails.empty();
      itemDetails.append(`
        <h2>${item.name}</h2>
        <p>${item.system.effects}</p>
      `);

      const allEquippedItems = Object.values(this.actor.system.equipment);
      const isEquipped = allEquippedItems.some((e) => e === item._id);

      if (item.system.equipSlot !== "none" && !isEquipped) {
        itemDetails.append(`
          <button class="item-equip" data-item-id="${item._id}">Equip</button>
        `);
      } else if (isEquipped) {
        itemDetails.append(`
          <button class="item-unequip" data-item-id="${item._id}">Unequip</button>
        `);
      }
    });

    html.on("click", ".item-equip", (ev) => {
      const itemId = ev.currentTarget.dataset.itemId;
      new EquipmentMenu(this.actor, itemId).render(true);
      this.render(true);
    });

    html.on("click", ".item-unequip", (ev) => {
      const itemId = ev.currentTarget.dataset.itemId;
      for (const [slot, equippedId] of Object.entries(
        this.actor.system.equipment
      )) {
        if (equippedId === itemId) {
          this.actor.system.equipment[slot] = "";
          break;
        }
      }
      this.actor.update({
        "system.equipment": this.actor.system.equipment,
      });
      this.render(true);
    });
  }
}
