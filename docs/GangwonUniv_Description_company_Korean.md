# Project overview

프로젝트 이름
강원 기업 성과관리 시스템 웹사이트

설명
강원도 소재 기업을 대상으로 하는 B2B 성과관리 포털 웹사이트이다.
이 웹사이트는 반응형 웹사이트 responsive website 이다.
기업은 회원가입 후 관리자 승인이 완료되어야 로그인할 수 있다.
로그인한 기업은 연도와 분기 단위로 성과를 입력하고, 이전 성과를 조회할 수 있다.
관리자는 별도 관리자 사이트에서 공지사항, 보도자료, 배너, 성과 승인, FAQ, 1:1문의 등을 관리한다.

주의
이 문서는 한국어로 작성되지만, 영어 또는 중국어로 번역해도 의미가 유지되도록 용어를 명확하게 사용한다.
같은 개념에는 항상 같은 용어를 사용한다 기업, 프로그램 신청 등.

주요 사용자

- 기업 담당자 company staff
- 기업 대표 company owner
- 운영 관리자 admin 관리자 사이트 전용

핵심 목표

- 강원도 기업의 성과 정보를 연도/분기별로 구조화하여 수집
- 기업이 자사 성과 데이터를 직접 입력하고 승인 상태를 확인할 수 있게 함
- 프로그램 공고와 기업 신청 기능 제공
- FAQ와 1:1문의로 기업 지원

기술 스택 요청

- Frontend
  - React
  - JavaScript ES6
  - Tailwind CSS
- Backend
  - Python 기반 REST API server
- Database
  - PostgreSQL

반응형 요구

- 모바일, 태블릿, 데스크톱 대응
- 최소 해상도
  - 모바일 width 360px 이상
  - 데스크톱 width 1280px 이상
- 공통 원칙
  - 상단 메뉴바 header, 메인 배너 banner, 하단 푸터 footer는 항상 브라우저 전체 너비를 사용한다 full width 100vw
  - 중간 컨텐츠 영역 main content area는 최대 너비를 1200~1280px 정도로 제한하고 중앙 정렬한다
    margin-left auto, margin-right auto

## Global layout

전체 페이지 구조

- 최상단 full width 헤더 header
- 그 아래 full width 메인 배너 slider
- 그 아래 조건부 서브메뉴 바 sub menu bar
  - 성과관리, 원스톱지원 메뉴에서만 나타난다
- 그 아래 main content container
  - max width 1200~1280px, 중앙 정렬
- 페이지 하단 full width 푸터 footer

헤더 header

- 배경색은 어두운 남색 계열 dark navy
- 좌측
  - 사이트 로고 logo
- 우측
  - 대메뉴 네비게이션 main navigation
    - 시스템 소개
    - 프로그램
    - 성과관리
    - 원스톱지원
  - 로그인 영역
    - 로그인 전
      - 로그인 버튼
      - 회원가입 버튼
    - 로그인 후
      - 회사명 또는 담당자명
      - 로그아웃 버튼

메인 배너 main banner slider

- 헤더 바로 아래 full width 영역
- 한 화면에 한 장의 배너 이미지 노출
- 좌우 화살표로 이전, 다음 배너 이동
- 각 배너 데이터
  - title
  - subtitle
  - 버튼 label
  - 버튼 클릭 시 이동할 URL 내부 또는 외부

서브메뉴 바 sub menu bar

- 성과관리, 원스톱지원에서만 렌더링
- 성과관리 선택 시
  - 기업정보
  - 성과조회
  - 성과입력
- 원스톱지원 선택 시
  - 자주묻는 질문
  - 1:1 문의
  - 1:1 문의 내역
- 가로 탭 또는 버튼 형태
- 현재 선택된 서브메뉴는 색상 또는 밑줄로 강조

메인 컨텐츠 영역 main content container

- max width 1200~1280px
- 중앙 정렬
- 각 페이지의 카드, 폼, 게시판이 이 안에 위치한다

푸터 footer

- full width, 배경색은 헤더와 동일한 남색 계열
- 기관명, 사업자등록번호, 주소, 연락처 텍스트
- 이용약관, 개인정보처리방침 링크
- 링크 클릭 시 약관 전용 페이지 또는 레이어 팝업 표시

## Navigation and routes

로그인 관련

- login 로그인
- password-reset-request 비밀번호 재설정 요청
- password-reset 비밀번호 재설정

회원가입 signup

- signup-step1 계정 기본 정보
- signup-step2 기업 기본 정보
- signup-step3 사업 및 산업 정보
- signup-step4 파일 업로드
- signup-step5 약관 동의

