// popup.js

let habitsAppState = null;
const todayDate = getLocalDateString();

// DOM elements
const syncStatusEl = document.getElementById("sync-status");
const profileBarEl = document.getElementById("profile-bar");
const authFallbackEl = document.getElementById("auth-fallback");
const mainContentEl = document.getElementById("main-content");
const habitsListEl = document.getElementById("habits-list");
const tasksListEl = document.getElementById("tasks-list");
const addTaskForm = document.getElementById("add-task-form");
const newTaskInput = document.getElementById("new-task-input");
const openAppBtn = document.getElementById("open-app-btn");

// Tab switching
const tabButtons = document.querySelectorAll(".tab-btn");
const tabPanels = document.querySelectorAll(".tab-panel");

tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    tabButtons.forEach(b => b.classList.remove("active"));
    tabPanels.forEach(p => p.classList.remove("active"));
    
    btn.classList.add("active");
    const targetPanel = document.getElementById(`panel-${btn.dataset.tab}`);
    if (targetPanel) targetPanel.classList.add("active");
  });
});

// Load state on open
document.addEventListener("DOMContentLoaded", () => {
  loadExtensionState();
  
  // Register message listener in case the state updates while popup is open
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "EXTENSION_STATE_UPDATED") {
      habitsAppState = message.state;
      renderUI();
    }
  });
});

// App opening redirect helper
openAppBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: "http://localhost:5173/" });
});

// Load state from chrome local storage
function loadExtensionState() {
  chrome.storage.local.get("habitsAppState", (res) => {
    if (res && res.habitsAppState && res.habitsAppState.userId) {
      habitsAppState = res.habitsAppState;
      renderUI();
      verifyCloudConnection();
    } else {
      showLoggedOutState();
    }
  });
}

function showLoggedOutState() {
  profileBarEl.style.display = "none";
  authFallbackEl.style.display = "flex";
  mainContentEl.style.display = "none";
  updateSyncStatusIndicator("offline", "Logged Out");
}

function updateSyncStatusIndicator(status, text) {
  const dot = syncStatusEl.querySelector(".status-dot");
  const txt = syncStatusEl.querySelector(".status-text");
  
  dot.className = `status-dot ${status}`;
  txt.innerText = text;
}

// Check if there are unsynced offline tasks
function verifyCloudConnection() {
  const pending = habitsAppState.pendingActions || [];
  if (pending.length > 0) {
    updateSyncStatusIndicator("offline", `${pending.length} Unsynced`);
  } else {
    updateSyncStatusIndicator("online", "Synced");
  }
}

// Render the entire layout
function renderUI() {
  if (!habitsAppState) return;

  profileBarEl.style.display = "flex";
  authFallbackEl.style.display = "none";
  mainContentEl.style.display = "block";

  // Level Info
  const userProfile = habitsAppState.userProfile || {};
  document.getElementById("user-level").innerText = userProfile.level || 1;
  document.getElementById("user-votes").innerText = userProfile.totalVotes || 0;
  
  const levelNames = { 1: "Seedling", 2: "Sprout", 3: "Sapling", 4: "Mighty Oak", 5: "Atomic" };
  document.getElementById("user-level-name").innerText = levelNames[userProfile.level] || "Seedling";

  renderHabitsList();
  renderTasksList();
}

// Render habits list
function renderHabitsList() {
  habitsListEl.innerHTML = "";
  const habits = habitsAppState.habits || [];
  const completions = habitsAppState.completions || [];

  if (habits.length === 0) {
    habitsListEl.innerHTML = `<li class="empty-state">No habit systems active. Build one in the app!</li>`;
    return;
  }

  habits.forEach(habit => {
    // Check if completed today
    const isCompleted = completions.some(c => c.habitId === habit.id && c.dateNormalized === todayDate);
    const completion = completions.find(c => c.habitId === habit.id && c.dateNormalized === todayDate);
    const isTwoMin = completion ? completion.isTwoMinVersion : false;

    const li = document.createElement("li");
    li.className = "list-item";
    
    li.innerHTML = `
      <div class="item-left">
        <div class="item-checkbox ${isCompleted ? 'checked' : ''}" data-id="${habit.id}" data-action="toggle">
          ${isCompleted ? `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ` : ''}
        </div>
        <div class="item-details">
          <span class="item-title ${isCompleted ? 'completed' : ''}">${habit.title}</span>
          <span class="item-subtitle">${habit.category || 'General'}</span>
          ${habit.time ? `<span class="item-time-badge">${habit.time}</span>` : ''}
        </div>
      </div>
      <div class="item-right">
        ${!isCompleted && habit.twoMinRule ? `
          <button class="btn-2min" data-id="${habit.id}" data-action="twomin">2-Min Rule</button>
        ` : ''}
        ${isCompleted && isTwoMin ? `
          <span class="level-badge" style="background-color: var(--color-hover-bg);">2-Min version</span>
        ` : ''}
      </div>
    `;

    // Handle check box click
    li.querySelector('.item-checkbox').addEventListener('click', () => {
      executeAction("EXTENSION_TOGGLE_HABIT", {
        habitId: habit.id,
        identityId: habit.identityId,
        dateNormalized: todayDate,
        isTwoMin: false,
        notes: ""
      });
    });

    // Handle 2-min version click
    const btn2Min = li.querySelector('.btn-2min');
    if (btn2Min) {
      btn2Min.addEventListener('click', () => {
        executeAction("EXTENSION_TOGGLE_HABIT", {
          habitId: habit.id,
          identityId: habit.identityId,
          dateNormalized: todayDate,
          isTwoMin: true,
          notes: "Completed scaled-down 2-minute version"
        });
      });
    }

    habitsListEl.appendChild(li);
  });
}

