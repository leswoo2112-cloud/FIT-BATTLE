/* =========================
   FIT BATTLE 기본 데이터
========================= */

const STORAGE_KEY = "fit_battle_current_session_v1";
const SAVED_SESSIONS_KEY = "fit_battle_saved_sessions_v1";

let circuitTimerInterval = null;
let toastTimer = null;

const defaultExercises = [
  {
    id: "default-squat",
    name: "스쿼트",
    category: "하체",
    target: 15,
    points: 15
  },
  {
    id: "default-pushup",
    name: "푸시업",
    category: "상체",
    target: 10,
    points: 15
  },
  {
    id: "default-lunge",
    name: "런지",
    category: "하체",
    target: 12,
    points: 15
  },
  {
    id: "default-plank",
    name: "플랭크",
    category: "코어",
    target: 30,
    points: 15
  },
  {
    id: "default-row",
    name: "덤벨 로우",
    category: "상체",
    target: 12,
    points: 15
  },
  {
    id: "default-jumping-jack",
    name: "점핑잭",
    category: "유산소",
    target: 20,
    points: 15
  },
  {
    id: "default-glute-bridge",
    name: "글루트 브리지",
    category: "하체",
    target: 15,
    points: 15
  },
  {
    id: "default-mountain-climber",
    name: "마운틴 클라이머",
    category: "전신",
    target: 20,
    points: 20
  },
  {
    id: "default-dead-bug",
    name: "데드버그",
    category: "코어",
    target: 12,
    points: 15
  },
  {
    id: "default-side-step",
    name: "사이드 스텝",
    category: "유산소",
    target: 20,
    points: 15
  }
];

const defaultState = {
  sessionTitle: "오늘의 웨이트 배틀",
  sessionDate: "",

  workSeconds: 40,
  restSeconds: 20,
  roundCount: 3,
  maxMembers: 5,

  status: "ready",

  teams: [],
  exercises: [],

  records: [],
  randomHistory: [],

  circuit: {
    prepared: false,
    teamId: "",
    exerciseOrder: "normal",

    rounds: 3,
    currentRound: 1,
    currentExerciseIndex: 0,

    queue: [],

    phase: "ready",
    timeRemaining: 40,
    totalPhaseTime: 40,
    running: false
  },

  random: {
    mode: "dice",
    teamId: "",
    selectedExerciseId: ""
  },

  bingo: {
    teamId: "",
    size: 3,
    cells: [],
    completedLines: 0,
    rewardedLines: 0,
    bonusPerLine: 30
  },

  mission: {
    active: false,
    completed: false,

    teamId: "",
    exerciseId: "",

    target: 100,
    current: 0,
    bonus: 50,

    memberContributions: {}
  },

  safetyCheck: {
    warmup: false,
    space: false,
    weight: false,
    pain: false,
    savedAt: null
  }
};

let state = deepClone(defaultState);

/* =========================
   공통 도구
========================= */

function createId(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatTime(seconds) {
  const safeSeconds = Math.max(
    0,
    Math.floor(Number(seconds) || 0)
  );

  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
}

function formatDateTime(timestamp) {
  if (!timestamp) {
    return "-";
  }

  return new Date(timestamp).toLocaleString("ko-KR");
}

function getCurrentTimeText() {
  return new Date().toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function shuffleArray(array) {
  const copied = [...array];

  for (
    let index = copied.length - 1;
    index > 0;
    index -= 1
  ) {
    const randomIndex = Math.floor(
      Math.random() * (index + 1)
    );

    [copied[index], copied[randomIndex]] = [
      copied[randomIndex],
      copied[index]
    ];
  }

  return copied;
}

function downloadTextFile(
  fileName,
  content,
  mimeType
) {
  const blob = new Blob([content], {
    type: mimeType
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

/* =========================
   저장·불러오기
========================= */

function normalizeState() {
  if (!Array.isArray(state.teams)) {
    state.teams = [];
  }

  if (!Array.isArray(state.exercises)) {
    state.exercises = [];
  }

  if (!Array.isArray(state.records)) {
    state.records = [];
  }

  if (!Array.isArray(state.randomHistory)) {
    state.randomHistory = [];
  }

  state.teams = state.teams.map(team => ({
    id: createId("team"),
    name: "새 팀",
    score: 0,
    participants: [],
    ...team,
    participants: Array.isArray(team.participants)
      ? team.participants.map(participant => ({
          id: createId("participant"),
          name: "참가자",
          score: 0,
          totalReps: 0,
          validReps: 0,
          invalidReps: 0,
          bonusScore: 0,
          recordCount: 0,
          ...participant
        }))
      : []
  }));

  state.exercises = state.exercises.map(exercise => ({
    id: createId("exercise"),
    name: "운동",
    category: "전신",
    target: 10,
    points: 10,
    ...exercise
  }));

  state.circuit = {
    ...deepClone(defaultState.circuit),
    ...(state.circuit || {})
  };

  state.random = {
    ...deepClone(defaultState.random),
    ...(state.random || {})
  };

  state.bingo = {
    ...deepClone(defaultState.bingo),
    ...(state.bingo || {})
  };

  state.mission = {
    ...deepClone(defaultState.mission),
    ...(state.mission || {}),
    memberContributions:
      state.mission?.memberContributions || {}
  };

  state.safetyCheck = {
    ...deepClone(defaultState.safetyCheck),
    ...(state.safetyCheck || {})
  };
}

function saveState() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(state)
    );
  } catch (error) {
    console.error("세션 저장 실패:", error);
  }
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    state = deepClone(defaultState);
    state.exercises = deepClone(defaultExercises);
    return;
  }

  try {
    state = {
      ...deepClone(defaultState),
      ...JSON.parse(saved)
    };

    normalizeState();

    if (state.exercises.length === 0) {
      state.exercises = deepClone(defaultExercises);
    }
  } catch (error) {
    console.error("세션 불러오기 실패:", error);

    state = deepClone(defaultState);
    state.exercises = deepClone(defaultExercises);
  }
}

function getSavedSessions() {
  try {
    const saved = localStorage.getItem(
      SAVED_SESSIONS_KEY
    );

    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(
      "저장 세션 목록 불러오기 실패:",
      error
    );

    return [];
  }
}

function setSavedSessions(sessions) {
  try {
    localStorage.setItem(
      SAVED_SESSIONS_KEY,
      JSON.stringify(sessions)
    );
  } catch (error) {
    console.error(
      "저장 세션 목록 저장 실패:",
      error
    );
  }
}

/* =========================
   팀·참가자·운동 조회
========================= */

function getTeam(teamId) {
  return state.teams.find(
    team => team.id === teamId
  );
}

function getExercise(exerciseId) {
  return state.exercises.find(
    exercise => exercise.id === exerciseId
  );
}

function getParticipant(participantId) {
  for (const team of state.teams) {
    const participant = team.participants.find(
      item => item.id === participantId
    );

    if (participant) {
      return participant;
    }
  }

  return null;
}

function getParticipantTeam(participantId) {
  return state.teams.find(team =>
    team.participants.some(
      participant => participant.id === participantId
    )
  );
}

function getAllParticipants() {
  return state.teams.flatMap(team =>
    team.participants.map(participant => ({
      ...participant,
      teamId: team.id,
      teamName: team.name
    }))
  );
}

function calculateTeamScore(team) {
  if (!team) {
    return 0;
  }

  return Number(team.score) || 0;
}

function calculateParticipantScore(participant) {
  if (!participant) {
    return 0;
  }

  return Number(participant.score) || 0;
}

/* =========================
   토스트 알림
========================= */

function showToast(message) {
  const toast = document.getElementById("toast");

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
  }, 2400);
}

/* =========================
   탭 이동
========================= */

function openTab(tabId) {
  document.querySelectorAll(".nav-btn").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.tab === tabId
    );
  });

  document
    .querySelectorAll(".tab-section")
    .forEach(section => {
      section.classList.toggle(
        "active",
        section.id === tabId
      );
    });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  renderAll();
}

function bindNavigation() {
  document.querySelectorAll(".nav-btn").forEach(button => {
    button.addEventListener("click", () => {
      openTab(button.dataset.tab);
    });
  });

  document
    .querySelectorAll("[data-open-tab]")
    .forEach(button => {
      button.addEventListener("click", () => {
        openTab(button.dataset.openTab);
      });
    });

  document
    .getElementById("quickStartCircuitBtn")
    ?.addEventListener("click", () => {
      openTab("circuitSection");
    });

  document
    .getElementById("quickRandomGameBtn")
    ?.addEventListener("click", () => {
      openTab("randomSection");
    });
}

/* =========================
   설정 패널
========================= */

function openSetupPanel() {
  fillSetupInputs();
  renderSetupTeams();
  renderSetupExercises();

  document
    .getElementById("setupPanel")
    ?.classList.add("open");
}

function closeSetupPanel() {
  document
    .getElementById("setupPanel")
    ?.classList.remove("open");
}

function bindSetupPanel() {
  document
    .getElementById("openSetupBtn")
    ?.addEventListener("click", openSetupPanel);

  document
    .getElementById("closeSetupBtn")
    ?.addEventListener("click", closeSetupPanel);

  document
    .getElementById("saveSetupBtn")
    ?.addEventListener("click", saveSetup);

  document
    .getElementById("loadDefaultExercisesBtn")
    ?.addEventListener(
      "click",
      loadDefaultExercises
    );

  document
    .getElementById("addTeamBtn")
    ?.addEventListener("click", addTeamFromInput);

  document
    .getElementById("addExerciseBtn")
    ?.addEventListener(
      "click",
      addExerciseFromInputs
    );
}

/* =========================
   설정 입력값
========================= */

function fillSetupInputs() {
  document.getElementById(
    "sessionTitleInput"
  ).value = state.sessionTitle;

  document.getElementById(
    "sessionDateInput"
  ).value = state.sessionDate;

  document.getElementById(
    "workSecondsInput"
  ).value = state.workSeconds;

  document.getElementById(
    "restSecondsInput"
  ).value = state.restSeconds;

  document.getElementById(
    "roundCountInput"
  ).value = state.roundCount;

  document.getElementById(
    "maxMembersInput"
  ).value = state.maxMembers;
}

function saveSetup() {
  state.sessionTitle =
    document
      .getElementById("sessionTitleInput")
      ?.value.trim() ||
    "오늘의 웨이트 배틀";

  state.sessionDate =
    document.getElementById(
      "sessionDateInput"
    )?.value || "";

  state.workSeconds = Math.max(
    10,
    Number(
      document.getElementById(
        "workSecondsInput"
      )?.value
    ) || 40
  );

  state.restSeconds = Math.max(
    5,
    Number(
      document.getElementById(
        "restSecondsInput"
      )?.value
    ) || 20
  );

  state.roundCount = Math.max(
    1,
    Number(
      document.getElementById(
        "roundCountInput"
      )?.value
    ) || 3
  );

  state.maxMembers = Math.max(
    1,
    Number(
      document.getElementById(
        "maxMembersInput"
      )?.value
    ) || 5
  );

  state.circuit.rounds = state.roundCount;

  if (!state.sessionDate) {
    state.sessionDate = new Date()
      .toISOString()
      .slice(0, 10);
  }

  saveState();
  closeSetupPanel();
  renderAll();

  showToast("운동 세션 설정을 저장했어용.");
}

/* =========================
   팀 관리
========================= */

function addTeamFromInput() {
  const input = document.getElementById(
    "newTeamNameInput"
  );

  const name = input?.value.trim() || "";

  if (!name) {
    alert("팀 이름을 입력해주세용.");
    return;
  }

  const duplicate = state.teams.some(
    team =>
      team.name.toLowerCase() ===
      name.toLowerCase()
  );

  if (duplicate) {
    alert("이미 등록된 팀 이름이에용.");
    return;
  }

  state.teams.push({
    id: createId("team"),
    name,
    score: 0,
    participants: []
  });

  input.value = "";

  saveState();
  renderSetupTeams();
  renderAllSelectOptions();
  renderHome();
}

