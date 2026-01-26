/**
 * Statistics Service - 统计报告服务
 *
 * 提供企业统计数据查询和导出功能
 *
 * 注意:
 * - apiService 自动将 camelCase 转换为 snake_case (请求参数)
 * - apiService 自动将 snake_case 转换为 camelCase (响应数据)
 * - 因此前端统一使用 camelCase 命名
 */

import apiService from "@shared/services/api.service";
import { STATISTICS_API, EXPORT_CONFIG, buildQueryParams } from "../enum";

class StatisticsService {
  /**
   * 查询企业统计数据
   *
   * @param {Object} params - 查询参数 (camelCase)
   * @param {number} [params.year] - 年度
   * @param {number} [params.quarter] - 季度 (1-4)
   * @param {number} [params.month] - 月份 (1-12)
   * @param {string[]} [params.majorIndustryCodes] - 标准产业大类 [A-U]
   * @param {string[]} [params.gangwonIndustryCodes] - 江原道主导产业 ['natural_bio', 'ceramic', 'digital_health']
   * @param {string[]} [params.policyTags] - 政策关联 ['STARTUP_UNIVERSITY', 'GLOBAL_GLOCAL', 'RISE']
   * @param {boolean} [params.hasInvestment] - 投资引进与否
   * @param {number} [params.minInvestment] - 投资金额最小值 (韩元)
   * @param {number} [params.maxInvestment] - 投资金额最大值 (韩元)
   * @param {number} [params.minPatents] - 专利数量最小值
   * @param {number} [params.maxPatents] - 专利数量最大值
   * @param {string} [params.gender] - 代表者性别 ('MALE'|'FEMALE')
   * @param {number} [params.minAge] - 代表者最小年龄
   * @param {number} [params.maxAge] - 代表者最大年龄
   * @param {string} [params.searchQuery] - 关键词搜索 (企业名或事业者编号)
   * @param {string} [params.sortBy] - 排序字段 (snake_case)
   * @param {string} [params.sortOrder] - 排序方向 ('asc'|'desc')
   * @param {number} [params.page] - 页码 (从 1 开始)
   * @param {number} [params.pageSize] - 每页数量
   *
   * @returns {Promise<Object>} 响应数据
   */
  async queryCompanies(params) {
    try {
      // 清理空值参数
      const cleanParams = buildQueryParams(params);

      // apiService 会自动将 camelCase 转换为 snake_case
      const response = await apiService.get(STATISTICS_API.REPORT, cleanParams);

      return response;
    } catch (error) {
      console.error("[StatisticsService] queryCompanies error:", error);
      console.error("[StatisticsService] Full error response:", JSON.stringify(error.response?.data, null, 2));
      throw error;
    }
  }

  /**
   * 导出企业统计数据为 Excel
   *
   * @param {Object} params - 查询参数 (与 queryCompanies 相同)
   * @param {string} [filename] - 自定义文件名 (不含扩展名)
   *
   * @returns {Promise<void>}
   *
   * @example
   * await statisticsService.exportToExcel({
   *   year: 2024,
   *   participatingPrograms: ['startup_university']
   * }, '创业中心大学企业统计_2024');
   */
  async exportToExcel(params, filename = null) {
    try {
      // 清理空值参数
      const cleanParams = buildQueryParams(params);

      // 生成文件名
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const defaultFilename = `${EXPORT_CONFIG.FILE_PREFIX}_${timestamp}${EXPORT_CONFIG.FILE_EXT}`;
      const downloadFilename = filename
        ? `${filename}${EXPORT_CONFIG.FILE_EXT}`
        : defaultFilename;

      // 使用 apiService 的 download 方法
      await apiService.download(
        STATISTICS_API.EXPORT,
        cleanParams,
        downloadFilename,
      );

      return { success: true, filename: downloadFilename };
    } catch (error) {
      console.error("[StatisticsService] exportToExcel error:", error);
      throw error;
    }
  }

  /**
   * 获取统计摘要信息
   * (可选功能，如需要总览统计)
   *
   * @param {Object} params - 筛选参数
   * @returns {Promise<Object>} 摘要数据
   * @returns {number} response.totalCompanies - 总企业数
   * @returns {number} response.totalInvestment - 总投资额
   * @returns {number} response.totalPatents - 总专利数
   * @returns {number} response.avgRevenue - 平均营收
   *
   * @example
   * const summary = await statisticsService.getSummary({ year: 2024 });
   */
  async getSummary(params) {
    try {
      const cleanParams = buildQueryParams(params);
      const response = await apiService.get(
        `${STATISTICS_API.COMPANIES}/summary`,
        cleanParams,
      );
      return response;
    } catch (error) {
      console.error("[StatisticsService] getSummary error:", error);
      throw error;
    }
  }

