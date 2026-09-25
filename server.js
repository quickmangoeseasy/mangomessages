const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 1269;

/*
=========================
ROOMS
=========================
*/

const rooms = {
General: [],
Gaming: [],
Random: []
};

const allowedRooms = Object.keys(rooms);

/*
=========================
BANNED WORDS
=========================
*/

const bannedWords = [
"fuck",
"shit",
"bitch",
"asshole",
"bastard",
"dick",
"piss",
"crap"
];

/*
=========================
EXPRESS
=========================
*/

app.use(express.json());
app.use(express.static(__dirname));

app.get("/", (req, res) => {
res.sendFile(path.join(__dirname, "index.html"));
});

/*
=========================
MESSAGE FILTER
=========================
*/

function filterMessage(message) {
let filtered = message;

```
for (const word of bannedWords) {
    const regex = new RegExp("\\b" + word + "\\b", "gi");

    filtered = filtered.replace(
        regex,
        "*".repeat(word.length)
    );
}

return filtered;
```

}

/*
=========================
USERNAME
=========================
*/

function generateUsername() {
const number = Math.floor(
1000 + Math.random() * 9000
);

```
return "Mangoman " + number;
```

}

/*
=========================
SYSTEM MESSAGES
=========================
*/

function createSystemMessage(message) {
return {
type: "system",
message: message,
time: new Date().toISOString()
};
}

/*
=========================
CHAT MESSAGES
=========================
*/

function createChatMessage(username, message) {
return {
type: "message",
username: username,
message: message,
time: new Date().toISOString()
};
}

/*
=========================
DAILY MESSAGE RESET
6:07 AM EASTERN TIME
=========================
*/

let lastResetDate = null;

function checkDailyReset() {
const now = new Date();

```
const easternParts = new Intl.DateTimeFormat(
    "en-US",
    {
        timeZone: "America/New_York",
        hour: "numeric",
        minute: "numeric",
        hour12: false
    }
).formatToParts(now);

const year = new Intl.DateTimeFormat(
    "en-US",
    {
        timeZone: "America/New_York",
        year: "numeric"
    }
).format(now);

const month = new Intl.DateTimeFormat(
    "en-US",
    {
        timeZone: "America/New_York",
        month: "2-digit"
    }
).format(now);

const day = new Intl.DateTimeFormat(
    "en-US",
    {
        timeZone: "America/New_York",
        day: "2-digit"
    }
).format(now);

const hour = Number(
    easternParts.find(
        part => part.type === "hour"
    ).value
);

const minute = Number(
    easternParts.find(
        part => part.type === "minute"
    ).value
);

const dateKey =
    year + "-" + month + "-" + day;

if (
    hour === 6 &&
    minute === 7 &&
    lastResetDate !== dateKey
) {
    rooms.General.length = 0;
    rooms.Gaming.length = 0;
    rooms.Random.length = 0;

    lastResetDate = dateKey;

    console.log(
        "All messages deleted at 6:07 AM Eastern Time."
    );

    /*
        Tell everyone currently online
        that the messages were cleared.
    */

    for (const room of allowedRooms) {
        io.to(room).emit(
            "messagesCleared"
        );
    }
}
```

}

/*
Check every 10 seconds.
*/

setInterval(checkDailyReset, 10000);

/*
=========================
ANTI-SPAM
=========================
*/

function generateSpamCode() {
const characters =
"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

```
let code = "";

for (let i = 0; i < 5; i++) {
    code += characters[
        Math.floor(
            Math.random() * characters.length
        )
    ];
}

return code;
```

}

function checkSpam(socket) {
const now = Date.now();

```
if (!socket.data.messageTimes) {
    socket.data.messageTimes = [];
}

/*
    Only keep messages from the
    last 5 seconds.
*/

socket.data.messageTimes =
    socket.data.messageTimes.filter(
        time => now - time < 5000
    );

socket.data.messageTimes.push(now);

/*
    5 messages within 5 seconds
    triggers the challenge.
*/

if (socket.data.messageTimes.length >= 5) {
    socket.data.messageTimes = [];

    socket.data.spamCode =
        generateSpamCode();

    socket.data.spamBlocked = true;

    socket.emit(
        "spamChallenge",
        {
            code: socket.data.spamCode
        }
    );

    return true;
}

return false;
```

}

/*
=========================
SOCKET.IO
=========================
*/