function deleteTeam(teamId) {
  const team = getTeam(teamId);

  if (!team) {
    return;
  }

  const confirmed = confirm(
    `${team.name} 팀과 참가자 기록을 삭제할까용?`
  );

  if (!confirmed) {
    return;
  }

  state.teams = state.teams.filter(
    item => item.id !== teamId
  );

  if (state.circuit.teamId === teamId) {
    state.circuit.teamId = "";
  }

  if (state.random.teamId === teamId) {
    state.random.teamId = "";
  }

  if (state.bingo.teamId === teamId) {
    state.bingo = deepClone(
      defaultState.bingo
    );
  }

  if (state.mission.teamId === teamId) {
    state.mission = deepClone(
      defaultState.mission
    );
  }

  saveState();
  renderSetupTeams();
  renderAll();
}

function addParticipant(teamId) {
  const team = getTeam(teamId);

  if (!team) {
    return;
  }

  if (
    team.participants.length >=
    state.maxMembers
  ) {
    alert(
      `팀당 최대 ${state.maxMembers}명까지 등록할 수 있어용.`
    );

    return;
  }

  const input = document.querySelector(
    `[data-member-input="${teamId}"]`
  );

  const name = input?.value.trim() || "";

  if (!name) {
    alert("참가자 이름을 입력해주세용.");
    return;
  }

  team.participants.push({
    id: createId("participant"),
    name,

    score: 0,

    totalReps: 0,
    validReps: 0,
    invalidReps: 0,

    bonusScore: 0,
    recordCount: 0
  });

  input.value = "";

  saveState();
  renderSetupTeams();
  renderAllSelectOptions();
  renderHome();
}

function deleteParticipant(
  teamId,
  participantId
) {
  const team = getTeam(teamId);

  if (!team) {
    return;
  }

  team.participants =
    team.participants.filter(
      participant =>
        participant.id !== participantId
    );

  saveState();
  renderSetupTeams();
  renderAll();
}

/* =========================
   팀 설정 렌더링
========================= */

function renderSetupTeams() {
  const container = document.getElementById(
    "setupTeamList"
  );

  if (!container) {
    return;
  }

  if (state.teams.length === 0) {
    container.innerHTML = `
      <div class="empty-message">
        팀을 추가하고 참가자를 등록해주세용.
      </div>
    `;

    return;
  }

  container.innerHTML = state.teams
    .map(team => {
      return `
        <div class="setup-team-card">
          <div class="setup-team-head">
            <strong>
              ${escapeHtml(team.name)}
              · ${team.participants.length}명
            </strong>

            <button
              type="button"
              data-delete-team="${team.id}"
            >
              팀 삭제
            </button>
          </div>

          <div class="member-add-row">
            <input
              type="text"
              placeholder="참가자 이름"
              data-member-input="${team.id}"
            />

            <button
              type="button"
              class="secondary-btn"
              data-add-member="${team.id}"
            >
              추가
            </button>
          </div>

          <div class="setup-member-list">
            ${
              team.participants.length > 0
                ? team.participants
                    .map(
                      participant => `
                        <div class="member-chip">
                          <span>
                            ${escapeHtml(
                              participant.name
                            )}
                          </span>

                          <button
                            type="button"
                            data-delete-member="${participant.id}"
                            data-team-id="${team.id}"
                          >
                            ✕
                          </button>
                        </div>
                      `
                    )
                    .join("")
                : `
                  <span class="empty-message">
                    등록된 참가자가 없어용.
                  </span>
                `
            }
          </div>
        </div>
      `;
    })
    .join("");
}

/* =========================
   운동 관리
========================= */

function addExerciseFromInputs() {
  const nameInput = document.getElementById(
    "newExerciseNameInput"
  );

  const categoryInput =
    document.getElementById(
      "newExerciseCategoryInput"
    );

  const targetInput = document.getElementById(
    "newExerciseTargetInput"
  );

  const pointsInput = document.getElementById(
    "newExercisePointsInput"
  );

  const name = nameInput?.value.trim() || "";
  const category =
    categoryInput?.value || "전신";

  const target = Math.max(
    1,
    Number(targetInput?.value) || 10
  );

  const points = Math.max(
    1,
    Number(pointsInput?.value) || 10
  );

  if (!name) {
    alert("운동 이름을 입력해주세용.");
    return;
  }

  state.exercises.push({
    id: createId("exercise"),
    name,
    category,
    target,
    points
  });

  nameInput.value = "";
  targetInput.value = "10";
  pointsInput.value = "10";

  saveState();
  renderSetupExercises();
  renderAllSelectOptions();
  renderHome();
}

function deleteExercise(exerciseId) {
  const exercise = getExercise(exerciseId);

  if (!exercise) {
    return;
  }

  const confirmed = confirm(
    `${exercise.name} 운동을 삭제할까용?`
  );

  if (!confirmed) {
    return;
  }

  state.exercises = state.exercises.filter(
    item => item.id !== exerciseId
  );

  saveState();
  renderSetupExercises();
  renderAll();
}

function loadDefaultExercises() {
  const confirmed = confirm(
    "현재 운동 목록을 기본 운동으로 바꿀까용?"
  );

  if (!confirmed) {
    return;
  }

  state.exercises = deepClone(defaultExercises);

  saveState();
  renderSetupExercises();
  renderAll();

  showToast("기본 운동을 불러왔어용.");
}

/* =========================
   운동 목록 렌더링
========================= */

function renderSetupExercises() {
  const container = document.getElementById(
    "setupExerciseList"
  );

  if (!container) {
    return;
  }

  if (state.exercises.length === 0) {
    container.innerHTML = `
      <div class="empty-message">
        사용할 운동을 추가해주세용.
      </div>
    `;

    return;
  }

  container.innerHTML = state.exercises
    .map(exercise => {
      return `
        <div class="exercise-list-row">
          <div>
            <strong>
              ${escapeHtml(exercise.name)}
            </strong>

            <span>
              ${escapeHtml(exercise.category)}
              · 목표 ${exercise.target}회
            </span>
          </div>

          <b>${exercise.points}점</b>

          <span>
            완료 기준
          </span>

          <button
            type="button"
            data-delete-exercise="${exercise.id}"
          >
            삭제
          </button>
        </div>
      `;
    })
    .join("");
}

/* =========================
   설정 목록 클릭 이벤트
========================= */

function bindSetupListEvents() {
  document.addEventListener("click", event => {
    const addMemberTeamId =
      event.target.dataset.addMember;

    const deleteMemberId =
      event.target.dataset.deleteMember;

    const deleteMemberTeamId =
      event.target.dataset.teamId;

    const deleteTeamId =
      event.target.dataset.deleteTeam;

    const deleteExerciseId =
      event.target.dataset.deleteExercise;

    if (addMemberTeamId) {
      addParticipant(addMemberTeamId);
    }

    if (
      deleteMemberId &&
      deleteMemberTeamId
    ) {
      deleteParticipant(
        deleteMemberTeamId,
        deleteMemberId
      );
    }

    if (deleteTeamId) {
      deleteTeam(deleteTeamId);
    }

    if (deleteExerciseId) {
      deleteExercise(deleteExerciseId);
    }
  });

  document.addEventListener(
    "keydown",
    event => {
      if (
        event.key !== "Enter" ||
        !event.target.dataset.memberInput
      ) {
        return;
      }

      addParticipant(
        event.target.dataset.memberInput
      );
    }
  );
}

/* =========================
   셀렉트 옵션 렌더링
========================= */

function fillTeamSelect(selectId) {
  const select = document.getElementById(
    selectId
  );

  if (!select) {
    return;
  }

  const previousValue = select.value;

  select.innerHTML = `
    <option value="">팀 선택</option>
  `;

  state.teams.forEach(team => {
    const option = document.createElement(
      "option"
    );

    option.value = team.id;
    option.textContent = team.name;

    select.appendChild(option);
  });

  if (
    previousValue &&
    state.teams.some(
      team => team.id === previousValue
    )
  ) {
    select.value = previousValue;
  }
}

function fillExerciseSelect(selectId) {
  const select = document.getElementById(
    selectId
  );

  if (!select) {
    return;
  }

  const previousValue = select.value;

  select.innerHTML = `
    <option value="">운동 선택</option>
  `;

  state.exercises.forEach(exercise => {
    const option = document.createElement(
      "option"
    );

    option.value = exercise.id;
    option.textContent =
      `${exercise.name} · ${exercise.target}회`;

    select.appendChild(option);
  });

  if (
    previousValue &&
    state.exercises.some(
      exercise =>
        exercise.id === previousValue
    )
  ) {
    select.value = previousValue;
  }
}

function fillParticipantSelect(
  selectId,
  teamId
) {
  const select = document.getElementById(
    selectId
  );

  if (!select) {
    return;
  }

  const previousValue = select.value;
  const team = getTeam(teamId);

  select.innerHTML = `
    <option value="">참가자 선택</option>
  `;

  if (!team) {
    return;
  }

  team.participants.forEach(participant => {
    const option = document.createElement(
      "option"
    );

    option.value = participant.id;
    option.textContent = participant.name;

    select.appendChild(option);
  });

  if (
    previousValue &&
    team.participants.some(
      participant =>
        participant.id === previousValue
    )
  ) {
    select.value = previousValue;
  }
}

function fillAllParticipantSelect(selectId) {
  const select = document.getElementById(
    selectId
  );

  if (!select) {
    return;
  }

  const previousValue = select.value;

  select.innerHTML = `
    <option value="">참가자 선택</option>
  `;

  getAllParticipants().forEach(participant => {
    const option = document.createElement(
      "option"
    );

    option.value = participant.id;
    option.textContent =
      `${participant.teamName} · ${participant.name}`;

    select.appendChild(option);
  });

  if (
    previousValue &&
    getParticipant(previousValue)
  ) {
    select.value = previousValue;
  }
}

function renderAllSelectOptions() {
  [
    "circuitTeamSelect",
    "randomTeamSelect",
    "bingoTeamSelect",
    "missionTeamSelect"
  ].forEach(fillTeamSelect);

  fillExerciseSelect(
    "missionExerciseSelect"
  );

  fillAllParticipantSelect(
    "recordParticipantSelect"
  );
}

/* =========================
   홈 화면 기본 렌더링
========================= */

function renderHome() {
  const participantCount =
    getAllParticipants().length;

  document.getElementById(
    "homeTeamCount"
  ).textContent = state.teams.length;

  document.getElementById(
    "homeParticipantCount"
  ).textContent = participantCount;

  document.getElementById(
    "homeExerciseCount"
  ).textContent = state.exercises.length;

  document.getElementById(
    "homeRoundCount"
  ).textContent = state.roundCount;

  document.getElementById(
    "sessionTitleDisplay"
  ).textContent = state.sessionTitle;

  const badge = document.getElementById(
    "sessionStatusBadge"
  );

  if (badge) {
    badge.textContent =
      state.status === "active"
        ? "진행 중"
        : state.status === "complete"
        ? "완료"
        : "준비 중";
  }

  renderHomeRanking();
}

function renderHomeRanking() {
  const container = document.getElementById(
    "homeRankingList"
  );

  if (!container) {
    return;
  }

  const teams = [...state.teams]
    .sort(
      (a, b) =>
        calculateTeamScore(b) -
        calculateTeamScore(a)
    )
    .slice(0, 4);

  if (teams.length === 0) {
    container.innerHTML = `
      <div class="empty-message">
        팀을 등록하면 순위가 표시돼용.
      </div>
    `;

    return;
  }

  container.innerHTML = teams
    .map((team, index) => {
      return `
        <div class="ranking-preview-row">
          <b>${index + 1}</b>

          <strong>
            ${escapeHtml(team.name)}
          </strong>

          <span>
            ${calculateTeamScore(team)}점
          </span>
        </div>
      `;
    })
    .join("");
}

/* =========================
   1부 전체 렌더링
========================= */

function renderPartOne() {
  renderHome();
  renderAllSelectOptions();
}

/* =========================
   1부 초기 실행
========================= */

function initializeAppPartOne() {
  loadState();

  if (!state.sessionDate) {
    state.sessionDate = new Date()
      .toISOString()
      .slice(0, 10);
  }

  bindNavigation();
  bindSetupPanel();
  bindSetupListEvents();

  fillSetupInputs();
  renderSetupTeams();
  renderSetupExercises();

  renderPartOne();
  saveState();
}

initializeAppPartOne();
/* =========================
   공통 운동 기록 저장
========================= */

