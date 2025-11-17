
# Admin overview

문서 목적
이 문서는 강원 기업 성과관리 시스템의 관리자(Admin) 웹사이트 기능을 정의한다.
Cursor가 이 문서를 읽고 React 기반 관리자 대시보드를 구현할 수 있도록 구조와 용어를 명확하게 작성한다.

언어와 네이밍

- 화면 설명은 한국어로 작성한다.
- 컴포넌트 이름, 파일 이름, API 경로 등 실제 코드 네이밍은 영어를 사용한다.
- 예
  AdminLayout
  CompanyDashboardPage
  NoticeBoardPage
  PressBoardPage
  RollingBannerPage

## Admin global layout

관리자 어드민 기본 레이아웃

상단 바 admin header

- 좌측
  - 관리자 시스템 로고
- 우측
  - 현재 로그인한 관리자 이름
  - 로그아웃 버튼

좌측 사이드 메뉴 admin sidebar

- Dashboard 기업현황
- Company search 기업검색
- Performance approval 성과관리 승인
- Program management 프로그램 관리
- Operation management 운영관리
  - Notice 공지사항
  - Press 보도자료
  - Rolling banner 롤링배너
  - System info 시스템 소개
- Company members 기업회원

메인 컨텐츠 영역 admin main content

- 선택된 메뉴에 따라 각 페이지 컴포넌트가 렌더링된다.
- 각 페이지 상단에 페이지 제목과 필터 영역이 위치한다.
- 하단에는 그리드, 차트, 상세 카드 등이 위치한다.

## 1 Dashboard 기업현황

페이지 이름
CompanyDashboardPage

역할

- 관리자 로그인 후 첫 화면으로 사용한다.
- 승인된 성과 데이터를 기준으로 전체 기업 현황 및 기업별 추세를 시각화한다.

데이터 집계 기준

- 성과 데이터 중 status 가 승인완료(approved)인 데이터만 집계한다.
- 연도와 분기를 기준으로 집계한다.
- 기본 검색 조건
  - 가장 최근 연도의 전체 데이터를 요약 표시
  - 데이터가 없으면 안내 문구 표시

필터 영역

- 연도 year 선택
- 분기 quarter 선택
- 검색 버튼

요약 카드 영역 summary cards

- 전체 기업 회원 수
- 전체 매출 합계
- 전체 고용 합계 신규 고용 기준
- 전체 지식재산권 건수 승인된 항목만

차트 영역 summary charts

- 막대/선 차트 조합
  - 연도별 매출 추이
  - 연도별 고용 추이
  - 연도별 지식재산권 건수 등

기업별 추세 그래프 company trend

- 입력
  - 특정 사업자등록번호
  - 조회 기간 연도와 분기 범위
- 출력
  - 매출과 고용의 시계열 그래프
- 목적
  - 특정 기업의 성장 추세를 한눈에 파악

엑셀 다운로드

- 현재 필터 조건으로 집계된 데이터를 엑셀로 다운로드 가능
- 요약 데이터, 상세 데이터 각각 다운로드 옵션 제공

### Banner management 배너 관리

페이지 이름BannerManagementPage

- Dashboard 하위 탭 또는 Operation management 하위 메뉴로 구성 가능

데이터 구조

- 메인 상단 배너 main banner
- 대메뉴별 상단 배너 top banner per main menu
  - 시스템 소개용 배너
  - 프로그램 메뉴용 배너
  - 성과관리 메뉴용 배너
  - 원스톱지원 메뉴용 배너

입력 항목

- 배너 타입 type
  - MAIN
  - INTRO
  - PROGRAM
  - PERFORMANCE
  - SUPPORT 등
- 배너 이미지 파일 업로드
- 링크 URL
  - 선택 입력
- 노출 여부 isActive
  - true 인 배너만 프런트 메인 사이트에서 사용

행위

- 배너 등록, 수정, 삭제
- 프런트 사이트는 isActive true 인 배너만 조회하여 슬라이더 구성

### Popup management 팝업 관리

페이지 이름
PopupManagementPage

입력 항목

- 팝업 시작일 startDate
- 팝업 종료일 endDate
- 팝업 이미지 파일 업로드
- 팝업 내용 텍스트 에디터 입력 optional
- 클릭 시 이동할 링크 URL optional
- 노출 여부 isActive

행위

