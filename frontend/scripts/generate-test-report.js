#!/usr/bin/env node
/**
 * Generate Test Report from Playwright JSON Results
 * 从 Playwright JSON 结果生成测试报告文档
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resultsPath = path.join(__dirname, '../test-results/results.json');
const reportPath = path.join(__dirname, '../test-results/test-report-detailed.md');

function generateReport() {
  if (!fs.existsSync(resultsPath)) {
    console.error('Test results file not found. Please run tests first.');
    process.exit(1);
  }

  const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
  
  // Calculate stats from suites
  let total = 0;
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let duration = 0;
  
  function countStats(suites) {
    suites.forEach(suite => {
      if (suite.specs) {
        suite.specs.forEach(spec => {
          if (spec.tests) {
            spec.tests.forEach(test => {
              total++;
              const result = test.results[0];
              if (result) {
                duration += result.duration || 0;
                if (result.status === 'passed') passed++;
                else if (result.status === 'failed' || result.status === 'timedOut') failed++;
                else if (result.status === 'skipped') skipped++;
              }
            });
          }
        });
      }
      if (suite.suites) {
        countStats(suite.suites);
      }
    });
  }
  
  if (results.suites) {
    countStats(results.suites);
  }
  
  const report = {
    summary: {
      total: total || (results.stats?.total || 0),
      passed: passed || (results.stats?.expected || 0),
      failed: failed || (results.stats?.unexpected || 0),
      skipped: skipped || (results.stats?.skipped || 0),
      duration: duration || (results.stats?.duration || 0),
    },
    suites: groupBySuite(results.suites || []),
  };

  const markdown = generateMarkdown(report);
  fs.writeFileSync(reportPath, markdown, 'utf-8');
  
  console.log(`\n✅ Test report generated: ${reportPath}`);
  console.log(`\nSummary:`);
  console.log(`  Total: ${report.summary.total}`);
  console.log(`  Passed: ${report.summary.passed}`);
  console.log(`  Failed: ${report.summary.failed}`);
  console.log(`  Skipped: ${report.summary.skipped}`);
  console.log(`  Duration: ${(report.summary.duration / 1000).toFixed(2)}s`);
}

function groupBySuite(suites) {
  const grouped = {};
  
  function processSuite(suite, parentPath = '') {
    const currentPath = parentPath ? `${parentPath} > ${suite.title}` : suite.title;
    
    if (suite.specs && suite.specs.length > 0) {
      if (!grouped[currentPath]) {
        grouped[currentPath] = [];
      }
      
      suite.specs.forEach(spec => {
        spec.tests.forEach(test => {
          grouped[currentPath].push({
            title: spec.title,
            status: test.results[0]?.status || 'unknown',
            duration: test.results[0]?.duration || 0,
            error: test.results[0]?.error?.message || null,
            file: spec.file,
          });
        });
      });
    }
    
    if (suite.suites) {
      suite.suites.forEach(subSuite => {
        processSuite(subSuite, currentPath);
      });
    }
  }
  
  suites.forEach(suite => {
    processSuite(suite);
  });
  
  return grouped;
}

// Remove ANSI color codes
function stripAnsi(str) {
  if (!str) return '';
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function generateMarkdown(report) {
  const { summary, suites } = report;
  const passRate = summary.total > 0 
    ? ((summary.passed / summary.total) * 100).toFixed(2) 
    : '0.00';
  
  let md = `# E2E Test Report\n\n`;
  md += `**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
  
  md += `## 📊 测试摘要\n\n`;
  md += `| 指标 | 数量 | 百分比 |\n`;
  md += `|------|------|--------|\n`;
  md += `| 总测试数 | ${summary.total} | 100% |\n`;
  md += `| ✅ 通过 | ${summary.passed} | ${summary.total > 0 ? ((summary.passed / summary.total) * 100).toFixed(1) : 0}% |\n`;
  md += `| ❌ 失败 | ${summary.failed} | ${summary.total > 0 ? ((summary.failed / summary.total) * 100).toFixed(1) : 0}% |\n`;
  md += `| ⏭️ 跳过 | ${summary.skipped} | ${summary.total > 0 ? ((summary.skipped / summary.total) * 100).toFixed(1) : 0}% |\n`;
  md += `| 📈 通过率 | **${passRate}%** | - |\n`;
  md += `| ⏱️ 总耗时 | ${(summary.duration / 1000).toFixed(2)}s | - |\n\n`;
  
  // Status badge
  if (summary.failed === 0) {
    md += `![Status](https://img.shields.io/badge/Status-Passing-brightgreen)\n\n`;
  } else {
    md += `![Status](https://img.shields.io/badge/Status-Failing-red)\n\n`;
  }
  
  md += `## 测试结果详情\n\n`;
  
  Object.entries(suites).forEach(([suiteName, tests]) => {
    md += `### ${suiteName}\n\n`;
    
    const passed = tests.filter(t => t.status === 'passed').length;
    const failed = tests.filter(t => t.status === 'failed').length;
    const skipped = tests.filter(t => t.status === 'skipped').length;
    
    md += `**统计**: ${passed} 通过, ${failed} 失败, ${skipped} 跳过\n\n`;
    
    md += `| 测试用例 | 状态 | 耗时 | 错误信息 |\n`;
    md += `|---------|------|------|----------|\n`;
    
    tests.forEach(test => {
      const statusIcon = test.status === 'passed' ? '✅' : 
                        test.status === 'failed' ? '❌' : 
                        test.status === 'skipped' ? '⏭️' : 
                        test.status === 'timedOut' ? '⏱️' : '❓';
      const duration = `${(test.duration / 1000).toFixed(2)}s`;
      const error = test.error ? stripAnsi(test.error).substring(0, 150).replace(/\n/g, ' ') : '-';
      
      md += `| ${test.title} | ${statusIcon} ${test.status} | ${duration} | ${error} |\n`;
    });
    
    md += `\n`;
  });
  
  // 失败和超时测试详情
  const failedTests = [];
  Object.values(suites).flat().forEach(test => {
    if (test.status === 'failed' || test.status === 'timedOut') {
      failedTests.push(test);
    }
  });
  
  if (failedTests.length > 0) {
    md += `## ❌ 失败测试详情\n\n`;
    md += `共 ${failedTests.length} 个测试失败或超时。\n\n`;
    
    failedTests.forEach((test, index) => {
      const statusLabel = test.status === 'timedOut' ? '⏱️ 超时' : '❌ 失败';
      md += `### ${index + 1}. ${test.title}\n\n`;
      md += `**状态**: ${statusLabel} (${test.status})\n\n`;
      md += `**文件**: \`${path.basename(test.file)}\`\n\n`;
      md += `**耗时**: ${(test.duration / 1000).toFixed(2)}s\n\n`;
      if (test.error) {
        md += `**错误信息**:\n\n`;
        md += `\`\`\`\n${stripAnsi(test.error)}\n\`\`\`\n\n`;
      }
      md += `---\n\n`;
    });
  }
  
  // Add footer
  md += `---\n\n`;
  md += `*报告由 Playwright E2E 测试自动生成*\n`;
  md += `*查看详细 HTML 报告: \`npm run test:e2e:report\`*\n`;
  
  return md;
}

generateReport();

