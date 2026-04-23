const pages = {
  housekeeper: renderHousekeeperPage,
  frontdesk: renderFrontDeskPage,
};

let currentHousekeeperRooms = [];
const housekeeperRefreshIntervalMs = 8000;
let housekeeperRefreshTimer = null;
let housekeeperControlsInitialized = false;

async function init() {
  const pageType = document.body.dataset.page;
  const rooms = await fetchRooms();
  const render = pages[pageType];

  if (!render) {
    console.error(`Unknown page type: ${pageType}`);
    return;
  }

  render(rooms);
}

function setupHousekeeperControls() {
  const housekeeperSelect = document.getElementById("housekeeper-filter");
  const frontdeskSelect = document.getElementById("frontdesk-filter");
  const searchInput = document.getElementById("search-input");

  housekeeperSelect.addEventListener("change", () => renderHousekeeperRows(filterRooms()));
  frontdeskSelect.addEventListener("change", () => renderHousekeeperRows(filterRooms()));
  searchInput.addEventListener("input", () => renderHousekeeperRows(filterRooms()));
}

function updateHousekeeperFilters(rooms) {
  const housekeeperSelect = document.getElementById("housekeeper-filter");
  const selectedHousekeeper = housekeeperSelect.value;

  const housekeepers = [...new Set(rooms.map((room) => room.assignedTo).filter(Boolean))].sort();
  housekeeperSelect.innerHTML = `<option value="">All</option>` + housekeepers
    .map((housekeeper) => `
      <option value="${housekeeper}">${housekeeper}</option>
    `)
    .join("");

  if (selectedHousekeeper) {
    housekeeperSelect.value = selectedHousekeeper;
  }
}

async function refreshHousekeeperRooms() {
  const rooms = await fetchRooms();
  currentHousekeeperRooms = rooms;
  updateHousekeeperFilters(rooms);
  renderHousekeeperRows(filterRooms());
}

function startHousekeeperAutoRefresh() {
  if (housekeeperRefreshTimer) return;
  housekeeperRefreshTimer = setInterval(refreshHousekeeperRooms, housekeeperRefreshIntervalMs);
}

async function fetchRooms() {
  try {
    const response = await fetch("/api/rooms");
    if (!response.ok) throw new Error("Failed to load rooms");
    return await response.json();
  } catch (error) {
    console.error(error);
    alert("Could not load rooms. Check your server connection.");
    return [];
  }
}

function renderHousekeeperPage(rooms) {
  currentHousekeeperRooms = rooms;

  if (!housekeeperControlsInitialized) {
    setupHousekeeperControls();
    housekeeperControlsInitialized = true;
  }

  updateHousekeeperFilters(rooms);
  renderHousekeeperRows(rooms);
  startHousekeeperAutoRefresh();
}

function filterRooms() {
  const housekeeperValue = document.getElementById("housekeeper-filter").value.toLowerCase();
  const frontdeskValue = document.getElementById("frontdesk-filter").value.toLowerCase();
  const searchValue = document.getElementById("search-input").value.toLowerCase();

  return currentHousekeeperRooms.filter((room) => {
    const matchesHousekeeper = !housekeeperValue || (room.assignedTo || "").toLowerCase() === housekeeperValue;
    const matchesFrontdesk = !frontdeskValue || (room.frontDeskStatus || "").toLowerCase() === frontdeskValue;
    const matchesSearch = !searchValue || [room.number, room.type, room.assignedTo, room.guestName, room.roomStatus, room.frontDeskStatus]
      .filter(Boolean)
      .some((field) => field.toLowerCase().includes(searchValue));

    return matchesHousekeeper && matchesFrontdesk && matchesSearch;
  });
}

