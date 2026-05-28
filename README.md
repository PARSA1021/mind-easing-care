# 💑 마음안식처 (MEC — Mind Easing Care)

> 부부가 서로의 마음을 실시간으로 나누는 커플 전용 모바일 웹앱 (PWA)

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택](#2-기술-스택)
3. [파일 구조](#3-파일-구조)
4. [시작하기 — 로컬 실행](#4-시작하기--로컬-실행)
5. [Firebase 설정](#5-firebase-설정)
6. [PWA 설정 (manifest.json & sw.js)](#6-pwa-설정-manifestjson--swjs)
7. [배포하기](#7-배포하기)
8. [앱 사용 방법 (유저 가이드)](#8-앱-사용-방법-유저-가이드)
9. [커플 코드 연결 방법](#9-커플-코드-연결-방법)
10. [데이터 구조 (Firebase)](#10-데이터-구조-firebase)
11. [주요 기능 목록](#11-주요-기능-목록)
12. [환경 변수 및 보안 주의사항](#12-환경-변수-및-보안-주의사항)
13. [FAQ / 트러블슈팅](#13-faq--트러블슈팅)

---

## 1. 프로젝트 개요

**마음안식처**는 부부(또는 커플)가 서로의 감정 상태를 실시간으로 공유하고, 위로 신호를 보내며, 함께 마음을 돌볼 수 있도록 설계된 **모바일 우선 PWA**입니다.

별도 앱 설치 없이 브라우저에서 바로 사용할 수 있으며, 홈 화면에 추가하면 네이티브 앱처럼 동작합니다.

### 주요 특징

- 📡 Firebase Realtime Database를 통한 **실시간 양방향 동기화**
- 💑 **커플 전용 암호 채널** (MEC-XXXXXX 코드로 분리된 개인 공간)
- 📱 **PWA 지원** — iOS Safari / Android Chrome 홈 화면 설치
- 🌙 **다크모드** 자동 전환 (시스템 설정 연동)
- 🔔 **푸시 알림** 지원 (백그라운드 알림)
- 📴 **오프라인 fallback** — Firebase 연결 없이도 로컬 저장

---

## 2. 기술 스택

| 구분 | 기술 |
|---|---|
| 프론트엔드 | Vanilla HTML5 / CSS3 / ES Module JavaScript |
| 실시간 DB | Firebase Realtime Database v12 |
| 아이콘 | Tabler Icons Web Font v3.19 |
| PWA | Service Worker + Web App Manifest |
| 배포 | 정적 파일 호스팅 (Firebase Hosting / Vercel / Netlify 등) |
| 로컬 저장 | localStorage (오프라인 캐시) |

> 별도 빌드 도구(webpack, vite 등) **없음** — 순수 정적 파일로 동작합니다.

---

## 3. 파일 구조

```
프로젝트 루트/
├── index.html        # 앱 진입점 — 전체 HTML 구조
├── app.js            # 핵심 로직 (ES Module)
├── style.css         # 디자인 시스템 전체
├── manifest.json     # PWA 매니페스트 (직접 작성 필요 → 6절 참고)
├── sw.js             # Service Worker (직접 작성 필요 → 6절 참고)
└── README.md         # 이 문서
```

> `manifest.json`과 `sw.js`는 포함되어 있지 않습니다. 아래 **6절**을 참고하여 직접 생성하세요.

---

## 4. 시작하기 — 로컬 실행

### 요구사항

- **모던 브라우저** (Chrome 90+, Safari 15+, Firefox 90+)
- **로컬 웹 서버** (ES Module은 `file://` 프로토콜에서 동작하지 않음)

### 방법 A — VS Code Live Server (권장)

1. VS Code에 **Live Server** 확장 설치
2. `index.html` 파일을 열고 우하단 **"Go Live"** 클릭
3. 브라우저에서 `http://127.0.0.1:5500` 자동 열림

### 방법 B — Python 내장 서버

```bash
# 프로젝트 폴더로 이동
cd 프로젝트폴더

# Python 3
python3 -m http.server 8080

# 브라우저에서 열기
open http://localhost:8080
```

### 방법 C — Node.js `serve`

```bash
# serve 설치 (최초 1회)
npm install -g serve

# 실행
serve .

# 브라우저에서 열기
open http://localhost:3000
```

---

## 5. Firebase 설정

앱의 실시간 동기화 기능 전체가 Firebase Realtime Database에 의존합니다. Firebase 프로젝트를 직접 만들어서 연결해야 완전히 동작합니다.

### 5-1. Firebase 프로젝트 생성

1. [Firebase 콘솔](https://console.firebase.google.com) 접속
2. **프로젝트 추가** 클릭
3. 프로젝트 이름 입력 (예: `my-mec-app`) → 계속
4. Google Analytics 설정 (선택) → **프로젝트 만들기**

### 5-2. Realtime Database 활성화

1. 왼쪽 메뉴 → **빌드** → **Realtime Database**
2. **데이터베이스 만들기** 클릭
3. 리전 선택: **asia-southeast1 (싱가포르)** 권장 (한국에서 가장 가까운 리전)
4. 보안 규칙: 일단 **테스트 모드**로 시작 (30일 후 아래 규칙으로 변경)

### 5-3. 보안 규칙 설정

Firebase 콘솔 → Realtime Database → **규칙** 탭에서 아래 내용으로 교체:

```json
{
  "rules": {
    "couples": {
      "$coupleCode": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

> ⚠️ 프로덕션 환경에서는 Firebase Authentication을 추가하고 인증된 사용자만 읽기/쓰기 허용하도록 강화하는 것을 권장합니다.

### 5-4. 앱에 Firebase 연결

1. Firebase 콘솔 → **프로젝트 설정** (톱니바퀴 아이콘)
2. **내 앱** 섹션 → 웹 앱 추가 (`</>` 아이콘)
3. 앱 닉네임 입력 → **앱 등록**
4. 표시되는 `firebaseConfig` 값 복사

5. `app.js` 상단의 `firebaseConfig` 객체를 복사한 값으로 교체:

```js
// app.js — 26번째 줄 근처
const firebaseConfig = {
  apiKey:            "여기에-본인의-API-KEY",
  authDomain:        "프로젝트ID.firebaseapp.com",
  projectId:         "프로젝트ID",
  storageBucket:     "프로젝트ID.firebasestorage.app",
  messagingSenderId: "숫자ID",
  appId:             "앱ID",
  databaseURL:       "https://프로젝트ID-default-rtdb.asia-southeast1.firebasedatabase.app/"
};
```

> `databaseURL`은 Firebase 콘솔 → Realtime Database 화면 상단에서 확인할 수 있습니다.

---

## 6. PWA 설정 (manifest.json & sw.js)

홈 화면 설치, 오프라인 지원, 푸시 알림을 위해 두 파일을 직접 생성해야 합니다.

### 6-1. manifest.json 생성

프로젝트 루트에 `manifest.json` 파일을 만들고 아래 내용을 붙여넣으세요:

```json
{
  "name": "마음안식처",
  "short_name": "마음안식처",
  "description": "부부가 서로의 마음을 실시간으로 나누는 커플 앱",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#F8F9FA",
  "theme_color": "#FF6B8B",
  "lang": "ko",
  "icons": [
    {
      "src": "https://img.icons8.com/ios-filled/192/ff6b8b/hearts.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "https://img.icons8.com/ios-filled/512/ff6b8b/hearts.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### 6-2. sw.js (Service Worker) 생성

프로젝트 루트에 `sw.js` 파일을 만들고 아래 내용을 붙여넣으세요:

```js
// sw.js — Service Worker
const CACHE_NAME = "mec-cache-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/app.js",
  "/style.css",
  "/manifest.json"
];

// 설치: 핵심 파일 캐싱
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// 활성화: 구버전 캐시 삭제
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: 캐시 우선, 실패 시 네트워크
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

// 푸시 알림 수신
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || "마음안식처", {
      body: data.body || "새로운 메시지가 도착했어요 ❤️",
      icon: "https://img.icons8.com/ios-filled/192/ff6b8b/hearts.png",
      badge: "https://img.icons8.com/ios-filled/96/ff6b8b/hearts.png",
      vibrate: [200, 100, 200]
    })
  );
});
```

---

## 7. 배포하기

빌드 과정이 없으므로 폴더 전체를 그대로 배포합니다.

### 방법 A — Firebase Hosting (권장, 무료)

```bash
# Firebase CLI 설치 (최초 1회)
npm install -g firebase-tools

# 로그인
firebase login

# 프로젝트 초기화 (프로젝트 폴더 안에서 실행)
firebase init hosting

# 질문 응답:
# ? What do you want to use as your public directory? → . (현재 폴더)
# ? Configure as a single-page app? → No
# ? Set up automatic builds with GitHub? → No

# 배포
firebase deploy --only hosting
```

배포 완료 후 `https://프로젝트ID.web.app` 주소로 접근 가능합니다.

### 방법 B — Vercel (가장 빠름)

```bash
# Vercel CLI 설치
npm install -g vercel

# 프로젝트 폴더에서 실행
vercel

# 안내에 따라 진행하면 배포 완료
```

### 방법 C — Netlify

1. [netlify.com](https://www.netlify.com) 접속 → 로그인
2. **Sites** → **Add new site** → **Deploy manually**
3. 프로젝트 폴더 전체를 드래그 앤 드롭
4. 즉시 배포 완료

### HTTPS 필수

PWA의 Service Worker, 알림 권한, 클립보드 API는 **HTTPS 환경에서만 동작**합니다. 위 세 가지 방법 모두 자동으로 HTTPS가 적용됩니다.

---

## 8. 앱 사용 방법 (유저 가이드)

### 최초 실행 — 역할 선택

앱을 처음 열면 역할 선택 화면이 나타납니다.

```
┌─────────────────────────────┐
│   오늘 당신은               │
│   누구로 함께할까요?        │
│                             │
│  [🌸 저는 아내예요]         │
│  [🙋‍♂️ 저는 남편이에요]      │
└─────────────────────────────┘
```

- 본인의 역할을 선택합니다
- 선택 후 언제든 헤더 우측의 **역할 라벨**을 눌러 변경할 수 있습니다

---

### 탭 1 — 🏠 홈 (마음 전하기)

앱의 메인 화면입니다.

#### 상대방 상태 카드
- 화면 상단에 상대방의 현재 기분 이모지와 마지막 활동 시간이 표시됩니다
- 아바타가 **맥박 애니메이션**으로 표시되면 상대방이 현재 온라인 상태입니다

#### 기분 선택
```
😊 괜찮아요  😴 피곤해요  😢 우울해요  🔥 바빠요  💖 사랑해
```
- 버튼을 누르면 내 기분이 상대방 화면에 **실시간**으로 반영됩니다

#### 오늘 하루 한 문장 (감정 일지)
- 하단 입력창에 오늘 하루를 짧게 적고 ✓ 버튼을 누르면 기록됩니다
- 최근 5개까지 보관되며, 상대방에게 알림이 전송됩니다

#### 위로 신호 보내기 🔥
- 중앙의 **"나 지금 위로가 필요해"** 버튼을 누릅니다
- 메시지 입력창이 열리면 짧은 한마디를 적거나 비워두고 전송합니다
- 상대방 화면에 **긴급 신호 오버레이**가 전체 화면으로 표시됩니다
- 연속 전송 방지를 위해 **3초 쿨다운**이 있습니다

---

### 탭 2 — 🌊 평온 (숨 고르기)

마음을 차분히 가라앉히는 공간입니다.

#### 호흡 가이드
1. **"호흡 가이드 시작"** 버튼을 누릅니다
2. 화면의 원이 커지면 → 숨을 **들이마십니다** (4초)
3. 원이 작아지면 → 숨을 **내쉽니다** (4초)
4. 이 사이클을 반복합니다
5. **"잠시 멈추기"** 버튼으로 중단할 수 있습니다

#### 오늘의 치유 확언
- 카드 영역을 **터치**하면 새로운 확언 문구로 바뀝니다
- 총 12가지 확언이 랜덤으로 표시됩니다

---

### 탭 3 — 🤝 온기 (체온 나누기)

두 사람이 동시에 버튼을 누르면 서로의 온기를 나누는 공간입니다.

#### 허그 버튼
1. 두 사람이 각자의 기기에서 **하트 버튼을 동시에 길게 누릅니다**
2. 두 사람 모두 누르고 있는 동안 진동 피드백이 전달됩니다
3. 버튼에서 손을 떼면 온기 공유가 종료됩니다

#### 사랑 메모 💌
- 하단 입력창에 짧은 메시지를 적고 전송합니다
- 최근 3개까지 표시되며, 상대방에게 알림이 전송됩니다

---

### 탭 4 — 🗑️ 비우기 (생각 털기)

머릿속을 어지럽히는 생각을 적고 날려보내는 공간입니다.

1. 텍스트 입력창에 지금 당신을 힘들게 하는 것들을 **자유롭게** 적습니다
2. **"시원하게 날려보내기"** 버튼을 누릅니다
3. 텍스트가 카드로 변환되어 위로 날아가는 애니메이션이 재생됩니다
4. 내용은 저장되지 않고 사라집니다 — 오직 털어내기 위한 공간입니다

---

### 탭 5 — 📝 기록 (위로 카드)

서로에게 남긴 위로 메시지를 카드 형태로 볼 수 있는 공간입니다.

#### 카드 보기
- 카드를 **터치**하면 다음 카드로 넘어갑니다
- 카드 우하단 **하트 버튼**으로 좋아요를 누를 수 있습니다
  - 좋아요를 누르면 카드 작성자에게 알림이 전송됩니다

#### 메시지 추가
- 우하단 **+** 버튼을 누릅니다
- 최대 100자의 위로 메시지를 작성하고 전송합니다
- 상대방 화면에 실시간으로 추가됩니다

#### 목록 보기
- **목록 아이콘** 버튼을 누르면 전체 카드를 리스트 형태로 볼 수 있습니다
- 내가 남긴 카드는 분홍색 왼쪽 테두리로 구분됩니다

#### 하트 보내기 ❤️
- 오른쪽 하트 아이콘을 누르면 상대방 알림 센터에 하트 메시지가 전달됩니다

---

### 헤더 기능

| 버튼 | 기능 |
|---|---|
| ❓ | 가이드 모달 열기 |
| 🔗 공용/연결 | 커플 코드 설정 모달 |
| 🔔 | 알림 센터 (수신된 모든 알림 목록) |
| ☀️/🌙 | 라이트/다크/시스템 테마 전환 |
| 🌸 아내 / 🙋‍♂️ 남편 | 역할 전환 |

---

## 9. 커플 코드 연결 방법

기본 상태에서는 **공용 채널(DEMO-CHANNEL)**을 사용합니다. 이 채널은 모든 사용자가 공유하므로, 반드시 아래 절차로 **전용 채널**을 만들어야 합니다.

### 전용 채널 생성 절차

**[첫 번째 사람 (예: 아내)]**

1. 헤더 왼쪽 **🔗 공용** 버튼 클릭
2. **"새 코드"** 버튼 클릭
3. `MEC-XXXXXX` 형식의 새 코드가 생성됩니다
4. **"복사"** 버튼으로 코드를 복사
5. 상대방(남편)에게 카카오톡 등으로 코드를 전달
6. **"연결하기"** 버튼 클릭 (본인 코드로 연결)

**[두 번째 사람 (예: 남편)]**

1. 헤더 왼쪽 **🔗 공용** 버튼 클릭
2. 하단 입력창에 받은 코드 입력 (예: `MEC-AB1234`)
3. **"연결하기"** 버튼 클릭

두 사람 모두 같은 코드로 연결되면 **"연결"** 배지로 바뀌고, 이후 모든 데이터가 두 사람만의 전용 공간에 저장됩니다.

> ⚠️ 코드는 대소문자를 가리지 않습니다. 정확히 `MEC-XXXXXX` (총 10자) 형식이어야 합니다.

### 공용 채널로 복귀

1. **🔗 연결** 버튼 클릭
2. **"공용 해제"** 버튼 클릭

---

## 10. 데이터 구조 (Firebase)

모든 데이터는 아래 경로에 저장됩니다:

```
couples/
└── {coupleCode}/                      ← 커플 채널 (예: MEC-AB1234)
    ├── presence/
    │   ├── wife                       ← 아내 온라인 여부 (true/false)
    │   └── husband
    ├── last_active/
    │   ├── wife                       ← 마지막 활동 시각 (timestamp)
    │   └── husband
    ├── sync_mood/
    │   ├── wife                       ← 아내 기분 ("fine"|"tired"|"sad"|"busy"|"love")
    │   └── husband
    ├── hugging/
    │   ├── wife                       ← 허그 버튼 누르고 있는지 (true/false)
    │   └── husband
    ├── sync_signal/
    │   ├── wife                       ← 아내에게 도착한 신호
    │   │   ├── status: "trigger"
    │   │   ├── time: timestamp
    │   │   └── message: "string"
    │   └── husband
    ├── sync_comfort_cards/
    │   └── {pushId}/                  ← 위로 카드 목록
    │       ├── text: "string"
    │       ├── author: "wife"|"husband"|"system"
    │       ├── time: timestamp
    │       └── likes: number
    ├── love_memo/                     ← 최신 사랑 메모 1건
    │   ├── text: "string"
    │   ├── sender: "wife"|"husband"
    │   └── time: timestamp
    └── notifications/
        ├── wife/                      ← 아내에게 도착한 알림
        │   └── {pushId}/
        │       ├── type: "signal"|"heart"|"mood"|"card"|"journal"|"like"|"system"
        │       ├── sender: "wife"|"husband"|"system"
        │       ├── message: "string"
        │       ├── time: timestamp
        │       └── read: boolean
        └── husband/
```

---

## 11. 주요 기능 목록

| 기능 | 설명 | 실시간 동기화 |
|---|---|:---:|
| 역할 선택 | 아내/남편 역할 선택 및 전환 | — |
| 기분 공유 | 5가지 기분 이모지 실시간 전달 | ✅ |
| 감정 일지 | 오늘 하루 한 줄 기록 (최근 5개) | — |
| 위로 신호 | 긴급 알림 + 커스텀 메시지 전송 | ✅ |
| 호흡 가이드 | 4초 들숨/날숨 사이클 시각 가이드 | — |
| 치유 확언 | 12가지 확언 랜덤 카드 | — |
| 허그 기능 | 동시 누르기 시 진동 피드백 | ✅ |
| 사랑 메모 | 짧은 메시지 실시간 전달 (최근 3개) | ✅ |
| 생각 비우기 | 텍스트 입력 후 날리기 애니메이션 | — |
| 위로 카드 | 메시지 추가/랜덤 보기/좋아요 | ✅ |
| 알림 센터 | 수신된 모든 알림 목록 조회 | ✅ |
| 커플 코드 | 전용 암호 채널 생성 및 연결 | — |
| 다크모드 | 라이트/다크/시스템 테마 전환 | — |
| PWA 설치 | 홈 화면 추가로 네이티브 앱처럼 사용 | — |
| 푸시 알림 | 백그라운드 기기 알림 수신 | — |

---

## 12. 환경 변수 및 보안 주의사항

### Firebase API Key 노출 문제

현재 `app.js`에 Firebase 설정 값이 **하드코딩**되어 있습니다. Firebase 웹 앱의 경우 클라이언트 측에 API Key가 노출되는 것은 구조적으로 피할 수 없으나, 다음 조치로 보안을 강화해야 합니다.

#### 필수 조치

**① Firebase 보안 규칙 설정**

Firebase 콘솔 → Realtime Database → 규칙에서 공개 읽기/쓰기를 차단하고, 커플 코드 경로만 허용:

```json
{
  "rules": {
    "couples": {
      "$coupleCode": {
        ".read": true,
        ".write": true
      }
    },
    ".read": false,
    ".write": false
  }
}
```

**② Firebase 허용 도메인 설정**

Firebase 콘솔 → 프로젝트 설정 → **승인된 도메인** 탭에서 배포한 도메인만 추가합니다. 그 외 도메인에서의 API 호출은 자동 차단됩니다.

**③ Firebase App Check 활성화 (선택, 권장)**

Firebase 콘솔 → App Check에서 reCAPTCHA v3를 연동하면 등록되지 않은 앱의 접근을 차단할 수 있습니다.

#### 환경별 키 분리 (선택)

빌드 도구를 도입할 경우 (예: Vite):

```js
// vite.config.js 사용 시 .env 파일로 관리
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  // ...
};
```

```
# .env (절대 Git에 커밋하지 마세요)
VITE_FIREBASE_API_KEY=your-api-key-here
```

---

## 13. FAQ / 트러블슈팅

### Q. 상대방 기분/상태가 업데이트되지 않아요

- 두 사람 모두 **같은 커플 코드**로 연결되어 있는지 확인하세요 (헤더의 🔗 버튼)
- 인터넷 연결 상태를 확인하세요
- 헤더의 **"연결됨"** 상태 표시를 확인하세요 — "연결 끊김"이면 네트워크 문제입니다

### Q. 알림이 오지 않아요

알림 수신을 위한 체크리스트:

- [ ] 브라우저에서 알림 권한을 **"허용"**으로 설정했나요? (알림 센터 → "알림 허용" 버튼)
- [ ] iOS Safari에서는 홈 화면에 **설치(추가)**한 후에만 알림이 동작합니다
- [ ] Android에서는 배터리 최적화 설정에서 해당 앱을 **제외**해야 백그라운드 알림이 옵니다
- [ ] `sw.js` 파일이 프로젝트 루트에 존재하는지 확인하세요

### Q. 허그 기능이 동작하지 않아요

- 두 사람이 **동시에** 버튼을 누르고 있어야 합니다
- 상대방이 **온라인** 상태인지 확인하세요 (홈 탭의 아바타 맥박 애니메이션)
- Firebase에 연결된 상태인지 확인하세요

### Q. iOS Safari에서 앱을 설치하는 방법

1. Safari 하단 **공유 버튼(□↑)** 탭
2. **"홈 화면에 추가"** 선택
3. 이름 확인 후 **"추가"** 탭
4. 홈 화면에 앱 아이콘이 추가됩니다

### Q. 다크모드가 자동으로 적용되지 않아요

- 헤더의 🌙/☀️ 버튼을 눌러 **"시스템 설정"** 모드로 변경하세요
- 시스템 설정 모드에서는 기기의 다크모드 설정을 자동으로 따릅니다

### Q. `file://` 프로토콜로 열었더니 동작하지 않아요

ES Module(`import` 문)은 보안 정책상 `file://` 프로토콜을 지원하지 않습니다. **4절**을 참고하여 로컬 웹 서버를 통해 실행하세요.

### Q. 데이터를 초기화하고 싶어요

- **로컬 데이터**: 브라우저 개발자 도구 → Application → Storage → Local Storage → 전체 삭제
- **Firebase 데이터**: Firebase 콘솔 → Realtime Database → 해당 커플 코드 노드 우클릭 → 삭제

---

## 라이센스

개인/가정용 비상업적 사용을 위한 프로젝트입니다.

---

*Made with ❤️ for couples who care*