function calculateExerciseScore({
  exercise,
  successfulReps,
  invalidReps,
  bonusScore
}) {
  if (!exercise) {
    return 0;
  }

  const validReps = Math.max(
    0,
    successfulReps - invalidReps
  );

  const target = Math.max(
    1,
    Number(exercise.target) || 1
  );

  const basePoints = Math.max(
    1,
    Number(exercise.points) || 1
  );

  const scorePerRep = basePoints / target;

  const repetitionScore = Math.round(
    validReps * scorePerRep
  );

  return Math.max(
    0,
    repetitionScore + bonusScore
  );
}

function addWorkoutRecord({
  mode,
  teamId,
  participantId,
  exerciseId,
  successfulReps,
  invalidReps,
  bonusScore,
  earnedScore,
  extra = {}
}) {
  const team = getTeam(teamId);
  const participant = getParticipant(
    participantId
  );

  const exercise = getExercise(exerciseId);

  if (!team || !participant || !exercise) {
    return null;
  }

  const validReps = Math.max(
    0,
    successfulReps - invalidReps
  );

  const record = {
    id: createId("record"),
    createdAt: Date.now(),

    time: getCurrentTimeText(),
    mode,

    teamId: team.id,
    teamName: team.name,

    participantId: participant.id,
    participantName: participant.name,

    exerciseId: exercise.id,
    exerciseName: exercise.name,
    exerciseCategory: exercise.category,

    successfulReps,
    invalidReps,
    validReps,

    bonusScore,
    earnedScore,

    ...extra
  };

  state.records.unshift(record);

  if (state.records.length > 500) {
    state.records.length = 500;
  }

  team.score += earnedScore;

  participant.score += earnedScore;

  participant.totalReps += successfulReps;
  participant.validReps += validReps;
  participant.invalidReps += invalidReps;

  participant.bonusScore += bonusScore;
  participant.recordCount += 1;

  state.status = "active";

  saveState();

  return record;
}

/* =========================
   서킷 설정 이벤트
========================= */

function bindCircuitControls() {
  document
    .getElementById("circuitTeamSelect")
    ?.addEventListener("change", event => {
      state.circuit.teamId =
        event.target.value;

      fillParticipantSelect(
        "circuitParticipantSelect",
        state.circuit.teamId
      );

      saveState();
      renderCircuit();
    });

  document
    .getElementById("circuitExerciseOrder")
    ?.addEventListener("change", event => {
      state.circuit.exerciseOrder =
        event.target.value;

      saveState();
    });

  document
    .getElementById("circuitRoundInput")
    ?.addEventListener("input", event => {
      state.circuit.rounds = Math.max(
        1,
        Number(event.target.value) ||
          state.roundCount
      );

      saveState();
    });

  document
    .getElementById("prepareCircuitBtn")
    ?.addEventListener(
      "click",
      prepareCircuit
    );

  document
    .getElementById("startCircuitTimerBtn")
    ?.addEventListener(
      "click",
      startCircuitCountdown
    );

  document
    .getElementById("pauseCircuitTimerBtn")
    ?.addEventListener(
      "click",
      pauseCircuitTimer
    );

  document
    .getElementById("nextCircuitExerciseBtn")
    ?.addEventListener(
      "click",
      moveToNextCircuitExercise
    );

  document
    .getElementById("stopCircuitBtn")
    ?.addEventListener(
      "click",
      stopCircuit
    );

  document
    .getElementById("saveCircuitScoreBtn")
    ?.addEventListener(
      "click",
      saveCircuitScore
    );

  [
    "successfulRepsInput",
    "invalidRepsInput",
    "bonusScoreInput"
  ].forEach(inputId => {
    document
      .getElementById(inputId)
      ?.addEventListener(
        "input",
        renderCalculatedCircuitScore
      );
  });
}

/* =========================
   서킷 준비
========================= */

function prepareCircuit() {
  const teamId =
    document.getElementById(
      "circuitTeamSelect"
    )?.value || "";

  const exerciseOrder =
    document.getElementById(
      "circuitExerciseOrder"
    )?.value || "normal";

  const rounds = Math.max(
    1,
    Number(
      document.getElementById(
        "circuitRoundInput"
      )?.value
    ) || state.roundCount
  );

  const team = getTeam(teamId);

  if (!team) {
    alert("서킷을 진행할 팀을 선택해주세용.");
    return;
  }

  if (team.participants.length === 0) {
    alert("선택한 팀에 참가자가 없어용.");
    return;
  }

  if (state.exercises.length === 0) {
    alert("먼저 사용할 운동을 등록해주세용.");
    return;
  }

  stopCircuitTimerOnly();

  let queue = state.exercises.map(
    exercise => exercise.id
  );

  if (exerciseOrder === "random") {
    queue = shuffleArray(queue);
  }

  state.circuit = {
    prepared: true,

    teamId,
    exerciseOrder,

    rounds,
    currentRound: 1,
    currentExerciseIndex: 0,

    queue,

    phase: "work",

    timeRemaining: state.workSeconds,
    totalPhaseTime: state.workSeconds,

    running: false
  };

  state.status = "active";

  fillParticipantSelect(
    "circuitParticipantSelect",
    teamId
  );

  resetCircuitScoreInputs();

  saveState();
  renderCircuit();

  showToast(
    `${team.name} 팀 서킷을 준비했어용.`
  );
}

/* =========================
   현재 서킷 운동
========================= */

function getCurrentCircuitExercise() {
  if (!state.circuit.prepared) {
    return null;
  }

  const exerciseId =
    state.circuit.queue[
      state.circuit.currentExerciseIndex
    ];

  return getExercise(exerciseId);
}

function getCircuitExercisePosition() {
  return (
    state.circuit.currentExerciseIndex + 1
  );
}

function getCircuitTotalExercises() {
  return state.circuit.queue.length;
}

function isLastCircuitExercise() {
  return (
    state.circuit.currentExerciseIndex >=
    state.circuit.queue.length - 1
  );
}

function isLastCircuitRound() {
  return (
    state.circuit.currentRound >=
    state.circuit.rounds
  );
}

/* =========================
   서킷 시작 카운트다운
========================= */

function startCircuitCountdown() {
  if (!state.circuit.prepared) {
    alert("먼저 서킷 준비를 눌러주세용.");
    return;
  }

  if (state.circuit.running) {
    return;
  }

  const overlay = document.getElementById(
    "countdownOverlay"
  );

  const number = document.getElementById(
    "countdownNumber"
  );

  if (!overlay || !number) {
    startCircuitTimer();
    return;
  }

  let count = 3;

  number.textContent = count;
  overlay.classList.add("show");

  const countdownInterval = setInterval(
    () => {
      count -= 1;

      if (count > 0) {
        number.textContent = count;
        return;
      }

      clearInterval(countdownInterval);

      number.textContent = "GO!";

      setTimeout(() => {
        overlay.classList.remove("show");
        startCircuitTimer();
      }, 550);
    },
    800
  );
}

/* =========================
   서킷 타이머
========================= */

function startCircuitTimer() {
  if (!state.circuit.prepared) {
    return;
  }

  if (circuitTimerInterval) {
    return;
  }

  state.circuit.running = true;
  state.status = "active";

  saveState();
  renderCircuit();

  playStartTone();

  circuitTimerInterval = setInterval(() => {
    circuitTimerTick();
  }, 1000);
}

function circuitTimerTick() {
  if (!state.circuit.running) {
    return;
  }

  if (state.circuit.timeRemaining > 0) {
    state.circuit.timeRemaining -= 1;
  }

  if (state.circuit.timeRemaining <= 0) {
    state.circuit.timeRemaining = 0;

    handleCircuitPhaseComplete();
  }

  saveState();
  renderCircuitTimer();
}

function pauseCircuitTimer() {
  if (!state.circuit.prepared) {
    return;
  }

  state.circuit.running = false;

  stopCircuitTimerOnly();

  saveState();
  renderCircuit();

  showToast("서킷 타이머를 일시정지했어용.");
}

function stopCircuitTimerOnly() {
  if (circuitTimerInterval) {
    clearInterval(circuitTimerInterval);
    circuitTimerInterval = null;
  }

  if (state.circuit) {
    state.circuit.running = false;
  }
}

/* =========================
   운동·휴식 전환
========================= */

function handleCircuitPhaseComplete() {
  stopCircuitTimerOnly();
  playFinishTone();

  if (state.circuit.phase === "work") {
    state.circuit.phase = "rest";
    state.circuit.timeRemaining =
      state.restSeconds;

    state.circuit.totalPhaseTime =
      state.restSeconds;

    saveState();
    renderCircuit();

    showToast(
      `운동 완료! ${state.restSeconds}초 휴식해용.`
    );

    return;
  }

  moveToNextCircuitExercise(true);
}

function moveToNextCircuitExercise(
  autoStart = false
) {
  if (!state.circuit.prepared) {
    alert("준비된 서킷이 없어용.");
    return;
  }

  stopCircuitTimerOnly();

  if (!isLastCircuitExercise()) {
    state.circuit.currentExerciseIndex += 1;
  } else if (!isLastCircuitRound()) {
    state.circuit.currentRound += 1;
    state.circuit.currentExerciseIndex = 0;

    if (
      state.circuit.exerciseOrder ===
      "random"
    ) {
      state.circuit.queue = shuffleArray(
        state.circuit.queue
      );
    }
  } else {
    finishCircuit();
    return;
  }

  state.circuit.phase = "work";
  state.circuit.timeRemaining =
    state.workSeconds;

  state.circuit.totalPhaseTime =
    state.workSeconds;

  resetCircuitScoreInputs();

  saveState();
  renderCircuit();

  if (autoStart) {
    setTimeout(() => {
      startCircuitTimer();
    }, 500);
  }
}

/* =========================
   서킷 종료
========================= */

function finishCircuit() {
  stopCircuitTimerOnly();

  state.circuit.running = false;
  state.circuit.phase = "complete";
  state.circuit.timeRemaining = 0;

  state.status = "complete";

  saveState();
  renderAll();

  showCelebration(
    "서킷 완료!",
    `${getTeam(
      state.circuit.teamId
    )?.name || "팀"}의 모든 라운드가 끝났어용.`
  );
}

function stopCircuit() {
  if (!state.circuit.prepared) {
    return;
  }

  const confirmed = confirm(
    "현재 서킷을 종료할까용?"
  );

  if (!confirmed) {
    return;
  }

  stopCircuitTimerOnly();

  state.circuit = {
    ...deepClone(defaultState.circuit),
    rounds: state.roundCount,
    timeRemaining: state.workSeconds,
    totalPhaseTime: state.workSeconds
  };

  saveState();
  renderCircuit();

  showToast("서킷을 종료했어용.");
}

/* =========================
   서킷 점수 계산
========================= */

function getCircuitScoreInputValues() {
  return {
    successfulReps: Math.max(
      0,
      Number(
        document.getElementById(
          "successfulRepsInput"
        )?.value
      ) || 0
    ),

    invalidReps: Math.max(
      0,
      Number(
        document.getElementById(
          "invalidRepsInput"
        )?.value
      ) || 0
    ),

    bonusScore: Math.max(
      0,
      Number(
        document.getElementById(
          "bonusScoreInput"
        )?.value
      ) || 0
    )
  };
}

function renderCalculatedCircuitScore() {
  const display = document.getElementById(
    "calculatedScoreDisplay"
  );

  if (!display) {
    return;
  }

  const exercise =
    getCurrentCircuitExercise();

  const values =
    getCircuitScoreInputValues();

  if (
    values.invalidReps >
    values.successfulReps
  ) {
    values.invalidReps =
      values.successfulReps;
  }

  const score = calculateExerciseScore({
    exercise,
    ...values
  });

  display.textContent = `${score}점`;
}

function resetCircuitScoreInputs() {
  const successfulInput =
    document.getElementById(
      "successfulRepsInput"
    );

  const invalidInput =
    document.getElementById(
      "invalidRepsInput"
    );

  const bonusInput =
    document.getElementById(
      "bonusScoreInput"
    );

  if (successfulInput) {
    successfulInput.value = "0";
  }

  if (invalidInput) {
    invalidInput.value = "0";
  }

  if (bonusInput) {
    bonusInput.value = "0";
  }

  renderCalculatedCircuitScore();
}

