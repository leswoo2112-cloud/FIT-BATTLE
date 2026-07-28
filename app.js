/* =========================
   FIT BATTLE 게임형 버전
   app.js 1부
========================= */

const STORAGE_KEY = "fit_battle_game_v2";

let timerInterval = null;
let toastTimer = null;

const defaultExercises = [
  {
    id: "squat",
    name: "스쿼트",
    image: "🏋️",
    target: 15,
    points: 15
  },
  {
    id: "pushup",
    name: "푸시업",
    image: "💪",
    target: 10,
    points: 15
  },
  {
    id: "lunge",
    name: "런지",
    image: "🦵",
    target: 12,
    points: 15
  },
  {
    id: "plank",
    name: "플랭크",
    image: "🧘",
    target: 30,
    points: 20
  },
  {
    id: "jumping-jack",
    name: "점핑잭",
    image: "🤸",
    target: 20,
    points: 20
  }
];

const defaultState = {
  blueTeam: {
    name: "블루팀",
    score: 0,
    completed: 0
  },

  redTeam: {
    name: "레드팀",
    score: 0,
    completed: 0
  },

  timerSeconds: 30,
  timerRemaining: 30,
  timerRunning: false,

  missionTarget: 5,
  missionProgress: 0,

  round: 1,
  selectedExerciseId: "",

  exercises: [],
  records: []
};

let state = clone(defaultState);

/* =========================
   공통 도구
========================= */

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createId(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatTimer(seconds) {
  const safeSeconds = Math.max(
    0,
    Math.floor(Number(seconds) || 0)
  );

  const minutes = Math.floor(
    safeSeconds / 60
  );

  const remainingSeconds =
    safeSeconds % 60;

  return `${String(minutes).padStart(
    2,
    "0"
  )}:${String(remainingSeconds).padStart(
    2,
    "0"
  )}`;
}

function getCurrentTime() {
  return new Date().toLocaleTimeString(
    "ko-KR",
    {
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}

function getSelectedExercise() {
  return state.exercises.find(
    exercise =>
      exercise.id ===
      state.selectedExerciseId
  );
}

function getTotalScore() {
  return (
    Number(state.blueTeam.score || 0) +
    Number(state.redTeam.score || 0)
  );
}

function getLevel() {
  return Math.floor(
    getTotalScore() / 100
  ) + 1;
}

/* =========================
   저장·불러오기
========================= */

function saveState() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(state)
    );
  } catch (error) {
    console.error(
      "게임 저장 실패:",
      error
    );
  }
}

function loadState() {
  const saved =
    localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    state = clone(defaultState);
    state.exercises =
      clone(defaultExercises);
    return;
  }

  try {
    const parsed = JSON.parse(saved);

    state = {
      ...clone(defaultState),
      ...parsed,

      blueTeam: {
        ...clone(defaultState.blueTeam),
        ...(parsed.blueTeam || {})
      },

      redTeam: {
        ...clone(defaultState.redTeam),
        ...(parsed.redTeam || {})
      }
    };

    if (
      !Array.isArray(state.exercises) ||
      state.exercises.length === 0
    ) {
      state.exercises =
        clone(defaultExercises);
    }

    if (!Array.isArray(state.records)) {
      state.records = [];
    }

    state.timerRunning = false;
  } catch (error) {
    console.error(
      "게임 불러오기 실패:",
      error
    );

    state = clone(defaultState);
    state.exercises =
      clone(defaultExercises);
  }
}

/* =========================
   알림
========================= */

function showToast(message) {
  const toast =
    document.getElementById("toast");

  if (!toast) {
    return;
  }

  toast.textContent = message;
  toast.classList.add("show");

  if (toastTimer) {
    clearTimeout(toastTimer);
  }

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

/* =========================
   메뉴 이동
========================= */

function openPage(pageId) {
  document
    .querySelectorAll(".page")
    .forEach(page => {
      page.classList.toggle(
        "active",
        page.id === pageId
      );
    });

  document
    .querySelectorAll(".menu-btn")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.page === pageId
      );
    });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  renderAll();
}

