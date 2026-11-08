import { HOURS_PER_WEEK, hoursUntil, setFasts } from "./schedule.js";
import { isLocalizedEmpty, toLocalized } from "./i18n.js";
import { timeToHours } from "./dates.js";

/** Shopping list categories in display order. Each key resolves to `category.<key>` in the language files. */
export const CATEGORIES = ["dairy", "meatFish", "vegetables", "fruit", "grains", "other"];

/** Ingredient units. g and ml switch to kg and l for large amounts; pcs and rolls are counted. */
export const UNITS = ["g", "ml", "pcs", "rolls"];

/** Identifies a diet export file. */
export const DIET_FORMAT = "marcom-cadence/diet";

/** Version of the diet file shape. */
export const DIET_VERSION = 1;

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * The diet in use, as built by setDiet.
 * Ingredients keep their file order, which is the default shopping list order.
 * Fasts are week positions in hours since Monday 00:00; meal times are hours of the day.
 */
let diet = {
  ingredients: [],
  ingredientById: new Map(),
  mealById: new Map(),
  treat: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  days: Array.from({ length: 7 }, () => ({ meals: [] })),
};

/**
 * Reads a number that must not be negative.
 * @param {*} value The stored value.
 * @returns {number} The number, or 0 when it is missing or invalid.
 */
const toAmount = (value) => (typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0);

/**
 * Reads energy and macronutrients.
 * @param {Record<string, *> | undefined} values The stored values.
 * @returns {{kcal: number, protein: number, carbs: number, fat: number}} The values, 0 where missing.
 */
const toMacros = (values) => ({
  kcal: toAmount(values?.kcal),
  protein: toAmount(values?.protein),
  carbs: toAmount(values?.carbs),
  fat: toAmount(values?.fat),
});

/**
 * Tells whether a value is an id: a non-empty string.
 * @param {*} value The value.
 * @returns {boolean} True for an id.
 */
const isId = (value) => typeof value === "string" && value !== "";

/**
 * Reads a week moment of a fast.
 * @param {*} value The stored moment, {day, time}.
 * @returns {{day: number, time: string} | null} The moment, or null when it is invalid.
 */
function toMoment(value) {
  return Number.isInteger(value?.day) && value.day >= 0 && value.day <= 6 && TIME_PATTERN.test(value?.time ?? "")
    ? { day: value.day, time: value.time }
    : null;
}

/**
 * Cleans diet content into the stored shape: unknown fields are dropped, missing values get defaults,
 * and references to ingredients or meals that do not exist are left out.
 * The result is what is saved in the database and written to an export file.
 * @param {*} content The diet content, from the database or a file.
 * @returns {Record<string, *>} The clean content.
 */
export function cleanDiet(content) {
  const seenIngredients = new Set();
  const ingredients = (Array.isArray(content?.ingredients) ? content.ingredients : [])
    .filter((ingredient) => isId(ingredient?.id) && !seenIngredients.has(ingredient.id) && seenIngredients.add(ingredient.id))
    .map((ingredient) => ({
      id: ingredient.id,
      name: toLocalized(ingredient.name),
      category: CATEGORIES.includes(ingredient.category) ? ingredient.category : "other",
      unit: UNITS.includes(ingredient.unit) ? ingredient.unit : "g",
    }));

  const toAmounts = (list) => (Array.isArray(list) ? list : [])
    .filter((entry) => seenIngredients.has(entry?.ingredientId))
    .map((entry) => ({ ingredientId: entry.ingredientId, amount: toAmount(entry.amount) }));

  const seenMeals = new Set();
  const meals = (Array.isArray(content?.meals) ? content.meals : [])
    .filter((meal) => isId(meal?.id) && !seenMeals.has(meal.id) && seenMeals.add(meal.id))
    .map((meal) => {
      const result = {
        id: meal.id,
        name: toLocalized(meal.name),
        ...toMacros(meal),
        ingredients: toAmounts(meal.ingredients),
        steps: (Array.isArray(meal.steps) ? meal.steps : []).map(toLocalized).filter((step) => !isLocalizedEmpty(step)),
      };
      const seasoning = toLocalized(meal.seasoning);
      if (!isLocalizedEmpty(seasoning)) {
        result.seasoning = seasoning;
      }
      if (meal.alternative && typeof meal.alternative === "object") {
        result.alternative = { ingredients: toAmounts(meal.alternative.ingredients), step: toLocalized(meal.alternative.step) };
      }
      return result;
    });

  const fasts = (Array.isArray(content?.fasts) ? content.fasts : [])
    .map((fast) => ({ start: toMoment(fast?.start), end: toMoment(fast?.end) }))
    .filter((fast) => fast.start && fast.end);

  const days = Array.from({ length: 7 }, (_, day) => {
    const stored = (Array.isArray(content?.days) ? content.days : []).find((entry) => entry?.day === day);
    return {
      day,
      meals: (Array.isArray(stored?.meals) ? stored.meals : [])
        .filter((meal) => seenMeals.has(meal?.mealId) && TIME_PATTERN.test(meal?.time ?? ""))
        .map((meal) => ({ time: meal.time, mealId: meal.mealId, ...(meal.sweet === true ? { sweet: true } : {}) }))
        .sort((a, b) => a.time.localeCompare(b.time)),
    };
  });

  return { name: toLocalized(content?.name), treat: toMacros(content?.treat), ingredients, meals, fasts, days };
}

/**
 * Checks that a clean diet can be used: it needs at least one fast and one planned meal.
 * @param {ReturnType<typeof cleanDiet>} content The clean diet.
 * @returns {string | null} Translation key of the problem, or null when the diet can be used.
 */
