import { CATEGORIES, UNITS, cleanDiet, validateDiet } from "./diet.js";
import { HOURS_PER_WEEK, hoursUntil } from "./schedule.js";
import { LANGUAGES, localize, t } from "./i18n.js";
import { getCurrentDiet, saveAndApplyDiet } from "./diet-view.js";
import { timeToHours } from "./dates.js";

/** Editor tabs in display order. Each resolves to `dietEditor.tab.<name>` in the language files. */
const TABS = ["general", "ingredients", "meals", "week", "fasts"];

/** Values of a meal and of the sweet treat, in display order. */
const MACROS = ["kcal", "protein", "carbs", "fat"];

/** Time given to a meal added to the week. */
const NEW_MEAL_TIME = "12:00";

/**
 * The diet being edited: a copy of the diet in use, in the stored shape, changed directly by the inputs.
 * Null until the editor is first opened, and again after the changes are discarded.
 * @type {ReturnType<typeof cleanDiet> | null}
 */
let draft = null;

/** Whether the draft has changes that are not saved. */
let dirty = false;

/** Open editor tab, one of TABS. */
let tab = "general";

/** Meal shown in the Meals tab. */
let selectedMealId = null;

/** Day shown in the Week tab, where 0 is Monday. */
let selectedDay = 0;

/**
 * Creates an element with a class and optional text.
 * @param {string} tag Element name.
 * @param {string} className Element class names.
 * @param {string} [text] Element text.
 * @returns {HTMLElement} The new element.
 */
