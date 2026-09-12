// =========================================
// PWA SERVICE WORKER
// =========================================

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch((error) => {
    console.error("Service worker registration failed:", error);
  });
}

// =========================================
// APPLICATION
// =========================================

document.addEventListener("DOMContentLoaded", () => {
  
  // =======================================
  // BASIC ELEMENTS
  // =======================================

  const taskInput = document.getElementById("task-input");
  const dateInput = document.getElementById("date-input");
  const hoursInput = document.getElementById("hours-input");
  const minutesInput = document.getElementById("minutes-input");
  const secondsInput = document.getElementById("seconds-input");
  const addBtn = document.getElementById("add-btn");
  const taskList = document.getElementById("task-list");
  const categoryInput = document.getElementById("category-input");
  const filterButtons = document.querySelectorAll(".filter-btn");
  const voiceBtn = document.getElementById("voice-btn");

  // =======================================
  // VIEW
  // =======================================

  const listView = document.getElementById("list-view");
  const calendarView = document.getElementById("calendar-view");
  const prevMonthBtn = document.getElementById("prev-month");
  const nextMonthBtn = document.getElementById("next-month");
  const currentMonthSpan = document.getElementById("current-month");
  const calendarGrid = document.getElementById("calendar-grid");
  const selectedDateSpan = document.getElementById("selected-date");
  const taskListDate = document.getElementById("task-list-date");

  // =======================================
  // STATISTICS
  // =======================================

  const statsModal = document.getElementById("stats-modal");
  const closeStats = document.getElementById("close-stats");
  const statsBody = document.getElementById("stats-body");

  // =======================================
  // SNOOZE
  // =======================================

  const snoozeModal = document.getElementById("snooze-modal");
  const closeSnooze = document.getElementById("close-snooze");
  const snoozeTaskText = document.getElementById("snooze-task-text");
  const snoozeOptions = document.querySelectorAll(".snooze-options button");

  // =======================================
  // NAVIGATION
  // =======================================

  const navHome = document.getElementById("nav-home");
  const navCalendar = document.getElementById("nav-calendar");
  const navAdd = document.getElementById("nav-add");
  const navStats = document.getElementById("nav-stats");
  const navSettings = document.getElementById("nav-settings");
  const navItems = document.querySelectorAll(".app-navigation .nav-item");

  // =======================================
  // STATE
  // =======================================

  let currentFilter = "All";
  let tasks = [];
  let currentView = "list";
  let currentMonth = new Date();
  let snoozeTaskId = null;

  // =======================================
  // AUDIO UNLOCK
  // =======================================

  document.addEventListener(
    "click",
    () => {
      const sound = document.getElementById("delete-sound");
      if (sound) {
        sound
          .play()
          .then(() => {
            sound.pause();
            sound.currentTime = 0;
          })
          .catch(() => {});
      }
    },
    {
      once: true,
    },
  );

  // =======================================
  // DARK MODE
  // =======================================

  function applyTheme() {
    const isDark = document.body.classList.contains("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark");
  }

  // =======================================
  // NOTIFICATION PERMISSION
  // =======================================

  if ("Notification" in window) {
    Notification.requestPermission().catch(() => {});
  }

  // =======================================
  // LOCAL STORAGE
  // =======================================

  function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }
  function loadTasks() {
    const data = localStorage.getItem("tasks");
    if (!data) {
      tasks = [];
      return;
    }
    try {
      tasks = JSON.parse(data).map((task) => {
        task.date = new Date(task.date);
        task.timeoutId = null;
        return task;
      });
    } catch (error) {
      console.error("Failed to load tasks:", error);
      tasks = [];
    }
  }
  loadTasks();
  tasks.forEach((task) => {
    startTimer(task);
  });
  renderTasks();

  // =======================================
  // FILTER
  // =======================================

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filterButtons.forEach((btn) => {
        btn.classList.remove("active");
      });
      button.classList.add("active");
      currentFilter = button.dataset.filter;
      renderTasks();
    });
  });

  // =======================================
  // ADD TASK
  // =======================================

  addBtn.addEventListener("click", () => {
    const taskText = taskInput.value.trim();
    const dateValue = dateInput.value;
    const hours = parseInt(hoursInput.value) || 0;
    const minutes = parseInt(minutesInput.value) || 0;
    const seconds = parseInt(secondsInput.value) || 0;
    if (!taskText || !dateValue) {
      alert("Isi task & tanggal!");
      return;
    }
    if (
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59 ||
      seconds < 0 ||
      seconds > 59
    ) {
      alert("Waktu tidak valid!");
      return;
    }
    const reminderDate = new Date(dateValue);
    reminderDate.setHours(hours, minutes, seconds, 0);
    const timeDiff = reminderDate.getTime() - Date.now();
    if (timeDiff <= 0) {
      alert("Waktu harus di masa depan!");
      return;
    }
    const task = {
      id: Date.now().toString(),
      text: taskText,
      category: categoryInput.value,
      date: reminderDate,
      done: false,
      timeoutId: null,
    };
    tasks.push(task);
    saveTasks();
    startTimer(task);
    renderTasks();

    // Reset inputs

    taskInput.value = "";
    dateInput.value = "";
    hoursInput.value = "";
    minutesInput.value = "";
    secondsInput.value = "";
    if (currentView === "calendar") {
      renderCalendar();
    }
  });

  // =======================================
  // RENDER TASKS
  // =======================================

  function renderTasks() {
    taskList.innerHTML = "";
    const filtered =
      currentFilter === "All"
        ? tasks
        : tasks.filter((task) => task.category === currentFilter);
    const taskCount = document.getElementById("task-count");
    if (taskCount) {
      taskCount.textContent = `${filtered.length} task${
        filtered.length !== 1 ? "s" : ""
      }`;
    }
    if (filtered.length === 0) {
      const empty = document.createElement("li");
      empty.className = "task-item";
      empty.innerHTML = `
        <span>
          <strong>No reminders yet</strong>
          <small>
            Add a reminder above.
          </small>
        </span>
      `;
      taskList.appendChild(empty);
      return;
    }
    filtered.forEach((task) => {
      const li = document.createElement("li");
      li.className = "task-item";
      if (task.done) {
        li.classList.add("completed");
      }
      li.dataset.id = task.id;
      li.innerHTML = `
        <span>
          <label>
            <input
              type="checkbox"
              ${task.done ? "checked" : ""}
              onchange="toggleDone('${task.id}')"
            >
            <strong>
              ${escapeHTML(task.text)}
            </strong>
          </label>
          <small>
            <span
              class="badge ${task.category}"
            >
              ${task.category}
            </span>
            ${task.date.toLocaleDateString()}
            •
            ${task.date.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </small>
        </span>


        <div class="actions">
          <button
            onclick="editTask('${task.id}')"
          >
            Edit
          </button>
          <button
            onclick="deleteTask('${task.id}')"
          >
            Delete
          </button>
        </div>
      `;
      taskList.appendChild(li);
    });
  }

  // =======================================
  // ESCAPE HTML
  // =======================================

  function escapeHTML(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // =======================================
  // TIMER + NOTIFICATION
  // =======================================

  function startTimer(task) {
    if (task.done) {
      return;
    }
    if (task.timeoutId) {
      clearTimeout(task.timeoutId);
    }
    const now = Date.now();
    const taskTime = task.date.getTime();
    const delay = taskTime - now;
    if (delay <= 0) {
      showNotification(task);
      return;
    }
    task.timeoutId = setTimeout(() => {
      showNotification(task);
    }, delay);
  }

  function showNotification(task) {
    if ("Notification" in window && Notification.permission === "granted") {
      navigator.serviceWorker.ready
        .then((registration) => {
          registration.showNotification("Task Reminder", {
            body: task.text,
            icon: "icon-192.png",
            badge: "icon-192.png",
            tag: task.id,
            data: {
              taskId: task.id,
            },
            actions: [
              {
                action: "snooze",
                title: "Tunda 5 menit",
              },
            ],
          });
        })
        .catch(() => {});
    } else {
      alert(`Pengingat: ${task.text}`);
    }
    const alarm = document.getElementById("alarm-sound");
    if (alarm) {
      alarm.currentTime = 0;
      alarm.play().catch(() => {});
    }
    snoozeTaskId = task.id;
    snoozeTaskText.textContent = task.text;
    snoozeModal.classList.remove("hidden");
  }

  // =======================================
  // SNOOZE
  // =======================================

  snoozeOptions.forEach((button) => {
    button.addEventListener("click", (event) => {
      const minutes = parseInt(event.currentTarget.dataset.minutes);
      if (!snoozeTaskId) {
        return;
      }
      const task = tasks.find((item) => item.id === snoozeTaskId);
      if (!task) {
        return;
      }
      clearTimeout(task.timeoutId);
      const newDate = new Date(task.date.getTime() + minutes * 60000);
      task.date = newDate;
      saveTasks();

      startTimer(task);

      snoozeModal.classList.add("hidden");

      snoozeTaskId = null;

      renderTasks();

      if (currentView === "calendar") {
        renderCalendar();
      }
    });
  });

  closeSnooze.addEventListener("click", () => {
    snoozeModal.classList.add("hidden");

    snoozeTaskId = null;
  });

  // =======================================
  // SERVICE WORKER SNOOZE MESSAGE
  // =======================================

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "SNOOZE") {
        const taskId = event.data.taskId;

        const task = tasks.find((item) => item.id === taskId);

        if (task) {
          snoozeTaskId = taskId;

          snoozeTaskText.textContent = task.text;

          snoozeModal.classList.remove("hidden");
        }
      }
    });
  }

  // =======================================
  // DELETE
  // =======================================

  window.deleteTask = (id) => {
    const task = tasks.find((item) => item.id === id);

    if (!task) {
      return;
    }

    clearTimeout(task.timeoutId);

    tasks = tasks.filter((item) => item.id !== id);

    saveTasks();

    const sound = document.getElementById("delete-sound");

    if (sound) {
      sound.currentTime = 0;

      sound.play().catch(() => {});
    }

    if (navigator.vibrate) {
      navigator.vibrate(80);
    }

    renderTasks();

    if (currentView === "calendar") {
      renderCalendar();
    }
  };

  // =======================================
  // TOGGLE DONE
  // =======================================

  window.toggleDone = (id) => {
    const task = tasks.find((item) => item.id === id);

    if (!task) {
      return;
    }

    task.done = !task.done;

    if (task.done) {
      clearTimeout(task.timeoutId);
    } else {
      startTimer(task);
    }

    saveTasks();

    renderTasks();
    if (currentView === "calendar") {
      renderCalendar();
    }
  };

  // =======================================
  // EDIT
  // =======================================

  window.editTask = (id) => {
    const task = tasks.find((item) => item.id === id);
    if (!task) {
      return;
    }
    const newText = prompt("Edit task:", task.text);
    if (newText && newText.trim()) {
      task.text = newText.trim();
      saveTasks();
      renderTasks();
      if (currentView === "calendar") {
        renderCalendar();
      }
    }
  };

  // =======================================
  // SWIPE DELETE
  // =======================================

  taskList.addEventListener("touchstart", (event) => {
    const li = event.target.closest(".task-item");
    if (!li) {
      return;
    }
    const startX = event.touches[0].clientX;
    li.dataset.startX = startX;
  });
  taskList.addEventListener("touchmove", (event) => {
    const li = event.target.closest(".task-item");
    if (!li) {
      return;
    }
    const startX = Number(li.dataset.startX);
    const moveX = event.touches[0].clientX - startX;
    if (moveX < 0) {
      li.style.transform = `translateX(${moveX}px)`;
    }
  });
  taskList.addEventListener("touchend", (event) => {
    const li = event.target.closest(".task-item");
    if (!li) {
      return;
    }
    const startX = Number(li.dataset.startX);
    const moveX = event.changedTouches[0].clientX - startX;
    if (moveX < -100) {
      deleteTask(li.dataset.id);
    } else {
      li.style.transform = "translateX(0)";
    }
  });

  // =======================================
  // CALENDAR
  // =======================================

  function renderCalendar() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const totalDays = lastDay.getDate();
    currentMonthSpan.textContent = currentMonth.toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    });
    let gridHTML = "";

    // Previous month

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDay; i > 0; i--) {
      const day = prevMonthLastDay - i + 1;
      const yearPrev = month === 0 ? year - 1 : year;
      const monthPrev = month === 0 ? 11 : month - 1;
      const dateStr = `${yearPrev}-${String(monthPrev + 1).padStart(
        2,
        "0",
      )}-${String(day).padStart(2, "0")}`;
      gridHTML += `
        <div
          class="calendar-day other-month"
          data-date="${dateStr}"
        >
          ${day}
        </div>
      `;
    }

    // Current month

    for (let d = 1; d <= totalDays; d++) {
      const hasTask = tasks.some((task) => {
        const taskDate = new Date(task.date);
        return (
          taskDate.getFullYear() === year &&
          taskDate.getMonth() === month &&
          taskDate.getDate() === d
        );
      });
      const className = `calendar-day ${hasTask ? "has-task" : ""}`;
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
        d,
      ).padStart(2, "0")}`;
      gridHTML += `
        <div
          class="${className}"
          data-date="${dateStr}"
        >
          ${d}
        </div>
      `;
    }

    // Next month

    const nextDays = 42 - (startDay + totalDays);
    for (let i = 1; i <= nextDays; i++) {
      const yearNext = month === 11 ? year + 1 : year;
      const monthNext = month === 11 ? 0 : month + 1;
      const dateStr = `${yearNext}-${String(monthNext + 1).padStart(
        2,
        "0",
      )}-${String(i).padStart(2, "0")}`;
      gridHTML += `
        <div
          class="calendar-day other-month"
          data-date="${dateStr}"
        >
          ${i}
        </div>
      `;
    }
    calendarGrid.innerHTML = gridHTML;
    document.querySelectorAll(".calendar-day").forEach((day) => {
      day.addEventListener("click", () => {
        const dateStr = day.dataset.date;
        if (!dateStr) {
          return;
        }
        const [y, m, d] = dateStr.split("-").map(Number);
        const selectedDate = new Date(y, m - 1, d);
        const tasksOnDate = tasks.filter((task) => {
          const taskDate = new Date(task.date);
          return (
            taskDate.getFullYear() === y &&
            taskDate.getMonth() === m - 1 &&
            taskDate.getDate() === d
          );
        });
        selectedDateSpan.textContent = selectedDate.toLocaleDateString("id-ID");
        taskListDate.innerHTML = tasksOnDate
          .map(
            (task) => `
                      <li>
                        ${escapeHTML(task.text)}
                        <small>
                          (${task.category})
                        </small>
                      </li>
                    `,
          )
          .join("");
        if (tasksOnDate.length === 0) {
          taskListDate.innerHTML = "<li>Tidak ada task pada tanggal ini</li>";
        }
      });
    });
  }
  prevMonthBtn.addEventListener("click", () => {
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    renderCalendar();
  });
  nextMonthBtn.addEventListener("click", () => {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    renderCalendar();
  });

  // =======================================
  // STATISTICS
  // =======================================

  function calculateStats() {
    const total = tasks.length;
    const completed = tasks.filter((task) => task.done).length;
    const categories = ["Tugas", "Personal", "Acara", "Janjian"];
    const categoryCount = {};
    const categoryCompleted = {};
    categories.forEach((category) => {
      categoryCount[category] = tasks.filter(
        (task) => task.category === category,
      ).length;
      categoryCompleted[category] = tasks.filter(
        (task) => task.category === category && task.done,
      ).length;
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todayTasks = tasks.filter((task) => {
      const d = new Date(task.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    }).length;
    const tomorrowTasks = tasks.filter((task) => {
      const d = new Date(task.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === tomorrow.getTime();
    }).length;
    return {
      total,
      completed,
      categoryCount,
      categoryCompleted,
      todayTasks,
      tomorrowTasks,
    };
  }
  function renderStats() {
    const stats = calculateStats();
    let html = `
      <div class="stat-total">
        Total Tugas:
        ${stats.total}
      </div>
      <div class="stat-item">
        <div class="stat-label">
          <span>
            Progress
          </span>
          <span>
            ${stats.completed}
            /
            ${stats.total}
            (
            ${
              stats.total
                ? Math.round((stats.completed / stats.total) * 100)
                : 0
            }%
            )
          </span>
        </div>
        <div class="progress-bar">
          <div
            class="progress-fill"
            style="
              width:
              ${stats.total ? (stats.completed / stats.total) * 100 : 0}%
            "
          ></div>
        </div>
      </div>
      <h4>
        Per Kategori
      </h4>
    `;
    const categories = ["Tugas", "Personal", "Acara", "Janjian"];
    categories.forEach((category) => {
      const totalCat = stats.categoryCount[category] || 0;
      const doneCat = stats.categoryCompleted[category] || 0;
      const percentage = totalCat ? Math.round((doneCat / totalCat) * 100) : 0;
      html += `
          <div class="stat-row">
            <span>
              <span
                class="stat-badge ${category}"
              >
                ${category}
              </span>
              ${totalCat}
              tugas
            </span>
            <span>
              ${doneCat}
              selesai
              (${percentage}%)
            </span>
          </div>
        `;
    });
    html += `
      <h4>
        Ringkasan Waktu
      </h4>
      <div class="stat-row">
        <span>
          📅 Hari ini
        </span>
        <span>
          ${stats.todayTasks}
          tugas
        </span>
      </div>
      <div class="stat-row">
        <span>
          📆 Besok
        </span>
        <span>
          ${stats.tomorrowTasks}
          tugas
        </span>
      </div>
    `;
    statsBody.innerHTML = html;
  }
  closeStats.addEventListener("click", () => {
    statsModal.classList.add("hidden");
  });
  window.addEventListener("click", (event) => {
    if (event.target === statsModal) {
      statsModal.classList.add("hidden");
    }
    if (event.target === snoozeModal) {
      snoozeModal.classList.add("hidden");
      snoozeTaskId = null;
    }
  });

  // =======================================
  // VOICE INPUT
  // =======================================

  if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "id-ID";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => {
      voiceBtn.classList.add("listening");
      voiceBtn.textContent = "⏹️";
    };

    recognition.onend = () => {
      voiceBtn.classList.remove("listening");
      voiceBtn.textContent = "🎤";
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      taskInput.value = transcript;
    };
    recognition.onerror = (event) => {
      console.error("Speech error:", event.error);
      alert("Gagal mengenali suara");
      recognition.stop();
    };
    voiceBtn.addEventListener("click", () => {
      if (voiceBtn.classList.contains("listening")) {
        recognition.stop();
      } else {
        try {
          recognition.start();
        } catch (error) {
          alert("Akses mikrofon ditolak");
        }
      }
    });
  } else {
    voiceBtn.disabled = true;
    voiceBtn.title = "Browser tidak mendukung input suara";
  }

  // =======================================
  // NAVIGATION
  // =======================================

  function updateNavigation() {
    navItems.forEach((item) => {
      item.classList.remove("active");
    });
    if (currentView === "calendar") {
      navCalendar.classList.add("active");
    } else {
      navHome.classList.add("active");
    }
  }
  function showView(view) {
    currentView = view;
    if (view === "calendar") {
      listView.classList.add("hidden");
      calendarView.classList.remove("hidden");
      renderCalendar();
    } else {
      listView.classList.remove("hidden");
      calendarView.classList.add("hidden");
      renderTasks();
    }
    updateNavigation();
  }

  // HOME

  navHome.addEventListener("click", () => {
    showView("list");
  });

  // CALENDAR

  navCalendar.addEventListener("click", () => {
    showView("calendar");
  });

  // ADD

  navAdd.addEventListener("click", () => {
    showView("list");
    taskInput.focus();
    taskInput.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  });

  // STATS

  navStats.addEventListener("click", () => {
    renderStats();
    statsModal.classList.remove("hidden");
  });

  // THEME

  navSettings.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    applyTheme();
  });

  // =======================================
  // INITIAL VIEW
  // =======================================

  showView("list");

  // =======================================
  // KEYBOARD SHORTCUT
  // =======================================

  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && document.activeElement !== taskInput) {
      event.preventDefault();
      taskInput.focus();
    }
  });
});
