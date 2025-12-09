#!/usr/bin/env python
"""
日志调用链完整性检查脚本

功能：
1. 分析日志文件，检查每个 HTTP 请求的日志调用链是否完整
2. 生成详细的 MD 报告，列出所有不完整的调用链
3. 支持按模块、按端点、按 trace_id 进行分析

使用方法：
    # 直接运行，分析最近 1000 条日志
    python check_log_chain_completeness.py
    
    # 分析指定时间范围的日志
    python check_log_chain_completeness.py --start-time "2025-12-01T00:00:00" --end-time "2025-12-02T23:59:59"
    
    # 分析指定的 trace_id 列表
    python check_log_chain_completeness.py --trace-ids "abc123,def456"
"""

import json
import argparse
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Set, Tuple


# 日志文件路径
LOGS_DIR = Path(__file__).parent.parent / "logs"
APPLICATION_LOGS_FILE = LOGS_DIR / "app_logs.log"
EXCEPTIONS_LOG_FILE = LOGS_DIR / "application_exceptions.log"


def parse_log_line(line: str) -> Optional[dict]:
    """解析单行 JSON 日志"""
    try:
        return json.loads(line.strip())
    except json.JSONDecodeError:
        return None


def read_logs(log_file: Path, limit: Optional[int] = None) -> List[dict]:
    """读取日志文件"""
    logs = []
    if not log_file.exists():
        print(f"警告: 日志文件不存在: {log_file}")
        return logs
    
    with open(log_file, "r", encoding="utf-8") as f:
        lines = f.readlines()
        if limit:
            lines = lines[-limit:]
        
        for line in lines:
            log_entry = parse_log_line(line)
            if log_entry:
                logs.append(log_entry)
    
    return logs


def is_http_middleware_log(log: dict) -> bool:
    """检查是否是 HTTP 中间件日志"""
    return (
        log.get("module") == "src.main" and
        log.get("function") == "log_http_requests"
    )


def is_business_log(log: dict) -> bool:
    """检查是否是业务日志（路由层日志）"""
    # 业务日志通常由 @auto_log 装饰器记录
    # 特征：module 包含 "router" 或 "modules"，且不是 HTTP 中间件日志
    module = log.get("module", "")
    return (
        "router" in module or "modules" in module
    ) and not is_http_middleware_log(log)


def is_sql_log(log: dict) -> bool:
    """检查是否是 SQL 日志"""
    return (
        log.get("module") == "db.session" and
        log.get("function") in ["before_cursor_execute", "after_cursor_execute"]
    )


def is_exception_log(log: dict) -> bool:
    """检查是否是异常日志"""
    return (
        log.get("module") == "exception.handlers" or
        "exception" in log.get("module", "").lower()
    )


def extract_endpoint_from_path(path: str) -> str:
    """从请求路径提取端点标识"""
    # 移除路径参数，例如 /api/members/{id} -> /api/members/{id}
    # 简化处理：保留原始路径
    return path


def group_logs_by_trace_id(logs: List[dict]) -> Dict[str, List[dict]]:
    """按 trace_id 分组日志"""
    grouped = defaultdict(list)
    for log in logs:
        trace_id = log.get("trace_id")
        if trace_id:
            grouped[trace_id].append(log)
    return dict(grouped)


def analyze_log_chain(trace_id: str, logs: List[dict]) -> Dict:
    """分析单个 trace_id 的日志调用链"""
    # 按时间排序
    logs = sorted(logs, key=lambda x: x.get("timestamp", ""))
    
    # 查找 HTTP 中间件日志
    http_logs = [log for log in logs if is_http_middleware_log(log)]
    http_log = http_logs[0] if http_logs else None
    
    # 查找业务日志
    business_logs = [log for log in logs if is_business_log(log)]
    
    # 查找 SQL 日志
    sql_logs = [log for log in logs if is_sql_log(log)]
    
    # 查找异常日志
    exception_logs = [log for log in logs if is_exception_log(log)]
    
    # 提取请求信息
    request_path = None
    request_method = None
    status_code = None
    timestamp = None
    
    if http_log:
        request_path = http_log.get("request_path") or http_log.get("message", "").split()[1] if " " in http_log.get("message", "") else None
        request_method = http_log.get("request_method") or http_log.get("message", "").split()[0] if " " in http_log.get("message", "") else None
        status_code = http_log.get("status_code")
        timestamp = http_log.get("timestamp")
    
    # 如果没有 HTTP 日志，尝试从业务日志中提取
    if not request_path and business_logs:
        first_business_log = business_logs[0]
        request_path = first_business_log.get("request_path")
        request_method = first_business_log.get("request_method")
        timestamp = first_business_log.get("timestamp")
    
    # 判断调用链是否完整
    has_http_log = http_log is not None
    has_business_log = len(business_logs) > 0
    has_sql_log = len(sql_logs) > 0
    has_exception = len(exception_logs) > 0
    
    # 判断是否完整
    # 完整链应该包含：HTTP 中间件日志 + 业务日志（对于有业务逻辑的端点）
    # SQL 日志是可选的（只有数据库操作才有）
    is_complete = has_http_log and (has_business_log or request_path in ["/healthz", "/readyz", "/docs", "/openapi.json"])
    
    # 提取模块信息
    module = None
    if request_path:
        # 从路径提取模块：/api/members -> member
        parts = request_path.split("/")
        if len(parts) >= 3 and parts[1] == "api":
            module = parts[2].split("-")[0]  # member, admin, etc.
    
    return {
        "trace_id": trace_id,
        "request_path": request_path,
        "request_method": request_method,
        "status_code": status_code,
        "timestamp": timestamp,
        "module": module,
        "has_http_log": has_http_log,
        "has_business_log": has_business_log,
        "has_sql_log": has_sql_log,
        "has_exception": has_exception,
        "is_complete": is_complete,
        "http_log_count": len(http_logs),
        "business_log_count": len(business_logs),
        "sql_log_count": len(sql_logs),
        "exception_log_count": len(exception_logs),
        "missing_components": _get_missing_components(has_http_log, has_business_log, has_sql_log, request_path),
    }