export function validateDiet(content) {
  if (content.fasts.length === 0) {
    return "dietData.noFasts";
  }
  if (content.days.every((day) => day.meals.length === 0)) {
    return "dietData.noMeals";
  }
  return null;
}

/**
 * Makes a clean diet the diet in use, including its fasting periods.
 * @param {ReturnType<typeof cleanDiet>} content The clean, valid diet.
 */
export function setDiet(content) {
  const position = (moment) => moment.day * 24 + timeToHours(moment.time);
  setFasts(content.fasts.map((fast) => ({ start: position(fast.start), end: position(fast.end) })));
  diet = {
    ingredients: content.ingredients,
    ingredientById: new Map(content.ingredients.map((ingredient) => [ingredient.id, ingredient])),
    mealById: new Map(content.meals.map((meal) => [meal.id, meal])),
    treat: content.treat,
    days: content.days.map((day) => ({
      meals: day.meals.map((meal) => ({ time: timeToHours(meal.time), mealId: meal.mealId, sweet: meal.sweet === true })),
    })),
  };
}

/**
 * Returns the ingredients of the diet in use.
 * @returns {Array<{id: string, name: Record<string, string>, category: string, unit: string}>} Ingredients in file order.
 */
export function getIngredients() {
  return diet.ingredients;
}

/**
 * Finds an ingredient of the diet in use.
 * @param {string} id Ingredient id.
 * @returns {{id: string, name: Record<string, string>, category: string, unit: string}} The ingredient.
 */
export function getIngredient(id) {
  return diet.ingredientById.get(id);
}

/**
 * Finds a meal of the diet in use.
 * @param {string} id Meal id.
 * @returns {object} The meal with values, ingredients and recipe.
 */
export function getMeal(id) {
  return diet.mealById.get(id);
}

/**
 * Returns the planned meals of one day.
 * @param {number} dayIndex Day of the week, where 0 is Monday.
 * @returns {Array<{time: number, mealId: string, sweet: boolean}>} Meals in time order; time is the hour of the day.
 */
export function getDayMeals(dayIndex) {
  return diet.days[dayIndex].meals;
}

/**
 * Lists every planned meal with its position in the week.
 * @returns {Array<{mealId: string, position: number}>} All meals in chronological order.
 */
function getWeekMeals() {
  return diet.days.flatMap((day, dayIndex) =>
    day.meals.map((meal) => ({ mealId: meal.mealId, position: dayIndex * 24 + meal.time })));
}

/**
 * Adds energy and macronutrient values together.
 * @param {Array<{kcal: number, protein: number, carbs: number, fat: number}>} items The values to add.
 * @returns {{kcal: number, protein: number, carbs: number, fat: number}} The totals.
 */
function sumValues(items) {
  return items.reduce(
    (total, item) => ({
      kcal: total.kcal + item.kcal,
      protein: total.protein + item.protein,
      carbs: total.carbs + item.carbs,
      fat: total.fat + item.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

/**
 * Returns the energy and macronutrients of the sweet treat.
 * @returns {{kcal: number, protein: number, carbs: number, fat: number}} The treat values.
 */
export function getTreat() {
  return diet.treat;
}

/**
 * Calculates the totals of one day, including sweet treats.
 * @param {number} dayIndex Day of the week, where 0 is Monday.
 * @returns {{kcal: number, protein: number, carbs: number, fat: number}} The day totals.
 */
export function getDayTotals(dayIndex) {
  return sumValues(getDayMeals(dayIndex).flatMap((meal) =>
    (meal.sweet ? [getMeal(meal.mealId), diet.treat] : [getMeal(meal.mealId)])));
}

/**
 * Finds the next planned meal.
 * @param {number} position Hours since Monday 00:00.
 * @returns {{mealId: string, position: number} | null} The next meal and its position in the week, or null without meals.
 */
export function getNextMeal(position) {
  const meals = getWeekMeals();
  if (meals.length === 0) {
    return null;
  }
  return meals.reduce((next, meal) => {
    const hours = hoursUntil(position, meal.position) || Infinity;
    const nextHours = hoursUntil(position, next.position) || Infinity;
    return hours < nextHours ? meal : next;
  });
}

/**
 * Calculates the totals of the whole week.
 * @returns {{kcal: number, protein: number, carbs: number, fat: number}} The week totals.
 */
export function getWeekTotals() {
  return sumValues(diet.days.map((_, dayIndex) => getDayTotals(dayIndex)));
}

/**
 * Adds up the ingredients of all meals planned in a period starting now.
 * @param {number} position Hours since Monday 00:00.
 * @param {number} days Length of the period in days.
 * @param {boolean} [useAlternatives] Whether to count replacements instead of ready-made meals.
 * @returns {{mealCount: number, amounts: Record<string, number>}} The number of meals and the total amount of each ingredient.
 */
export function getShoppingList(position, days, useAlternatives = false) {
  const hours = days * 24;
  const amounts = {};
  let mealCount = 0;

  for (const meal of getWeekMeals()) {
    const firstOccurrence = hoursUntil(position, meal.position) || HOURS_PER_WEEK;
    const occurrences = Math.ceil((hours - firstOccurrence) / HOURS_PER_WEEK);

    if (occurrences > 0) {
      mealCount += occurrences;
      const { ingredients, alternative } = getMeal(meal.mealId);
      for (const { ingredientId, amount } of (useAlternatives && alternative?.ingredients) || ingredients) {
        amounts[ingredientId] = (amounts[ingredientId] ?? 0) + amount * occurrences;
      }
    }
  }

  return { mealCount, amounts };
}
