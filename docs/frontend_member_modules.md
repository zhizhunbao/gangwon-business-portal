# Member Module Dependencies

# 0. shared Components

All shared components are located in the `frontend/src/shared/components/` directory and are used by various member modules.

| Component Name | Type | Description |
|----------------|------|-------------|
| Banner | Layout | Main banner carousel component, supports left/right navigation and click-through |
| Submenu | Layout | Secondary navigation bar component (displayed on 성과관리, 원스톱지원 pages) |
| Pagination | Layout | Pagination component |
| Modal | Layout | Modal dialog component |
| Tabs | Layout | Tab component |
| Loading | Other | Loading indicator component |
| Alert | Other | Alert message component, supports four types: info, success, warning, error |
| Badge | Other | Badge component |
| LanguageSwitcher | Other | Language switcher component |
| ThemeSwitcher | Other | Theme switcher component |
| Icons | Other | Icon component collection |
| Table | Other | Table component |
| Button | Other | Button component |
| Input | Other | Input field component |
| Select | Other | Select dropdown component |
| Textarea | Other | Textarea component |
| Card | Other | Card container component |

---

# 0.1. member Layouts

Layout components specific to the member portal are located in the `frontend/src/member/layouts/` directory.

| Component Name | Type | Description |
|----------------|------|-------------|
| MemberLayout | Layout | Main layout wrapper for member portal pages |
| Header | Layout | Top navigation bar for member portal, includes main menu, user menu, notification center, language switcher |
| Footer | Layout | Footer component, includes organization information, contact details, terms links |
| PageContainer | Layout | Page container component, controls page margins and max-width, supports different sizes (default, large, small) and full-width mode |

---

# 1. about

## Container Components

| Component Name | Description |
|----------------|-------------|
| About.jsx | About page container component (fetches HTML content from API and renders it) |

## Other Components

None

# 2. auth

## Container Components

None

## Other Components

| Component Name | Description |
|----------------|-------------|
| Login.jsx | Login page |
| Register.jsx | Multi-step company registration form (5 steps: account information, company information, business and industry information, file upload, terms agreement) |
| ForgotPassword.jsx | Forgot password page (password reset request) |
| ResetPassword.jsx | Reset password page |

# 3. home

## Container Components

| Component Name | Description |
|----------------|-------------|
| Home.jsx | Home page container component |

## Other Components

| Component Name | Description |
|----------------|-------------|
| NoticesPreview.jsx | Notices preview component, displays the latest 5 notice titles |
| PressPreview.jsx | News/press release preview component, displays the latest 1 news thumbnail |
| NoticesList.jsx | Notices list page, supports pagination |
| PressList.jsx | News/press release list page, supports pagination |
| RollingBannerCard.jsx | Rolling banner card component, supports auto-play, pause, forward/backward navigation, indicators |

# 4. performance

## Container Components

| Component Name | Description |
|----------------|-------------|
| Performance.jsx | Performance page container component |

## Other Components

| Component Name | Description |
|----------------|-------------|
| PerformanceCompanyInfo.jsx | Company information page |
| PerformanceListContent.jsx | Performance query page |
| PerformanceFormContent.jsx | Performance input form page, includes 3 input types (sales and employment, government support history, intellectual property) |

# 5. projects

## Container Components

| Component Name | Description |
|----------------|-------------|
| Projects.jsx | Projects page container component |

## Other Components

| Component Name | Description |
|----------------|-------------|
| ProjectList.jsx | Program announcement list page, supports search, pagination, program application |
| ProjectDetail.jsx | Program announcement detail page, includes program application modal |

# 6. support

## Container Components

| Component Name | Description |
|----------------|-------------|
| Support.jsx | Support page container component |

## Other Components

| Component Name | Description |
|----------------|-------------|
| ConsultationForm.jsx | 1:1 consultation form (name, email, phone number, consultation title, consultation content, up to 3 attachments) |
| ConsultationHistory.jsx | Consultation history (title, registration date, processing status, detail view) |
| FAQList.jsx | FAQ list (question title list, expandable answer structure on click) |