function bindNavigation() {
  document
    .querySelectorAll(".menu-btn")
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          openPage(
            button.dataset.page
          );
        }
      );
    });
}

/* =========================
   설정 팝업
========================= */

function openSetupModal() {
  fillSetupInputs();

  document
    .getElementById("setupModal")
    ?.classList.add("open");
}

function closeSetupModal() {
  document
    .getElementById("setupModal")
    ?.classList.remove("open");
}

function fillSetupInputs() {
  const blueInput =
    document.getElementById(
      "blueTeamNameInput"
    );

  const redInput =
    document.getElementById(
      "redTeamNameInput"
    );

  const timerInput =
    document.getElementById(
      "timerSecondsInput"
    );

  const missionInput =
    document.getElementById(
      "missionTargetInput"
    );

  if (blueInput) {
    blueInput.value =
      state.blueTeam.name;
  }

  if (redInput) {
    redInput.value =
      state.redTeam.name;
  }

  if (timerInput) {
    timerInput.value = String(
      state.timerSeconds
    );
  }

  if (missionInput) {
    missionInput.value = String(
      state.missionTarget
    );
  }
}

function saveSetup() {
  const blueName =
    document
      .getElementById(
        "blueTeamNameInput"
      )
      ?.value.trim() || "블루팀";

  const redName =
    document
      .getElementById(
        "redTeamNameInput"
      )
      ?.value.trim() || "레드팀";

  const timerSeconds = Math.max(
    10,
    Number(
      document.getElementById(
        "timerSecondsInput"
      )?.value
    ) || 30
  );

  const missionTarget = Math.max(
    1,
    Number(
      document.getElementById(
        "missionTargetInput"
      )?.value
    ) || 5
  );

  state.blueTeam.name = blueName;
  state.redTeam.name = redName;

  state.timerSeconds = timerSeconds;
  state.timerRemaining =
    timerSeconds;

  state.missionTarget =
    missionTarget;

  if (
    state.missionProgress >
    state.missionTarget
  ) {
    state.missionProgress =
      state.missionTarget;
  }

  saveState();
  closeSetupModal();
  renderAll();

  showToast("게임 설정을 저장했어용.");
}

/* =========================
   설정 이벤트
========================= */

function bindSetupControls() {
  document
    .getElementById("openSetupBtn")
    ?.addEventListener(
      "click",
      openSetupModal
    );

  document
    .getElementById("closeSetupBtn")
    ?.addEventListener(
      "click",
      closeSetupModal
    );

  document
    .getElementById("saveSetupBtn")
    ?.addEventListener(
      "click",
      saveSetup
    );

  document
    .getElementById("setupModal")
    ?.addEventListener(
      "click",
      event => {
        if (
          event.target.id ===
          "setupModal"
        ) {
          closeSetupModal();
        }
      }
    );
}

/* =========================
   운동 추가 팝업
========================= */

function openExerciseModal() {
  document
    .getElementById("exerciseModal")
    ?.classList.add("open");
}

function closeExerciseModal() {
  document
    .getElementById("exerciseModal")
    ?.classList.remove("open");
}

function resetExerciseInputs() {
  const nameInput =
    document.getElementById(
      "newExerciseNameInput"
    );

  const imageInput =
    document.getElementById(
      "newExerciseImageInput"
    );

  const targetInput =
    document.getElementById(
      "newExerciseTargetInput"
    );

  const pointsInput =
    document.getElementById(
      "newExercisePointsInput"
    );

  if (nameInput) {
    nameInput.value = "";
  }

  if (imageInput) {
    imageInput.value = "🏋️";
  }

  if (targetInput) {
    targetInput.value = "10";
  }

  if (pointsInput) {
    pointsInput.value = "10";
  }
}

