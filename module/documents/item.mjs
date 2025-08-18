export class KonosubaItem extends Item {
  prepareData() {
    super.prepareData();
  }

  getRollData() {
    const rollData = { ...this.system };
    if (!this.actor) return rollData;

    rollData.actor = this.actor.getRollData();

    return rollData;
  }
}