- front 사이트에서 팝업은 오늘 하루 보지 않기 기능을 가진다.
- 관리자는 팝업 등록, 수정, 삭제 가능.

## 2 Company search 기업검색

페이지 이름
CompanySearchPage

역할

- 외부 NiceDnb Open API 등과 연동해 기업 정보를 조회하는 화면.
- 조회 결과를 레포트 형태로 표시하고, 필요 시 엑셀로 저장한다.

검색 조건

- 사업자등록번호
- 대표자명
- 지역

조회 결과기업 개요

- 기업명
- 대표자
- 사업자등록번호
- 법인등록번호 optional
- 전화번호
- 사업시작일
- 주소
- 기업형태
- 표준산업분류 코드
- 주요제품 또는 주요사업
- 재무결산 기준일
- 신용등급 유효기간
- 신용등급 평가일

주요 재무사항

- 최근 3개 연도 기준 데이터
- 항목
  - 총자산, 자기자본, 자본금, 차입금, 금융비용, 매출액, 영업이익, 당기순이익
  - 순이익 증가율, 자기자본 비율, 부채비율, 차입금 의존도, 금융비용 부담률
  - 매출액 증가율, 매출액 영업이익률, 매출액 순이익률

표시 방식

- 기업 개요는 카드 또는 프로필 레이아웃
- 재무사항은 표 형태
- 데이터는 엑셀 다운로드 지원

## 3 Performance approval 성과관리 승인

페이지 이름
PerformanceAdminPage

역할

- 기업 포털에서 제출된 성과 데이터를 검토하고 승인 또는 보완 요청을 수행한다.

목록 화면

- 필터
  - 기업명
  - 사업자등록번호
  - 연도
  - 분기
  - 문서상태 status
    - submitted 제출완료
    - need_fix 보완요청
    - approved 승인완료
- 목록 컬럼
  - 기업명
  - 사업자등록번호
  - 연도
  - 분기
  - 문서유형 예 sales_employment, gov_support, ip_right
  - 상태 status
  - 등록일자
  - 확인 버튼

상세 검토 화면

- 기업이 입력한 성과 내용을 조회
- 첨부파일 다운로드
- 상태 변경
  - 승인완료 approved
  - 보완요청 need_fix
- 관리자 코멘트 comment 입력
  - 보완요청 시 필수
  - 기업 포털의 성과조회 화면에서 해당 코멘트가 보이도록 연동

행위

- 승인 시
  - 해당 데이터는 집계대상으로 포함된다.
- 보완요청 시
  - 기업 측 성과입력 화면에서 해당 연도/분기가 보완요청 상태로 표시된다.

## 4 Program management 프로그램 관리

페이지 이름
ProgramAdminPage

역할

- 기업 포털 프로그램 공고 페이지에 보이는 프로그램 게시글을 관리한다.

입력 항목

- 프로그램명 title
- 접수 대상 대상 기업 또는 조건 텍스트
- 사업 시작일 startDate
- 접수 마감일 endDate
- 대표 이미지 image
  - 상세 페이지 상단에 노출
- 첨부파일 attachments
  - 최대 2개
  - 상세 페이지에서 다운로드 링크로 노출

행위

- 프로그램 등록, 수정, 삭제
- 등록된 프로그램은 프런트의 프로그램 목록/상세에서 사용
- 기업 포털 측 프로그램 신청 데이터는 별도 ProgramApplicationAdminPage 로 확장 가능

## 5 Operation management 운영관리

페이지 이름
OperationManagementPage

하위 메뉴

- Notice board 공지사항 관리
- Press board 보도자료 관리
- Rolling banner 롤링배너 관리
- System info 시스템 소개 관리

### 5 1 Notice board 공지사항 관리

역할

- 기업 포털 공지사항 게시판을 관리한다.
- 공지사항은 일반 게시판 구조를 가지며, 내용 입력은 WYSIWYG 에디터를 사용한다.

공지사항 데이터 구조

- id
- title 공지 제목
- content 공지 내용 HTML
- attachments 첨부파일 리스트
- inlineImages 에디터 본문에 삽입된 이미지 리스트
- createdAt 작성일
- author 작성자 관리자 계정
- viewCount 조회수 optional

입력 항목

- 제목 title
  - 일반 텍스트 필드
