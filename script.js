/* ===================================================================
   BIRTHDAY STORY — TIMELINE CONTROLLER
   =================================================================== */

(function () {
  "use strict";

  const TOTAL_DURATION = 60;

  const SCENE_TIMELINE = [
    { scene: 0, start: 0, end: 5 },
    { scene: 1, start: 5, end: 15 },
    { scene: 2, start: 15, end: 25 },
    { scene: 3, start: 25, end: 35 },
    { scene: 4, start: 35, end: 45 },
    { scene: 5, start: 45, end: 55 },
  ];

  const FACE_MAP = {
    person1_face: [
      "face-person1-s1",
      "face-person1-s2",
      "face-person1-s3",
      "face-person1-s4",
      "face-person1-finale",
    ],
    person2_face: [
      "face-person2-s1",
      "face-person2-s2",
      "face-person2-s3",
      "face-person2-s4",
      "face-person2-finale",
    ],
    baby_face: [
      "face-baby-s3",
      "face-baby-s4",
      "face-baby-finale",
    ],
  };

  const PHOTO_MAP = {
    truth_photo: ["img-truth"],
    baby_photo_1: ["img-baby-1"],
    baby_photo_2: ["img-baby-2"],
    baby_photo_3: ["img-baby-3"],
    childhood_photo_1: ["img-childhood-1"],
    childhood_photo_2: ["img-childhood-2"],
    childhood_photo_3: ["img-childhood-3"],
    sibling_intro_photo: ["img-sibling-intro"],
    sibling_photo_1: ["img-sibling-1"],
    sibling_photo_2: ["img-sibling-2"],
    sibling_photo_3: ["img-sibling-3"],
    teenage_photo_1: ["img-teenage-1"],
    teenage_photo_2: ["img-teenage-2"],
    teenage_photo_3: ["img-teenage-3"],
    adult_photo_1: ["img-adult-1"],
    adult_photo_2: ["img-adult-2"],
    adult_photo_3: ["img-adult-3"],
    real_truth_photo: ["img-real-truth"],
    family_photo_1: ["img-family-1"],
    family_photo_2: ["img-family-2"],
    family_photo_3: ["img-family-3"],
    today_photo: ["img-today"],
    finale_photo: ["img-finale"],
  };

  const SCENE_AUDIO_KEYS = [
    "audio_scene_0",
    "audio_scene_1",
    "audio_scene_2",
    "audio_scene_3",
    "audio_scene_4",
  ];

  const SCROLL_AUDIO_MAP = {
    sectionTruth: "audio_truth",
    sectionBaby: "audio_baby",
    sectionChildhood: "audio_childhood",
    sectionSiblingIntro: "audio_sibling_intro",
    sectionSiblingLife: "audio_sibling_life",
    sectionTeenage: "audio_teenage",
    sectionAdult: "audio_adult",
    sectionRealTruth: "audio_real_truth",
    sectionParents: "audio_parents",
    sectionToday: "audio_today",
    sectionFinale: "audio_finale",
  };

  let elapsed = 0;
  let running = false;
  let lastTimestamp = null;
  let activeScene = -1;
  let isMuted = false;

  const audioCache = {};
  let currentAudio = null;
  let bgMusic = null;
  const playedScrollAudio = new Set();

  const progressFill = document.getElementById("progressFill");

  /* ── audio helpers ───────────────────────────────────────── */

  function stopCurrentAudio() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
  }

  function playAudio(key) {
    stopCurrentAudio();
    const audio = audioCache[key];
    if (!audio || isMuted) return;
    audio.currentTime = 0;
    audio.play().catch(() => { });
    currentAudio = audio;
  }

  function startBgMusic() {
    if (!bgMusic || isMuted) return;
    bgMusic.currentTime = 0;
    bgMusic.play().catch(() => { });
  }

  function toggleMute() {
    isMuted = !isMuted;
    const btn = document.getElementById("muteBtn");
    if (btn) btn.textContent = isMuted ? "\uD83D\uDD07" : "\uD83D\uDD0A";
    if (isMuted) {
      stopCurrentAudio();
      if (bgMusic) bgMusic.pause();
    } else if (bgMusic && !bgMusic.ended && bgMusic.src) {
      bgMusic.play().catch(() => { });
    }
  }

  /* ── load images + audio from JSON ──────────────────────── */

  async function loadAssets() {
    try {
      const res = await fetch("images.json");
      const data = await res.json();

      const allMaps = { ...FACE_MAP, ...PHOTO_MAP };
      Object.entries(allMaps).forEach(([jsonKey, elementIds]) => {
        const src = data[jsonKey];
        if (!src) return;

        elementIds.forEach((id) => {
          const img = document.getElementById(id);
          if (!img) return;
          img.onload = () => img.classList.add("loaded");
          img.onerror = () => img.classList.remove("loaded");
          img.src = src;
        });
      });

      const allAudioKeys = [
        ...SCENE_AUDIO_KEYS,
        ...Object.values(SCROLL_AUDIO_MAP),
      ];
      allAudioKeys.forEach((key) => {
        const src = data[key];
        if (!src) return;
        const audio = new Audio();
        audio.preload = "auto";
        audio.src = src;
        audioCache[key] = audio;
      });

      if (data.background_music) {
        bgMusic = new Audio();
        bgMusic.preload = "auto";
        bgMusic.loop = true;
        bgMusic.volume = 0.02;
        bgMusic.src = data.background_music;
      }
    } catch {
      console.warn("Could not load images.json — using placeholders.");
    }
  }

  /* ── scene management ───────────────────────────────────── */

  const startScreen = document.querySelector('[data-scene="start"]');

  function restartElement(el) {
    el.style.animation = "none";
    void el.offsetHeight;
    el.style.animation = "";
  }

  function activateScene(index) {
    if (index === activeScene) return;
    activeScene = index;

    startScreen.classList.remove("active");

    document.querySelectorAll('.scene[data-scene]:not([data-scene="start"])').forEach((el) => {
      const sceneIdx = parseInt(el.dataset.scene, 10);
      el.classList.toggle("active", sceneIdx === index);
    });

    if (index === 1) {
      const el = document.getElementById("coupleWalk");
      if (el) restartElement(el);
    }

    if (index === 4) {
      const el = document.getElementById("coupleHome");
      if (el) restartElement(el);
    }

    if (index === 5) enterStoryMode();

    const audioKey = SCENE_AUDIO_KEYS[index];
    if (audioKey) playAudio(audioKey);
  }

  /* ── story-mode transition ─────────────────────────────── */

  function enterStoryMode() {
    setTimeout(() => {
      document.body.classList.add("story-mode");
    }, 2000);
  }

  /* ── animation loop ─────────────────────────────────────── */

  function tick(timestamp) {
    if (!running) return;
    if (lastTimestamp === null) lastTimestamp = timestamp;

    const dt = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;
    elapsed += dt;

    if (elapsed >= TOTAL_DURATION) {
      elapsed = TOTAL_DURATION;
      running = false;
    }

    if (progressFill) {
      progressFill.style.width = (elapsed / TOTAL_DURATION) * 100 + "%";
    }

    for (const entry of SCENE_TIMELINE) {
      if (elapsed >= entry.start && elapsed < entry.end) {
        activateScene(entry.scene);
        break;
      }
    }
    if (elapsed >= TOTAL_DURATION) activateScene(5);

    if (running) requestAnimationFrame(tick);
  }

  function startAnimation() {
    elapsed = 0;
    lastTimestamp = null;
    running = true;
    activeScene = -1;
    if (progressFill) progressFill.style.width = "0%";

    stopCurrentAudio();
    playedScrollAudio.clear();

    document.body.classList.remove("story-mode");
    window.scrollTo(0, 0);

    document.querySelectorAll(".scene").forEach((el) => el.classList.remove("active"));

    resetAnimations();
    requestAnimationFrame(tick);
  }

  /* ── reset CSS animations so they replay ────────────────── */

  function resetAnimations() {
    const selectors = [
      ".baby-in-can",
      ".narration",
      ".transition-text",
      ".scroll-indicator",
    ];

    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => restartElement(el));
    });

    const confettiContainer = document.getElementById("confetti");
    if (confettiContainer) confettiContainer.innerHTML = "";

    const confettiScroll = document.getElementById("confettiScroll");
    if (confettiScroll) confettiScroll.innerHTML = "";

    document.querySelectorAll(".reveal-on-scroll").forEach((el) => {
      el.classList.remove("revealed");
    });
  }

  /* ── confetti generator ─────────────────────────────────── */

  function spawnConfetti() {
    const container = document.getElementById("confetti");
    container.innerHTML = "";

    const colors = [
      "#ffd700", "#e91e63", "#4caf50", "#2196f3",
      "#ff9800", "#9c27b0", "#00bcd4", "#ff5722",
    ];

    for (let i = 0; i < 60; i++) {
      const piece = document.createElement("span");
      piece.classList.add("confetti-piece");

      const color = colors[Math.floor(Math.random() * colors.length)];
      const left = Math.random() * 100;
      const delay = Math.random() * 2;
      const duration = 2 + Math.random() * 2;
      const size = 6 + Math.random() * 8;

      piece.style.cssText = `
        left: ${left}%;
        background: ${color};
        width: ${size}px;
        height: ${size * 1.6}px;
        animation-duration: ${duration}s;
        animation-delay: ${delay}s;
      `;
      container.appendChild(piece);
    }
  }

  /* ── start & replay buttons ──────────────────────────────── */

  document.getElementById("startBtn").addEventListener("click", () => {
    startScreen.classList.remove("active");
    startBgMusic();
    startAnimation();
  });

  /* ── scroll story: reveal observer ─────────────────────── */

  function initScrollReveals() {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");

            if (entry.target.classList.contains("finale-birthday-text")) {
              spawnScrollConfetti();
            }
          }
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -50px 0px" }
    );

    document.querySelectorAll(".reveal-on-scroll").forEach((el) => revealObserver.observe(el));

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const sectionId = entry.target.id;
          const audioKey = SCROLL_AUDIO_MAP[sectionId];
          if (!audioKey || playedScrollAudio.has(sectionId)) return;
          playedScrollAudio.add(sectionId);
          playAudio(audioKey);
        });
      },
      { threshold: 0.3 }
    );

    document.querySelectorAll(".story-section[id]").forEach((el) => sectionObserver.observe(el));
  }

  /* ── scroll confetti ───────────────────────────────────── */

  function spawnScrollConfetti() {
    const container = document.getElementById("confettiScroll");
    if (!container || container.children.length > 0) return;

    const colors = [
      "#ffd700", "#e91e63", "#4caf50", "#2196f3",
      "#ff9800", "#9c27b0", "#00bcd4", "#ff5722",
    ];

    for (let i = 0; i < 80; i++) {
      const piece = document.createElement("span");
      piece.classList.add("confetti-piece");

      const color = colors[Math.floor(Math.random() * colors.length)];
      const left = Math.random() * 100;
      const delay = Math.random() * 2;
      const duration = 2 + Math.random() * 2;
      const size = 6 + Math.random() * 8;

      piece.style.cssText = `
        left: ${left}%;
        background: ${color};
        width: ${size}px;
        height: ${size * 1.6}px;
        animation-duration: ${duration}s;
        animation-delay: ${delay}s;
      `;
      container.appendChild(piece);
    }
  }

  /* ── scroll replay button ──────────────────────────────── */

  document.getElementById("replayBtnScroll").addEventListener("click", () => {
    startScreen.classList.remove("active");
    startBgMusic();
    startAnimation();
  });

  /* ── mute button ─────────────────────────────────────────── */

  document.getElementById("muteBtn").addEventListener("click", toggleMute);

  /* ── init ────────────────────────────────────────────────── */

  loadAssets();
  initScrollReveals();
})();
