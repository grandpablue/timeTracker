document.addEventListener("DOMContentLoaded", () => {
  // --- ELEMENTS ---
  const addTaskBtn = document.querySelector(".btn-add-task");
  const taskInput = document.querySelector(".task-input");
  const pastTasksList = document.querySelector(".app-past-tasks-list");
  const message = document.querySelector(".app-message");
  const timerBox = document.querySelector(".app-timer-box");
  const timerDisplay = document.createElement("p");
  timerDisplay.classList.add("timer-display");
  timerDisplay.textContent = "00:00:00";
  timerBox.appendChild(timerDisplay);

  const startBtn = document.querySelector(".btn-start");
  const stopBtn = document.querySelector(".btn-stop");
  const resetBtn = document.querySelector(".btn-reset");

  const taskHistoryList = document.querySelector(".app-task-history-list");
  const totalTimeDisplay = document.querySelector(".total-time-display");
  const averageTimeDisplay = document.querySelector(".average-time-display");
  const mostFrequentDisplay = document.querySelector(".most-frequent-task-display");
  const longestTaskDisplay = document.querySelector(".longest-task-display");

  const clearDataBtn = document.querySelector(".btn-clear-data");
  const weeklyBreakdownList = document.querySelector(".weekly-breakdown-list");

  const exportBtn = document.querySelector(".btn-export-data");
  const importBtn = document.querySelector(".btn-import-data");
  const importFileInput = document.querySelector(".import-file-input");
  

  // --- STATE ---
  let savedTasks = JSON.parse(localStorage.getItem("savedTasks")) || [];
  let taskHistory = JSON.parse(localStorage.getItem("taskHistory")) || [];
  let currentTask = null;
  let timerInterval = null;
  let elapsedSeconds = 0;
  let startTime = null;

  // --- UTILITY FUNCTIONS ---
  function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2,"0")}:${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;
  }

  function formatReadable(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  }

  function saveData() {
    localStorage.setItem("savedTasks", JSON.stringify(savedTasks));
    localStorage.setItem("taskHistory", JSON.stringify(taskHistory));
  }

  function updateClearButtonVisibility() {
    if (savedTasks.length || taskHistory.length) {
      clearDataBtn.style.display = "inline-block";
      clearDataBtn.style.opacity = 1;
    } else {
      clearDataBtn.style.opacity = 0;
      setTimeout(() => { clearDataBtn.style.display = "none"; }, 500);
    }
  }

  // --- RENDER FUNCTIONS ---
function renderSavedTasks() {
  pastTasksList.innerHTML = "";

  savedTasks.forEach((taskName, index) => {
    const btn = document.createElement("button");
    btn.textContent = taskName;
    btn.classList.add("task-btn");

    // Highlight if currently selected
    if (currentTask === taskName) {
      btn.classList.add("active");
    }

    // Left-click to select/unselect
    btn.addEventListener("click", () => {
      if (currentTask === taskName) {
        // Unselect if already selected
        currentTask = null;
        message.textContent = "No task selected.";
      } else {
        // Select new task
        currentTask = taskName;
        message.textContent = `${taskName} selected. Press start to begin.`;
      }
      renderSavedTasks(); // re-render to update highlighting
    });

    // Right-click context menu
    btn.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      showTaskContextMenu(e.pageX, e.pageY, btn, index);
    });

    pastTasksList.appendChild(btn);
  });

  updateClearButtonVisibility();
}


