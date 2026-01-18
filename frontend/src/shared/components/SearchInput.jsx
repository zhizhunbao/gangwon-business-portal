/**
 * SearchInput Component
 * 统一的搜索输入框组件 - 支持防抖、全字段模糊搜索、国际化、统一样式
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { SearchIcon } from './Icons';
import { cn } from '@shared/utils/helpers';

/**
 * 全字段模糊搜索函数
 * @param {Array} data - 要搜索的数据数组
 * @param {string} keyword - 搜索关键词
 * @param {Array} columns - 表格列定义（可选，用于获取渲染后的文本）
 * @returns {Array} 过滤后的数据
 */
function searchAllFields(data, keyword, columns = null) {
  if (!keyword || !Array.isArray(data)) return data;
  
  const normalizedKeyword = keyword.toLowerCase().replace(/-/g, '');
  
  return data.filter(item => {
    let searchableText = '';
    
    // 如果提供了 columns，使用 render 函数获取显示文本
    if (columns && Array.isArray(columns)) {
      const renderedValues = columns
        .map(col => {
          const value = item[col.key];
          // 如果有 render 函数，使用它来获取显示文本
          if (col.render && typeof col.render === 'function') {
            const rendered = col.render(value, item);
            return extractTextFromReactNode(rendered);
          }
          // 没有 render 函数，直接使用原始值
          return value != null ? String(value) : '';
        })
        .filter(Boolean);
      
      searchableText = renderedValues.join(' ');
    } else {
      // 没有 columns，使用原始数据的所有字符串值
      const getAllStringValues = (obj) => {
        const values = [];
        
        for (const key in obj) {
          if (!obj.hasOwnProperty(key)) continue;
          
          const value = obj[key];
          
          if (value === null || value === undefined) continue;
          
          if (typeof value === 'string') {
            values.push(value);
          } else if (typeof value === 'number' || typeof value === 'boolean') {
            values.push(String(value));
          } else if (typeof value === 'object' && !Array.isArray(value)) {
            values.push(...getAllStringValues(value));
          }
        }
        
        return values;
      };
      
      searchableText = getAllStringValues(item).join(' ');
    }
    
    const normalizedText = searchableText.toLowerCase().replace(/-/g, '');
    return normalizedText.includes(normalizedKeyword);
  });
}

/**
 * 从 React 节点中提取文本内容（递归处理所有嵌套组件）
 * @param {*} node - React 节点
 * @returns {string} 提取的文本
 */
function extractTextFromReactNode(node) {
  // 基本类型直接返回
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  
  // null/undefined 返回空字符串
  if (node === null || node === undefined || typeof node === 'boolean') {
    return '';
  }
  
  // 数组：递归处理每个元素
  if (Array.isArray(node)) {
    return node.map(extractTextFromReactNode).join(' ');
  }
  
  // React 元素：提取 props.children
  if (typeof node === 'object') {
    // 处理 React 元素
    if (node.props) {
      const texts = [];
      
      // 提取 children
      if (node.props.children) {
        texts.push(extractTextFromReactNode(node.props.children));
      }
      
      // 提取常见的文本属性
      const textProps = ['title', 'alt', 'placeholder', 'label', 'value'];
      textProps.forEach(prop => {
        if (node.props[prop] && typeof node.props[prop] === 'string') {
          texts.push(node.props[prop]);
        }
      });
      
      return texts.filter(Boolean).join(' ');
    }
    
    // 处理普通对象（不应该出现，但以防万一）
    return '';
  }
  
  return '';
}

/**
 * SearchInput 组件
 * @param {Object} props
 * @param {Array} props.data - 要搜索的数据数组（可选，如果提供则自动过滤）
 * @param {Array} props.columns - 表格列定义（可选，用于根据 render 函数搜索显示文本）
 * @param {Function} props.onFilter - 过滤结果回调 (filteredData: Array) => void
 * @param {string} props.value - 搜索关键词值（受控模式）
 * @param {Function} props.onChange - 值变化回调函数 (value: string) => void
 * @param {string} props.placeholder - 占位符文本
 * @param {number} props.debounceMs - 防抖延迟时间（毫秒），默认 300ms
 * @param {string} props.className - 额外的 CSS 类名
 * @param {boolean} props.autoFocus - 是否自动聚焦
 */
export default function SearchInput({
  data = null,
  columns = null,
  onFilter = null,
  value = '',
  onChange = null,
  placeholder = '',
  debounceMs = 300,
  className = '',
  autoFocus = false,
  ...restProps
}) {
  const [inputValue, setInputValue] = useState(value);
  const [debouncedValue, setDebouncedValue] = useState(value);
  const isInitialMount = useRef(true);
  const prevFilteredDataRef = useRef(null);

  // 同步外部 value 变化
  useEffect(() => {
    setInputValue(value);
    setDebouncedValue(value);
  }, [value]);

  // 标记初始挂载完成
  useEffect(() => {
    isInitialMount.current = false;
  }, []);

  // 防抖处理
  useEffect(() => {
    if (isInitialMount.current) {
      return;
    }

    const timer = setTimeout(() => {
      // 自动去除两边空格
      setDebouncedValue(inputValue.trim());
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [inputValue, debounceMs]);

  // 当防抖值变化时，触发回调
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (isInitialMount.current) {
      return;
    }

    if (onChangeRef.current) {
      onChangeRef.current(debouncedValue);
    }
  }, [debouncedValue]);

  // 自动过滤数据并触发回调
  useEffect(() => {
    if (!data || !Array.isArray(data) || !onFilter) {
      return;
    }

    const filtered = searchAllFields(data, debouncedValue, columns);
    
    // 总是调用回调，让父组件决定是否需要更新
    // 使用 JSON.stringify 比较可能性能不好，但确保正确性
    const currentStr = JSON.stringify(filtered.map(item => item.id || item));
    const prevStr = prevFilteredDataRef.current ? JSON.stringify(prevFilteredDataRef.current.map(item => item.id || item)) : null;
    
    if (currentStr !== prevStr) {
      prevFilteredDataRef.current = filtered;
      onFilter(filtered);
    }
  }, [data, debouncedValue, columns, onFilter]);

  const handleChange = useCallback((e) => {
    setInputValue(e.target.value);
  }, []);

  return (
    <div className={cn('relative', className)}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <SearchIcon className="h-5 w-5 text-gray-400" />
      </div>
      <input
        type="text"
        className={cn(
          'block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5',
          'bg-white placeholder-gray-500',
          'focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500',
          'sm:text-sm'
        )}
        placeholder={placeholder}
        value={inputValue}
        onChange={handleChange}
        autoFocus={autoFocus}
        {...restProps}
      />
    </div>
  );
}

// 导出搜索函数供外部使用
export { searchAllFields };
