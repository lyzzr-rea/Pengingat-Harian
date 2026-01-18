// === PWA Service Worker ===
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}

document.addEventListener("DOMContentLoaded", () => {
  const taskInput = document.getElementById("task-input");
  const dateInput = document.getElementById("date-input");
  const hoursInput = document.getElementById("hours-input");
  const minutesInput = document.getElementById("minutes-input");
  const secondsInput = document.getElementById("seconds-input");
  const addBtn = document.getElementById("add-btn");
  const taskList = document.getElementById("task-list");
  const categoryInput = document.getElementById("category-input");
  const filterButtons = document.querySelectorAll(".filter-btn");
  const themeToggle = document.getElementById("theme-toggle");

  let currentFilter = "All";
  let tasks = [];

  // 🔓 Unlock audio on first click
  document.addEventListener(
    "click",
    () => {
      const s = document.getElementById("delete-sound");
      if (s) {
        s.play()
          .then(() => {
            s.pause();
            s.currentTime = 0;
          })
          .catch(() => {});
      }
    },
    { once: true },
  );

  // 🌙 Dark Mode
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      document.body.classList.toggle("dark");
    });
  }

  // 🔔 Notification permission
  if ("Notification" in window) {
    Notification.requestPermission();
  }

  // ===== Local Storage =====
  function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }

  function loadTasks() {
    const data = localStorage.getItem("tasks");
    if (data) {
      tasks = JSON.parse(data).map((t) => {
        t.date = new Date(t.date);
        return t;
      });
    }
  }

  loadTasks();
  renderTasks();

  // ===== FILTER =====
  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      renderTasks();
    });
  });

  // ===== ADD TASK =====
  addBtn.addEventListener("click", () => {
    const taskText = taskInput.value.trim();
    const dateValue = dateInput.value;
    const hours = parseInt(hoursInput.value) || 0;
    const minutes = parseInt(minutesInput.value) || 0;
    const seconds = parseInt(secondsInput.value) || 0;

    if (!taskText || !dateValue) return alert("Isi task & tanggal!");

    const reminderDate = new Date(dateValue);
    reminderDate.setHours(hours, minutes, seconds, 0);
    const timeDiff = reminderDate.getTime() - Date.now();

    if (timeDiff <= 0) return alert("Waktu harus di masa depan!");

    const task = {
      id: Date.now(),
      text: taskText,
      category: categoryInput.value,
      date: reminderDate,
      time: timeDiff,
      timeoutId: null,
      done: false,
    };

    tasks.push(task);
    saveTasks();
    renderTasks();
    startTimer(task);

    taskInput.value = "";
    dateInput.value = "";
    hoursInput.value = "";
    minutesInput.value = "";
    secondsInput.value = "";
  });

  // ===== RENDER =====
  function renderTasks() {
    taskList.innerHTML = "";

    const filtered =
      currentFilter === "All"
        ? tasks
        : tasks.filter((t) => t.category === currentFilter);

    filtered.forEach((task) => {
      const li = document.createElement("li");
      li.className = "task-item";
      if (task.done) li.classList.add("completed");
      li.dataset.id = task.id;

      li.innerHTML = `
        <span>
          <input type="checkbox" ${task.done ? "checked" : ""} onchange="toggleDone(${task.id})">
          <strong>${task.text}</strong>
          <small>
            <span class="badge ${task.category}">${task.category}</span>
            ${task.date.toLocaleDateString()} • ${task.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </small>
        </span>
        <div class="actions">
          <button onclick="editTask(${task.id})">Edit</button>
          <button onclick="deleteTask(${task.id})">Delete</button>
        </div>
      `;

      taskList.appendChild(li);
    });
  }

  // ===== TIMER + BACKGROUND NOTIFICATION =====
  function startTimer(task) {
    task.timeoutId = setTimeout(() => {
      if (Notification.permission === "granted") {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification("Task Reminder", {
            body: task.text,
            icon: "icon-192.png",
            badge: "icon-192.png",
          });
        });
      }

      deleteTask(task.id);
    }, task.time);
  }

  // ===== DELETE + SOUND =====
  window.deleteTask = (id) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    clearTimeout(task.timeoutId);
    tasks = tasks.filter((t) => t.id !== id);
    saveTasks();

    const sound = document.getElementById("delete-sound");
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }

    if (navigator.vibrate) navigator.vibrate(80);

    renderTasks();
  };

  window.toggleDone = (id) => {
    const task = tasks.find((t) => t.id === id);
    if (task) {
      task.done = !task.done;
      saveTasks();
      renderTasks();
    }
  };

  window.editTask = (id) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const newText = prompt("Edit task:", task.text);
    if (newText) {
      task.text = newText.trim();
      saveTasks();
      renderTasks();
    }
  };

  // ===== SWIPE DELETE (MOBILE) =====
  let touchStartX = 0;

  taskList.addEventListener("touchstart", (e) => {
    const li = e.target.closest(".task-item");
    if (!li) return;
    touchStartX = e.touches[0].clientX;
    li.dataset.startX = touchStartX;
  });

  taskList.addEventListener("touchmove", (e) => {
    const li = e.target.closest(".task-item");
    if (!li) return;
    const moveX = e.touches[0].clientX - li.dataset.startX;
    li.style.transform = `translateX(${moveX}px)`;
  });

  taskList.addEventListener("touchend", (e) => {
    const li = e.target.closest(".task-item");
    if (!li) return;
    const moveX = e.changedTouches[0].clientX - li.dataset.startX;

    if (moveX < -100) {
      deleteTask(Number(li.dataset.id));
    } else {
      li.style.transform = "translateX(0)";
    }
  });
});
