/*
 * Glyph Network — hero background animation.
 *
 * A dependency-free replacement for particles.js that renders each node as a
 * math / statistics / CS glyph instead of a dot, while reproducing the original
 * particles.js configuration this site shipped with:
 *   - density-based particle count (value 80, value_area 800)
 *   - linking lines within 150px, base opacity 0.4, width 1
 *   - mouse-hover repulse within 200px (same falloff formula as particles.js)
 *   - click pushes 4 new particles
 *   - "out" edge mode (particles leave one edge and re-enter from the other)
 *
 * Performance notes: glyphs are pre-rendered once to small offscreen sprite
 * canvases (no per-frame text rasterization, no external images), the loop
 * pauses while the hero is off-screen, and the particle count degrades
 * automatically if the measured frame rate drops. Honors prefers-reduced-motion
 * by drawing a single static frame instead of animating.
 */
(function () {
    "use strict";

    var container = document.getElementById("particles-js");
    if (!container) return;

    // ---- theme (colors pulled from assets/css/style.css) ----
    var GLYPH_COLORS = [
        "#0e2431",          // site ink (nav/heading text color)
        "#2506ad",          // primary button blue
        "rgb(115, 3, 167)"  // heading accent purple
    ];
    var LINE_RGB = "14, 36, 49"; // ink, matches the original dark line_linked

    // ---- particles.js-equivalent config ----
    var DENSITY_VALUE = 80;      // particles.number.value
    var DENSITY_AREA = 800;      // particles.number.density.value_area
    var LINK_DISTANCE = 150;     // line_linked.distance
    var LINK_OPACITY = 0.4;      // line_linked.opacity
    var GLYPH_OPACITY = 0.5;     // particles.opacity.value
    var REPULSE_DISTANCE = 200;  // modes.repulse.distance
    var PUSH_AMOUNT = 4;         // modes.push.particles_nb
    var BASE_SPEED = 1.2;        // tuned to match the original drift
    var MAX_PARTICLES = 140;
    var MIN_PARTICLES = 24;

    // ---- glyph set: math + statistics + computer science ----
    var TEXT_GLYPHS = [
        "Σ",   // Σ  summation
        "π",   // π  pi
        "σ",   // σ  std deviation
        "μ",   // μ  mean
        "∫",   // ∫  integral
        "√",   // √  root
        "∞",   // ∞  infinity
        "θ",   // θ  theta
        "λ",   // λ  lambda
        "∂",   // ∂  partial derivative
        "≈",   // ≈  approx
        "±",   // ±  plus-minus
        "β",   // β  beta (regression coefficient)
        "Δ",   // Δ  delta
        "χ²", // χ² chi-squared
        "ƒ(x)",    // ƒ(x)
        "</>",
        "{ }",
        "[ ]",
        "01"
    ];
    // custom-drawn glyphs (not expressible as text): scatter plot + db cylinder
    var DRAWN_GLYPHS = ["scatter", "database"];
    var GLYPH_COUNT = TEXT_GLYPHS.length + DRAWN_GLYPHS.length;

    var reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    var canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    container.appendChild(canvas);
    var ctx = canvas.getContext("2d");

    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var width = 0, height = 0;
    var particles = [];
    var sprites = [];        // sprites[glyphIndex][colorIndex]
    var SPRITE_FONT = 24;    // base glyph size sprites are rendered at (CSS px)
    var SPRITE_PAD = 8;
    var SPRITE_SIZE = SPRITE_FONT + SPRITE_PAD * 2;
    var mouse = { x: null, y: null, active: false };
    var running = false;
    var visible = true;
    var rafId = null;
    var glyphDeck = [];      // shuffled indices, dealt cyclically for even mix

    // ---- sprite pre-rendering ----
    function drawScatter(c, size, color) {
        // tiny scatter plot with a regression line
        var s = size / 24;
        c.strokeStyle = color;
        c.fillStyle = color;
        c.lineWidth = 1.6 * s;
        // axes
        c.beginPath();
        c.moveTo(3 * s, 2 * s);
        c.lineTo(3 * s, 21 * s);
        c.lineTo(22 * s, 21 * s);
        c.stroke();
        // points
        var pts = [[7, 17], [10, 13], [13, 15], [16, 9], [19, 6]];
        pts.forEach(function (p) {
            c.beginPath();
            c.arc(p[0] * s, p[1] * s, 1.4 * s, 0, Math.PI * 2);
            c.fill();
        });
        // regression line
        c.lineWidth = 1.2 * s;
        c.beginPath();
        c.moveTo(5 * s, 18.5 * s);
        c.lineTo(21 * s, 5.5 * s);
        c.stroke();
    }

    function drawDatabase(c, size, color) {
        // classic db cylinder
        var s = size / 24;
        c.strokeStyle = color;
        c.lineWidth = 1.8 * s;
        var rx = 8 * s, ry = 3 * s, cx = 12 * s;
        var top = 5 * s, bottom = 19 * s;
        c.beginPath();
        c.ellipse(cx, top, rx, ry, 0, 0, Math.PI * 2);
        c.stroke();
        c.beginPath();
        c.moveTo(cx - rx, top);
        c.lineTo(cx - rx, bottom);
        c.ellipse(cx, bottom, rx, ry, 0, Math.PI, 0, true);
        c.lineTo(cx + rx, top);
        c.stroke();
        c.beginPath();
        c.ellipse(cx, 12 * s, rx, ry, 0, 0, Math.PI, false);
        c.stroke();
    }

    function buildSprites() {
        sprites = [];
        var px = SPRITE_SIZE * dpr;
        for (var g = 0; g < GLYPH_COUNT; g++) {
            sprites[g] = [];
            for (var cIdx = 0; cIdx < GLYPH_COLORS.length; cIdx++) {
                var off = document.createElement("canvas");
                off.width = px;
                off.height = px;
                var oc = off.getContext("2d");
                oc.scale(dpr, dpr);
                var color = GLYPH_COLORS[cIdx];
                if (g < TEXT_GLYPHS.length) {
                    oc.fillStyle = color;
                    oc.font = "600 " + SPRITE_FONT + "px 'Poppins', 'Cambria Math', 'Segoe UI Symbol', sans-serif";
                    oc.textAlign = "center";
                    oc.textBaseline = "middle";
                    // shrink multi-char glyphs so they occupy a similar footprint
                    var text = TEXT_GLYPHS[g];
                    if (text.length > 1) {
                        oc.font = "600 " + Math.round(SPRITE_FONT * (text.length > 2 ? 0.55 : 0.75)) +
                            "px 'Poppins', 'Cambria Math', 'Segoe UI Symbol', sans-serif";
                    }
                    oc.fillText(text, SPRITE_SIZE / 2, SPRITE_SIZE / 2 + 1);
                } else {
                    oc.translate(SPRITE_PAD, SPRITE_PAD);
                    if (DRAWN_GLYPHS[g - TEXT_GLYPHS.length] === "scatter") {
                        drawScatter(oc, SPRITE_FONT, color);
                    } else {
                        drawDatabase(oc, SPRITE_FONT, color);
                    }
                }
                sprites[g][cIdx] = off;
            }
        }
    }

    // ---- particles ----
    function shuffleDeck() {
        glyphDeck = [];
        for (var i = 0; i < GLYPH_COUNT; i++) glyphDeck.push(i);
        for (var j = glyphDeck.length - 1; j > 0; j--) {
            var k = Math.floor(Math.random() * (j + 1));
            var tmp = glyphDeck[j];
            glyphDeck[j] = glyphDeck[k];
            glyphDeck[k] = tmp;
        }
    }

    var dealt = 0;
    function nextGlyph() {
        // deal from a shuffled deck so the mix stays even and neighbors created
        // together never share a glyph
        if (dealt >= glyphDeck.length) {
            shuffleDeck();
            dealt = 0;
        }
        return glyphDeck[dealt++];
    }

    function makeParticle(x, y) {
        var angle = Math.random() * Math.PI * 2;
        var speed = (0.35 + Math.random() * 0.65) * BASE_SPEED;
        return {
            x: x !== undefined ? x : Math.random() * width,
            y: y !== undefined ? y : Math.random() * height,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 11 + Math.random() * 9, // glyph footprint in px
            glyph: nextGlyph(),
            color: Math.floor(Math.random() * GLYPH_COLORS.length)
        };
    }

    function targetCount() {
        // particles.js densityAutoParticles formula
        var area = (canvas.width * canvas.height) / 1000 / (dpr * dpr);
        var n = Math.round((area * DENSITY_VALUE) / DENSITY_AREA);
        return Math.max(MIN_PARTICLES, Math.min(n, MAX_PARTICLES));
    }

    function populate() {
        var n = targetCount();
        particles = [];
        shuffleDeck();
        dealt = 0;
        for (var i = 0; i < n; i++) particles.push(makeParticle());
    }

    function resize() {
        width = container.clientWidth;
        height = container.clientHeight;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // ---- simulation ----
    function step(p) {
        p.x += p.vx;
        p.y += p.vy;

        // "out" edge mode: leave one side, re-enter from the opposite one
        var m = p.size;
        if (p.x - m > width) p.x = -m;
        else if (p.x + m < 0) p.x = width + m;
        if (p.y - m > height) p.y = -m;
        else if (p.y + m < 0) p.y = height + m;

        // hover repulse — same falloff as particles.js (velocity 100, cap 50)
        if (mouse.active) {
            var dx = p.x - mouse.x;
            var dy = p.y - mouse.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < REPULSE_DISTANCE && dist > 0.0001) {
                var f = Math.min(Math.max((1 - Math.pow(dist / REPULSE_DISTANCE, 2)) * 100, 0), 50);
                p.x += (dx / dist) * f;
                p.y += (dy / dist) * f;
            }
        }
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);

        // linking lines first, so glyphs sit on top
        ctx.lineWidth = 1;
        for (var i = 0; i < particles.length; i++) {
            var a = particles[i];
            for (var j = i + 1; j < particles.length; j++) {
                var b = particles[j];
                var dx = a.x - b.x;
                if (dx > LINK_DISTANCE || dx < -LINK_DISTANCE) continue;
                var dy = a.y - b.y;
                if (dy > LINK_DISTANCE || dy < -LINK_DISTANCE) continue;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < LINK_DISTANCE) {
                    var alpha = LINK_OPACITY * (1 - dist / LINK_DISTANCE);
                    ctx.strokeStyle = "rgba(" + LINE_RGB + "," + alpha.toFixed(3) + ")";
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }
            }
        }

        ctx.globalAlpha = GLYPH_OPACITY;
        for (var k = 0; k < particles.length; k++) {
            var p = particles[k];
            var s = p.size * (SPRITE_SIZE / SPRITE_FONT); // include sprite padding
            ctx.drawImage(sprites[p.glyph][p.color], p.x - s / 2, p.y - s / 2, s, s);
        }
        ctx.globalAlpha = 1;
    }

    // ---- adaptive performance: shed particles if the frame rate drops ----
    var frameCount = 0;
    var slowFrames = 0;
    var lastTime = 0;

    function loop(now) {
        rafId = null;
        if (!running || !visible) return;

        if (lastTime) {
            var delta = now - lastTime;
            frameCount++;
            if (delta > 28) slowFrames++; // slower than ~35fps
            if (frameCount >= 120) {
                if (slowFrames > 60 && particles.length > MIN_PARTICLES) {
                    particles.length = Math.max(MIN_PARTICLES, Math.floor(particles.length * 0.75));
                }
                frameCount = 0;
                slowFrames = 0;
            }
        }
        lastTime = now;

        for (var i = 0; i < particles.length; i++) step(particles[i]);
        draw();
        rafId = requestAnimationFrame(loop);
    }

    function start() {
        if (running) return;
        running = true;
        lastTime = 0;
        if (!rafId) rafId = requestAnimationFrame(loop);
    }

    function stop() {
        running = false;
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
    }

    // ---- events ----
    var hero = container.parentElement || container;

    function pointerMove(e) {
        var rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
        mouse.active = true;
    }

    function pointerLeave() {
        mouse.active = false;
    }

    function pointerClick(e) {
        var rect = canvas.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        for (var i = 0; i < PUSH_AMOUNT; i++) {
            if (particles.length < MAX_PARTICLES) particles.push(makeParticle(x, y));
        }
    }

    var resizeTimer = null;
    function onResize() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            resize();
            populate();
            if (reducedMotionQuery.matches) draw();
        }, 150);
    }

    function setupInteractive() {
        hero.addEventListener("mousemove", pointerMove);
        hero.addEventListener("mouseleave", pointerLeave);
        hero.addEventListener("click", pointerClick);
    }

    function teardownInteractive() {
        hero.removeEventListener("mousemove", pointerMove);
        hero.removeEventListener("mouseleave", pointerLeave);
        hero.removeEventListener("click", pointerClick);
    }

    // pause the loop while the hero is scrolled out of view
    if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) {
            visible = entries[0].isIntersecting;
            if (visible && running && !rafId) rafId = requestAnimationFrame(loop);
        }, { threshold: 0 }).observe(container);
    }

    function applyMotionPreference() {
        if (reducedMotionQuery.matches) {
            stop();
            teardownInteractive();
            mouse.active = false;
            draw(); // static, minimal-motion fallback frame
        } else {
            setupInteractive();
            start();
        }
    }

    // ---- init ----
    buildSprites();
    resize();
    populate();
    window.addEventListener("resize", onResize);
    if (reducedMotionQuery.addEventListener) {
        reducedMotionQuery.addEventListener("change", applyMotionPreference);
    }
    applyMotionPreference();

    // rebuild text sprites once the webfont is in (glyphs may rasterize with a
    // fallback font on first paint)
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () {
            buildSprites();
        });
    }
})();
