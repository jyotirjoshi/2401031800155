const form = document.getElementById("coach-form");
const screens = Array.from(document.querySelectorAll(".screen"));
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const submitBtn = document.getElementById("submit-btn");
const screenCountEl = document.getElementById("screen-count");
const progressFill = document.getElementById("progress-fill");
const dbStatusEl = document.getElementById("db-status");

const resultPanel = document.getElementById("result-panel");
const emptyState = document.getElementById("empty-state");
const resultContent = document.getElementById("result-content");

const metricsEl = document.getElementById("metrics");
const trainingEl = document.getElementById("training-plan");
const nutritionEl = document.getElementById("nutrition-plan");
const recoveryEl = document.getElementById("recovery-plan");
const actionListEl = document.getElementById("action-list");

const activityFactors = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725
};

const DB_KEY = "healthCoachSubmissions";

let currentScreen = 1;

prevBtn.addEventListener("click", () => {
  if (currentScreen > 1) {
    currentScreen -= 1;
    updateWizard();
  }
});

nextBtn.addEventListener("click", () => {
  if (!validateCurrentScreen()) {
    return;
  }

  if (currentScreen < screens.length) {
    currentScreen += 1;
    updateWizard();
  }
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (currentScreen !== screens.length) {
    return;
  }

  const data = collectFormData();
  if (!data) {
    return;
  }

  const profile = calculateProfile(data);
  const recommendations = buildRecommendations(data, profile);

  renderResults(profile, recommendations);
  saveSubmissionToDatabase(data, profile, recommendations);
  resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
});

updateWizard();
loadLatestFromDatabase();

function updateWizard() {
  screens.forEach((screen, index) => {
    screen.classList.toggle("active", index + 1 === currentScreen);
  });

  prevBtn.disabled = currentScreen === 1;
  nextBtn.classList.toggle("hidden", currentScreen === screens.length);
  submitBtn.classList.toggle("hidden", currentScreen !== screens.length);

  screenCountEl.textContent = `Screen ${currentScreen} of ${screens.length}`;
  progressFill.style.width = `${(currentScreen / screens.length) * 100}%`;
}

function validateCurrentScreen() {
  if (currentScreen === 1 || currentScreen === 8) {
    return true;
  }

  const activeScreen = screens[currentScreen - 1];
  const requiredFields = activeScreen.querySelectorAll("[required]");

  for (const field of requiredFields) {
    if (!field.value) {
      field.focus();
      alert("Please complete this screen before continuing.");
      return false;
    }
  }

  return true;
}

function collectFormData() {
  const name = document.getElementById("name").value.trim();
  const age = Number(document.getElementById("age").value);
  const sex = document.getElementById("sex").value;
  const height = Number(document.getElementById("height").value);
  const weight = Number(document.getElementById("weight").value);
  const activity = document.getElementById("activity").value;
  const goal = document.getElementById("goal").value;
  const sleep = Number(document.getElementById("sleep").value);
  const steps = Number(document.getElementById("steps").value);
  const stress = document.getElementById("stress").value;
  const trainingDays = Number(document.getElementById("trainingDays").value);
  const diet = document.getElementById("diet").value;
  const notes = document.getElementById("notes").value.trim();

  const missingRequired =
    !name || !age || !sex || !height || !weight || !activity || !goal || !sleep || !steps || !stress || !trainingDays || !diet;

  if (missingRequired) {
    alert("Please fill all required fields.");
    return null;
  }

  return {
    name,
    age,
    sex,
    height,
    weight,
    activity,
    goal,
    sleep,
    steps,
    stress,
    trainingDays,
    diet,
    notes
  };
}

function calculateProfile(data) {
  const heightMeters = data.height / 100;
  const bmi = data.weight / (heightMeters * heightMeters);

  const bmr = data.sex === "male"
    ? 10 * data.weight + 6.25 * data.height - 5 * data.age + 5
    : 10 * data.weight + 6.25 * data.height - 5 * data.age - 161;

  const tdee = bmr * activityFactors[data.activity];

  let targetCalories = tdee;
  if (data.goal === "fat-loss") {
    targetCalories = tdee - 350;
  } else if (data.goal === "muscle-gain") {
    targetCalories = tdee + 250;
  } else if (data.goal === "endurance") {
    targetCalories = tdee + 100;
  }

  const waterLiters = Math.max(2, data.weight * 0.033);

  return {
    bmi,
    bmr,
    tdee,
    targetCalories,
    waterLiters
  };
}

