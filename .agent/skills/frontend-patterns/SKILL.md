---
name: frontend-patterns
description: React + Vite + Zustand + i18n 前端开发模式，包括组件模式、状态管理、性能优化和 UI 最佳实践。
---

# Frontend Development Patterns

现代前端开发模式，针对 React + Vite + Zustand + i18n 项目。

## 项目技术栈

- **Framework**: React 18
- **Build Tool**: Vite
- **State Management**: Zustand
- **i18n**: react-i18next
- **Styling**: CSS (custom)

## 组件模式

### 命名导出而不是默认导出

```javascript
// ✅ GOOD: 命名导出（便于重构和tree-shaking）
export const UserCard = ({ user }) => {
  return (
    <div className="user-card">
      <h3>{user.name}</h3>
      <p>{user.email}</p>
    </div>
  )
}

// ❌ AVOID: 默认导出
export default UserCard
```

### Props 解构

```javascript
// ✅ GOOD: 解构 props
export const ProjectCard = ({ title, description, status, onApply }) => {
  return (
    <div className="project-card">
      <h3>{title}</h3>
      <p>{description}</p>
      <span className={`status-${status}`}>{status}</span>
      <button onClick={onApply}>申请</button>
    </div>
  )
}

// ❌ AVOID: 使用 props 对象
export const ProjectCard = (props) => {
  return <div>{props.title}</div>
}
```

### 组合优于继承

```javascript
// ✅ GOOD: 组件组合
export const Card = ({ children, variant = 'default' }) => {
  return <div className={`card card-${variant}`}>{children}</div>
}

export const CardHeader = ({ children }) => {
  return <div className="card-header">{children}</div>
}

export const CardBody = ({ children }) => {
  return <div className="card-body">{children}</div>
}

// 使用
<Card variant="outlined">
  <CardHeader>项目标题</CardHeader>
  <CardBody>项目描述内容</CardBody>
</Card>
```

## i18n 模式

### 使用翻译键而不是硬编码

```javascript
import { useTranslation } from 'react-i18next'

// ✅ GOOD: 使用 i18n
export const WelcomeMessage = () => {
  const { t } = useTranslation()

  return (
    <div>
      <h1>{t('common.welcome')}</h1>
      <p>{t('home.description')}</p>
    </div>
  )
}

// ❌ WRONG: 硬编码文本
export const WelcomeMessage = () => {
  return (
    <div>
      <h1>欢迎</h1>
      <p>这是首页</p>
    </div>
  )
}
```

### 带插值的翻译

```javascript
// locales/ko.json
{
  "greeting": "안녕하세요, {{name}}님",
  "itemCount": "총 {{count}}개의 항목"
}

// 组件中使用
const { t } = useTranslation()
<h1>{t('greeting', { name: user.name })}</h1>
<p>{t('itemCount', { count: items.length })}</p>
```

### 命名空间组织

```javascript
// locales/ko.json
{
  "common": {
    "submit": "제출",
    "cancel": "취소",
    "save": "저장"
  },
  "projects": {
    "title": "프로젝트",
    "apply": "신청하기",
    "status": {
      "pending": "대기중",
      "approved": "승인됨",
      "rejected": "거절됨"
    }
  }
}

// 使用
const { t } = useTranslation()
<button>{t('common.submit')}</button>
<h1>{t('projects.title')}</h1>
<span>{t('projects.status.pending')}</span>
```

## Zustand 状态管理模式

### 创建 Store

```javascript
import { create } from 'zustand'

// ✅ GOOD: 不可变更新
export const useProjectStore = create((set) => ({
  projects: [],
  selectedProject: null,
  loading: false,

  // 设置项目列表
  setProjects: (projects) => set({ projects }),

  // 添加项目（不可变）
  addProject: (project) =>
    set((state) => ({
      projects: [...state.projects, project]
    })),

  // 更新项目（不可变）
  updateProject: (id, updates) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      )
    })),

  // 删除项目（不可变）
  removeProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id)
    })),

  // 选择项目
  selectProject: (project) => set({ selectedProject: project }),

  // 设置加载状态
  setLoading: (loading) => set({ loading })
}))

// ❌ WRONG: 直接修改状态（mutation）
export const useBadStore = create((set) => ({
  projects: [],
  addProject: (project) =>
    set((state) => {
      state.projects.push(project) // MUTATION!
      return state
    })
}))
```

### 使用 Store

```javascript
import { useProjectStore } from '@/shared/stores/projectStore'

export const ProjectList = () => {
  // 仅选择需要的状态（优化性能）
  const projects = useProjectStore((state) => state.projects)
  const loading = useProjectStore((state) => state.loading)
  const setProjects = useProjectStore((state) => state.setProjects)

  useEffect(() => {
    fetchProjects().then(setProjects)
  }, [setProjects])

  if (loading) return <div>Loading...</div>

  return (
    <div>
      {projects.map((project) => (
        <ProjectCard key={project.id} {...project} />
      ))}
    </div>
  )
}
```

### Store 分割

```javascript
// ✅ GOOD: 按功能分割 store
// stores/authStore.js
export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  login: (user) => set({ user, isAuthenticated: true }),
  logout: () => set({ user: null, isAuthenticated: false })
}))

// stores/projectStore.js
export const useProjectStore = create((set) => ({
  projects: [],
  setProjects: (projects) => set({ projects })
}))

// stores/uiStore.js
export const useUIStore = create((set) => ({
  sidebarOpen: false,
  modalOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleModal: () => set((state) => ({ modalOpen: !state.modalOpen }))
}))
```

## 自定义 Hooks 模式

### 数据获取 Hook

```javascript
import { useState, useEffect } from 'react'

export const useFetch = (url) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch(url)
        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [url])

  return { data, loading, error }
}

// 使用
const { data: projects, loading, error } = useFetch('/api/projects')
```