/* =========================
   서킷 점수 저장
========================= */

function saveCircuitScore() {
  if (!state.circuit.prepared) {
    alert("먼저 서킷을 준비해주세용.");
    return;
  }

  const participantId =
    document.getElementById(
      "circuitParticipantSelect"
    )?.value || "";

  const participant = getParticipant(
    participantId
  );

  const exercise =
    getCurrentCircuitExercise();

  if (!participant) {
    alert("점수를 저장할 참가자를 선택해주세용.");
    return;
  }

  if (!exercise) {
    alert("현재 운동을 찾지 못했어용.");
    return;
  }

  const values =
    getCircuitScoreInputValues();

  if (
    values.invalidReps >
    values.successfulReps
  ) {
    alert(
      "자세 불량 제외 횟수는 성공 횟수보다 많을 수 없어용."
    );

    return;
  }

  const earnedScore =
    calculateExerciseScore({
      exercise,
      ...values
    });

  addWorkoutRecord({
    mode: "circuit",

    teamId: state.circuit.teamId,
    participantId,
    exerciseId: exercise.id,

    successfulReps:
      values.successfulReps,

    invalidReps:
      values.invalidReps,

    bonusScore:
      values.bonusScore,

    earnedScore,

    extra: {
      round:
        state.circuit.currentRound
    }
  });

  resetCircuitScoreInputs();

  saveState();
  renderAll();

  showToast(
    `${participant.name}에게 ${earnedScore}점을 저장했어용.`
  );
}

/* =========================
   서킷 화면 렌더링
========================= */

function renderCircuit() {
  const teamSelect = document.getElementById(
    "circuitTeamSelect"
  );

  const orderSelect = document.getElementById(
    "circuitExerciseOrder"
  );

  const roundInput = document.getElementById(
    "circuitRoundInput"
  );

  if (teamSelect) {
    teamSelect.value =
      state.circuit.teamId || "";
  }

  if (orderSelect) {
    orderSelect.value =
      state.circuit.exerciseOrder || "normal";
  }

  if (roundInput) {
    roundInput.value =
      state.circuit.rounds ||
      state.roundCount;
  }

  fillParticipantSelect(
    "circuitParticipantSelect",
    state.circuit.teamId
  );

  renderCircuitCurrentExercise();
  renderCircuitTimer();
  renderCircuitQueue();
  renderCircuitTeamScore();
  renderCalculatedCircuitScore();
}

function renderCircuitCurrentExercise() {
  const exercise =
    getCurrentCircuitExercise();

  const roundDisplay =
    document.getElementById(
      "currentRoundDisplay"
    );

  const exerciseNumber =
    document.getElementById(
      "currentExerciseNumber"
    );

  const phaseDisplay =
    document.getElementById(
      "circuitPhaseDisplay"
    );

  const categoryDisplay =
    document.getElementById(
      "currentExerciseCategory"
    );

  const nameDisplay =
    document.getElementById(
      "currentExerciseName"
    );

  const targetDisplay =
    document.getElementById(
      "currentExerciseTarget"
    );

  if (!state.circuit.prepared || !exercise) {
    if (roundDisplay) {
      roundDisplay.textContent =
        `0 / ${state.circuit.rounds || state.roundCount}`;
    }

    if (exerciseNumber) {
      exerciseNumber.textContent = "0 / 0";
    }

    if (phaseDisplay) {
      phaseDisplay.textContent = "준비";
    }

    if (categoryDisplay) {
      categoryDisplay.textContent =
        "운동 대기";
    }

    if (nameDisplay) {
      nameDisplay.textContent =
        "서킷을 준비해주세용";
    }

    if (targetDisplay) {
      targetDisplay.textContent =
        "목표 횟수와 설명이 여기에 표시돼용.";
    }

    return;
  }

  if (roundDisplay) {
    roundDisplay.textContent =
      `${state.circuit.currentRound} / ${state.circuit.rounds}`;
  }

  if (exerciseNumber) {
    exerciseNumber.textContent =
      `${getCircuitExercisePosition()} / ${getCircuitTotalExercises()}`;
  }

  if (phaseDisplay) {
    phaseDisplay.textContent =
      state.circuit.phase === "work"
        ? "운동"
        : state.circuit.phase === "rest"
        ? "휴식"
        : state.circuit.phase === "complete"
        ? "완료"
        : "준비";
  }

  if (categoryDisplay) {
    categoryDisplay.textContent =
      state.circuit.phase === "rest"
        ? "휴식 시간"
        : exercise.category;
  }

  if (nameDisplay) {
    nameDisplay.textContent =
      state.circuit.phase === "rest"
        ? "호흡을 정리해용"
        : exercise.name;
  }

  if (targetDisplay) {
    targetDisplay.textContent =
      state.circuit.phase === "rest"
        ? `다음 운동까지 ${state.restSeconds}초 휴식해용.`
        : `목표 ${exercise.target}회 · 기본 ${exercise.points}점`;
  }
}

function renderCircuitTimer() {
  const timer = document.getElementById(
    "circuitTimer"
  );

  const timerBar = document.getElementById(
    "circuitTimerBar"
  );

  if (!timer || !timerBar) {
    return;
  }

  timer.textContent = formatTime(
    state.circuit.timeRemaining
  );

  const totalTime = Math.max(
    1,
    state.circuit.totalPhaseTime
  );

  const percentage = Math.max(
    0,
    Math.min(
      100,
      (state.circuit.timeRemaining /
        totalTime) *
        100
    )
  );

  timerBar.style.width = `${percentage}%`;

  if (state.circuit.phase === "rest") {
    timer.style.color = "var(--yellow)";
  } else if (
    state.circuit.phase === "complete"
  ) {
    timer.style.color = "var(--blue)";
  } else {
    timer.style.color = "var(--green)";
  }

  const startButton = document.getElementById(
    "startCircuitTimerBtn"
  );

  const pauseButton =
    document.getElementById(
      "pauseCircuitTimerBtn"
    );

  if (startButton) {
    startButton.disabled =
      !state.circuit.prepared ||
      state.circuit.running ||
      state.circuit.phase === "complete";
  }

  if (pauseButton) {
    pauseButton.disabled =
      !state.circuit.running;
  }
}

function renderCircuitQueue() {
  const container = document.getElementById(
    "circuitExerciseQueue"
  );

  if (!container) {
    return;
  }

  if (
    !state.circuit.prepared ||
    state.circuit.queue.length === 0
  ) {
    container.innerHTML = `
      <div class="empty-message">
        서킷을 준비하면 운동 순서가 표시돼용.
      </div>
    `;

    return;
  }

  container.innerHTML =
    state.circuit.queue
      .map((exerciseId, index) => {
        const exercise =
          getExercise(exerciseId);

        if (!exercise) {
          return "";
        }

        const isActive =
          index ===
          state.circuit.currentExerciseIndex;

        const isComplete =
          index <
          state.circuit.currentExerciseIndex;

        return `
          <div
            class="exercise-queue-row
              ${isActive ? "active" : ""}
              ${isComplete ? "complete" : ""}"
          >
            <b>${index + 1}</b>

            <div>
              <strong>
                ${escapeHtml(exercise.name)}
              </strong>

              <span>
                ${escapeHtml(exercise.category)}
                · ${exercise.target}회
              </span>
            </div>
          </div>
        `;
      })
      .join("");
}

function renderCircuitTeamScore() {
  const display = document.getElementById(
    "circuitTeamScoreDisplay"
  );

  if (!display) {
    return;
  }

  const team = getTeam(
    state.circuit.teamId
  );

  display.textContent =
    `${calculateTeamScore(team)}점`;
}

/* =========================
   간단한 효과음
========================= */

function playStartTone() {
  playTone(640, 0.14);
}

function playFinishTone() {
  playTone(880, 0.22);
}

function playTone(frequency, duration) {
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
      audioContext.currentTime + duration
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();

    oscillator.stop(
      audioContext.currentTime + duration
    );
  } catch (error) {
    console.error("효과음 재생 실패:", error);
  }
}

/* =========================
   축하 화면
========================= */

function showCelebration(title, text) {
  const overlay = document.getElementById(
    "celebrationOverlay"
  );

  const titleElement =
    document.getElementById(
      "celebrationTitle"
    );

  const textElement =
    document.getElementById(
      "celebrationText"
    );

  if (titleElement) {
    titleElement.textContent = title;
  }

  if (textElement) {
    textElement.textContent = text;
  }

  overlay?.classList.add("show");
}

function bindCelebrationOverlay() {
  document
    .getElementById("closeCelebrationBtn")
    ?.addEventListener("click", () => {
      document
        .getElementById(
          "celebrationOverlay"
        )
        ?.classList.remove("show");
    });
}

/* =========================
   2부 렌더링
========================= */

function renderPartTwo() {
  renderCircuit();
}

/* =========================
   2부 초기 실행
========================= */

function initializeAppPartTwo() {
  bindCircuitControls();
  bindCelebrationOverlay();

  renderPartTwo();
}

initializeAppPartTwo();
/* =========================
   랜덤 게임
========================= */

function bindRandomControls() {
  document
    .querySelectorAll(".random-mode-btn")
    .forEach(button => {
      button.addEventListener("click", () => {
        state.random.mode =
          button.dataset.randomMode || "dice";

        saveState();
        renderRandom();
      });
    });

  document
    .getElementById("randomTeamSelect")
    ?.addEventListener("change", event => {
      state.random.teamId =
        event.target.value;

      fillParticipantSelect(
        "randomParticipantSelect",
        state.random.teamId
      );

      saveState();
      renderRandom();
    });

  document
    .getElementById("drawRandomExerciseBtn")
    ?.addEventListener(
      "click",
      drawRandomExercise
    );

  document
    .getElementById("saveRandomScoreBtn")
    ?.addEventListener(
      "click",
      saveRandomScore
    );

  document
    .getElementById("clearRandomHistoryBtn")
    ?.addEventListener(
      "click",
      clearRandomHistory
    );
}

function drawRandomExercise() {
  const team = getTeam(
    document.getElementById(
      "randomTeamSelect"
    )?.value || state.random.teamId
  );

  if (!team) {
    alert("랜덤 게임을 진행할 팀을 선택해주세용.");
    return;
  }

  if (team.participants.length === 0) {
    alert("선택한 팀에 참가자가 없어용.");
    return;
  }

  if (state.exercises.length === 0) {
    alert("등록된 운동이 없어용.");
    return;
  }

  state.random.teamId = team.id;

  const display = document.getElementById(
    "randomObjectDisplay"
  );

  display?.classList.add("rolling");

  const rollingDuration =
    state.random.mode === "dice" ? 900 : 1100;

  setTimeout(() => {
    display?.classList.remove("rolling");

    let selectedExercise = null;

    if (state.random.mode === "dice") {
      selectedExercise =
        drawExerciseByDice(display);
    } else {
      selectedExercise =
        drawExerciseByCard(display);
    }

    if (!selectedExercise) {
      return;
    }

    state.random.selectedExerciseId =
      selectedExercise.id;

    fillParticipantSelect(
      "randomParticipantSelect",
      state.random.teamId
    );

    saveState();
    renderRandom();

    showToast(
      `${selectedExercise.name} 운동이 선택됐어용.`
    );
  }, rollingDuration);
}

function drawExerciseByDice(display) {
  const diceNumber =
    Math.floor(Math.random() * 6) + 1;

  if (display) {
    display.textContent = getDiceEmoji(
      diceNumber
    );
  }

  const exerciseIndex =
    (diceNumber - 1) %
    state.exercises.length;

  return state.exercises[exerciseIndex];
}

function drawExerciseByCard(display) {
  const cardSymbols = [
    "🂡",
    "🂱",
    "🃁",
    "🃑"
  ];

  if (display) {
    display.textContent =
      cardSymbols[
        Math.floor(
          Math.random() *
            cardSymbols.length
        )
      ];
  }

  return state.exercises[
    Math.floor(
      Math.random() *
        state.exercises.length
    )
  ];
}

function getDiceEmoji(number) {
  const dice = {
    1: "⚀",
    2: "⚁",
    3: "⚂",
    4: "⚃",
    5: "⚄",
    6: "⚅"
  };

  return dice[number] || "🎲";
}

