import { HOURS_PER_WEEK, hoursUntil } from "./schedule.js";

/** Estimated energy and macronutrients of the daily sweet treat. */
const TREAT = { kcal: 200, protein: 2, carbs: 25, fat: 10 };

/** Shopping list categories in display order. */
export const CATEGORIES = ["dairy", "meatFish", "vegetables", "fruit", "grains", "other"];

/**
 * Products used in meals. Each key resolves to `ingredient.<key>` in the language files.
 * `unit` is g, ml, pcs or rolls.
 */
export const INGREDIENTS = {
  skyr: { category: "dairy", unit: "g" },
  yoghurt: { category: "dairy", unit: "g" },
  greekYoghurt: { category: "dairy", unit: "g" },
  cream: { category: "dairy", unit: "ml" },
  milk: { category: "dairy", unit: "ml" },
  butter: { category: "dairy", unit: "g" },
  feta: { category: "dairy", unit: "g" },
  egg: { category: "dairy", unit: "pcs" },
  chickenLeg: { category: "meatFish", unit: "pcs" },
  chickenBreast: { category: "meatFish", unit: "g" },
  turkey: { category: "meatFish", unit: "g" },
  ham: { category: "meatFish", unit: "g" },
  salmon: { category: "meatFish", unit: "g" },
  smokedSalmon: { category: "meatFish", unit: "g" },
  sushi: { category: "meatFish", unit: "rolls" },
  potatoes: { category: "vegetables", unit: "g" },
  cabbage: { category: "vegetables", unit: "g" },
  carrot: { category: "vegetables", unit: "g" },
  tomato: { category: "vegetables", unit: "g" },
  cucumber: { category: "vegetables", unit: "g" },
  lettuce: { category: "vegetables", unit: "g" },
  onion: { category: "vegetables", unit: "g" },
  garlic: { category: "vegetables", unit: "pcs" },
  broccoli: { category: "vegetables", unit: "g" },
  spinach: { category: "vegetables", unit: "g" },
  pepper: { category: "vegetables", unit: "g" },
  mushrooms: { category: "vegetables", unit: "g" },
  fruit: { category: "fruit", unit: "g" },
  apple: { category: "fruit", unit: "pcs" },
  banana: { category: "fruit", unit: "pcs" },
  ryeBread: { category: "grains", unit: "g" },
  oats: { category: "grains", unit: "g" },
  buckwheat: { category: "grains", unit: "g" },
  bulgur: { category: "grains", unit: "g" },
  couscous: { category: "grains", unit: "g" },
  pasta: { category: "grains", unit: "g" },
  riceCakes: { category: "grains", unit: "pcs" },
  tortilla: { category: "grains", unit: "pcs" },
  flour: { category: "grains", unit: "g" },
  oliveOil: { category: "other", unit: "g" },
  peanutButter: { category: "other", unit: "g" },
  jam: { category: "other", unit: "g" },
  honey: { category: "other", unit: "g" },
  pumpkinSeeds: { category: "other", unit: "g" },
  stock: { category: "other", unit: "ml" },
};

/**
 * One portion of each meal: estimated energy and macronutrients in kcal and grams, and its ingredients.
 * Each key resolves to `meal.<key>` and `recipes.<key>` in the language files.
 */