- 내용 content
  - 범용적인 WYSIWYG 에디터 사용
  - 예 Quill, TinyMCE, Toast UI Editor 등
  - 필수 기능
    - 글꼴 크기, 굵게, 밑줄, 색상
    - 번호 목록, 불릿 목록
    - 링크 삽입
    - 이미지 삽입 버튼
    - 드래그 앤 드롭 이미지 업로드
- 첨부파일 attachments
  - 별도의 파일 업로드 영역
  - 최대 3개 정도
  - 공지 상세 페이지 하단에 다운로드 링크로 노출
  - pdf, hwp, docx 등 일반 문서 파일 위주
- 에디터 내 이미지 이미지 삽입 inline images
  - 에디터 툴바의 이미지 버튼
  - 에디터 영역으로 직접 드래그 앤 드롭
  - 클립보드에서 이미지 붙여넣기 optional

WYSIWYG 에디터 이미지 업로드 경로 규칙

- 에디터에 이미지가 드래그 앤 드롭 되었을 때
  - 프론트는 업로드 API를 호출하여 서버에 파일을 전송한다.
- 서버 저장 경로 패턴
  - 루트 폴더/upload
  - 기업 또는 운영 주체 기준 하위 폴더/upload/{businessId}
  - 공지사항용 폴더
    /upload/{businessId}/notice
- 처리 플로우 예시1  프론트에서 multipart 형식으로 이미지 업로드 API 호출2  서버는 /upload/{businessId}/notice 경로 존재 여부 확인 후 없으면 생성3  원본 파일명과 다른 유니크 서버 파일명 storedFileName 생성4  해당 경로에 이미지 저장5  데이터베이스에 레코드 저장
  - noticeId 공지사항 id optional (공지 생성 전 임시키 사용 가능)
  - originalFileName
  - storedFileName
  - fileUrl 예 /upload/{businessId}/notice/{storedFileName}
    6  서버는 fileUrl 을 응답으로 반환
    7  프런트 에디터는 해당 URL을 사용하는 img 태그를 현재 커서 위치에 삽입한다.

공지사항 첨부파일 업로드 경로 규칙

- 공지사항 첨부파일 또한 동일 폴더 구조를 사용한다.
  - /upload/{businessId}/notice
- 에디터 본문 이미지 inlineImages 와 첨부파일 attachments 모두같은 /upload/{businessId}/notice 폴더에 저장한다.
- DB 상에서 첨부파일과 에디터 이미지는
  type 구분 필드 또는 별도 테이블로 구분 관리한다.
  예
  fileType INLINE_IMAGE 또는 ATTACHMENT

중요

- 글 내용 중간에 들어가는 이미지와공지 상세 하단의 첨부파일은 서로 다른 개념이다.
- 물리 저장 위치는 동일 폴더 /upload/{businessId}/notice 이지만
  DB와 UI에서 역할이 명확히 구분되도록 설계한다.

목록 화면

- 검색 조건
  - 제목
  - 작성자
  - 기간 fromDate, toDate
- 리스트 컬럼
  - 제목
  - 작성일
  - 작성자
  - 조회수 optional
- 테이블 헤더 클릭 시 정렬
- 행 클릭 시 상세 보기, 수정, 삭제 가능

메인 홈 연동 규칙

- 메인 홈 공지사항 영역에서는공지사항 게시글 중 최신 5개의 제목만 조회한다.
- 메인 홈에서 사용하는 필드
  - id
  - title
  - createdAt
- 메인 홈에서는 내용 본문, 이미지, 첨부파일을 사용하지 않는다.
- Notice 전용 latest5 API
  - GET /api/notices/latest5
  - 반환 값에 id, title, createdAt 포함

### 5 2 Press board 보도자료 관리

중요 포인트

- 보도자료는 제목과 이미지 파일만 첨부하면 되는 단순 구조이다.
- 프런트 메인 홈과 상세 페이지에서도 제목과 이미지 중심으로만 사용한다.
- 텍스트 본문은 별도로 관리하지 않는다 optional.

입력 항목

- 제목 title
- 이미지 파일 image
  - 업로드된 원본 이미지를 기반으로 썸네일 자동 생성 가능
- 작성일 createdAt 시스템 자동 기록
- 작성자 author 현재 로그인한 관리자 기준 자동 설정

저장 경로 규칙

- 보도자료 이미지 파일 저장 경로 패턴
  - /upload/{businessId}/press