function buildRecommendations(data, profile) {
  const bmiBand = getBmiBand(profile.bmi);

  const trainingText = buildTrainingText(data, bmiBand);
  const nutritionText = buildNutritionText(data, profile);
  const recoveryText = buildRecoveryText(data);
  const actions = buildActionList(data, profile, bmiBand);

  return {
    trainingText,
    nutritionText,
    recoveryText,
    actions
  };
}

function getBmiBand(bmi) {
  if (bmi < 18.5) {
    return "under";
  }
  if (bmi < 25) {
    return "normal";
  }
  if (bmi < 30) {
    return "over";
  }
  return "high";
}

function buildTrainingText(data, bmiBand) {
  const base = `Train ${data.trainingDays} days/week with one full recovery day after every 2-3 sessions.`;

  if (data.goal === "fat-loss") {
    return `${base} Prioritize full-body resistance workouts (3-4 sessions) plus low-impact cardio to protect joints. Keep daily steps above 8,500 for steady fat loss momentum.`;
  }

  if (data.goal === "muscle-gain") {
    return `${base} Focus on progressive overload using compound lifts, aiming for 10-20 hard sets per major muscle group weekly. Include one conditioning session to maintain cardiovascular health.`;
  }

  if (data.goal === "endurance") {
    return `${base} Use 2 easy aerobic sessions, 1 interval session, and 1 longer endurance session each week. Keep one short strength session for injury prevention and posture.`;
  }

  if (bmiBand === "high" || bmiBand === "over") {
    return `${base} Build consistency first: moderate resistance training and brisk walking are your highest-value habits. Increase weekly training load gradually to avoid overuse pain.`;
  }

  return `${base} Combine resistance training, mobility work, and moderate cardio for balanced performance and long-term maintenance.`;
}

function buildNutritionText(data, profile) {
  const calories = Math.round(profile.targetCalories);
  const proteinTarget = Math.round(data.weight * (data.goal === "muscle-gain" ? 1.9 : 1.6));

  let dietAngle = "Build meals from lean proteins, fiber-rich carbs, and healthy fats.";
  if (data.diet === "high-protein") {
    dietAngle = "Distribute protein across 3-4 meals, adding a post-workout protein source within 2 hours of training.";
  } else if (data.diet === "vegetarian") {
    dietAngle = "Pair legumes, dairy or soy, and whole grains to improve amino acid balance and satiety.";
  } else if (data.diet === "vegan") {
    dietAngle = "Use varied protein sources (tofu, tempeh, lentils, seitan, beans) and include B12-fortified foods.";
  } else if (data.diet === "low-carb") {
    dietAngle = "Center meals around proteins and non-starchy vegetables while timing quality carbs around training sessions.";
  }

  return `Estimated target intake: about ${calories} kcal/day and ${proteinTarget} g protein/day. ${dietAngle} Hydration target: ${profile.waterLiters.toFixed(1)} L water/day.`;
}

function buildRecoveryText(data) {
  const sleepMessage = data.sleep < 7
    ? "Increase sleep toward 7.5-8.5 hours to improve recovery hormones, mood, and appetite control."
    : "Your sleep is in a productive range; protect a consistent sleep and wake window.";

  const stressMessage = data.stress === "high"
    ? "High stress detected: add 10 minutes daily of breathwork, light walking, or guided recovery to reduce allostatic load."
    : data.stress === "medium"
      ? "Moderate stress: use a short evening wind-down routine and keep caffeine earlier in the day."
      : "Low stress profile: keep current habits and add one mobility session weekly for injury prevention.";

  return `${sleepMessage} ${stressMessage}`;
}