function getRandomScoreInputValues() {
  return {
    successfulReps: Math.max(
      0,
      Number(
        document.getElementById(
          "randomSuccessfulRepsInput"
        )?.value
      ) || 0
    ),

    invalidReps: Math.max(
      0,
      Number(
        document.getElementById(
          "randomInvalidRepsInput"
        )?.value
      ) || 0
    ),

    bonusScore: Math.max(
      0,
      Number(
        document.getElementById(
          "randomBonusInput"
        )?.value
      ) || 0
    )
  };
}

function saveRandomScore() {
  const team = getTeam(
    state.random.teamId
  );

  const participantId =
    document.getElementById(
      "randomParticipantSelect"
    )?.value || "";

  const participant =
    getParticipant(participantId);

  const exercise = getExercise(
    state.random.selectedExerciseId
  );

  if (!team) {
    alert("진행 팀을 선택해주세용.");
    return;
  }

  if (!participant) {
    alert("참가자를 선택해주세용.");
    return;
  }

  if (!exercise) {
    alert("먼저 랜덤 운동을 뽑아주세용.");
    return;
  }

  const values =
    getRandomScoreInputValues();

  if (
    values.invalidReps >
    values.successfulReps
  ) {
    alert(
      "자세 불량 제외 횟수는 성공 횟수보다 많을 수 없어용."
    );

    return;
  }

  const earnedScore =
    calculateExerciseScore({
      exercise,
      ...values
    });

  addWorkoutRecord({
    mode: "random",

    teamId: team.id,
    participantId,
    exerciseId: exercise.id,

    successfulReps:
      values.successfulReps,

    invalidReps:
      values.invalidReps,

    bonusScore:
      values.bonusScore,

    earnedScore,

    extra: {
      randomMode: state.random.mode
    }
  });

  state.randomHistory.unshift({
    id: createId("random-history"),
    createdAt: Date.now(),

    teamId: team.id,
    teamName: team.name,

    participantId: participant.id,
    participantName: participant.name,

    exerciseId: exercise.id,
    exerciseName: exercise.name,

    earnedScore,
    randomMode: state.random.mode
  });

  if (
    state.randomHistory.length > 50
  ) {
    state.randomHistory.length = 50;
  }

  resetRandomInputs();

  saveState();
  renderAll();

  showToast(
    `${participant.name}에게 ${earnedScore}점을 저장했어용.`
  );
}

function resetRandomInputs() {
  [
    "randomSuccessfulRepsInput",
    "randomInvalidRepsInput",
    "randomBonusInput"
  ].forEach(inputId => {
    const input =
      document.getElementById(inputId);

    if (input) {
      input.value = "0";
    }
  });
}

function clearRandomHistory() {
  if (
    state.randomHistory.length === 0
  ) {
    return;
  }

  const confirmed = confirm(
    "최근 랜덤 기록을 지울까용?"
  );

  if (!confirmed) {
    return;
  }

  state.randomHistory = [];

  saveState();
  renderRandomHistory();
}

function renderRandom() {
  document
    .querySelectorAll(".random-mode-btn")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.randomMode ===
          state.random.mode
      );
    });

  const teamSelect = document.getElementById(
    "randomTeamSelect"
  );

  if (teamSelect) {
    teamSelect.value =
      state.random.teamId || "";
  }

  fillParticipantSelect(
    "randomParticipantSelect",
    state.random.teamId
  );

  const exercise = getExercise(
    state.random.selectedExerciseId
  );

  const objectDisplay =
    document.getElementById(
      "randomObjectDisplay"
    );

  const categoryDisplay =
    document.getElementById(
      "randomExerciseCategory"
    );

  const nameDisplay =
    document.getElementById(
      "randomExerciseName"
    );

  const targetDisplay =
    document.getElementById(
      "randomExerciseTarget"
    );

  const pointsDisplay =
    document.getElementById(
      "randomExercisePoints"
    );

  if (!exercise) {
    if (objectDisplay) {
      objectDisplay.textContent =
        state.random.mode === "dice"
          ? "🎲"
          : "🃏";
    }

    if (categoryDisplay) {
      categoryDisplay.textContent =
        "랜덤 대기";
    }

    if (nameDisplay) {
      nameDisplay.textContent =
        "버튼을 눌러 운동을 뽑아용";
    }

    if (targetDisplay) {
      targetDisplay.textContent =
        "운동 이름과 목표 횟수가 표시돼용.";
    }

    if (pointsDisplay) {
      pointsDisplay.textContent = "0점";
    }
  } else {
    if (categoryDisplay) {
      categoryDisplay.textContent =
        exercise.category;
    }

    if (nameDisplay) {
      nameDisplay.textContent =
        exercise.name;
    }

    if (targetDisplay) {
      targetDisplay.textContent =
        `목표 ${exercise.target}회`;
    }

    if (pointsDisplay) {
      pointsDisplay.textContent =
        `${exercise.points}점`;
    }
  }

  renderRandomHistory();
}

function renderRandomHistory() {
  const container = document.getElementById(
    "randomHistoryList"
  );

  if (!container) {
    return;
  }

  if (
    state.randomHistory.length === 0
  ) {
    container.innerHTML = `
      <div class="empty-message">
        아직 랜덤 운동 기록이 없어용.
      </div>
    `;

    return;
  }

  container.innerHTML =
    state.randomHistory
      .slice(0, 30)
      .map(item => {
        return `
          <div class="random-history-row">
            <time>
              ${new Date(
                item.createdAt
              ).toLocaleTimeString(
                "ko-KR",
                {
                  hour: "2-digit",
                  minute: "2-digit"
                }
              )}
            </time>

            <div>
              <strong>
                ${escapeHtml(
                  item.participantName
                )}
                ·
                ${escapeHtml(
                  item.exerciseName
                )}
              </strong>

              <span>
                ${escapeHtml(item.teamName)}
                ·
                ${
                  item.randomMode === "dice"
                    ? "주사위"
                    : "운동 카드"
                }
              </span>
            </div>

            <b>
              +${item.earnedScore}
            </b>
          </div>
        `;
      })
      .join("");
}

/* =========================
   운동 빙고
========================= */

function bindBingoControls() {
  document
    .getElementById("bingoTeamSelect")
    ?.addEventListener("change", event => {
      state.bingo.teamId =
        event.target.value;

      saveState();
      renderBingo();
    });

  document
    .getElementById("bingoSizeSelect")
    ?.addEventListener("change", event => {
      state.bingo.size = Math.max(
        3,
        Math.min(
          5,
          Number(event.target.value) ||
            3
        )
      );

      saveState();
      renderBingo();
    });

  document
    .getElementById("bingoBonusInput")
    ?.addEventListener("input", event => {
      state.bingo.bonusPerLine =
        Math.max(
          0,
          Number(event.target.value) ||
            0
        );

      saveState();
    });

  document
    .getElementById("createBingoBoardBtn")
    ?.addEventListener(
      "click",
      createBingoBoard
    );

  document
    .getElementById("resetBingoBoardBtn")
    ?.addEventListener(
      "click",
      resetBingoBoard
    );

  document
    .getElementById("bingoBoard")
    ?.addEventListener(
      "click",
      handleBingoBoardClick
    );
}

function createBingoBoard() {
  const teamId =
    document.getElementById(
      "bingoTeamSelect"
    )?.value || "";

  const team = getTeam(teamId);

  const size = Math.max(
    3,
    Math.min(
      5,
      Number(
        document.getElementById(
          "bingoSizeSelect"
        )?.value
      ) || 3
    )
  );

  const bonusPerLine = Math.max(
    0,
    Number(
      document.getElementById(
        "bingoBonusInput"
      )?.value
    ) || 0
  );

  if (!team) {
    alert("빙고를 진행할 팀을 선택해주세용.");
    return;
  }

  if (state.exercises.length === 0) {
    alert("등록된 운동이 없어용.");
    return;
  }

  const cellCount = size * size;
  const shuffledExercises =
    shuffleArray(state.exercises);

  const cells = [];

  for (
    let index = 0;
    index < cellCount;
    index += 1
  ) {
    const exercise =
      shuffledExercises[
        index % shuffledExercises.length
      ];

    cells.push({
      id: createId("bingo-cell"),
      exerciseId: exercise.id,
      completed: false
    });
  }

  state.bingo = {
    teamId,
    size,
    cells,

    completedLines: 0,
    rewardedLines: 0,

    bonusPerLine
  };

  saveState();
  renderBingo();

  showToast(
    `${team.name} 팀 빙고판을 만들었어용.`
  );
}

function resetBingoBoard() {
  if (
    state.bingo.cells.length === 0
  ) {
    return;
  }

  const confirmed = confirm(
    "현재 빙고판을 초기화할까용?"
  );

  if (!confirmed) {
    return;
  }

  state.bingo.cells =
    state.bingo.cells.map(cell => ({
      ...cell,
      completed: false
    }));

  state.bingo.completedLines = 0;
  state.bingo.rewardedLines = 0;

  saveState();
  renderBingo();
}

function handleBingoBoardClick(event) {
  const cellButton =
    event.target.closest(
      "[data-bingo-cell]"
    );

  if (!cellButton) {
    return;
  }

  const cell = state.bingo.cells.find(
    item =>
      item.id ===
      cellButton.dataset.bingoCell
  );

  if (!cell) {
    return;
  }

  const team = getTeam(
    state.bingo.teamId
  );

  const exercise = getExercise(
    cell.exerciseId
  );

  if (!team || !exercise) {
    return;
  }

  cell.completed = !cell.completed;

  const previousLines =
    state.bingo.completedLines;

  const completedLines =
    countCompletedBingoLines();

  state.bingo.completedLines =
    completedLines;

  if (
    completedLines >
    state.bingo.rewardedLines
  ) {
    const newLines =
      completedLines -
      state.bingo.rewardedLines;

    const reward =
      newLines *
      state.bingo.bonusPerLine;

    team.score += reward;

    state.bingo.rewardedLines =
      completedLines;

    addBingoRecord({
      team,
      exercise,
      earnedScore: reward,
      completedLines
    });

    showCelebration(
      `${completedLines}줄 빙고!`,
      `${team.name} 팀이 ${reward}점 보너스를 획득했어용.`
    );
  }

  if (
    completedLines < previousLines
  ) {
    state.bingo.rewardedLines =
      Math.min(
        state.bingo.rewardedLines,
        completedLines
      );
  }

  saveState();
  renderAll();
}

function addBingoRecord({
  team,
  exercise,
  earnedScore,
  completedLines
}) {
  state.records.unshift({
    id: createId("record"),
    createdAt: Date.now(),

    time: getCurrentTimeText(),
    mode: "bingo",

    teamId: team.id,
    teamName: team.name,

    participantId: "",
    participantName: "팀 전체",

    exerciseId: exercise.id,
    exerciseName:
      `${exercise.name} 빙고`,

    exerciseCategory:
      exercise.category,

    successfulReps: 1,
    invalidReps: 0,
    validReps: 1,

    bonusScore: earnedScore,
    earnedScore,

    completedLines
  });

  if (state.records.length > 500) {
    state.records.length = 500;
  }
}

function countCompletedBingoLines() {
  const size = state.bingo.size;
  const cells = state.bingo.cells;

  if (
    cells.length !== size * size
  ) {
    return 0;
  }

  let completedLines = 0;

  for (
    let row = 0;
    row < size;
    row += 1
  ) {
    let rowComplete = true;

    for (
      let column = 0;
      column < size;
      column += 1
    ) {
      const index =
        row * size + column;

      if (!cells[index]?.completed) {
        rowComplete = false;
        break;
      }
    }

    if (rowComplete) {
      completedLines += 1;
    }
  }

  for (
    let column = 0;
    column < size;
    column += 1
  ) {
    let columnComplete = true;

    for (
      let row = 0;
      row < size;
      row += 1
    ) {
      const index =
        row * size + column;

      if (!cells[index]?.completed) {
        columnComplete = false;
        break;
      }
    }

    if (columnComplete) {
      completedLines += 1;
    }
  }

  let diagonalOne = true;
  let diagonalTwo = true;

  for (
    let index = 0;
    index < size;
    index += 1
  ) {
    const firstIndex =
      index * size + index;

    const secondIndex =
      index * size +
      (size - 1 - index);

    if (!cells[firstIndex]?.completed) {
      diagonalOne = false;
    }

    if (!cells[secondIndex]?.completed) {
      diagonalTwo = false;
    }
  }

  if (diagonalOne) {
    completedLines += 1;
  }

  if (diagonalTwo) {
    completedLines += 1;
  }

  return completedLines;
}