export const MEALS = {
  sushi: {
    kcal: 400, protein: 16, carbs: 67, fat: 7,
    ingredients: { sushi: 1 },
  },
  bananaToast: {
    kcal: 255, protein: 4, carbs: 56, fat: 1,
    ingredients: { banana: 1, ryeBread: 40, jam: 20 },
  },
  roastChickenPotatoes: {
    kcal: 670, protein: 43, carbs: 61, fat: 26,
    ingredients: { chickenLeg: 1, potatoes: 300, cabbage: 100, carrot: 50, oliveOil: 5 },
  },
  skyrFruit: {
    kcal: 180, protein: 25, carbs: 20, fat: 0,
    ingredients: { skyr: 200, fruit: 100 },
  },
  skyrFruitLarge: {
    kcal: 245, protein: 37, carbs: 24, fat: 0,
    ingredients: { skyr: 300, fruit: 100 },
  },
  eggsRye: {
    kcal: 470, protein: 25, carbs: 36, fat: 22,
    ingredients: { egg: 3, ryeBread: 80, butter: 5, tomato: 100 },
  },
  skyrBowl: {
    kcal: 255, protein: 28, carbs: 16, fat: 8,
    ingredients: { skyr: 200, peanutButter: 15, jam: 20 },
  },
  turkeyPotatoes: {
    kcal: 775, protein: 57, carbs: 78, fat: 23,
    ingredients: {
      turkey: 200, potatoes: 300, cabbage: 150, onion: 30, carrot: 100, garlic: 1,
      oliveOil: 15, stock: 200, cream: 50, flour: 10,
    },
  },
  appleSandwich: {
    kcal: 355, protein: 26, carbs: 48, fat: 5,
    ingredients: { ryeBread: 40, butter: 5, ham: 30, apple: 1, skyr: 150 },
  },
  salmonGroats: {
    kcal: 695, protein: 47, carbs: 76, fat: 24,
    ingredients: { salmon: 150, buckwheat: 90, broccoli: 200 },
  },
  oatmeal: {
    kcal: 530, protein: 43, carbs: 56, fat: 13,
    ingredients: { oats: 60, milk: 250, pumpkinSeeds: 10, skyr: 200 },
  },
  skyrBowlFruit: {
    kcal: 330, protein: 28, carbs: 34, fat: 8,
    ingredients: { skyr: 200, peanutButter: 15, jam: 20, fruit: 150 },
  },
  eggSandwiches: {
    kcal: 395, protein: 18, carbs: 36, fat: 18,
    ingredients: { egg: 2, ryeBread: 80, butter: 5, tomato: 100 },
  },
  roastChickenBulgur: {
    kcal: 675, protein: 51, carbs: 61, fat: 26,
    ingredients: { chickenLeg: 1, bulgur: 80, spinach: 150, oliveOil: 5, garlic: 1 },
  },
  hamApple: {
    kcal: 340, protein: 19, carbs: 62, fat: 3,
    ingredients: { ryeBread: 80, ham: 60, tomato: 100, apple: 1 },
  },
  hamSandwichesBanana: {
    kcal: 385, protein: 19, carbs: 68, fat: 5,
    ingredients: { ryeBread: 80, ham: 60, tomato: 100, banana: 1 },
  },
  riceCakesJam: {
    kcal: 115, protein: 2, carbs: 25, fat: 0,
    ingredients: { riceCakes: 2, jam: 20 },
  },
  skyrOatsFruit: {
    kcal: 385, protein: 31, carbs: 68, fat: 3,
    ingredients: { skyr: 200, oats: 40, fruit: 150, honey: 10 },
  },
  eggsBread: {
    kcal: 480, protein: 21, carbs: 54, fat: 19,
    ingredients: { egg: 2, ryeBread: 120, butter: 5, tomato: 100 },
  },
  sushiOrSalmon: {
    kcal: 530, protein: 40, carbs: 75, fat: 7,
    ingredients: { sushi: 1, skyr: 200 },
  },
  hungarianStew: {
    kcal: 550, protein: 51, carbs: 52, fat: 15,
    ingredients: {
      turkey: 200, potatoes: 100, pepper: 100, tomato: 150, onion: 30, mushrooms: 40,
      oliveOil: 10, stock: 200, ryeBread: 40,
    },
  },
  salmonTortilla: {
    kcal: 700, protein: 38, carbs: 74, fat: 24,
    ingredients: { tortilla: 2, smokedSalmon: 120, yoghurt: 50, lettuce: 30, tomato: 40, cucumber: 30 },
  },
  scrambledEggs: {
    kcal: 470, protein: 25, carbs: 36, fat: 22,
    ingredients: { egg: 3, butter: 5, ryeBread: 80, tomato: 100 },
  },
  chickenSpinachPasta: {
    kcal: 760, protein: 65, carbs: 56, fat: 28,
    ingredients: { chickenBreast: 180, spinach: 100, onion: 40, garlic: 1, feta: 70, oliveOil: 10, pasta: 70 },
  },
  chickenCurry: {
    kcal: 700, protein: 56, carbs: 68, fat: 18,
    ingredients: { chickenBreast: 200, pepper: 150, onion: 40, oliveOil: 10, greekYoghurt: 80, couscous: 70 },
  },
};

