// === PWA Service Worker ===
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js")
    .then(reg => console.log("SW registered:", reg))
    .catch(err => console.error("SW registration failed:", err));
}

// Request izin notifikasi saat halaman dimuat
if ("Notification" in window) {
  Notification.requestPermission().then(perm => {
    console.log("Notification permission:", perm);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // Elemen DOM
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
  const viewBtns = document.querySelectorAll(".view-btn");
  const listView = document.getElementById("list-view");
  const calendarView = document.getElementById("calendar-view");
  const prevMonthBtn = document.getElementById("prev-month");
  const nextMonthBtn = document.getElementById("next-month");
  const currentMonthSpan = document.getElementById("current-month");
  const calendarGrid = document.getElementById("calendar-grid");
  const selectedDateSpan = document.getElementById("selected-date");
  const taskListDate = document.getElementById("task-list-date");
  const deleteSound = document.getElementById("delete-sound");
  const alarmSound = document.getElementById("alarm-sound");

  // State
  let currentFilter = "All";
  let tasks = [];
  let currentView = "list"; // 'list' atau 'calendar'
  let currentMonth = new Date(); // untuk kalender

  // 🔓 Unlock audio on first click (agar sound bisa diputar nantinya)
  document.addEventListener(
    "click",
    () => {
      if (deleteSound) {
        deleteSound.play()
          .then(() => {
            deleteSound.pause();
            deleteSound.currentTime = 0;
          })
          .catch(() => {});
      }
    },
    { once: true }
  );

  // 🌙 Dark mode toggle
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      document.body.classList.toggle("dark");
      themeToggle.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
    });
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
        // Jika ada timeoutId, jangan simpan karena akan di-reset
        return t;
      });
      // Reset semua timeout setelah load
      tasks.forEach(task => startTimer(task));
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

  // ===== VIEW TOGGLE =====
  viewBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      viewBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentView = btn.dataset.view;
      if (currentView === "list") {
        listView.classList.remove("hidden");
        calendarView.classList.add("hidden");
        renderTasks(); // refresh list
      } else {
        listView.classList.add("hidden");
        calendarView.classList.remove("hidden");
        renderCalendar();
      }
    });
  });

  // ===== ADD TASK =====
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

    const reminderDate = new Date(dateValue);
    reminderDate.setHours(hours, minutes, seconds, 0);
    const timeDiff = reminderDate.getTime() - Date.now();

    if (timeDiff <= 0) {
      alert("Waktu harus di masa depan!");
      return;
    }

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
    startTimer(task);
    renderTasks();
    if (currentView === "calendar") renderCalendar();

    // Reset form
    taskInput.value = "";
    dateInput.value = "";
    hoursInput.value = "";
    minutesInput.value = "";
    secondsInput.value = "";
  });

  // ===== RENDER LIST =====
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

  // ===== TIMER + NOTIFICATION =====
  function startTimer(task) {
    // Hapus timer lama jika ada
    if (task.timeoutId) clearTimeout(task.timeoutId);

    const waktuTersisa = task.date.getTime() - Date.now();
    if (waktuTersisa <= 0) return;

    task.timeoutId = setTimeout(async () => {
      // Cek izin notifikasi
      if (Notification.permission === "granted") {
        // Coba kirim via Service Worker
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          registration.showNotification("⏰ Task Reminder", {
            body: task.text,
            icon: "icon-192.png",
            badge: "icon-192.png",
            vibrate: [200, 100, 200],
            tag: task.id.toString(),
            renotify: true,
            actions: [{ action: "open", title: "Buka Aplikasi" }]
          });
        } else {
          // Fallback ke Notification biasa
          new Notification("⏰ Task Reminder", {
            body: task.text,
            icon: "icon-192.png",
          });
        }
      } else {
        // Fallback alert
        alert(`⏰ Waktunya: ${task.text}`);
      }

      // Putar suara alarm jika diizinkan (dan file tersedia)
      if (alarmSound) {
        alarmSound.play().catch(e => console.log("Alarm sound failed", e));
      }

      // Hapus task setelah notifikasi
      deleteTask(task.id, { skipSound: true }); // jangan bunyi sound hapus
    }, waktuTersisa);
  }

  // ===== DELETE =====
  window.deleteTask = (id, options = {}) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    clearTimeout(task.timeoutId);
    tasks = tasks.filter((t) => t.id !== id);
    saveTasks();

    if (!options.skipSound && deleteSound) {
      deleteSound.currentTime = 0;
      deleteSound.play().catch(() => {});
    }

    if (navigator.vibrate) navigator.vibrate(80);

    renderTasks();
    if (currentView === "calendar") renderCalendar();
  };

  window.toggleDone = (id) => {
    const task = tasks.find((t) => t.id === id);
    if (task) {
      task.done = !task.done;
      saveTasks();
      renderTasks();
      if (currentView === "calendar") renderCalendar();
    }
  };

  window.editTask = (id) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const newText = prompt("Edit task:", task.text);
    if (newText && newText.trim() !== "") {
      task.text = newText.trim();
      saveTasks();
      renderTasks();
      if (currentView === "calendar") renderCalendar();
    }
  };

  // ===== CALENDAR =====
  function renderCalendar() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay(); // 0 = Minggu
    const totalDays = lastDay.getDate();

    // Nama bulan
    currentMonthSpan.textContent = currentMonth.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

    let gridHTML = "";

    // Hari dari bulan sebelumnya
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDay; i > 0; i--) {
      const day = prevMonthLastDay - i + 1;
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      gridHTML += `<div class="calendar-day other-month" data-date="${dateStr}">${day}</div>`;
    }

    // Hari bulan ini
    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(year, month, d);
      const hasTask = tasks.some(task => {
        const taskDate = new Date(task.date);
        return taskDate.getFullYear() === year && taskDate.getMonth() === month && taskDate.getDate() === d;
      });
      const className = `calendar-day ${hasTask ? "has-task" : ""}`;
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      gridHTML += `<div class="${className}" data-date="${dateStr}">${d}</div>`;
    }

    // Hari bulan depan untuk memenuhi 42 sel
    const nextDays = 42 - (startDay + totalDays);
    for (let i = 1; i <= nextDays; i++) {
      const dateStr = `${year}-${String(month + 2).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      gridHTML += `<div class="calendar-day other-month" data-date="${dateStr}">${i}</div>`;
    }

    calendarGrid.innerHTML = gridHTML;

    // Tambahkan event listener ke setiap hari
    document.querySelectorAll(".calendar-day").forEach(day => {
      day.addEventListener("click", () => {
        const dateStr = day.dataset.date;
        if (!dateStr) return;
        const [y, m, d] = dateStr.split("-").map(Number);
        const selectedDate = new Date(y, m - 1, d);

        // Filter task pada tanggal tersebut
        const tasksOnDate = tasks.filter(task => {
          const taskDate = new Date(task.date);
          return taskDate.getFullYear() === y && taskDate.getMonth() === m - 1 && taskDate.getDate() === d;
        });

        selectedDateSpan.textContent = selectedDate.toLocaleDateString("id-ID", {
          weekday: "long", year: "numeric", month: "long", day: "numeric"
        });

        if (tasksOnDate.length > 0) {
          taskListDate.innerHTML = tasksOnDate.map(task => `
            <li>
              <span>
                <strong>${task.text}</strong> <small>(${task.category})</small>
              </span>
              <small>${task.done ? "✅ Selesai" : "⏳ Belum"}</small>
            </li>
          `).join("");
        } else {
          taskListDate.innerHTML = "<li>Tidak ada task pada tanggal ini</li>";
        }
      });
    });
  }

  // Navigasi bulan
  prevMonthBtn.addEventListener("click", () => {
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    renderCalendar();
  });
  nextMonthBtn.addEventListener("click", () => {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    renderCalendar();
  });

  // ===== SWIPE DELETE (mobile) =====
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

  // Inisialisasi tampilan awal
  listView.classList.remove("hidden");
  calendarView.classList.add("hidden");
  // Set tanggal minimum di input date ke hari ini
  const today = new Date().toISOString().split("T")[0];
  dateInput.min = today;
});

