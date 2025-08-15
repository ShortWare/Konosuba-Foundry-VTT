/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class KonosubaItemSheet extends ItemSheet {
  /** @override */
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

  /** @override */
  get template() {
    const path = "systems/konosuba/templates/item";
    return `${path}/item-${this.item.type}-sheet.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
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
    context.config = CONFIG.KONOSUBA;

    if (this.item.type === "skill") {
      if (
        this.item.system.customRolls &&
        !Array.isArray(this.item.system.customRolls)
      ) {
        this.item.system.customRolls = Object.values(
          this.item.system.customRolls
        );
      }
    }

    return context;
  }

  /* -------------------------------------------- */

  /** @override */
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
        rolls.push({ name: "", formula: "" });
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
    }
  }
}
