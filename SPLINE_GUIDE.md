# Spline 3D 파일 주소 가져오는 법 (How to get the .splinecode URL)

웹사이트에 3D 장면을 문제없이 넣으려면 **뷰어 링크(Viewer Link)**가 아닌 **코드 파일 주소(Code URL)**가 필요합니다.

### 1️⃣ Spline 에디터 접속
작업하신 Spline 디자인 화면(Editor)으로 들어갑니다.

### 2️⃣ Export(내보내기) 버튼 클릭
화면 상단 중앙에 있는 **`Export`** 버튼을 누릅니다.

### 3️⃣ 'Code' 메뉴 선택 (중요!)
왼쪽 사이드바 메뉴에서 **`Viewer`**가 아닌 **`Code`**를 선택하세요.
*(Image나 Video가 아닙니다)*

### 4️⃣ Framework 선택
오른쪽 설정 패널에서:
-   **Framework**: `React` 선택 (또는 `Vanilla JS`)
-   **Type**: `URL` 선택

### 5️⃣ 주소 복사 (Copy Link)
코드가 생성되면 아래와 같은 형태의 주소가 보입니다.
`scene` 속성에 있는 **`https://prod.spline.design/.../scene.splinecode`** 주소를 복사해주세요.

> **올바른 주소 예시:**
> `https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode`
>
> **잘못된 주소 예시 (현재 보내주신 것):**
> `https://my.spline.design/distortingtypography-...`

---
**복사한 `.splinecode` 주소를 채팅창에 붙여넣어 주시면 바로 적용해 드립니다!**
