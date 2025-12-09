/**
 * useLogLayout Hook
 * 
 * Hook for detecting and logging layout issues (overflow, overlap, size anomalies)
 * Only logs when issues are detected (not on normal changes)
 * 
 * @example
 * const cardRef = useRef(null);
 * useLogLayout('ResponsiveCard', {
 *   element_ref: cardRef,
 *   detect_overflow: true,
 *   detect_overlap: true
 * });
 */

import { useEffect, useRef } from 'react';
import loggerService from '@shared/services/logger.service';

/**
 * useLogLayout Hook
 * 
 * @param {string} componentName - Component name for logging
 * @param {Object} options - Options
 * @param {React.RefObject} options.element_ref - Ref to the element to monitor
 * @param {boolean} options.detect_overflow - Whether to detect overflow (default: true)
 * @param {boolean} options.detect_overlap - Whether to detect overlap (default: false)
 * @param {boolean} options.detect_size_anomalies - Whether to detect size anomalies (default: false)
 * @param {Object} options.threshold - Thresholds for detection
 * @param {number} options.threshold.overflow - Overflow threshold in pixels (default: 10)
 * @param {number} options.threshold.overlap - Overlap threshold in pixels (default: 5)
 */
export function useLogLayout(componentName, options = {}) {
  const {
    element_ref,
    detect_overflow = true,
    detect_overlap = false,
    detect_size_anomalies = false,
    threshold = {
      overflow: 10,
      overlap: 5,
    },
  } = options;

  const lastIssueRef = useRef({});
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    if (!element_ref?.current) return;

    const element = element_ref.current;

    // Create ResizeObserver to detect layout changes
    const resizeObserver = new ResizeObserver((entries) => {
      // Clear previous debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Debounce layout checks
      debounceTimerRef.current = setTimeout(() => {
        checkLayoutIssues(element, componentName, {
          detect_overflow,
          detect_overlap,
          detect_size_anomalies,
          threshold,
          lastIssueRef,
        });
      }, 500); // 500ms debounce
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [element_ref, componentName, detect_overflow, detect_overlap, detect_size_anomalies, threshold]);
}

/**
 * Check for layout issues
 */
function checkLayoutIssues(element, componentName, options) {
  const {
    detect_overflow,
    detect_overlap,
    detect_size_anomalies,
    threshold,
    lastIssueRef,
  } = options;

  const rect = element.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(element);
  const now = Date.now();

  // Get viewport info
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
    device_pixel_ratio: window.devicePixelRatio || 1,
    orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
  };

  // Determine responsive breakpoint
  const responsiveBreakpoint = getResponsiveBreakpoint(viewport.width);

  // Check overflow
  if (detect_overflow) {
    const overflowX = element.scrollWidth - element.clientWidth;
    const overflowY = element.scrollHeight - element.clientHeight;

    if (overflowX > threshold.overflow || overflowY > threshold.overflow) {
      const issueKey = `overflow-${componentName}`;
      // Only log if not logged recently (within 10 seconds)
      if (!lastIssueRef.current[issueKey] || (now - lastIssueRef.current[issueKey]) > 10000) {
        logLayoutIssue('overflow', {
          componentName,
          element,
          rect,
          computedStyle,
          viewport,
          responsiveBreakpoint,
          overflowX,
          overflowY,
        });
        lastIssueRef.current[issueKey] = now;
      }
    }
  }

  // Check overlap (simplified - checks if element overlaps with siblings)
  if (detect_overlap) {
    const parent = element.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(child => child !== element);
      for (const sibling of siblings) {
        const siblingRect = sibling.getBoundingClientRect();
        const overlap = getOverlapArea(rect, siblingRect);
        
        if (overlap > threshold.overlap) {
          const issueKey = `overlap-${componentName}-${sibling.className || 'unknown'}`;
          if (!lastIssueRef.current[issueKey] || (now - lastIssueRef.current[issueKey]) > 10000) {
            logLayoutIssue('overlap', {
              componentName,
              element,
              rect,
              computedStyle,
              viewport,
              responsiveBreakpoint,
              overlapArea: overlap,
              overlapWith: sibling.className || sibling.tagName,
            });
            lastIssueRef.current[issueKey] = now;
          }
        }
      }
    }
  }

  // Check size anomalies (simplified - checks if element is unusually large or small)
  if (detect_size_anomalies) {
    const expectedSize = getExpectedSize(element, viewport);
    if (expectedSize) {
      const sizeRatio = Math.max(
        rect.width / expectedSize.width,
        rect.height / expectedSize.height
      );

      if (sizeRatio > 2 || sizeRatio < 0.5) {
        const issueKey = `size_anomaly-${componentName}`;
        if (!lastIssueRef.current[issueKey] || (now - lastIssueRef.current[issueKey]) > 10000) {
          logLayoutIssue('size_anomaly', {
            componentName,
            element,
            rect,
            computedStyle,
            viewport,
            responsiveBreakpoint,
            sizeRatio,
            expectedSize,
            actualSize: { width: rect.width, height: rect.height },
          });
          lastIssueRef.current[issueKey] = now;
        }
      }
    }
  }
}

/**
 * Get responsive breakpoint
 */
