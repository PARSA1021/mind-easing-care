# 마음안식처 | Our Mind (MEC)

배우자와 실시간으로 연결되어 서로의 심리적 상태를 공유하고 위로를 주고받는 PWA(Progressive Web App) 기반의 따뜻한 공간입니다.

## 주요 기능
- **도움 요청 (Signal Summon)**: 버튼 하나로 배우자에게 위로가 필요하다는 신호를 즉시 전송
- **안정 호흡 (Meditation)**: 마음을 가라앉히는 시각적 호흡 가이드
- **마음 털기 (Dumping)**: 불안한 생각들을 적어 하늘로 날려보내는 시각화 도구
- **위로 카드 (Comfort Cards)**: 서로에게 남긴 따뜻한 한마디를 실시간으로 공유
- **테마 지원**: 라이트 모드, 다크 모드 및 시스템 자동 설정 지원

## 기술 스택
- **Frontend**: HTML5, CSS3 (Glassmorphism), JavaScript (ES6+)
- **Backend**: Firebase Realtime Database
- **PWA**: Service Worker, Web App Manifest
- **Icons**: Tabler Icons

## GitHub Pages 배포 방법

이 프로젝트는 정적 파일로 구성되어 있어 GitHub Pages를 통해 무료로 배포할 수 있습니다.

1. **GitHub 저장소 생성**: GitHub에서 새로운 저장소(Public)를 만듭니다.
2. **로컬 저장소 연결 및 푸시**: 터미널에서 아래 명령어를 순서대로 입력합니다. (사용자명과 저장소 이름은 본인 것으로 수정하세요)
   ```bash
   git add .
   git commit -m "Initial commit: 마음안식처 앱 배포 준비 완료"
   git branch -M main
   git remote add origin https://github.com/사용자명/저장소이름.git
   git push -u origin main
   ```
3. **GitHub Pages 설정**:
   - GitHub 저장소의 **Settings** 탭으로 이동합니다.
   - 왼쪽 메뉴에서 **Pages**를 클릭합니다.
   - **Build and deployment** 섹션의 Source에서 `Deploy from a branch`를 선택합니다.
   - Branch를 `main` (또는 `/ (root)`)으로 선택하고 **Save**를 누릅니다.
4. **확인**: 몇 분 후 상단에 표시되는 `https://사용자명.github.io/저장소이름/` 주소로 접속합니다.

## 주의사항
- Firebase 설정([app.js](file:///c:/Users/USER/Desktop/mec/app.js))의 API 키는 데모용입니다. 실제 운영 시 보안 규칙을 설정하는 것이 좋습니다.
- PWA 기능을 위해 반드시 HTTPS 환경에서 접속해야 합니다 (GitHub Pages는 기본적으로 HTTPS를 제공합니다).
