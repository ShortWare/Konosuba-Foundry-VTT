import { DiceMenu } from "../ui/roll_dice.js";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class KonosubaActorSheet extends ActorSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["konosuba", "sheet", "actor"],
      width: 600,
      height: 600,
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
    const context = super.getData();
    const actorData = this.document.toObject(false);

    context.system = actorData.system;
    context.flags = actorData.flags;
    context.config = CONFIG.KONOSUBA;

    if (actorData.type == "player") {
      this._prepareItems(context);
      this._prepareCharacterData(context);
    }
    if (actorData.type == "npc") {
      this._prepareItems(context);
    }

    context.enrichedBiography = await TextEditor.enrichHTML(
      this.actor.system.biography,
      {
        secrets: this.document.isOwner,
        async: true,
        rollData: this.actor.getRollData(),
        relativeTo: this.actor,
      }
    );

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
        if (i.system.customRolls) {
          const customRollsData = i.system.customRolls
            .split(";")
            .map((pair) => {
              const [name, check] = pair.split(":");
              return {
                name: name.trim(),
                check: check.trim().replaceAll("SL", i.system.level.value),
              };
            });
          i.system.customRolls = customRollsData;
        }
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

    // Skill Calculation
    html
      .find('input[name^="system.abilities"][name$=".value"]')
      .on("change", (event) => {
        const input = event.currentTarget;
        const name = input.name;
        const ability = name.split(".")[2];
        const value = Number(input.value);
        this.changeStat(this.actor, ability, value);
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

      this.updateStats(app.actor);

      Hooks.once("closeActorSheet", (sheetApp) => {
        if (sheetApp === app) {
          app._sheetOpened = false;
        }
      });
    });

    Hooks.on("createItem", (item, options, userId) => {
      this.updateStats(item.parent);
    });

    Hooks.on("deleteItem", (item, options, userId) => {
      this.updateStats(item.parent);
    });
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

  changeStat(actor, ability, value = null) {
    const bonus = Math.floor(
      (value || actor.system.abilities[ability].value) / 3
    );
    const abilityData = actor.system.abilities[ability];

    const classItem = actor.items.find((i) => i.type === "class") || null;
    if (classItem && classItem.system.modifiers?.[ability] !== undefined) {
      abilityData.class = classItem.system.modifiers[ability];
    }
    const classMod = Number(abilityData.class || 0);

    const skills = actor.items.filter((i) => i.type === "skill");

    this.skillsFlat = 0;
    this.skillsDice = 0;

    skills.forEach((skill) => {
      if (skill.system.active) {
        let modifier = skill.system.modifiers[ability] || "0";
        modifier = modifier.replaceAll("SL", skill.system.level.value);
        if (modifier.includes("d6")) {
          let parts = modifier.split("d6");
          this.skillsDice += eval(parts[0]) || 0;
          this.skillsFlat += eval(parts[1]) || 0;
        } else {
          this.skillsFlat += eval(modifier) || 0;
        }
      }
    });

    abilityData.skills = this.skillsFlat || 0;
    abilityData.skillsDice = this.skillsDice || 0;

    const score = Number(bonus + classMod + eval(this.skillsFlat));
    const dice = Number(2 + eval(this.skillsDice));

    actor.update({
      [`system.abilities.${ability}.bonus`]: bonus,
      [`system.abilities.${ability}.class`]: classMod,
      [`system.abilities.${ability}.skills`]: eval(this.skillsFlat),
      [`system.abilities.${ability}.score`]: score,
      [`system.abilities.${ability}.skillsDice`]: eval(this.skillsDice),
      [`system.abilities.${ability}.dice`]: dice,
    });
  }

  updateStats(actor) {
    Object.entries(actor.system.abilities).forEach(([key, ability]) => {
      this.changeStat(actor, key);
    });
  }
}