메인 홈 home

- 경로 root

시스템 소개 system intro

- intro

프로그램 program

- programs 프로그램 공고 목록
- programs id 프로그램 공고 상세

성과관리 performance management

- performance-company 기업정보
- performance-list 성과조회
- performance-edit 성과입력
- 성과관리 메뉴 선택 시 서브메뉴 바 표시

원스톱지원 one stop support

- support-faq 자주묻는 질문
- support-inquiry 1:1 문의 작성
- support-inquiry-history 1:1 문의 내역
- 원스톱지원 메뉴 선택 시 서브메뉴 바 표시

## Pages

### Authentication

로그인 login

- 사업자등록번호 입력
  - 10자리 숫자
  - 자동 하이픈 포맷 000 00 00000
- 비밀번호 입력
  - 보기 토글 아이콘
- 로그인 버튼
- 비밀번호 찾기 링크
  - password-reset-request 로 이동
- 승인 대기, 승인 완료, 실패 상태 메시지 처리

비밀번호 재설정 요청 password reset request

- 사업자등록번호 또는 아이디
- 회사 이메일
- 재설정 링크 발송 버튼
- 성공 안내 메시지

비밀번호 재설정 password reset

- 새 비밀번호, 새 비밀번호 확인
- 저장 버튼
- 성공 시 로그인 페이지로 이동 안내

### Signup flow

공통

- 상단에 진행 단계 표시1 계정 정보2 기업 정보3 사업 및 산업 정보4 파일 업로드5 약관 동의
- 이전, 다음 버튼
- Step 5에서 최종 회원가입 완료

각 스텝 요약

- Step 1 account
  - 사업자등록번호, 기업명, 비밀번호
- Step 2 company
  - 소재지역, 창업구분 대신 기업 구분, 법인번호, 주소, 담당자 정보
- Step 3 business
  - 사업분야, 매출액, 직원수, 설립일자, 홈페이지, 주요사업, 산업협력 희망분야
- Step 4 files
  - 기업 로고, 사업자등록증 파일 업로드
- Step 5 terms
  - 필수 약관 동의, 선택 약관 동의
  - 필수 항목 동의 시에만 회원가입 완료 가능

### Company portal main page

페이지 이름
기업 포털 메인 홈 main home

경로
root

목적

- 로그인 후 첫 화면
- 공지사항, 보도자료, 홍보 배너를 한눈에 제공

레이아웃

- 헤더 full width
- 메인 배너 slider full width
- 메인 홈에서는 서브메뉴 바를 사용하지 않는다
- main content container 내부에 3개의 카드 또는 영역
  - 좌측 공지사항 카드
  - 중앙 보도자료 카드
  - 우측 롤링 배너 카드

공지사항 카드 notice card

- 데이터 소스
  - 공지사항 게시판 notice board
- 구조
  - 타이틀 영역
    - 텍스트 공지사항
  - 리스트 영역
    - 최신 공지사항 5개의 제목 리스트
      제목만 가져온다
      내용 본문은 메인 홈에서 사용하지 않는다
  - 하단 영역
    - 더보기 또는 Visit now 버튼
- 동작
  - 제목 클릭 시 공지사항 상세 페이지 또는 공지사항 목록 페이지로 이동
  - 하단 버튼 클릭 시 공지사항 목록 페이지로 이동

보도자료 카드 press release card

- 공지사항과 같은 게시판 테이블 구조 사용boardType 필드로 공지사항과 보도자료를 구분한다
- 메인 홈에서의 표시 규칙
  - 보도자료 게시판에서 가장 최신 글 1개만 사용
  - 이 게시글의 대표 이미지 또는 첫 번째 이미지 첨부파일만 화면에 표시
  - 제목이나 요약 텍스트는 메인 홈에서 보여주지 않는다
- 구조
  - 타이틀 영역
    - 텍스트 보도자료
  - 내용 영역
    - 최신 보도자료의 대표 이미지 1장
  - 하단 영역
    - 자세히 보기 버튼
- 동작
  - 이미지 또는 버튼 클릭 시 보도자료 상세 페이지 또는 보도자료 목록 페이지로 이동

우측 롤링 배너 카드 rolling banner card

- 강원 기업 지원 관련 홍보 배너 영역
- 하나의 카드 안에서 여러 장의 배너 이미지를 순차적으로 보여주는 롤링 배너 slider
- 기능
  - 자동 재생 auto play
  - 일시정지 pause 버튼
  - 이전 배너, 다음 배너로 이동하는 화살표 버튼
  - 현재 위치를 표시하는 인디케이터 예 1 3
