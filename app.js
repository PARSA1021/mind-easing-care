/**
 * MEC (Mind Easing Care) - Core Logic
 * 2026 Premium Mobile App Experience
 *
 * 주요 개선 사항:
 *  - HTML onclick 인라인 이벤트 제거 → addEventListener 중앙 집중화
 *  - window.* 전역 함수 등록 제거
 *  - MOOD_EMOJIS / MOOD_MAP 중복 상수 통합
 *  - onValue 리스너 누적 버그 수정 (cleanupRealtimeSync 강화)
 *  - banner/toast .timeout 비표준 DOM 프로퍼티 → WeakMap으로 교체
 *  - innerHTML XSS 위험 코드 → textContent / sanitize 적용
 *  - openHelpModal null 크래시 방어
 *  - executeTextDumping 함수 중복 선언 제거
 *  - 접근성: aria-pressed 상태 업데이트
 */

import { initializeApp }    from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
  getDatabase, ref, onValue, set, push, remove,
  serverTimestamp, off, onDisconnect
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-database.js";

// ─── Firebase Config ───
// ⚠️  프로덕션에서는 환경변수 또는 백엔드 주입으로 API 키를 관리하세요.
//     Firebase Realtime DB 규칙(rules)에서 인증 없는 쓰기 권한을 제한하는 것이 필수입니다.
const firebaseConfig = {
  apiKey:            "AIzaSyCj5wt9MrRe0BETGtS3ECvuSt7ekm1kXqg",
  authDomain:        "sm-ge-mind-app.firebaseapp.com",
  projectId:         "sm-ge-mind-app",
  storageBucket:     "sm-ge-mind-app.firebasestorage.app",
  messagingSenderId: "308528383337",
  appId:             "1:308528383337:web:19204cb5de20201977e9f8",
  databaseURL:       "https://sm-ge-mind-app-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// ─── 통합 상수 (MOOD_MAP + MOOD_EMOJIS 중복 제거) ───
const MOOD = {
  fine:  { emoji: "😊", label: "괜찮아요",      desc: "오늘 기분이 괜찮아 보여요" },
  tired: { emoji: "😴", label: "피곤해요",      desc: "지금 조금 지쳐있나 봐요" },
  sad:   { emoji: "😢", label: "우울해요",      desc: "마음이 조금 울적한 것 같아요" },
  busy:  { emoji: "🔥", label: "바빠요",        desc: "지금 아주 바쁜 상태예요" },
  love:  { emoji: "💖", label: "사랑해",        desc: "당신을 아주 많이 사랑한대요" },
};

const HEALING_AFFIRMATIONS = [
  "나는 지금 이대로도 충분히 소중하고 가치 있는 사람입니다. 🌸",
  "오늘 하루 서툴고 힘들었던 나를 비난하지 않고, 가만히 토닥여줍니다. ✨",
  "오늘 겪은 모든 불안과 걱정은 숨을 내쉴 때 바람을 타고 멀리 흩어집니다. 🌬️",
  "나에게는 이 어려움과 힘겨운 순간을 유연하게 흘려보낼 힘이 숨어있습니다. 🌿",
  "조금 느려도 괜찮습니다. 나는 매일 나만의 속도로 귀하게 피어나는 중입니다. 🌷",
  "지금 이 순간만큼은 아무 걱정 없이, 내 숨소리에 집중하며 안전하고 편안합니다. 🧘‍♀️",
  "내 주변에는 나를 따뜻하게 아끼고 지탱해 주는 사람들이 언제나 함께하고 있습니다. 💑",
  "실수하거나 흔들리는 것은 당연합니다. 그것 또한 성장해 나가는 아름다운 여정입니다. 🌱",
  "바람이 세차게 불어도, 내 안에 깊숙이 내린 뿌리는 단단하고 굳건합니다. 🌳",
  "내 마음을 짓누르던 걱정의 파도는 모래사장에 부서지며 마침내 고요해집니다. 🌊",
  "오늘 있었던 미움과 지친 감정들을 내려놓고, 온전히 나 자신을 따뜻하게 허그해 줍니다. ❤️",
  "하루가 저물어갈 때 마음속에 조용하고 고결한 평화가 둥지를 틉니다. 🕊️"
];

// ─── 앱 상태 ───
const state = {
  db:           null,
  identity:     localStorage.getItem("app_user_identity") || "wife",
  theme:        localStorage.getItem("app_theme")          || "auto",
  myMood:       localStorage.getItem("app_user_mood")      || "fine",
  coupleCode:   localStorage.getItem("app_couple_code")    || "DEMO-CHANNEL",
  notifications: [],
  messagePool:  JSON.parse(localStorage.getItem("sync_card_pool_v2")) || [
    { text: "오늘 하루도 정말 고생 많았어요. 내가 늘 옆에 있을게요.", author: "system", likes: 0 },
    { text: "잠시 눈을 감고 깊게 숨을 쉬어봐요. 당신은 충분히 잘하고 있어요.", author: "system", likes: 0 },
    { text: "어떤 일이 있어도 우리는 늘 함께니까 괜찮아요. 💑", author: "system", likes: 0 },
    { text: "오늘 힘든 일이 있었다면 나에게 모두 털어놓아줘요. 내가 전부 들어줄게요. ❤️", author: "system", likes: 0 },
    { text: "무리하지 않아도 괜찮아요. 지칠 때는 언제든 내 어깨에 기대서 편히 쉬어가요.", author: "system", likes: 0 },
    { text: "당신이 내 곁에 있다는 사실만으로도 나는 매일 큰 위로와 용기를 얻고 있어요. 고마워요. 🌸", author: "system", likes: 0 },
    { text: "오늘 하루도 버텨내느라 정말 수고 많았어요. 따뜻한 밥 먹고 걱정은 내려놓아요.", author: "system", likes: 0 },
    { text: "내 세상에서 가장 소중한 사람은 언제나 당신입니다. 스스로를 더 많이 사랑해 주세요.", author: "system", likes: 0 },
    { text: "마음이 흔들리고 불안함이 찾아올 땐 가만히 내 손을 잡아요. 내가 늘 든든히 지켜줄게요.", author: "system", likes: 0 },
    { text: "당신은 항상 충분히 멋지고 사랑스러운 내 평생의 반쪽입니다. 오늘 절대 기죽지 마요! 🔥", author: "system", likes: 0 },
    { text: "토닥토닥, 상처받은 마음이 있었다면 깊은 밤 편안한 잠으로 예쁘게 씻겨 내려가길 바랄게요. 😴", author: "system", likes: 0 }
  ],
  isMeditating:  false,
  meditationTimer: null,
  audioCtx:      null,
  currentCardId: null,
  isListView:    false,
  activeSounds:  {},
  isHugging:     false,
  partnerHugging: false,
  emotionJournal: JSON.parse(localStorage.getItem("emotion_journal_v1")) || [],
  loveMemos:     JSON.parse(localStorage.getItem("love_memos_v1")) || [],
};

// ─── 타이머 WeakMap (DOM 요소에 직접 .timeout 쓰는 안티패턴 대체) ───
const _timerMap = new WeakMap();
function setElementTimeout(el, fn, delay) {
  if (_timerMap.has(el)) clearTimeout(_timerMap.get(el));
  _timerMap.set(el, setTimeout(fn, delay));
}

// ─── 텍스트 안전 삽입 (XSS 방지) ───
function safeText(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ─── 초기화 ───
document.addEventListener("DOMContentLoaded", () => {
  initFirebase();
  applyTheme(state.theme);
  applyMoodUI(state.myMood);
  bindAllEvents();          // ← 인라인 onclick 대신 JS에서 일괄 바인딩
  checkFirstVisit();
  updateTabIndicator(0);
  registerServiceWorker();
  renderCardScreen();
  updateCoupleBadgeUI();
  updateNotificationPermissionUI();
  rollHealingAffirmation();
  renderEmotionJournalFeed();
  renderLoveMemoDisplay();
  applyIdentity(state.identity);
});

// ════════════════════════════════════════════════
//  이벤트 바인딩 중앙화 (HTML onclick 완전 제거)
// ════════════════════════════════════════════════
function bindAllEvents() {

  // 역할 선택 버튼
  document.querySelectorAll(".role-opt-btn").forEach(btn => {
    btn.addEventListener("click", () => selectRole(btn.dataset.role));
  });

  // 헤더
  document.getElementById("helpBtn")          ?.addEventListener("click", openHelpModal);
  document.getElementById("coupleSettingsBtn") ?.addEventListener("click", openCoupleModal);
  document.getElementById("notifBellBtn")      ?.addEventListener("click", openNotifCenterModal);
  document.getElementById("themeToggleBtn")    ?.addEventListener("click", toggleTheme);
  document.getElementById("userIdentityBox")   ?.addEventListener("click", switchIdentity);
  document.getElementById("userIdentityBox")   ?.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); switchIdentity(); }
  });

  // 탭 바 (data-tab 속성 기반)
  document.querySelectorAll(".tab-item[data-tab]").forEach(btn => {
    btn.addEventListener("click", () => navigateTab(btn.dataset.tab));
  });

  // 홈 화면
  document.getElementById("summonMainBtn")   ?.addEventListener("click", sendSignalToPartner);
  document.getElementById("emotionSubmitBtn")?.addEventListener("click", submitEmotionJournal);
  document.getElementById("emotionJournalInput")?.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); submitEmotionJournal(); }
  });

  // 기분 칩
  document.querySelectorAll(".mood-chip").forEach(chip => {
    chip.addEventListener("click", () => updateMyMood(chip.dataset.mood));
  });

  // 평온 화면
  document.getElementById("breath-action-btn")?.addEventListener("click", handleBreathToggle);
  const healingCard = document.getElementById("healingCard");
  healingCard?.addEventListener("click",   rollHealingAffirmation);
  healingCard?.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); rollHealingAffirmation(); }
  });

  // 온기 화면
  document.getElementById("loveSendBtn")?.addEventListener("click", sendLoveMemo);
  document.getElementById("loveMemoInput")?.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); sendLoveMemo(); }
  });
  const hugBtn = document.getElementById("hugBtn");
  hugBtn?.addEventListener("mousedown",  startHug);
  hugBtn?.addEventListener("mouseup",    stopHug);
  hugBtn?.addEventListener("touchstart", startHug, { passive: true });
  hugBtn?.addEventListener("touchend",   stopHug,  { passive: true });

  // 비우기 화면
  document.getElementById("dumpSubmitBtn")?.addEventListener("click", executeTextDumping);

  // 기록 화면
  document.getElementById("addMsgBtn")         ?.addEventListener("click", addComfortMessage);
  document.getElementById("emptyAddMsgBtn")    ?.addEventListener("click", addComfortMessage);
  document.getElementById("viewToggleBtn")     ?.addEventListener("click", toggleCardView);
  document.getElementById("sendHeartBtn")      ?.addEventListener("click", sendHeart);
  document.getElementById("cardLikeBtn")       ?.addEventListener("click", e => { e.stopPropagation(); toggleLikeCard(); });
  document.getElementById("cardListBackBtn")   ?.addEventListener("click", toggleCardView);

  const comfortCardMain = document.getElementById("comfort-card-main");
  comfortCardMain?.addEventListener("click",   drawNextComfortCard);
  comfortCardMain?.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); drawNextComfortCard(); }
  });

  // 신호 메시지 모달
  document.getElementById("closeSignalMsgBtn")?.addEventListener("click", closeSignalMessageModal);
  document.getElementById("signalConfirmBtn")  ?.addEventListener("click", confirmSendSignal);
  document.getElementById("signal-custom-input")?.addEventListener("input", function () {
    const el = document.getElementById("signal-char-count");
    if (el) el.textContent = `${this.value.length} / 50`;
  });

  // 위로 메시지 작성 모달
  document.getElementById("closeMsgWriteBtn")     ?.addEventListener("click", closeMessageModal);
  document.getElementById("submitComfortMsgBtn")  ?.addEventListener("click", submitComfortMessage);
  document.getElementById("comfort-message-input")?.addEventListener("input", function () {
    const el = document.getElementById("char-count");
    if (el) el.textContent = `${this.value.length} / 100`;
  });

  // 도움말 모달
  document.getElementById("helpGuideCloseBtn")?.addEventListener("click", closeHelpModal);

  // 전역 알림 모달
  document.getElementById("globalAlertCloseBtn")?.addEventListener("click", closeModal);

  // 커플 연결 모달
  document.getElementById("closeCoupleBtn")    ?.addEventListener("click", closeCoupleModal);
  document.getElementById("copyCoupleCodeBtn") ?.addEventListener("click", copyCoupleCode);
  document.getElementById("generateCodeBtn")   ?.addEventListener("click", generateNewCoupleCode);
  document.getElementById("resetDemoBtn")      ?.addEventListener("click", resetToDemoChannel);
  document.getElementById("connectCoupleBtn")  ?.addEventListener("click", connectCoupleCode);

  // 알림 센터 모달
  document.getElementById("closeNotifCenterBtn")?.addEventListener("click", closeNotifCenterModal);
  document.getElementById("requestNotifPermBtn")?.addEventListener("click", requestNotificationPermission);
  document.getElementById("clearAllNotifsBtn")  ?.addEventListener("click", clearAllNotifications);

  // 신호 오버레이 닫기
  document.getElementById("signalConfirmCloseBtn")?.addEventListener("click", closeSignalOverlay);

  // 알림 배너 클릭
  document.getElementById("notificationBanner")?.addEventListener("click", () => {
    document.getElementById("notificationBanner")?.classList.remove("active");
  });

  // 가이드 스크롤 페이지네이션
  const guideContainer = document.querySelector(".guide-scroll-container");
  if (guideContainer) {
    guideContainer.addEventListener("scroll", () => {
      const index = Math.round(guideContainer.scrollLeft / guideContainer.clientWidth);
      document.querySelectorAll(".guide-pagination .dot").forEach((dot, i) => {
        dot.classList.toggle("active", i === index);
      });
    });
  }

  // 시스템 테마 변경 감지
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (state.theme === "auto") applyTheme("auto");
  });

  // iOS 터치 이벤트 활성화
  document.addEventListener("touchstart", () => {}, { passive: true });
}

