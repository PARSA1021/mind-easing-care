/**
 * MEC (Mind Easing Care) - Core Logic
 * 2026 Premium Mobile App Experience
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getDatabase, ref, onValue, set, push, serverTimestamp, off } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-database.js";

// ─── Configuration & State ───
const firebaseConfig = { 
  apiKey: "AIzaSyCj5wt9MrRe0BETGtS3ECvuSt7ekm1kXqg", 
  authDomain: "sm-ge-mind-app.firebaseapp.com", 
  projectId: "sm-ge-mind-app", 
  storageBucket: "sm-ge-mind-app.firebasestorage.app", 
  messagingSenderId: "308528383337", 
  appId: "1:308528383337:web:19204cb5de20201977e9f8",
  databaseURL: "https://sm-ge-mind-app-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

const state = {
  db: null,
  identity: localStorage.getItem("app_user_identity") || "wife",
  theme: localStorage.getItem("app_theme") || "auto",
  messagePool: JSON.parse(localStorage.getItem("sync_card_pool_v2")) || [
    { text: "오늘 하루도 정말 고생 많았어요. 내가 늘 옆에 있을게요.", author: "system", likes: 0 },
    { text: "잠시 눈을 감고 깊게 숨을 쉬어봐요. 당신은 충분히 잘하고 있어요.", author: "system", likes: 0 },
    { text: "어떤 일이 있어도 우리는 함께니까 괜찮아요.", author: "system", likes: 0 },
  ],
  isMeditating: false,
  meditationTimer: null,
  audioCtx: null,
  currentCardId: null,
  isListView: false,
};

// ─── Initialization ───
document.addEventListener("DOMContentLoaded", () => {
  initFirebase();
  applyIdentity(state.identity);
  applyTheme(state.theme);
  initRealtimeSync();
  setupEventListeners();
  checkFirstVisit();
  updateTabIndicator(0);
  registerServiceWorker();
  renderCardScreen();
});

// 전역 함수로 등록 (HTML onclick 대응)
window.switchIdentity = switchIdentity;
window.toggleTheme = toggleTheme;
window.sendSignalToPartner = sendSignalToPartner;
window.navigateTab = navigateTab;
window.handleBreathToggle = handleBreathToggle;
window.executeTextDumping = executeTextDumping;
window.drawNextComfortCard = drawNextComfortCard;
window.addComfortMessage = addComfortMessage;
window.sendHeart = sendHeart;
window.openHelpModal = openHelpModal;
window.closeHelpModal = closeHelpModal;
window.closeModal = closeModal;
window.closeSignalOverlay = closeSignalOverlay;
window.closeMessageModal = closeMessageModal;
window.submitComfortMessage = submitComfortMessage;
window.updateCharCount = updateCharCount;
window.toggleLikeCard = toggleLikeCard;
window.playNotificationSound = playNotificationSound;
window.toggleCardView = toggleCardView;

function initAudio() {
  if (!state.audioCtx) {
    state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playNotificationSound() {
  initAudio();
  const ctx = state.audioCtx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
  osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5); // A4

  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.5);
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').then(reg => {
        console.log('SW registered:', reg);
      }).catch(err => {
        console.log('SW registration failed:', err);
      });
    });
  }
}

function initFirebase() {
  try {
    const app = initializeApp(firebaseConfig);
    state.db = getDatabase(app);
  } catch (e) {
    console.warn("Firebase initialization failed:", e);
  }
}

function setupEventListeners() {
  // 터치 피드백 등 필요한 글로벌 리스너
  document.addEventListener("touchstart", () => {}, { passive: true });

  // 시스템 테마 변경 감지
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    if (state.theme === "auto") {
      applyTheme("auto");
    }
  });

  // 가이드 모달 스크롤 이벤트 (페이지네이션 연동)
  const guideContainer = document.querySelector('.guide-scroll-container');
  if (guideContainer) {
    guideContainer.addEventListener('scroll', () => {
      const index = Math.round(guideContainer.scrollLeft / guideContainer.clientWidth);
      const dots = document.querySelectorAll('.guide-pagination .dot');
      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
      });
    });
  }
}

function checkFirstVisit() {
  if (!localStorage.getItem("has_seen_guide")) {
    setTimeout(() => openHelpModal(), 500);
  }
}

function openHelpModal() {
  const modal = document.getElementById("helpGuideModal");
  modal.classList.add("active");
  // 열 때 첫 번째 페이지로 초기화
  const container = modal.querySelector('.guide-scroll-container');
  if (container) container.scrollLeft = 0;
}

// ─── Identity Management ───
function applyIdentity(role) {
  state.identity = role;
  localStorage.setItem("app_user_identity", role);

  const label = document.getElementById("identityLabel");
  const partnerName = document.getElementById("partnerName");
  const partnerAvatar = document.querySelector(".partner-avatar i");

  if (role === "wife") {
    label.textContent = "🌸 아내";
    partnerName.textContent = "남편 상태";
    partnerAvatar.className = "ti ti-user-heart";
  } else {
    label.textContent = "🙋‍♂️ 남편";
    partnerName.textContent = "아내 상태";
    partnerAvatar.className = "ti ti-user-heart";
  }
}

function switchIdentity() {
  const oldRole = state.identity;
  const newRole = oldRole === "wife" ? "husband" : "wife";
  
  applyIdentity(newRole);
  showToast(`역할이 [${newRole === "wife" ? "아내" : "남편"}]로 변경되었습니다.`);
  
  // 역할 변경 시 Firebase 연결 재설정
  if (state.db) {
    const signalRef = ref(state.db, `sync_signal/${oldRole}`);
    off(signalRef);
    initRealtimeSync();
  }
}

// ─── Theme Management ───
function applyTheme(theme) {
  state.theme = theme;
  localStorage.setItem("app_theme", theme);
  
  const root = document.documentElement;
  const btn = document.getElementById("themeToggleBtn");
  const icon = btn?.querySelector("i");
  const metaTheme = document.querySelector('meta[name="theme-color"]');

  if (theme === "dark") {
    root.setAttribute("data-theme", "dark");
    if (icon) icon.className = "ti ti-moon";
    if (metaTheme) metaTheme.setAttribute("content", "#0A0A0B");
  } else if (theme === "light") {
    root.setAttribute("data-theme", "light");
    if (icon) icon.className = "ti ti-sun";
    if (metaTheme) metaTheme.setAttribute("content", "#F8F9FA");
  } else {
    root.removeAttribute("data-theme");
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (icon) icon.className = isDark ? "ti ti-moon" : "ti ti-sun";
    if (metaTheme) metaTheme.setAttribute("content", isDark ? "#0A0A0B" : "#F8F9FA");
  }
}

function toggleTheme() {
  const current = state.theme;
  let next = "light";
  
  if (current === "light") next = "dark";
  else if (current === "dark") next = "auto";
  else next = "light"; // auto -> light

  applyTheme(next);
  
  const themeNames = { light: "라이트 모드", dark: "다크 모드", auto: "시스템 설정" };
  showToast(`테마가 [${themeNames[next]}]로 설정되었습니다.`);
}

// ─── Real-time Sync ───
function initRealtimeSync() {
  if (!state.db) return;

  // 카드 동기화
  const cardsRef = ref(state.db, "sync_comfort_cards");
  onValue(cardsRef, (snap) => {
    const data = snap.val();
    if (data) {
      state.messagePool = Object.keys(data).map((k) => ({ id: k, ...data[k] }));
      localStorage.setItem("sync_card_pool_v2", JSON.stringify(state.messagePool));
      renderCardScreen();
    }
  });

  // 호출 신호 감시
  const signalRef = ref(state.db, `sync_signal/${state.identity}`);
  onValue(signalRef, (snap) => {
    const val = snap.val();
    if (val && val.status === "trigger") {
      // 본인이 보낸 신호가 아닌 경우에만 알림 (시간차 체크)
      if (Date.now() - val.time < 5000) {
        openSignalOverlay();
        playNotificationSound();
        if ("vibrate" in navigator) navigator.vibrate([200, 100, 200, 100, 200]);
      }
    }
  });
}

function openSignalOverlay() {
  const overlay = document.getElementById("signalArrivalOverlay");
  const senderName = document.getElementById("signalSenderName");
  if (!overlay || !senderName) return;

  senderName.textContent = state.identity === "wife" ? "남편의 신호" : "아내의 신호";
  overlay.classList.add("active");
  
  // 시각적 강조: 화면 플래시 효과
  const flash = document.createElement("div");
  flash.className = "screen-flash";
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 1000);
  
  // 탭 바에 알림 뱃지 표시
  const cardTab = document.querySelectorAll(".tab-item")[3];
  if (cardTab) {
    let badge = cardTab.querySelector(".tab-badge");
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "tab-badge";
      cardTab.appendChild(badge);
    }
    badge.classList.add("active");
  }
}

function closeSignalOverlay() {
  const overlay = document.getElementById("signalArrivalOverlay");
  overlay.classList.remove("active");
  // 신호 확인 후 카드로 바로 이동시켜주는 UX
  navigateTab('cards');
}

function sendSignalToPartner() {
  const partner = state.identity === "wife" ? "husband" : "wife";
  const btn = document.querySelector(".summon-main-btn");
  
  if (btn.disabled) return;

  // UI Feedback: Heart Burst
  createHeartBurst(btn);

  if (state.db) {
    btn.disabled = true;
    const partnerSignalRef = ref(state.db, `sync_signal/${partner}`);
    set(partnerSignalRef, {
      status: "trigger",
      time: Date.now(),
    }).then(() => {
      showToast("상대방에게 마음을 전했습니다. ✨");
      setTimeout(() => { btn.disabled = false; }, 3000); // 3초 쿨다운
    }).catch((err) => {
      console.error("Signal send failed:", err);
      showToast("신호 전송에 실패했습니다. 다시 시도해주세요.");
      btn.disabled = false;
    });
  } else {
    showToast("연결 상태가 불안정합니다. 확인 중... 🛰️");
  }
}

function createHeartBurst(parent) {
  for (let i = 0; i < 8; i++) {
    const heart = document.createElement('i');
    heart.className = 'ti ti-heart-filled heart-particle';
    
    // Random direction
    const angle = (Math.random() * Math.PI * 2);
    const dist = 100 + Math.random() * 50;
    const tx = Math.cos(angle) * dist;
    const ty = Math.sin(angle) * dist;
    
    heart.style.setProperty('--tx', `${tx}px`);
    heart.style.setProperty('--ty', `${ty}px`);
    heart.style.left = '50%';
    heart.style.top = '50%';
    
    parent.appendChild(heart);
    setTimeout(() => heart.remove(), 1000);
  }
}

// ─── Navigation ───
function navigateTab(tabId) {
  const screens = document.querySelectorAll(".screen");
  const tabs = document.querySelectorAll(".tab-item");
  const targetIdx = ["summon", "breath", "dump", "cards"].indexOf(tabId);

  screens.forEach((s) => s.classList.remove("active"));
  tabs.forEach((t) => {
    t.classList.remove("active");
    t.setAttribute("aria-selected", "false");
  });

  document.getElementById("scr-" + tabId).classList.add("active");
  tabs[targetIdx].classList.add("active");
  tabs[targetIdx].setAttribute("aria-selected", "true");

  updateTabIndicator(targetIdx);

  // 탭 이동 시 알림 뱃지 제거
  const badge = tabs[targetIdx].querySelector(".tab-badge");
  if (badge) badge.classList.remove("active");

  // 탭 이동 시 명상 중단
  if (tabId !== "breath" && state.isMeditating) {
    stopMeditation();
  }
}

function updateTabIndicator(idx) {
  const indicator = document.getElementById("tabIndicator");
  if (indicator) {
    indicator.style.transform = `translateX(${idx * 100}%)`;
  }
}

// ─── Meditation (Breath) ───
function handleBreathToggle() {
  const btn = document.getElementById("breath-action-btn");
  if (state.isMeditating) {
    stopMeditation();
    btn.textContent = "호흡 시작";
  } else {
    startMeditation();
    btn.textContent = "그만하기";
  }
}

function startMeditation() {
  state.isMeditating = true;
  const circle = document.getElementById("breath-circle");
  const text = document.getElementById("breath-title");
  
  const cycle = () => {
    if (!state.isMeditating) return;
    
    // Inhale
    circle.className = "breath-circle inhale";
    text.textContent = "숨을 깊게 들이마셔요";
    
    state.meditationTimer = setTimeout(() => {
      if (!state.isMeditating) return;
      // Exhale
      circle.className = "breath-circle exhale";
      text.textContent = "천천히 내뱉으세요";
      
      state.meditationTimer = setTimeout(cycle, 4000);
    }, 4000);
  };
  
  cycle();
}

function stopMeditation() {
  state.isMeditating = false;
  clearTimeout(state.meditationTimer);
  const circle = document.getElementById("breath-circle");
  const text = document.getElementById("breath-title");
  circle.className = "breath-circle";
  text.textContent = "마음을 가라앉히는 시간";
}

// ─── Dumping Logic ───
function executeTextDumping() {
  const textarea = document.getElementById("dump-textarea-input");
  const text = textarea.value.trim();
  
  if (!text) {
    showToast("지우고 싶은 마음을 적어주세요.");
    return;
  }

  // Animation: Text flying away
  textarea.style.transition = "all 0.8s var(--ease-in)";
  textarea.style.transform = "translateY(-100vh) scale(0.5)";
  textarea.style.opacity = "0";

  setTimeout(() => {
    textarea.value = "";
    textarea.style.transition = "none";
    textarea.style.transform = "";
    textarea.style.opacity = "1";
    setTimeout(() => (textarea.style.transition = ""), 10);
    
    showToast("불안한 마음을 하늘로 날려보냈습니다. ✨");
  }, 800);
}

// ─── Comfort Cards ───
function renderCardScreen() {
  const emptyState = document.getElementById("cards-empty-state");
  const cardMain = document.getElementById("comfort-card-main");
  const cardList = document.getElementById("comfort-card-list");

  if (!emptyState || !cardMain || !cardList) return;

  if (state.messagePool.length === 0) {
    emptyState.style.display = "flex";
    cardMain.style.display = "none";
    cardList.style.display = "none";
  } else {
    emptyState.style.display = "none";
    if (state.isListView) {
      cardMain.style.display = "none";
      cardList.style.display = "flex";
      renderListView();
    } else {
      cardMain.style.display = "flex";
      cardList.style.display = "none";
      if (!state.currentCardId) drawNextComfortCard();
      else updateCardUI();
    }
  }
}

function renderListView() {
  const container = document.getElementById("card-list-container");
  if (!container) return;

  container.innerHTML = state.messagePool
    .slice()
    .reverse()
    .map((card) => {
      const isMe = card.author === state.identity;
      return `
        <div class="list-card ${isMe ? 'is-me' : ''}">
          <p class="list-card-text">${card.text}</p>
          <div class="list-card-footer">
            <span class="list-card-author ${isMe ? 'is-me' : ''}">
              ${card.author === "system" ? "Healing Message" : (isMe ? "내가 쓴 위로" : `${card.author === "wife" ? "아내" : "남편"}의 위로`)}
            </span>
            <span class="list-card-likes"><i class="ti ti-heart-filled"></i> ${card.likes || 0}</span>
          </div>
        </div>
      `;
    })
    .join("");
}

function toggleCardView() {
  state.isListView = !state.isListView;
  const btn = document.getElementById("viewToggleBtn");
  if (btn) {
    btn.querySelector("i").className = state.isListView ? "ti ti-layout-cards" : "ti ti-list";
  }
  renderCardScreen();
}

function drawNextComfortCard() {
  if (!state.messagePool.length) {
    renderCardScreen();
    return;
  }
  
  const card = state.messagePool[Math.floor(Math.random() * state.messagePool.length)];
  state.currentCardId = card.id || card.text; // Use ID if available, otherwise fallback to text for system cards
  updateCardUI();
}

function updateCardUI() {
  const card = state.messagePool.find(c => (c.id || c.text) === state.currentCardId);
  if (!card) return;

  const msgEl = document.getElementById("display-card-msg");
  const metaEl = document.getElementById("display-card-meta");
  const likeCountEl = document.getElementById("cardLikeCount");
  const likeBtn = document.getElementById("cardLikeBtn");

  if (!msgEl || !metaEl || !likeCountEl || !likeBtn) return;

  // Smooth change animation
  msgEl.style.opacity = "0";
  setTimeout(() => {
    msgEl.textContent = card.text;
    metaEl.textContent = card.author === "system" ? "Healing Message" : `${card.author === "wife" ? "아내" : "남편"}의 위로`;
    likeCountEl.textContent = card.likes || 0;
    
    // Check if liked (using local storage for simple persistence per device)
    const likedCards = JSON.parse(localStorage.getItem("liked_cards") || "[]");
    const isLiked = likedCards.includes(state.currentCardId);
    likeBtn.classList.toggle("liked", isLiked);
    likeBtn.querySelector("i").className = isLiked ? "ti ti-heart-filled" : "ti ti-heart";
    
    msgEl.style.opacity = "1";
  }, 300);
}

function toggleLikeCard() {
  if (!state.currentCardId) return;

  const likedCards = JSON.parse(localStorage.getItem("liked_cards") || "[]");
  const isLiked = likedCards.includes(state.currentCardId);
  
  if (isLiked) {
    likedCards.splice(likedCards.indexOf(state.currentCardId), 1);
  } else {
    likedCards.push(state.currentCardId);
    if ("vibrate" in navigator) navigator.vibrate(50);
  }
  
  localStorage.setItem("liked_cards", JSON.stringify(likedCards));

  // Update Firebase or Local State
  const cardIdx = state.messagePool.findIndex(c => (c.id || c.text) === state.currentCardId);
  if (cardIdx > -1) {
    const card = state.messagePool[cardIdx];
    const newLikes = (card.likes || 0) + (isLiked ? -1 : 1);
    
    if (state.db && card.id) {
      const cardRef = ref(state.db, `sync_comfort_cards/${card.id}/likes`);
      set(cardRef, newLikes);
    } else {
      card.likes = newLikes;
      localStorage.setItem("sync_card_pool_v2", JSON.stringify(state.messagePool));
      updateCardUI();
    }
  }
}

function addComfortMessage() {
  const modal = document.getElementById("messageWriteModal");
  const input = document.getElementById("comfort-message-input");
  if (!modal || !input) return;
  
  input.value = "";
  updateCharCount(input);
  modal.classList.add("active");
  setTimeout(() => input.focus(), 300);
}

function closeMessageModal() {
  const modal = document.getElementById("messageWriteModal");
  if (modal) modal.classList.remove("active");
}

function updateCharCount(textarea) {
  const countEl = document.getElementById("char-count");
  if (countEl) {
    const count = textarea.value.length;
    countEl.textContent = `${count} / 100`;
  }
}

function submitComfortMessage() {
  const input = document.getElementById("comfort-message-input");
  const btn = document.querySelector("#messageWriteModal .primary-btn");
  if (!input || !btn || btn.disabled) return;
  
  const msg = input.value.trim();
  
  if (!msg) {
    showToast("마음을 담은 메시지를 적어주세요.");
    return;
  }

  btn.disabled = true;
  const newMessage = {
    text: msg,
    author: state.identity,
    time: serverTimestamp(),
    likes: 0
  };

  if (state.db) {
    const cardsRef = ref(state.db, "sync_comfort_cards");
    push(cardsRef, newMessage)
      .then(() => {
        showToast("메시지가 저장되었습니다.");
        closeMessageModal();
      })
      .catch((err) => {
        console.error("Card save failed:", err);
        showToast("저장에 실패했습니다. 다시 시도해주세요.");
      })
      .finally(() => {
        btn.disabled = false;
      });
  } else {
    // Offline fallback
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
  showToast("배우자에게 사랑을 보냈습니다. ❤️");
  if ("vibrate" in navigator) navigator.vibrate(100);
}

// ─── UI Helpers ───
function openModal(id, content = null) {
  const modal = document.getElementById(id);
  if (!modal) return;
  
  if (content) {
    if (content.title) {
      const titleEl = document.getElementById("modalTitle");
      if (titleEl) titleEl.textContent = content.title;
    }
    if (content.body) {
      const bodyEl = document.getElementById("modalBody");
      if (bodyEl) bodyEl.textContent = content.body;
    }
  }
  modal.classList.add("active");
}

function closeModal() {
  document.querySelectorAll(".modal-overlay").forEach((m) => m.classList.remove("active"));
}

function closeHelpModal() {
  localStorage.setItem("has_seen_guide", "true");
  closeModal();
}

function showToast(msg) {
  const t = document.getElementById("globalToast");
  if (!t) return;
  
  t.textContent = msg;
  t.classList.add("show");
  
  // 이전 타이머 제거 (연속 클릭 시)
  if (t.timeout) clearTimeout(t.timeout);
  t.timeout = setTimeout(() => t.classList.remove("show"), 2500);
}
