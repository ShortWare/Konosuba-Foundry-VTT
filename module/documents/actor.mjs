export class KonosubaActor extends Actor {
  prepareData() {
    super.prepareData();
  }

  prepareDerivedData() {
    const actorData = this;
    this._prepareCharacterData(actorData);
  }

  _prepareCharacterData(actorData) {
    if (actorData.type !== "character") return;
    this.calculateStats(actorData);
  }

  getRollData() {
    const data = { ...this.system, combat: this.combat };
    return data;
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

    let maxHealth = 0;
    let maxMana = 0;
    const classItems = data.items.filter((i) => i.type === "class");
    if (classItems.length > 0) {
      let classItem = classItems[0];
      maxHealth += classItem.system.health.start;
      maxHealth +=
        classItem.system.health.gain * (data.system.attributes.level.value - 1);
      maxMana += classItem.system.mana.start;
      maxMana +=
        classItem.system.mana.gain * (data.system.attributes.level.value - 1);
    }

    switch (data.system.lifestyle) {
      case "stable":
        maxHealth -= data.system.attributes.level.value * 5;
        maxMana -= data.system.attributes.level.value * 5;
        break;
      case "economy":
        maxHealth += 5;
        maxMana += 5;
        break;
      case "suite":
        maxHealth += 10;
        maxMana += 10;
        break;
      case "royal":
        maxHealth += 30;
        maxMana += 30;
        break;
    }
    if (maxHealth < 1) maxHealth = 1;
    if (maxMana < 1) maxMana = 1;

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
      detectTraps: {
        flat: data.system.abilities.perception.score,
        dice: 2,
      },
      disarmTraps: {
        flat: data.system.abilities.dexterity.score,
        dice: 2,
      },
      senseThreats: {
        flat: data.system.abilities.perception.score,
        dice: 2,
      },
      identifyEnemy: {
        flat: data.system.abilities.intelligence.score,
        dice: 2,
      },
      magicCheck: {
        flat: data.system.abilities.intelligence.score,
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

    // --- Apply skill modifiers ---
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

        maxHealth += eval(skill.system.modifiers["health"] || "0");
        maxMana += eval(skill.system.modifiers["mana"] || "0");
      }
    });

    // --- Apply equipped item modifiers ---
    const equippedIds = Object.values(data.system.equipment || {});
    const items = data.items.filter(
      (i) => i.type === "item" && equippedIds.includes(i._id)
    );

    items.forEach((item) => {
      Object.entries(rollModifiers).forEach(([key, modifier]) => {
        let tmp = item.system.modifiers?.[key] || "0";
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
        let tmp = item.system.modifiers?.[key] || "0";
        tmp = tmp.replaceAll("CL", data.system.attributes.level.value);
        attributeModifiers[key] =
          (attributeModifiers[key] || 0) + eval(tmp) || 0;
      });

      maxHealth += eval(item.system.modifiers?.["health"] || "0");
      maxMana += eval(item.system.modifiers?.["mana"] || "0");
    });

    data.combat = {};
    data.combat.hitCheck = rollModifiers.hitCheck;
    data.combat.attackPower = rollModifiers.attackPower;
    data.combat.dodgeCheck = rollModifiers.dodgeCheck;
    data.combat.detectTraps = rollModifiers.detectTraps;
    data.combat.disarmTraps = rollModifiers.disarmTraps;
    data.combat.senseThreats = rollModifiers.senseThreats;
    data.combat.identifyEnemy = rollModifiers.identifyEnemy;
    data.combat.magicCheck = rollModifiers.magicCheck;
    data.combat.combatAttributes = {
      physicalDefense: attributeModifiers.physicalDefense,
      magicDefense: attributeModifiers.magicDefense,
      actionPoints: attributeModifiers.actionPoints,
      movement: attributeModifiers.movement,
    };

    data.system.health.max = maxHealth;
    data.system.mana.max = maxMana;
  }
}