// ─── Audio ───
function initAudio() {
  if (!state.audioCtx) {
    state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playNotificationSound(type = "default") {
  initAudio();
  const ctx = state.audioCtx;
  if (!ctx) return;

  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";

  const duration = type === "signal" ? 0.8 : 0.4;
  if (type === "signal") {
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + duration);
  } else if (type === "like") {
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + duration);
  } else {
    osc.frequency.setValueAtTime(554, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + duration);
  }

  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

// ─── 알림 배너 ───
function showNotificationBanner(title, body, iconClass = "ti ti-bell-bolt", targetTab = null) {
  const banner  = document.getElementById("notificationBanner");
  const titleEl = document.getElementById("notifBannerTitle");
  const bodyEl  = document.getElementById("notifBannerBody");
  const iconEl  = document.getElementById("notifBannerIcon")?.querySelector("i");

  if (!banner || !titleEl || !bodyEl || !iconEl) return;

  titleEl.textContent = title;
  bodyEl.textContent  = body;
  iconEl.className    = iconClass;

  // 배너 클릭 이벤트 (기존 리스너 교체 방지: once 옵션 사용)
  banner.addEventListener("click", () => {
    if (targetTab) navigateTab(targetTab);
    banner.classList.remove("active");
  }, { once: true });

  banner.setAttribute("aria-hidden", "false");
  banner.classList.add("active");

  setElementTimeout(banner, () => {
    banner.classList.remove("active");
    banner.setAttribute("aria-hidden", "true");
  }, 4000);
}

// ─── 파티클 ───
function createGlobalParticle(emoji = "❤️") {
  const particle = document.createElement("div");
  particle.className   = "global-particle";
  particle.textContent = emoji;
  particle.setAttribute("aria-hidden", "true");
  particle.style.left  = `${20 + Math.random() * 60}%`;
  particle.style.top   = `${40 + Math.random() * 40}%`;
  particle.style.setProperty("--dx", `${(Math.random() - 0.5) * 200}px`);
  document.body.appendChild(particle);
  setTimeout(() => particle.remove(), 2000);
}

// ─── Service Worker ───
function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js")
        .then(reg  => console.log("SW registered:", reg))
        .catch(err => console.warn("SW registration failed:", err));
    });
  }
}

// ─── Firebase ───
function initFirebase() {
  try {
    const app = initializeApp(firebaseConfig);
    state.db  = getDatabase(app);
  } catch (e) {
    console.warn("Firebase initialization failed:", e);
  }
}

function checkFirstVisit() {
  if (!localStorage.getItem("has_seen_guide")) {
    setTimeout(openHelpModal, 500);
  }
}

// ─── 도움말 모달 ───
function openHelpModal() {
  const modal = document.getElementById("helpGuideModal");
  if (!modal) return;                     // ← null 크래시 방어
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  const container = modal.querySelector(".guide-scroll-container");
  if (container) container.scrollLeft = 0;
}

function closeHelpModal() {
  localStorage.setItem("has_seen_guide", "true");
  closeModal();
}

// ─── 역할 선택 ───
function selectRole(role) {
  const overlay = document.getElementById("roleSelectionOverlay");

  applyIdentity(role);

  if (overlay) {
    overlay.style.transition = "opacity 0.6s ease, transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)";
    overlay.style.opacity    = "0";
    overlay.style.transform  = "scale(1.05)";
    setTimeout(() => {
      overlay.classList.add("hidden");
      overlay.setAttribute("aria-hidden", "true");
      initRealtimeSync();
    }, 600);
  }

  showToast(`[${role === "wife" ? "아내" : "남편"}] 역할로 시작합니다. ✨`);
}

function getCoupleRef(subPath) {
  return ref(state.db, `couples/${state.coupleCode}/${subPath}`);
}