function renderHousekeeperRows(rooms) {
  const tbody = document.getElementById("rooms-body");
  tbody.innerHTML = "";

  rooms.forEach((room) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${room.number}</td>
      <td>${room.type}</td>
      <td>${room.assignedTo || "--"}</td>
      <td>${formatLabel(room.frontDeskStatus) || "--"}</td>
      <td>${room.roomStatus || "--"}</td>
      <td>
        <select class="status-select" data-room-id="${room.id}">
          ${buildOptions(room.roomStatus, ["dirty", "in_process", "clean", "inspected"])}
        </select>
        <button class="update-room-btn" data-room-id="${room.id}">Save</button>
      </td>
    `;

    if (room.frontDeskStatus === "checkout") {
      row.classList.add("checkout");
    } else if (room.frontDeskStatus === "checkin") {
      row.classList.add("checkin");
    }

    tbody.appendChild(row);
  });

  document.querySelectorAll(".update-room-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const roomId = button.dataset.roomId;
      const select = document.querySelector(`.status-select[data-room-id='${roomId}']`);
      const roomStatus = select.value;
      await updateRoomStatus(roomId, roomStatus);
      window.location.reload();
    });
  });
}

function renderFrontDeskPage(rooms) {
  setupFrontDeskForm();

  const tbody = document.getElementById("rooms-body");
  tbody.innerHTML = "";

  rooms.forEach((room) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${room.number}</td>
      <td>
        <input class="assigned-input" data-room-id="${room.id}" value="${room.assignedTo || ""}" placeholder="Assign..." />
      </td>
      <td>
        <select class="roomstatus-select" data-room-id="${room.id}">
          ${buildOptions(room.roomStatus, ["dirty", "in_process", "clean", "inspected"])}
        </select>
      </td>
      <td>
        <select class="frontdesk-select" data-room-id="${room.id}">
          ${buildOptions(room.frontDeskStatus, ["checkin", "checkout"])}
        </select>
      </td>
      <td>
        <button class="frontdesk-update-btn" data-room-id="${room.id}">Update</button>
      </td>
    `;

    if (room.frontDeskStatus === "checkout") {
      row.classList.add("checkout");
    } else if (room.frontDeskStatus === "checkin") {
      row.classList.add("checkin");
    }

    tbody.appendChild(row);
  });

  document.querySelectorAll(".frontdesk-update-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const roomId = button.dataset.roomId;
      const frontdeskSelect = document.querySelector(`.frontdesk-select[data-room-id='${roomId}']`);
      const assignedInput = document.querySelector(`.assigned-input[data-room-id='${roomId}']`);
      const roomStatusSelect = document.querySelector(`.roomstatus-select[data-room-id='${roomId}']`);
      const payload = {
        frontDeskStatus: frontdeskSelect.value,
        assignedTo: assignedInput.value.trim() || undefined,
        roomStatus: roomStatusSelect.value,
      };

      await updateFrontDesk(roomId, payload);
      window.location.reload();
    });
  });
}

function buildOptions(currentValue, values) {
  return values
    .map(
      (value) => `<option value="${value}" ${value === currentValue ? "selected" : ""}>${formatLabel(value)}</option>`
    )
    .join("");
}

function setupFrontDeskForm() {
  const addButton = document.getElementById("add-room-button");
  if (!addButton) return;

  addButton.addEventListener("click", async (event) => {
    event.preventDefault();

    const number = document.getElementById("new-room-number").value.trim();
    const type = document.getElementById("new-room-type").value.trim();
    const assignedTo = document.getElementById("new-room-assigned").value.trim();
    const roomStatus = document.getElementById("new-room-status").value;
    const frontDeskStatus = document.getElementById("new-room-frontdesk").value;

    if (!number || !type || !assignedTo) {
      alert("Please complete room number, type and housekeeper.");
      return;
    }

    const payload = {
      number,
      type,
      assignedTo,
      roomStatus,
      frontDeskStatus,
    };

    await createRoom(payload);
    window.location.reload();
  });
}

async function createRoom(payload) {
  try {
    const response = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error("Could not create room task.");
  } catch (error) {
    console.error(error);
    alert("Error creating new room task.");
  }
}

function formatLabel(value) {
  const labels = {
    dirty: "Dirty",
    in_process: "In process",
    clean: "Clean",
    inspected: "Inspected",
    checkin: "Not checked out",
    checkout: "Checked out",
  };
  return labels[value] || value;
}

async function updateRoomStatus(roomId, roomStatus) {
  try {
    const response = await fetch(`/api/rooms/${roomId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomStatus }),
    });

    if (!response.ok) throw new Error("Could not update room status.");
  } catch (error) {
    console.error(error);
    alert("Error updating cleaning status.");
  }
}

async function updateFrontDesk(roomId, payload) {
  try {
    const response = await fetch(`/api/rooms/${roomId}/frontdesk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error("Could not update front desk data.");
  } catch (error) {
    console.error(error);
    alert("Error updating front desk data.");
  }
}

init();
