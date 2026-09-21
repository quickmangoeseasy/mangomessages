const socket = io();

const status = document.getElementById("status");
const roomButtons = document.querySelectorAll(".roomButton");

const username = sessionStorage.getItem("mangoUsername");

if (!username) {
    window.location.href = "index.html";
}

socket.on("connect", () => {
    status.textContent = "Connected";
});

socket.on("disconnect", () => {
    status.textContent = "Disconnected";
});

roomButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const room = button.dataset.room;

        if (!room) {
            return;
        }

        sessionStorage.setItem("mangoRoom", room);

        if (room === "General") {
            window.location.href = "chatroom1.html";
        }

        if (room === "Gaming") {
            window.location.href = "chatroom2.html";
        }

        if (room === "Random") {
            window.location.href = "chatroom3.html";
        }
    });
});