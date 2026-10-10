// Sergio López — Portafolio · interacciones
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 1. Partir el nombre en caracteres (el h1 conserva el texto para lectores de pantalla)
  document.querySelectorAll("[data-split]").forEach(el => {
    const text = el.textContent.trim();
    el.setAttribute("aria-label", text);
    let i = 0;
    el.innerHTML = text.split(/\s+/).map(w =>
      `<span class="word" aria-hidden="true">${[...w].map(c =>
        `<span class="ch" style="--i:${i++}">${c}</span>`).join("")}</span>`).join("");
  });

  // 2. Logo extruido: capas apiladas en Z (la cara frontal va al final)
  const body = document.querySelector(".emblem__body");
  const DEPTH = 16;
  body.innerHTML = `<i class="emblem__layer emblem__glow"></i>` + Array.from({ length: DEPTH }, (_, k) =>
    `<i class="emblem__layer" style="--z:${DEPTH - k}"></i>`).join("") +
    `<i class="emblem__layer emblem__rim"></i><i class="emblem__layer emblem__face"></i>`;

  // 2b. Revelar elementos al entrar en pantalla (escalonado dentro de cada sección)
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const siblings = [...e.target.parentElement.querySelectorAll(":scope > [data-reveal]")];
      e.target.style.transitionDelay = `${Math.max(0, siblings.indexOf(e.target)) * 90}ms`;
      e.target.classList.add("is-in");
      io.unobserve(e.target);
    });
  }, { threshold: 0.2 });
  document.querySelectorAll("[data-reveal]").forEach(el => io.observe(el));

  // 2b'. Proyectos: arma cada fila del collage. Las piezas se repiten dentro del grupo
  // para que llenen pantallas anchas, y el grupo se duplica para que el bucle no tenga corte.
  document.querySelectorAll(".reel").forEach(reel => {
    const files = reel.dataset.images.trim().split(/\s+/).map(s => s.split(":"));
    reel.innerHTML = `<div class="reel__track"><div class="reel__group">${files.map(([brand, f]) =>
      `<figure class="reel__card"><button class="reel__btn" type="button" data-brand="${brand}" aria-label="Abrir galería de ${brand}">` +
      `<img src="Imagenes/_carrusel/${f}" alt="" decoding="async"></button></figure>`
    ).join("")}</div></div>`;

  });

  // 2b''. Galería de cada marca (imágenes en Imagenes/_galeria/)
  const GALERIAS = {
    Noxpirin: ["noxpirin-3", "noxpirin-4", "noxpirin-5", "noxpirin-2", "noxpirin-1"],
    Gamaderm: ["gamaderm-5", "gamaderm-8", "gamaderm-2", "gamaderm-3", "gamaderm-6", "gamaderm-7", "gamaderm-1"],
    Adorem:   ["adorem-2", "adorem-3", "adorem-5", "adorem-4", "adorem-1"],
  };
  const lb = document.querySelector(".lb");
  if (lb) {
    const img = lb.querySelector(".lb__img"), title = lb.querySelector(".lb__title");
    const count = lb.querySelector(".lb__count"), thumbs = lb.querySelector(".lb__thumbs");
    let list = [], idx = 0, brand = "", opener = null;
    const src = n => `Imagenes/_galeria/${n}.jpg`;
    const show = i => {
      idx = (i + list.length) % list.length;
      img.classList.add("is-loading");
      img.onload = () => img.classList.remove("is-loading");
      img.src = src(list[idx]);
      img.alt = `${brand}, pieza ${idx + 1} de ${list.length}`;
      count.textContent = `${idx + 1} / ${list.length}`;
      thumbs.querySelectorAll(".lb__thumb").forEach((t, k) => {
        t.setAttribute("aria-current", k === idx ? "true" : "false");
        if (k === idx) t.scrollIntoView({ block: "nearest", inline: "center" });
      });
    };
    const open = (b, from) => {
      brand = b; list = GALERIAS[b] || []; opener = from;
      title.textContent = b;
      thumbs.innerHTML = list.map((n, k) =>
        `<button class="lb__thumb" type="button" role="listitem" data-i="${k}" aria-label="Ver pieza ${k + 1}"><img src="${src(n)}" alt="" loading="lazy"></button>`).join("");
      lb.showModal();
      document.documentElement.style.overflow = "hidden";
      show(0);
    };
    document.querySelectorAll(".reel__btn").forEach(b => b.addEventListener("click", () => open(b.dataset.brand, b)));
    lb.querySelector(".lb__prev").addEventListener("click", () => show(idx - 1));
    lb.querySelector(".lb__next").addEventListener("click", () => show(idx + 1));
    lb.querySelector(".lb__close").addEventListener("click", () => lb.close());
    thumbs.addEventListener("click", e => { const t = e.target.closest(".lb__thumb"); if (t) show(+t.dataset.i); });
    lb.addEventListener("keydown", e => {
      if (e.key === "ArrowRight") show(idx + 1);
      if (e.key === "ArrowLeft") show(idx - 1);
    });
    // clic en el fondo (fuera de la imagen y de los controles) cierra
    lb.querySelector(".lb__stage").addEventListener("click", e => { if (e.target === e.currentTarget) lb.close(); });
    lb.addEventListener("close", () => {
      document.documentElement.style.overflow = "";
      opener?.focus();
    });
  }

  // 2b'''. Copiar el correo al portapapeles
  document.querySelectorAll("[data-copy]").forEach(btn => {
    const label = btn.textContent;
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        btn.textContent = "Correo copiado";
      } catch {
        btn.textContent = "Cópialo manualmente";   // sin permiso de portapapeles (p. ej. abierto como archivo)
      }
      btn.setAttribute("data-done", "");
      setTimeout(() => { btn.textContent = label; btn.removeAttribute("data-done"); }, 2200);
    });
  });

  // Menú activo: marca la sección en pantalla y da fondo al menú al bajar
  const nav = document.querySelector(".nav");
  const navLinks = [...document.querySelectorAll(".nav__links a")];
  const targets = navLinks.map(a => document.querySelector(a.getAttribute("href"))).filter(Boolean);
  let navTick = false;
  const updateNav = () => {
    navTick = false;
    nav.classList.toggle("is-scrolled", scrollY > 20);
    // la sección activa es la última cuyo borde superior ya pasó el 40 % de la pantalla
    const line = innerHeight * 0.4;
    let current = targets[0];
    targets.forEach(s => { if (s.getBoundingClientRect().top <= line) current = s; });
    // al llegar al final de la página, la última sección (Contacto) queda activa
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) current = targets.at(-1);
    navLinks.forEach(a => a.setAttribute("aria-current", a.getAttribute("href") === `#${current.id}` ? "true" : "false"));
  };
  addEventListener("scroll", () => { if (!navTick) { navTick = true; requestAnimationFrame(updateNav); } }, { passive: true });
  addEventListener("resize", updateNav);
  updateNav();

  // 2c. Descripción que se escribe sola al llegar a "Sobre mí"
  const typed = [...document.querySelectorAll("[data-type]")];
  const chars = typed.map(p => {
    const text = p.textContent.replace(/\s+/g, " ").trim();
    p.innerHTML = `<span class="sr-only">${text}</span><span aria-hidden="true">${
      [...text].map(c => `<span class="t">${c}</span>`).join("")}</span>`;
    return [...p.querySelectorAll(".t")];
  });
  const showAll = () => chars.flat().forEach(s => s.classList.add("on"));
  if (reduce) showAll();
  else if (typed.length) {
    const speeds = [24, 9];               // ms por letra: la entrada más pausada, el resto más ágil
    let started = false;
    const type = async () => {
      for (let k = 0; k < chars.length; k++) {
        const list = chars[k], ms = speeds[k] ?? 10;
        for (let i = 0; i < list.length; i++) {
          if (i) list[i - 1].classList.remove("caret");
          list[i].classList.add("on", "caret");
          const c = list[i].textContent;
          await new Promise(r => setTimeout(r, c === "." ? ms * 14 : c === "," ? ms * 6 : ms));
        }
        if (k < chars.length - 1) list.at(-1).classList.remove("caret");
      }
    };
    new IntersectionObserver((entries, obs) => {
      if (started || !entries.some(e => e.isIntersecting)) return;
      started = true; obs.disconnect();
      setTimeout(type, 500);              // tras la entrada del título
    }, { threshold: 0.35 }).observe(typed[0]);
  }

  // 3b. Pantalla de carga: se retira cuando la página cargó (como mucho a los 2,5 s)
  const loader = document.querySelector(".loader");
  if (loader && !reduce) {
    const t0 = performance.now();
    let gone = false;
    const hide = () => {
      if (gone) return; gone = true;
      setTimeout(() => {
        loader.classList.add("is-open");
        loader.addEventListener("animationend", e => { if (e.animationName === "loaderHole") loader.remove(); });
      }, Math.max(0, 1600 - (performance.now() - t0)));
    };
    if (document.readyState === "complete") hide(); else addEventListener("load", hide);
    setTimeout(hide, 2500);
  } else loader?.remove();

  // 3c. Fondo topográfico: curvas de nivel de un campo de ruido que se mueve despacio,
  // se desplaza con el scroll y se levanta como una colina alrededor del ratón
  const topo = document.querySelector(".topo");
  if (topo) {
    const ctx = topo.getContext("2d");
    // ruido de Perlin 3D
    const perm = new Uint8Array(512);
    { const p = [...Array(256).keys()]; let s = 7;
      for (let i = 255; i > 0; i--) { s = (s * 16807) % 2147483647; const j = s % (i + 1); [p[i], p[j]] = [p[j], p[i]]; }
      for (let i = 0; i < 512; i++) perm[i] = p[i & 255]; }
    const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
    const lerp = (a, b, t) => a + t * (b - a);
    const grad = (h, x, y, z) => { h &= 15; const u = h < 8 ? x : y, v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
      return ((h & 1) ? -u : u) + ((h & 2) ? -v : v); };
    const noise = (x, y, z) => {
      const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
      x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
      const u = fade(x), v = fade(y), w = fade(z);
      const A = perm[X] + Y, AA = perm[A] + Z, AB = perm[A + 1] + Z, B = perm[X + 1] + Y, BA = perm[B] + Z, BB = perm[B + 1] + Z;
      return lerp(lerp(lerp(grad(perm[AA], x, y, z), grad(perm[BA], x - 1, y, z), u),
                       lerp(grad(perm[AB], x, y - 1, z), grad(perm[BB], x - 1, y - 1, z), u), v),
                  lerp(lerp(grad(perm[AA + 1], x, y, z - 1), grad(perm[BA + 1], x - 1, y, z - 1), u),
                       lerp(grad(perm[AB + 1], x, y - 1, z - 1), grad(perm[BB + 1], x - 1, y - 1, z - 1), u), v), w);
    };

    const CELL = 20, SCALE = 1 / 420, LEVELS = [];
    for (let l = -0.55; l <= 0.551; l += 0.085) LEVELS.push(l);
    let W = 0, H = 0, cols = 0, rows = 0, field = new Float32Array(0), dpr = 1;
    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = innerWidth; H = innerHeight;
      topo.width = W * dpr; topo.height = H * dpr;
      cols = Math.ceil(W / CELL) + 1; rows = Math.ceil(H / CELL) + 1;
      field = new Float32Array(cols * rows);
    };
    let mx = -1e4, my = -1e4, tx = -1e4, ty = -1e4;
    addEventListener("pointermove", e => { tx = e.clientX; ty = e.clientY; if (mx < -1e3) { mx = tx; my = ty; } }, { passive: true });

    const draw = time => {
      mx += (tx - mx) * 0.06; my += (ty - my) * 0.06;
      const z = time * 0.00004, off = scrollY * 0.35, R2 = 2 * 170 * 170;
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const x = i * CELL, y = j * CELL, dx = x - mx, dy = y - my;
        field[j * cols + i] = noise(x * SCALE, (y + off) * SCALE, z) + 0.32 * Math.exp(-(dx * dx + dy * dy) / R2);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.beginPath();
      for (const lv of LEVELS) {
        for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) {
          const a = field[j * cols + i], b = field[j * cols + i + 1], c = field[(j + 1) * cols + i + 1], d = field[(j + 1) * cols + i];
          const k = (a > lv) | ((b > lv) << 1) | ((c > lv) << 2) | ((d > lv) << 3);
          if (k === 0 || k === 15) continue;
          const x = i * CELL, y = j * CELL;
          // puntos de corte en cada borde de la celda (interpolados)
          const T = () => [x + CELL * (lv - a) / (b - a), y];
          const Rr = () => [x + CELL, y + CELL * (lv - b) / (c - b)];
          const Bm = () => [x + CELL * (lv - d) / (c - d), y + CELL];
          const L = () => [x, y + CELL * (lv - a) / (d - a)];
          const seg = (p, q) => { ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); };
          switch (k) {
            case 1: case 14: seg(L(), T()); break;
            case 2: case 13: seg(T(), Rr()); break;
            case 3: case 12: seg(L(), Rr()); break;
            case 4: case 11: seg(Rr(), Bm()); break;
            case 6: case 9:  seg(T(), Bm()); break;
            case 7: case 8:  seg(L(), Bm()); break;
            case 5:  seg(L(), T()); seg(Rr(), Bm()); break;
            case 10: seg(T(), Rr()); seg(L(), Bm()); break;
          }
        }
      }
      ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue("--topo");
      ctx.lineWidth = 1;
      ctx.stroke();
    };
    resize();
    addEventListener("resize", () => { resize(); if (reduce) draw(0); });
    if (reduce) draw(0);
    else {
      let last = 0;
      const loop = time => {
        if (time - last > 33) { last = time; draw(time); }   // ~30 fps es suficiente para un fondo
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
  }
})();
