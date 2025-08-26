(() => {
    "use strict";

    const canvas = document.getElementById("game");
    const ctx = canvas.getContext("2d");
    const overlay = document.getElementById("overlay");
    const startBtn = document.getElementById("startBtn");
    const scoreEl = document.querySelector("#score span");
    const timerEl = document.getElementById("timer");
    const timebar = document.getElementById("timebar");
    const joystick = document.getElementById("joystick");
    const stick = document.getElementById("stick");

    function resize() {
        const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        const w = window.innerWidth;
        const h = window.innerHeight;
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = w + "px";
        canvas.style.height = h + "px";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    window.addEventListener("resize", resize);
    resize();

    // Game state
    const GAME_DURATION_SECONDS = 60;
    const WORLD_PADDING = 24;

    const input = {
        up: false,
        down: false,
        left: false,
        right: false,
        joyX: 0,
        joyY: 0,
    };

    const keys = new Map([
        ["KeyW", "up"],
        ["ArrowUp", "up"],
        ["KeyS", "down"],
        ["ArrowDown", "down"],
        ["KeyA", "left"],
        ["ArrowLeft", "left"],
        ["KeyD", "right"],
        ["ArrowRight", "right"],
    ]);

    let state = createInitialState();

    function createInitialState() {
        const snail = {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
            radius: 16,
            speed: 200,
            angle: 0,
        };
        return {
            running: false,
            score: 0,
            timeLeft: GAME_DURATION_SECONDS,
            lastTime: performance.now(),
            snail,
            veggies: spawnVeggies(12),
        };
    }

    function rand(min, max) {
        return Math.random() * (max - min) + min;
    }

    function spawnVeggies(count) {
        const arr = [];
        for (let i = 0; i < count; i++) {
            arr.push(createVeggie());
        }
        return arr;
    }

    function createVeggie() {
        const margin = WORLD_PADDING + 20;
        const x = rand(margin, window.innerWidth - margin);
        const y = rand(margin, window.innerHeight - margin);
        const typePool = [
            "carrot",
            "tomato",
            "lettuce",
            "broccoli",
            "eggplant",
        ];
        const type = typePool[Math.floor(rand(0, typePool.length))];
        const base = rand(12, 18);
        const angle = rand(0, Math.PI * 2);
        const colorMap = {
            lettuce: "#65d687",
            carrot: "#f97316",
            tomato: "#ef4444",
            broccoli: "#16a34a",
            eggplant: "#8b5cf6",
        };
        return { x, y, radius: base, type, angle, color: colorMap[type] };
    }

    function resetGame() {
        state = createInitialState();
        updateHUD();
    }

    function startGame() {
        resetGame();
        overlay.classList.remove("show");
        state.running = true;
        state.lastTime = performance.now();
        requestAnimationFrame(loop);
    }

    startBtn.addEventListener("click", startGame);

    // Keyboard input
    window.addEventListener(
        "keydown",
        (e) => {
            const k = keys.get(e.code);
            if (k) {
                input[k] = true;
                e.preventDefault();
            }
        },
        { passive: false }
    );
    window.addEventListener(
        "keyup",
        (e) => {
            const k = keys.get(e.code);
            if (k) {
                input[k] = false;
                e.preventDefault();
            }
        },
        { passive: false }
    );

    // Joystick input (touch)
    const joy = {
        active: false,
        cx: 0,
        cy: 0,
        radius: 50,
    };

    function updateJoystick(clientX, clientY) {
        const rect = joystick.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const dx = x - rect.width / 2;
        const dy = y - rect.height / 2;
        const dist = Math.hypot(dx, dy);
        const max = joy.radius;
        const clamped = Math.min(dist, max);
        const nx = dx / max;
        const ny = dy / max;
        input.joyX = Math.max(-1, Math.min(1, nx));
        input.joyY = Math.max(-1, Math.min(1, ny));
        const angle = Math.atan2(dy, dx);
        const px = Math.cos(angle) * clamped;
        const py = Math.sin(angle) * clamped;
        stick.style.transform = `translate(${px}px, ${py}px)`;
    }

    function resetJoystick() {
        input.joyX = 0;
        input.joyY = 0;
        stick.style.transform = `translate(-50%, -50%)`;
    }

    function showJoystick(show) {
        joystick.classList.toggle("show", !!show);
    }

    // Enable joystick on touch devices
    const isTouch = matchMedia("(hover: none) and (pointer: coarse)").matches;
    if (isTouch) showJoystick(true);

    joystick.addEventListener(
        "touchstart",
        (e) => {
            joy.active = true;
            const t = e.changedTouches[0];
            updateJoystick(t.clientX, t.clientY);
            e.preventDefault();
        },
        { passive: false }
    );
    joystick.addEventListener(
        "touchmove",
        (e) => {
            if (!joy.active) return;
            const t = e.changedTouches[0];
            updateJoystick(t.clientX, t.clientY);
            e.preventDefault();
        },
        { passive: false }
    );
    joystick.addEventListener("touchend", () => {
        joy.active = false;
        resetJoystick();
    });

    function updateHUD() {
        scoreEl.textContent = String(state.score);
        const secs = Math.max(0, Math.ceil(state.timeLeft));
        timerEl.textContent = secs + "s";
        if (timebar) {
            const pct = Math.max(
                0,
                Math.min(1, state.timeLeft / GAME_DURATION_SECONDS)
            );
            timebar.style.transform = `scaleX(${pct})`;
            // color shift near the end
            if (pct < 0.2) {
                timebar.style.background =
                    "linear-gradient(90deg, #ef4444, #f97316)";
            } else if (pct < 0.5) {
                timebar.style.background =
                    "linear-gradient(90deg, #f59e0b, #a3e635)";
            } else {
                timebar.style.background =
                    "linear-gradient(90deg, #22c55e, #a3e635)";
            }
        }
    }

    function loop(now) {
        if (!state.running) return;
        const dt = Math.min(0.05, (now - state.lastTime) / 1000);
        state.lastTime = now;

        step(dt);
        draw();
        requestAnimationFrame(loop);
    }

    function step(dt) {
        state.timeLeft -= dt;
        if (state.timeLeft <= 0) {
            state.timeLeft = 0;
            endGame();
            return;
        }

        const snail = state.snail;
        let vx = 0,
            vy = 0;
        if (input.up) vy -= 1;
        if (input.down) vy += 1;
        if (input.left) vx -= 1;
        if (input.right) vx += 1;
        // Touch joystick overrides if active
        if (Math.abs(input.joyX) > 0.05 || Math.abs(input.joyY) > 0.05) {
            vx = input.joyX;
            vy = input.joyY;
        }

        const len = Math.hypot(vx, vy) || 1;
        vx /= len;
        vy /= len;
        snail.x += vx * snail.speed * dt;
        snail.y += vy * snail.speed * dt;
        if (vx || vy) snail.angle = Math.atan2(vy, vx);

        // Keep in bounds (viewport bounds)
        const minX = WORLD_PADDING + snail.radius;
        const minY = WORLD_PADDING + snail.radius;
        const maxX = window.innerWidth - WORLD_PADDING - snail.radius;
        const maxY = window.innerHeight - WORLD_PADDING - snail.radius;
        snail.x = Math.max(minX, Math.min(maxX, snail.x));
        snail.y = Math.max(minY, Math.min(maxY, snail.y));

        // Collisions with veggies
        for (let i = 0; i < state.veggies.length; i++) {
            const v = state.veggies[i];
            const d = Math.hypot(v.x - snail.x, v.y - snail.y);
            if (d < v.radius + snail.radius * 0.8) {
                // Eat veggie
                state.score += 1;
                state.veggies[i] = createVeggie();
                updateHUD();
            }
        }
    }

    function draw() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        // Clear with subtle vignette
        const grad = ctx.createRadialGradient(
            w / 2,
            h / 2,
            Math.min(w, h) * 0.2,
            w / 2,
            h / 2,
            Math.max(w, h) * 0.6
        );
        grad.addColorStop(0, "#0b1220");
        grad.addColorStop(1, "#0f172a");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // World bounds (viewport-sized)
        ctx.strokeStyle = "rgba(226,232,240,0.12)";
        ctx.lineWidth = 2;
        ctx.strokeRect(
            WORLD_PADDING,
            WORLD_PADDING,
            w - WORLD_PADDING * 2,
            h - WORLD_PADDING * 2
        );

        // Veggies
        for (const v of state.veggies) {
            drawVeggie(v);
        }

        // Snail
        drawSnail(state.snail);
    }

    function drawVeggie(v) {
        ctx.save();
        ctx.translate(v.x, v.y);
        const r = v.radius;
        switch (v.type) {
            case "carrot": {
                ctx.rotate(v.angle || 0);
                const bodyW = r * 1.0;
                const bodyH = r * 1.8;
                // body (rounded tapered)
                const grad = ctx.createLinearGradient(
                    -bodyW * 0.3,
                    -bodyH,
                    bodyW,
                    bodyH
                );
                grad.addColorStop(0, "#fb923c");
                grad.addColorStop(1, "#ea580c");
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.moveTo(-bodyW * 0.45, -bodyH * 0.6);
                ctx.lineTo(bodyW * 0.95, 0);
                ctx.quadraticCurveTo(
                    -bodyW * 0.2,
                    bodyH * 0.65,
                    -bodyW * 0.35,
                    bodyH * 0.6
                );
                ctx.quadraticCurveTo(
                    -bodyW * 0.55,
                    bodyH * 0.15,
                    -bodyW * 0.45,
                    -bodyH * 0.6
                );
                ctx.closePath();
                ctx.fill();
                // subtle outline
                ctx.strokeStyle = "rgba(0,0,0,0.25)";
                ctx.lineWidth = 1.5;
                ctx.stroke();
                // ridges
                ctx.strokeStyle = "rgba(0,0,0,0.2)";
                ctx.lineWidth = 1;
                for (let i = -2; i <= 2; i++) {
                    const t = i / 5;
                    ctx.beginPath();
                    ctx.ellipse(
                        0,
                        t * bodyH * 0.8,
                        bodyW * (0.7 - Math.abs(t) * 0.4),
                        bodyH * 0.06,
                        0,
                        0,
                        Math.PI * 2
                    );
                    ctx.stroke();
                }
                // highlight
                ctx.fillStyle = "rgba(255,255,255,0.18)";
                ctx.beginPath();
                ctx.ellipse(
                    -bodyW * 0.1,
                    -bodyH * 0.25,
                    bodyW * 0.12,
                    bodyH * 0.18,
                    -Math.PI / 8,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
                // leaves (more defined)
                ctx.fillStyle = "#22c55e";
                const leafs = [
                    [-bodyW * 0.55, -bodyH * 0.45, -Math.PI / 6],
                    [-bodyW * 0.7, -bodyH * 0.3, Math.PI / 12],
                    [-bodyW * 0.5, -bodyH * 0.15, 0],
                ];
                for (const [lx, ly, rot] of leafs) {
                    ctx.save();
                    ctx.translate(lx, ly);
                    ctx.rotate(rot);
                    ctx.beginPath();
                    ctx.ellipse(0, 0, r * 0.22, r * 0.5, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
                break;
            }
            case "tomato": {
                // body
                ctx.fillStyle = v.color;
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
                ctx.fill();
                // stem/star
                ctx.fillStyle = "#22c55e";
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const a = (i / 5) * Math.PI * 2;
                    ctx.lineTo(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6);
                    ctx.lineTo(
                        Math.cos(a + Math.PI / 5) * r * 0.2,
                        Math.sin(a + Math.PI / 5) * r * 0.2
                    );
                }
                ctx.closePath();
                ctx.fill();
                // highlight
                ctx.fillStyle = "rgba(255,255,255,0.35)";
                ctx.beginPath();
                ctx.ellipse(
                    -r * 0.3,
                    -r * 0.3,
                    r * 0.2,
                    r * 0.35,
                    Math.PI / 6,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
                break;
            }
            case "lettuce": {
                ctx.fillStyle = v.color;
                ctx.beginPath();
                // wavy circle
                for (let i = 0; i <= 14; i++) {
                    const a = (i / 14) * Math.PI * 2;
                    const rad = r * (0.8 + 0.15 * Math.sin(a * 3));
                    const px = Math.cos(a) * rad;
                    const py = Math.sin(a) * rad;
                    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
                // veins
                ctx.strokeStyle = "rgba(255,255,255,0.25)";
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(-r * 0.2, r * 0.7);
                ctx.quadraticCurveTo(0, 0, r * 0.2, -r * 0.6);
                ctx.moveTo(-r * 0.4, r * 0.4);
                ctx.quadraticCurveTo(0, 0, r * 0.4, -r * 0.2);
                ctx.stroke();
                break;
            }
            case "broccoli": {
                // stalk
                ctx.fillStyle = "#16a34a";
                ctx.beginPath();
                ctx.roundRect(-r * 0.25, 0, r * 0.5, r * 0.9, r * 0.2);
                ctx.fill();
                // florets
                ctx.fillStyle = "#22c55e";
                const tops = [
                    [-r * 0.6, -r * 0.1],
                    [0, -r * 0.3],
                    [r * 0.6, -r * 0.1],
                ];
                for (const [tx, ty] of tops) {
                    ctx.beginPath();
                    ctx.arc(tx, ty - r * 0.2, r * 0.6, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
            }
            case "eggplant": {
                ctx.rotate(v.angle || 0);
                // body
                const w = r * 0.9;
                const h = r * 1.6;
                ctx.fillStyle = v.color;
                ctx.beginPath();
                ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
                ctx.fill();
                // cap
                ctx.fillStyle = "#22c55e";
                ctx.beginPath();
                ctx.ellipse(
                    -w * 0.2,
                    -h * 0.7,
                    w * 0.7,
                    h * 0.35,
                    -Math.PI / 10,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
                break;
            }
            default: {
                // fallback circle
                ctx.fillStyle = v.color || "#a3e635";
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI * 2);
                ctx.fill();
                break;
            }
        }
        ctx.restore();
    }

    function drawSnail(s) {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.angle);

        // Body
        ctx.fillStyle = "#22c55e";
        ctx.beginPath();
        ctx.ellipse(0, 0, s.radius * 1.1, s.radius * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.beginPath();
        ctx.arc(s.radius * 0.9, 0, s.radius * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = "#16a34a";
        ctx.fill();

        // Eyes
        const eyeX = s.radius * 1.2;
        ctx.fillStyle = "#e2e8f0";
        ctx.beginPath();
        ctx.arc(eyeX, -s.radius * 0.2, s.radius * 0.14, 0, Math.PI * 2);
        ctx.arc(eyeX, s.radius * 0.2, s.radius * 0.14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.arc(
            eyeX + s.radius * 0.05,
            -s.radius * 0.2,
            s.radius * 0.07,
            0,
            Math.PI * 2
        );
        ctx.arc(
            eyeX + s.radius * 0.05,
            s.radius * 0.2,
            s.radius * 0.07,
            0,
            Math.PI * 2
        );
        ctx.fill();

        // Shell
        ctx.translate(-s.radius * 0.6, 0);
        const shellR = s.radius * 0.85;
        const shellGrad = ctx.createRadialGradient(
            -shellR * 0.2,
            -shellR * 0.2,
            shellR * 0.3,
            0,
            0,
            shellR
        );
        shellGrad.addColorStop(0, "#fde68a");
        shellGrad.addColorStop(1, "#f59e0b");
        ctx.fillStyle = shellGrad;
        ctx.beginPath();
        ctx.arc(0, 0, shellR, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "rgba(15,23,42,0.5)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
            ctx.arc(0, 0, shellR * (a / (Math.PI * 2)), a, a + Math.PI / 3);
        }
        ctx.stroke();

        ctx.restore();
    }

    function endGame() {
        state.running = false;
        updateHUD();
        overlay.classList.add("show");
        overlay.querySelector(".card").innerHTML = `
      <h1>Time's Up!</h1>
      <p>You ate <strong>${state.score}</strong> veggies.</p>
      <button id="restartBtn">Play Again</button>
    `;
        const restartBtn = document.getElementById("restartBtn");
        restartBtn.addEventListener("click", startGame, { once: true });
    }

    // Show start overlay by default
    overlay.classList.add("show");
    updateHUD();
})();