function renderTaskHistory() {
  taskHistoryList.innerHTML = "";

  // --- Group tasks by name ---
  const grouped = {};
  taskHistory.forEach(entry => {
    if (!grouped[entry.name]) grouped[entry.name] = [];
    grouped[entry.name].push(entry);
  });

  const sortedTasks = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

  sortedTasks.forEach(taskName => {
    const groupDiv = document.createElement("div");
    groupDiv.classList.add("task-history-group");

    // --- Task Header ---
    const headerDiv = document.createElement("div");
    headerDiv.style.display = "flex";
    headerDiv.style.alignItems = "center";

    const collapseBtn = document.createElement("span");
    collapseBtn.textContent = "+";
    collapseBtn.style.cursor = "pointer";
    collapseBtn.style.marginRight = "5px";
    collapseBtn.addEventListener("click", () => {
      groupDiv.classList.toggle("open");
      collapseBtn.textContent = groupDiv.classList.contains("open") ? "−" : "+";
      slideToggle(groupDiv.querySelectorAll(".task-month-group"));
    });

    const title = document.createElement("h3");
    title.textContent = taskName;
    title.style.margin = "0";

    headerDiv.appendChild(collapseBtn);
    headerDiv.appendChild(title);
    groupDiv.appendChild(headerDiv);

    // --- Task stats boxes ---
    const durations = grouped[taskName].map(e => e.duration);
    const totalSeconds = durations.reduce((sum, t) => sum + t, 0);
    const avgSeconds = Math.round(totalSeconds / durations.length);

    const statsContainer = document.createElement("div");
    statsContainer.style.display = "flex";
    statsContainer.style.gap = "5px";
    statsContainer.style.margin = "5px 0 10px 20px";

    const totalBox = document.createElement("div");
    totalBox.classList.add("day-box");
    totalBox.textContent = `Total Time: ${formatReadable(totalSeconds)}`;
    totalBox.style.backgroundColor = "rgba(255, 105, 180, 0.17)";


    const avgBox = document.createElement("div");
    avgBox.classList.add("day-box");
    avgBox.textContent = `Avg Time: ${formatReadable(avgSeconds)}`;
    avgBox.style.backgroundColor = "rgba(255, 105, 180, 0.17)";
 

    statsContainer.appendChild(totalBox);
    statsContainer.appendChild(avgBox);
    groupDiv.appendChild(statsContainer);

    // --- Group by month ---
    const months = {};
    grouped[taskName].forEach(entry => {
      const date = new Date(entry.startTime);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      if (!months[monthKey]) months[monthKey] = [];
      months[monthKey].push(entry);
    });

    Object.keys(months).sort((a, b) => new Date(b + "-01") - new Date(a + "-01")).forEach(monthKey => {
      const monthEntries = months[monthKey];
      const monthDiv = document.createElement("div");
      monthDiv.classList.add("task-month-group");
      monthDiv.style.display = "none"; // hidden by default
      monthDiv.style.borderRadius = "5px";
      monthDiv.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.3)";
      monthDiv.style.backgroundColor = "rgba(255, 105, 180, 0.17)";
      monthDiv.style.margin = "5px 0";
      monthDiv.style.transition = "all 0.3s ease";
      monthDiv.style.padding = "5px";

      const monthHeader = document.createElement("div");
      monthHeader.style.display = "flex";
      monthHeader.style.alignItems = "center";
      monthHeader.style.cursor = "pointer";

      const monthCollapse = document.createElement("span");
      monthCollapse.textContent = "+";
      monthCollapse.style.marginRight = "5px";
      monthCollapse.addEventListener("click", (e) => {
        e.stopPropagation(); // prevent parent toggle
        monthDiv.classList.toggle("open");
        monthCollapse.textContent = monthDiv.classList.contains("open") ? "−" : "+";
        slideToggle([monthContent]);
      });

      const monthTitle = document.createElement("span");
      const [year, month] = monthKey.split("-");
      monthTitle.textContent = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
      monthTitle.style.flex = "1";

      monthHeader.appendChild(monthCollapse);
      monthHeader.appendChild(monthTitle);
      monthDiv.appendChild(monthHeader);

      // Month stats boxes below the label
      const monthTotal = monthEntries.reduce((sum, e) => sum + e.duration, 0);
      const monthAvg = Math.round(monthTotal / monthEntries.length);

      const monthStatsContainer = document.createElement("div");
      monthStatsContainer.style.display = "flex";
      monthStatsContainer.style.gap = "5px";
      monthStatsContainer.style.margin = "5px 0 10px 20px";

      const monthTotalBox = document.createElement("div");
      monthTotalBox.classList.add("day-box");
      monthTotalBox.textContent = `Total Time: ${formatReadable(monthTotal)}`;
      monthTotalBox.style.backgroundColor = "rgba(255, 105, 180, 0.17)";

      const monthAvgBox = document.createElement("div");
      monthAvgBox.classList.add("day-box");
      monthAvgBox.textContent = `Avg Time: ${formatReadable(monthAvg)}`;
      monthAvgBox.style.backgroundColor = "rgba(255, 105, 180, 0.17)";

      monthStatsContainer.appendChild(monthTotalBox);
      monthStatsContainer.appendChild(monthAvgBox);
      monthDiv.appendChild(monthStatsContainer);

      // Month content (entries)
      const monthContent = document.createElement("div");
      monthContent.classList.add("task-month-content");
      monthContent.style.display = "none"; // hidden by default
      monthContent.style.transition = "all 0.3s ease";

      monthEntries.forEach(entry => {
        const entryDiv = document.createElement("div");
        entryDiv.classList.add("task-history-entry");
        entryDiv.innerHTML = `
          <strong>Date:</strong> ${new Date(entry.startTime).toLocaleDateString()}<br>
          <strong>Started:</strong> ${entry.startFormatted}<br>
          <strong>Ended:</strong> ${entry.endFormatted}<br>
          <strong>Duration:</strong> ${formatReadable(entry.duration)}
        `;
        monthContent.appendChild(entryDiv);
      });

      monthDiv.appendChild(monthContent);
      groupDiv.appendChild(monthDiv);
    });

    taskHistoryList.appendChild(groupDiv);
  });

  updateStatistics();
}