### 防抖 Hook

```javascript
import { useState, useEffect } from 'react'

export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}

// 使用（搜索输入）
const [searchQuery, setSearchQuery] = useState('')
const debouncedQuery = useDebounce(searchQuery, 500)

useEffect(() => {
  if (debouncedQuery) {
    performSearch(debouncedQuery)
  }
}, [debouncedQuery])
```

### Toggle Hook

```javascript
import { useState, useCallback } from 'react'

export const useToggle = (initialValue = false) => {
  const [value, setValue] = useState(initialValue)

  const toggle = useCallback(() => {
    setValue((v) => !v)
  }, [])

  return [value, toggle]
}

// 使用
const [isOpen, toggleOpen] = useToggle()
<button onClick={toggleOpen}>{isOpen ? '关闭' : '打开'}</button>
```

## 性能优化模式

### React.memo

```javascript
import { memo } from 'react'

// ✅ GOOD: 对纯组件使用 memo
export const ProjectCard = memo(({ project, onApply }) => {
  return (
    <div className="project-card">
      <h3>{project.title}</h3>
      <p>{project.description}</p>
      <button onClick={() => onApply(project.id)}>申请</button>
    </div>
  )
})
```

### useCallback

```javascript
import { useCallback } from 'react'

export const ProjectList = () => {
  const projects = useProjectStore((state) => state.projects)

  // ✅ GOOD: 缓存回调函数
  const handleApply = useCallback((projectId) => {
    console.log('Applying to project:', projectId)
    // API call
  }, [])

  return (
    <div>
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onApply={handleApply}
        />
      ))}
    </div>
  )
}
```

### useMemo

```javascript
import { useMemo } from 'react'

export const ProjectList = () => {
  const projects = useProjectStore((state) => state.projects)
  const [filter, setFilter] = useState('all')

  // ✅ GOOD: 缓存昂贵的计算
  const filteredProjects = useMemo(() => {
    if (filter === 'all') return projects
    return projects.filter((p) => p.status === filter)
  }, [projects, filter])

  return (
    <div>
      {filteredProjects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  )
}
```

### 代码分割和懒加载

```javascript
import { lazy, Suspense } from 'react'

// ✅ GOOD: 懒加载重型组件
const PerformanceReport = lazy(() =>
  import('@/member/modules/performance/Performance')
)
const ProjectList = lazy(() => import('@/member/modules/projects/Projects'))

export const MemberRoutes = () => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/performance" element={<PerformanceReport />} />
        <Route path="/projects" element={<ProjectList />} />
      </Routes>
    </Suspense>
  )
}
```

## 表单处理模式

### 受控表单

```javascript
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export const ApplicationForm = ({ onSubmit }) => {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    companyName: '',
    businessNumber: '',
    industry: ''
  })
  const [errors, setErrors] = useState({})

  const validate = () => {
    const newErrors = {}

    if (!formData.companyName.trim()) {
      newErrors.companyName = t('errors.required')
    }

    if (!formData.businessNumber.trim()) {
      newErrors.businessNumber = t('errors.required')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validate()) return

    try {
      await onSubmit(formData)
    } catch (error) {
      console.error('Submit failed:', error)
    }
  }

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }))
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>{t('form.companyName')}</label>
        <input
          value={formData.companyName}
          onChange={handleChange('companyName')}
        />
        {errors.companyName && (
          <span className="error">{errors.companyName}</span>
        )}
      </div>

      <div>
        <label>{t('form.businessNumber')}</label>
        <input
          value={formData.businessNumber}
          onChange={handleChange('businessNumber')}
        />
        {errors.businessNumber && (
          <span className="error">{errors.businessNumber}</span>
        )}
      </div>

      <button type="submit">{t('common.submit')}</button>
    </form>
  )
}
```

## 错误处理模式

### 错误边界

```javascript
import { Component } from 'react'

export class ErrorBoundary extends Component {
  state = {
    hasError: false,
    error: null
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error boundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>出错了</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false })}>
            重试
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// 使用
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

## 可访问性模式

### ARIA 标签

```javascript
export const SearchInput = ({ value, onChange, placeholder }) => {
  return (
    <div>
      <label htmlFor="search" className="sr-only">
        搜索
      </label>
      <input
        id="search"
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label="搜索项目"
        aria-describedby="search-hint"
      />
      <span id="search-hint" className="sr-only">
        输入关键词搜索项目
      </span>
    </div>
  )
}
```

### 键盘导航

```javascript
export const Modal = ({ isOpen, onClose, children }) => {
  const modalRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      modalRef.current?.focus()
    }
  }, [isOpen])

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="modal"
    >
      {children}
    </div>
  )
}
```

## 项目特定模式

### 多语言路由

```javascript
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation()
  const navigate = useNavigate()

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng)
    // 可选：持久化到 localStorage
    localStorage.setItem('language', lng)
  }

  return (
    <div className="language-switcher">
      <button onClick={() => changeLanguage('ko')}>한국어</button>
      <button onClick={() => changeLanguage('zh')}>中文</button>
    </div>
  )
}
```

### 功能模块结构

```
frontend/src/
├── features/
│   └── project-application/
│       ├── components/
│       │   ├── ApplicationForm.jsx
│       │   └── ApplicationModal.jsx
│       ├── hooks/
│       │   └── useApplicationForm.js
│       ├── services/
│       │   └── applicationService.js
│       ├── stores/
│       │   └── applicationStore.js
│       └── locales/
│           ├── ko.json
│           └── zh.json
```

**记住**: 现代前端模式使可维护、高性能的用户界面成为可能。选择适合项目复杂度的模式。
