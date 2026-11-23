# 엽떡스쿨

엽쌤스쿨과 찰떡쌤이 만든 수업, 학급 운영, 교사 업무용 웹앱을 모은 홈페이지입니다. [엽떡스쿨 홈페이지](https://gmlduqzhd123-lab.github.io/YD_School/)

## 앱 목록 수정

- `assets/catalog-data.js`에서 앱 이름, 주제, 이용 안내, 원본 주소를 수정합니다. 공유 링크에서 앱을 찾을 때 사용하는 `id`는 그대로 유지합니다.
- 학생에게 보낼 수 있는 앱에는 `studentNote`를 추가합니다. 학생 전용 입장 주소가 있으면 해당 `shortcuts` 항목에 `student: true`를 지정합니다.
- 활용 보기의 이용 조건은 `access`와 학생 바로가기의 `note`에서 가져옵니다. `classroomSituations`와 `searchEquivalentPhrases`에서 수업 상황별 검색어와 같은 뜻의 표현을 관리합니다.
- 미리보기 이미지와 학생 공유용 QR 코드는 `assets/`에 저장합니다. 학생 링크를 바꾸면 해당 QR 이미지도 교체합니다.
- 모바일 앱 카드와 활용 보기에는 `assets/preview-<앱 id>.webp`, PC 앱 카드에는 고해상도 원본에서 만든 너비 768px의 `assets/previews-desktop/<앱 id>.webp`를 사용합니다. 확대 화면의 고해상도 원본은 `assets/previews-hd/<앱 id>.webp`에 있습니다.
- 즐겨찾기, 고정 순서, 수업 묶음은 사용하는 브라우저에 저장됩니다.

## 미리보기와 배포

저장소 폴더에서 `python -m http.server 8000`을 실행한 뒤 [로컬 미리보기](http://localhost:8000/)를 엽니다. `main` 브랜치의 루트에서 GitHub Pages가 자동 배포합니다.