// --- CONTEXT MENU SETUP ---
const taskContextMenu = document.createElement("div");
taskContextMenu.className = "task-context-menu";
taskContextMenu.innerHTML = `
  <button class="edit-task">Edit</button>
  <button class="delete-task">Delete</button>
`;
document.body.appendChild(taskContextMenu);

let contextTargetButton = null;
let contextTargetIndex = null;

// Show context menu
function showTaskContextMenu(x, y, button, index) {
  contextTargetButton = button;
  contextTargetIndex = index;

  taskContextMenu.style.left = `${x}px`;
  taskContextMenu.style.top = `${y}px`;
  taskContextMenu.style.display = "block";
}

// Hide when clicking elsewhere
document.addEventListener("click", (e) => {
  if (!taskContextMenu.contains(e.target)) {
    taskContextMenu.style.display = "none";
  }
});

// --- INLINE EDIT FEATURE ---
function startInlineEdit(button, index) {
  const oldName = savedTasks[index];
  
  // Create inline input
  const input = document.createElement("input");
  input.type = "text";
  input.value = oldName;
  input.className = "task-inline-edit";
  input.style.width = `${button.offsetWidth}px`;
  input.style.height = `${button.offsetHeight}px`;
  input.style.textAlign = "center";

  button.replaceWith(input);
  input.focus();
  input.select();

  const finishEdit = (save) => {
    if (save && input.value.trim()) {
      savedTasks[index] = input.value.trim();
    }
    saveData();
    renderSavedTasks();
  };

  input.addEventListener("blur", () => finishEdit(true));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") finishEdit(true);
    if (e.key === "Escape") finishEdit(false);
  });
}

// Handle Edit
taskContextMenu.querySelector(".edit-task").addEventListener("click", () => {
  if (!contextTargetButton) return;
  startInlineEdit(contextTargetButton, contextTargetIndex);
  taskContextMenu.style.display = "none";
});

