/**
 * SearchInput Component
 * 统一的搜索输入框组件 - 支持防抖、国际化、统一样式
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { SearchIcon } from './Icons';

/**
 * SearchInput 组件
 * @param {Object} props
 * @param {string} props.value - 搜索关键词值
 * @param {Function} props.onChange - 值变化回调函数 (value: string) => void
 * @param {string} props.placeholder - 占位符文本（支持国际化 key）
 * @param {number} props.debounceMs - 防抖延迟时间（毫秒），默认 500ms
 * @param {string} props.className - 额外的 CSS 类名
 * @param {boolean} props.autoFocus - 是否自动聚焦
 */
export default function SearchInput({
  value = '',
  onChange,
  placeholder = '',
  debounceMs = 500,
  className = '',
  autoFocus = false,
  ...restProps
}) {
  const [inputValue, setInputValue] = useState(value);
  const isInitialMount = useRef(true);
  const lastExternalValue = useRef(value);

  // 同步外部 value 变化（仅在外部 value 真正变化时更新，避免循环）
  useEffect(() => {
    // 如果外部 value 变化了，且不是初始挂载，说明是外部更新
    if (value !== lastExternalValue.current) {
      lastExternalValue.current = value;
      // 只有在不是初始挂载时才同步（初始挂载时 inputValue 已经是 value）
      if (!isInitialMount.current) {
        setInputValue(value);
      }
    }
  }, [value]);

  // 标记初始挂载完成
  useEffect(() => {
    isInitialMount.current = false;
  }, []);

  // 防抖处理 - 只在用户输入时防抖
  useEffect(() => {
    // 如果是初始挂载，不触发 onChange
    if (isInitialMount.current) {
      return;
    }

    // 如果输入值等于外部值，说明是外部更新，不需要防抖
    if (inputValue === lastExternalValue.current) {
      return;
    }

    // 用户输入时防抖
    const timer = setTimeout(() => {
      onChange?.(inputValue);
      lastExternalValue.current = inputValue;
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [inputValue, debounceMs, onChange]);

  const handleChange = useCallback((e) => {
    setInputValue(e.target.value);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <SearchIcon className="h-5 w-5 text-gray-400" />
      </div>
      <input
        type="text"
        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
        placeholder={placeholder}
        value={inputValue}
        onChange={handleChange}
        autoFocus={autoFocus}
        {...restProps}
      />
    </div>
  );
}

