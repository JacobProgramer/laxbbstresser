const canvas = document.getElementById("snow");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let flakes = [];
const maxFlakes = 280;

class Snowflake {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * -canvas.height;
        this.size = 3;
        this.speed = 0.6 + Math.random() * 1.4;
        this.wind = Math.random() * 0.6 - 0.3;
    }

    update() {
        this.y += this.speed;
        this.x += this.wind;

        if (this.y > canvas.height) this.reset();
    }

    draw() {
        ctx.fillStyle = "rgb(0,180,255)";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

for (let i = 0; i < maxFlakes; i++) flakes.push(new Snowflake());

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    flakes.forEach(f => {
        f.update();
        f.draw();
    });

    requestAnimationFrame(animate);
}

animate();

const translations = {
    en: {
        title: "LAXBB STRESSER",
        targetPlaceholder: "Enter Target (IP:PORT)",
        btnStress: "Stress",
        languageLabel: "Language:",
        footer: "Copyright © LaxbbStresser 2025 All rights reserved.",
        duration: "Duration (sec):",
        stop: "Stop",
        attacking: "Attacking"
    },
    pl: {
        title: "LAXBB STRESSER",
        targetPlaceholder: "Wpisz cel (IP:PORT)",
        btnStress: "Atak",
        languageLabel: "Język:",
        footer: "Copyright © LaxbbStresser 2025 Wszelkie prawa zastrzeżone.",
        duration: "Czas (sek):",
        stop: "Stop",
        attacking: "Atakuje"
    }
};

const langSelect = document.getElementById("lang-select");

function updateLanguage(lang) {
    const t = translations[lang];

    document.querySelector(".title").textContent = t.title;
    document.querySelector(".input").placeholder = t.targetPlaceholder;
    document.querySelector(".btn").textContent = t.btnStress;
    document.querySelector(".lang-box label").textContent = t.languageLabel;
    document.querySelector(".footer").textContent = t.footer;
}

langSelect.addEventListener("change", (e) => {
    updateLanguage(e.target.value);
});

updateLanguage("en");

let currentAttackId = null;

document.querySelector(".btn").addEventListener("click", async () => {
    const target = document.querySelector(".input").value;
    const method = document.querySelector(".method-select").value;
    const btn = document.querySelector(".btn");
    
    if (!target) {
        alert("Enter target!");
        return;
    }

    const duration = prompt("Attack duration (seconds, max 300):", "60");
    if (!duration || isNaN(duration)) {
        alert("Invalid duration!");
        return;
    }

    btn.textContent = translations[langSelect.value].attacking + "...";
    btn.disabled = true;

    try {
        const response = await fetch("/api/attack", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                target: target,
                method: method,
                duration: duration
            })
        });

        const data = await response.json();
        
        if (data.success) {
            currentAttackId = data.attackId;
            alert("Attack started successfully!");
            
            const stopBtn = document.createElement("button");
            stopBtn.textContent = translations[langSelect.value].stop;
            stopBtn.className = "btn-stop";
            stopBtn.style.marginLeft = "10px";
            stopBtn.style.background = "red";
            
            stopBtn.addEventListener("click", stopAttack);
            document.querySelector(".search-box").appendChild(stopBtn);
            
        } else {
            alert("Error: " + data.error);
        }
    } catch (error) {
        alert("Connection error!");
    } finally {
        btn.textContent = translations[langSelect.value].btnStress;
        btn.disabled = false;
    }
});

async function stopAttack() {
    if (!currentAttackId) return;
    
    try {
        const response = await fetch("/api/stop", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                attackId: currentAttackId
            })
        });

        const data = await response.json();
        if (data.success) {
            alert("Attack stopped!");
            currentAttackId = null;
            document.querySelector(".btn-stop").remove();
        }
    } catch (error) {
        alert("Error stopping attack");
    }
}

window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

async function checkStatus() {
    try {
        const response = await fetch("/api/status");
        const data = await response.json();
        
        if (data.activeAttacks.length > 0) {
            console.log("Active attacks:", data.activeAttacks);
        }
    } catch (error) {
        console.log("Status check failed");
    }
}

setInterval(checkStatus, 10000);