function saveNewExercise() {
  const name =
    document
      .getElementById(
        "newExerciseNameInput"
      )
      ?.value.trim() || "";

  const image =
    document.getElementById(
      "newExerciseImageInput"
    )?.value || "🏋️";

  const target = Math.max(
    1,
    Number(
      document.getElementById(
        "newExerciseTargetInput"
      )?.value
    ) || 10
  );

  const points = Math.max(
    1,
    Number(
      document.getElementById(
        "newExercisePointsInput"
      )?.value
    ) || 10
  );

  if (!name) {
    alert("운동 이름을 입력해주세용.");
    return;
  }

  state.exercises.push({
    id: createId("exercise"),
    name,
    image,
    target,
    points
  });

  saveState();
  resetExerciseInputs();
  closeExerciseModal();
  renderAll();

  showToast(`${name} 운동을 추가했어용.`);
}

function deleteExercise(exerciseId) {
  const exercise =
    state.exercises.find(
      item => item.id === exerciseId
    );

  if (!exercise) {
    return;
  }

  if (state.exercises.length <= 1) {
    alert(
      "운동은 최소 1개 이상 있어야 해용."
    );
    return;
  }

  const confirmed = confirm(
    `${exercise.name} 운동을 삭제할까용?`
  );

  if (!confirmed) {
    return;
  }

  state.exercises =
    state.exercises.filter(
      item => item.id !== exerciseId
    );

  if (
    state.selectedExerciseId ===
    exerciseId
  ) {
    state.selectedExerciseId = "";
  }

  saveState();
  renderAll();

  showToast("운동을 삭제했어용.");
}

/* =========================
   운동 추가 이벤트
========================= */

function bindExerciseControls() {
  document
    .getElementById("addExerciseBtn")
    ?.addEventListener(
      "click",
      openExerciseModal
    );

  document
    .getElementById(
      "closeExerciseModalBtn"
    )
    ?.addEventListener(
      "click",
      closeExerciseModal
    );

  document
    .getElementById("saveExerciseBtn")
    ?.addEventListener(
      "click",
      saveNewExercise
    );

  document
    .getElementById("exerciseModal")
    ?.addEventListener(
      "click",
      event => {
        if (
          event.target.id ===
          "exerciseModal"
        ) {
          closeExerciseModal();
        }
      }
    );

  document.addEventListener(
    "click",
    event => {
      const exerciseCard =
        event.target.closest(
          "[data-select-exercise]"
        );

      const deleteButton =
        event.target.closest(
          "[data-delete-exercise]"
        );

      if (exerciseCard) {
        selectExercise(
          exerciseCard.dataset
            .selectExercise
        );
      }

      if (deleteButton) {
        deleteExercise(
          deleteButton.dataset
            .deleteExercise
        );
      }
    }
  );

  document
    .getElementById(
      "randomExerciseBtn"
    )
    ?.addEventListener(
      "click",
      selectRandomExercise
    );
}

/* =========================
   운동 선택
========================= */

function selectExercise(exerciseId) {
  const exercise =
    state.exercises.find(
      item => item.id === exerciseId
    );

  if (!exercise) {
    return;
  }

  state.selectedExerciseId =
    exercise.id;

  state.timerRemaining =
    state.timerSeconds;

  state.timerRunning = false;

  stopTimerInterval();

  saveState();
  renderAll();

  showToast(
    `${exercise.name} 운동을 선택했어용.`
  );
}

function selectRandomExercise() {
  if (state.exercises.length === 0) {
    alert("등록된 운동이 없어용.");
    return;
  }

  const randomExercise =
    state.exercises[
      Math.floor(
        Math.random() *
          state.exercises.length
      )
    ];

  selectExercise(randomExercise.id);
}

/* =========================
   배틀 운동 카드
========================= */

