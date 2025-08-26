(() => {
    "use strict";

    const canvas = document.getElementById("game");
    const ctx = canvas.getContext("2d");
    const overlay = document.getElementById("overlay");
    const startBtn = document.getElementById("startBtn");
    const scoreEl = document.querySelector("#score span");
    const timerEl = document.getElementById("timer");
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
            x: canvas.width / 2,
            y: canvas.height / 2,
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
        const x = rand(margin, canvas.width - margin);
        const y = rand(margin, canvas.height - margin);
        const radius = rand(10, 16);
        const type = ["lettuce", "carrot", "cabbage", "pepper"][
            Math.floor(rand(0, 4))
        ];
        const colorMap = {
            lettuce: "#86efac",
            carrot: "#fb923c",
            cabbage: "#a78bfa",
            pepper: "#f87171",
        };
        return { x, y, radius, type, color: colorMap[type] };
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
        timerEl.textContent = String(Math.max(0, Math.ceil(state.timeLeft)));
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
        const maxX = canvas.width - WORLD_PADDING - snail.radius;
        const maxY = canvas.height - WORLD_PADDING - snail.radius;
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
        const w = canvas.width;
        const h = canvas.height;
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
        ctx.fillStyle = v.color;
        ctx.beginPath();
        ctx.arc(0, 0, v.radius, 0, Math.PI * 2);
        ctx.fill();
        // little highlight
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.beginPath();
        ctx.ellipse(
            -v.radius * 0.3,
            -v.radius * 0.3,
            v.radius * 0.2,
            v.radius * 0.35,
            Math.PI / 6,
            0,
            Math.PI * 2
        );
        ctx.fill();
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