function applyIdentity(role) {
  state.identity = role;
  localStorage.setItem("app_user_identity", role);

  const label          = document.getElementById("identityLabel");
  const partnerName    = document.getElementById("partnerName");
  const partnerAvatar  = document.querySelector(".partner-avatar i");
  const homeTitle      = document.getElementById("home-title");
  const identityBox    = document.getElementById("userIdentityBox");
  const signalTitle    = document.getElementById("signalModalTitle");
  const signalConfirm  = document.getElementById("signalConfirmBtn");

  if (role === "wife") {
    if (label)         label.textContent = "🌸 아내";
    if (partnerName)   partnerName.textContent = "사랑하는 남편";
    if (partnerAvatar) partnerAvatar.className = "ti ti-user-heart";
    if (homeTitle)     homeTitle.innerHTML = "남편에게 당신의<br />다정한 마음을 전해볼까요?";
    if (identityBox)   identityBox.className = "user-identity-box role-wife";
    if (signalTitle)   signalTitle.textContent = "남편에게 보낼 말";
    if (signalConfirm) signalConfirm.innerHTML = '<i class="ti ti-flame" aria-hidden="true"></i> 남편에게 신호 보내기';
  } else {
    if (label)         label.textContent = "🙋‍♂️ 남편";
    if (partnerName)   partnerName.textContent = "사랑하는 아내";
    if (partnerAvatar) partnerAvatar.className = "ti ti-user-heart";
    if (homeTitle)     homeTitle.innerHTML = "아내에게 당신의<br />따뜻한 온기를 전해볼까요?";
    if (identityBox)   identityBox.className = "user-identity-box role-husband";
    if (signalTitle)   signalTitle.textContent = "아내에게 보낼 말";
    if (signalConfirm) signalConfirm.innerHTML = '<i class="ti ti-flame" aria-hidden="true"></i> 아내에게 신호 보내기';
  }

  document.querySelectorAll(".role-opt-btn").forEach(btn => {
    btn.classList.toggle("selected", btn.dataset.role === role);
  });

  // 역할 변경 시 상대방 기분 다시 구독
  if (state.db) {
    const partner  = role === "wife" ? "husband" : "wife";
    const moodRef  = getCoupleRef(`sync_mood/${partner}`);
    onValue(moodRef, snap => {
      const mood = snap.val();
      if (mood) updatePartnerMoodUI(mood);
    });
  }
}

function switchIdentity() {
  const newRole = state.identity === "wife" ? "husband" : "wife";
  triggerHaptic("tick");
  cleanupRealtimeSync(state.coupleCode);
  applyIdentity(newRole);
  showToast(`역할이 [${newRole === "wife" ? "아내" : "남편"}]로 변경되었습니다.`);
  if (state.db) initRealtimeSync();
}

// ─── 테마 ───
function applyTheme(theme) {
  state.theme = theme;
  localStorage.setItem("app_theme", theme);

  const root      = document.documentElement;
  const icon      = document.getElementById("themeToggleBtn")?.querySelector("i");
  const metaLight = document.querySelector('meta[name="theme-color"][media*="light"]');
  const metaDark  = document.querySelector('meta[name="theme-color"][media*="dark"]');

  if (theme === "dark") {
    root.setAttribute("data-theme", "dark");
    if (icon) icon.className = "ti ti-moon";
    if (metaDark) metaDark.setAttribute("content", "#0A0A0B");
  } else if (theme === "light") {
    root.setAttribute("data-theme", "light");
    if (icon) icon.className = "ti ti-sun";
    if (metaLight) metaLight.setAttribute("content", "#F8F9FA");
  } else {
    root.removeAttribute("data-theme");
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (icon) icon.className = isDark ? "ti ti-moon" : "ti ti-sun";
  }
}

function toggleTheme() {
  const next = state.theme === "light" ? "dark" : state.theme === "dark" ? "auto" : "light";
  applyTheme(next);
  const names = { light: "라이트 모드", dark: "다크 모드", auto: "시스템 설정" };
  showToast(`테마가 [${names[next]}]로 설정되었습니다.`);
}

// ─── 실시간 동기화 ───
// 기존 리스너 언오프 함수 참조 보관
const _offCallbacks = [];

function initRealtimeSync() {
  if (!state.db) return;

  // 연결 상태
  const connectedRef = ref(state.db, ".info/connected");
  onValue(connectedRef, snap => updateSyncStatusUI(snap.val() === true));

  // 내 온라인 상태 업데이트
  const presenceRef   = getCoupleRef(`presence/${state.identity}`);
  const lastActiveRef = getCoupleRef(`last_active/${state.identity}`);
  set(presenceRef,   true);
  set(lastActiveRef, serverTimestamp());
  onDisconnect(presenceRef).remove();
  onDisconnect(lastActiveRef).set(serverTimestamp());

  const partner = state.identity === "wife" ? "husband" : "wife";

  // 상대방 온라인 상태
  const partnerPresenceRef   = getCoupleRef(`presence/${partner}`);
  const partnerLastActiveRef = getCoupleRef(`last_active/${partner}`);
  onValue(partnerPresenceRef, snap => {
    document.querySelector(".partner-avatar")?.classList.toggle("pulse", !!snap.val());
  });
  onValue(partnerLastActiveRef, snap => updateLastActiveUI(snap.val()));

  // 허그 상태
  const partnerHugRef = getCoupleRef(`hugging/${partner}`);
  onValue(partnerHugRef, snap => {
    state.partnerHugging = !!snap.val();
    updateHugUI();
  });

  // 위로 카드 동기화
  let isInitialLoad = true;
  const cardsRef = getCoupleRef("sync_comfort_cards");
  onValue(cardsRef, snap => {
    flashSyncIndicator();
    const data        = snap.val();
    const oldPoolSize = state.messagePool.length;

    if (data) {
      const newPool = Object.keys(data).map(k => ({ id: k, ...data[k] }));

      if (!isInitialLoad && newPool.length > oldPoolSize) {
        const lastCard = newPool[newPool.length - 1];
        if (lastCard.author !== state.identity) {
          const authorName = lastCard.author === "wife" ? "아내" : "남편";
          showNotificationBanner("새로운 위로 도착", `${authorName}의 따뜻한 마음이 도착했어요.`, "ti ti-message-heart", "cards");
          showNativeNotification("새로운 위로 도착", `${authorName}의 따뜻한 마음이 도착했어요. ❤️`);
          playNotificationSound("message");
          triggerTabNotifyAnim(4);
        }
      }

      if (!isInitialLoad) {
        newPool.forEach(newCard => {
          const oldCard = state.messagePool.find(c => c.id === newCard.id);
          if (oldCard && (newCard.likes || 0) > (oldCard.likes || 0) && newCard.author === state.identity) {
            const partnerName = state.identity === "wife" ? "남편" : "아내";
            showNotificationBanner("마음 전달 완료", `${partnerName}이 당신의 위로에 공감했어요.`, "ti ti-heart-filled", "cards");
            showNativeNotification("마음 전달 완료", `${partnerName}이 당신의 위로에 공감했어요. ❤️`);
            playNotificationSound("like");
            for (let i = 0; i < 5; i++) setTimeout(() => createGlobalParticle("❤️"), i * 100);
          }
        });
      }

      state.messagePool = newPool;
      localStorage.setItem("sync_card_pool_v2", JSON.stringify(state.messagePool));
      renderCardScreen();
    }
    isInitialLoad = false;
  });

  // 신호 감시
  const signalRef = getCoupleRef(`sync_signal/${state.identity}`);
  onValue(signalRef, snap => {
    const val = snap.val();
    if (val && val.status === "trigger" && Date.now() - val.time < 5000) {
      openSignalOverlay(val.message);
      showNativeNotification("도움 요청 신호!", `배우자님이 위로를 기다리고 있어요: "${val.message || "나 지금 위로가 필요해"}"`);
      playNotificationSound("signal");
      triggerHaptic("signal");
      for (let i = 0; i < 10; i++) setTimeout(() => createGlobalParticle("✨"), i * 150);
    }
  });

  // 기분 감시
  let lastMood = null;
  const moodRef = getCoupleRef(`sync_mood/${partner}`);
  onValue(moodRef, snap => {
    flashSyncIndicator();
    const mood = snap.val();
    if (mood) {
      if (lastMood && lastMood !== mood) {
        const pName = state.identity === "wife" ? "남편" : "아내";
        showNotificationBanner("기분 변화 감지", `${pName}의 기분이 [${MOOD[mood]?.emoji || ""}] 으로 바뀌었어요.`, "ti ti-mood-smile", "summon");
        showNativeNotification("기분 변화 감지", `${pName}의 기분이 바뀌었어요.`);
        playNotificationSound("default");
      }
      updatePartnerMoodUI(mood);
      lastMood = mood;
    }
  });

  // 알림 센터
  const notifRef = getCoupleRef(`notifications/${state.identity}`);
  onValue(notifRef, snap => {
    const data = snap.val();
    let list   = [];
    if (data) {
      list = Object.keys(data).map(k => ({ id: k, ...data[k] }));
      list.sort((a, b) => b.time - a.time);
    }
    state.notifications = list;
    updateNotificationBadgeUI(list.filter(n => !n.read).length);
    renderNotificationList();
  });
}

function triggerTabNotifyAnim(tabIdx) {
  const tabs = document.querySelectorAll(".tab-item");
  if (tabs[tabIdx]) {
    tabs[tabIdx].classList.add("notify-anim");
    setTimeout(() => tabs[tabIdx].classList.remove("notify-anim"), 3000);
  }
}