  /**
   * 批量导出（支持分页导出大量数据）
   *
   * @param {Object} params - 查询参数
   * @param {Function} onProgress - 进度回调 (current, total) => void
   * @returns {Promise<Blob>} Excel 文件 Blob
   *
   * @example
   * const blob = await statisticsService.exportBatch(
   *   { year: 2024 },
   *   (current, total) => console.log(`${current}/${total}`)
   * );
   */
  async exportBatch(params, onProgress = null) {
    try {
      // 先查询总数
      const firstPage = await this.queryCompanies({
        ...params,
        page: 1,
        limit: 1,
      });
      const total = firstPage.total;

      if (onProgress) {
        onProgress(0, total);
      }

      // 如果数据量不大，直接导出
      if (total <= 1000) {
        const cleanParams = buildQueryParams(params);
        const response = await apiService.get(
          STATISTICS_API.EXPORT,
          cleanParams,
          {
            responseType: "blob",
          },
        );
        if (onProgress) {
          onProgress(total, total);
        }
        return response.data;
      }

      // 数据量大时，分批导出（前端合并）
      // 注意：这需要后端支持分页导出，或者前端处理多次请求
      console.warn(
        "[StatisticsService] Large dataset export requires backend batch support",
      );
      throw new Error("Large dataset export not yet implemented");
    } catch (error) {
      console.error("[StatisticsService] exportBatch error:", error);
      throw error;
    }
  }

  /**
   * 验证查询参数
   *
   * @param {Object} params - 查询参数
   * @returns {Object} 验证结果
   * @returns {boolean} result.valid - 是否有效
   * @returns {string[]} result.errors - 错误信息列表 (i18n keys)
   *
   * @example
   * const { valid, errors } = statisticsService.validateParams(params);
   * if (!valid) {
   *   errors.forEach(key => console.log(t(key)));
   * }
   */
  /**
   * 验证查询参数
   */
  validateParams(params) {
    const errors = [];

    // 验证年份
    if (params.year) {
      const currentYear = new Date().getFullYear();
      if (params.year < 2000 || params.year > currentYear + 10) {
        errors.push("statistics.validation.invalidYear");
      }
    }

    // 验证季度
    if (params.quarter !== null && params.quarter !== undefined) {
      if (params.quarter < 1 || params.quarter > 4) {
        errors.push("statistics.validation.invalidQuarter");
      }
    }

    // 验证月份
    if (params.month !== null && params.month !== undefined) {
      if (params.month < 1 || params.month > 12) {
        errors.push("statistics.validation.invalidMonth");
      }
    }

    // 验证投资金额范围
    if (params.minInvestment !== null && params.minInvestment < 0) {
      errors.push("statistics.validation.negativeValue");
    }
    if (params.maxInvestment !== null && params.maxInvestment < 0) {
      errors.push("statistics.validation.negativeValue");
    }
    if (
      params.minInvestment !== null &&
      params.maxInvestment !== null &&
      params.minInvestment > params.maxInvestment
    ) {
      errors.push("statistics.validation.minGreaterThanMax");
    }

    // 验证专利数量范围
    if (params.minPatents !== null && params.minPatents < 0) {
      errors.push("statistics.validation.negativeValue");
    }
    if (params.maxPatents !== null && params.maxPatents < 0) {
      errors.push("statistics.validation.negativeValue");
    }
    if (
      params.minPatents !== null &&
      params.maxPatents !== null &&
      params.minPatents > params.maxPatents
    ) {
      errors.push("statistics.validation.minGreaterThanMax");
    }

    // 验证量化指标范围 (营收/雇佣)
    const ranges = [
      { min: params.minRevenue, max: params.maxRevenue },
      { min: params.minEmployees, max: params.maxEmployees },
      { min: params.minAge, max: params.maxAge },
    ];

    ranges.forEach((range) => {
      if (range.min !== null && range.min < 0) {
        errors.push("statistics.validation.negativeValue");
      }
      if (range.max !== null && range.max < 0) {
        errors.push("statistics.validation.negativeValue");
      }
      if (range.min !== null && range.max !== null && range.min > range.max) {
        if (!errors.includes("statistics.validation.minGreaterThanMax")) {
          errors.push("statistics.validation.minGreaterThanMax");
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// 导出单例
export default new StatisticsService();
