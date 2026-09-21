const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 1269;

const rooms = {
    General: [],
    Gaming: [],
    Random: []
};

let lastResetDate = null;

function checkDailyReset() {
    const now = new Date();

    const easternTime = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "numeric",
        minute: "numeric",
        hour12: false
    }).formatToParts(now);

    const year = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        year: "numeric"
    }).format(now);

    const month = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        month: "2-digit"
    }).format(now);

    const day = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        day: "2-digit"
    }).format(now);

    const hour = Number(
        easternTime.find(part => part.type === "hour").value
    );

    const minute = Number(
        easternTime.find(part => part.type === "minute").value
    );

    const dateKey = year + "-" + month + "-" + day;

    if (hour === 6 && minute === 7 && lastResetDate !== dateKey) {
        rooms.General.length = 0;
        rooms.Gaming.length = 0;
        rooms.Random.length = 0;

        lastResetDate = dateKey;

        console.log("Daily message reset completed at 6:07 AM Eastern Time.");
    }
}

setInterval(checkDailyReset, 10000);

const allowedRooms = Object.keys(rooms);

const bannedWords = [
    "fuck",
    "shit",
    "bitch",
    "asshole",
    "bastard",
    "dick",
    "piss",
    "crap",
    "i hate aavyaan",
];

app.use(express.json());
app.use(express.static(__dirname));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

function filterMessage(message) {
    let filtered = message;

    for (const word of bannedWords) {
        const regex = new RegExp("\\b" + word + "\\b", "gi");
        filtered = filtered.replace(regex, "*".repeat(word.length));
    }

    return filtered;
}

function generateUsername() {
    const number = Math.floor(1000 + Math.random() * 9000);
    return "Mangoman " + number;
}

function createSystemMessage(message) {
    return {
        type: "system",
        message: message,
        time: new Date().toISOString()
    };
}

function createChatMessage(username, message) {
    return {
        type: "message",
        username: username,
        message: message,
        time: new Date().toISOString()
    };
}

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.data.username = null;
    socket.data.room = null;

    socket.emit("roomList", allowedRooms);

    socket.on("joinRoom", (data) => {
        if (!data || typeof data !== "object") {
            return;
        }

        let username = String(data.username || "").trim();
        const room = String(data.room || "").trim();

        if (username === "") {
            username = generateUsername();
        }

        username = username.slice(0, 24);

        if (!allowedRooms.includes(room)) {
            socket.emit("errorMessage", "That room does not exist.");
            return;
        }

        if (socket.data.room === room) {
            return;
        }

        if (socket.data.room) {
            const oldRoom = socket.data.room;

            socket.leave(oldRoom);

            io.to(oldRoom).emit(
                "systemMessage",
                createSystemMessage(
                    username + " left the room!"
                )
            );
        }

        socket.data.username = username;
        socket.data.room = room;

        socket.join(room);

        socket.emit("roomHistory", rooms[room]);

        io.to(room).emit(
            "systemMessage",
            createSystemMessage(
                username + " joined the room!"
            )
        );

        console.log(username + " joined " + room);
    });

    socket.on("sendMessage", (data) => {
        if (!data || typeof data !== "object") {
            return;
        }

        const room = socket.data.room;

        if (!room || !rooms[room]) {
            socket.emit("errorMessage", "Join a room first.");
            return;
        }

        let message = String(data.message || "").trim();

        if (message === "") {
            return;
        }

        message = message.slice(0, 500);
        message = filterMessage(message);

        const chatMessage = createChatMessage(
            socket.data.username,
            message
        );

        rooms[room].push(chatMessage);

        if (rooms[room].length > 100) {
            rooms[room].shift();
        }

        io.to(room).emit("newMessage", chatMessage);
    });

    socket.on("leaveRoom", () => {
        const room = socket.data.room;
        const username = socket.data.username;

        if (!room) {
            return;
        }

        socket.leave(room);

        io.to(room).emit(
            "systemMessage",
            createSystemMessage(
                username + " left the room!"
            )
        );

        console.log(username + " left " + room);

        socket.data.room = null;
    });

    socket.on("disconnect", () => {
        const room = socket.data.room;
        const username = socket.data.username;

        if (room && username) {
            io.to(room).emit(
                "systemMessage",
                createSystemMessage(
                    username + " left the room!"
                )
            );

            console.log(username + " disconnected from " + room);
        } else {
            console.log("User disconnected:", socket.id);
        }
    });
});

server.listen(PORT, () => {
    console.log("MangoMessage server running on port " + PORT);
});