- 동작
  - 자동 재생 중에 사용자가 화살표 버튼을 누르면 해당 방향으로 이동
  - pause 버튼 클릭 시 자동 롤링을 멈추고, 다시 play 버튼을 누르면 재시작
  - 각 배너 이미지를 클릭하면 설정된 URL로 이동

### System intro

시스템 소개 intro

- 헤더, 메인 배너 full width
- 서브메뉴 바 없음
- main content container 내에 관리자 작성 HTML 콘텐츠 표시
- max width 1200~1280px, 중앙 정렬 (desktop 기준)
- 관리자페이지의 시스템 소개 관리 페이지에서 입력한 textarea와 파일로 첨부된 이미지의 정보를 여기에 보여준다.
- 관리자가 직접 입력하면 이 페이지는 보여주면 된다.
- 이미지 경로 : /upload/common/system-info

### Program

프로그램 공고 목록 program list

- 경로 programs
- 헤더, 메인 배너 full width
- 서브메뉴 바 없음
- main content container
  - 검색 영역
    - 검색어 입력 필드
  - 리스트 영역
    - 한 페이지당 10개 기본
    - 페이지당 10, 20, 30, 50개 옵션
    - 항목 데이터
      제목, 등록일, 상태 등
  - 각 항목 또는 별도 위치에 프로그램 신청 버튼
    label 예 프로그램 신청
- 동작
  - 제목 클릭 시 상세 페이지로 이동
  - 프로그램 신청 버튼 클릭 시 신청 팝업 표시
  - 신청 주체는 기업이며, 모든 텍스트에서 창업자 대신 기업이라는 단어 사용

프로그램 공고 상세 program detail

- 경로 programs id
- 제목, 본문, 첨부파일 목록, 프로그램 신청 버튼
- 프로그램 신청 팝업
  - 기업 아이디, 기업명, 담당자 정보, 첨부파일 최대 5개, 접수 상태 저장
  - 파일명은 서버에서는 유니크 값, 원본 파일명은 DB에 저장

### Performance management 성과관리

공통

- 헤더, 메인 배너 full width
- 서브메뉴 바 표시
  - 기업정보, 성과조회, 성과입력
- 각 서브메뉴는 별도 라우트이지만 동일한 레이아웃 구조를 사용

기업정보 performance-company

- 회원가입 시 입력한 기업 기본 정보 조회 및 수정
- 사업자등록번호는 읽기 전용
- 나머지 필드는 수정 가능
- 저장 버튼 클릭 시 업데이트, 성공 메시지 표시

성과조회 performance-list

- 검색 영역
  - 연도, 분기, 상태 제출, 보완, 승인
- 목록
  - 현재 로그인한 기업의 성과 데이터만 조회
  - 문서유형, 파일명, 문서상태, 다운로드 버튼
  - 다운로드는 승인된 문서에만 허용하도록 설정 가능
- 성과입력 이동 버튼
  - 성과입력 페이지로 이동

성과입력 performance-edit

- 상단에서 연도, 분기 선택
- 내부 탭
  - 매출고용
  - 정부지원 기수혜이력
  - 지식재산권
- 각 탭에는 해당 데이터 입력 폼 배치
- 하단 버튼
  - 임시저장하기 save draft
  - 성과제출하기 submit performance
- 동작 규칙
  - 임시저장하기
    - 기업 내부 저장용
    - 관리자 화면에는 나타나지 않는다
  - 성과제출하기
    - 관리자 성과관리 게시판에 승인요청 상태로 등록
    - 이후 관리자가 승인 또는 보완요청 처리

### One stop support 원스톱지원

공통

- 헤더, 메인 배너 full width
- 서브메뉴 바 표시
  - 자주묻는 질문, 1:1 문의, 1:1 문의 내역

자주묻는 질문 support-faq

- FAQ 리스트
  - 질문 제목 목록
  - 질문 클릭 시 답변이 펼쳐지는 아코디언 구조

1:1 문의 작성 support-inquiry

- 이름, 이메일, 휴대폰 번호, 문의 제목, 문의 내용, 첨부파일 최대 3개
- 제출 시
  - 관리자 이메일로 전송
  - DB에 문의 이력 저장

1:1 문의 내역 support-inquiry-history

- 현재 기업 계정으로 등록한 문의 목록
  - 제목, 등록일, 처리 상태
- 항목 클릭 시 상세 보기
  - 문의 내용, 관리자 답변, 첨부파일 링크