function renderBingo() {
  const teamSelect = document.getElementById(
    "bingoTeamSelect"
  );

  const sizeSelect = document.getElementById(
    "bingoSizeSelect"
  );

  const bonusInput =
    document.getElementById(
      "bingoBonusInput"
    );

  if (teamSelect) {
    teamSelect.value =
      state.bingo.teamId || "";
  }

  if (sizeSelect) {
    sizeSelect.value =
      String(state.bingo.size || 3);
  }

  if (bonusInput) {
    bonusInput.value =
      state.bingo.bonusPerLine;
  }

  const team = getTeam(
    state.bingo.teamId
  );

  document.getElementById(
    "bingoTeamTitle"
  ).textContent =
    team?.name || "팀을 선택해주세용";

  document.getElementById(
    "bingoTeamScore"
  ).textContent =
    `${calculateTeamScore(team)}점`;

  document.getElementById(
    "completedBingoCount"
  ).textContent =
    `${state.bingo.completedLines}줄`;

  renderBingoBoard();
}

function renderBingoBoard() {
  const container = document.getElementById(
    "bingoBoard"
  );

  if (!container) {
    return;
  }

  const size = state.bingo.size || 3;

  container.className =
    `bingo-board size-${size}`;

  if (
    state.bingo.cells.length === 0
  ) {
    container.innerHTML = `
      <div class="empty-message">
        새 빙고판을 만들어주세용.
      </div>
    `;

    return;
  }

  container.innerHTML =
    state.bingo.cells
      .map(cell => {
        const exercise = getExercise(
          cell.exerciseId
        );

        if (!exercise) {
          return "";
        }

        return `
          <button
            type="button"
            class="bingo-cell
              ${
                cell.completed
                  ? "completed"
                  : ""
              }"
            data-bingo-cell="${cell.id}"
          >
            <div>
              <strong>
                ${escapeHtml(
                  exercise.name
                )}
              </strong>

              <span>
                ${escapeHtml(
                  exercise.category
                )}
                · ${exercise.target}회
              </span>

              <b>
                ${exercise.points}점
              </b>
            </div>
          </button>
        `;
      })
      .join("");
}

/* =========================
   3부 렌더링
========================= */

function renderPartThree() {
  renderRandom();
  renderBingo();
}

/* =========================
   3부 초기 실행
========================= */

function initializeAppPartThree() {
  bindRandomControls();
  bindBingoControls();

  renderPartThree();
}

initializeAppPartThree();
/* =========================
   협동 미션 이벤트
========================= */

function bindMissionControls() {
  document
    .getElementById("missionTeamSelect")
    ?.addEventListener("change", event => {
      state.mission.teamId =
        event.target.value;

      fillParticipantSelect(
        "missionParticipantSelect",
        state.mission.teamId
      );

      saveState();
      renderMission();
    });

  document
    .getElementById("missionExerciseSelect")
    ?.addEventListener("change", event => {
      state.mission.exerciseId =
        event.target.value;

      saveState();
      renderMission();
    });

  document
    .getElementById("startMissionBtn")
    ?.addEventListener(
      "click",
      startTeamMission
    );

  document
    .getElementById("addMissionRepsBtn")
    ?.addEventListener(
      "click",
      addMissionReps
    );

  document
    .getElementById("resetMissionBtn")
    ?.addEventListener(
      "click",
      resetTeamMission
    );
}

/* =========================
   협동 미션 시작
========================= */

function startTeamMission() {
  const teamId =
    document.getElementById(
      "missionTeamSelect"
    )?.value || "";

  const exerciseId =
    document.getElementById(
      "missionExerciseSelect"
    )?.value || "";

  const target = Math.max(
    1,
    Number(
      document.getElementById(
        "missionTargetInput"
      )?.value
    ) || 100
  );

  const bonus = Math.max(
    0,
    Number(
      document.getElementById(
        "missionBonusInput"
      )?.value
    ) || 0
  );

  const team = getTeam(teamId);
  const exercise = getExercise(exerciseId);

  if (!team) {
    alert("협동 미션을 진행할 팀을 선택해주세용.");
    return;
  }

  if (team.participants.length === 0) {
    alert("선택한 팀에 참가자가 없어용.");
    return;
  }

  if (!exercise) {
    alert("협동 미션 운동을 선택해주세용.");
    return;
  }

  const contributions = {};

  team.participants.forEach(participant => {
    contributions[participant.id] = 0;
  });

  state.mission = {
    active: true,
    completed: false,

    teamId,
    exerciseId,

    target,
    current: 0,
    bonus,

    memberContributions: contributions
  };

  state.status = "active";

  fillParticipantSelect(
    "missionParticipantSelect",
    teamId
  );

  const repsInput = document.getElementById(
    "missionRepsInput"
  );

  if (repsInput) {
    repsInput.value = "10";
  }

  saveState();
  renderMission();

  showToast(
    `${team.name} 팀 협동 미션을 시작했어용.`
  );
}

/* =========================
   협동 미션 횟수 추가
========================= */

function addMissionReps() {
  if (!state.mission.active) {
    alert("먼저 협동 미션을 시작해주세용.");
    return;
  }

  if (state.mission.completed) {
    alert("이미 완료된 협동 미션이에용.");
    return;
  }

  const participantId =
    document.getElementById(
      "missionParticipantSelect"
    )?.value || "";

  const participant =
    getParticipant(participantId);

  const team = getTeam(
    state.mission.teamId
  );

  const exercise = getExercise(
    state.mission.exerciseId
  );

  const addedReps = Math.max(
    1,
    Number(
      document.getElementById(
        "missionRepsInput"
      )?.value
    ) || 1
  );

  if (!participant) {
    alert("횟수를 추가할 참가자를 선택해주세용.");
    return;
  }

  if (!team || !exercise) {
    alert("미션 정보를 찾지 못했어용.");
    return;
  }

  if (
    !team.participants.some(
      member => member.id === participant.id
    )
  ) {
    alert("선택한 팀의 참가자가 아니에용.");
    return;
  }

  const remaining = Math.max(
    0,
    state.mission.target -
      state.mission.current
  );

  const acceptedReps = Math.min(
    addedReps,
    remaining
  );

  state.mission.current +=
    acceptedReps;

  state.mission.memberContributions[
    participant.id
  ] =
    (state.mission.memberContributions[
      participant.id
    ] || 0) + acceptedReps;

  participant.totalReps += acceptedReps;
  participant.validReps += acceptedReps;

  saveMissionProgressRecord({
    team,
    participant,
    exercise,
    addedReps: acceptedReps
  });

  if (
    state.mission.current >=
    state.mission.target
  ) {
    completeTeamMission();
  }

  saveState();
  renderAll();

  if (!state.mission.completed) {
    showToast(
      `${participant.name}의 ${acceptedReps}회를 추가했어용.`
    );
  }
}

function saveMissionProgressRecord({
  team,
  participant,
  exercise,
  addedReps
}) {
  state.records.unshift({
    id: createId("record"),
    createdAt: Date.now(),

    time: getCurrentTimeText(),
    mode: "mission",

    teamId: team.id,
    teamName: team.name,

    participantId: participant.id,
    participantName: participant.name,

    exerciseId: exercise.id,
    exerciseName: exercise.name,
    exerciseCategory: exercise.category,

    successfulReps: addedReps,
    invalidReps: 0,
    validReps: addedReps,

    bonusScore: 0,
    earnedScore: 0,

    missionProgress:
      state.mission.current,

    missionTarget:
      state.mission.target
  });

  if (state.records.length > 500) {
    state.records.length = 500;
  }
}

/* =========================
   협동 미션 완료
========================= */

function completeTeamMission() {
  const team = getTeam(
    state.mission.teamId
  );

  const exercise = getExercise(
    state.mission.exerciseId
  );

  if (!team || !exercise) {
    return;
  }

  state.mission.current =
    state.mission.target;

  state.mission.completed = true;
  state.mission.active = false;

  team.score += state.mission.bonus;

  const topContributor =
    getMissionTopContributor();

  if (topContributor) {
    topContributor.score +=
      state.mission.bonus;

    topContributor.bonusScore +=
      state.mission.bonus;

    topContributor.recordCount += 1;
  }

  state.records.unshift({
    id: createId("record"),
    createdAt: Date.now(),

    time: getCurrentTimeText(),
    mode: "mission",

    teamId: team.id,
    teamName: team.name,

    participantId:
      topContributor?.id || "",

    participantName:
      topContributor?.name ||
      "팀 전체",

    exerciseId: exercise.id,

    exerciseName:
      `${exercise.name} 협동 미션 완료`,

    exerciseCategory:
      exercise.category,

    successfulReps:
      state.mission.target,

    invalidReps: 0,

    validReps:
      state.mission.target,

    bonusScore:
      state.mission.bonus,

    earnedScore:
      state.mission.bonus,

    missionCompleted: true
  });

  state.status = "complete";

  showCelebration(
    "협동 미션 완료!",
    `${team.name} 팀이 ${state.mission.target}회를 달성하고 ${state.mission.bonus}점을 획득했어용.`
  );
}

function getMissionTopContributor() {
  const team = getTeam(
    state.mission.teamId
  );

  if (!team) {
    return null;
  }

  return [...team.participants].sort(
    (a, b) => {
      const contributionA =
        state.mission.memberContributions[
          a.id
        ] || 0;

      const contributionB =
        state.mission.memberContributions[
          b.id
        ] || 0;

      return (
        contributionB -
        contributionA
      );
    }
  )[0] || null;
}

/* =========================
   협동 미션 초기화
========================= */

function resetTeamMission() {
  if (
    !state.mission.active &&
    state.mission.current === 0
  ) {
    return;
  }

  const confirmed = confirm(
    "현재 협동 미션 진행 상황을 초기화할까용?"
  );

  if (!confirmed) {
    return;
  }

  const previousTeamId =
    state.mission.teamId;

  const previousExerciseId =
    state.mission.exerciseId;

  state.mission = {
    ...deepClone(defaultState.mission),

    teamId: previousTeamId,
    exerciseId: previousExerciseId
  };

  saveState();
  renderMission();

  showToast("협동 미션을 초기화했어용.");
}

/* =========================
   협동 미션 렌더링
========================= */

function renderMission() {
  const teamSelect = document.getElementById(
    "missionTeamSelect"
  );

  const exerciseSelect =
    document.getElementById(
      "missionExerciseSelect"
    );

  const targetInput = document.getElementById(
    "missionTargetInput"
  );

  const bonusInput = document.getElementById(
    "missionBonusInput"
  );

  if (teamSelect) {
    teamSelect.value =
      state.mission.teamId || "";
  }

  if (exerciseSelect) {
    exerciseSelect.value =
      state.mission.exerciseId || "";
  }

  if (targetInput) {
    targetInput.value =
      state.mission.target || 100;
  }

  if (bonusInput) {
    bonusInput.value =
      state.mission.bonus || 0;
  }

  fillParticipantSelect(
    "missionParticipantSelect",
    state.mission.teamId
  );

  const team = getTeam(
    state.mission.teamId
  );

  const exercise = getExercise(
    state.mission.exerciseId
  );

  const categoryDisplay =
    document.getElementById(
      "missionCategoryDisplay"
    );

  const exerciseDisplay =
    document.getElementById(
      "missionExerciseDisplay"
    );

  const teamDisplay =
    document.getElementById(
      "missionTeamDisplay"
    );

  const currentDisplay =
    document.getElementById(
      "missionCurrentReps"
    );

  const targetDisplay =
    document.getElementById(
      "missionTargetDisplay"
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
      (state.mission.current /
        Math.max(
          1,
          state.mission.target
        )) *
        100
    )
  );

  if (categoryDisplay) {
    categoryDisplay.textContent =
      exercise?.category ||
      "미션 대기";
  }

  if (exerciseDisplay) {
    exerciseDisplay.textContent =
      exercise
        ? exercise.name
        : "협동 미션을 시작해주세용";
  }

  if (teamDisplay) {
    teamDisplay.textContent =
      team?.name || "-";
  }

  if (currentDisplay) {
    currentDisplay.textContent =
      state.mission.current;
  }

  if (targetDisplay) {
    targetDisplay.textContent =
      state.mission.target;
  }

  if (progressBar) {
    progressBar.style.width =
      `${percentage}%`;
  }

  if (progressText) {
    progressText.textContent =
      state.mission.completed
        ? "100% 완료!"
        : `${percentage}% 완료`;
  }

  renderMissionMembers();
}