// Handle Delete
taskContextMenu.querySelector(".delete-task").addEventListener("click", () => {
  if (!contextTargetButton) return;

  const taskName = contextTargetButton.textContent;
  if (confirm(`Delete "${taskName}"?`)) {
    const index = savedTasks.indexOf(taskName);
    if (index !== -1) savedTasks.splice(index, 1);

    // Clear current selection if the deleted task was active
    if (currentTask === taskName) currentTask = null;

    saveData();
    renderSavedTasks();
  }
  taskContextMenu.style.display = "none";
});



// --- Helper slide functions ---
function slideToggle(elements) {
  elements.forEach(el => {
    if (el.style.display === "none" || el.style.display === "") {
      slideDown(el);
    } else {
      slideUp(el);
    }
  });
}

function slideDown(el) {
  el.style.display = "block";
  const height = el.scrollHeight + "px";
  el.style.height = "0";
  el.style.overflow = "hidden";
  setTimeout(() => {
    el.style.transition = "height 0.3s ease";
    el.style.height = height;
  }, 10);
  setTimeout(() => {
    el.style.height = "";
    el.style.transition = "";
    el.style.overflow = "";
  }, 310);
}

function slideUp(el) {
  el.style.height = el.scrollHeight + "px";
  el.style.overflow = "hidden";
  setTimeout(() => {
    el.style.transition = "height 0.3s ease";
    el.style.height = "0";
  }, 10);
  setTimeout(() => {
    el.style.display = "none";
    el.style.height = "";
    el.style.transition = "";
    el.style.overflow = "";
  }, 310);
}


// --- Helper slide functions ---
function slideToggle(elements) {
  elements.forEach(el => {
    if (el.style.display === "none" || el.style.display === "") {
      slideDown(el);
    } else {
      slideUp(el);
    }
  });
}

function slideDown(el) {
  el.style.display = "block";
  const height = el.scrollHeight + "px";
  el.style.height = "0";
  el.style.overflow = "hidden";
  setTimeout(() => {
    el.style.transition = "height 0.3s ease";
    el.style.height = height;
  }, 10);
  setTimeout(() => {
    el.style.height = "";
    el.style.transition = "";
    el.style.overflow = "";
  }, 310);
}

function slideUp(el) {
  el.style.height = el.scrollHeight + "px";
  el.style.overflow = "hidden";
  setTimeout(() => {
    el.style.transition = "height 0.3s ease";
    el.style.height = "0";
  }, 10);
  setTimeout(() => {
    el.style.display = "none";
    el.style.height = "";
    el.style.transition = "";
    el.style.overflow = "";
  }, 310);
}

function slideDownAll() {
  document.querySelectorAll(".task-month-group").forEach(el => slideDown(el));
}

function slideUpAll() {
  document.querySelectorAll(".task-month-group").forEach(el => slideUp(el));
}




function updateStatistics() {
  // Clear current stats display first
  totalTimeDisplay.innerHTML = "";
  averageTimeDisplay.innerHTML = "";
  mostFrequentDisplay.innerHTML = "";
  longestTaskDisplay.innerHTML = "";

  if (!taskHistory.length) {
    // Show placeholders if no data
    const placeholders = ["00:00", "N/A", "N/A", "N/A"];
    [totalTimeDisplay, averageTimeDisplay, mostFrequentDisplay, longestTaskDisplay].forEach((el, i) => {
      const box = document.createElement("div");
      box.classList.add("day-box"); // reuse daily box style
      box.textContent = placeholders[i];
      box.style.backgroundColor = "#4781a8";
      box.style.color = "#ffffff";
      el.appendChild(box);
    });
    return;
  }

  const totalSeconds = taskHistory.reduce((sum, t) => sum + t.duration, 0);
  const avgSeconds = Math.round(totalSeconds / taskHistory.length);

  const freq = {};
  taskHistory.forEach(t => freq[t.name] = (freq[t.name] || 0) + 1);
  const mostFreq = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];

  const longest = taskHistory.reduce((max, t) => t.duration > max.duration ? t : max, taskHistory[0]);

  // Build boxes for each stat
  const stats = [
    `Total Time: ${formatReadable(totalSeconds)}`,
    `Avg Time: ${formatReadable(avgSeconds)}`,
    `Most Frequent Task: ${mostFreq ? `${mostFreq[0]} (${mostFreq[1]}x)` : "N/A"}`,
    `Longest Task: ${longest.name} (${formatReadable(longest.duration)})`
  ];

  [totalTimeDisplay, averageTimeDisplay, mostFrequentDisplay, longestTaskDisplay].forEach((el, i) => {
    const box = document.createElement("div");
    box.classList.add("day-box"); // match daily box style
    box.style.marginRight = "5px";
    box.style.flex = "1";
    box.style.minHeight = "max-content";
    box.style.backgroundColor = "rgba(255, 105, 180, 0.17)"; // pink color
    box.textContent = stats[i];
    el.appendChild(box);
  });
}



