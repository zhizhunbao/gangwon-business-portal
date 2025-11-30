/**
 * Test Data Fixtures
 * 测试数据 - 用于 E2E 测试
 */

export const testUsers = {
  admin: {
    username: '000-00-00000',
    password: 'password123',
    email: 'admin@example.com',
  },
  member: {
    businessNumber: '999-99-99999',
    password: 'password123',
    email: 'test@example.com',
  },
  newMember: {
    businessNumber: `999-${Math.floor(Math.random() * 90 + 10)}-${Math.floor(Math.random() * 90000 + 10000)}`,
    companyName: 'E2E Test Company',
    password: 'Test1234!',
    email: `test${Date.now()}@example.com`,
    region: '江原特别自治道',
  },
};

export const testContent = {
  notice: {
    title: 'E2E Test Notice',
    content: 'This is a test notice created by E2E tests.',
    category: 'announcement',
  },
  news: {
    title: 'E2E Test News',
    content: 'This is a test news article created by E2E tests.',
  },
  faq: {
    question: 'E2E Test FAQ Question?',
    answer: 'This is a test FAQ answer created by E2E tests.',
    category: 'general',
  },
  banner: {
    title: 'E2E Test Banner',
    type: 'main_primary',
    is_active: true,
  },
};

export const testPerformance = {
  sales: {
    year: new Date().getFullYear(),
    quarter: 1,
    type: 'sales',
    data: {
      sales: [
        {
          productName: 'Test Product',
          salesAmount: 1000000,
          salesDate: '2024-01-15',
        },
      ],
    },
  },
  support: {
    year: new Date().getFullYear(),
    quarter: 1,
    type: 'support',
    data: {
      support: [
        {
          projectName: 'Test Support Project',
          supportAmount: 500000,
          startDate: '2024-01-01',
          endDate: '2024-03-31',
        },
      ],
    },
  },
  ip: {
    year: new Date().getFullYear(),
    quarter: 1,
    type: 'ip',
    data: {
      intellectualProperty: [
        {
          type: 'patent',
          registrationNumber: 'TEST-2024-001',
          registrationDate: '2024-01-15',
        },
      ],
    },
  },
};

export const testProject = {
  title: 'E2E Test Project',
  description: 'This is a test project created by E2E tests.',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  maxApplications: 10,
};

export const testInquiry = {
  subject: 'E2E Test Inquiry',
  content: 'This is a test inquiry created by E2E tests.',
  category: 'general',
};