def _get_missing_components(has_http: bool, has_business: bool, has_sql: bool, path: Optional[str]) -> List[str]:
    """获取缺失的组件列表"""
    missing = []
    if not has_http:
        missing.append("HTTP中间件日志")
    if not has_business and path and path not in ["/healthz", "/readyz", "/docs", "/openapi.json"]:
        missing.append("业务日志")
    # SQL 日志是可选的，不标记为缺失
    return missing


def generate_report(analysis_results: List[Dict], output_file: Optional[Path] = None) -> str:
    """生成 MD 格式报告"""
    total_requests = len(analysis_results)
    complete_chains = sum(1 for r in analysis_results if r["is_complete"])
    incomplete_chains = total_requests - complete_chains
    completeness_rate = (complete_chains / total_requests * 100) if total_requests > 0 else 0
    
    # 按模块统计
    module_stats = defaultdict(lambda: {"total": 0, "complete": 0, "incomplete": 0})
    for result in analysis_results:
        module = result.get("module") or "unknown"
        module_stats[module]["total"] += 1
        if result["is_complete"]:
            module_stats[module]["complete"] += 1
        else:
            module_stats[module]["incomplete"] += 1
    
    # 缺失日志类型统计
    missing_http_count = sum(1 for r in analysis_results if not r["has_http_log"])
    missing_business_count = sum(1 for r in analysis_results if not r["has_business_log"] and r["request_path"] not in ["/healthz", "/readyz", "/docs", "/openapi.json"])
    
    # 生成报告
    report_lines = [
        "# 日志调用链完整性检查报告",
        "",
        f"**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "",
        "## 一、执行摘要",
        "",
        f"- **总请求数**: {total_requests}",
        f"- **完整调用链数量**: {complete_chains}",
        f"- **不完整调用链数量**: {incomplete_chains}",
        f"- **完整率**: {completeness_rate:.2f}%",
        "",
        "## 二、按模块统计",
        "",
        "| 模块 | 总请求数 | 完整数 | 不完整数 | 完整率 |",
        "|------|---------|--------|---------|--------|",
    ]
    
    for module, stats in sorted(module_stats.items()):
        rate = (stats["complete"] / stats["total"] * 100) if stats["total"] > 0 else 0
        report_lines.append(
            f"| {module} | {stats['total']} | {stats['complete']} | {stats['incomplete']} | {rate:.2f}% |"
        )
    
    report_lines.extend([
        "",
        "## 三、缺失日志类型统计",
        "",
        f"- **缺少 HTTP 中间件日志的请求数**: {missing_http_count}",
        f"- **缺少业务日志的请求数**: {missing_business_count}",
        "",
        "## 四、不完整的调用链详情",
        "",
    ])
    
    # 按模块分组不完整的调用链
    incomplete_by_module = defaultdict(list)
    for result in analysis_results:
        if not result["is_complete"]:
            module = result.get("module") or "unknown"
            incomplete_by_module[module].append(result)
    
    for module, results in sorted(incomplete_by_module.items()):
        report_lines.extend([
            f"### {module} 模块",
            "",
            "| trace_id | 请求路径 | 方法 | 状态码 | 时间戳 | 缺失组件 |",
            "|----------|---------|------|--------|--------|----------|",
        ])
        
        for result in sorted(results, key=lambda x: x.get("timestamp", "")):
            missing = ", ".join(result["missing_components"]) if result["missing_components"] else "无"
            path = result.get("request_path") or "N/A"
            method = result.get("request_method") or "N/A"
            status = result.get("status_code") or "N/A"
            timestamp = result.get("timestamp") or "N/A"
            trace_id = result.get("trace_id", "N/A")
            
            report_lines.append(
                f"| {trace_id[:8]}... | {path} | {method} | {status} | {timestamp} | {missing} |"
            )
        
        report_lines.append("")
    
    # 建议修复清单
    report_lines.extend([
        "## 五、建议修复清单",
        "",
        "### 需要添加 HTTP 中间件日志的端点",
        "",
    ])
    
    # 找出所有缺少 HTTP 日志的端点
    missing_http_endpoints = set()
    for result in analysis_results:
        if not result["has_http_log"] and result.get("request_path"):
            missing_http_endpoints.add(result["request_path"])
    
    if missing_http_endpoints:
        for endpoint in sorted(missing_http_endpoints):
            report_lines.append(f"- `{endpoint}`")
    else:
        report_lines.append("无")
    
    report_lines.extend([
        "",
        "### 需要添加业务日志的端点",
        "",
    ])
    
    # 找出所有缺少业务日志的端点
    missing_business_endpoints = set()
    for result in analysis_results:
        if not result["has_business_log"] and result.get("request_path") and result["request_path"] not in ["/healthz", "/readyz", "/docs", "/openapi.json"]:
            missing_business_endpoints.add((result.get("request_path"), result.get("request_method")))
    
    if missing_business_endpoints:
        for endpoint, method in sorted(missing_business_endpoints):
            report_lines.append(f"- `{method} {endpoint}`")
    else:
        report_lines.append("无")
    
    report_lines.append("")
    
    report_content = "\n".join(report_lines)
    
    # 写入文件
    if output_file:
        output_file.parent.mkdir(parents=True, exist_ok=True)
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(report_content)
        print(f"报告已保存到: {output_file}")
    
    return report_content