function renderBattleExerciseList() {
  const container =
    document.getElementById(
      "battleExerciseList"
    );

  if (!container) {
    return;
  }

  container.innerHTML =
    state.exercises
      .map(exercise => {
        const selected =
          exercise.id ===
          state.selectedExerciseId;

        return `
          <button
            type="button"
            class="exercise-card
              ${selected ? "selected" : ""}"
            data-select-exercise="${exercise.id}"
          >
            <div class="exercise-card-image">
              ${escapeHtml(exercise.image)}
            </div>

            <h3>
              ${escapeHtml(exercise.name)}
            </h3>

            <p>
              목표 ${exercise.target}회
            </p>

            <strong>
              +${exercise.points}점
            </strong>
          </button>
        `;
      })
      .join("");
}

/* =========================
   전체 운동 목록
========================= */

function renderAllExerciseList() {
  const container =
    document.getElementById(
      "allExerciseList"
    );

  if (!container) {
    return;
  }

  if (state.exercises.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div>
          <span>🏋️</span>
          등록된 운동이 없어용.
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML =
    state.exercises
      .map(exercise => {
        return `
          <div class="exercise-manage-card">
            <button
              type="button"
              class="delete-exercise-btn"
              data-delete-exercise="${exercise.id}"
            >
              ✕
            </button>

            <div class="exercise-manage-image">
              ${escapeHtml(exercise.image)}
            </div>

            <h3>
              ${escapeHtml(exercise.name)}
            </h3>

            <p>
              목표 ${exercise.target}회
            </p>

            <strong>
              기본 ${exercise.points}점
            </strong>
          </div>
        `;
      })
      .join("");
}

/* =========================
   기본 화면 정보
========================= */

function renderBasicGameInfo() {
  const blueName =
    document.getElementById(
      "blueTeamNameDisplay"
    );

  const redName =
    document.getElementById(
      "redTeamNameDisplay"
    );

  const blueScore =
    document.getElementById(
      "blueTeamScoreDisplay"
    );

  const redScore =
    document.getElementById(
      "redTeamScoreDisplay"
    );

  const totalScore =
    document.getElementById(
      "totalScoreDisplay"
    );

  const level =
    document.getElementById(
      "levelDisplay"
    );

  const round =
    document.getElementById(
      "roundDisplay"
    );

  if (blueName) {
    blueName.textContent =
      state.blueTeam.name;
  }

  if (redName) {
    redName.textContent =
      state.redTeam.name;
  }

  if (blueScore) {
    blueScore.textContent =
      state.blueTeam.score;
  }

  if (redScore) {
    redScore.textContent =
      state.redTeam.score;
  }

  if (totalScore) {
    totalScore.textContent =
      getTotalScore();
  }

  if (level) {
    level.textContent = getLevel();
  }

  if (round) {
    round.textContent =
      state.round;
  }
}

/* =========================
   1부 렌더링
========================= */

function renderPartOne() {
  renderBasicGameInfo();
  renderBattleExerciseList();
  renderAllExerciseList();
}

/* =========================
   1부 초기 실행
========================= */

function initializePartOne() {
  loadState();

  bindNavigation();
  bindSetupControls();
  bindExerciseControls();

  fillSetupInputs();
  renderPartOne();

  saveState();
}

initializePartOne();
/* =========================
   FIT BATTLE 게임형 버전
   app.js 2부
========================= */

/* =========================
   타이머 이벤트
========================= */

function bindTimerControls() {
  document
    .getElementById("startTimerBtn")
    ?.addEventListener(
      "click",
      startTimer
    );

  document
    .getElementById("pauseTimerBtn")
    ?.addEventListener(
      "click",
      pauseTimer
    );

  document
    .getElementById("resetTimerBtn")
    ?.addEventListener(
      "click",
      resetTimer
    );
}

function startTimer() {
  const exercise =
    getSelectedExercise();

  if (!exercise) {
    alert("먼저 운동 카드를 선택해주세용.");
    return;
  }

  if (state.timerRunning) {
    return;
  }

  if (state.timerRemaining <= 0) {
    state.timerRemaining =
      state.timerSeconds;
  }

  state.timerRunning = true;

  stopTimerInterval();

  timerInterval = setInterval(() => {
    if (!state.timerRunning) {
      return;
    }

    state.timerRemaining -= 1;

    if (state.timerRemaining <= 0) {
      state.timerRemaining = 0;
      state.timerRunning = false;

      stopTimerInterval();
      playFinishSound();

      showToast(
        "운동 시간이 끝났어용! 횟수를 입력해용."
      );
    }

    saveState();
    renderTimer();
  }, 1000);

  playStartSound();

  saveState();
  renderTimer();

  showToast("운동 타이머를 시작했어용.");
}

function pauseTimer() {
  if (!state.timerRunning) {
    return;
  }

  state.timerRunning = false;

  stopTimerInterval();

  saveState();
  renderTimer();

  showToast("타이머를 정지했어용.");
}

function resetTimer() {
  state.timerRunning = false;
  state.timerRemaining =
    state.timerSeconds;

  stopTimerInterval();

  saveState();
  renderTimer();

  showToast("타이머를 초기화했어용.");
}

function stopTimerInterval() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

/* =========================
   간단한 효과음
========================= */

function playStartSound() {
  playTone(660, 0.13);
}

function playFinishSound() {
  playTone(900, 0.24);
}

function playSuccessSound() {
  playTone(780, 0.12);

  setTimeout(() => {
    playTone(980, 0.18);
  }, 140);
}

function playTone(
  frequency,
  duration
) {
  try {
    const AudioContextClass =
      window.AudioContext ||
      window.webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    const audioContext =
      new AudioContextClass();

    const oscillator =
      audioContext.createOscillator();

    const gain =
      audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value =
      frequency;

    gain.gain.setValueAtTime(
      0.12,
      audioContext.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime +
        duration
    );

    oscillator.connect(gain);
    gain.connect(
      audioContext.destination
    );

    oscillator.start();

    oscillator.stop(
      audioContext.currentTime +
        duration
    );
  } catch (error) {
    console.error(
      "효과음 재생 실패:",
      error
    );
  }
}

/* =========================
   현재 운동 렌더링
========================= */

function renderCurrentExercise() {
  const exercise =
    getSelectedExercise();

  const image =
    document.getElementById(
      "currentExerciseImage"
    );

  const name =
    document.getElementById(
      "currentExerciseName"
    );

  const target =
    document.getElementById(
      "currentExerciseTarget"
    );

  if (!exercise) {
    if (image) {
      image.textContent = "🏋️";
    }

    if (name) {
      name.textContent =
        "운동을 선택해주세용";
    }

    if (target) {
      target.textContent =
        "아래 운동 카드 중 하나를 눌러용.";
    }

    return;
  }

  if (image) {
    image.textContent =
      exercise.image;
  }

  if (name) {
    name.textContent =
      exercise.name;
  }

  if (target) {
    target.textContent =
      `목표 ${exercise.target}회 · 기본 ${exercise.points}점`;
  }
}

/* =========================
   타이머 렌더링
========================= */

function renderTimer() {
  const display =
    document.getElementById(
      "timerDisplay"
    );

  const startButton =
    document.getElementById(
      "startTimerBtn"
    );

  const pauseButton =
    document.getElementById(
      "pauseTimerBtn"
    );

  if (display) {
    display.textContent =
      formatTimer(
        state.timerRemaining
      );

    if (
      state.timerRemaining <= 5 &&
      state.timerRemaining > 0
    ) {
      display.style.color =
        "var(--red)";
    } else if (
      state.timerRemaining === 0
    ) {
      display.style.color =
        "var(--green)";
    } else {
      display.style.color =
        "var(--yellow)";
    }
  }

  if (startButton) {
    startButton.disabled =
      state.timerRunning;
  }

  if (pauseButton) {
    pauseButton.disabled =
      !state.timerRunning;
  }
}

/* =========================
   점수 계산
========================= */

function calculateScore() {
  const exercise =
    getSelectedExercise();

  const reps = Math.max(
    0,
    Number(
      document.getElementById(
        "repInput"
      )?.value
    ) || 0
  );

  if (!exercise) {
    return 0;
  }

  const target = Math.max(
    1,
    Number(exercise.target) || 1
  );

  const points = Math.max(
    1,
    Number(exercise.points) || 1
  );

  const scorePerRep =
    points / target;

  return Math.max(
    0,
    Math.round(
      reps * scorePerRep
    )
  );
}

function renderScorePreview() {
  const display =
    document.getElementById(
      "scorePreview"
    );

  if (!display) {
    return;
  }

  const score = calculateScore();

  display.textContent =
    `+${score}점`;
}

/* =========================
   점수 입력 이벤트
========================= */

function bindScoreControls() {
  document
    .getElementById("repInput")
    ?.addEventListener(
      "input",
      renderScorePreview
    );

  document
    .getElementById(
      "completeExerciseBtn"
    )
    ?.addEventListener(
      "click",
      completeExercise
    );

  document
    .getElementById("nextRoundBtn")
    ?.addEventListener(
      "click",
      nextRound
    );
}

/* =========================
   운동 완료
========================= */

function completeExercise() {
  const exercise =
    getSelectedExercise();

  if (!exercise) {
    alert("먼저 운동을 선택해주세용.");
    return;
  }

  const teamKey =
    document.getElementById(
      "scoreTeamSelect"
    )?.value || "blue";

  const reps = Math.max(
    0,
    Number(
      document.getElementById(
        "repInput"
      )?.value
    ) || 0
  );

  if (reps <= 0) {
    alert("성공 횟수를 입력해주세용.");
    return;
  }

  const earnedScore =
    calculateScore();

  const team =
    teamKey === "red"
      ? state.redTeam
      : state.blueTeam;

  team.score += earnedScore;
  team.completed += 1;

  state.missionProgress =
    Math.min(
      state.missionTarget,
      state.missionProgress + 1
    );

  state.records.unshift({
    id: createId("record"),
    createdAt: Date.now(),

    time: getCurrentTime(),

    teamKey,
    teamName: team.name,

    exerciseId: exercise.id,
    exerciseName: exercise.name,
    exerciseImage: exercise.image,

    reps,
    earnedScore,

    round: state.round
  });

  if (state.records.length > 100) {
    state.records.length = 100;
  }

  state.timerRunning = false;
  state.timerRemaining =
    state.timerSeconds;

  stopTimerInterval();

  saveState();
  renderAll();

  playSuccessSound();

  showSuccess(
    "운동 완료!",
    `${team.name}이 ${exercise.name}으로 ${earnedScore}점을 획득했어용.`
  );

  if (
    state.missionProgress >=
    state.missionTarget
  ) {
    setTimeout(() => {
      showSuccess(
        "오늘의 미션 완료!",
        `운동 ${state.missionTarget}개를 모두 완료했어용!`
      );
    }, 500);
  }
}

/* =========================
   다음 라운드
========================= */

function nextRound() {
  state.round += 1;

  state.selectedExerciseId = "";

  state.timerRunning = false;
  state.timerRemaining =
    state.timerSeconds;

  stopTimerInterval();

  const repsInput =
    document.getElementById(
      "repInput"
    );

  if (repsInput) {
    repsInput.value = "10";
  }

  saveState();
  renderAll();

  showToast(
    `${state.round}라운드를 시작해용!`
  );
}

/* =========================
   성공 팝업
========================= */

function showSuccess(
  title,
  text
) {
  const overlay =
    document.getElementById(
      "successOverlay"
    );

  const titleDisplay =
    document.getElementById(
      "successTitle"
    );

  const textDisplay =
    document.getElementById(
      "successText"
    );

  if (titleDisplay) {
    titleDisplay.textContent =
      title;
  }

  if (textDisplay) {
    textDisplay.textContent =
      text;
  }

  overlay?.classList.add("show");
}

function closeSuccess() {
  document
    .getElementById(
      "successOverlay"
    )
    ?.classList.remove("show");
}

function bindSuccessControls() {
  document
    .getElementById(
      "closeSuccessBtn"
    )
    ?.addEventListener(
      "click",
      closeSuccess
    );

  document
    .getElementById(
      "successOverlay"
    )
    ?.addEventListener(
      "click",
      event => {
        if (
          event.target.id ===
          "successOverlay"
        ) {
          closeSuccess();
        }
      }
    );
}

/* =========================
   점수판 비율
========================= */

function renderScoreboard() {
  const blueScore =
    Math.max(
      0,
      Number(
        state.blueTeam.score
      ) || 0
    );

  const redScore =
    Math.max(
      0,
      Number(
        state.redTeam.score
      ) || 0
    );

  const total =
    blueScore + redScore;

  const bluePercent =
    total > 0
      ? (blueScore / total) * 100
      : 50;

  const redPercent =
    total > 0
      ? (redScore / total) * 100
      : 50;

  const blueBar =
    document.getElementById(
      "blueScoreBar"
    );

  const redBar =
    document.getElementById(
      "redScoreBar"
    );

  if (blueBar) {
    blueBar.style.width =
      `${bluePercent}%`;
  }

  if (redBar) {
    redBar.style.width =
      `${redPercent}%`;
  }
}

/* =========================
   미션 진행
========================= */

function renderMission() {
  const title =
    document.getElementById(
      "missionTitle"
    );

  const description =
    document.getElementById(
      "missionDescription"
    );

  const progressBar =
    document.getElementById(
      "missionProgressBar"
    );

  const progressText =
    document.getElementById(
      "missionProgressText"
    );

  const percentage = Math.min(
    100,
    Math.round(
      (
        state.missionProgress /
        Math.max(
          1,
          state.missionTarget
        )
      ) * 100
    )
  );

  if (title) {
    title.textContent =
      `운동 ${state.missionTarget}개 완료하기`;
  }

  if (description) {
    description.textContent =
      state.missionProgress >=
      state.missionTarget
        ? "미션을 완료했어용! 새로운 게임을 시작해도 좋아용."
        : "팀원들과 운동을 완료하고 점수를 획득해용.";
  }

  if (progressBar) {
    progressBar.style.width =
      `${percentage}%`;
  }

  if (progressText) {
    progressText.textContent =
      `${state.missionProgress} / ${state.missionTarget}`;
  }
}

/* =========================
   2부 렌더링
========================= */

function renderPartTwo() {
  renderCurrentExercise();
  renderTimer();
  renderScorePreview();
  renderScoreboard();
  renderMission();
}

/* =========================
   2부 초기 실행
========================= */

function initializePartTwo() {
  bindTimerControls();
  bindScoreControls();
  bindSuccessControls();

  renderPartTwo();
}

initializePartTwo();
/* =========================
   FIT BATTLE 게임형 버전
   app.js 3부
========================= */

/* =========================
   순위 렌더링
========================= */

function renderRanking() {
  const container =
    document.getElementById(
      "rankingList"
    );

  if (!container) {
    return;
  }

  const teams = [
    {
      key: "blue",
      name: state.blueTeam.name,
      score: state.blueTeam.score,
      completed:
        state.blueTeam.completed,
      icon: "🐺"
    },
    {
      key: "red",
      name: state.redTeam.name,
      score: state.redTeam.score,
      completed:
        state.redTeam.completed,
      icon: "🐯"
    }
  ].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return (
      b.completed -
      a.completed
    );
  });

  container.innerHTML = teams
    .map((team, index) => {
      return `
        <div class="ranking-row">
          <div class="ranking-number">
            ${index + 1}
          </div>

          <div>
            <h3>
              ${team.icon}
              ${escapeHtml(team.name)}
            </h3>

            <p>
              운동 완료
              ${team.completed}개
            </p>
          </div>

          <div class="ranking-score">
            ${team.score}점
          </div>
        </div>
      `;
    })
    .join("");
}