// ─── 기분 관리 ───
function updateMyMood(mood) {
  state.myMood = mood;
  localStorage.setItem("app_user_mood", mood);
  applyMoodUI(mood);
  triggerHaptic("tick");

  if (state.db) {
    set(getCoupleRef(`sync_mood/${state.identity}`), mood);
    const partner = state.identity === "wife" ? "husband" : "wife";
    push(getCoupleRef(`notifications/${partner}`), {
      type:    "mood",
      sender:  state.identity,
      message: `기분이 [${MOOD[mood]?.emoji || ""}] 으로 변경되었어요.`,
      time:    serverTimestamp(),
      read:    false
    });
  }
}

function applyMoodUI(mood) {
  document.querySelectorAll(".mood-chip").forEach(chip => {
    const isActive = chip.dataset.mood === mood;
    chip.classList.toggle("active", isActive);
    chip.setAttribute("aria-pressed", String(isActive));
  });
}

function updatePartnerMoodUI(mood) {
  const badge = document.getElementById("partnerMoodBadge");
  const desc  = document.getElementById("partnerStatusDesc");
  if (badge) badge.textContent = MOOD[mood]?.emoji || "✨";
  if (desc)  desc.textContent  = MOOD[mood]?.desc  || "함께 따뜻한 마음을 나눠보세요";
}

// ─── 신호 오버레이 ───
function openSignalOverlay(message = "") {
  const overlay         = document.getElementById("signalArrivalOverlay");
  const senderName      = document.getElementById("signalSenderName");
  const defaultText     = document.getElementById("signalDefaultText");
  const customContainer = document.getElementById("signalCustomMessageContainer");
  const customText      = document.getElementById("signalCustomMessageText");

  if (!overlay || !senderName) return;

  senderName.textContent = state.identity === "wife" ? "남편의 신호" : "아내의 신호";

  if (message) {
    defaultText?.classList.add("is-hidden");
    customContainer?.classList.remove("is-hidden");
    if (customText) customText.textContent = message;
  } else {
    defaultText?.classList.remove("is-hidden");
    customContainer?.classList.add("is-hidden");
  }

  overlay.classList.add("active");
  overlay.setAttribute("aria-hidden", "false");

  const flash = document.createElement("div");
  flash.className = "screen-flash";
  flash.setAttribute("aria-hidden", "true");
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 1000);

  const cardTab = document.querySelectorAll(".tab-item")[4];
  if (cardTab) {
    let badge = cardTab.querySelector(".tab-badge");
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "tab-badge";
      badge.setAttribute("aria-hidden", "true");
      cardTab.appendChild(badge);
    }
    badge.classList.add("active");
  }
}

function closeSignalOverlay() {
  const overlay = document.getElementById("signalArrivalOverlay");
  if (overlay) {
    overlay.classList.remove("active");
    overlay.setAttribute("aria-hidden", "true");
  }
  navigateTab("cards");
}

function sendSignalToPartner() {
  triggerHaptic("default");
  const modal = document.getElementById("signalMessageModal");
  const input = document.getElementById("signal-custom-input");
  if (!modal) return;
  if (input) input.value = "";
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  if (input) setTimeout(() => input.focus(), 300);
}

function closeSignalMessageModal() {
  const modal = document.getElementById("signalMessageModal");
  if (modal) {
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
  }
}

function confirmSendSignal() {
  const partner  = state.identity === "wife" ? "husband" : "wife";
  const mainBtn  = document.getElementById("summonMainBtn");
  const modalBtn = document.getElementById("signalConfirmBtn");
  const input    = document.getElementById("signal-custom-input");
  const customMsg = input ? input.value.trim() : "";

  if (mainBtn?.disabled) return;

  createHeartBurst(mainBtn || document.body);
  closeSignalMessageModal();

  if (!state.db) {
    showToast("지금은 연결 상태가 조금 불안정해요. 🛰️");
    return;
  }

  if (mainBtn)  mainBtn.disabled  = true;
  if (modalBtn) modalBtn.disabled = true;

  set(getCoupleRef(`sync_signal/${partner}`), { status: "trigger", time: Date.now(), message: customMsg })
    .then(() => {
      push(getCoupleRef(`notifications/${partner}`), {
        type:    "signal",
        sender:  state.identity,
        message: customMsg || "나 지금 위로가 필요해 (도움 신호)",
        time:    serverTimestamp(),
        read:    false
      });
      showToast(customMsg ? "따뜻한 메시지와 함께 신호를 보냈어요. ✨" : "배우자에게 따뜻한 위로 신호를 보냈어요. ✨");
      setTimeout(() => {
        if (mainBtn)  mainBtn.disabled  = false;
        if (modalBtn) modalBtn.disabled = false;
      }, 3000);
    })
    .catch(err => {
      console.error("Signal send failed:", err);
      showToast("신호 전송에 실패했어요. 다시 시도해볼까요?");
      if (mainBtn)  mainBtn.disabled  = false;
      if (modalBtn) modalBtn.disabled = false;
    });
}

function createHeartBurst(parent) {
  for (let i = 0; i < 8; i++) {
    const heart  = document.createElement("i");
    heart.className = "ti ti-heart-filled heart-particle";
    heart.setAttribute("aria-hidden", "true");
    const angle  = Math.random() * Math.PI * 2;
    const dist   = 100 + Math.random() * 50;
    heart.style.setProperty("--tx", `${Math.cos(angle) * dist}px`);
    heart.style.setProperty("--ty", `${Math.sin(angle) * dist}px`);
    heart.style.left = "50%";
    heart.style.top  = "50%";
    parent.appendChild(heart);
    setTimeout(() => heart.remove(), 1000);
  }
}

// ─── 내비게이션 ───
const TAB_IDS = ["summon", "breath", "warmth", "dump", "cards"];

function navigateTab(tabId) {
  const targetIdx = TAB_IDS.indexOf(tabId);
  if (targetIdx === -1) return;

  const screens = document.querySelectorAll(".screen");
  const tabs    = document.querySelectorAll(".tab-item[data-tab]");

  let currentIdx = -1;
  tabs.forEach((tab, idx) => { if (tab.classList.contains("active")) currentIdx = idx; });
  if (currentIdx === targetIdx) return;

  screens.forEach(s => s.classList.remove("active"));
  tabs.forEach(t => {
    t.classList.remove("active");
    t.setAttribute("aria-selected", "false");
  });

  const target = document.getElementById(`scr-${tabId}`);
  if (target) {
    target.classList.add("active");
    target.scrollTo({ top: 0, behavior: "smooth" });
  }

  tabs[targetIdx].classList.add("active");
  tabs[targetIdx].setAttribute("aria-selected", "true");
  updateTabIndicator(targetIdx);

  tabs[targetIdx].querySelector(".tab-badge")?.classList.remove("active");

  if (tabId !== "breath" && state.isMeditating) stopMeditation();
  updateActivityTimestamp();
  if ("vibrate" in navigator) navigator.vibrate(10);
}

function updateTabIndicator(idx) {
  const indicator = document.getElementById("tabIndicator");
  if (indicator) indicator.style.transform = `translateX(${idx * 100}%)`;
}

// ─── 호흡 ───
function handleBreathToggle() {
  const btn = document.getElementById("breath-action-btn");
  if (state.isMeditating) {
    stopMeditation();
    if (btn) btn.textContent = "호흡 가이드 다시 시작";
  } else {
    startMeditation();
    if (btn) btn.textContent = "잠시 멈추기";
  }
}

function startMeditation() {
  state.isMeditating = true;
  const circle = document.getElementById("breath-circle");
  const desc   = document.getElementById("breath-desc");

  function breathCycle() {
    if (!state.isMeditating) return;

    if (desc) {
      desc.style.opacity = "0";
      setTimeout(() => { desc.textContent = "숨을 천천히 깊게 들이마셔요..."; desc.style.opacity = "1"; }, 300);
    }
    if (circle) { circle.style.transform = "scale(1.5)"; circle.style.opacity = "0.8"; }

    state.meditationTimer = setTimeout(() => {
      if (!state.isMeditating) return;
      if (desc) {
        desc.style.opacity = "0";
        setTimeout(() => { desc.textContent = "이제 편안하게 내뱉으세요..."; desc.style.opacity = "1"; }, 300);
      }
      if (circle) { circle.style.transform = "scale(1.0)"; circle.style.opacity = "0.3"; }
      state.meditationTimer = setTimeout(breathCycle, 4000);
    }, 4000);
  }

  breathCycle();
}

function stopMeditation() {
  state.isMeditating = false;
  clearTimeout(state.meditationTimer);
  const circle = document.getElementById("breath-circle");
  const desc   = document.getElementById("breath-desc");
  if (circle) { circle.style.transform = "scale(1.0)"; circle.style.opacity = "0.3"; }
  if (desc)   desc.textContent = "언제든 마음의 안정이 필요할 때 다시 찾아주세요.";
}