// Render tasks list
function renderTasksList() {
  tasksListEl.innerHTML = "";
  const tasks = habitsAppState.tasks || [];
  const todayTasks = tasks.filter(t => t.dateNormalized === todayDate);

  if (todayTasks.length === 0) {
    tasksListEl.innerHTML = `<li class="empty-state">No daily tasks for today. Add one below!</li>`;
    return;
  }

  todayTasks.forEach(task => {
    const li = document.createElement("li");
    li.className = "list-item";
    
    li.innerHTML = `
      <div class="item-left">
        <div class="item-checkbox ${task.completed ? 'checked' : ''}">
          ${task.completed ? `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ` : ''}
        </div>
        <div class="item-details">
          <span class="item-title ${task.completed ? 'completed' : ''}">${task.title}</span>
        </div>
      </div>
      <div class="item-right">
        <button class="btn-delete" title="Delete Task">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </button>
      </div>
    `;

    // Toggle Task
    li.querySelector('.item-checkbox').addEventListener('click', () => {
      executeAction("EXTENSION_TOGGLE_TASK", {
        taskId: task.id,
        completed: !task.completed
      });
    });

    // Delete Task
    li.querySelector('.btn-delete').addEventListener('click', () => {
      if (confirm("Delete this daily task?")) {
        executeAction("EXTENSION_DELETE_TASK", {
          taskId: task.id
        });
      }
    });

    tasksListEl.appendChild(li);
  });
}

// Add Daily Task
addTaskForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = newTaskInput.value.trim();
  if (!title) return;

  const taskId = "task_" + Math.random().toString(36).substr(2, 9);
  
  executeAction("EXTENSION_ADD_TASK", {
    title,
    taskId,
    dateNormalized: todayDate
  });

  newTaskInput.value = "";
});

// Core Action Executer (Web tab message vs. REST API vs. Queue Sync)
async function executeAction(type, payload) {
  // Apply optimistic UI update to habitsAppState
  applyOptimisticUI(type, payload);
  renderUI();

  try {
    // 1. Try to sync through active tab first
    const tab = await getActiveHabitsTab();
    if (tab) {
      await chrome.tabs.sendMessage(tab.id, { type, payload });
      console.log("[Extension Popup] Synced via active Web Tab.");
      verifyCloudConnection();
      return;
    }

    // 2. No active tab, try to send direct REST request to Firestore
    if (habitsAppState.authToken && habitsAppState.firebaseConfig) {
      await sendFirestoreREST(type, payload);
      console.log("[Extension Popup] Synced directly via Firestore REST API.");
      verifyCloudConnection();
      return;
    }

    // 3. Fallback: Queue action for offline syncing
    throw new Error("No web tab open and no Firestore credentials available.");
  } catch (err) {
    console.warn("[Extension Popup] Direct sync failed. Queuing action locally:", err);
    queueActionLocally(type, payload);
  }
}

