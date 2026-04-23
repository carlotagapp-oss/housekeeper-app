const express = require("express");
const path = require("path");
const app = express();
const port = process.env.PORT || 4000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const rooms = [
  { id: 101, number: "101", type: "Queen", assignedTo: "Luz", roomStatus: "dirty", frontDeskStatus: "checkout" },
  { id: 102, number: "102", type: "King", assignedTo: "Rosa", roomStatus: "in_process", frontDeskStatus: "checkin" },
  { id: 103, number: "103", type: "Queen", assignedTo: "Juan", roomStatus: "clean", frontDeskStatus: "checkout" },
  { id: 104, number: "104", type: "King", assignedTo: "Luz", roomStatus: "inspected", frontDeskStatus: "checkout" },
  { id: 105, number: "105", type: "Queen", assignedTo: "Rosa", roomStatus: "dirty", frontDeskStatus: "checkin" }
];

app.get("/api/rooms", (req, res) => {
  res.json(rooms);
});

app.post("/api/rooms", (req, res) => {
  const { number, type, assignedTo, roomStatus, frontDeskStatus } = req.body;

  if (!number || !type || !assignedTo || !roomStatus || !frontDeskStatus) {
    return res.status(400).json({ error: "Missing required room fields." });
  }

  const nextId = rooms.length ? Math.max(...rooms.map((room) => room.id)) + 1 : 1;
  const room = {
    id: nextId,
    number,
    type,
    assignedTo,
    roomStatus,
    frontDeskStatus,
  };

  rooms.push(room);
  res.status(201).json(room);
});

app.post("/api/rooms/:id/status", (req, res) => {
  const roomId = Number(req.params.id);
  const { roomStatus } = req.body;
  const room = rooms.find((item) => item.id === roomId);

  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  room.roomStatus = roomStatus;
  res.json(room);
});

app.post("/api/rooms/:id/frontdesk", (req, res) => {
  const roomId = Number(req.params.id);
  const { frontDeskStatus, assignedTo, roomStatus } = req.body;
  const room = rooms.find((item) => item.id === roomId);

  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  if (frontDeskStatus) {
    room.frontDeskStatus = frontDeskStatus;
  }

  if (assignedTo) {
    room.assignedTo = assignedTo;
  }

  if (roomStatus) {
    room.roomStatus = roomStatus;
  }

  res.json(room);
});

app.listen(port, () => {
  console.log(`Housekeeper App started at http://localhost:${port}`);
});