io.on("connection", (socket) => {

```
console.log(
    "User connected:",
    socket.id
);

socket.data.username = null;
socket.data.room = null;

socket.data.messageTimes = [];
socket.data.spamBlocked = false;
socket.data.spamCode = null;

/*
    Send available rooms.
*/

socket.emit(
    "roomList",
    allowedRooms
);

/*
    =========================
    JOIN ROOM
    =========================
*/

socket.on("joinRoom", (data) => {

    if (
        !data ||
        typeof data !== "object"
    ) {
        return;
    }

    let username =
        String(
            data.username || ""
        ).trim();

    const room =
        String(
            data.room || ""
        ).trim();

    if (username === "") {
        username =
            generateUsername();
    }

    username =
        username.slice(0, 24);

    /*
        Make sure the room exists.
    */

    if (
        !allowedRooms.includes(room)
    ) {
        socket.emit(
            "errorMessage",
            "That room does not exist."
        );

        return;
    }

    /*
        Already in this room.
    */

    if (socket.data.room === room) {
        return;
    }

    /*
        Leave previous room.
    */

    if (socket.data.room) {

        const oldRoom =
            socket.data.room;

        socket.leave(oldRoom);

        io.to(oldRoom).emit(
            "systemMessage",
            createSystemMessage(
                username +
                " left the room!"
            )
        );
    }

    /*
        Save user information.
    */

    socket.data.username =
        username;

    socket.data.room =
        room;

    /*
        Join Socket.IO room.
    */

    socket.join(room);

    /*
        Send previous messages
        to the user.
    */

    socket.emit(
        "roomHistory",
        rooms[room]
    );

    /*
        Tell everyone in the room
        that the user joined.
    */

    io.to(room).emit(
        "systemMessage",
        createSystemMessage(
            username +
            " joined the room!"
        )
    );

    console.log(
        username +
        " joined " +
        room
    );
});

/*
    =========================
    SEND MESSAGE
    =========================
*/

socket.on("sendMessage", (data) => {

    /*
        Don't allow messages while
        the spam challenge is active.
    */

    if (socket.data.spamBlocked) {
        return;
    }

    /*
        Check for spam.
    */

    if (checkSpam(socket)) {
        return;
    }

    if (
        !data ||
        typeof data !== "object"
    ) {
        return;
    }

    const room =
        socket.data.room;

    /*
        User must be inside a room.
    */

    if (
        !room ||
        !rooms[room]
    ) {
        socket.emit(
            "errorMessage",
            "Join a room first."
        );

        return;
    }

    let message =
        String(
            data.message || ""
        ).trim();

    if (message === "") {
        return;
    }

    /*
        Limit message length.
    */

    message =
        message.slice(0, 500);

    /*
        Filter banned words.
    */

    message =
        filterMessage(message);

    /*
        Create message.
    */

    const chatMessage =
        createChatMessage(
            socket.data.username,
            message
        );

    /*
        Save message.
    */

    rooms[room].push(
        chatMessage
    );

    /*
        Keep only the latest
        100 messages.
    */

    if (
        rooms[room].length > 100
    ) {
        rooms[room].shift();
    }

    /*
        Send message to everyone
        in the room.
    */

    io.to(room).emit(
        "newMessage",
        chatMessage
    );
});

/*
    =========================
    VERIFY SPAM CODE
    =========================
*/

socket.on(
    "verifySpamChallenge",
    (enteredCode) => {

        if (
            !socket.data.spamBlocked
        ) {
            return;
        }

        const code =
            String(
                enteredCode || ""
            )
            .trim()
            .toUpperCase();

        if (
            code ===
            socket.data.spamCode
        ) {

            socket.data.spamBlocked =
                false;

            socket.data.spamCode =
                null;

            socket.emit(
                "spamChallengeResult",
                {
                    success: true
                }
            );

            console.log(
                socket.data.username +
                " passed the spam challenge."
            );

        } else {

            socket.emit(
                "spamChallengeResult",
                {
                    success: false
                }
            );
        }
    }
);

/*
    =========================
    LEAVE ROOM
    =========================
*/

socket.on("leaveRoom", () => {

    const room =
        socket.data.room;

    const username =
        socket.data.username;

    if (!room) {
        return;
    }

    socket.leave(room);

    io.to(room).emit(
        "systemMessage",
        createSystemMessage(
            username +
            " left the room!"
        )
    );

    console.log(
        username +
        " left " +
        room
    );

    socket.data.room =
        null;
});

/*
    =========================
    DISCONNECT
    =========================
*/

socket.on("disconnect", () => {

    const room =
        socket.data.room;

    const username =
        socket.data.username;

    if (
        room &&
        username
    ) {

        io.to(room).emit(
            "systemMessage",
            createSystemMessage(
                username +
                " left the room!"
            )
        );

        console.log(
            username +
            " disconnected from " +
            room
        );

    } else {

        console.log(
            "User disconnected:",
            socket.id
        );
    }
});
```

});

/*
=========================
START SERVER
=========================
*/

server.listen(
PORT,
() => {
console.log(
"MangoMessage server running on port " +
PORT
);
}
);
