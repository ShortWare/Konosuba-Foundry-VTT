import KonosubaItemBase from "./base-item.mjs";

export default class KonosubaSkill extends KonosubaItemBase {
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.level = new fields.ObjectField({
      required: true,
      nullable: false,
      initial: {
        value: 1,
        max: 1,
      },
    });

    schema.timing = new fields.StringField({
      required: true,
      nullable: false,
      initial: "",
    });

    schema.check = new fields.StringField({
      required: true,
      nullable: false,
      initial: "",
    });

    schema.customCheck = new fields.ObjectField({
      required: true,
      nullable: false,
      initial: {
        title: "",
        formula: "",
      },
    });

    schema.target = new fields.StringField({
      required: true,
      nullable: false,
      initial: "",
    });

    schema.range = new fields.StringField({
      required: true,
      nullable: false,
      initial: "",
    });

    schema.cost = new fields.NumberField({
      required: true,
      nullable: true,
      integer: true,
      min: 0,
    });

    schema.effects = new fields.StringField({
      required: true,
      nullable: false,
      initial: "",
    });

    schema.critical = new fields.StringField({
      required: true,
      nullable: false,
      initial: "",
    });

    schema.customRolls = new fields.ArrayField({
      required: true,
      nullable: false,
      initial: [],
    });

    return schema;
  }
}