function renderWeeklyBreakdown() {
  weeklyBreakdownList.innerHTML = "";

  const now = new Date();

  function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1 - day); // Monday = start of week
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function formatWeekLabel(startDate, endDate) {
    return `${startDate.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' })} to ${endDate.toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' })}`;
  }

  function createBox(text, bgColor = "rgba(255,105,180,0.17)") {
    const box = document.createElement("div");
    box.textContent = text;
    box.style.padding = "3px 8px";
    box.style.margin = "5px";
    box.style.backgroundColor = bgColor;
    box.style.border = "1px solid #cf98f0";
    box.style.borderRadius = "4px";
    box.style.display = "inline-block";
    box.style.transition = "all 0.3s ease";
    box.style.flex = "1";
    return box;
  }

  // Group tasks by week
  const weeks = {};
  taskHistory.forEach(entry => {
    const ws = getWeekStart(entry.startTime).toISOString().split("T")[0];
    if (!weeks[ws]) weeks[ws] = { totalWeek: 0, tasks: {}, daysWithTasks: new Set() };
    weeks[ws].tasks[entry.name] = (weeks[ws].tasks[entry.name] || 0) + entry.duration;
    weeks[ws].totalWeek += entry.duration;
    const day = new Date(entry.startTime).toISOString().split("T")[0];
    weeks[ws].daysWithTasks.add(day);
  });

  const currentWeekKey = getWeekStart(now).toISOString().split("T")[0];
  if (!weeks[currentWeekKey]) weeks[currentWeekKey] = { totalWeek: 0, tasks: {}, daysWithTasks: new Set() };

  const sortedWeekKeys = Object.keys(weeks).sort((a, b) => new Date(b) - new Date(a)); // Most recent week first

  // Group weeks by month
  const months = {};
  sortedWeekKeys.forEach(weekStart => {
    const date = new Date(weekStart);
    const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
    if (!months[monthKey]) months[monthKey] = [];
    months[monthKey].push(weekStart);
  });

  // Render each month
  Object.keys(months).forEach(monthKey => {
    const monthDiv = document.createElement("div");
    monthDiv.classList.add("monthly-group");
    monthDiv.style.marginBottom = "20px";
    monthDiv.style.borderRadius = "6px";
    monthDiv.style.boxShadow = "0 4px 8px rgba(0,0,0,0.25)";
    monthDiv.style.backgroundColor = "rgba(143, 39, 91, 0.17)";
    monthDiv.style.transition = "all 0.3s ease";
    monthDiv.addEventListener("mouseenter", () => monthDiv.style.transform = "scale(1.02)");
    monthDiv.addEventListener("mouseleave", () => monthDiv.style.transform = "scale(1)");

    const [year, month] = monthKey.split("-");
    const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

    // Calculate month totals & averages
    let monthTotal = 0;
    let monthDaysSet = new Set();
    months[monthKey].forEach(weekStart => {
      const weekData = weeks[weekStart];
      monthTotal += weekData.totalWeek;
      weekData.daysWithTasks.forEach(day => monthDaysSet.add(day));
    });
    const monthAvg = monthDaysSet.size > 0 ? Math.round(monthTotal / monthDaysSet.size) : 0;

    // Month header
    const monthHeaderDiv = document.createElement("div");
    monthHeaderDiv.style.display = "flex";
    monthHeaderDiv.style.alignItems = "center";
    monthHeaderDiv.style.marginBottom = "5px";

    const collapseMonthBtn = document.createElement("div");
    collapseMonthBtn.textContent = "+";
    collapseMonthBtn.style.cursor = "pointer";
    collapseMonthBtn.style.marginRight = "10px";
    collapseMonthBtn.addEventListener("click", () => {
      const isOpen = monthDiv.classList.toggle("open");
      collapseMonthBtn.textContent = isOpen ? "−" : "+";
      monthDiv.querySelectorAll(".weekly-week").forEach(weekDiv => {
        weekDiv.style.display = isOpen ? "block" : "none";
      });
    });

    const monthTitle = document.createElement("h3");
    monthTitle.textContent = monthName;
    monthTitle.style.margin = "0";
    monthTitle.style.color = "#cf98f0";
    monthTitle.style.flex = "1";

    monthHeaderDiv.appendChild(collapseMonthBtn);
    monthHeaderDiv.appendChild(monthTitle);
    monthDiv.appendChild(monthHeaderDiv);

    // Month stats boxes below the header
const statsContainer = document.createElement("div");
statsContainer.style.display = "flex";
statsContainer.style.justifyContent = "center"; // center justify
statsContainer.style.gap = "10px"; // spacing between boxes
statsContainer.style.marginTop = "5px"; // spacing below the month label
statsContainer.style.flexWrap = "wrap"; // wrap if needed

function createStatBox(text) {
    const box = document.createElement("div");
    box.textContent = text;
    box.style.padding = "5px 8px";
    box.style.backgroundColor = "rgba(255, 105, 180, 0.17)";
    box.style.border = "1px solid #cf98f0";
    box.style.borderRadius = "4px";
    box.style.fontWeight = "normal"; // normal weight
    box.style.fontSize = "0.8em"; // slightly smaller
    box.style.textAlign = "center"; // center text
    box.style.display = "flex";
    box.style.flex = "1";
    box.style.justifyContent = "center";
    
    return box;
}

statsContainer.appendChild(createStatBox(`Total Time: ${formatReadable(monthTotal)}`));
statsContainer.appendChild(createStatBox(`Avg Time: ${formatReadable(monthAvg)}`));
monthDiv.appendChild(statsContainer);


    // Render weeks in month (same as before)
    months[monthKey].forEach(weekStart => {
      const weekData = weeks[weekStart];
      const weekDiv = document.createElement("div");
      weekDiv.classList.add("weekly-week");
      weekDiv.style.marginBottom = "10px";
      weekDiv.style.display = "none"; // collapsed by default

      // Highlight current week
      if (weekStart === currentWeekKey) {
        weekDiv.style.borderColor = "#FFD700";
        weekDiv.style.backgroundColor = "rgba(255, 215, 0, 0.1)";
      } else if (weekData.daysWithTasks.size < 7) {
        weekDiv.style.borderColor = "#FF69B4";
        weekDiv.style.backgroundColor = "rgba(255, 105, 180, 0.1)";
      }

      const weekStartDate = new Date(weekStart);
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekEndDate.getDate() + 6);
      const averageSeconds = weekData.daysWithTasks.size > 0 ? Math.round(weekData.totalWeek / weekData.daysWithTasks.size) : 0;

      // Week header
      const weekHeaderDiv = document.createElement("div");
      weekHeaderDiv.style.display = "flex";
      weekHeaderDiv.style.alignItems = "center";
      weekHeaderDiv.style.fontSize = "0.9em";
      weekHeaderDiv.style.justifyContent = "center";
      weekHeaderDiv.style.flexWrap = "wrap";
      weekHeaderDiv.style.textAlign = "center";

      const collapseBtn = document.createElement("div");
      collapseBtn.textContent = "+";
      collapseBtn.style.cursor = "pointer";
      collapseBtn.style.marginRight = "10px";
      collapseBtn.addEventListener("click", () => {
        const isOpen = weekDiv.classList.toggle("open");
        weekDiv.querySelector("ul").style.display = isOpen ? "block" : "none";
        weekDiv.querySelector("div.days-container").style.display = isOpen ? "flex" : "none";
        collapseBtn.textContent = isOpen ? "−" : "+";
      });

      const weekTitle = document.createElement("h4");
      weekTitle.style.margin = "10px";
      weekTitle.textContent = `${formatWeekLabel(weekStartDate, weekEndDate)}`;

      weekHeaderDiv.appendChild(collapseBtn);
      weekHeaderDiv.appendChild(weekTitle);
      weekHeaderDiv.appendChild(createBox(`Total Time: ${formatReadable(weekData.totalWeek)}`));
      weekHeaderDiv.appendChild(createBox(`Avg Time: ${formatReadable(averageSeconds)}`));

      weekDiv.appendChild(weekHeaderDiv);

      // Daily boxes container
      const daysContainer = document.createElement("div");
      daysContainer.classList.add("days-container");
      daysContainer.style.display = "flex";
      daysContainer.style.justifyContent = "space-between";
      daysContainer.style.margin = "5px 0 10px 25px"; 
      daysContainer.style.flexWrap = "wrap";

      const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      for (let i = 0; i < 7; i++) {
        const dayBox = document.createElement("div");
        dayBox.style.flex = "1";
        dayBox.style.margin = "2px";
        dayBox.style.padding = "5px";
        dayBox.style.textAlign = "center";
        dayBox.style.border = "1px solid #cf98f0";
        dayBox.style.borderRadius = "4px";
        dayBox.style.backgroundColor = "rgba(255,105,180,0.17)";
        dayBox.style.fontSize = "0.8em";

        const dayDate = new Date(weekStartDate);
        dayDate.setDate(dayDate.getDate() + i);
        const dayKey = dayDate.toISOString().split("T")[0];

        let daySeconds = 0;
        taskHistory.forEach(entry => {
          const entryDate = new Date(entry.startTime).toISOString().split("T")[0];
          if (entryDate === dayKey) daySeconds += entry.duration;
        });

        dayBox.innerHTML = `<strong>${dayNames[i]}</strong><br>${daySeconds > 0 ? formatReadable(daySeconds) : "No Data"}`;

        const today = new Date();
        const todayKey = today.toISOString().split("T")[0];
        if (weekStart === getWeekStart(today).toISOString().split("T")[0] && dayKey === todayKey) {
          dayBox.style.backgroundColor = "rgba(255, 217, 0, 0.18)";
          dayBox.style.borderColor = "#FFD700";
          
          dayBox.style.boxShadow = "0 0 10px rgba(255, 217, 0, 0.4)";
          dayBox.style.color = "#ffffffbd";
        }

        daysContainer.appendChild(dayBox);
      }

      weekDiv.appendChild(daysContainer);

      // Tasks list
      const sortedTasks = Object.keys(weekData.tasks).sort((a, b) => weekData.tasks[b] - weekData.tasks[a]);
      const ul = document.createElement("ul");
      ul.style.display = "none";
      sortedTasks.forEach(taskName => {
        const li = document.createElement("li");
        li.textContent = `${taskName}: ${formatReadable(weekData.tasks[taskName])}`;
        ul.appendChild(li);
      });
      weekDiv.appendChild(ul);

      monthDiv.appendChild(weekDiv);
    });

    weeklyBreakdownList.appendChild(monthDiv);
  });
}





  // --- EVENTS ---
  addTaskBtn.addEventListener("click", () => {
    const name = taskInput.value.trim();
    if (!name) return;
    if (!savedTasks.includes(name)) savedTasks.push(name);
    saveData();
    renderSavedTasks();
    updateClearButtonVisibility();
    taskInput.value = "";
    message.textContent = `${name} added to task list.`;
  });

  startBtn.addEventListener("click", () => {
    if (!currentTask) { message.textContent = "Select a task first!"; return; }
    if (timerInterval) return;

    startTime = new Date();
    elapsedSeconds = 0;
    message.textContent = `${currentTask} started at ${startTime.toLocaleTimeString()}`;

    timerInterval = setInterval(() => {
      elapsedSeconds++;
      timerDisplay.textContent = formatTime(elapsedSeconds);
    }, 1000);
  });

  stopBtn.addEventListener("click", () => {
    if (!timerInterval || !currentTask) return;

    clearInterval(timerInterval);
    timerInterval = null;

    const endTime = new Date();
    const entry = {
      name: currentTask,
      duration: elapsedSeconds,
      startFormatted: startTime.toLocaleTimeString(),
      endFormatted: endTime.toLocaleTimeString(),
      startTime: startTime
    };

    taskHistory.push(entry);
    saveData();
    renderTaskHistory();
    renderWeeklyBreakdown();
    updateClearButtonVisibility();

    message.textContent = `${currentTask} stopped. Duration: ${formatReadable(elapsedSeconds)}`;
    timerDisplay.textContent = "00:00:00";
    currentTask = null;
  });

  resetBtn.addEventListener("click", () => {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    elapsedSeconds = 0;
    timerDisplay.textContent = "00:00:00";
    message.textContent = "Press start to begin";
  });

  clearDataBtn.addEventListener("click", () => {
    if (!confirm("Are you sure you want to clear all data?")) return;
    savedTasks = [];
    taskHistory = [];
    saveData();
    renderSavedTasks();
    renderTaskHistory();
    renderWeeklyBreakdown();
    updateClearButtonVisibility();
    message.textContent = "All data cleared.";
  });