/* =========================
   기록 렌더링
========================= */

function renderRecords() {
  const container =
    document.getElementById(
      "recordList"
    );

  if (!container) {
    return;
  }

  if (state.records.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div>
          <span>📊</span>
          아직 운동 기록이 없어용.
        </div>
      </div>
    `;

    return;
  }

  container.innerHTML =
    state.records
      .map(record => {
        return `
          <div class="record-row">
            <time>
              ${escapeHtml(
                record.time || "-"
              )}
            </time>

            <div>
              <h3>
                ${escapeHtml(
                  record.exerciseImage ||
                  "🏋️"
                )}
                ${escapeHtml(
                  record.exerciseName ||
                  "운동"
                )}
              </h3>

              <p>
                ${escapeHtml(
                  record.teamName ||
                  "팀"
                )}
                · ${record.reps || 0}회
                · ${record.round || 1}라운드
              </p>
            </div>

            <div class="record-score">
              +${record.earnedScore || 0}점
            </div>
          </div>
        `;
      })
      .join("");
}

/* =========================
   기록 초기화
========================= */

function clearRecords() {
  if (state.records.length === 0) {
    return;
  }

  const confirmed = confirm(
    "운동 기록만 모두 지울까용?"
  );

  if (!confirmed) {
    return;
  }

  state.records = [];

  saveState();
  renderRecords();

  showToast("운동 기록을 초기화했어용.");
}

/* =========================
   전체 게임 초기화
========================= */

function resetGame() {
  const confirmed = confirm(
    "팀 점수, 운동 기록, 라운드를 모두 초기화할까용?"
  );

  if (!confirmed) {
    return;
  }

  stopTimerInterval();

  const savedExercises =
    clone(state.exercises);

  const blueName =
    state.blueTeam.name;

  const redName =
    state.redTeam.name;

  const timerSeconds =
    state.timerSeconds;

  const missionTarget =
    state.missionTarget;

  state = clone(defaultState);

  state.exercises =
    savedExercises.length > 0
      ? savedExercises
      : clone(defaultExercises);

  state.blueTeam.name =
    blueName;

  state.redTeam.name =
    redName;

  state.timerSeconds =
    timerSeconds;

  state.timerRemaining =
    timerSeconds;

  state.missionTarget =
    missionTarget;

  localStorage.removeItem(
    STORAGE_KEY
  );

  saveState();
  closeSetupModal();
  renderAll();

  showToast("새 게임으로 초기화했어용.");
}

/* =========================
   초기화 버튼 이벤트
========================= */

function bindResetControls() {
  document
    .getElementById(
      "clearRecordsBtn"
    )
    ?.addEventListener(
      "click",
      clearRecords
    );

  document
    .getElementById(
      "resetGameBtn"
    )
    ?.addEventListener(
      "click",
      resetGame
    );
}

/* =========================
   키보드 편의 기능
========================= */

function bindKeyboardControls() {
  document.addEventListener(
    "keydown",
    event => {
      if (
        event.key === "Escape"
      ) {
        closeSetupModal();
        closeExerciseModal();
        closeSuccess();
      }

      if (
        event.key === "Enter" &&
        document
          .getElementById(
            "exerciseModal"
          )
          ?.classList.contains("open")
      ) {
        saveNewExercise();
      }
    }
  );
}

/* =========================
   화면 자동 저장
========================= */

function bindAutoSave() {
  window.addEventListener(
    "beforeunload",
    () => {
      saveState();
    }
  );

  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) {
        saveState();
      }
    }
  );
}

/* =========================
   전체 렌더링
========================= */

function renderAll() {
  renderPartOne();
  renderPartTwo();

  renderRanking();
  renderRecords();

  saveState();
}

/* =========================
   3부 초기 실행
========================= */

function initializePartThree() {
  bindResetControls();
  bindKeyboardControls();
  bindAutoSave();

  renderAll();
}

initializePartThree();