## Components

레이아웃 컴포넌트

- AppLayoutheader, optional sub menu bar, main content container, footer 포함
- Header
- SubMenuBar
- Footer

UI 공통 컴포넌트

- MainBannerSlider
- SectionTitle
- PageCard
- DataTable
- PrimaryButton
- TextInput
- RadioGroup
- SelectField
- FileUploadField
- DatePickerField

도메인 특화 컴포넌트

- BusinessNumberInput
- CorporateNumberInput
- MoneyInput
- PerformanceStatusBadge
- ProgramApplyModal
- PerformanceTabs
- TermsModal
- FaqAccordion
- NoticeListPreview공지사항 5개 제목 전용 리스트
- PressImagePreview최신 보도자료 이미지 1장 전용
- RollingBannerCard
  우측 롤링 배너용
  자동 재생, 일시정지, 이전, 다음, 인디케이터를 포함

## Style guide

색상 팔레트

- primary main 어두운 남색 계열헤더, 푸터, 주요 배경
- secondary 포인트 컬러
- background 메인 컨텐츠 영역 배경 흰색 또는 밝은 회색
- text main 진한 회색 또는 검정
- text muted 중간 회색
- status colors
  제출 대기, 보완 요청, 승인 완료 각각 다른 색

레이아웃 관련

- header, main banner, footerwidth 100 percent, 화면 양쪽 끝까지 채운다
- main content container
  max width 1200~1280px 중앙 정렬, 상하 padding 적용

타이포그래피

- 한글 웹폰트와 시스템 폰트 혼합
- h1, h2, h3에 단계별 폰트 크기
- 본문 텍스트는 가독성이 좋은 크기와 줄 간격

## Behavior and interaction

인증

- 성과관리, 원스톱지원, 마이페이지 성격의 화면은 로그인 필수
- 비로그인 상태에서 접근 시 로그인 페이지로 리다이렉트

입력 포맷

- 사업자등록번호, 법인번호숫자만 허용, 자동 하이픈
- 금액 필드숫자만 입력, 3자리 콤마 표시
- 날짜 필드
  date picker 위젯

파일 업로드

- 기업 아이디별 폴더 구조예 upload 기업아이디 board, upload 기업아이디 performance
- 서버 저장 파일명은 유니크 값
- 원본 파일명은 DB에 별도 저장

보안

- 모든 입력값 서버 검증
- SQL injection 방어
- 비밀번호 해시 저장

## Data and integration

핵심 API 개념

- Authlogin, logout, password reset request, password reset
- Signupstep별 임시 저장, 최종 완료
- Companycompany info 조회, 수정
- Program공고 목록, 상세, 기업 신청 저장
- Notice목록, 상세, 메인 홈용 최신 5개 제목 전용 API
- Press목록, 상세, 메인 홈용 최신 1개 이미지 전용 API
- Performance매출고용, 정부지원 이력, 지식재산권 데이터 저장 및 조회, status 필드 포함
- FAQ, InquiryFAQ 목록, 문의 생성, 문의 내역 조회
- Banner메인 상단 배너 슬라이더용 데이터
- Rolling banner
  메인 홈 우측 롤링 배너용 데이터

공지사항 notice 로직

- 관리자가 공지사항 관리 페이지에서 공지 등록
- 메인 홈 전용 notice API
  - 최신 공지 5개의 id, title, createdAt 반환
  - 메인 홈에서는 title만 사용

보도자료 press 로직

- notice와 같은 테이블 사용, boardType 값으로 구분
- 메인 홈 전용 press API
  - 최신 보도자료 1개의 id, thumbnailImageUrl 반환
  - 메인 홈에서는 thumbnailImageUrl만 사용하여 이미지 카드 구성

## Priority

필수 구현

- full-width header, main banner, footer, 중앙 정렬 main content container
- 로그인, 비밀번호 재설정 플로우
- 회원가입 5단계
- 메인 홈공지사항 카드 최신 5개 제목, 보도자료 이미지 카드, 롤링 배너 카드
- 프로그램 공고 목록, 상세, 기업 신청 팝업
- 성과관리서브메뉴 바, 기업정보, 성과조회, 성과입력, 임시저장 및 제출
- 원스톱지원서브메뉴 바, FAQ, 1:1 문의 작성, 1:1 문의 내역
- 기본 검증, 보안 처리

추가 기능 후보

- 게시판 검색, 정렬 기능
- 성과 데이터 그래프 시각화
- 다국어 지원 i18n
- 상담 챗봇