// ─── 치유 확언 ───
function rollHealingAffirmation() {
  triggerHaptic("tick");
  const textEl = document.getElementById("healingAffirmationText");
  if (!textEl) return;

  textEl.style.opacity   = "0";
  textEl.style.transform = "translateY(5px)";
  textEl.style.transition = "all 0.25s ease";

  setTimeout(() => {
    let next = HEALING_AFFIRMATIONS[Math.floor(Math.random() * HEALING_AFFIRMATIONS.length)];
    while (next === textEl.textContent && HEALING_AFFIRMATIONS.length > 1) {
      next = HEALING_AFFIRMATIONS[Math.floor(Math.random() * HEALING_AFFIRMATIONS.length)];
    }
    textEl.textContent  = next;
    textEl.style.opacity   = "1";
    textEl.style.transform = "translateY(0)";
  }, 250);
}

// ─── 텍스트 덤핑 ───
function executeTextDumping() {
  const input = document.getElementById("dump-textarea-input");
  if (!input) return;
  const text = input.value.trim();

  if (!text) {
    showToast("날려보낼 고민을 먼저 적어주세요. 💭");
    return;
  }

  triggerHaptic("signal");
  input.disabled = true;

  const viewport = document.getElementById("dumpAnimViewport");
  if (viewport) {
    const card = document.createElement("div");
    card.className   = "dump-floating-text";
    card.textContent = text;          // ← textContent (XSS 안전)
    card.setAttribute("aria-hidden", "true");
    viewport.appendChild(card);

    for (let i = 0; i < 15; i++) {
      setTimeout(() => {
        const bubble = document.createElement("div");
        bubble.className = "dump-particle";
        bubble.setAttribute("aria-hidden", "true");
        const size = Math.random() * 20 + 10;
        bubble.style.width  = `${size}px`;
        bubble.style.height = `${size}px`;
        bubble.style.left   = `${Math.random() * 80 + 10}%`;
        bubble.style.bottom = "20%";
        const colors = [
          "rgba(255, 107, 139, 0.4)", "rgba(77, 150, 255, 0.4)",
          "rgba(255, 255, 255, 0.6)", "rgba(168, 230, 207, 0.4)"
        ];
        bubble.style.background = colors[Math.floor(Math.random() * colors.length)];
        bubble.style.boxShadow  = "inset 0 0 4px rgba(255,255,255,0.8), 0 4px 10px rgba(0,0,0,0.05)";
        bubble.style.border     = "1px solid rgba(255,255,255,0.2)";
        bubble.style.setProperty("--dx", `${(Math.random() - 0.5) * 100}px`);
        viewport.appendChild(bubble);
        setTimeout(() => bubble.remove(), 3000);
      }, i * 150);
    }

    setTimeout(() => {
      card.remove();
      input.value    = "";
      input.disabled = false;
      showToast("마음속 고민들이 깔끔하게 정리되었어요. ✨");
      triggerHaptic("like");
    }, 3500);
  } else {
    input.value    = "";
    input.disabled = false;
    showToast("마음속 고민들이 깔끔하게 정리되었어요. ✨");
  }
}

// ─── 위로 카드 ───
function renderCardScreen() {
  const emptyState = document.getElementById("cards-empty-state");
  const cardMain   = document.getElementById("comfort-card-main");
  const cardList   = document.getElementById("comfort-card-list");
  if (!emptyState || !cardMain || !cardList) return;

  const isEmpty = state.messagePool.length === 0;

  emptyState.classList.toggle("is-hidden", !isEmpty);
  emptyState.setAttribute("aria-hidden", String(!isEmpty));

  if (isEmpty) {
    cardMain.classList.add("is-hidden");
    cardList.classList.add("is-hidden");
    return;
  }

  cardMain.classList.remove("is-hidden");

  if (state.isListView) {
    cardMain.classList.add("is-hidden");
    cardList.classList.remove("is-hidden");
    cardList.setAttribute("aria-hidden", "false");
    renderListView();
  } else {
    cardList.classList.add("is-hidden");
    cardList.setAttribute("aria-hidden", "true");
    if (!state.currentCardId) drawNextComfortCard();
    else updateCardUI();
  }
}

function renderListView() {
  const container = document.getElementById("card-list-container");
  if (!container) return;

  // textContent 사용으로 XSS 방지 → DOM 생성 방식
  container.innerHTML = "";
  [...state.messagePool].reverse().forEach(card => {
    const isMe = card.author === state.identity;
    const div  = document.createElement("div");
    div.className = `list-card${isMe ? " is-me" : ""}`;

    const p = document.createElement("p");
    p.className   = "list-card-text";
    p.textContent = card.text;

    const footer = document.createElement("div");
    footer.className = "list-card-footer";

    const authorSpan = document.createElement("span");
    authorSpan.className = `list-card-author${isMe ? " is-me" : ""}`;
    authorSpan.textContent = card.author === "system"
      ? "Healing Message"
      : isMe
        ? "내가 남긴 마음"
        : `${card.author === "wife" ? "아내" : "남편"}의 위로`;

    const likesSpan = document.createElement("span");
    likesSpan.className = "list-card-likes";
    likesSpan.innerHTML = `<i class="ti ti-heart-filled" aria-hidden="true"></i> ${card.likes || 0}`;

    footer.appendChild(authorSpan);
    footer.appendChild(likesSpan);
    div.appendChild(p);
    div.appendChild(footer);
    container.appendChild(div);
  });
}

function toggleCardView() {
  state.isListView = !state.isListView;
  const btn = document.getElementById("viewToggleBtn");
  if (btn) btn.querySelector("i").className = state.isListView ? "ti ti-layout-cards" : "ti ti-list";
  renderCardScreen();
}

function drawNextComfortCard() {
  if (!state.messagePool.length) { renderCardScreen(); return; }
  const card = state.messagePool[Math.floor(Math.random() * state.messagePool.length)];
  state.currentCardId = card.id || card.text;
  updateCardUI();
}

function updateCardUI() {
  const card = state.messagePool.find(c => (c.id || c.text) === state.currentCardId);
  if (!card) return;

  const msgEl       = document.getElementById("display-card-msg");
  const metaEl      = document.getElementById("display-card-meta");
  const likeCountEl = document.getElementById("cardLikeCount");
  const likeBtn     = document.getElementById("cardLikeBtn");
  if (!msgEl || !metaEl || !likeCountEl || !likeBtn) return;

  msgEl.style.opacity = "0";
  setTimeout(() => {
    msgEl.textContent  = card.text;
    metaEl.textContent = card.author === "system"
      ? "Healing Message"
      : `${card.author === "wife" ? "아내" : "남편"}의 위로`;
    likeCountEl.textContent = card.likes || 0;

    const likedCards = JSON.parse(localStorage.getItem("liked_cards") || "[]");
    const isLiked    = likedCards.includes(state.currentCardId);
    likeBtn.classList.toggle("liked", isLiked);
    likeBtn.querySelector("i").className = isLiked ? "ti ti-heart-filled" : "ti ti-heart";
    likeBtn.setAttribute("aria-pressed", String(isLiked));

    msgEl.style.opacity = "1";
  }, 300);
}

function toggleLikeCard() {
  if (!state.currentCardId) return;

  const likedCards = JSON.parse(localStorage.getItem("liked_cards") || "[]");
  const isLiked    = likedCards.includes(state.currentCardId);

  if (isLiked) {
    likedCards.splice(likedCards.indexOf(state.currentCardId), 1);
    triggerHaptic("tick");
  } else {
    likedCards.push(state.currentCardId);
    triggerHaptic("like");
  }
  localStorage.setItem("liked_cards", JSON.stringify(likedCards));

  const cardIdx = state.messagePool.findIndex(c => (c.id || c.text) === state.currentCardId);
  if (cardIdx > -1) {
    const card     = state.messagePool[cardIdx];
    const newLikes = (card.likes || 0) + (isLiked ? -1 : 1);

    if (state.db && card.id) {
      set(getCoupleRef(`sync_comfort_cards/${card.id}/likes`), newLikes).then(() => {
        if (!isLiked && card.author !== state.identity && card.author !== "system") {
          push(getCoupleRef(`notifications/${card.author}`), {
            type:    "like",
            sender:  state.identity,
            message: "내가 남겨둔 위로 카드에 공감(좋아요)을 보냈어요. ❤️",
            time:    serverTimestamp(),
            read:    false
          });
        }
      });
    } else {
      card.likes = newLikes;
      localStorage.setItem("sync_card_pool_v2", JSON.stringify(state.messagePool));
      updateCardUI();
    }
  }
}

function addComfortMessage() {
  triggerHaptic("default");
  const modal = document.getElementById("messageWriteModal");
  const input = document.getElementById("comfort-message-input");
  if (!modal || !input) return;
  input.value = "";
  const countEl = document.getElementById("char-count");
  if (countEl) countEl.textContent = "0 / 100";
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  setTimeout(() => input.focus(), 300);
}

function closeMessageModal() {
  const modal = document.getElementById("messageWriteModal");
  if (modal) { modal.classList.remove("active"); modal.setAttribute("aria-hidden", "true"); }
}

