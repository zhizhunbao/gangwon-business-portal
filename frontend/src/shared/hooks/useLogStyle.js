/**
 * useLogStyle Hook
 * 
 * Hook for logging component styles and design system information
 * Used for automatic style adjustment (e.g., Korean Gov style, Modern GPT style)
 * 
 * @example
 * const cardRef = useRef(null);
 * useLogStyle('ResponsiveCard', {
 *   element_ref: cardRef,
 *   design_system: 'korean_gov', // or 'modern_gpt', 'custom'
 *   log_on_mount: true,
 *   log_on_resize: true,
 *   log_breakpoint_changes: true
 * });
 */

import { useEffect, useRef } from 'react';
import loggerService from '@shared/services/logger.service';

/**
 * useLogStyle Hook
 * 
 * @param {string} componentName - Component name for logging
 * @param {Object} options - Options
 * @param {React.RefObject} options.element_ref - Ref to the element to monitor
 * @param {string} options.design_system - Design system name (e.g., 'korean_gov', 'modern_gpt', 'custom')
 * @param {boolean} options.log_on_mount - Whether to log styles on component mount (default: true)
 * @param {boolean} options.log_on_resize - Whether to log styles on resize (default: false)
 * @param {boolean} options.log_breakpoint_changes - Whether to log when breakpoint changes (default: true)
 * @param {Object} options.style_categories - Which style categories to log
 * @param {boolean} options.style_categories.colors - Log color information (default: true)
 * @param {boolean} options.style_categories.typography - Log typography information (default: true)
 * @param {boolean} options.style_categories.spacing - Log spacing information (default: true)
 * @param {boolean} options.style_categories.borders - Log border/radius information (default: true)
 * @param {boolean} options.style_categories.shadows - Log shadow information (default: true)
 * @param {boolean} options.style_categories.animations - Log animation information (default: false)
 */
export function useLogStyle(componentName, options = {}) {
  const {
    element_ref,
    design_system = 'custom',
    log_on_mount = true,
    log_on_resize = false,
    log_breakpoint_changes = true,
    style_categories = {
      colors: true,
      typography: true,
      spacing: true,
      borders: true,
      shadows: true,
      animations: false,
    },
  } = options;

  const lastBreakpointRef = useRef(null);
  const lastStyleSnapshotRef = useRef(null);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    if (!element_ref?.current) return;

    const element = element_ref.current;

    // Log styles on mount
    if (log_on_mount) {
      const styleSnapshot = captureStyleSnapshot(element, componentName, design_system, style_categories);
      logStyleSnapshot('mount', componentName, styleSnapshot);
      lastStyleSnapshotRef.current = styleSnapshot;
    }

    // Monitor breakpoint changes
    if (log_breakpoint_changes) {
      const currentBreakpoint = getResponsiveBreakpoint(window.innerWidth);
      if (lastBreakpointRef.current !== null && lastBreakpointRef.current !== currentBreakpoint) {
        const styleSnapshot = captureStyleSnapshot(element, componentName, design_system, style_categories);
        logStyleSnapshot('breakpoint_change', componentName, {
          ...styleSnapshot,
          breakpoint_change: {
            from: lastBreakpointRef.current,
            to: currentBreakpoint,
          },
        });
        lastStyleSnapshotRef.current = styleSnapshot;
      }
      lastBreakpointRef.current = currentBreakpoint;
    }

    // Monitor resize if enabled
    if (log_on_resize) {
      const resizeObserver = new ResizeObserver((entries) => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
          const styleSnapshot = captureStyleSnapshot(element, componentName, design_system, style_categories);
          // Only log if styles changed significantly
          if (hasSignificantStyleChange(lastStyleSnapshotRef.current, styleSnapshot)) {
            logStyleSnapshot('resize', componentName, styleSnapshot);
            lastStyleSnapshotRef.current = styleSnapshot;
          }
        }, 500);
      });

      resizeObserver.observe(element);

      return () => {
        resizeObserver.disconnect();
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    }
  }, [element_ref, componentName, design_system, log_on_mount, log_on_resize, log_breakpoint_changes, style_categories]);
}

/**
 * Capture style snapshot
 */
