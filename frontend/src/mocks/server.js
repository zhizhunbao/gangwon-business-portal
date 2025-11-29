/**
 * MSW Server Setup
 * Used in Node.js environment (e.g., for testing)
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers/index.js';

// Setup MSW server for Node.js environment
export const server = setupServer(...handlers);

