/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class KonosubaActor extends Actor {
  /** @override */
  prepareData() {
    super.prepareData();
  }

  /** @override */
  prepareBaseData() {}

  prepareDerivedData() {
    const actorData = this;
    const systemData = actorData.system;
    const flags = actorData.flags.konosuba || {};

    this._preparePlayerData(actorData);
    this._prepareNpcData(actorData);
  }

  _preparePlayerData(actorData) {
    if (actorData.type !== "player") return;
    this.calculateStats(actorData);
  }
  _prepareNpcData(actorData) {
    if (actorData.type !== "npc") return;
  }

  getRollData() {
    const data = { ...this.system, combat: this.combat };

    this._getPlayerRollData(data);
    this._getNpcRollData(data);

    return data;
  }

  _getPlayerRollData(data) {
    if (this.type !== "player") return;
  }
  _getNpcRollData(data) {
    if (this.type !== "npc") return;
  }

  calculateAbility(data, ability) {
    const abilityData = this.system.abilities[ability];
    const bonus = Math.floor(abilityData.value / 3);

    const classItem = this.items.find((i) => i.type === "class") || null;
    if (classItem && classItem.system.modifiers?.[ability] !== undefined) {
      abilityData.class = classItem.system.modifiers[ability];
    }
    const classMod = Number(abilityData.class || 0);

    const skills = this.items.filter((i) => i.type === "skill");
    let skillsFlat = 0;
    let skillsDice = 0;

    skills.forEach((skill) => {
      if (skill.system.active) {
        let modifier = skill.system.modifiers[ability] || "0";
        modifier = modifier.replaceAll("SL", skill.system.level.value);
        modifier = modifier.replaceAll(
          "CL",
          data.system.attributes.level.value
        );
        if (modifier.includes("d6")) {
          let parts = modifier.split("d6");
          skillsDice += eval(parts[0]) || 0;
          skillsFlat += eval(parts[1]) || 0;
        } else {
          skillsFlat += eval(modifier) || 0;
        }
      }
    });

    const score = Number(bonus + classMod + eval(skillsFlat));
    const dice = Number(2 + eval(skillsDice));

    data.system.abilities[ability].bonus = bonus;
    data.system.abilities[ability].class = classMod;
    data.system.abilities[ability].skills = eval(skillsFlat);
    data.system.abilities[ability].score = score;
    data.system.abilities[ability].skillsDice = eval(skillsDice);
    data.system.abilities[ability].dice = dice;
  }

  calculateStats(data) {
    Object.entries(data.system.abilities).forEach(([key, ability]) => {
      this.calculateAbility(data, key);
    });

    const skills = data.items.filter((i) => i.type === "skill");
    const rollModifiers = {
      hitCheck: {
        flat: data.system.abilities.dexterity.score,
        dice: 2,
      },
      attackPower: {
        flat: 0,
        dice: 2,
      },
      dodgeCheck: {
        flat: data.system.abilities.agility.score,
        dice: 2,
      },
    };
    const attributeModifiers = {
      physicalDefense: 0,
      magicDefense: 0,
      actionPoints:
        data.system.abilities.agility.score +
        data.system.abilities.perception.score,
      movement: data.system.abilities.strength.score + 5,
    };

    skills.forEach((skill) => {
      if (skill.system.active) {
        Object.entries(rollModifiers).forEach(([key, modifier]) => {
          let tmp = skill.system.modifiers[key] || "0";
          tmp = tmp.replaceAll("SL", skill.system.level.value);
          tmp = tmp.replaceAll("CL", data.system.attributes.level.value);

          if (tmp.includes("d6")) {
            let parts = tmp.split("d6");
            modifier.dice += eval(parts[0]) || 0;
            modifier.flat += eval(parts[1]) || 0;
          } else {
            modifier.flat += eval(tmp) || 0;
          }
        });

        Object.entries(attributeModifiers).forEach(([key, modifier]) => {
          let tmp = skill.system.modifiers[key] || "0";
          tmp = tmp.replaceAll("SL", skill.system.level.value);
          tmp = tmp.replaceAll("CL", data.system.attributes.level.value);
          attributeModifiers[key] =
            (attributeModifiers[key] || 0) + eval(tmp) || 0;
        });
      }
    });

    data.combat = {};
    data.combat.hitCheck = rollModifiers.hitCheck;
    data.combat.attackPower = rollModifiers.attackPower;
    data.combat.dodgeCheck = rollModifiers.dodgeCheck;
    data.combat.combatAttributes = {
      physicalDefense: attributeModifiers.physicalDefense,
      magicDefense: attributeModifiers.magicDefense,
      actionPoints: attributeModifiers.actionPoints,
      movement: attributeModifiers.movement,
    };
  }
}