function createElement(tag, className, text = "") {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

/**
 * Creates a button.
 * @param {string} className Button class names.
 * @param {string} text Button text.
 * @param {function(): void} onClick Click handler.
 * @param {string} [label] Accessible label when the text is a symbol.
 * @returns {HTMLButtonElement} The button.
 */
function createButton(className, text, onClick, label) {
  const button = createElement("button", className, text);
  button.type = "button";
  button.addEventListener("click", onClick);
  if (label) {
    button.setAttribute("aria-label", label);
  }
  return button;
}

/**
 * Creates a remove button with a cross.
 * @param {string} labelKey Translation key of the accessible label.
 * @param {function(): void} onClick Click handler.
 * @returns {HTMLButtonElement} The button.
 */
function createRemoveButton(labelKey, onClick) {
  return createButton("control progression-remove", "×", onClick, t(labelKey));
}

/**
 * Wraps a control with a small label above it.
 * @param {string} labelKey Translation key of the label.
 * @param {HTMLElement} control The input, select or group.
 * @param {string} [className] Extra class names of the field.
 * @returns {HTMLLabelElement | HTMLDivElement} The field.
 */
function createField(labelKey, control, className = "") {
  const field = createElement(control.tagName === "DIV" ? "div" : "label", `set-field ${className}`.trim());
  field.append(createElement("span", "set-field-name", t(labelKey)), control);
  return field;
}

/**
 * Shows a message next to the save button.
 * @param {string} key Translation key, or an empty string to clear the message.
 * @param {Record<string, string>} [params] Values for the message placeholders.
 */
function setStatus(key, params) {
  document.getElementById("diet-editor-status").textContent = key ? t(key, params) : "";
}

/** Marks the draft as changed. */
function markDirty() {
  dirty = true;
  setStatus("dietEditor.unsaved");
}

/**
 * Creates one input for each language, writing into owner[key] as {"en": "...", "pl": "..."}.
 * @param {Record<string, *>} owner The object that holds the text.
 * @param {string} key The text field of the owner.
 * @param {{multiline?: boolean, maxLength?: number, labelKey: string}} options Input settings and the accessible label.
 * @returns {HTMLDivElement} The inputs side by side.
 */
function createLocalizedInputs(owner, key, { multiline = false, maxLength = 120, labelKey }) {
  owner[key] = { ...Object.fromEntries(LANGUAGES.map((language) => [language, ""])), ...owner[key] };
  const pair = createElement("div", "lang-pair");
  for (const language of LANGUAGES) {
    const input = document.createElement(multiline ? "textarea" : "input");
    if (multiline) {
      input.rows = 2;
    } else {
      input.type = "text";
    }
    input.maxLength = maxLength;
    input.placeholder = language.toUpperCase();
    input.value = owner[key][language];
    input.setAttribute("aria-label", `${t(labelKey)} (${language.toUpperCase()})`);
    input.addEventListener("input", () => {
      owner[key][language] = input.value;
      markDirty();
    });
    pair.append(input);
  }
  return pair;
}

/**
 * Creates a number input writing into owner[key]; an empty input counts as 0.
 * @param {Record<string, *>} owner The object that holds the number.
 * @param {string} key The number field of the owner.
 * @param {function(): void} [onChange] Called after the number changed.
 * @returns {HTMLInputElement} The input.
 */
function createNumberInput(owner, key, onChange = () => {}) {
  const input = document.createElement("input");
  input.type = "number";
  input.inputMode = "decimal";
  input.min = "0";
  input.step = "any";
  input.value = String(owner[key] ?? 0);
  input.addEventListener("input", () => {
    owner[key] = Number.isNaN(input.valueAsNumber) ? 0 : input.valueAsNumber;
    markDirty();
    onChange();
  });
  return input;
}

/**
 * Creates a select.
 * @param {Array<{value: string, label: string}>} options The choices.
 * @param {string} value The selected value.
 * @param {function(string): void} onChange Called with the new value.
 * @returns {HTMLSelectElement} The select.
 */
function createSelect(options, value, onChange) {
  const select = document.createElement("select");
  select.append(...options.map((option) => new Option(option.label, option.value)));
  select.value = value;
  select.addEventListener("change", () => {
    onChange(select.value);
    markDirty();
  });
  return select;
}

/**
 * Creates a time input writing into owner[key] as HH:MM.
 * @param {Record<string, *>} owner The object that holds the time.
 * @param {string} key The time field of the owner.
 * @param {function(): void} [onChange] Called after the time changed.
 * @returns {HTMLInputElement} The input.
 */
function createTimeInput(owner, key, onChange = () => {}) {
  const input = document.createElement("input");
  input.type = "time";
  input.required = true;
  input.value = owner[key];
  input.addEventListener("input", () => {
    owner[key] = input.value;
    markDirty();
    onChange();
  });
  return input;
}

/**
 * Lists the days of the week for a select.
 * @returns {Array<{value: string, label: string}>} One choice per day, Monday first.
 */
function dayOptions() {
  return t("daysLong").map((name, index) => ({ value: String(index), label: name }));
}

/**
 * Sorts items by their name in the current language.
 * @param {Array<{name: Record<string, string>}>} items The items.
 * @returns {Array<{name: Record<string, string>}>} A sorted copy.
 */
function sortByName(items) {
  const language = document.documentElement.lang;
  return [...items].sort((a, b) => localize(a.name).localeCompare(localize(b.name), language));
}

/**
 * Names an item, or says it has no name yet.
 * @param {{name: Record<string, string>}} item The item.
 * @returns {string} The name.
 */
function nameOf(item) {
  return localize(item.name) || t("dietEditor.unnamed");
}

/**
 * Formats energy and macronutrient values.
 * @param {{kcal: number, protein: number, carbs: number, fat: number}} values The values.
 * @returns {string} The translated summary.
 */
function formatMacros(values) {
  return t("diet.macros", Object.fromEntries(MACROS.map((key) => [key, String(Math.round(values[key]))])));
}

/**
 * Adds up the values of one day of the draft, sweet treats included.
 * @param {number} dayIndex Day of the week, where 0 is Monday.
 * @returns {{kcal: number, protein: number, carbs: number, fat: number}} The totals.
 */
function dayTotals(dayIndex) {
  const totals = Object.fromEntries(MACROS.map((key) => [key, 0]));
  for (const planned of draft.days[dayIndex].meals) {
    const meal = draft.meals.find((candidate) => candidate.id === planned.mealId);
    for (const values of [meal, planned.sweet ? draft.treat : null]) {
      for (const key of MACROS) {
        totals[key] += values?.[key] ?? 0;
      }
    }
  }
  return totals;
}

/**
 * Adds up the values of the whole week of the draft.
 * @returns {{kcal: number, protein: number, carbs: number, fat: number}} The totals.
 */
function weekTotals() {
  const days = draft.days.map((_, dayIndex) => dayTotals(dayIndex));
  return Object.fromEntries(MACROS.map((key) => [key, days.reduce((sum, day) => sum + day[key], 0)]));
}

/**
 * Lists where a meal is planned in the week.
 * @param {string} mealId Meal id.
 * @returns {string[]} Labels such as "Mon 12:00".
 */
function plannedAt(mealId) {
  return draft.days.flatMap((day, dayIndex) => day.meals
    .filter((planned) => planned.mealId === mealId)
    .map((planned) => `${t("days")[dayIndex]} ${planned.time}`));
}

/**
 * Lists planned meals that fall inside a fast. A meal at the very start or end of a fast is allowed.
 * @returns {string[]} One warning per meal.
 */
function mealsInFasts() {
  const position = (moment) => moment.day * 24 + timeToHours(moment.time);
  const fasts = draft.fasts
    .filter((fast) => fast.start.time && fast.end.time)
    .map((fast) => ({ start: position(fast.start), length: hoursUntil(position(fast.start), position(fast.end)) }));

  return draft.days.flatMap((day, dayIndex) => day.meals
    .filter((planned) => planned.time && fasts.some((fast) => {
      const sinceStart = hoursUntil(fast.start, dayIndex * 24 + timeToHours(planned.time));
      return sinceStart > 0 && sinceStart < fast.length;
    }))
    .map((planned) => {
      const meal = draft.meals.find((candidate) => candidate.id === planned.mealId);
      return t("dietEditor.mealInFast", { day: t("days")[dayIndex], time: planned.time, meal: meal ? nameOf(meal) : "-" });
    }));
}

/**
 * Fills a list with warnings about meals inside fasts.
 * @param {HTMLUListElement} list The list.
 */
function fillFastWarnings(list) {
  list.replaceChildren(...mealsInFasts().map((warning) => createElement("li", "", warning)));
}

/**
 * Creates the list of warnings about meals inside fasts.
 * @returns {HTMLUListElement} The list, empty when there is nothing to warn about.
 */
function createFastWarnings() {
  const list = createElement("ul", "editor-warnings");
  fillFastWarnings(list);
  return list;
}

/**
 * Creates a section title.
 * @param {string} key Translation key.
 * @returns {HTMLHeadingElement} The title.
 */
function createTitle(key) {
  return createElement("h3", "form-title", t(key));
}

/**
 * Creates the General tab: diet name, sweet treat and week totals.
 * @returns {HTMLElement[]} The tab content.
 */
function createGeneralTab() {
  const totals = createElement("p", "empty", t("diet.weekTotal", { macros: formatMacros(weekTotals()) }));
  const treat = createElement("div", "set-row");
  treat.append(...MACROS.map((key) => createField(`dietEditor.${key}`, createNumberInput(draft.treat, key, () => {
    totals.textContent = t("diet.weekTotal", { macros: formatMacros(weekTotals()) });
  }))));

  return [
    createField("dietEditor.name", createLocalizedInputs(draft, "name", { labelKey: "dietEditor.name" }), "editor-wide"),
    createTitle("dietEditor.treat"),
    treat,
    totals,
  ];
}

/**
 * Lists the ingredients for a select, sorted by name.
 * @returns {Array<{value: string, label: string}>} One choice per ingredient.
 */
function ingredientOptions() {
  return sortByName(draft.ingredients).map((ingredient) => ({ value: ingredient.id, label: nameOf(ingredient) }));
}

/**
 * Lists the meals that use an ingredient, also as a replacement.
 * @param {string} ingredientId Ingredient id.
 * @returns {string[]} Meal names.
 */
function mealsUsing(ingredientId) {
  return draft.meals
    .filter((meal) => [...meal.ingredients, ...(meal.alternative?.ingredients ?? [])]
      .some((entry) => entry.ingredientId === ingredientId))
    .map(nameOf);
}

/**
 * Creates the Ingredients tab: one row per ingredient with its names, category and unit.
 * @returns {HTMLElement[]} The tab content.
 */
function createIngredientsTab() {
  const list = createElement("ol", "set-list");
  list.append(...draft.ingredients.map((ingredient, index) => {
    const row = createElement("li", "set-row editor-row");
    row.append(
      createField("dietEditor.ingredientName",
        createLocalizedInputs(ingredient, "name", { labelKey: "dietEditor.ingredientName" }), "editor-wide"),
      createField("dietEditor.category", createSelect(
        CATEGORIES.map((category) => ({ value: category, label: t(`category.${category}`) })),
        ingredient.category,
        (value) => { ingredient.category = value; },
      )),
      createField("dietEditor.unit", createSelect(
        UNITS.map((unit) => ({ value: unit, label: t(`dietEditor.unit.${unit}`) })),
        ingredient.unit,
        (value) => { ingredient.unit = value; },
      )),
      createRemoveButton("dietEditor.removeIngredient", () => {
        const meals = mealsUsing(ingredient.id);
        if (meals.length > 0) {
          setStatus("dietEditor.ingredientInUse", { name: nameOf(ingredient), meals: meals.join(", ") });
          return;
        }
        draft.ingredients.splice(index, 1);
        markDirty();
        renderTab();
      }),
    );
    return row;
  }));

  const add = createButton("control progression-add", t("dietEditor.addIngredient"), () => {
    draft.ingredients.push({ id: crypto.randomUUID(), name: {}, category: "other", unit: "g" });
    markDirty();
    renderTab();
    document.querySelector("#diet-editor-content > .set-list > li:last-child input")?.focus();
  });
  return [list, add];
}

/**
 * Creates the editable list of ingredient amounts of a meal or of its replacement.
 * @param {Array<{ingredientId: string, amount: number}>} amounts The amounts, changed in place.
 * @returns {HTMLElement[]} The list and its add button.
 */
function createAmountList(amounts) {
  const options = ingredientOptions();
  const list = createElement("ol", "set-list");
  list.append(...amounts.map((entry, index) => {
    const unit = createElement("span", "set-index", "");
    const showUnit = () => {
      const ingredient = draft.ingredients.find((candidate) => candidate.id === entry.ingredientId);
      unit.textContent = ingredient ? t(`dietEditor.unit.${ingredient.unit}`) : "";
    };
    showUnit();

    const row = createElement("li", "set-row");
    row.append(
      createField("dietEditor.ingredient", createSelect(options, entry.ingredientId, (value) => {
        entry.ingredientId = value;
        showUnit();
      }), "editor-wide"),
      createField("dietEditor.amount", createNumberInput(entry, "amount")),
      unit,
      createRemoveButton("dietEditor.removeMealIngredient", () => {
        amounts.splice(index, 1);
        markDirty();
        renderTab();
      }),
    );
    return row;
  }));

  const add = createButton("control progression-add", t("dietEditor.addMealIngredient"), () => {
    if (options.length === 0) {
      setStatus("dietEditor.noIngredients");
      return;
    }
    amounts.push({ ingredientId: options[0].value, amount: 0 });
    markDirty();
    renderTab();
  });
  return [list, add];
}

/**
 * Creates the editable list of preparation steps of a meal.
 * @param {{steps: Array<Record<string, string>>}} meal The meal, changed in place.
 * @returns {HTMLElement[]} The list and its add button.
 */
function createStepList(meal) {
  const list = createElement("ol", "set-list");
  list.append(...meal.steps.map((_, index) => {
    const row = createElement("li", "set-row editor-row");
    row.append(
      createElement("span", "set-index", `${index + 1}.`),
      createLocalizedInputs(meal.steps, index, { multiline: true, maxLength: 1000, labelKey: "dietEditor.steps" }),
      createRemoveButton("dietEditor.removeStep", () => {
        meal.steps.splice(index, 1);
        markDirty();
        renderTab();
      }),
    );
    return row;
  }));

  const add = createButton("control progression-add", t("dietEditor.addStep"), () => {
    meal.steps.push({});
    markDirty();
    renderTab();
  });
  return [list, add];
}

/**
 * Creates the form of one meal: names, values, ingredients, steps, spices and the replacement.
 * @param {object} meal The meal, changed in place.
 * @returns {HTMLElement[]} The form content.
 */
function createMealForm(meal) {
  const planned = plannedAt(meal.id);
  const values = createElement("div", "set-row");
  values.append(...MACROS.map((key) => createField(`dietEditor.${key}`, createNumberInput(meal, key))));

  const alternativeToggle = document.createElement("input");
  alternativeToggle.type = "checkbox";
  alternativeToggle.checked = Boolean(meal.alternative);
  alternativeToggle.addEventListener("change", () => {
    if (alternativeToggle.checked) {
      meal.alternative = { ingredients: [], step: {} };
    } else {
      delete meal.alternative;
    }
    markDirty();
    renderTab();
  });
  const alternativeField = createElement("label", "check-field");
  alternativeField.append(alternativeToggle, createElement("span", "", t("dietEditor.hasAlternative")));

  const content = [
    createElement("p", "empty", planned.length > 0
      ? t("dietEditor.mealPlanned", { days: planned.join(", ") })
      : t("dietEditor.mealNotPlanned")),
    createField("dietEditor.mealName", createLocalizedInputs(meal, "name", { labelKey: "dietEditor.mealName" }), "editor-wide"),
    values,
    createTitle("dietEditor.mealIngredients"),
    ...createAmountList(meal.ingredients),
    createField("dietEditor.seasoning",
      createLocalizedInputs(meal, "seasoning", { maxLength: 300, labelKey: "dietEditor.seasoning" }), "editor-wide"),
    createTitle("dietEditor.steps"),
    ...createStepList(meal),
    alternativeField,
  ];
  if (meal.alternative) {
    content.push(
      createTitle("dietEditor.alternativeIngredients"),
      ...createAmountList(meal.alternative.ingredients),
      createField("dietEditor.alternativeStep", createLocalizedInputs(meal.alternative, "step", {
        multiline: true, maxLength: 1000, labelKey: "dietEditor.alternativeStep",
      }), "editor-wide"),
    );
  }
  return content;
}

/**
 * Creates the Meals tab: a meal picker with add, copy and delete, and the form of the chosen meal.
 * @returns {HTMLElement[]} The tab content.
 */
function createMealsTab() {
  if (!draft.meals.some((meal) => meal.id === selectedMealId)) {
    selectedMealId = sortByName(draft.meals)[0]?.id ?? null;
  }
  const meal = draft.meals.find((candidate) => candidate.id === selectedMealId);

  const select = document.createElement("select");
  select.setAttribute("aria-label", t("dietEditor.pickMeal"));
  select.append(...sortByName(draft.meals).map((candidate) => new Option(nameOf(candidate), candidate.id)));
  select.value = selectedMealId ?? "";
  select.addEventListener("change", () => {
    selectedMealId = select.value;
    renderTab();
  });

  const toolbar = createElement("div", "workout-add measure-field");
  toolbar.append(
    select,
    createButton("control", t("dietEditor.newMeal"), () => {
      const created = { id: crypto.randomUUID(), name: {}, kcal: 0, protein: 0, carbs: 0, fat: 0, ingredients: [], steps: [] };
      draft.meals.push(created);
      selectedMealId = created.id;
      markDirty();
      renderTab();
    }),
  );
  if (meal) {
    toolbar.append(
      createButton("control", t("dietEditor.duplicateMeal"), () => {
        const copy = { ...structuredClone(meal), id: crypto.randomUUID() };
        copy.name = Object.fromEntries(LANGUAGES.map((language) => [
          language,
          meal.name[language] ? `${meal.name[language]}${t("dietEditor.copySuffix")}` : "",
        ]));
        draft.meals.push(copy);
        selectedMealId = copy.id;
        markDirty();
        renderTab();
      }),
      createButton("control", t("dietEditor.deleteMeal"), () => {
        const planned = plannedAt(meal.id);
        if (planned.length > 0) {
          setStatus("dietEditor.mealInUse", { name: nameOf(meal), days: planned.join(", ") });
          return;
        }
        if (!confirm(t("dietEditor.deleteMealConfirm", { name: nameOf(meal) }))) {
          return;
        }
        draft.meals.splice(draft.meals.indexOf(meal), 1);
        selectedMealId = null;
        markDirty();
        renderTab();
      }),
    );
  }

  return meal ? [toolbar, ...createMealForm(meal)] : [toolbar, createElement("p", "empty", t("dietEditor.noMeals"))];
}

/**
 * Creates the Week tab: a day picker and the meals planned on the chosen day.
 * @returns {HTMLElement[]} The tab content.
 */
function createWeekTab() {
  const picker = createElement("div", "diet-day-picker");
  picker.append(...t("days").map((name, index) => {
    const button = createButton("control", name, () => {
      selectedDay = index;
      renderTab();
    });
    button.setAttribute("aria-pressed", String(index === selectedDay));
    return button;
  }));

  const day = draft.days[selectedDay];
  day.meals.sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));
  const totals = createElement("p", "empty", formatMacros(dayTotals(selectedDay)));
  const warnings = createFastWarnings();
  const refresh = () => {
    totals.textContent = formatMacros(dayTotals(selectedDay));
    fillFastWarnings(warnings);
  };
  const mealOptions = sortByName(draft.meals).map((meal) => ({ value: meal.id, label: nameOf(meal) }));

  const list = createElement("ol", "set-list");
  list.append(...day.meals.map((planned, index) => {
    const sweet = document.createElement("input");
    sweet.type = "checkbox";
    sweet.checked = planned.sweet === true;
    sweet.addEventListener("change", () => {
      if (sweet.checked) {
        planned.sweet = true;
      } else {
        delete planned.sweet;
      }
      markDirty();
      refresh();
    });
    const sweetField = createElement("label", "check-field set-max");
    sweetField.append(sweet, createElement("span", "", t("dietEditor.sweet")));

    const row = createElement("li", "set-row");
    row.append(
      createField("dietEditor.time", createTimeInput(planned, "time", refresh)),
      createField("dietEditor.meal", createSelect(mealOptions, planned.mealId, (value) => {
        planned.mealId = value;
        refresh();
      }), "editor-wide"),
      sweetField,
      createRemoveButton("dietEditor.removePlannedMeal", () => {
        day.meals.splice(index, 1);
        markDirty();
        renderTab();
      }),
    );
    return row;
  }));

  const add = createButton("control progression-add", t("dietEditor.addPlannedMeal"), () => {
    if (mealOptions.length === 0) {
      setStatus("dietEditor.noMeals");
      return;
    }
    day.meals.push({ time: NEW_MEAL_TIME, mealId: mealOptions[0].value });
    markDirty();
    renderTab();
  });

  return [picker, createElement("h3", "form-title", t("daysLong")[selectedDay]), totals, list, add, warnings];
}

