/**
 * LogTable Component
 * 日志表格通用组件 - 表头、加载状态、空状态、分页
 * 
 * 所有日志查看器共享此组件
 */

import { Loading } from '../adapter';
import { Pagination } from '@shared/components';

/**
 * @param {Object} props
 * @param {Array} props.logs - 当前页日志数据
 * @param {boolean} props.loading - 加载状态
 * @param {number} props.totalCount - 总数
 * @param {number} props.currentPage - 当前页
 * @param {number} props.pageSize - 每页条数
 * @param {Function} props.onPageChange - 页码变更回调
 * @param {string} props.emptyTitle - 空状态标题
 * @param {string} props.emptySubtitle - 空状态副标题
 * @param {Function} props.renderRow - 渲染行的函数 (log, index) => ReactNode
 * @param {Object} props.tl - 翻译函数
 * @param {Object} props.t - 通用翻译函数
 */
export function LogTable({
  logs,
  loading,
  totalCount,
  currentPage,
  pageSize,
  onPageChange,
  emptyTitle,
  emptySubtitle,
  renderRow,
  tl,
  t,
}) {
  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200">
      {/* 表头 - 统一12列布局 */}
      <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase">
        <div className="col-span-2">{tl('table.timestamp')}</div>
        <div className="col-span-1">{tl('table.level')}</div>
        <div className="col-span-1">{tl('table.source')}</div>
        <div className="col-span-1">{tl('table.layer')}</div>
        <div className="col-span-2">{tl('table.module')}</div>
        <div className="col-span-1">{tl('table.filename')}</div>
        <div className="col-span-3">{tl('table.message')}</div>
        <div className="col-span-1 text-center">{t('common.actions', '操作')}</div>
      </div>

      {/* 内容区 */}
      {loading ? (
        <div className="p-12 text-center"><Loading /></div>
      ) : logs.length === 0 ? (
        <div className="p-12 text-center text-gray-500">
          <p className="text-lg mb-2">{emptyTitle}</p>
          <p className="text-sm text-gray-400">{emptySubtitle}</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {logs.map((log, index) => renderRow(log, index))}
        </div>
      )}

      {/* 分页 */}
      {totalCount > pageSize && (
        <div className="px-6 py-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm text-gray-700">
            显示 {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalCount)} 共 {totalCount} 条
          </div>
          <Pagination
            current={currentPage}
            total={totalCount}
            pageSize={pageSize}
            onChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
}

export default LogTable;