// Optimistic UI updates
function applyOptimisticUI(type, payload) {
  if (type === "EXTENSION_TOGGLE_HABIT") {
    const completions = habitsAppState.completions || [];
    const index = completions.findIndex(c => c.habitId === payload.habitId && c.dateNormalized === payload.dateNormalized);
    if (index > -1) {
      // Uncheck
      completions.splice(index, 1);
      habitsAppState.userProfile.totalVotes = Math.max(0, habitsAppState.userProfile.totalVotes - 1);
    } else {
      // Check
      completions.push({
        id: `${payload.habitId}_${payload.dateNormalized}`,
        habitId: payload.habitId,
        identityId: payload.identityId,
        dateNormalized: payload.dateNormalized,
        isTwoMinVersion: payload.isTwoMin,
        completedAt: new Date().toISOString()
      });
      habitsAppState.userProfile.totalVotes += 1;
    }
    habitsAppState.completions = completions;
  } else if (type === "EXTENSION_TOGGLE_TASK") {
    const tasks = habitsAppState.tasks || [];
    const task = tasks.find(t => t.id === payload.taskId);
    if (task) {
      task.completed = payload.completed;
      task.completedAt = payload.completed ? new Date().toISOString() : null;
    }
    habitsAppState.tasks = tasks;
  } else if (type === "EXTENSION_ADD_TASK") {
    const tasks = habitsAppState.tasks || [];
    tasks.push({
      id: payload.taskId,
      title: payload.title,
      dateNormalized: payload.dateNormalized,
      completed: false,
      createdAt: new Date().toISOString(),
      completedAt: null
    });
    habitsAppState.tasks = tasks;
  } else if (type === "EXTENSION_DELETE_TASK") {
    const tasks = habitsAppState.tasks || [];
    habitsAppState.tasks = tasks.filter(t => t.id !== payload.taskId);
  }
}

// Local storage offline queueing
function queueActionLocally(type, payload) {
  const queue = habitsAppState.pendingActions || [];
  queue.push({ type, payload, timestamp: Date.now() });
  habitsAppState.pendingActions = queue;
  
  chrome.storage.local.set({ habitsAppState }, () => {
    verifyCloudConnection();
  });
}

// Query tab helper
async function getActiveHabitsTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ url: ["http://localhost/*", "https://*.vercel.app/*"] }, (tabs) => {
      if (tabs && tabs.length > 0) {
        resolve(tabs[0]);
      } else {
        resolve(null);
      }
    });
  });
}

// Direct Firestore REST calls
async function sendFirestoreREST(type, payload) {
  const { userId, authToken, firebaseConfig } = habitsAppState;
  const projectId = firebaseConfig.projectId;
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

  const headers = {
    "Authorization": `Bearer ${authToken}`,
    "Content-Type": "application/json"
  };

  let url = "";
  let method = "PATCH";
  let body = null;

  if (type === "EXTENSION_TOGGLE_HABIT") {
    const completions = habitsAppState.completions || [];
    const isChecking = completions.some(c => c.habitId === payload.habitId && c.dateNormalized === payload.dateNormalized);
    
    url = `${baseUrl}/users/${userId}/completions/${payload.habitId}_${payload.dateNormalized}`;
    if (isChecking) {
      // Add completion
      body = {
        fields: {
          userId: { stringValue: userId },
          habitId: { stringValue: payload.habitId },
          identityId: { stringValue: payload.identityId },
          dateNormalized: { stringValue: payload.dateNormalized },
          isTwoMinVersion: { booleanValue: payload.isTwoMin },
          completedAt: { stringValue: new Date().toISOString() },
          notes: { stringValue: payload.notes || "" }
        }
      };
    } else {
      // Remove completion
      method = "DELETE";
    }
  } else if (type === "EXTENSION_TOGGLE_TASK") {
    url = `${baseUrl}/users/${userId}/tasks/${payload.taskId}?updateMask.fieldPaths=completed&updateMask.fieldPaths=completedAt`;
    body = {
      fields: {
        completed: { booleanValue: payload.completed },
        completedAt: payload.completed ? { stringValue: new Date().toISOString() } : { nullValue: null }
      }
    };
  } else if (type === "EXTENSION_ADD_TASK") {
    url = `${baseUrl}/users/${userId}/tasks/${payload.taskId}`;
    body = {
      fields: {
        title: { stringValue: payload.title },
        dateNormalized: { stringValue: payload.dateNormalized },
        completed: { booleanValue: false },
        createdAt: { stringValue: new Date().toISOString() },
        completedAt: { nullValue: null }
      }
    };
  } else if (type === "EXTENSION_DELETE_TASK") {
    url = `${baseUrl}/users/${userId}/tasks/${payload.taskId}`;
    method = "DELETE";
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });

  if (!response.ok) {
    const errorMsg = await response.text();
    throw new Error(`REST API HTTP ${response.status}: ${errorMsg}`);
  }

  // Also save the latest optimistic app state back to chrome.storage.local
  chrome.storage.local.set({ habitsAppState });
}

// Format local date string
function getLocalDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
