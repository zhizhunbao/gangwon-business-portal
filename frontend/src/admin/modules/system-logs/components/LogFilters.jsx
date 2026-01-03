/**
 * LogFilters Component
 * 日志筛选栏通用组件 - 搜索、筛选、复制按钮
 * 
 * 所有日志查看器共享此组件
 */

import { Select } from '../adapter';
import { SearchInput, Button } from '@shared/components';

/**
 * @param {Object} props
 * @param {string} props.searchKeyword - 搜索关键词
 * @param {Function} props.onSearchChange - 搜索变更回调
 * @param {string} props.searchPlaceholder - 搜索框占位符
 * @param {Array} props.filterConfigs - 筛选配置数组 [{ key, value, options, className }]
 * @param {Function} props.onFilterChange - 筛选变更回调 (key, value) => void
 * @param {boolean} props.copySuccess - 复制成功状态
 * @param {Function} props.onCopyLatest - 复制最新日志回调
 * @param {boolean} props.copyDisabled - 复制按钮禁用状态
 * @param {Object} props.tl - 翻译函数
 * @param {React.ReactNode} props.extraButtons - 额外按钮（可选）
 */
export function LogFilters({
  searchKeyword,
  onSearchChange,
  searchPlaceholder,
  filterConfigs = [],
  onFilterChange,
  copySuccess,
  onCopyLatest,
  copyDisabled,
  tl,
  extraButtons,
}) {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-4">
        {/* 搜索框 */}
        <div className="flex-1 min-w-[200px] max-w-md">
          <SearchInput
            value={searchKeyword}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
          />
        </div>

        {/* 筛选下拉框 */}
        {filterConfigs.map(({ key, value, options, className = 'w-32' }) => (
          <Select
            key={key}
            value={value}
            onChange={(e) => onFilterChange(key, e.target.value)}
            options={options}
            className={className}
          />
        ))}

        {/* 复制按钮 */}
        <Button
          variant="secondary"
          size="sm"
          onClick={onCopyLatest}
          disabled={copyDisabled}
        >
          {copySuccess ? `✓ ${tl('actions.copied')}` : tl('actions.copyLatest5')}
        </Button>

        {/* 额外按钮 */}
        {extraButtons}
      </div>
    </div>
  );
}

export default LogFilters;
