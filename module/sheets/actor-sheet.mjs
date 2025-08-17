import { DiceMenu } from "../ui/roll_dice.js";

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
    // This is where you can enrich character-specific editor fields
    // or setup anything else that's specific to this type
  }

  /**
   * Organize and classify Items for Actor sheets.
   *
   * @param {object} context The context object to mutate
   */
  _prepareItems(context) {
    const gear = [];
    const skills = [];

    for (let i of context.items) {
      i.img = i.img || Item.DEFAULT_ICON;
      if (i.type === "item") {
        gear.push(i);
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
      new DiceMenu(this.actor, { title, formula }).render(true);
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

    // Render the item sheet for viewing/editing prior to the editable check.
    html.on("click", ".item-edit", (ev) => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Add Inventory Item
    html.on("click", ".item-create", this._onItemCreate.bind(this));

    // Delete Inventory Item
    html.on("click", ".item-delete", (ev) => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.delete();
      li.slideUp(200, () => this.render(false));
    });

    // Rollable abilities.
    html.on("click", ".rollable", this._onRoll.bind(this));

    // Drag events for macros.
    if (this.actor.isOwner) {
      let handler = (ev) => this._onDragStart(ev);
      html.find("li.item").each((i, li) => {
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
  }

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      system: data,
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.system["type"];

    // Finally, create the item!
    return await Item.create(itemData, { parent: this.actor });
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    // Handle item rolls.
    if (dataset.rollType) {
      if (dataset.rollType == "item") {
        const itemId = element.closest(".item").dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) return item.roll();
      }
    }

    // Handle rolls that supply the formula directly.
    if (dataset.roll) {
      let label = dataset.label ? `[ability] ${dataset.label}` : "";
      let roll = new Roll(dataset.roll, this.actor.getRollData());
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label,
        rollMode: game.settings.get("core", "rollMode"),
      });
      return roll;
    }
  }
}
