/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function () {
  return loadTemplates([
    // Actor partials.
    "systems/konosuba/templates/actor/parts/actor-home.hbs",
    "systems/konosuba/templates/actor/parts/actor-skills.hbs",
    "systems/konosuba/templates/actor/parts/actor-abilities.hbs",
    "systems/konosuba/templates/actor/parts/actor-combat.hbs",
    "systems/konosuba/templates/actor/parts/actor-inventory.hbs",
    "systems/konosuba/templates/actor/parts/actor-character.hbs",
  ]);
};
