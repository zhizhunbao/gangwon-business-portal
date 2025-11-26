/**
 * MSW Handlers Index
 * Export all handlers for use in browser.js and server.js
 */

import { authHandlers } from './auth.js';
import { projectsHandlers } from './projects.js';
import { membersHandlers } from './members.js';
import { performanceHandlers } from './performance.js';
import { dashboardHandlers } from './dashboard.js';
import { contentHandlers } from './content.js';
import { supportHandlers } from './support.js';
import { uploadHandlers } from './upload.js';

// Combine all handlers
export const handlers = [
  ...authHandlers,
  ...projectsHandlers,
  ...membersHandlers,
  ...performanceHandlers,
  ...dashboardHandlers,
  ...contentHandlers,
  ...supportHandlers,
  ...uploadHandlers
];

