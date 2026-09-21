const socket = io();

const messagesContainer = document.getElementById("messages");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const leaveButton = document.getElementById("leaveButton");
const status = document.getElementById("status");

const username = sessionStorage.getItem("mangoUsername");
const room = sessionStorage.getItem("mangoRoom");

if (!username || !room) {
    window.location.href = "index.html";
}

socket.on("connect", () => {
    status.textContent = "Connected";

    socket.emit("joinRoom", {
        username: username,
        room: room
    });
});

socket.on("disconnect", () => {
    status.textContent = "Disconnected";
});

socket.on("roomHistory", (messages) => {
    messagesContainer.innerHTML = "";

    for (const message of messages) {
        displayMessage(message);
    }

    scrollToBottom();
});

socket.on("newMessage", (message) => {
    displayMessage(message);
    scrollToBottom();
});

socket.on("systemMessage", (message) => {
    displaySystemMessage(message);
    scrollToBottom();
});

socket.on("errorMessage", (message) => {
    status.textContent = message;
});

messageForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const message = messageInput.value.trim();

    if (message === "") {
        return;
    }

    socket.emit("sendMessage", {
        message: message
    });

    messageInput.value = "";
    messageInput.focus();
});

leaveButton.addEventListener("click", () => {
    socket.emit("leaveRoom");

    sessionStorage.removeItem("mangoRoom");

    window.location.href = "lobby.html";
});

function displayMessage(data) {
    const messageElement = document.createElement("div");
    messageElement.className = "message";

    const usernameElement = document.createElement("strong");
    usernameElement.textContent = data.username + ": ";

    const messageText = document.createElement("span");
    messageText.textContent = data.message;

    const timeElement = document.createElement("small");

    if (data.time) {
        const date = new Date(data.time);

        timeElement.textContent = date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    messageElement.appendChild(usernameElement);
    messageElement.appendChild(messageText);
    messageElement.appendChild(timeElement);

    messagesContainer.appendChild(messageElement);
}

function displaySystemMessage(data) {
    const messageElement = document.createElement("div");

    messageElement.className = "systemMessage";

    messageElement.textContent = data.message;

    messagesContainer.appendChild(messageElement);
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}