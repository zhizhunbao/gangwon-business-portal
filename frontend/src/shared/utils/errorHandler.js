/**
 * Error Handler Compatibility Shim
 *
 * This file provides backward compatibility for components
 * importing exceptionService from '@shared/utils/errorHandler'.
 */

import { frontendExceptionService } from "./exception.service.js";
import { frontendExceptionHandler } from "./exception.handler.js";

// Alias services for backward compatibility
export const exceptionService = frontendExceptionService;
export const exceptionHandler = frontendExceptionHandler;

// Add method aliases for backward compatibility
if (!exceptionService.recordException) {
  exceptionService.recordException = exceptionService.reportException;
}
if (!exceptionHandler.handleError) {
  exceptionHandler.handleError = exceptionHandler.handle;
}

export default exceptionService;