/**
 * Creates the Fasts tab: one row per fast with its start, end and length.
 * @returns {HTMLElement[]} The tab content.
 */
function createFastsTab() {
  const list = createElement("ol", "set-list");
  const warnings = createFastWarnings();
  list.append(...draft.fasts.map((fast, index) => {
    const length = createElement("span", "set-index");
    const refresh = () => {
      const position = (moment) => moment.day * 24 + timeToHours(moment.time || "00:00");
      const hours = hoursUntil(position(fast.start), position(fast.end)) || HOURS_PER_WEEK;
      length.textContent = t("dietEditor.fastLength", { hours: String(Math.round(hours * 10) / 10) });
      fillFastWarnings(warnings);
    };
    refresh();

    const row = createElement("li", "set-row");
    row.append(
      createField("dietEditor.fastStart", createSelect(dayOptions(), String(fast.start.day), (value) => {
        fast.start.day = Number(value);
        refresh();
      })),
      createField("dietEditor.time", createTimeInput(fast.start, "time", refresh)),
      createField("dietEditor.fastEnd", createSelect(dayOptions(), String(fast.end.day), (value) => {
        fast.end.day = Number(value);
        refresh();
      })),
      createField("dietEditor.time", createTimeInput(fast.end, "time", refresh)),
      length,
      createRemoveButton("dietEditor.removeFast", () => {
        draft.fasts.splice(index, 1);
        markDirty();
        renderTab();
      }),
    );
    return row;
  }));

  const add = createButton("control progression-add", t("dietEditor.addFast"), () => {
    draft.fasts.push({ start: { day: 0, time: "20:00" }, end: { day: 1, time: "12:00" } });
    markDirty();
    renderTab();
  });
  return [list, add, warnings];
}