function getResponsiveBreakpoint(width) {
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

/**
 * Get overlap area between two rectangles
 */
function getOverlapArea(rect1, rect2) {
  const xOverlap = Math.max(0, Math.min(rect1.right, rect2.right) - Math.max(rect1.left, rect2.left));
  const yOverlap = Math.max(0, Math.min(rect1.bottom, rect2.bottom) - Math.max(rect1.top, rect2.top));
  return xOverlap * yOverlap;
}

/**
 * Get expected size for element (simplified heuristic)
 */
function getExpectedSize(element, viewport) {
  // This is a simplified heuristic - in practice, you might want more sophisticated logic
  const parent = element.parentElement;
  if (!parent) return null;

  const parentRect = parent.getBoundingClientRect();
  return {
    width: parentRect.width * 0.8, // Assume element should be ~80% of parent
    height: parentRect.height * 0.8,
  };
}

/**
 * Log layout issue
 */
function logLayoutIssue(issueType, data) {
  const {
    componentName,
    element,
    rect,
    computedStyle,
    viewport,
    responsiveBreakpoint,
    ...issueDetails
  } = data;

  // Get element info
  const elementSelector = getElementSelector(element);
  const elementId = element.id || null;
  const elementClasses = element.className ? element.className.split(' ').filter(Boolean) : [];

  // Get CSS context
  const cssContext = getCSSContext(element);

  // Get page context
  const pageContext = {
    url: window.location.href,
    route: window.location.pathname,
    page_title: document.title,
    user_role: getCurrentUserRole(),
  };

  // Determine severity
  const severity = determineSeverity(issueType, issueDetails);

  // Build layout issue data
  const layoutIssue = {
    issue_type: issueType,
    severity,
    component_name: componentName,
    element_selector: elementSelector,
    element_id: elementId,
    element_classes: elementClasses,
    issue_details: buildIssueDetails(issueType, issueDetails),
    layout_info: {
      offset_width: element.offsetWidth,
      offset_height: element.offsetHeight,
      client_width: element.clientWidth,
      client_height: element.clientHeight,
      scroll_width: element.scrollWidth,
      scroll_height: element.scrollHeight,
      offset_left: element.offsetLeft,
      offset_top: element.offsetTop,
      computed_style: {
        width: computedStyle.width,
        height: computedStyle.height,
        display: computedStyle.display,
        flex_direction: computedStyle.flexDirection,
        overflow: computedStyle.overflow,
        position: computedStyle.position,
      },
    },
    viewport,
    responsive_breakpoint: responsiveBreakpoint,
    breakpoint_ranges: {
      mobile: '< 768px',
      tablet: '768px - 1024px',
      desktop: '> 1024px',
    },
    css_context: cssContext,
    page_context: pageContext,
    timestamp: new Date().toISOString(),
  };

  // Log the issue
  loggerService.warn(`Layout issue detected: ${componentName} ${issueType}`, {
    module: componentName,
    function: 'useLogLayout',
    layout_issue: layoutIssue,
  });
}

/**
 * Get element selector
 */
function getElementSelector(element) {
  if (element.id) return `#${element.id}`;
  if (element.className) {
    const classes = element.className.split(' ').filter(Boolean);
    if (classes.length > 0) {
      return `.${classes[0]}`;
    }
  }
  return element.tagName.toLowerCase();
}

/**
 * Get CSS context
 */
function getCSSContext(element) {
  const parent = element.parentElement;
  const siblings = parent ? Array.from(parent.children).filter(child => child !== element) : [];

  return {
    parent_element: parent ? getElementSelector(parent) : null,
    parent_classes: parent && parent.className ? parent.className.split(' ').filter(Boolean) : [],
    sibling_elements: siblings.slice(0, 3).map(getElementSelector), // Limit to 3 siblings
    media_queries: [], // Would need to parse stylesheets to get this
    related_css_rules: [], // Would need to parse stylesheets to get this
  };
}

/**
 * Get current user role
 */
function getCurrentUserRole() {
  try {
    const userInfo = localStorage.getItem('user_info');
    if (userInfo) {
      const user = typeof userInfo === 'string' ? JSON.parse(userInfo) : userInfo;
      return user.role || 'member';
    }
  } catch (e) {}
  return null;
}

/**
 * Determine severity
 */
function determineSeverity(issueType, issueDetails) {
  if (issueType === 'overflow') {
    const overflowX = issueDetails.overflowX || 0;
    const overflowY = issueDetails.overflowY || 0;
    const maxOverflow = Math.max(overflowX, overflowY);
    
    if (maxOverflow > 50) return 'high';
    if (maxOverflow > 20) return 'medium';
    return 'low';
  }
  
  if (issueType === 'overlap') {
    const overlapArea = issueDetails.overlapArea || 0;
    if (overlapArea > 1000) return 'high';
    if (overlapArea > 100) return 'medium';
    return 'low';
  }
  
  if (issueType === 'size_anomaly') {
    const sizeRatio = issueDetails.sizeRatio || 1;
    if (sizeRatio > 5 || sizeRatio < 0.2) return 'high';
    if (sizeRatio > 3 || sizeRatio < 0.33) return 'medium';
    return 'low';
  }
  
  return 'medium';
}

/**
 * Build issue details
 */
function buildIssueDetails(issueType, issueDetails) {
  if (issueType === 'overflow') {
    return {
      overflow_x: issueDetails.overflowX || 0,
      overflow_y: issueDetails.overflowY || 0,
      overflow_direction: 
        (issueDetails.overflowX > 0 && issueDetails.overflowY > 0) ? 'both' :
        (issueDetails.overflowX > 0) ? 'horizontal' :
        (issueDetails.overflowY > 0) ? 'vertical' : 'none',
    };
  }
  
  if (issueType === 'overlap') {
    return {
      overlap_area: issueDetails.overlapArea || 0,
      overlap_with: issueDetails.overlapWith || 'unknown',
    };
  }
  
  if (issueType === 'size_anomaly') {
    return {
      size_ratio: issueDetails.sizeRatio || 1,
      expected_size: issueDetails.expectedSize || null,
      actual_size: issueDetails.actualSize || null,
    };
  }
  
  return {};
}

export default useLogLayout;