exportBtn.addEventListener("click", () => {
  const allData = JSON.parse(localStorage.getItem("taskHistory")) || [];
  if (!allData.length) {
    alert("No data to export.");
    return;
  }

  // CSV Header
  const header = ["Task Name", "Start Time", "End Time", "Duration (seconds)", "Start Formatted", "End Formatted"];
  const rows = [header.join(",")];

  // Each entry
  allData.forEach(entry => {
    const row = [
      `"${entry.name}"`,
      `"${entry.startTime}"`,
      `"${entry.endTime}"`,
      entry.duration,
      `"${entry.startFormatted}"`,
      `"${entry.endFormatted}"`
    ];
    rows.push(row.join(","));
  });

  // Join and create Blob
  const csvContent = rows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  // Trigger download
  const link = document.createElement("a");
  link.href = url;
  link.download = "task_history_export.csv";
  link.click();

  URL.revokeObjectURL(url);
});


  importBtn.addEventListener("click", () => importFileInput.click());

  importFileInput.addEventListener("change", () => {
    const file = importFileInput.files[0];
    if (!file) return alert("Please select a file to import.");

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.savedTasks && data.taskHistory) {
          savedTasks = data.savedTasks;
          taskHistory = data.taskHistory;
          saveData();
          renderSavedTasks();
          renderTaskHistory();
          renderWeeklyBreakdown();
          updateClearButtonVisibility();
          message.textContent = "Data imported successfully!";
        } else alert("Invalid file format.");
      } catch (err) {
        alert("Error reading file: " + err.message);
      }
    };
    reader.readAsText(file);
  });


  // --- INITIAL RENDER ---
  renderSavedTasks();
  renderTaskHistory();
  renderWeeklyBreakdown();
  updateClearButtonVisibility();
});