function submitComfortMessage() {
  const input  = document.getElementById("comfort-message-input");
  const btn    = document.getElementById("submitComfortMsgBtn");
  if (!input || !btn || btn.disabled) return;

  const msg = input.value.trim();
  if (!msg) { showToast("마음을 담은 메시지를 먼저 적어주세요."); return; }

  triggerHaptic("like");
  btn.disabled = true;
  const newMessage = { text: msg, author: state.identity, time: serverTimestamp(), likes: 0 };

  if (state.db) {
    push(getCoupleRef("sync_comfort_cards"), newMessage)
      .then(() => {
        const partner = state.identity === "wife" ? "husband" : "wife";
        push(getCoupleRef(`notifications/${partner}`), {
          type:    "card",
          sender:  state.identity,
          message: `새로운 위로 한마디를 남겼어요: "${msg.substring(0, 20)}..."`,
          time:    serverTimestamp(),
          read:    false
        });
        showToast("소중한 마음이 잘 저장되었습니다. ✨");
        closeMessageModal();
      })
      .catch(err => {
        console.error("Card save failed:", err);
        showToast("저장에 실패했어요. 다시 시도해볼까요?");
      })
      .finally(() => { btn.disabled = false; });
  } else {
    newMessage.time = Date.now();
    state.messagePool.push(newMessage);
    localStorage.setItem("sync_card_pool_v2", JSON.stringify(state.messagePool));
    renderCardScreen();
    showToast("로컬에 저장되었습니다. ✨");
    btn.disabled = false;
    closeMessageModal();
  }
}

function sendHeart() {
  triggerHaptic("like");
  showToast("상대방에게 사랑을 가득 보냈어요! ❤️");
  createHeartBurst(document.querySelector(".tab-item.active") || document.body);
  updateActivityTimestamp();

  if (state.db) {
    const partner = state.identity === "wife" ? "husband" : "wife";
    push(getCoupleRef(`notifications/${partner}`), {
      type:    "heart",
      sender:  state.identity,
      message: "당신을 사랑하는 마음이 듬뿍 담긴 하트를 보냈어요! ❤️",
      time:    serverTimestamp(),
      read:    false
    });
  }
}

// ─── UI 공통 ───
function closeModal() {
  document.querySelectorAll(".modal-overlay").forEach(m => {
    m.classList.remove("active");
    m.setAttribute("aria-hidden", "true");
  });
}

function showToast(msg) {
  const t = document.getElementById("globalToast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  updateActivityTimestamp();
  setElementTimeout(t, () => t.classList.remove("show"), 2500);
}

// ─── 허그 ───
function startHug() {
  state.isHugging = true;
  const btn = document.getElementById("hugBtn");
  const bg  = document.querySelector(".hug-circle-bg");
  btn?.classList.add("hugging");
  btn?.setAttribute("aria-pressed", "true");
  if (bg) bg.style.transform = "scale(1.2)";
  if (state.db) set(getCoupleRef(`hugging/${state.identity}`), true);
  updateHugUI();
}

function stopHug() {
  state.isHugging = false;
  const btn = document.getElementById("hugBtn");
  const bg  = document.querySelector(".hug-circle-bg");
  btn?.classList.remove("hugging", "shared-warmth");
  btn?.setAttribute("aria-pressed", "false");
  if (bg) bg.style.transform = "scale(0.8)";
  if (state.db) set(getCoupleRef(`hugging/${state.identity}`), false);
  updateHugUI();
}

function updateHugUI() {
  const msg    = document.getElementById("hugMessage");
  const btn    = document.getElementById("hugBtn");
  const status = document.getElementById("warmthPartnerStatus");
  const isOnline = document.querySelector(".partner-avatar")?.classList.contains("pulse");

  if (!msg || !btn || !status) return;

  status.textContent = isOnline ? "상대방이 연결되어 있어요" : "상대방을 기다리고 있어요...";
  status.classList.toggle("online", !!isOnline);

  if (state.isHugging && state.partnerHugging) {
    msg.textContent = "서로의 온기가 연결되었습니다! ❤️";
    btn.classList.add("shared-warmth");
    triggerHaptic("hug");
  } else if (state.isHugging) {
    msg.textContent = "상대방의 온기를 기다리는 중...";
  } else if (state.partnerHugging) {
    msg.textContent = "상대방이 당신을 안아주고 싶어해요!";
    triggerTabNotifyAnim(2);
  } else {
    msg.textContent = "버튼을 길게 눌러보세요";
  }
}

// ─── 연결 상태 UI ───
function updateSyncStatusUI(isConnected) {
  const syncStatus = document.getElementById("syncStatus");
  if (!syncStatus) return;
  syncStatus.classList.toggle("offline", !isConnected);
  const label = syncStatus.querySelector(".status-label");
  if (label) label.textContent = isConnected ? "연결됨" : "연결 끊김";
}

function updateLastActiveUI(timestamp) {
  const el = document.getElementById("partnerLastActive");
  if (!el || !timestamp) return;
  const diff = Math.floor((Date.now() - timestamp) / 60000);
  el.textContent = diff < 1 ? "방금 전 활동" : diff < 60 ? `${diff}분 전 활동` : diff < 1440 ? `${Math.floor(diff / 60)}시간 전 활동` : "오래전 활동";
}

function updateActivityTimestamp() {
  if (state.db) set(getCoupleRef(`last_active/${state.identity}`), serverTimestamp());
}

function flashSyncIndicator() {
  const el = document.getElementById("syncStatus");
  if (!el) return;
  el.classList.add("syncing");
  setTimeout(() => el.classList.remove("syncing"), 1000);
}

// ─── 리스너 정리 ───
function cleanupRealtimeSync(code) {
  if (!state.db) return;
  const partner = state.identity === "wife" ? "husband" : "wife";
  const paths = [
    `couples/${code}/presence/${partner}`,
    `couples/${code}/last_active/${partner}`,
    `couples/${code}/hugging/${partner}`,
    `couples/${code}/sync_comfort_cards`,
    `couples/${code}/sync_signal/${state.identity}`,
    `couples/${code}/sync_mood/${partner}`,
    `couples/${code}/notifications/${state.identity}`,
  ];
  paths.forEach(path => {
    try { off(ref(state.db, path)); } catch (e) { console.warn("Cleanup error:", e); }
  });
}

// ─── 커플 연결 모달 ───
function openCoupleModal() {
  triggerHaptic("default");
  const modal       = document.getElementById("coupleConnectionModal");
  const myCodeEl    = document.getElementById("myCoupleCodeDisplay");
  const partnerInput = document.getElementById("partnerCoupleCodeInput");
  if (!modal) return;
  if (myCodeEl)     myCodeEl.value    = state.coupleCode;
  if (partnerInput) partnerInput.value = "";
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
}

function closeCoupleModal() {
  const modal = document.getElementById("coupleConnectionModal");
  if (modal) { modal.classList.remove("active"); modal.setAttribute("aria-hidden", "true"); }
}

function updateCoupleBadgeUI() {
  const badge = document.getElementById("coupleBadge");
  if (!badge) return;
  const isDemo = state.coupleCode === "DEMO-CHANNEL";
  badge.className  = `couple-badge ${isDemo ? "public" : "private"}`;
  badge.textContent = isDemo ? "공용" : "연결";

  const statusLabel = document.querySelector(".partner-connection-status");
  if (statusLabel) {
    statusLabel.textContent = isDemo ? "공용 채널 (보안 연결 없음)" : "우리 부부만의 보안 공간";
    statusLabel.classList.toggle("online", !isDemo);
  }
}

function generateNewCoupleCode() {
  triggerHaptic("tick");
  const chars   = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const randStr = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  const newCode = `MEC-${randStr}`;
  const myCodeEl = document.getElementById("myCoupleCodeDisplay");
  if (myCodeEl) myCodeEl.value = newCode;
  showToast("새로운 코드를 생성했습니다. 상대방에게 전달하세요!");
}

function connectCoupleCode() {
  const input      = document.getElementById("partnerCoupleCodeInput");
  if (!input) return;
  const targetCode = input.value.trim().toUpperCase();
  if (!targetCode)     { showToast("상대방의 코드를 먼저 입력해 주세요."); return; }
  if (targetCode.length < 8) { showToast("올바른 코드 형식(MEC-XXXXXX)을 입력해 주세요."); return; }

  triggerHaptic("like");
  cleanupRealtimeSync(state.coupleCode);
  state.coupleCode = targetCode;
  localStorage.setItem("app_couple_code", targetCode);
  updateCoupleBadgeUI();
  closeCoupleModal();

  if (state.db) {
    push(getCoupleRef(`notifications/${state.identity === "wife" ? "husband" : "wife"}`), {
      type:    "system",
      sender:  "system",
      message: `서로의 기기가 비밀 커플 공간(${targetCode})으로 안전하게 연결되었습니다. ✨`,
      time:    serverTimestamp(),
      read:    false
    });
    initRealtimeSync();
    showToast("커플 비밀 공간으로 성공적으로 전환되었습니다! 💑");
  } else {
    showToast(`로컬 코드가 변경되었습니다: ${targetCode}`);
  }
}

function resetToDemoChannel() {
  triggerHaptic("tick");
  if (state.coupleCode === "DEMO-CHANNEL") { showToast("이미 공용 채널을 사용하고 있습니다."); return; }
  cleanupRealtimeSync(state.coupleCode);
  state.coupleCode = "DEMO-CHANNEL";
  localStorage.setItem("app_couple_code", "DEMO-CHANNEL");
  updateCoupleBadgeUI();
  closeCoupleModal();
  if (state.db) { initRealtimeSync(); showToast("공용 채널로 복귀했습니다."); }
  else showToast("공용 채널로 설정되었습니다.");
}

function copyCoupleCode() {
  const el = document.getElementById("myCoupleCodeDisplay");
  if (!el) return;
  triggerHaptic("tick");
  navigator.clipboard.writeText(el.value)
    .then(() => showToast("커플 코드가 클립보드에 복사되었습니다! 📋"))
    .catch(() => showToast("복사에 실패했습니다. 직접 복사해 주세요."));
}

// ─── 알림 센터 ───
function openNotifCenterModal() {
  triggerHaptic("default");
  const modal = document.getElementById("notifCenterModal");
  if (!modal) return;
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  updateNotificationPermissionUI();
  markAllNotificationsAsRead();
}

function closeNotifCenterModal() {
  const modal = document.getElementById("notifCenterModal");
  if (modal) { modal.classList.remove("active"); modal.setAttribute("aria-hidden", "true"); }
}

function updateNotificationPermissionUI() {
  const statusEl = document.getElementById("notifPermissionStatus");
  const btn      = document.getElementById("requestNotifPermBtn");
  if (!statusEl || !btn) return;

  if (!("Notification" in window)) {
    statusEl.textContent = "알림 미지원 브라우저";
    btn.classList.add("is-hidden");
    return;
  }
  if (Notification.permission === "granted") {
    statusEl.textContent = "기기 알림: 활성화";
    btn.classList.add("is-hidden");
  } else if (Notification.permission === "denied") {
    statusEl.textContent = "기기 알림: 차단됨";
    btn.textContent = "설정 필요";
    btn.disabled = true;
  } else {
    statusEl.textContent = "기기 알림: 허용 필요";
    btn.textContent = "알림 허용";
    btn.disabled = false;
  }
}

function requestNotificationPermission() {
  triggerHaptic("tick");
  if (!("Notification" in window)) return;
  Notification.requestPermission().then(permission => {
    updateNotificationPermissionUI();
    if (permission === "granted") {
      showToast("기기 알림 수신이 활성화되었습니다! 🔔");
      new Notification("마음안식처", {
        body: "이제 배우자의 마음 신호를 기기 알림으로 실시간으로 받아보실 수 있습니다. ❤️",
        icon: "https://img.icons8.com/ios-filled/512/ff6b8b/hearts.png"
      });
    }
  });
}

function showNativeNotification(title, body) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  if (document.visibilityState !== "visible") {
    navigator.serviceWorker.ready
      .then(reg => reg.showNotification(title, {
        body, icon: "https://img.icons8.com/ios-filled/192/ff6b8b/hearts.png",
        badge: "https://img.icons8.com/ios-filled/96/ff6b8b/hearts.png",
        vibrate: [200, 100, 200]
      }))
      .catch(() => new Notification(title, { body, icon: "https://img.icons8.com/ios-filled/192/ff6b8b/hearts.png" }));
  }
}