function captureStyleSnapshot(element, componentName, designSystem, styleCategories) {
  const computedStyle = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
    device_pixel_ratio: window.devicePixelRatio || 1,
    orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
  };
  const breakpoint = getResponsiveBreakpoint(viewport.width);

  const snapshot = {
    component_name: componentName,
    design_system: designSystem,
    timestamp: new Date().toISOString(),
    viewport,
    responsive_breakpoint: breakpoint,
    element_info: {
      tag: element.tagName.toLowerCase(),
      id: element.id || null,
      classes: element.className ? element.className.split(' ').filter(Boolean) : [],
      selector: getElementSelector(element),
    },
    layout: {
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left,
      offset_width: element.offsetWidth,
      offset_height: element.offsetHeight,
    },
    styles: {},
  };

  // Capture colors
  if (styleCategories.colors) {
    snapshot.styles.colors = {
      background_color: computedStyle.backgroundColor,
      color: computedStyle.color,
      border_color: computedStyle.borderColor,
      // Extract RGB values for analysis
      background_rgb: extractRGB(computedStyle.backgroundColor),
      text_rgb: extractRGB(computedStyle.color),
    };
  }

  // Capture typography
  if (styleCategories.typography) {
    snapshot.styles.typography = {
      font_family: computedStyle.fontFamily,
      font_size: computedStyle.fontSize,
      font_weight: computedStyle.fontWeight,
      line_height: computedStyle.lineHeight,
      letter_spacing: computedStyle.letterSpacing,
      text_align: computedStyle.textAlign,
      // Extract numeric values
      font_size_px: parseFloat(computedStyle.fontSize) || null,
      line_height_value: parseFloat(computedStyle.lineHeight) || null,
    };
  }

  // Capture spacing
  if (styleCategories.spacing) {
    snapshot.styles.spacing = {
      padding_top: computedStyle.paddingTop,
      padding_right: computedStyle.paddingRight,
      padding_bottom: computedStyle.paddingBottom,
      padding_left: computedStyle.paddingLeft,
      margin_top: computedStyle.marginTop,
      margin_right: computedStyle.marginRight,
      margin_bottom: computedStyle.marginBottom,
      margin_left: computedStyle.marginLeft,
      gap: computedStyle.gap || null,
      // Extract numeric values
      padding_top_px: parseFloat(computedStyle.paddingTop) || 0,
      padding_right_px: parseFloat(computedStyle.paddingRight) || 0,
      padding_bottom_px: parseFloat(computedStyle.paddingBottom) || 0,
      padding_left_px: parseFloat(computedStyle.paddingLeft) || 0,
      margin_top_px: parseFloat(computedStyle.marginTop) || 0,
      margin_right_px: parseFloat(computedStyle.marginRight) || 0,
      margin_bottom_px: parseFloat(computedStyle.marginBottom) || 0,
      margin_left_px: parseFloat(computedStyle.marginLeft) || 0,
      gap_px: parseFloat(computedStyle.gap) || null,
    };
  }

  // Capture borders
  if (styleCategories.borders) {
    snapshot.styles.borders = {
      border_width: computedStyle.borderWidth,
      border_style: computedStyle.borderStyle,
      border_radius: computedStyle.borderRadius,
      border_color: computedStyle.borderColor,
      // Extract numeric values
      border_width_px: parseFloat(computedStyle.borderWidth) || 0,
      border_radius_px: parseFloat(computedStyle.borderRadius) || 0,
    };
  }

  // Capture shadows
  if (styleCategories.shadows) {
    snapshot.styles.shadows = {
      box_shadow: computedStyle.boxShadow,
      text_shadow: computedStyle.textShadow,
      // Parse shadow values
      has_box_shadow: computedStyle.boxShadow !== 'none',
      has_text_shadow: computedStyle.textShadow !== 'none',
    };
  }

  // Capture animations
  if (styleCategories.animations) {
    snapshot.styles.animations = {
      transition: computedStyle.transition,
      animation: computedStyle.animation,
      transition_duration: computedStyle.transitionDuration,
      animation_duration: computedStyle.animationDuration,
      has_transition: computedStyle.transition !== 'all 0s ease 0s',
      has_animation: computedStyle.animation !== 'none',
    };
  }

  // Capture layout properties
  snapshot.styles.layout = {
    display: computedStyle.display,
    flex_direction: computedStyle.flexDirection,
    flex_wrap: computedStyle.flexWrap,
    justify_content: computedStyle.justifyContent,
    align_items: computedStyle.alignItems,
    grid_template_columns: computedStyle.gridTemplateColumns,
    grid_template_rows: computedStyle.gridTemplateRows,
    position: computedStyle.position,
    overflow: computedStyle.overflow,
    overflow_x: computedStyle.overflowX,
    overflow_y: computedStyle.overflowY,
  };

  // Capture CSS variables (design tokens)
  snapshot.design_tokens = extractCSSVariables(element);

  // Capture parent and sibling context
  snapshot.css_context = getCSSContext(element);

  // Capture page context
  snapshot.page_context = {
    url: window.location.href,
    route: window.location.pathname,
    page_title: document.title,
    user_role: getCurrentUserRole(),
  };

  return snapshot;
}

/**
 * Log style snapshot
 */
function logStyleSnapshot(eventType, componentName, snapshot) {
  loggerService.info(`Style snapshot: ${componentName} (${eventType})`, {
    module: componentName,
    function: 'useLogStyle',
    style_snapshot: snapshot,
  });
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
 * Extract RGB values from color string
 */
function extractRGB(colorString) {
  if (!colorString || colorString === 'transparent' || colorString === 'rgba(0, 0, 0, 0)') {
    return null;
  }
  
  // Try to extract RGB from rgb() or rgba()
  const match = colorString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    return {
      r: parseInt(match[1]),
      g: parseInt(match[2]),
      b: parseInt(match[3]),
    };
  }
  
  return null;
}

/**
 * Extract CSS variables (design tokens)
 */
function extractCSSVariables(element) {
  const computedStyle = window.getComputedStyle(element);
  const variables = {};
  
  // Common design token names
  const tokenNames = [
    '--primary-color',
    '--secondary-color',
    '--background-color',
    '--text-color',
    '--border-color',
    '--spacing-unit',
    '--border-radius',
    '--font-size-base',
    '--font-family-base',
    '--shadow-sm',
    '--shadow-md',
    '--shadow-lg',
  ];
  
  for (const tokenName of tokenNames) {
    const value = computedStyle.getPropertyValue(tokenName);
    if (value) {
      variables[tokenName] = value.trim();
    }
  }
  
  return variables;
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
    sibling_elements: siblings.slice(0, 3).map(getElementSelector),
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
 * Check if styles changed significantly
 */
function hasSignificantStyleChange(oldSnapshot, newSnapshot) {
  if (!oldSnapshot) return true;
  
  // Check if layout dimensions changed significantly (> 10px)
  const oldLayout = oldSnapshot.layout;
  const newLayout = newSnapshot.layout;
  
  if (Math.abs(oldLayout.width - newLayout.width) > 10 ||
      Math.abs(oldLayout.height - newLayout.height) > 10) {
    return true;
  }
  
  // Check if breakpoint changed
  if (oldSnapshot.responsive_breakpoint !== newSnapshot.responsive_breakpoint) {
    return true;
  }
  
  return false;
}

export default useLogStyle;

