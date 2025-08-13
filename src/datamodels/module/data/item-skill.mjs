import KonosubaItemBase from "./base-item.mjs";

export default class KonosubaSkill extends KonosubaItemBase {
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.skillLevel = new fields.NumberField({
      required: true,
      nullable: false,
      integer: true,
      initial: 1,
      min: 1,
    });

    schema.skillTiming = new fields.StringField({
      required: true,
      nullable: false,
      initial: "",
    });

    schema.skillCheck = new fields.StringField({
      required: true,
      nullable: false,
      initial: "",
    });

    schema.skillTarget = new fields.StringField({
      required: true,
      nullable: false,
      initial: "",
    });

    schema.skillRange = new fields.StringField({
      required: true,
      nullable: false,
      initial: "",
    });

    schema.skillCost = new fields.NumberField({
      required: true,
      nullable: true,
      integer: true,
      min: 0,
    });

    schema.skillMaxLevel = new fields.NumberField({
      required: true,
      nullable: false,
      integer: true,
      min: 1,
    });

    schema.skillEffects = new fields.StringField({
      required: true,
      nullable: false,
      initial: "",
    });

    schema.skillCustomRolls = new fields.StringField({
      required: true,
      nullable: false,
      initial: "",
    });

    return schema;
  }
}
