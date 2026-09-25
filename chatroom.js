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

/*
=========================
CONNECTION
=========================
*/

socket.on("connect", () => {
status.textContent = "Connected";

```
socket.emit("joinRoom", {
    username: username,
    room: room
});
```

});

socket.on("disconnect", () => {
status.textContent = "Disconnected";
});

/*
=========================
ROOM HISTORY
=========================
*/

socket.on("roomHistory", (messages) => {
messagesContainer.innerHTML = "";

```
for (const message of messages) {
    displayMessage(message);
}

scrollToBottom();
```

});

/*
=========================
NEW MESSAGE
=========================
*/

socket.on("newMessage", (message) => {
displayMessage(message);
scrollToBottom();
});

/*
=========================
SYSTEM MESSAGE
=========================
*/

socket.on("systemMessage", (message) => {
displaySystemMessage(message);
scrollToBottom();
});

/*
=========================
DAILY MESSAGE RESET
=========================
*/

socket.on("messagesCleared", () => {
messagesContainer.innerHTML = "";

```
displaySystemMessage({
    message: "Messages have been cleared for the new day."
});

scrollToBottom();
```

});

/*
=========================
SERVER ERROR
=========================
*/

socket.on("errorMessage", (message) => {
status.textContent = message;
});

/*
=========================
SEND MESSAGE
=========================
*/

messageForm.addEventListener("submit", (event) => {
event.preventDefault();

```
const message =
    messageInput.value.trim();

if (message === "") {
    return;
}

socket.emit("sendMessage", {
    message: message
});

messageInput.value = "";
messageInput.focus();
```

});

/*
=========================
LEAVE ROOM
=========================
*/

leaveButton.addEventListener("click", () => {

```
socket.emit("leaveRoom");

sessionStorage.removeItem("mangoRoom");

window.location.href = "lobby.html";
```

});

/*
=========================
SPAM CHALLENGE
=========================
*/

let spamPopup = null;

socket.on("spamChallenge", (data) => {
showSpamChallenge(data.code);
});

function showSpamChallenge(code) {

```
if (spamPopup) {
    spamPopup.remove();
}

/*
    Disable the chat input while
    the challenge is active.
*/

messageInput.disabled = true;

spamPopup =
    document.createElement("div");

spamPopup.className =
    "spamOverlay";

const box =
    document.createElement("div");

box.className =
    "spamPopup";

const title =
    document.createElement("h2");

title.textContent =
    "Please don't spam.";

const description =
    document.createElement("p");

description.textContent =
    "Please type in this code to continue.";

const codeDisplay =
    document.createElement("div");

codeDisplay.className =
    "spamCode";

codeDisplay.textContent =
    code;

const input =
    document.createElement("input");

input.type = "text";
input.maxLength = 5;
input.placeholder = "Enter code";
input.autocomplete = "off";

const button =
    document.createElement("button");

button.textContent =
    "Continue";

const error =
    document.createElement("p");

error.className =
    "spamError";

box.appendChild(title);
box.appendChild(description);
box.appendChild(codeDisplay);
box.appendChild(input);
box.appendChild(button);
box.appendChild(error);

spamPopup.appendChild(box);

document.body.appendChild(
    spamPopup
);

input.focus();

/*
    Submit button.
*/

button.addEventListener(
    "click",
    () => {

        socket.emit(
            "verifySpamChallenge",
            input.value
        );
    }
);

/*
    Allow Enter key.
*/

input.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key === "Enter"
        ) {

            socket.emit(
                "verifySpamChallenge",
                input.value
            );
        }
    }
);

/*
    Wait for server response.
*/

socket.once(
    "spamChallengeResult",
    (result) => {

        if (result.success) {

            spamPopup.remove();

            spamPopup = null;

            messageInput.disabled =
                false;

            status.textContent =
                "You can send messages again.";

            messageInput.focus();

        } else {

            error.textContent =
                "Incorrect code. Try again.";

            input.value = "";

            input.focus();
        }
    }
);
```

}

/*
=========================
DISPLAY MESSAGE
=========================
*/

function displayMessage(data) {

```
const messageElement =
    document.createElement("div");

messageElement.className =
    "message";

const usernameElement =
    document.createElement("strong");

usernameElement.textContent =
    data.username + ":";

const messageText =
    document.createElement("span");

messageText.textContent =
    data.message;

const timeElement =
    document.createElement("small");

if (data.time) {

    const date =
        new Date(data.time);

    timeElement.textContent =
        date.toLocaleTimeString(
            [],
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );
}

messageElement.appendChild(
    usernameElement
);

messageElement.appendChild(
    messageText
);

messageElement.appendChild(
    timeElement
);

messagesContainer.appendChild(
    messageElement
);
```

}

/*
=========================
DISPLAY SYSTEM MESSAGE
=========================
*/

function displaySystemMessage(data) {

```
const messageElement =
    document.createElement("div");

messageElement.className =
    "systemMessage";

messageElement.textContent =
    data.message;

messagesContainer.appendChild(
    messageElement
);
```

}

/*
=========================
SCROLL
=========================
*/

function scrollToBottom() {

```
messagesContainer.scrollTop =
    messagesContainer.scrollHeight;
```

}