function buildActionList(data, profile, bmiBand) {
  const actions = [
    `Hit a daily hydration goal of ${profile.waterLiters.toFixed(1)} L.`,
    `Keep a food and training log for 7 days to track adherence, energy, and appetite.`
  ];

  if (data.steps < 7000) {
    actions.push("Increase daily steps by 1,000 this week; repeat weekly until you reach at least 8,500.");
  } else {
    actions.push("Maintain your current step count and include two 10-minute post-meal walks.");
  }

  if (data.goal === "muscle-gain") {
    actions.push("Add 2.5-5% load or 1-2 reps to key lifts each week when form is stable.");
  } else if (data.goal === "fat-loss") {
    actions.push("Use plate composition: half vegetables, quarter lean protein, quarter quality carbs.");
  } else if (data.goal === "endurance") {
    actions.push("Progress aerobic volume by no more than 10% per week to reduce injury risk.");
  } else {
    actions.push("Schedule one performance check-in (strength, cardio, or mobility) at the end of the week.");
  }

  if (bmiBand === "under") {
    actions.push("Add one nutrient-dense snack daily to support healthy weight restoration.");
  }

  if (data.notes) {
    actions.push(`Factor in your note: "${data.notes}" and adjust intensity conservatively.`);
  }

  return actions;
}

function renderResults(profile, recommendations) {
  emptyState.classList.add("hidden");
  resultContent.classList.remove("hidden");

  const bmiText = profile.bmi.toFixed(1);
  const bmrText = `${Math.round(profile.bmr)} kcal`;
  const tdeeText = `${Math.round(profile.tdee)} kcal`;
  const targetText = `${Math.round(profile.targetCalories)} kcal`;

  metricsEl.innerHTML = "";
  addMetric("BMI", bmiText);
  addMetric("BMR", bmrText);
  addMetric("Maintenance", tdeeText);
  addMetric("Target", targetText);

  trainingEl.textContent = recommendations.trainingText;
  nutritionEl.textContent = recommendations.nutritionText;
  recoveryEl.textContent = recommendations.recoveryText;

  actionListEl.innerHTML = "";
  recommendations.actions.forEach((action) => {
    const item = document.createElement("li");
    item.textContent = action;
    actionListEl.appendChild(item);
  });
}

function addMetric(label, value) {
  const card = document.createElement("div");
  card.className = "metric-card";

  const labelEl = document.createElement("p");
  labelEl.className = "metric-label";
  labelEl.textContent = label;

  const valueEl = document.createElement("p");
  valueEl.className = "metric-value";
  valueEl.textContent = value;

  card.appendChild(labelEl);
  card.appendChild(valueEl);
  metricsEl.appendChild(card);
}

function saveSubmissionToDatabase(data, profile, recommendations) {
  const records = JSON.parse(localStorage.getItem(DB_KEY) || "[]");

  records.push({
    createdAt: new Date().toISOString(),
    name: data.name,
    formData: data,
    profile,
    recommendations
  });

  localStorage.setItem(DB_KEY, JSON.stringify(records));
  $(dbStatusEl).text(`Database status: Saved for ${data.name}. Total records: ${records.length}`);
}

function loadLatestFromDatabase() {
  const records = JSON.parse(localStorage.getItem(DB_KEY) || "[]");

  if (!records.length) {
    return;
  }

  const latest = records[records.length - 1];
  const data = latest.formData;

  $("#name").val(data.name || "");
  $("#age").val(data.age || "");
  $("#sex").val(data.sex || "");
  $("#height").val(data.height || "");
  $("#weight").val(data.weight || "");
  $("#activity").val(data.activity || "");
  $("#goal").val(data.goal || "");
  $("#sleep").val(data.sleep || "");
  $("#steps").val(data.steps || "");
  $("#stress").val(data.stress || "");
  $("#trainingDays").val(data.trainingDays || "");
  $("#diet").val(data.diet || "");
  $("#notes").val(data.notes || "");

  $(dbStatusEl).text(`Database status: Loaded latest profile for ${data.name}. Total records: ${records.length}`);
}
