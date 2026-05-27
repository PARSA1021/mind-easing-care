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
  coupleCode: localStorage.getItem("app_couple_code") || "DEMO-CHANNEL",
  notifications: [],
  messagePool: JSON.parse(localStorage.getItem("sync_card_pool_v2")) || [
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
  isMeditating: false,
  meditationTimer: null,
  audioCtx: null,
  currentCardId: null,
  isListView: false,
  activeSounds: {},
  isHugging: false,
  partnerHugging: false,
  emotionJournal: JSON.parse(localStorage.getItem("emotion_journal_v1")) || [],
  loveMemos: JSON.parse(localStorage.getItem("love_memos_v1")) || [],
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
  updateCoupleBadgeUI();
  updateNotificationPermissionUI();
  rollHealingAffirmation();
  renderEmotionJournalFeed();
  renderLoveMemoDisplay();

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
window.startHug = startHug;
window.stopHug = stopHug;
window.rollHealingAffirmation = rollHealingAffirmation;
window.submitEmotionJournal = submitEmotionJournal;
window.sendLoveMemo = sendLoveMemo;

// New functions for notifications and coupling
window.openCoupleModal = openCoupleModal;
window.closeCoupleModal = closeCoupleModal;
window.generateNewCoupleCode = generateNewCoupleCode;
window.connectCoupleCode = connectCoupleCode;
window.resetToDemoChannel = resetToDemoChannel;
window.copyCoupleCode = copyCoupleCode;
window.openNotifCenterModal = openNotifCenterModal;
window.closeNotifCenterModal = closeNotifCenterModal;
window.requestNotificationPermission = requestNotificationPermission;
window.clearAllNotifications = clearAllNotifications;
window.triggerHaptic = triggerHaptic;

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

function getCoupleRef(subPath) {
  return ref(state.db, `couples/${state.coupleCode}/${subPath}`);
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
    const moodRef = getCoupleRef(`sync_mood/${partner}`);
    onValue(moodRef, (snap) => {
      const mood = snap.val();
      if (mood) updatePartnerMoodUI(mood);
    });
  }
}