def main():
    """主函数"""
    parser = argparse.ArgumentParser(description="日志调用链完整性检查脚本")
    parser.add_argument(
        "--log-file",
        type=str,
        default=str(APPLICATION_LOGS_FILE),
        help="日志文件路径（默认: backend/logs/app_logs.log）",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="限制分析的日志条数（默认: 全部）",
    )
    parser.add_argument(
        "--trace-ids",
        type=str,
        default=None,
        help="指定要分析的 trace_id 列表（逗号分隔）",
    )
    parser.add_argument(
        "--start-time",
        type=str,
        default=None,
        help="开始时间（ISO 格式，例如: 2025-12-01T00:00:00）",
    )
    parser.add_argument(
        "--end-time",
        type=str,
        default=None,
        help="结束时间（ISO 格式，例如: 2025-12-02T23:59:59）",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="输出报告文件路径（默认: backend/logs/log_chain_completeness_report.md）",
    )
    
    args = parser.parse_args()
    
    # 读取日志
    print(f"正在读取日志文件: {args.log_file}")
    logs = read_logs(Path(args.log_file), limit=args.limit)
    print(f"读取到 {len(logs)} 条日志")
    
    # 时间过滤
    if args.start_time or args.end_time:
        start_time = datetime.fromisoformat(args.start_time) if args.start_time else None
        end_time = datetime.fromisoformat(args.end_time) if args.end_time else None
        
        filtered_logs = []
        for log in logs:
            timestamp_str = log.get("timestamp")
            if timestamp_str:
                try:
                    log_time = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
                    if start_time and log_time < start_time:
                        continue
                    if end_time and log_time > end_time:
                        continue
                    filtered_logs.append(log)
                except (ValueError, AttributeError):
                    pass
        
        logs = filtered_logs
        print(f"时间过滤后剩余 {len(logs)} 条日志")
    
    # trace_id 过滤
    if args.trace_ids:
        trace_id_set = set(t.strip() for t in args.trace_ids.split(","))
        logs = [log for log in logs if log.get("trace_id") in trace_id_set]
        print(f"trace_id 过滤后剩余 {len(logs)} 条日志")
    
    # 按 trace_id 分组
    print("正在按 trace_id 分组...")
    grouped_logs = group_logs_by_trace_id(logs)
    print(f"找到 {len(grouped_logs)} 个唯一的 trace_id")
    
    # 分析每个调用链
    print("正在分析调用链...")
    analysis_results = []
    for trace_id, trace_logs in grouped_logs.items():
        result = analyze_log_chain(trace_id, trace_logs)
        analysis_results.append(result)
    
    # 生成报告
    output_file = Path(args.output) if args.output else LOGS_DIR / "log_chain_completeness_report.md"
    print(f"正在生成报告...")
    report = generate_report(analysis_results, output_file)
    
    # 打印摘要
    complete_count = sum(1 for r in analysis_results if r["is_complete"])
    total_count = len(analysis_results)
    print(f"\n分析完成！")
    print(f"总请求数: {total_count}")
    print(f"完整调用链: {complete_count}")
    print(f"不完整调用链: {total_count - complete_count}")
    print(f"完整率: {complete_count / total_count * 100:.2f}%" if total_count > 0 else "N/A")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())

