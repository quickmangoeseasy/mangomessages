const usernameForm = document.getElementById("usernameForm");
const usernameInput = document.getElementById("username");
const status = document.getElementById("status");

if (usernameForm) {
    usernameForm.addEventListener("submit", (event) => {
        event.preventDefault();

        let username = usernameInput.value.trim();

        if (username === "") {
            const number = Math.floor(1000 + Math.random() * 9000);
            username = "Mangoman " + number;
        }

        username = username.slice(0, 24);

        sessionStorage.setItem("mangoUsername", username);

        window.location.href = "lobby.html";
    });
}