- 서버는 multipart 업로드를 받아 위 경로에 유니크 파일명으로 저장하고
  fileUrl 을 응답한다.

목록 화면

- 리스트 컬럼
  - 썸네일 이미지 프리뷰
  - 제목
  - 작성일
  - 작성자
- 보도자료 등록, 수정, 삭제 기능 제공

메인 홈 연동 규칙

- 메인 홈 보도자료 영역에서는보도자료 게시글 중 가장 최신 1건만 사용한다.
- 메인 홈에서 사용하는 필드
  - id
  - title
  - thumbnailImageUrl 또는 imageUrl
- 프런트 메인 홈에서는 이미지 카드 형태로최신 보도자료 1건을 표시한다.
- 이미지를 클릭하면
  - 보도자료 상세 레이어 팝업 또는 별도 상세 페이지를 통해
    원본 이미지를 크게 보여준다.

### 5 3 Rolling banner 롤링배너 관리

페이지 이름
RollingBannerAdminPage

역할

- 기업 포털 메인 홈 우측에 위치하는 롤링 배너를 관리한다.

입력 항목

- 배너 이미지 파일 image
- 클릭 시 이동할 URL linkUrl
- 노출 여부 isActive

저장 경로 규칙

- /upload/{businessId}/banner 또는별도의 /upload/{businessId}/rolling 경로 사용 가능
- 경로 패턴만 명확히 유지하면 구현 기술은 자유

동작 규칙

- 메인 홈 롤링 배너는 isActive true 인 배너만 사용한다.
- 자동 롤링 주기
  - 예 15초마다 다음 배너로 전환
- 컨트롤 버튼
  - Back 이전 배너
  - Forward 다음 배너
  - Pause 일시 정지
  - Play 다시 재생

### 5 4 System info 시스템 소개 관리

페이지 이름
SystemInfoAdminPage

역할

- 기업 포털의 시스템 소개 페이지에 표시될 컨텐츠를 관리한다.
- 관리자가 입력한 HTML 내용과 이미지 파일을 기업용 홈페이지의 시스템 소개 페이지에 그대로 표시한다.

입력 항목

- 내용 content
  - WYSIWYG 에디터 사용
  - 예 Quill, TinyMCE, Toast UI Editor 등
  - HTML 형식으로 저장
  - 필수 기능
    - 글꼴 크기, 굵게, 밑줄, 색상
    - 번호 목록, 불릿 목록
    - 링크 삽입
    - 이미지 삽입 버튼
    - 드래그 앤 드롭 이미지 업로드
- 이미지 파일 image
  - 별도의 이미지 파일 업로드 영역
  - 최대 1개
  - 기업용 홈페이지 시스템 소개 페이지에 표시

저장 경로 규칙

- 시스템 소개 이미지 파일 저장 경로 패턴
  - /upload/common/system-info
- 서버는 multipart 업로드를 받아 위 경로에 유니크 파일명으로 저장하고
  fileUrl 을 응답한다.
- 에디터 내 이미지도 동일 경로에 저장한다.

데이터 구조

- id
- content HTML 내용
- imageUrl 이미지 파일 URL optional
- updatedAt 최종 수정일
- updatedBy 수정자 관리자 계정

행위

- 시스템 소개 컨텐츠는 단일 레코드로 관리한다.
- 등록, 수정 기능 제공
- 삭제는 비활성화 처리로 대체 가능
- 기업용 홈페이지 시스템 소개 페이지에서
  - content 필드의 HTML을 그대로 렌더링
  - imageUrl 이 있으면 이미지도 함께 표시

기업용 홈페이지 연동 규칙

- 기업용 홈페이지의 시스템 소개 페이지 경로 intro
- GET /api/system-info API를 통해 컨텐츠 조회
- 반환 값
  - content HTML
  - imageUrl optional
- 프런트에서는 content를 dangerouslySetInnerHTML 또는 동등한 방식으로 렌더링
- imageUrl이 있으면 content 상단 또는 하단에 이미지 표시

## 6 Company members 기업회원 관리

페이지 이름
CompanyMemberAdminPage

역할

- 기업회원 계정을 조회하고 승인 상태를 설정하는 화면.

목록 화면

- 검색 조건
  - 기업명
  - 대표자명
  - 사업분야
