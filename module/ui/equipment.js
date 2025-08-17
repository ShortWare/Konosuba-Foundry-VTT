export class EquipmentMenu extends Application {
  constructor(actor, itemId, options = {}) {
    super(options);
    this.actor = actor;
    this.item = this.actor.items.get(itemId);

    this.selectedSlot = null;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "equipment-menu",
      title: "Equip Item",
      template: "systems/konosuba/templates/actor/equip-item.hbs",
      width: 400,
      height: "auto",
    });
  }

  getData() {
    const item = this.actor.items.get(this.item._id);

    let possibleSlots = [];
    switch (item.system.equipSlot) {
      case "head":
        possibleSlots.push({
          key: "head",
          label: "Head",
          currentItem: this.actor.system.equipment.head
            ? this.actor.items.get(this.actor.system.equipment.head)
            : null,
        });
        break;
      case "body":
        possibleSlots.push({
          key: "body",
          label: "Body",
          currentItem: this.actor.system.equipment.body
            ? this.actor.items.get(this.actor.system.equipment.body)
            : null,
        });
        break;
      case "support-armor":
        possibleSlots.push({
          key: "otherArmor",
          label: "Support Armor",
          currentItem: this.actor.system.equipment.otherArmor
            ? this.actor.items.get(this.actor.system.equipment.otherArmor)
            : null,
        });
        break;
      case "one":
        possibleSlots.push(
          {
            key: "rightHand",
            label: "Right Hand",
            currentItem: this.actor.system.equipment.rightHand
              ? this.actor.items.get(this.actor.system.equipment.rightHand)
              : null,
          },
          {
            key: "leftHand",
            label: "Left Hand",
            currentItem: this.actor.system.equipment.leftHand
              ? this.actor.items.get(this.actor.system.equipment.leftHand)
              : null,
          }
        );
        break;
      case "dual":
      case "both":
        // For dual/both → must occupy both hands
        possibleSlots.push({
          key: "bothHands",
          label: "Both Hands",
          currentItem: [
            this.actor.system.equipment.rightHand
              ? this.actor.items.get(this.actor.system.equipment.rightHand)
              : null,
            this.actor.system.equipment.leftHand
              ? this.actor.items.get(this.actor.system.equipment.leftHand)
              : null,
          ].filter(Boolean),
        });
        break;
      case "accessory":
        possibleSlots.push({
          key: "accessory",
          label: "Accessory",
          currentItem: this.actor.system.equipment.accessory
            ? this.actor.items.get(this.actor.system.equipment.accessory)
            : null,
        });
        break;
    }

    return {
      actor: this.actor,
      item,
      slots: possibleSlots,
      selectedSlot: this.selectedSlot,
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.on("click", ".slot-choice", (ev) => {
      const slot = ev.currentTarget.dataset.slot;
      this.selectedSlot = slot;
      this.render(true);
    });

    html.on("click", ".unequip-slot", async (ev) => {
      const slot = ev.currentTarget.dataset.slot;
      if (slot === "bothHands") {
        this.actor.system.equipment.rightHand = "";
        this.actor.system.equipment.leftHand = "";
      } else {
        this.actor.system.equipment[slot] = "";
      }
      await this.actor.update({
        "system.equipment": this.actor.system.equipment,
      });
      this.render(true);
    });

    html.on("click", ".equip-item", async (ev) => {
      if (!this.selectedSlot) return;

      switch (this.selectedSlot) {
        case "head":
        case "body":
        case "otherArmor":
        case "accessory":
        case "rightHand":
        case "leftHand":
          this.actor.system.equipment[this.selectedSlot] = this.item._id;
          break;
        case "bothHands":
          this.actor.system.equipment.rightHand = this.item._id;
          this.actor.system.equipment.leftHand = this.item._id;
          break;
      }

      await this.actor.update({
        "system.equipment": this.actor.system.equipment,
      });
      this.close();
    });
  }
}
