/**
 * Logger Handler Compatibility Shim
 *
 * This file provides backward compatibility for components
 * importing loggerService from '@shared/utils/loggerHandler'.
 */

import { loggerCore } from "./logger.core.js";

// Alias loggerCore to loggerService for backward compatibility
export const loggerService = loggerCore;

export default loggerService;