function switchIdentity() {
  const oldRole = state.identity;
  const newRole = oldRole === "wife" ? "husband" : "wife";
  
  triggerHaptic('tick');
  
  // 기존 모든 리스너 제거하여 중복 방지
  cleanupRealtimeSync(state.coupleCode);
  
  applyIdentity(newRole);
  showToast(`역할이 [${newRole === "wife" ? "아내" : "남편"}]로 변경되었습니다.`);
  
  // 역할 변경 시 Firebase 연결 재설정
  if (state.db) {
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

  // 1. 앱 연결 상태 감시 (.info/connected) - 글로벌 시스템 노드
  const connectedRef = ref(state.db, ".info/connected");
  onValue(connectedRef, (snap) => {
    const isConnected = snap.val() === true;
    updateSyncStatusUI(isConnected);
  });

  // 2. 온라인 상태 및 마지막 활동 업데이트
  const presenceRef = getCoupleRef(`presence/${state.identity}`);
  const lastActiveRef = getCoupleRef(`last_active/${state.identity}`);
  
  set(presenceRef, true);
  set(lastActiveRef, serverTimestamp());
  onDisconnect(presenceRef).remove();
  onDisconnect(lastActiveRef).set(serverTimestamp());

  // 3. 상대방 온라인 상태 및 활동 시간 감시
  const partner = state.identity === "wife" ? "husband" : "wife";
  const partnerPresenceRef = getCoupleRef(`presence/${partner}`);
  const partnerLastActiveRef = getCoupleRef(`last_active/${partner}`);

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
  const partnerHugRef = getCoupleRef(`hugging/${partner}`);
  onValue(partnerHugRef, (snap) => {
    state.partnerHugging = !!snap.val();
    updateHugUI();
  });

  // 5. 카드 동기화
  const cardsRef = getCoupleRef("sync_comfort_cards");
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
          showNativeNotification("새로운 위로 도착", `${authorName}의 따뜻한 마음이 도착했어요. ❤️`);
          playNotificationSound('message');
          triggerTabNotifyAnim(4); // 4는 기록 탭
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
              showNativeNotification("마음 전달 완료", `${partnerName}이 당신의 위로에 공감했어요. ❤️`);
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
  const signalRef = getCoupleRef(`sync_signal/${state.identity}`);
  onValue(signalRef, (snap) => {
    const val = snap.val();
    if (val && val.status === "trigger") {
      if (Date.now() - val.time < 5000) {
        openSignalOverlay(val.message);
        showNativeNotification("도움 요청 신호!", `배우자님이 위로를 애타게 기다리고 있어요: "${val.message || '나 지금 위로가 필요해'}"`);
        playNotificationSound('signal');
        triggerHaptic('signal');
        for(let i=0; i<10; i++) setTimeout(() => createGlobalParticle('✨'), i * 150);
      }
    }
  });

  // 상대방 기분 감시
  const moodRef = getCoupleRef(`sync_mood/${partner}`);
  let lastMood = null;
  onValue(moodRef, (snap) => {
    flashSyncIndicator();
    const mood = snap.val();
    if (mood) {
      if (lastMood && lastMood !== mood) {
        const partnerName = state.identity === "wife" ? "남편" : "아내";
        showNotificationBanner("기분 변화 감지", `${partnerName}의 기분이 [${MOOD_MAP[mood]}] (으)로 바뀌었어요.`, "ti ti-mood-smile", "summon");
        showNativeNotification("기분 변화 감지", `${partnerName}의 기분이 [${MOOD_MAP[mood]}] (으)로 바뀌었어요.`);
        playNotificationSound('default');
      }
      updatePartnerMoodUI(mood);
      lastMood = mood;
    }
  });

  // 6. 알림 센터 동기화
  const notificationsRef = getCoupleRef(`notifications/${state.identity}`);
  onValue(notificationsRef, (snap) => {
    const data = snap.val();
    let list = [];
    if (data) {
      list = Object.keys(data).map(k => ({ id: k, ...data[k] }));
      // 내림차순 정렬 (최신순)
      list.sort((a, b) => b.time - a.time);
    }
    
    state.notifications = list;
    
    // 미확인 알림 수 계산
    const unreadCount = list.filter(n => !n.read).length;
    updateNotificationBadgeUI(unreadCount);
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
  triggerHaptic('tick');

  if (state.db) {
    const moodRef = getCoupleRef(`sync_mood/${state.identity}`);
    set(moodRef, mood);

    // 상대방 알림 피드에 추가
    const partner = state.identity === "wife" ? "husband" : "wife";
    const notifRef = getCoupleRef(`notifications/${partner}`);
    push(notifRef, {
      type: "mood",
      sender: state.identity,
      message: `기분이 [${MOOD_MAP[mood]}] (으)로 변경되었어요.`,
      time: serverTimestamp(),
      read: false
    });
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
  const cardTab = document.querySelectorAll(".tab-item")[4]; // 기록 탭은 4번째 인덱스 (0,1,2,3,4)
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
  triggerHaptic('default');
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

    const partnerSignalRef = getCoupleRef(`sync_signal/${partner}`);
    set(partnerSignalRef, {
      status: "trigger",
      time: Date.now(),
      message: customMsg
    }).then(() => {
      // 상대방 알림 피드에 추가
      const notifRef = getCoupleRef(`notifications/${partner}`);
      push(notifRef, {
        type: "signal",
        sender: state.identity,
        message: customMsg || "나 지금 위로가 필요해 (도움 신호)",
        time: serverTimestamp(),
        read: false
      });

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
    triggerHaptic('tick');
  } else {
    likedCards.push(state.currentCardId);
    triggerHaptic('like');
  }
  
  localStorage.setItem("liked_cards", JSON.stringify(likedCards));

  // Update Firebase or Local State
  const cardIdx = state.messagePool.findIndex(c => (c.id || c.text) === state.currentCardId);
  if (cardIdx > -1) {
    const card = state.messagePool[cardIdx];
    const newLikes = (card.likes || 0) + (isLiked ? -1 : 1);
    
    if (state.db && card.id) {
      const cardRef = getCoupleRef(`sync_comfort_cards/${card.id}/likes`);
      set(cardRef, newLikes).then(() => {
        // 상대방 알림 피드에 추가 (좋아요를 누를 때만)
        if (!isLiked && card.author !== state.identity && card.author !== "system") {
          const notifRef = getCoupleRef(`notifications/${card.author}`);
          push(notifRef, {
            type: "like",
            sender: state.identity,
            message: `내가 남겨둔 위로 카드에 공감(좋아요)을 보냈어요. ❤️`,
            time: serverTimestamp(),
            read: false
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
  triggerHaptic('default');
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

  triggerHaptic('like');
  btn.disabled = true;
  const newMessage = {
    text: msg,
    author: state.identity,
    time: serverTimestamp(),
    likes: 0
  };

  if (state.db) {
    const cardsRef = getCoupleRef("sync_comfort_cards");
    push(cardsRef, newMessage)
      .then(() => {
        // 상대방 알림 피드에 추가
        const partner = state.identity === "wife" ? "husband" : "wife";
        const notifRef = getCoupleRef(`notifications/${partner}`);
        push(notifRef, {
          type: "card",
          sender: state.identity,
          message: `새로운 위로 한마디를 남겼어요: "${msg.substring(0, 20)}..."`,
          time: serverTimestamp(),
          read: false
        });

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
  triggerHaptic('like');
  showToast("상대방에게 사랑을 가득 보냈어요! ❤️");
  createHeartBurst(document.querySelector(".tab-item.active"));
  updateActivityTimestamp();

  if (state.db) {
    const partner = state.identity === "wife" ? "husband" : "wife";
    const notifRef = getCoupleRef(`notifications/${partner}`);
    push(notifRef, {
      type: "heart",
      sender: state.identity,
      message: "당신을 사랑하는 마음이 듬뿍 담긴 하트를 보냈어요! ❤️",
      time: serverTimestamp(),
      read: false
    });
  }
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

// ─── Healing Self-Affirmation Card System ───
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

function rollHealingAffirmation() {
  triggerHaptic('tick');
  const textEl = document.getElementById("healingAffirmationText");
  if (!textEl) return;
  
  // Fade out, update, fade in
  textEl.style.opacity = "0";
  textEl.style.transform = "translateY(5px)";
  textEl.style.transition = "all 0.25s ease";
  
  setTimeout(() => {
    let nextAff = HEALING_AFFIRMATIONS[Math.floor(Math.random() * HEALING_AFFIRMATIONS.length)];
    while (nextAff === textEl.textContent && HEALING_AFFIRMATIONS.length > 1) {
      nextAff = HEALING_AFFIRMATIONS[Math.floor(Math.random() * HEALING_AFFIRMATIONS.length)];
    }
    
    textEl.textContent = nextAff;
    textEl.style.opacity = "1";
    textEl.style.transform = "translateY(0)";
  }, 250);
}

// ─── Warmth (Hug) Logic ───
function startHug() {
  state.isHugging = true;
  const btn = document.getElementById("hugBtn");
  const bg = document.querySelector(".hug-circle-bg");
  
  if (btn) btn.classList.add("hugging");
  if (bg) bg.style.transform = "scale(1.2)";
  
  if (state.db) {
    const hugRef = getCoupleRef(`hugging/${state.identity}`);
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
    const hugRef = getCoupleRef(`hugging/${state.identity}`);
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
    triggerHaptic('hug');
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
    const lastActiveRef = getCoupleRef(`last_active/${state.identity}`);
    set(lastActiveRef, serverTimestamp());
  }
}

function flashSyncIndicator() {
  const syncStatus = document.getElementById("syncStatus");
  if (!syncStatus) return;

  syncStatus.classList.add("syncing");
  setTimeout(() => syncStatus.classList.remove("syncing"), 1000);
}

// ─── Firebase Listener Cleanup Helper ───
function cleanupRealtimeSync(code) {
  if (!state.db) return;
  const partner = state.identity === "wife" ? "husband" : "wife";
  
  // 기존 리스너 모두 중단
  try {
    off(ref(state.db, `couples/${code}/presence/${partner}`));
    off(ref(state.db, `couples/${code}/last_active/${partner}`));
    off(ref(state.db, `couples/${code}/hugging/${partner}`));
    off(ref(state.db, `couples/${code}/sync_comfort_cards`));
    off(ref(state.db, `couples/${code}/sync_signal/${state.identity}`));
    off(ref(state.db, `couples/${code}/sync_mood/${partner}`));
    off(ref(state.db, `couples/${code}/notifications/${state.identity}`));
  } catch (e) {
    console.warn("Listener cleanup had errors:", e);
  }
}

// ─── Dynamic Couple Settings Modal Logic ───
function openCoupleModal() {
  triggerHaptic('default');
  const modal = document.getElementById("coupleConnectionModal");
  const myCodeEl = document.getElementById("myCoupleCodeDisplay");
  const partnerInput = document.getElementById("partnerCoupleCodeInput");

  if (!modal) return;

  // 현재 나의 커플 코드 렌더링
  if (myCodeEl) {
    myCodeEl.value = state.coupleCode;
  }
  if (partnerInput) {
    partnerInput.value = "";
  }

  modal.classList.add("active");
}

function closeCoupleModal() {
  const modal = document.getElementById("coupleConnectionModal");
  if (modal) modal.classList.remove("active");
}

function updateCoupleBadgeUI() {
  const badge = document.getElementById("coupleBadge");
  const statusLabel = document.querySelector(".partner-connection-status");

  if (!badge) return;

  if (state.coupleCode === "DEMO-CHANNEL") {
    badge.className = "couple-badge public";
    badge.textContent = "공용";
  } else {
    badge.className = "couple-badge private";
    badge.textContent = "연결";
  }

  // 연결 상태 레이블 업데이트
  if (statusLabel) {
    if (state.coupleCode === "DEMO-CHANNEL") {
      statusLabel.textContent = "공용 채널 (보안 연결 없음)";
      statusLabel.classList.remove("online");
    } else {
      statusLabel.textContent = "우리 부부만의 보안 공간";
      statusLabel.classList.add("online");
    }
  }
}

function generateNewCoupleCode() {
  triggerHaptic('tick');
  // 고유 코드 생성 (MEC-XXXXXX 형식)
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randStr = '';
  for (let i = 0; i < 6; i++) {
    randStr += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  const newCode = `MEC-${randStr}`;
  
  const myCodeEl = document.getElementById("myCoupleCodeDisplay");
  if (myCodeEl) {
    myCodeEl.value = newCode;
  }
  showToast("새로운 코드를 생성했습니다. 상대방에게 전달하세요!");
}

function connectCoupleCode() {
  const input = document.getElementById("partnerCoupleCodeInput");
  if (!input) return;

  const targetCode = input.value.trim().toUpperCase();
  if (!targetCode) {
    showToast("상대방의 코드를 먼저 입력해 주세요.");
    return;
  }

  if (targetCode.length < 8) {
    showToast("올바른 코드 형식(MEC-XXXXXX)을 입력해 주세요.");
    return;
  }

  triggerHaptic('like');
  
  // 기존 리스너 중단
  cleanupRealtimeSync(state.coupleCode);

  // 로컬 상태 및 스토리지 업데이트
  const oldCode = state.coupleCode;
  state.coupleCode = targetCode;
  localStorage.setItem("app_couple_code", targetCode);

  // UI 업데이트
  updateCoupleBadgeUI();
  closeCoupleModal();

  // Firebase 연결 재설정
  if (state.db) {
    // 상대방 알림창에 커플 연결 성공 알림 삽입
    const notifRef = getCoupleRef(`notifications/${state.identity === "wife" ? "husband" : "wife"}`);
    push(notifRef, {
      type: "system",
      sender: "system",
      message: `서로의 기기가 비밀 커플 공간(${targetCode})으로 안전하게 연결되었습니다. ✨`,
      time: serverTimestamp(),
      read: false
    });

    initRealtimeSync();
    showToast(`커플 비밀 공간으로 성공적으로 전환되었습니다! 💑`);
  } else {
    showToast(`로컬 코드가 변경되었습니다: ${targetCode}`);
  }
}

function resetToDemoChannel() {
  triggerHaptic('tick');
  
  if (state.coupleCode === "DEMO-CHANNEL") {
    showToast("이미 공용 채널을 사용하고 있습니다.");
    return;
  }

  cleanupRealtimeSync(state.coupleCode);

  state.coupleCode = "DEMO-CHANNEL";
  localStorage.setItem("app_couple_code", "DEMO-CHANNEL");

  updateCoupleBadgeUI();
  closeCoupleModal();

  if (state.db) {
    initRealtimeSync();
    showToast("공용 채널로 복귀했습니다. 모든 데이터가 공용으로 초기화됩니다.");
  } else {
    showToast("공용 채널로 설정되었습니다.");
  }
}

function copyCoupleCode() {
  const myCodeEl = document.getElementById("myCoupleCodeDisplay");
  if (!myCodeEl) return;

  triggerHaptic('tick');
  
  navigator.clipboard.writeText(myCodeEl.value)
    .then(() => {
      showToast("커플 코드가 클립보드에 복사되었습니다! 📋");
    })
    .catch((err) => {
      console.error("Clipboard copy failed:", err);
      showToast("복사에 실패했습니다. 직접 복사해 주세요.");
    });
}

// ─── Notification Center Modal Logic ───
function openNotifCenterModal() {
  triggerHaptic('default');
  const modal = document.getElementById("notifCenterModal");
  if (!modal) return;

  modal.classList.add("active");
  updateNotificationPermissionUI();

  // 모달을 열었으므로 현재 도착한 모든 알림을 읽음 처리
  markAllNotificationsAsRead();
}

function closeNotifCenterModal() {
  const modal = document.getElementById("notifCenterModal");
  if (modal) modal.classList.remove("active");
}

function updateNotificationPermissionUI() {
  const statusEl = document.getElementById("notifPermissionStatus");
  const btn = document.getElementById("requestNotifPermBtn");

  if (!statusEl || !btn) return;

  if (!("Notification" in window)) {
    statusEl.textContent = "알림 미지원 브라우저";
    btn.style.display = "none";
    return;
  }

  if (Notification.permission === "granted") {
    statusEl.textContent = "기기 알림: 활성화";
    btn.style.display = "none";
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
  triggerHaptic('tick');
  if (!("Notification" in window)) return;

  Notification.requestPermission().then((permission) => {
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
  // PWA가 백그라운드에 있거나 브라우저에서 작업 중일 때 Native Push 알림
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  
  // 현재 탭이 활성화되어 있지 않을 때만 푸시를 띄워 피로도 완화
  if (document.visibilityState !== "visible") {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(title, {
        body: body,
        icon: "https://img.icons8.com/ios-filled/192/ff6b8b/hearts.png",
        badge: "https://img.icons8.com/ios-filled/96/ff6b8b/hearts.png",
        vibrate: [200, 100, 200]
      });
    }).catch(() => {
      // Service worker fall-back
      new Notification(title, {
        body: body,
        icon: "https://img.icons8.com/ios-filled/192/ff6b8b/hearts.png"
      });
    });
  }
}

function updateNotificationBadgeUI(count) {
  const badge = document.getElementById("notifCountBadge");
  const bell = document.getElementById("notifBellBtn");

  if (!badge) return;

  if (count > 0) {
    badge.textContent = count > 9 ? "9+" : count;
    badge.style.display = "flex";
    if (bell) bell.classList.add("notify-anim");
  } else {
    badge.style.display = "none";
    if (bell) bell.classList.remove("notify-anim");
  }
}

function renderNotificationList() {
  const container = document.getElementById("notif-list-container");
  if (!container) return;

  if (state.notifications.length === 0) {
    container.innerHTML = `
      <div class="notif-empty-state">
        <i class="ti ti-bell-off"></i>
        <p>아직 도착한 알림이 없어요.<br>서로에게 첫 번째 신호나 하트를 보내보세요!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = state.notifications.map(notif => {
    const isWife = notif.sender === "wife";
    const senderTitle = isWife ? "아내🌸" : (notif.sender === "husband" ? "남편🙋‍♂️" : "시스템✨");
    const roleClass = isWife ? "wife" : (notif.sender === "husband" ? "husband" : "system");
    const iconClass = notif.type === "heart" ? "ti-heart-filled" : 
                      (notif.type === "signal" ? "ti-alert-circle-filled" : 
                      (notif.type === "mood" ? "ti-mood-smile" : 
                      (notif.type === "card" ? "ti-message-heart" : "ti-device-heart")));
    const dateStr = notif.time ? new Date(notif.time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : "방금 전";
    
    return `
      <div class="notif-item ${notif.read ? '' : 'unread'}">
        <div class="notif-item-icon ${roleClass}">
          <i class="ti ${iconClass}"></i>
        </div>
        <div class="notif-item-content">
          <div class="notif-item-body">
            <strong>${senderTitle}</strong>: ${notif.message}
          </div>
          <div class="notif-item-time">${dateStr}</div>
        </div>
      </div>
    `;
  }).join("");
}

function markAllNotificationsAsRead() {
  if (!state.db || state.notifications.length === 0) return;

  state.notifications.forEach(notif => {
    if (!notif.read && notif.id) {
      const readRef = getCoupleRef(`notifications/${state.identity}/${notif.id}/read`);
      set(readRef, true);
    }
  });
}

function clearAllNotifications() {
  if (!state.db) return;

  triggerHaptic('tick');

  if (confirm("정말 모든 알림 기록을 지우시겠습니까?")) {
    const listRef = getCoupleRef(`notifications/${state.identity}`);
    remove(listRef)
      .then(() => {
        showToast("알림 기록이 모두 삭제되었습니다. 🧼");
      })
      .catch((err) => {
        console.error("Notif clear failed:", err);
      });
  }
}

// ─── Healing Text Dumping Animation Logic ───
function executeTextDumping() {
  const input = document.getElementById("dump-textarea-input");
  if (!input) return;
  const text = input.value.trim();

  if (!text) {
    showToast("날려보낼 고민을 먼저 적어주세요. 💭");
    return;
  }

  triggerHaptic('signal');
  input.disabled = true;

  const viewport = document.getElementById("dumpAnimViewport");
  if (viewport) {
    // 1. Create Floating Card
    const card = document.createElement("div");
    card.className = "dump-floating-text";
    card.textContent = text;
    viewport.appendChild(card);

    // 2. Create rising light particles/bubbles
    for (let i = 0; i < 15; i++) {
      setTimeout(() => {
        const bubble = document.createElement("div");
        bubble.className = "dump-particle";
        
        // Random style and size
        const size = Math.random() * 20 + 10;
        bubble.style.width = `${size}px`;
        bubble.style.height = `${size}px`;
        bubble.style.left = `${Math.random() * 80 + 10}%`;
        bubble.style.bottom = "20%";
        
        // Random glass color
        const colors = [
          "rgba(255, 107, 139, 0.4)",
          "rgba(77, 150, 255, 0.4)",
          "rgba(255, 255, 255, 0.6)",
          "rgba(168, 230, 207, 0.4)"
        ];
        bubble.style.background = colors[Math.floor(Math.random() * colors.length)];
        bubble.style.boxShadow = "inset 0 0 4px rgba(255,255,255,0.8), 0 4px 10px rgba(0,0,0,0.05)";
        bubble.style.border = "1px solid rgba(255,255,255,0.2)";
        bubble.style.setProperty("--dx", `${(Math.random() - 0.5) * 100}px`);
        
        viewport.appendChild(bubble);
        
        // Cleanup particle
        setTimeout(() => bubble.remove(), 3000);
      }, i * 150);
    }

    // 3. Cleanup Card and text reset
    setTimeout(() => {
      card.remove();
      input.value = "";
      input.disabled = false;
      showToast("마음속 고민들이 깔끔하게 정리되었어요. ✨");
      triggerHaptic('like');
    }, 3500);
  } else {
    input.value = "";
    input.disabled = false;
    showToast("마음속 고민들이 깔끔하게 정리되었어요. ✨");
  }
}

// ─── Platform-Aware low-latency Audio Haptic Synthesis (iOS/Android) ───
function triggerHaptic(type) {
  // 1. Android Native Vibration API (Vibrate waves)
  if ("vibrate" in navigator) {
    if (type === 'tick') navigator.vibrate(15);
    else if (type === 'like') navigator.vibrate(40);
    else if (type === 'hug') navigator.vibrate([40, 40, 40]);
    else if (type === 'signal') navigator.vibrate([200, 100, 200, 100, 200]);
    else navigator.vibrate(30);
  }

  // 2. iPhone / iOS Web Audio API Haptic Wave Synthesis (Emulating high quality hardware clicks)
  try {
    initAudio();
    if (!state.audioCtx) return;
    
    const osc = state.audioCtx.createOscillator();
    const gain = state.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(state.audioCtx.destination);

    const now = state.audioCtx.currentTime;
    
    if (type === 'tick') {
      osc.frequency.setValueAtTime(150, now);
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'like') {
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'hug') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(60, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'signal') {
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    }
  } catch (e) {
    console.warn("Haptic synthesis not supported or blocked by user gesture:", e);
  }
}

// ─── Emotion Journal (홈 화면 감정 일지) ───
function submitEmotionJournal() {
  const input = document.getElementById("emotionJournalInput");
  if (!input) return;
  const text = input.value.trim();
  if (!text) {
    showToast("한 줄 일지를 먼저 입력해 주세요. 📝");
    return;
  }

  triggerHaptic('tick');

  const entry = {
    text,
    mood: state.myMood,
    time: Date.now(),
    role: state.identity
  };

  // 최근 5개까지만 보관
  state.emotionJournal.unshift(entry);
  if (state.emotionJournal.length > 5) state.emotionJournal.length = 5;
  localStorage.setItem("emotion_journal_v1", JSON.stringify(state.emotionJournal));

  input.value = "";
  renderEmotionJournalFeed();
  showToast("오늘의 감정이 기록되었어요. ✨");

  // Firebase 상대방 알림
  if (state.db) {
    const partner = state.identity === "wife" ? "husband" : "wife";
    const notifRef = getCoupleRef(`notifications/${partner}`);
    push(notifRef, {
      type: "journal",
      sender: state.identity,
      message: `오늘의 감정 일지를 남겼어요: "${text.substring(0, 20)}"`,
      time: serverTimestamp(),
      read: false
    });
  }
}

const MOOD_EMOJIS = {
  fine: "😊", tired: "😴", sad: "😢", busy: "🔥", love: "💖"
};

function renderEmotionJournalFeed() {
  const feed = document.getElementById("emotionJournalFeed");
  if (!feed) return;

  if (state.emotionJournal.length === 0) {
    feed.innerHTML = "";
    return;
  }

  feed.innerHTML = state.emotionJournal.map(entry => {
    const moodEmoji = MOOD_EMOJIS[entry.mood] || "💭";
    const timeStr = new Date(entry.time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    return `
      <div class="emotion-entry">
        <span class="emotion-entry-emoji">${moodEmoji}</span>
        <span class="emotion-entry-text">${entry.text}</span>
        <span class="emotion-entry-time">${timeStr}</span>
      </div>
    `;
  }).join("");
}

// ─── Love Memo (온기 화면 사랑 메모) ───
function sendLoveMemo() {
  const input = document.getElementById("loveMemoInput");
  if (!input) return;
  const text = input.value.trim();
  if (!text) {
    showToast("보내고 싶은 말을 먼저 적어주세요. 💌");
    return;
  }

  triggerHaptic('like');

  const memo = {
    text,
    sender: state.identity,
    time: Date.now()
  };

  state.loveMemos.unshift(memo);
  if (state.loveMemos.length > 3) state.loveMemos.length = 3;
  localStorage.setItem("love_memos_v1", JSON.stringify(state.loveMemos));

  // Firebase 전송
  if (state.db) {
    const partner = state.identity === "wife" ? "husband" : "wife";

    // 파트너 알림
    const notifRef = getCoupleRef(`notifications/${partner}`);
    push(notifRef, {
      type: "heart",
      sender: state.identity,
      message: `💌 "${text}"`,
      time: serverTimestamp(),
      read: false
    });

    // 공유 메모 저장 (상대방도 볼 수 있도록)
    const memoRef = getCoupleRef(`love_memo`);
    set(memoRef, { text, sender: state.identity, time: serverTimestamp() });
  }

  input.value = "";
  renderLoveMemoDisplay();
  showToast("사랑의 메모를 전달했어요! 💕");
}

function renderLoveMemoDisplay() {
  const display = document.getElementById("loveMemoDisplay");
  if (!display) return;

  if (state.loveMemos.length === 0) {
    display.innerHTML = `<span class="love-memo-placeholder">아직 보낸 메모가 없어요. 사랑을 담아 보내보세요 💕</span>`;
    return;
  }

  display.innerHTML = state.loveMemos.map(memo => {
    const isMe = memo.sender === state.identity;
    const senderLabel = isMe ? "내가" : (memo.sender === "wife" ? "아내가" : "남편이");
    const timeStr = new Date(memo.time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    return `
      <div class="love-memo-item ${isMe ? 'is-me' : ''}">
        <span class="love-memo-sender">${senderLabel}</span>
        <span class="love-memo-text">"${memo.text}"</span>
        <span class="love-memo-time">${timeStr}</span>
      </div>
    `;
  }).join("");
}