function renderMissionMembers() {
  const container = document.getElementById(
    "missionMemberList"
  );

  if (!container) {
    return;
  }

  const team = getTeam(
    state.mission.teamId
  );

  if (!team || team.participants.length === 0) {
    container.innerHTML = `
      <div class="empty-message">
        미션을 시작하면 기여도가 표시돼용.
      </div>
    `;

    return;
  }

  const highestContribution = Math.max(
    1,
    ...team.participants.map(
      participant =>
        state.mission.memberContributions[
          participant.id
        ] || 0
    )
  );

  container.innerHTML =
    team.participants
      .map(participant => {
        const contribution =
          state.mission.memberContributions[
            participant.id
          ] || 0;

        const percentage = Math.round(
          (contribution /
            highestContribution) *
            100
        );

        return `
          <div class="mission-member-row">
            <strong>
              ${escapeHtml(
                participant.name
              )}
            </strong>

            <div class="member-progress">
              <div
                style="width: ${percentage}%"
              ></div>
            </div>

            <b>${contribution}회</b>
          </div>
        `;
      })
      .join("");
}

/* =========================
   팀 순위
========================= */

function getSortedTeams() {
  return [...state.teams].sort(
    (a, b) => {
      if (
        calculateTeamScore(b) !==
        calculateTeamScore(a)
      ) {
        return (
          calculateTeamScore(b) -
          calculateTeamScore(a)
        );
      }

      const teamAReps =
        a.participants.reduce(
          (sum, participant) =>
            sum +
            participant.validReps,
          0
        );

      const teamBReps =
        b.participants.reduce(
          (sum, participant) =>
            sum +
            participant.validReps,
          0
        );

      return teamBReps - teamAReps;
    }
  );
}

function renderTeamRanking() {
  const container = document.getElementById(
    "teamRankingList"
  );

  if (!container) {
    return;
  }

  const teams = getSortedTeams();

  if (teams.length === 0) {
    container.innerHTML = `
      <div class="empty-message">
        등록된 팀이 없습니다.
      </div>
    `;

    return;
  }

  container.innerHTML = teams
    .map((team, index) => {
      const validReps =
        team.participants.reduce(
          (sum, participant) =>
            sum +
            participant.validReps,
          0
        );

      const records =
        team.participants.reduce(
          (sum, participant) =>
            sum +
            participant.recordCount,
          0
        );

      return `
        <div class="big-ranking-row">
          <div class="rank">
            ${index + 1}
          </div>

          <div>
            <strong>
              ${escapeHtml(team.name)}
            </strong>

            <span>
              참가자 ${team.participants.length}명
              · 유효 횟수 ${validReps}회
              · 기록 ${records}개
            </span>
          </div>

          <b>
            ${calculateTeamScore(team)}점
          </b>
        </div>
      `;
    })
    .join("");
}

/* =========================
   개인 순위
========================= */

function getSortedParticipants() {
  return getAllParticipants().sort(
    (a, b) => {
      if (
        calculateParticipantScore(b) !==
        calculateParticipantScore(a)
      ) {
        return (
          calculateParticipantScore(b) -
          calculateParticipantScore(a)
        );
      }

      if (
        b.validReps !== a.validReps
      ) {
        return (
          b.validReps -
          a.validReps
        );
      }

      return (
        a.invalidReps -
        b.invalidReps
      );
    }
  );
}

function renderParticipantRanking() {
  const container = document.getElementById(
    "participantRankingList"
  );

  if (!container) {
    return;
  }

  const participants =
    getSortedParticipants();

  if (participants.length === 0) {
    container.innerHTML = `
      <div class="empty-message">
        참가자 기록이 없습니다.
      </div>
    `;

    return;
  }

  container.innerHTML =
    participants
      .map((participant, index) => {
        return `
          <div class="participant-ranking-row">
            <b>${index + 1}</b>

            <div>
              <strong>
                ${escapeHtml(
                  participant.name
                )}
              </strong>

              <span>
                ${escapeHtml(
                  participant.teamName
                )}
                · 유효
                ${participant.validReps}회
                · 제외
                ${participant.invalidReps}회
              </span>
            </div>

            <b>
              ${calculateParticipantScore(
                participant
              )}점
            </b>
          </div>
        `;
      })
      .join("");
}

/* =========================
   수상자 계산
========================= */

function getWinnerTeam() {
  return getSortedTeams()[0] || null;
}

function getMvpParticipant() {
  return getSortedParticipants()[0] || null;
}

function getMostRepsParticipant() {
  const participants =
    getAllParticipants();

  if (participants.length === 0) {
    return null;
  }

  return [...participants].sort(
    (a, b) =>
      b.validReps - a.validReps
  )[0];
}

function calculateFormAccuracy(participant) {
  const total =
    participant.validReps +
    participant.invalidReps;

  if (total === 0) {
    return 0;
  }

  return (
    participant.validReps /
    total
  ) * 100;
}

function getBestFormParticipant() {
  const participants =
    getAllParticipants().filter(
      participant =>
        participant.validReps +
          participant.invalidReps >
        0
    );

  if (participants.length === 0) {
    return null;
  }

  return [...participants].sort(
    (a, b) => {
      const accuracyDifference =
        calculateFormAccuracy(b) -
        calculateFormAccuracy(a);

      if (accuracyDifference !== 0) {
        return accuracyDifference;
      }

      return (
        b.validReps -
        a.validReps
      );
    }
  )[0];
}

/* =========================
   수상자 표시
========================= */

function renderAwards() {
  const winner = getWinnerTeam();
  const mvp = getMvpParticipant();

  const mostReps =
    getMostRepsParticipant();

  const bestForm =
    getBestFormParticipant();

  const winnerDisplay =
    document.getElementById(
      "winnerTeamDisplay"
    );

  const mvpDisplay =
    document.getElementById(
      "mvpParticipantDisplay"
    );

  const repsDisplay =
    document.getElementById(
      "mostRepsDisplay"
    );

  const formDisplay =
    document.getElementById(
      "bestFormDisplay"
    );

  if (winnerDisplay) {
    winnerDisplay.textContent = winner
      ? `${winner.name} · ${winner.score}점`
      : "기록 없음";
  }

  if (mvpDisplay) {
    mvpDisplay.textContent = mvp
      ? `${mvp.name} · ${mvp.score}점`
      : "기록 없음";
  }

  if (repsDisplay) {
    repsDisplay.textContent = mostReps
      ? `${mostReps.name} · ${mostReps.validReps}회`
      : "기록 없음";
  }

  if (formDisplay) {
    formDisplay.textContent = bestForm
      ? `${bestForm.name} · ${calculateFormAccuracy(
          bestForm
        ).toFixed(0)}%`
      : "기록 없음";
  }
}

/* =========================
   점수 초기화
========================= */

function bindRankingControls() {
  document
    .getElementById("resetScoresBtn")
    ?.addEventListener(
      "click",
      resetAllScores
    );
}

function resetAllScores() {
  const confirmed = confirm(
    "모든 팀과 참가자의 점수 및 기록을 초기화할까용?"
  );

  if (!confirmed) {
    return;
  }

  state.teams.forEach(team => {
    team.score = 0;

    team.participants.forEach(
      participant => {
        participant.score = 0;

        participant.totalReps = 0;
        participant.validReps = 0;
        participant.invalidReps = 0;

        participant.bonusScore = 0;
        participant.recordCount = 0;
      }
    );
  });

  state.records = [];
  state.randomHistory = [];

  state.bingo = {
    ...deepClone(defaultState.bingo)
  };

  state.mission = {
    ...deepClone(defaultState.mission)
  };

  state.status = "ready";

  saveState();
  renderAll();

  showToast("모든 점수와 기록을 초기화했어용.");
}

/* =========================
   4부 렌더링
========================= */

function renderRankingPartFour() {
  renderTeamRanking();
  renderParticipantRanking();
  renderAwards();
}

function renderPartFour() {
  renderMission();
  renderRankingPartFour();
}

/* =========================
   4부 초기 실행
========================= */

function initializeAppPartFour() {
  bindMissionControls();
  bindRankingControls();

  renderPartFour();
}

initializeAppPartFour();
/* =========================
   기록 화면 필터
========================= */

function bindRecordControls() {
  document
    .getElementById("recordTeamFilter")
    ?.addEventListener(
      "change",
      renderRecordTable
    );

  document
    .getElementById("recordModeFilter")
    ?.addEventListener(
      "change",
      renderRecordTable
    );

  document
    .getElementById("recordParticipantSelect")
    ?.addEventListener(
      "change",
      renderParticipantDetail
    );

  document
    .getElementById("exportCsvBtn")
    ?.addEventListener(
      "click",
      exportRecordsCsv
    );
}

/* =========================
   기록 필터 옵션
========================= */

function renderRecordFilterOptions() {
  const teamFilter =
    document.getElementById(
      "recordTeamFilter"
    );

  if (!teamFilter) {
    return;
  }

  const previousValue =
    teamFilter.value || "all";

  teamFilter.innerHTML = `
    <option value="all">전체 팀</option>
  `;

  state.teams.forEach(team => {
    const option =
      document.createElement("option");

    option.value = team.id;
    option.textContent = team.name;

    teamFilter.appendChild(option);
  });

  if (
    previousValue === "all" ||
    state.teams.some(
      team => team.id === previousValue
    )
  ) {
    teamFilter.value = previousValue;
  }
}

/* =========================
   기록표 렌더링
========================= */

function getFilteredRecords() {
  const teamFilter =
    document.getElementById(
      "recordTeamFilter"
    )?.value || "all";

  const modeFilter =
    document.getElementById(
      "recordModeFilter"
    )?.value || "all";

  return state.records.filter(record => {
    const matchesTeam =
      teamFilter === "all" ||
      record.teamId === teamFilter;

    const matchesMode =
      modeFilter === "all" ||
      record.mode === modeFilter;

    return matchesTeam && matchesMode;
  });
}

function getModeName(mode) {
  const modeNames = {
    circuit: "서킷",
    random: "랜덤",
    bingo: "빙고",
    mission: "협동"
  };

  return modeNames[mode] || mode;
}