/**
 * Weekly meal plan, starting on Monday.
 * `time` is the hour of the day and `sweet` adds the sweet treat to that meal.
 */
export const DIET_DAYS = [
  {
    meals: [
      { time: 12, key: "chickenCurry" },
      { time: 16, key: "sushi" },
      { time: 17.5, key: "bananaToast" },
      { time: 21.75, key: "roastChickenPotatoes" },
      { time: 22.25, key: "skyrFruitLarge", sweet: true },
    ],
  },
  {
    meals: [
      { time: 8, key: "eggsRye" },
      { time: 11, key: "skyrBowl" },
      { time: 14, key: "turkeyPotatoes" },
      { time: 19, key: "salmonGroats" },
    ],
  },
  {
    meals: [
      { time: 8, key: "oatmeal" },
      { time: 12, key: "appleSandwich" },
    ],
  },
  {
    meals: [
      { time: 8, key: "skyrBowlFruit" },
      { time: 10.5, key: "eggSandwiches" },
      { time: 13, key: "roastChickenBulgur" },
      { time: 14.5, key: "hamApple" },
      { time: 16, key: "hamSandwichesBanana" },
      { time: 18, key: "riceCakesJam" },
      { time: 22.25, key: "skyrOatsFruit", sweet: true },
    ],
  },
  {
    meals: [
      { time: 8, key: "eggsBread" },
      { time: 10, key: "skyrBowlFruit" },
      { time: 12, key: "sushiOrSalmon" },
    ],
  },
  {
    meals: [
      { time: 9, key: "skyrFruit" },
      { time: 13, key: "hungarianStew" },
      { time: 19, key: "salmonTortilla", sweet: true },
    ],
  },
  {
    meals: [
      { time: 10, key: "scrambledEggs" },
      { time: 13, key: "hamApple" },
      { time: 16, key: "chickenSpinachPasta" },
    ],
  },
];

/**
 * Lists every planned meal with its position in the week.
 * @returns {Array<{key: string, position: number}>} All meals in chronological order.
 */
function getWeekMeals() {
  return DIET_DAYS.flatMap((day, dayIndex) =>
    day.meals.map((meal) => ({ key: meal.key, position: dayIndex * 24 + meal.time })));
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
 * Calculates the totals of one day, including sweet treats.
 * @param {{meals: Array<{key: string, sweet?: boolean}>}} day The day to total.
 * @returns {{kcal: number, protein: number, carbs: number, fat: number}} The day totals.
 */
export function getDayTotals(day) {
  return sumValues(day.meals.flatMap((meal) => (meal.sweet ? [MEALS[meal.key], TREAT] : [MEALS[meal.key]])));
}

/**
 * Finds the next planned meal.
 * @param {number} position Hours since Monday 00:00.
 * @returns {{key: string, position: number}} The next meal and its position in the week.
 */
export function getNextMeal(position) {
  return getWeekMeals().reduce((next, meal) => {
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
  return sumValues(DIET_DAYS.map(getDayTotals));
}

/**
 * Adds up the ingredients of all meals planned in a period starting now.
 * @param {number} position Hours since Monday 00:00.
 * @param {number} days Length of the period in days.
 * @returns {{mealCount: number, amounts: Record<string, number>}} The number of meals and the total amount of each ingredient.
 */
export function getShoppingList(position, days) {
  const hours = days * 24;
  const amounts = {};
  let mealCount = 0;

  for (const meal of getWeekMeals()) {
    const firstOccurrence = hoursUntil(position, meal.position) || HOURS_PER_WEEK;
    const occurrences = Math.ceil((hours - firstOccurrence) / HOURS_PER_WEEK);

    if (occurrences > 0) {
      mealCount += occurrences;
      for (const [ingredient, amount] of Object.entries(MEALS[meal.key].ingredients)) {
        amounts[ingredient] = (amounts[ingredient] ?? 0) + amount * occurrences;
      }
    }
  }

  return { mealCount, amounts };
}
