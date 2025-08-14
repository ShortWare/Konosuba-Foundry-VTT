export class DiceMenu extends Application {
  constructor(actor, diceOptions, options = {}) {
    if (diceOptions.title) {
      options = foundry.utils.mergeObject(
        { title: diceOptions.title },
        options
      );
    }
    super(options);
    this.actor = actor;
    this.diceOptions = diceOptions || {
      modifiers: [],
    };

    if (!this.diceOptions.modifiers) {
      this.diceOptions.modifiers = [];
    }
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "dice-menu",
      title: "Dice Roller",
      template: "systems/konosuba/templates/dice/roll-dice.hbs",
      width: 300,
    });
  }

  getData() {
    return {
      actor: this.actor,
      options: this.diceOptions,
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find(".add-modifier").on("click", (ev) => {
      ev.preventDefault();
      const modifierName = html.find("input[name='modifier-name']").val();
      const modifierValue = html.find("input[name='modifier']").val();
      this.diceOptions.modifiers.push({
        id: foundry.utils.randomID(),
        name: modifierName,
        value: modifierValue,
        active: true,
        editable: true,
      });
      html.find("input[name='modifier-name']").val("");
      html.find("input[name='modifier']").val("");
      this.render(true);
    });

    html.find(".remove-modifier").on("click", (ev) => {
      ev.preventDefault();
      const modifierIndex = ev.target.dataset.modifierIndex;
      this.diceOptions.modifiers = this.diceOptions.modifiers.filter(
        (m) => m.id !== modifierIndex
      );
      this.render(true);
    });

    // Form submission
    html.find("form").on("submit", this._onSubmit.bind(this));
  }

  async _onSubmit(ev) {
    ev.preventDefault();
    const form = new FormData(ev.target);

    this.diceOptions.modifiers.forEach((modifier) => {
      console.log((modifier.active = form.get(modifier.id + "-active")));
      modifier.active = form.get(modifier.id + "-active") === "on";
    });

    const activeModifiers = this.diceOptions.modifiers.filter((m) => m.active);
    let formula = `${this.diceOptions.formula || "d6"}${
      activeModifiers.length > 0
        ? activeModifiers
            .map((m) => {
              const sign = m.value.startsWith("-") ? "-" : "+";
              const num = m.value.replace(/^[-+]/, "");
              return `${sign}(${num})`;
            })
            .join("")
        : ""
    }`;

    let roll = new Roll(formula);
    await roll.roll({ async: true });
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `Custom Roll (${formula})`,
      flags: {
        konosuba: {
          reroll: {
            actorId: this.actor.id,
            rollData: {
              reroll: true,
              ...this.diceOptions,
            },
          },
        },
      },
    });

    this.close();
  }
}