function renderRecordTable() {
  const tbody = document.getElementById(
    "recordTableBody"
  );

  if (!tbody) {
    return;
  }

  const records = getFilteredRecords();

  if (records.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td
          colspan="9"
          class="empty-cell"
        >
          저장된 운동 기록이 없습니다.
        </td>
      </tr>
    `;

    return;
  }

  tbody.innerHTML = records
    .map(record => {
      return `
        <tr>
          <td>
            ${escapeHtml(
              record.time ||
              getCurrentTimeText()
            )}
          </td>

          <td>
            ${escapeHtml(
              getModeName(record.mode)
            )}
          </td>

          <td>
            ${escapeHtml(
              record.teamName || "-"
            )}
          </td>

          <td>
            ${escapeHtml(
              record.participantName ||
              "팀 전체"
            )}
          </td>

          <td>
            ${escapeHtml(
              record.exerciseName || "-"
            )}
          </td>

          <td>
            ${record.successfulReps || 0}
          </td>

          <td>
            ${record.invalidReps || 0}
          </td>

          <td>
            ${record.bonusScore || 0}
          </td>

          <td>
            <strong>
              ${record.earnedScore || 0}점
            </strong>
          </td>
        </tr>
      `;
    })
    .join("");
}

/* =========================
   참가자 상세 기록
========================= */

function renderParticipantDetail() {
  const container = document.getElementById(
    "participantDetailCard"
  );

  if (!container) {
    return;
  }

  const participantId =
    document.getElementById(
      "recordParticipantSelect"
    )?.value || "";

  const participant =
    getParticipant(participantId);

  const team =
    getParticipantTeam(participantId);

  if (!participant || !team) {
    container.innerHTML = `
      <div class="empty-message">
        참가자를 선택해주세용.
      </div>
    `;

    return;
  }

  const participantRecords =
    state.records.filter(
      record =>
        record.participantId ===
        participant.id
    );

  const formAccuracy =
    calculateFormAccuracy(participant);

  const favoriteExercise =
    getFavoriteExercise(
      participantRecords
    );

  container.innerHTML = `
    <div class="participant-detail-head">
      <strong>
        ${escapeHtml(participant.name)}
      </strong>

      <span>
        ${escapeHtml(team.name)}
        · 기록 ${participantRecords.length}개
      </span>
    </div>

    <div class="participant-stat-grid">
      ${createParticipantStatBox(
        "총 점수",
        `${participant.score}점`
      )}

      ${createParticipantStatBox(
        "유효 횟수",
        `${participant.validReps}회`
      )}

      ${createParticipantStatBox(
        "자세 제외",
        `${participant.invalidReps}회`
      )}

      ${createParticipantStatBox(
        "자세 정확도",
        `${formAccuracy.toFixed(0)}%`
      )}

      ${createParticipantStatBox(
        "보너스 점수",
        `${participant.bonusScore}점`
      )}

      ${createParticipantStatBox(
        "최다 운동",
        favoriteExercise
      )}
    </div>
  `;
}

function createParticipantStatBox(
  label,
  value
) {
  return `
    <div class="participant-stat-box">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function getFavoriteExercise(records) {
  if (!records || records.length === 0) {
    return "기록 없음";
  }

  const exerciseCounts = {};

  records.forEach(record => {
    const exerciseName =
      record.exerciseName || "운동";

    exerciseCounts[exerciseName] =
      (exerciseCounts[exerciseName] || 0) +
      1;
  });

  return Object.entries(exerciseCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ||
    "기록 없음";
}

/* =========================
   현재 세션 저장
========================= */

function bindSessionControls() {
  document
    .getElementById("saveSessionBtn")
    ?.addEventListener(
      "click",
      saveCurrentSession
    );

  document
    .getElementById("resetSessionBtn")
    ?.addEventListener(
      "click",
      resetCurrentSession
    );
}

function createSessionSnapshot() {
  return {
    id: createId("saved-session"),
    savedAt: Date.now(),

    title: state.sessionTitle,
    date: state.sessionDate,

    teamCount: state.teams.length,

    participantCount:
      getAllParticipants().length,

    recordCount: state.records.length,

    state: deepClone(state)
  };
}

function saveCurrentSession() {
  const sessions =
    getSavedSessions();

  sessions.unshift(
    createSessionSnapshot()
  );

  if (sessions.length > 30) {
    sessions.length = 30;
  }

  setSavedSessions(sessions);

  state.status = "complete";

  saveState();
  renderAll();

  showToast("현재 운동 세션을 저장했어용.");
}

/* =========================
   저장 세션 불러오기·삭제
========================= */

function loadSavedSession(sessionId) {
  const sessions =
    getSavedSessions();

  const savedSession =
    sessions.find(
      session => session.id === sessionId
    );

  if (!savedSession?.state) {
    alert("저장된 세션을 찾지 못했어용.");
    return;
  }

  const confirmed = confirm(
    "현재 운동 데이터를 저장된 세션으로 교체할까용?"
  );

  if (!confirmed) {
    return;
  }

  stopCircuitTimerOnly();

  state = {
    ...deepClone(defaultState),
    ...deepClone(savedSession.state)
  };

  normalizeState();

  saveState();

  fillSetupInputs();
  renderSetupTeams();
  renderSetupExercises();
  renderAll();

  showToast("저장된 세션을 불러왔어용.");
}

function deleteSavedSession(sessionId) {
  const confirmed = confirm(
    "이 저장 세션을 삭제할까용?"
  );

  if (!confirmed) {
    return;
  }

  const sessions =
    getSavedSessions().filter(
      session =>
        session.id !== sessionId
    );

  setSavedSessions(sessions);
  renderSavedSessionList();
}

function bindSavedSessionEvents() {
  document.addEventListener(
    "click",
    event => {
      const loadId =
        event.target.dataset.loadSession;

      const deleteId =
        event.target.dataset.deleteSession;

      if (loadId) {
        loadSavedSession(loadId);
      }

      if (deleteId) {
        deleteSavedSession(deleteId);
      }
    }
  );
}

function renderSavedSessionList() {
  const container = document.getElementById(
    "savedSessionList"
  );

  if (!container) {
    return;
  }

  const sessions =
    getSavedSessions();

  if (sessions.length === 0) {
    container.innerHTML = `
      <div class="empty-message">
        저장된 세션이 없습니다.
      </div>
    `;

    return;
  }

  container.innerHTML = sessions
    .map(session => {
      return `
        <div class="saved-session-row">
          <div>
            <strong>
              ${escapeHtml(
                session.title ||
                "운동 세션"
              )}
            </strong>

            <span>
              ${escapeHtml(
                session.date || "날짜 미입력"
              )}
              · 팀 ${session.teamCount || 0}개
              · 참가자
              ${session.participantCount || 0}명
              · ${formatDateTime(
                session.savedAt
              )}
            </span>
          </div>

          <button
            type="button"
            data-load-session="${session.id}"
          >
            불러오기
          </button>

          <button
            type="button"
            data-delete-session="${session.id}"
          >
            삭제
          </button>
        </div>
      `;
    })
    .join("");
}

/* =========================
   현재 세션 초기화
========================= */

function resetCurrentSession() {
  const confirmed = confirm(
    "팀, 참가자, 점수와 운동 기록을 모두 초기화할까용?\n저장된 세션은 유지돼용."
  );

  if (!confirmed) {
    return;
  }

  stopCircuitTimerOnly();

  state = deepClone(defaultState);

  state.sessionDate = new Date()
    .toISOString()
    .slice(0, 10);

  state.exercises =
    deepClone(defaultExercises);

  localStorage.removeItem(STORAGE_KEY);

  saveState();

  fillSetupInputs();
  renderSetupTeams();
  renderSetupExercises();
  renderAll();

  openSetupPanel();

  showToast("새 운동 세션으로 초기화했어용.");
}

/* =========================
   CSV 저장
========================= */

function escapeCsvValue(value) {
  const text = String(value ?? "");

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n")
  ) {
    return `"${text.replaceAll(
      '"',
      '""'
    )}"`;
  }

  return text;
}

function exportRecordsCsv() {
  if (state.records.length === 0) {
    alert("저장할 운동 기록이 없어용.");
    return;
  }

  const rows = [
    [
      "시간",
      "모드",
      "팀",
      "참가자",
      "운동",
      "분류",
      "성공 횟수",
      "자세 불량 제외",
      "유효 횟수",
      "보너스 점수",
      "획득 점수"
    ]
  ];

  state.records.forEach(record => {
    rows.push([
      record.time || "",
      getModeName(record.mode),
      record.teamName || "",
      record.participantName || "",
      record.exerciseName || "",
      record.exerciseCategory || "",

      record.successfulReps || 0,
      record.invalidReps || 0,
      record.validReps || 0,

      record.bonusScore || 0,
      record.earnedScore || 0
    ]);
  });

  const csvContent =
    "\uFEFF" +
    rows
      .map(row =>
        row
          .map(escapeCsvValue)
          .join(",")
      )
      .join("\n");

  downloadTextFile(
    `${sanitizeFileName(
      state.sessionTitle
    )}_운동기록.csv`,
    csvContent,
    "text/csv;charset=utf-8"
  );
}

function sanitizeFileName(name) {
  return String(name || "fit-battle")
    .replace(/[\\/:*?"<>|]/g, "_")
    .trim();
}

/* =========================
   JSON 백업·불러오기
========================= */

function bindJsonControls() {
  document
    .getElementById("exportJsonBtn")
    ?.addEventListener(
      "click",
      exportJsonBackup
    );

  document
    .getElementById("importJsonInput")
    ?.addEventListener(
      "change",
      importJsonBackup
    );
}

function exportJsonBackup() {
  const backup = {
    version: 1,
    exportedAt: Date.now(),

    currentSession: state,

    savedSessions:
      getSavedSessions()
  };

  downloadTextFile(
    `fit_battle_backup_${Date.now()}.json`,
    JSON.stringify(
      backup,
      null,
      2
    ),
    "application/json;charset=utf-8"
  );

  showToast("JSON 백업 파일을 저장했어용.");
}

function importJsonBackup(event) {
  const file = event.target.files?.[0];

  if (!file) {
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    try {
      const backup = JSON.parse(
        String(reader.result)
      );

      const confirmed = confirm(
        "백업 파일을 불러오면 현재 데이터가 교체될 수 있어용. 계속할까용?"
      );

      if (!confirmed) {
        event.target.value = "";
        return;
      }

      stopCircuitTimerOnly();

      if (backup.currentSession) {
        state = {
          ...deepClone(defaultState),
          ...backup.currentSession
        };

        normalizeState();
        saveState();
      }

      if (
        Array.isArray(
          backup.savedSessions
        )
      ) {
        setSavedSessions(
          backup.savedSessions
        );
      }

      fillSetupInputs();
      renderSetupTeams();
      renderSetupExercises();
      renderAll();

      showToast("백업 데이터를 불러왔어용.");
    } catch (error) {
      console.error(error);

      alert(
        "JSON 백업 파일을 읽지 못했어용."
      );
    } finally {
      event.target.value = "";
    }
  };

  reader.onerror = () => {
    alert("파일을 읽는 중 오류가 발생했어용.");
    event.target.value = "";
  };

  reader.readAsText(file);
}

/* =========================
   안전 확인
========================= */

function bindSafetyControls() {
  document
    .getElementById("saveSafetyCheckBtn")
    ?.addEventListener(
      "click",
      saveSafetyCheck
    );
}

function saveSafetyCheck() {
  const warmup =
    Boolean(
      document.getElementById(
        "warmupCheck"
      )?.checked
    );

  const space =
    Boolean(
      document.getElementById(
        "spaceCheck"
      )?.checked
    );

  const weight =
    Boolean(
      document.getElementById(
        "weightCheck"
      )?.checked
    );

  const pain =
    Boolean(
      document.getElementById(
        "painCheck"
      )?.checked
    );

  if (
    !warmup ||
    !space ||
    !weight ||
    !pain
  ) {
    alert(
      "운동을 시작하기 전에 안전 확인 4개를 모두 체크해주세용."
    );

    return;
  }

  state.safetyCheck = {
    warmup,
    space,
    weight,
    pain,
    savedAt: Date.now()
  };

  saveState();
  renderSafetyCheck();

  showToast("운동 전 안전 확인을 저장했어용.");
}

function renderSafetyCheck() {
  const checkMap = {
    warmupCheck:
      state.safetyCheck.warmup,

    spaceCheck:
      state.safetyCheck.space,

    weightCheck:
      state.safetyCheck.weight,

    painCheck:
      state.safetyCheck.pain
  };

  Object.entries(checkMap).forEach(
    ([elementId, checked]) => {
      const checkbox =
        document.getElementById(
          elementId
        );

      if (checkbox) {
        checkbox.checked =
          Boolean(checked);
      }
    }
  );

  const status = document.getElementById(
    "safetyCheckStatus"
  );

  if (!status) {
    return;
  }

  if (state.safetyCheck.savedAt) {
    status.textContent =
      `안전 확인 완료 · ${formatDateTime(
        state.safetyCheck.savedAt
      )}`;
  } else {
    status.textContent =
      "아직 안전 확인을 저장하지 않았어용.";
  }
}

/* =========================
   전체 자동 저장
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
  renderPartThree();
  renderPartFour();

  renderRecordFilterOptions();
  renderRecordTable();

  fillAllParticipantSelect(
    "recordParticipantSelect"
  );

  renderParticipantDetail();
  renderSavedSessionList();
  renderSafetyCheck();

  saveState();
}

/* =========================
   5부 초기 실행
========================= */

function initializeAppPartFive() {
  bindRecordControls();
  bindSessionControls();

  bindSavedSessionEvents();
  bindJsonControls();
  bindSafetyControls();
  bindAutoSave();

  renderAll();
}

initializeAppPartFive();