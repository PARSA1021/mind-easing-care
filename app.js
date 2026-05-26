/**
 * MEC (Mind Easing Care) - Core Logic
 * 2026 Premium Mobile App Experience
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getDatabase, ref, onValue, set, push, serverTimestamp, off, onDisconnect } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-database.js";

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
  myMood: localStorage.getItem("app_user_mood") || "fine",
  messagePool: JSON.parse(localStorage.getItem("sync_card_pool_v2")) || [
    { text: "오늘 하루도 정말 고생 많았어요. 내가 늘 옆에 있을게요.", author: "system", likes: 0 },
    { text: "잠시 눈을 감고 깊게 숨을 쉬어봐요. 당신은 충분히 잘하고 있어요.", author: "system", likes: 0 },
    { text: "어떤 일이 있어도 우리는 늘 함께니까 괜찮아요.", author: "system", likes: 0 },
  ],
  isMeditating: false,
  meditationTimer: null,
  audioCtx: null,
  currentCardId: null,
  isListView: false,
  activeSounds: {},
  isHugging: false,
  partnerHugging: false,
};

// ─── Initialization ───
document.addEventListener("DOMContentLoaded", () => {
  initFirebase();
  applyTheme(state.theme);
  applyMoodUI(state.myMood);
  setupEventListeners();
  checkFirstVisit();
  updateTabIndicator(0);
  registerServiceWorker();
  renderCardScreen();

  // 앱 시작 시 역할 선택 모달 표시
  const overlay = document.getElementById("roleSelectionOverlay");
  if (overlay) {
    applyIdentity(state.identity);
  }
});

// 전역 함수로 등록 (HTML onclick 대응)
window.switchIdentity = switchIdentity;
window.toggleTheme = toggleTheme;
window.updateMyMood = updateMyMood;
window.sendSignalToPartner = sendSignalToPartner;
window.navigateTab = navigateTab;
window.handleBreathToggle = handleBreathToggle;
window.executeTextDumping = executeTextDumping;
window.drawNextComfortCard = drawNextComfortCard;
window.addComfortMessage = addComfortMessage;
window.sendHeart = sendHeart;
window.openHelpIndicator = openHelpModal; // fix typo if any
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
window.closeSignalMessageModal = closeSignalMessageModal;
window.confirmSendSignal = confirmSendSignal;
window.selectRole = selectRole;
window.updateSignalCharCount = updateSignalCharCount;
window.toggleSound = toggleSound;
window.startHug = startHug;
window.stopHug = stopHug;

function initAudio() {
  if (!state.audioCtx) {
    state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playNotificationSound(type = 'default') {
  initAudio();
  const ctx = state.audioCtx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  
  if (type === 'signal') {
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.8);
  } else if (type === 'like') {
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
  } else {
    osc.frequency.setValueAtTime(554, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.4);
  }

  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (type === 'signal' ? 0.8 : 0.4));

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + (type === 'signal' ? 0.8 : 0.4));
}

function showNotificationBanner(title, body, iconClass = 'ti ti-bell-bolt', targetTab = null) {
  const banner = document.getElementById("notificationBanner");
  const titleEl = document.getElementById("notifBannerTitle");
  const bodyEl = document.getElementById("notifBannerBody");
  const iconEl = document.getElementById("notifBannerIcon").querySelector("i");

  if (!banner || !titleEl || !bodyEl || !iconEl) return;

  titleEl.textContent = title;
  bodyEl.textContent = body;
  iconEl.className = iconClass;

  // 배너 클릭 시 동작 설정
  banner.onclick = () => {
    if (targetTab) {
      navigateTab(targetTab);
    }
    banner.classList.remove("active");
  };

  banner.classList.add("active");
  
  if (banner.timeout) clearTimeout(banner.timeout);
  banner.timeout = setTimeout(() => {
    banner.classList.remove("active");
  }, 4000);
}

function createGlobalParticle(emoji = '❤️') {
  const particle = document.createElement("div");
  particle.className = "global-particle";
  particle.textContent = emoji;
  
  // Random horizontal position
  particle.style.left = `${20 + Math.random() * 60}%`;
  particle.style.top = `${40 + Math.random() * 40}%`;
  
  // Random horizontal drift
  const dx = (Math.random() - 0.5) * 200;
  particle.style.setProperty("--dx", `${dx}px`);
  
  document.body.appendChild(particle);
  setTimeout(() => particle.remove(), 2000);
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
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
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
function selectRole(role) {
  const overlay = document.getElementById("roleSelectionOverlay");
  
  applyIdentity(role);
  
  if (overlay) {
    // 부드러운 페이드 아웃 효과
    overlay.style.transition = "opacity 0.6s ease, transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)";
    overlay.style.opacity = "0";
    overlay.style.transform = "scale(1.05)";
    
    setTimeout(() => {
      overlay.classList.add("hidden");
      // 선택 완료 후 초기 동기화 시작
      initRealtimeSync();
    }, 600);
  }
  
  showToast(`[${role === "wife" ? "아내" : "남편"}] 역할로 시작합니다. ✨`);
}

function applyIdentity(role) {
  state.identity = role;
  localStorage.setItem("app_user_identity", role);

  const label = document.getElementById("identityLabel");
  const partnerName = document.getElementById("partnerName");
  const partnerAvatar = document.querySelector(".partner-avatar i");
  const homeTitle = document.getElementById("home-title");
  const identityBox = document.getElementById("userIdentityBox");
  const signalModalTitle = document.getElementById("signalModalTitle");
  const signalConfirmBtn = document.getElementById("signalConfirmBtn");

  if (role === "wife") {
    label.textContent = "🌸 아내";
    partnerName.textContent = "사랑하는 남편";
    partnerAvatar.className = "ti ti-user-heart";
    if (homeTitle) homeTitle.innerHTML = "남편에게 당신의<br />다정한 마음을 전해볼까요?";
    if (identityBox) identityBox.className = "user-identity-box role-wife";
    if (signalModalTitle) signalModalTitle.textContent = "남편에게 보낼 말";
    if (signalConfirmBtn) signalConfirmBtn.innerHTML = '<i class="ti ti-flame"></i> 남편에게 신호 보내기';
  } else {
    label.textContent = "🙋‍♂️ 남편";
    partnerName.textContent = "사랑하는 아내";
    partnerAvatar.className = "ti ti-user-heart";
    if (homeTitle) homeTitle.innerHTML = "아내에게 당신의<br />따뜻한 온기를 전해볼까요?";
    if (identityBox) identityBox.className = "user-identity-box role-husband";
    if (signalModalTitle) signalModalTitle.textContent = "아내에게 보낼 말";
    if (signalConfirmBtn) signalConfirmBtn.innerHTML = '<i class="ti ti-flame"></i> 아내에게 신호 보내기';
  }

  // 역할 선택 오버레이의 버튼 상태 업데이트
  const roleBtns = document.querySelectorAll(".role-opt-btn");
  roleBtns.forEach(btn => {
    btn.classList.toggle("selected", btn.classList.contains(role));
  });
  
  // 역할 변경 시 상대방 기분 다시 로드
  if (state.db) {
    const partner = role === "wife" ? "husband" : "wife";
    const moodRef = ref(state.db, `sync_mood/${partner}`);
    onValue(moodRef, (snap) => {
      const mood = snap.val();
      if (mood) updatePartnerMoodUI(mood);
    });
  }
}

function switchIdentity() {
  const oldRole = state.identity;
  const newRole = oldRole === "wife" ? "husband" : "wife";
  
  applyIdentity(newRole);
  showToast(`역할이 [${newRole === "wife" ? "아내" : "남편"}]로 변경되었습니다.`);
  
  // 역할 변경 시 Firebase 연결 재설정
  if (state.db) {
    const oldPartner = oldRole === "wife" ? "husband" : "wife";
    // 기존 모든 리스너 제거하여 중복 방지
    off(ref(state.db, `sync_signal/${oldRole}`));
    off(ref(state.db, `sync_mood/${oldPartner}`));
    off(ref(state.db, `presence/${oldPartner}`));
    off(ref(state.db, `last_active/${oldPartner}`));
    off(ref(state.db, "sync_comfort_cards"));
    
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

  // 1. 앱 연결 상태 감시 (.info/connected)
  const connectedRef = ref(state.db, ".info/connected");
  onValue(connectedRef, (snap) => {
    const isConnected = snap.val() === true;
    updateSyncStatusUI(isConnected);
  });

  // 2. 온라인 상태 및 마지막 활동 업데이트
  const presenceRef = ref(state.db, `presence/${state.identity}`);
  const lastActiveRef = ref(state.db, `last_active/${state.identity}`);
  
  set(presenceRef, true);
  set(lastActiveRef, serverTimestamp());
  onDisconnect(presenceRef).remove();
  onDisconnect(lastActiveRef).set(serverTimestamp());

  // 3. 상대방 온라인 상태 및 활동 시간 감시
  const partner = state.identity === "wife" ? "husband" : "wife";
  const partnerPresenceRef = ref(state.db, `presence/${partner}`);
  const partnerLastActiveRef = ref(state.db, `last_active/${partner}`);

  onValue(partnerPresenceRef, (snap) => {
    const isOnline = snap.val();
    const avatar = document.querySelector(".partner-avatar");
    if (avatar) avatar.classList.toggle("pulse", !!isOnline);
  });

  onValue(partnerLastActiveRef, (snap) => {
    const timestamp = snap.val();
    updateLastActiveUI(timestamp);
  });

  // 4. 온기(허그) 상태 감시
  const partnerHugRef = ref(state.db, `hugging/${partner}`);
  onValue(partnerHugRef, (snap) => {
    state.partnerHugging = !!snap.val();
    updateHugUI();
  });

  // 5. 카드 동기화
  const cardsRef = ref(state.db, "sync_comfort_cards");
  let isInitialLoad = true;
  onValue(cardsRef, (snap) => {
    flashSyncIndicator();
    const data = snap.val();
    const oldPoolSize = state.messagePool.length;
    
    if (data) {
      const newPool = Object.keys(data).map((k) => ({ id: k, ...data[k] }));
      
      // 새 메시지 알림 (초기 로딩 이후에만)
      if (!isInitialLoad && newPool.length > oldPoolSize) {
        const lastCard = newPool[newPool.length - 1];
        if (lastCard.author !== state.identity) {
          const authorName = lastCard.author === "wife" ? "아내" : "남편";
          showNotificationBanner("새로운 위로 도착", `${authorName}의 따뜻한 마음이 도착했어요.`, "ti ti-message-heart", "cards");
          playNotificationSound('message');
          triggerTabNotifyAnim(3);
        }
      }

      // 좋아요 알림 감지
      if (!isInitialLoad) {
        newPool.forEach(newCard => {
          const oldCard = state.messagePool.find(c => c.id === newCard.id);
          if (oldCard && (newCard.likes || 0) > (oldCard.likes || 0)) {
            // 내가 쓴 카드에 좋아요가 눌렸을 때만 알림
            if (newCard.author === state.identity) {
              const partnerName = state.identity === "wife" ? "남편" : "아내";
              showNotificationBanner("마음 전달 완료", `${partnerName}이 당신의 위로에 공감했어요.`, "ti ti-heart-filled", "cards");
              playNotificationSound('like');
              for(let i=0; i<5; i++) setTimeout(() => createGlobalParticle('❤️'), i * 100);
            }
          }
        });
      }

      state.messagePool = newPool;
      localStorage.setItem("sync_card_pool_v2", JSON.stringify(state.messagePool));
      renderCardScreen();
    }
    isInitialLoad = false;
  });

  // 호출 신호 감시
  const signalRef = ref(state.db, `sync_signal/${state.identity}`);
  onValue(signalRef, (snap) => {
    const val = snap.val();
    if (val && val.status === "trigger") {
      if (Date.now() - val.time < 5000) {
        openSignalOverlay(val.message);
        playNotificationSound('signal');
        if ("vibrate" in navigator) navigator.vibrate([300, 100, 300, 100, 300]);
        for(let i=0; i<10; i++) setTimeout(() => createGlobalParticle('✨'), i * 150);
      }
    }
  });

  // 상대방 기분 감시
  const moodRef = ref(state.db, `sync_mood/${partner}`);
  let lastMood = null;
  onValue(moodRef, (snap) => {
    flashSyncIndicator();
    const mood = snap.val();
    if (mood) {
      if (lastMood && lastMood !== mood) {
        const partnerName = state.identity === "wife" ? "남편" : "아내";
        showNotificationBanner("기분 변화 감지", `${partnerName}의 기분이 [${MOOD_MAP[mood]}] (으)로 바뀌었어요.`, "ti ti-mood-smile", "summon");
        playNotificationSound('default');
      }
      updatePartnerMoodUI(mood);
      lastMood = mood;
    }
  });
}

function triggerTabNotifyAnim(tabIdx) {
  const tabs = document.querySelectorAll(".tab-item");
  if (tabs[tabIdx]) {
    tabs[tabIdx].classList.add("notify-anim");
    setTimeout(() => tabs[tabIdx].classList.remove("notify-anim"), 3000);
  }
}

// ─── Mood Management ───
const MOOD_MAP = {
  fine: "😊",
  tired: "😴",
  sad: "😢",
  busy: "🔥",
  love: "💖"
};

function updateMyMood(mood) {
  state.myMood = mood;
  localStorage.setItem("app_user_mood", mood);
  applyMoodUI(mood);

  if (state.db) {
    const moodRef = ref(state.db, `sync_mood/${state.identity}`);
    set(moodRef, mood);
  }
}

function applyMoodUI(mood) {
  const chips = document.querySelectorAll(".mood-chip");
  chips.forEach(chip => {
    chip.classList.toggle("active", chip.dataset.mood === mood);
  });
}

function updatePartnerMoodUI(mood) {
  const badge = document.getElementById("partnerMoodBadge");
  const desc = document.getElementById("partnerStatusDesc");
  if (!badge || !desc) return;

  badge.textContent = MOOD_MAP[mood] || "✨";
  
  const moodDescMap = {
    fine: "오늘 기분이 괜찮아 보여요",
    tired: "지금 조금 지쳐있나 봐요",
    sad: "마음이 조금 울적한 것 같아요",
    busy: "지금 아주 바쁜 상태예요",
    love: "당신을 아주 많이 사랑한대요"
  };
  desc.textContent = moodDescMap[mood] || "함께 따뜻한 마음을 나눠보세요";
}

function openSignalOverlay(message = "") {
  const overlay = document.getElementById("signalArrivalOverlay");
  const senderName = document.getElementById("signalSenderName");
  const defaultText = document.getElementById("signalDefaultText");
  const customContainer = document.getElementById("signalCustomMessageContainer");
  const customText = document.getElementById("signalCustomMessageText");

  if (!overlay || !senderName) return;

  senderName.textContent = state.identity === "wife" ? "남편의 신호" : "아내의 신호";
  
  if (message) {
    if (defaultText) defaultText.style.display = "none";
    if (customContainer) customContainer.style.display = "block";
    if (customText) customText.textContent = message;
  } else {
    if (defaultText) defaultText.style.display = "block";
    if (customContainer) customContainer.style.display = "none";
  }

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
  if (overlay) overlay.classList.remove("active");
  navigateTab('cards');
}

function sendSignalToPartner() {
  const modal = document.getElementById("signalMessageModal");
  const input = document.getElementById("signal-custom-input");
  if (modal) {
    if (input) input.value = "";
    modal.classList.add("active");
    if (input) setTimeout(() => input.focus(), 300);
  }
}

function closeSignalMessageModal() {
  const modal = document.getElementById("signalMessageModal");
  if (modal) modal.classList.remove("active");
}

function confirmSendSignal() {
  const partner = state.identity === "wife" ? "husband" : "wife";
  const btn = document.querySelector(".summon-main-btn");
  const modalBtn = document.querySelector("#signalMessageModal .primary-btn");
  const input = document.getElementById("signal-custom-input");
  const customMsg = input ? input.value.trim() : "";

  if (btn.disabled) return;

  // UI Feedback: Heart Burst
  createHeartBurst(btn);
  closeSignalMessageModal();

  if (state.db) {
    btn.disabled = true;
    if (modalBtn) modalBtn.disabled = true;

    const partnerSignalRef = ref(state.db, `sync_signal/${partner}`);
    set(partnerSignalRef, {
      status: "trigger",
      time: Date.now(),
      message: customMsg
    }).then(() => {
      showToast(customMsg ? "따뜻한 메시지와 함께 신호를 보냈어요. ✨" : "배우자에게 따뜻한 위로 신호를 보냈어요. ✨");
      setTimeout(() => { 
        btn.disabled = false; 
        if (modalBtn) modalBtn.disabled = false;
      }, 3000); // 3초 쿨다운
    }).catch((err) => {
      console.error("Signal send failed:", err);
      showToast("신호 전송에 실패했어요. 다시 시도해볼까요?");
      btn.disabled = false;
      if (modalBtn) modalBtn.disabled = false;
    });
  } else {
    showToast("지금은 연결 상태가 조금 불안정해요. 🛰️");
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
  const targetIdx = ["summon", "breath", "warmth", "dump", "cards"].indexOf(tabId);

  // 현재 활성 탭 인덱스 찾기
  let currentIdx = -1;
  tabs.forEach((tab, idx) => {
    if (tab.classList.contains("active")) currentIdx = idx;
  });

  if (currentIdx === targetIdx) return;

  // UI 상태 업데이트 (Active Class 전환)
  screens.forEach((s) => s.classList.remove("active"));
  tabs.forEach((t) => {
    t.classList.remove("active");
    t.setAttribute("aria-selected", "false");
  });

  const targetScreen = document.getElementById("scr-" + tabId);
  if (targetScreen) {
    targetScreen.classList.add("active");
    // 화면 전환 시 스크롤 상단으로 이동
    targetScreen.scrollTo({ top: 0, behavior: 'smooth' });
  }

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

  // 활동 기록 업데이트
  updateActivityTimestamp();

  // Haptic Feedback (Vibrate on tab change)
  if ("vibrate" in navigator) navigator.vibrate(10);
}

function updateTabIndicator(idx) {
  const indicator = document.getElementById("tabIndicator");
  if (indicator) {
    indicator.style.transform = `translateX(${idx * 100}%)`;
  }
}

// ─── Breathing Logic ───
function handleBreathToggle() {
  const btn = document.getElementById("breath-action-btn");
  if (state.isMeditating) {
    stopMeditation();
    btn.textContent = "호흡 가이드 다시 시작";
  } else {
    startMeditation();
    btn.textContent = "잠시 멈추기";
  }
}

function startMeditation() {
  state.isMeditating = true;
  const circle = document.getElementById("breath-circle");
  const desc = document.getElementById("breath-desc");
  
  function breathCycle() {
    if (!state.isMeditating) return;
    
    // Inhale (4s)
    if (desc) {
      desc.style.opacity = "0";
      setTimeout(() => {
        desc.textContent = "숨을 천천히 깊게 들이마셔요...";
        desc.style.opacity = "1";
      }, 300);
    }
    
    if (circle) {
      circle.style.transform = "scale(1.5)";
      circle.style.opacity = "0.8";
    }
    
    state.meditationTimer = setTimeout(() => {
      if (!state.isMeditating) return;
      
      // Exhale (4s)
      if (desc) {
        desc.style.opacity = "0";
        setTimeout(() => {
          desc.textContent = "이제 편안하게 내뱉으세요...";
          desc.style.opacity = "1";
        }, 300);
      }
      
      if (circle) {
        circle.style.transform = "scale(1.0)";
        circle.style.opacity = "0.3";
      }
      
      state.meditationTimer = setTimeout(breathCycle, 4000);
    }, 4000);
  }
  
  breathCycle();
}

function stopMeditation() {
  state.isMeditating = false;
  clearTimeout(state.meditationTimer);
  const circle = document.getElementById("breath-circle");
  const desc = document.getElementById("breath-desc");
  
  if (circle) {
    circle.style.transform = "scale(1.0)";
    circle.style.opacity = "0.3";
  }
  if (desc) desc.textContent = "언제든 마음의 안정이 필요할 때 다시 찾아주세요.";
}

// ─── Dumping Logic ───
function executeTextDumping() {
  const input = document.getElementById("dump-textarea-input");
  if (!input || !input.value.trim()) {
    showToast("비우고 싶은 마음을 먼저 적어주세요.");
    return;
  }

  const text = input.value;
  input.value = "";
  
  // 시각적 피드백: 텍스트가 날아가는 효과 (간단 구현)
  showToast("복잡한 마음들을 하늘로 멀리 날려보냈어요. ✨");
  
  // 활동 기록
  updateActivityTimestamp();
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
              ${card.author === "system" ? "Healing Message" : (isMe ? "내가 남긴 마음" : `${card.author === "wife" ? "아내" : "남편"}의 위로`)}
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

function updateSignalCharCount(textarea) {
  const countEl = document.getElementById("signal-char-count");
  if (countEl) {
    const count = textarea.value.length;
    countEl.textContent = `${count} / 50`;
  }
}

function submitComfortMessage() {
  const input = document.getElementById("comfort-message-input");
  const btn = document.querySelector("#messageWriteModal .primary-btn");
  if (!input || !btn || btn.disabled) return;
  
  const msg = input.value.trim();
  
  if (!msg) {
    showToast("마음을 담은 메시지를 먼저 적어주세요.");
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
        showToast("소중한 마음이 잘 저장되었습니다. ✨");
        closeMessageModal();
      })
      .catch((err) => {
        console.error("Card save failed:", err);
        showToast("저장에 실패했어요. 다시 시도해볼까요?");
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
  showToast("상대방에게 사랑을 가득 보냈어요! ❤️");
  createHeartBurst(document.querySelector(".tab-item.active"));
  updateActivityTimestamp();
}

// ─── UI Helpers ───
function closeHeart() {
  // Reserved for heart animation close if needed
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
  
  // 활동 시간 업데이트 (인터랙션 발생 시)
  updateActivityTimestamp();

  // 이전 타이머 제거 (연속 클릭 시)
  if (t.timeout) clearTimeout(t.timeout);
  t.timeout = setTimeout(() => t.classList.remove("show"), 2500);
}

// ─── Soundscape Logic ───
const SOUND_SOURCES = {
  rain: "https://www.soundjay.com/nature/rain-01.mp3",
  forest: "https://www.soundjay.com/nature/forest-wind-01.mp3",
  waves: "https://www.soundjay.com/nature/ocean-waves-1.mp3"
};

function toggleSound(type) {
  const btn = event.currentTarget;
  
  if (state.activeSounds[type]) {
    state.activeSounds[type].pause();
    delete state.activeSounds[type];
    btn.classList.remove("active");
    showToast(`${btn.textContent.trim()} 소리를 껐어요.`);
  } else {
    const audio = new Audio(SOUND_SOURCES[type]);
    audio.loop = true;
    audio.volume = 0.5;
    audio.play().catch(err => console.error("Audio play failed:", err));
    state.activeSounds[type] = audio;
    btn.classList.add("active");
    showToast(`${btn.textContent.trim()} 소리를 들려드릴게요. ✨`);
  }
}

// ─── Warmth (Hug) Logic ───
function startHug() {
  state.isHugging = true;
  const btn = document.getElementById("hugBtn");
  const bg = document.querySelector(".hug-circle-bg");
  
  if (btn) btn.classList.add("hugging");
  if (bg) bg.style.transform = "scale(1.2)";
  
  if (state.db) {
    const hugRef = ref(state.db, `hugging/${state.identity}`);
    set(hugRef, true);
  }
  
  updateHugUI();
}

function stopHug() {
  state.isHugging = false;
  const btn = document.getElementById("hugBtn");
  const bg = document.querySelector(".hug-circle-bg");
  
  if (btn) {
    btn.classList.remove("hugging");
    btn.classList.remove("shared-warmth");
  }
  if (bg) bg.style.transform = "scale(0.8)";
  
  if (state.db) {
    const hugRef = ref(state.db, `hugging/${state.identity}`);
    set(hugRef, false);
  }
  
  updateHugUI();
}

function updateHugUI() {
  const msg = document.getElementById("hugMessage");
  const btn = document.getElementById("hugBtn");
  const status = document.getElementById("warmthPartnerStatus");
  const isOnline = document.querySelector(".partner-avatar").classList.contains("pulse");

  if (!msg || !btn || !status) return;

  if (isOnline) {
    status.textContent = "상대방이 연결되어 있어요";
    status.classList.add("online");
  } else {
    status.textContent = "상대방을 기다리고 있어요...";
    status.classList.remove("online");
  }

  if (state.isHugging && state.partnerHugging) {
    msg.textContent = "서로의 온기가 연결되었습니다! ❤️";
    btn.classList.add("shared-warmth");
    if ("vibrate" in navigator) navigator.vibrate([50, 50]);
  } else if (state.isHugging) {
    msg.textContent = "상대방의 온기를 기다리는 중...";
  } else if (state.partnerHugging) {
    msg.textContent = "상대방이 당신을 안아주고 싶어해요!";
    triggerTabNotifyAnim(2); // 온기 탭 알림
  } else {
    msg.textContent = "버튼을 길게 눌러보세요";
  }
}

// ─── Health & Connectivity Helpers ───
function updateSyncStatusUI(isConnected) {
  const syncStatus = document.getElementById("syncStatus");
  if (!syncStatus) return;

  const label = syncStatus.querySelector(".status-label");
  if (isConnected) {
    syncStatus.classList.remove("offline");
    label.textContent = "연결됨";
  } else {
    syncStatus.classList.add("offline");
    label.textContent = "연결 끊김";
  }
}

function updateLastActiveUI(timestamp) {
  const el = document.getElementById("partnerLastActive");
  if (!el || !timestamp) return;

  const date = new Date(timestamp);
  const now = new Date();
  const diffInMinutes = Math.floor((now - date) / (1000 * 60));

  let timeStr = "";
  if (diffInMinutes < 1) timeStr = "방금 전 활동";
  else if (diffInMinutes < 60) timeStr = `${diffInMinutes}분 전 활동`;
  else if (diffInMinutes < 1440) timeStr = `${Math.floor(diffInMinutes / 60)}시간 전 활동`;
  else timeStr = "오래전 활동";

  el.textContent = timeStr;
}

function updateActivityTimestamp() {
  if (state.db) {
    const lastActiveRef = ref(state.db, `last_active/${state.identity}`);
    set(lastActiveRef, serverTimestamp());
  }
}

function flashSyncIndicator() {
  const syncStatus = document.getElementById("syncStatus");
  if (!syncStatus) return;

  syncStatus.classList.add("syncing");
  setTimeout(() => syncStatus.classList.remove("syncing"), 1000);
}
