export class KonosubaItemSheet extends ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["konosuba", "sheet", "item"],
      width: 520,
      height: 480,
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
        },
      ],
    });
  }

  get template() {
    const path = "systems/konosuba/templates/item";
    return `${path}/item-${this.item.type}-sheet.hbs`;
  }

  /* -------------------------------------------- */

  async getData() {
    const context = super.getData();
    const itemData = this.document.toObject(false);

    context.enrichedDescription = await TextEditor.enrichHTML(
      this.item.system.description,
      {
        secrets: this.document.isOwner,
        async: true,
        rollData: this.item.getRollData(),
        relativeTo: this.item,
      }
    );

    context.system = itemData.system;
    context.flags = itemData.flags;

    if (this.item.type === "skill") {
      if (
        this.item.system.customRolls &&
        !Array.isArray(this.item.system.customRolls)
      ) {
        this.item.system.customRolls = Object.values(
          this.item.system.customRolls
        );
      }
    } else if (this.item.type === "item") {
      const classes = await game.items.filter((item) => item.type === "class");
      context.availableClasses = classes.map((item) => {
        return {
          id: item.id,
          name: item.name,
        };
      });
    }

    return context;
  }

  /* -------------------------------------------- */

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;

    if (this.item.type === "skill") {
      html.find(".add-roll").click((ev) => {
        ev.preventDefault();
        const rolls = this.item.system.customRolls || [];
        if (rolls && !Array.isArray(rolls)) {
          rolls = Object.values(rolls);
        }
        rolls.push({ name: "", formula: "", customId: "" });
        this.item.update({ "system.customRolls": rolls });
        this.render(true);
      });

      html.find(".delete-roll").click((ev) => {
        ev.preventDefault();
        const index = Number(ev.currentTarget.dataset.index);
        let rolls = duplicate(this.item.system.customRolls);
        if (rolls && !Array.isArray(rolls)) {
          rolls = Object.values(rolls);
        }
        rolls.splice(index, 1);
        this.item.update({ "system.customRolls": rolls });
        this.render(true);
      });

      html.find('input[name="system.timing"]').on("change", async () => {
        const formData = this._getSubmitData();
        const timing = String(
          foundry.utils.getProperty(formData, "system.timing") || ""
        )
          .trim()
          .toLowerCase();
        await this.item.update({ "system.active": timing === "passive" });
      });
    } else if (this.item.type === "item") {
      html.find(".class-restriction").on("change", (ev) => {
        const classId = ev.currentTarget.dataset.classId;
        const isChecked = ev.currentTarget.checked;
        let classRestrictions = this.item.system.classRestrictions || [];
        if (isChecked) {
          classRestrictions.push(classId);
        } else {
          classRestrictions = classRestrictions.filter((id) => id !== classId);
        }
        this.item.update({ "system.classRestrictions": classRestrictions });
        this.render(true);
      });

      html.find(".add-modifier").click((ev) => {
        ev.preventDefault();
        const modifiers = this.item.system.customModifiers || [];
        if (modifiers && !Array.isArray(modifiers)) {
          modifiers = Object.values(modifiers);
        }
        modifiers.push({
          name: "",
          formula: "",
          applyWhen: "always",
          rollIds: "",
        });
        this.item.update({ "system.customModifiers": modifiers });
        this.render(true);
      });

      html.find(".delete-modifier").click((ev) => {
        ev.preventDefault();
        const index = Number(ev.currentTarget.dataset.index);
        let modifiers = duplicate(this.item.system.customModifiers);
        if (modifiers && !Array.isArray(modifiers)) {
          modifiers = Object.values(modifiers);
        }
        modifiers.splice(index, 1);
        this.item.update({ "system.customModifiers": modifiers });
        this.render(true);
      });
    }
  }
}