function updateNotificationBadgeUI(count) {
  const badge = document.getElementById("notifCountBadge");
  const bell  = document.getElementById("notifBellBtn");
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count > 9 ? "9+" : count;
    badge.classList.remove("is-hidden");
    bell?.classList.add("notify-anim");
  } else {
    badge.classList.add("is-hidden");
    bell?.classList.remove("notify-anim");
  }
}

function renderNotificationList() {
  const container = document.getElementById("notif-list-container");
  if (!container) return;

  if (state.notifications.length === 0) {
    container.innerHTML = `
      <div class="notif-empty-state">
        <i class="ti ti-bell-off" aria-hidden="true"></i>
        <p>아직 도착한 알림이 없어요.<br>서로에게 첫 번째 신호나 하트를 보내보세요!</p>
      </div>`;
    return;
  }

  container.innerHTML = "";
  state.notifications.forEach(notif => {
    const isWife     = notif.sender === "wife";
    const senderText = isWife ? "아내🌸" : notif.sender === "husband" ? "남편🙋‍♂️" : "시스템✨";
    const roleClass  = isWife ? "wife" : notif.sender === "husband" ? "husband" : "system";
    const iconClass  = {
      heart:  "ti-heart-filled", signal: "ti-alert-circle-filled",
      mood:   "ti-mood-smile",   card:   "ti-message-heart"
    }[notif.type] || "ti-device-heart";
    const dateStr = notif.time
      ? new Date(notif.time).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
      : "방금 전";

    const item = document.createElement("div");
    item.className = `notif-item${notif.read ? "" : " unread"}`;

    const iconDiv = document.createElement("div");
    iconDiv.className = `notif-item-icon ${roleClass}`;
    iconDiv.innerHTML = `<i class="ti ${iconClass}" aria-hidden="true"></i>`;

    const contentDiv = document.createElement("div");
    contentDiv.className = "notif-item-content";

    const bodyDiv = document.createElement("div");
    bodyDiv.className = "notif-item-body";
    const strong = document.createElement("strong");
    strong.textContent = senderText;
    bodyDiv.appendChild(strong);
    bodyDiv.appendChild(document.createTextNode(": " + notif.message));

    const timeDiv = document.createElement("div");
    timeDiv.className   = "notif-item-time";
    timeDiv.textContent = dateStr;

    contentDiv.appendChild(bodyDiv);
    contentDiv.appendChild(timeDiv);
    item.appendChild(iconDiv);
    item.appendChild(contentDiv);
    container.appendChild(item);
  });
}

function markAllNotificationsAsRead() {
  if (!state.db || state.notifications.length === 0) return;
  state.notifications.forEach(notif => {
    if (!notif.read && notif.id) set(getCoupleRef(`notifications/${state.identity}/${notif.id}/read`), true);
  });
}

function clearAllNotifications() {
  if (!state.db) return;
  triggerHaptic("tick");
  if (confirm("정말 모든 알림 기록을 지우시겠습니까?")) {
    remove(getCoupleRef(`notifications/${state.identity}`))
      .then(() => showToast("알림 기록이 모두 삭제되었습니다. 🧼"))
      .catch(err => console.error("Notif clear failed:", err));
  }
}

// ─── 감정 일지 ───
function submitEmotionJournal() {
  const input = document.getElementById("emotionJournalInput");
  if (!input) return;
  const text = input.value.trim();
  if (!text) { showToast("한 줄 일지를 먼저 입력해 주세요. 📝"); return; }

  triggerHaptic("tick");
  const entry = { text, mood: state.myMood, time: Date.now(), role: state.identity };
  state.emotionJournal.unshift(entry);
  if (state.emotionJournal.length > 5) state.emotionJournal.length = 5;
  localStorage.setItem("emotion_journal_v1", JSON.stringify(state.emotionJournal));
  input.value = "";
  renderEmotionJournalFeed();
  showToast("오늘의 감정이 기록되었어요. ✨");

  if (state.db) {
    const partner = state.identity === "wife" ? "husband" : "wife";
    push(getCoupleRef(`notifications/${partner}`), {
      type:    "journal",
      sender:  state.identity,
      message: `오늘의 감정 일지를 남겼어요: "${text.substring(0, 20)}"`,
      time:    serverTimestamp(),
      read:    false
    });
  }
}

function renderEmotionJournalFeed() {
  const feed = document.getElementById("emotionJournalFeed");
  if (!feed) return;
  feed.innerHTML = "";
  state.emotionJournal.forEach(entry => {
    const div = document.createElement("div");
    div.className = "emotion-entry";
    div.setAttribute("aria-label", `${MOOD[entry.mood]?.emoji || "💭"} ${entry.text}`);

    const emoji = document.createElement("span");
    emoji.className   = "emotion-entry-emoji";
    emoji.textContent = MOOD[entry.mood]?.emoji || "💭";
    emoji.setAttribute("aria-hidden", "true");

    const textEl = document.createElement("span");
    textEl.className   = "emotion-entry-text";
    textEl.textContent = entry.text;

    const timeEl = document.createElement("span");
    timeEl.className   = "emotion-entry-time";
    timeEl.textContent = new Date(entry.time).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });

    div.appendChild(emoji);
    div.appendChild(textEl);
    div.appendChild(timeEl);
    feed.appendChild(div);
  });
}

// ─── 사랑 메모 ───
function sendLoveMemo() {
  const input = document.getElementById("loveMemoInput");
  if (!input) return;
  const text = input.value.trim();
  if (!text) { showToast("보내고 싶은 말을 먼저 적어주세요. 💌"); return; }

  triggerHaptic("like");
  const memo = { text, sender: state.identity, time: Date.now() };
  state.loveMemos.unshift(memo);
  if (state.loveMemos.length > 3) state.loveMemos.length = 3;
  localStorage.setItem("love_memos_v1", JSON.stringify(state.loveMemos));

  if (state.db) {
    const partner = state.identity === "wife" ? "husband" : "wife";
    push(getCoupleRef(`notifications/${partner}`), {
      type:    "heart",
      sender:  state.identity,
      message: `💌 "${text}"`,
      time:    serverTimestamp(),
      read:    false
    });
    set(getCoupleRef("love_memo"), { text, sender: state.identity, time: serverTimestamp() });
  }

  input.value = "";
  renderLoveMemoDisplay();
  showToast("사랑의 메모를 전달했어요! 💕");
}