- 목록 컬럼
  - 기업명
  - 대표자
  - 사업자등록번호
  - 본사 주소
  - 업종 또는 사업분야
- 기능
  - 행 클릭 시 기업회원 상세 페이지로 이동
  - 페이지네이션
  - 페이지당 행수 선택
  - 헤더 클릭 정렬

상세 화면

- 기업의 전체 정보 표시
- 승인 상태 설정
  - 대기, 승인, 비활성 등
- 액션 버튼
  - 기업검색 버튼
    - CompanySearchPage 를 해당 기업 정보로 자동 조회
  - 성과관리 버튼
    - PerformanceAdminPage 로 이동
    - 필터에 해당 기업 식별자 자동 설정

엑셀 다운로드

- 현재 필터 조건을 적용한 기업회원 목록을 엑셀로 저장

## 7 공통 파일 처리와 보안 규칙

파일 저장 기본 구조

- 모든 업로드 파일의 루트 디렉터리
  - /upload
- 기업 또는 운영 주체 단위의 하위 폴더
  - /upload/{businessId}
  - businessId 는 내부적으로 결정된 사업자번호 또는 시스템 식별자
- 기능별 하위 폴더 예시
  - 공지사항 notice/upload/{businessId}/notice
  - 보도자료 press/upload/{businessId}/press
  - 프로그램 program/upload/{businessId}/program
  - 성과자료 performance
    /upload/{businessId}/performance
  - 시스템 소개 system-info/upload/common/system-info

공지사항 파일 업로드 공통 규칙

- 공지사항 에디터 이미지와 공지 첨부파일 두 종류 모두물리 저장 위치는 동일하게 /upload/{businessId}/notice 폴더를 사용한다.
- 구분은 물리 경로가 아니라 데이터베이스 필드에서 수행한다.
  예시
  table notice_files
  fileType
  INLINE_IMAGE 에디터 본문 이미지
  ATTACHMENT 첨부파일 다운로드용

에디터 이미지 처리 요약

- 프런트 에디터에서 이미지 업로드 요청
- 서버에서 /upload/{businessId}/notice 저장
- DB에 fileType INLINE_IMAGE 로 저장
- 응답으로 fileUrl 반환
- 에디터는 해당 fileUrl 로 img 태그를 삽입

공지 첨부파일 처리 요약

- 첨부파일 업로드 입력 영역에서 파일 선택
- 서버에서 /upload/{businessId}/notice 저장
- DB에 fileType ATTACHMENT 로 저장
- 공지 상세 화면에서는 첨부파일 리스트를 다운로드 링크로 표시
- 에디터 본문에는 자동 삽입하지 않는다 이루는 전혀 다른 영역

파일 이름 규칙

- 서버 저장 파일명 storedFileName 은 항상 유니크 값 사용
  - uuid, 타임스탬프 등
- 원본 파일명 originalFileName 은 사용자에게 보여주기 위해 DB에 별도 저장
- 삭제 또는 교체 시
  - DB 기록과 실제 파일을 함께 정리하는 절차 필요

트랜잭션 처리

- 공지사항 생성, 수정, 삭제와관련 파일 insert update delete 작업은 가능한 한 하나의 트랜잭션으로 묶는다.
- 예
  - 공지 생성 실패 시 업로드된 파일 레코드도 롤백
  - 공지 삭제 시 관련 파일 레코드와 실제 파일 삭제 동작을 함께 처리

보안 규칙

- 모든 텍스트 입력값은 서버 단에서 validation 수행
  - 길이 제한, 허용 문자, 필수 여부 등
- SQL injection 방어 필수
- 업로드 파일
  - 허용 확장자 제한예 이미지 jpg jpeg png gif예 문서 pdf docx hwp 등
  - 최대 용량 제한 예 이미지 5MB, 문서 10MB 등
  - MIME type 검사와 확장자 검사를 모두 수행
- 비밀번호 등 민감 정보는 해시로 저장

상태값과 구분값 제안 공통 상수

- 성과관리 status 값

  - draft 임시저장
  - submitted 제출완료
  - need_fix 보완요청
  - approved 승인완료
- 게시판 타입 boardType 값

  - NOTICE 공지사항
  - PRESS 보도자료

이 공통 상수는 프런트와 백엔드에서 동일하게 사용하여
코드와 데이터 구조의 일관성을 유지한다.