/** Renders the open tab from the draft. */
function renderTab() {
  const builders = {
    general: createGeneralTab,
    ingredients: createIngredientsTab,
    meals: createMealsTab,
    week: createWeekTab,
    fasts: createFastsTab,
  };
  document.getElementById("diet-editor-content").replaceChildren(...builders[tab]());
  for (const button of document.querySelectorAll("[data-diet-editor-tab]")) {
    button.setAttribute("aria-pressed", String(button.dataset.dietEditorTab === tab));
  }
}

/**
 * Opens the editor. Without unsaved changes it starts from a fresh copy of the diet in use,
 * so a diet imported in the meantime is picked up.
 */
export function openDietEditor() {
  if (!dirty) {
    draft = structuredClone(getCurrentDiet());
    setStatus("");
  }
  renderTab();
}

/** Renders the open tab again, for example after the language changed. */
export function renderDietEditor() {
  if (draft !== null) {
    renderTab();
  }
}

/** Saves the draft as the diet valid from today. */
async function save() {
  const content = cleanDiet(draft);
  const problem = validateDiet(content);
  if (problem) {
    setStatus(problem);
    return;
  }

  const button = document.getElementById("diet-editor-save");
  button.disabled = true;
  setStatus("dietEditor.saving");
  try {
    await saveAndApplyDiet(content);
    draft = structuredClone(content);
    dirty = false;
    renderTab();
    setStatus("dietEditor.saved");
  } catch {
    setStatus("dietEditor.saveFailed");
  } finally {
    button.disabled = false;
  }
}

/** Throws away the changes and returns to the Diet view. */
function discard() {
  if (dirty && !confirm(t("dietEditor.discardConfirm"))) {
    return;
  }
  draft = null;
  dirty = false;
  location.hash = "diet";
}

/** Connects the editor tabs and buttons. */
export function initDietEditor() {
  for (const button of document.querySelectorAll("[data-diet-editor-tab]")) {
    button.addEventListener("click", () => {
      tab = TABS.includes(button.dataset.dietEditorTab) ? button.dataset.dietEditorTab : "general";
      renderTab();
    });
  }
  document.getElementById("diet-editor-save").addEventListener("click", save);
  document.getElementById("diet-editor-discard").addEventListener("click", discard);
  window.addEventListener("beforeunload", (event) => {
    if (dirty) {
      event.preventDefault();
    }
  });
}