function renderLoveMemoDisplay() {
  const display = document.getElementById("loveMemoDisplay");
  if (!display) return;

  if (state.loveMemos.length === 0) {
    display.innerHTML = '<span class="love-memo-placeholder">아직 보낸 메모가 없어요. 사랑을 담아 보내보세요 💕</span>';
    return;
  }

  display.innerHTML = "";
  state.loveMemos.forEach(memo => {
    const isMe        = memo.sender === state.identity;
    const senderLabel = isMe ? "내가" : memo.sender === "wife" ? "아내가" : "남편이";
    const timeStr     = new Date(memo.time).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });

    const div = document.createElement("div");
    div.className = `love-memo-item${isMe ? " is-me" : ""}`;

    const senderEl = document.createElement("span");
    senderEl.className   = "love-memo-sender";
    senderEl.textContent = senderLabel;

    const textEl = document.createElement("span");
    textEl.className   = "love-memo-text";
    textEl.textContent = `"${memo.text}"`;

    const timeEl = document.createElement("span");
    timeEl.className   = "love-memo-time";
    timeEl.textContent = timeStr;

    div.appendChild(senderEl);
    div.appendChild(textEl);
    div.appendChild(timeEl);
    display.appendChild(div);
  });
}

// ─── 진동 / 햅틱 ───
function triggerHaptic(type) {
  if ("vibrate" in navigator) {
    const patterns = { tick: 15, like: 40, hug: [40, 40, 40], signal: [200, 100, 200, 100, 200] };
    navigator.vibrate(patterns[type] || 30);
  }

  try {
    initAudio();
    if (!state.audioCtx) return;
    const osc  = state.audioCtx.createOscillator();
    const gain = state.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(state.audioCtx.destination);
    const now = state.audioCtx.currentTime;

    const configs = {
      tick:   () => { osc.frequency.setValueAtTime(150, now); gain.gain.setValueAtTime(0.01, now); gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05); osc.start(now); osc.stop(now + 0.05); },
      like:   () => { osc.frequency.setValueAtTime(200, now); osc.frequency.exponentialRampToValueAtTime(300, now + 0.08); gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08); osc.start(now); osc.stop(now + 0.08); },
      hug:    () => { osc.type = "triangle"; osc.frequency.setValueAtTime(60, now); gain.gain.setValueAtTime(0.2, now); gain.gain.linearRampToValueAtTime(0.2, now + 0.1); gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15); osc.start(now); osc.stop(now + 0.15); },
      signal: () => { osc.frequency.setValueAtTime(440, now); osc.frequency.exponentialRampToValueAtTime(880, now + 0.2); gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2); osc.start(now); osc.stop(now + 0.2); }
    };

    configs[type]?.();
  } catch (e) {
    console.warn("Haptic synthesis not supported:", e);
  }
}

// ════════════════════════════════════════════════
//  반응형 레이아웃 — 사이드바 & 파트너 패널 연동
// ════════════════════════════════════════════════

/**
 * 사이드바, 파트너 패널의 이벤트를 bindAllEvents()에 추가 연결
 * DOMContentLoaded 이후 자동 실행
 */
function bindResponsiveEvents() {
  // 사이드바 탭 아이템
  document.querySelectorAll(".sidebar-item[data-tab]").forEach(btn => {
    btn.addEventListener("click", () => navigateTab(btn.dataset.tab));
  });

  // 사이드바 헤더 버튼들
  document.getElementById("helpBtnSidebar")         ?.addEventListener("click", openHelpModal);
  document.getElementById("themeToggleBtnSidebar")  ?.addEventListener("click", toggleTheme);
  document.getElementById("userIdentityBoxSidebar") ?.addEventListener("click", switchIdentity);

  // 파트너 패널 빠른 액션
  document.getElementById("ppSendSignalBtn") ?.addEventListener("click", sendSignalToPartner);
  document.getElementById("ppSendHeartBtn")  ?.addEventListener("click", sendHeart);
  document.getElementById("ppCoupleBtn")     ?.addEventListener("click", openCoupleModal);
  document.getElementById("ppNotifBtn")      ?.addEventListener("click", openNotifCenterModal);
}

/**
 * 탭 이동 시 사이드바 active 상태 동기화
 */
function updateSidebarActiveState(tabId) {
  document.querySelectorAll(".sidebar-item[data-tab]").forEach(btn => {
    const isActive = btn.dataset.tab === tabId;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", String(isActive));
  });
}

/**
 * 파트너 패널 — 기분 표시 업데이트
 */
function updatePartnerPanelMood(mood) {
  const emojiEl = document.getElementById("ppMoodEmoji");
  const textEl  = document.getElementById("ppMoodText");
  if (emojiEl) emojiEl.textContent = MOOD[mood]?.emoji || "✨";
  if (textEl)  textEl.textContent  = MOOD[mood]?.desc  || "연결 중...";
}

/**
 * 파트너 패널 — 파트너 기본 정보 동기화
 */
function syncPartnerPanelIdentity(role) {
  const partnerRole  = role === "wife" ? "husband" : "wife";
  const nameEl       = document.getElementById("partnerNameSidebar");
  const descEl       = document.getElementById("partnerStatusDescSidebar");
  const labelEl      = document.getElementById("identityLabelSidebar");
  const badgeEl      = document.getElementById("coupleBadgeSidebar");

  if (nameEl) nameEl.textContent = role === "wife" ? "사랑하는 남편" : "사랑하는 아내";
  if (labelEl) labelEl.textContent = role === "wife" ? "🌸 아내" : "🙋‍♂️ 남편";

  // identity box 클래스
  const idBoxSidebar = document.getElementById("userIdentityBoxSidebar");
  if (idBoxSidebar) {
    idBoxSidebar.className = `user-identity-box pp-identity-btn role-${role}`;
  }

  // 커플 뱃지 동기화
  if (badgeEl) {
    const isDemo = state.coupleCode === "DEMO-CHANNEL";
    badgeEl.className = `couple-badge ${isDemo ? "public" : "private"}`;
    badgeEl.textContent = isDemo ? "공용" : "연결";
  }
}

/**
 * 파트너 패널 — 알림 배지 동기화
 */
function updatePartnerPanelNotifBadge(count) {
  const badge = document.getElementById("notifCountBadgeSidebar");
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count > 9 ? "9+" : count;
    badge.classList.remove("is-hidden");
  } else {
    badge.classList.add("is-hidden");
  }
}

/**
 * 파트너 패널 — 온라인 상태 아바타 동기화
 */
function updatePartnerPanelPresence(isOnline) {
  document.getElementById("partnerPulseSidebar")
    ?.classList.toggle("pulse", isOnline);
}

/**
 * 기존 navigateTab 래핑 — 사이드바 동기화 추가
 * (app.js 원본 navigateTab 함수 뒤에 패치)
 */
const _originalNavigateTab = navigateTab;
// navigateTab을 새 버전으로 교체
function navigateTab(tabId) {
  _originalNavigateTab(tabId);
  updateSidebarActiveState(tabId);
}

/**
 * 기존 applyIdentity 래핑 — 파트너 패널 동기화 추가
 */
const _originalApplyIdentity = applyIdentity;
function applyIdentity(role) {
  _originalApplyIdentity(role);
  syncPartnerPanelIdentity(role);
}

/**
 * 기존 updatePartnerMoodUI 래핑 — 파트너 패널 동기화 추가
 */
const _originalUpdatePartnerMoodUI = updatePartnerMoodUI;
function updatePartnerMoodUI(mood) {
  _originalUpdatePartnerMoodUI(mood);
  updatePartnerPanelMood(mood);
}

/**
 * 기존 updateNotificationBadgeUI 래핑 — 파트너 패널 배지 동기화
 */
const _originalUpdateNotificationBadgeUI = updateNotificationBadgeUI;
function updateNotificationBadgeUI(count) {
  _originalUpdateNotificationBadgeUI(count);
  updatePartnerPanelNotifBadge(count);
}

/**
 * 기존 updateCoupleBadgeUI 래핑 — 파트너 패널 배지 동기화
 */
const _originalUpdateCoupleBadgeUI = updateCoupleBadgeUI;
function updateCoupleBadgeUI() {
  _originalUpdateCoupleBadgeUI();
  // 파트너 패널 배지도 동기화
  const badgeEl = document.getElementById("coupleBadgeSidebar");
  if (badgeEl) {
    const isDemo = state.coupleCode === "DEMO-CHANNEL";
    badgeEl.className = `couple-badge ${isDemo ? "public" : "private"}`;
    badgeEl.textContent = isDemo ? "공용" : "연결";
  }
}

// DOMContentLoaded 이후 반응형 이벤트 바인딩
document.addEventListener("DOMContentLoaded", () => {
  bindResponsiveEvents();
  // 초기 사이드바 상태 동기화
  updateSidebarActiveState("summon");
  syncPartnerPanelIdentity(state.identity);
});