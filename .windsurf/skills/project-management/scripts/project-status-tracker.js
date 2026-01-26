#!/usr/bin/env node

/**
 * Project Status Tracker
 * 
 * 自动跟踪项目状态，生成进度报告和风险预警
 * @author Project Management Team
 * @created 2025-01-25
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ProjectStatusTracker {
  constructor(projectPath = process.cwd()) {
    this.projectPath = projectPath;
    this.statusData = {
      timestamp: new Date().toISOString(),
      git: {},
      frontend: {},
      backend: {},
      tests: {},
      risks: [],
      metrics: {}
    };
  }

  async collectGitStatus() {
    console.log('🔍 收集 Git 状态信息...');
    
    try {
      // 获取当前分支
      const branch = execSync('git branch --show-current', { 
        encoding: 'utf8', 
        cwd: this.projectPath 
      }).trim();

      // 获取最新提交信息
      const lastCommit = execSync('git log -1 --pretty=format:"%h|%s|%an|%ad" --date=iso', { 
        encoding: 'utf8', 
        cwd: this.projectPath 
      }).trim();

      const [commitHash, commitMessage, author, date] = lastCommit.split('|');

      // 获取未提交的更改
      const status = execSync('git status --porcelain', { 
        encoding: 'utf8', 
        cwd: this.projectPath 
      });

      const changes = status.split('\n').filter(line => line.trim()).length;

      this.statusData.git = {
        branch,
        lastCommit: {
          hash: commitHash,
          message: commitMessage,
          author,
          date
        },
        uncommittedChanges: changes,
        status: changes > 0 ? 'dirty' : 'clean'
      };

    } catch (error) {
      console.warn('⚠️  无法获取 Git 状态:', error.message);
      this.statusData.git = { error: error.message };
    }
  }

  async collectFrontendStatus() {
    console.log('🎨 收集前端状态信息...');
    
    const frontendPath = path.join(this.projectPath, 'frontend');
    
    if (!fs.existsSync(frontendPath)) {
      this.statusData.frontend = { error: 'Frontend directory not found' };
      return;
    }

    try {
      // 检查 package.json
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(frontendPath, 'package.json'), 'utf8')
      );

      // 检查依赖状态
      const nodeModulesExists = fs.existsSync(path.join(frontendPath, 'node_modules'));

      // 统计组件文件
      const componentCount = this.countFiles(frontendPath, ['.jsx', '.tsx'], 'src/components');
      const featureCount = this.countFiles(frontendPath, ['.jsx', '.tsx'], 'src/features');
      const testCount = this.countFiles(frontendPath, ['.test.js', '.test.jsx', '.spec.js', '.spec.jsx'], 'src');

      // 检查构建状态
      let buildStatus = 'unknown';
      try {
        execSync('npm run build', { cwd: frontendPath, stdio: 'pipe' });
        buildStatus = 'success';
      } catch (error) {
        buildStatus = 'failed';
      }

      this.statusData.frontend = {
        version: packageJson.version,
        dependencies: Object.keys(packageJson.dependencies || {}).length,
        devDependencies: Object.keys(packageJson.devDependencies || {}).length,
        nodeModulesInstalled: nodeModulesExists,
        componentCount,
        featureCount,
        testCount,
        buildStatus,
        lastChecked: new Date().toISOString()
      };

    } catch (error) {
      console.warn('⚠️  前端状态收集失败:', error.message);
      this.statusData.frontend = { error: error.message };
    }
  }

  async collectBackendStatus() {
    console.log('⚙️  收集后端状态信息...');
    
    const backendPath = path.join(this.projectPath, 'backend');
    
    if (!fs.existsSync(backendPath)) {
      this.statusData.backend = { error: 'Backend directory not found' };
      return;
    }

    try {
      // 检查 requirements.txt
      const requirementsPath = path.join(backendPath, 'requirements.txt');
      let requirements = [];
      if (fs.existsSync(requirementsPath)) {
        const content = fs.readFileSync(requirementsPath, 'utf8');
        requirements = content.split('\n')
          .filter(line => line.trim() && !line.startsWith('#'))
          .map(line => line.split('==')[0]);
      }

      // 检查虚拟环境
      const venvExists = fs.existsSync(path.join(backendPath, '.venv'));

      // 统计 Python 文件
      const pyFileCount = this.countFiles(backendPath, ['.py'], 'src');
      const testFileCount = this.countFiles(backendPath, ['test_*.py', '*_test.py'], 'tests');

      // 检查数据库迁移
      const migrationCount = this.countFiles(backendPath, ['.py'], 'alembic/versions');

      this.statusData.backend = {
        pythonVersion: this.getPythonVersion(backendPath),
        dependencies: requirements.length,
        virtualEnvironment: venvExists,
        pyFileCount,
        testFileCount,
        migrationCount,
        lastChecked: new Date().toISOString()
      };

    } catch (error) {
      console.warn('⚠️  后端状态收集失败:', error.message);
      this.statusData.backend = { error: error.message };
    }
  }

  async collectTestStatus() {
    console.log('🧪 收集测试状态信息...');
    
    try {
      // 前端测试
      const frontendTestResults = await this.runFrontendTests();
      
      // 后端测试
      const backendTestResults = await this.runBackendTests();

      this.statusData.tests = {
        frontend: frontendTestResults,
        backend: backendTestResults,
        lastChecked: new Date().toISOString()
      };

    } catch (error) {
      console.warn('⚠️  测试状态收集失败:', error.message);
      this.statusData.tests = { error: error.message };
    }
  }

  async runFrontendTests() {
    const frontendPath = path.join(this.projectPath, 'frontend');
    
    if (!fs.existsSync(frontendPath)) {
      return { error: 'Frontend directory not found' };
    }

    try {
      // 运行测试并获取覆盖率
      const testOutput = execSync('npm run test:coverage', { 
        cwd: frontendPath, 
        encoding: 'utf8',
        stdio: 'pipe'
      });

      // 解析覆盖率信息（这里简化处理）
      const coverageMatch = testOutput.match(/All files\s+\|\s+(\d+\.\d+)/);
      const coverage = coverageMatch ? parseFloat(coverageMatch[1]) : 0;

      return {
        status: 'success',
        coverage,
        lastRun: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'failed',
        error: error.message,
        lastRun: new Date().toISOString()
      };
    }
  }

  async runBackendTests() {
    const backendPath = path.join(this.projectPath, 'backend');
    
    if (!fs.existsSync(backendPath)) {
      return { error: 'Backend directory not found' };
    }

    try {
      // 运行后端测试
      const testOutput = execSync('python -m pytest --cov=src --cov-report=term-missing', { 
        cwd: backendPath, 
        encoding: 'utf8',
        stdio: 'pipe'
      });

      // 解析测试结果
      const coverageMatch = testOutput.match(/TOTAL\s+\|\s+(\d+\.\d+)%/);
      const coverage = coverageMatch ? parseFloat(coverageMatch[1]) : 0;

      const passedMatch = testOutput.match(/(\d+) passed/);
      const passed = passedMatch ? parseInt(passedMatch[1]) : 0;

      const failedMatch = testOutput.match(/(\d+) failed/);
      const failed = failedMatch ? parseInt(failedMatch[1]) : 0;

      return {
        status: 'success',
        coverage,
        passed,
        failed,
        total: passed + failed,
        lastRun: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'failed',
        error: error.message,
        lastRun: new Date().toISOString()
      };
    }
  }

  calculateMetrics() {
    console.log('📊 计算项目指标...');
    
    const metrics = {};

    // 代码质量指标
    if (this.statusData.tests.frontend?.coverage) {
      metrics.frontendCoverage = this.statusData.tests.frontend.coverage;
    }
    if (this.statusData.tests.backend?.coverage) {
      metrics.backendCoverage = this.statusData.tests.backend.coverage;
    }

    // 开发进度指标
    if (this.statusData.frontend.componentCount) {
      metrics.componentCount = this.statusData.frontend.componentCount;
    }
    if (this.statusData.frontend.featureCount) {
      metrics.featureCount = this.statusData.frontend.featureCount;
    }

    // 测试健康度
    const frontendTests = this.statusData.tests.frontend;
    const backendTests = this.statusData.tests.backend;
    
    if (frontendTests?.status === 'success' && backendTests?.status === 'success') {
      metrics.testHealth = 'excellent';
    } else if (frontendTests?.status === 'success' || backendTests?.status === 'success') {
      metrics.testHealth = 'good';
    } else {
      metrics.testHealth = 'poor';
    }

    // Git 健康度
    if (this.statusData.git.uncommittedChanges === 0) {
      metrics.gitHealth = 'clean';
    } else if (this.statusData.git.uncommittedChanges < 5) {
      metrics.gitHealth = 'minor';
    } else {
      metrics.gitHealth = 'needs_attention';
    }

    // 整体项目健康度
    const healthScore = this.calculateHealthScore(metrics);
    metrics.overallHealth = healthScore;
    metrics.healthGrade = this.getHealthGrade(healthScore);

    this.statusData.metrics = metrics;
  }

  calculateHealthScore(metrics) {
    let score = 100;

    // 测试覆盖率影响 (30%)
    const avgCoverage = ((metrics.frontendCoverage || 0) + (metrics.backendCoverage || 0)) / 2;
    score -= (100 - avgCoverage) * 0.3;

    // Git 状态影响 (20%)
    if (metrics.gitHealth === 'needs_attention') score -= 20;
    else if (metrics.gitHealth === 'minor') score -= 10;

    // 测试健康度影响 (30%)
    if (metrics.testHealth === 'poor') score -= 30;
    else if (metrics.testHealth === 'good') score -= 10;

    // 构建状态影响 (20%)
    if (this.statusData.frontend?.buildStatus === 'failed') score -= 20;

    return Math.max(0, Math.round(score));
  }

  getHealthGrade(score) {
    if (score >= 90) return 'A+ 🟢';
    if (score >= 80) return 'A 🟢';
    if (score >= 70) return 'B 🟡';
    if (score >= 60) return 'C 🟡';
    return 'D 🔴';
  }

  identifyRisks() {
    console.log('⚠️  识别项目风险...');
    
    const risks = [];

    // 测试覆盖率风险
    const frontendCoverage = this.statusData.tests.frontend?.coverage || 0;
    const backendCoverage = this.statusData.tests.backend?.coverage || 0;

    if (frontendCoverage < 80) {
      risks.push({
        type: 'quality',
        severity: frontendCoverage < 60 ? 'high' : 'medium',
        description: `前端测试覆盖率过低 (${frontendCoverage}%)`,
        recommendation: '增加单元测试和集成测试'
      });
    }

    if (backendCoverage < 80) {
      risks.push({
        type: 'quality',
        severity: backendCoverage < 60 ? 'high' : 'medium',
        description: `后端测试覆盖率过低 (${backendCoverage}%)`,
        recommendation: '增加API测试和业务逻辑测试'
      });
    }

    // Git 状态风险
    if (this.statusData.git.uncommittedChanges > 10) {
      risks.push({
        type: 'process',
        severity: 'medium',
        description: `未提交更改过多 (${this.statusData.git.uncommittedChanges} 个文件)`,
        recommendation: '及时提交代码或创建分支'
      });
    }

    // 构建风险
    if (this.statusData.frontend?.buildStatus === 'failed') {
      risks.push({
        type: 'technical',
        severity: 'high',
        description: '前端构建失败',
        recommendation: '检查代码错误和依赖问题'
      });
    }

    // 依赖风险
    if (!this.statusData.frontend?.nodeModulesInstalled) {
      risks.push({
        type: 'technical',
        severity: 'high',
        description: '前端依赖未安装',
        recommendation: '运行 npm install'
      });
    }

    if (!this.statusData.backend?.virtualEnvironment) {
      risks.push({
        type: 'technical',
        severity: 'medium',
        description: '后端虚拟环境未创建',
        recommendation: '创建 Python 虚拟环境'
      });
    }

    this.statusData.risks = risks;
  }

  countFiles(dir, extensions, subDir = '') {
    const targetDir = subDir ? path.join(dir, subDir) : dir;
    if (!fs.existsSync(targetDir)) return 0;

    let count = 0;
    const files = fs.readdirSync(targetDir, { recursive: true });

    for (const file of files) {
      if (typeof file === 'string') {
        const ext = path.extname(file);
        if (extensions.includes(ext)) {
          count++;
        }
      }
    }

    return count;
  }

  getPythonVersion(backendPath) {
    try {
      const pythonVersion = execSync('python --version', { 
        cwd: backendPath, 
        encoding: 'utf8' 
      }).trim();
      return pythonVersion;
    } catch (error) {
      return 'unknown';
    }
  }

  generateReport() {
    console.log('📋 生成项目状态报告...');
    
    const report = {
      summary: {
        timestamp: this.statusData.timestamp,
        overallHealth: this.statusData.metrics.overallHealth,
        healthGrade: this.statusData.metrics.healthGrade,
        totalRisks: this.statusData.risks.length,
        highRiskCount: this.statusData.risks.filter(r => r.severity === 'high').length
      },
      details: this.statusData,
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    const risks = this.statusData.risks;

    // 基于风险生成建议
    risks.forEach(risk => {
      recommendations.push({
        priority: risk.severity === 'high' ? 'high' : 'medium',
        category: risk.type,
        action: risk.recommendation,
        risk: risk.description
      });
    });

    // 基于指标生成建议
    if (this.statusData.metrics.frontendCoverage < 90) {
      recommendations.push({
        priority: 'medium',
        category: 'quality',
        action: '提高前端测试覆盖率到90%以上',
        risk: '测试覆盖率不足'
      });
    }

    if (this.statusData.metrics.backendCoverage < 90) {
      recommendations.push({
        priority: 'medium',
        category: 'quality',
        action: '提高后端测试覆盖率到90%以上',
        risk: '测试覆盖率不足'
      });
    }

    return recommendations;
  }

  async saveReport(outputPath) {
    const report = this.generateReport();
    const reportPath = outputPath || path.join(this.projectPath, 'project-status-report.json');
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 报告已保存到: ${reportPath}`);

    // 生成 Markdown 报告
    const markdownPath = reportPath.replace('.json', '.md');
    const markdownReport = this.generateMarkdownReport(report);
    fs.writeFileSync(markdownPath, markdownReport);
    console.log(`📄 Markdown 报告已保存到: ${markdownPath}`);

    return reportPath;
  }

  generateMarkdownReport(report) {
    const { summary, details, recommendations } = report;
    
    return `# 项目状态报告

## 📊 概览

- **生成时间**: ${summary.timestamp}
- **整体健康度**: ${summary.overallHealth}/100 (${summary.healthGrade})
- **风险总数**: ${summary.totalRisks}
- **高风险数量**: ${summary.highRiskCount}

## 🎯 关键指标

### 代码质量
- 前端测试覆盖率: ${details.metrics.frontendCoverage || 'N/A'}%
- 后端测试覆盖率: ${details.metrics.backendCoverage || 'N/A'}%
- 测试健康度: ${details.metrics.testHealth}

### 开发状态
- 组件数量: ${details.metrics.componentCount || 0}
- 功能模块数量: ${details.metrics.featureCount || 0}
- Git 状态: ${details.metrics.gitHealth}

## ⚠️ 风险清单

${details.risks.map(risk => `
### ${risk.severity === 'high' ? '🔴' : '🟡'} ${risk.description}
- **类型**: ${risk.type}
- **严重程度**: ${risk.severity}
- **建议**: ${risk.recommendation}
`).join('\n')}

## 💡 改进建议

${recommendations.map(rec => `
### ${rec.priority === 'high' ? '🔴' : '🟡'} ${rec.action}
- **优先级**: ${rec.priority}
- **类别**: ${rec.category}
- **相关风险**: ${rec.risk}
`).join('\n')}

## 📈 详细数据

### Git 状态
- 分支: ${details.git.branch || 'N/A'}
- 最后提交: ${details.git.lastCommit?.message || 'N/A'}
- 未提交更改: ${details.git.uncommittedChanges || 0}

### 前端状态
- 版本: ${details.frontend.version || 'N/A'}
- 依赖数量: ${details.frontend.dependencies || 0}
- 构建状态: ${details.frontend.buildStatus || 'N/A'}

### 后端状态
- Python 版本: ${details.backend.pythonVersion || 'N/A'}
- 依赖数量: ${details.backend.dependencies || 0}
- 虚拟环境: ${details.backend.virtualEnvironment ? '已创建' : '未创建'}

---

*报告由 Project Status Tracker 自动生成*
`;
  }

  async run() {
    console.log('🚀 开始项目状态跟踪...\n');

    await this.collectGitStatus();
    await this.collectFrontendStatus();
    await this.collectBackendStatus();
    await this.collectTestStatus();
    
    this.calculateMetrics();
    this.identifyRisks();

    const reportPath = await this.saveReport();
    
    console.log('\n✅ 项目状态跟踪完成!');
    console.log(`📊 整体健康度: ${this.statusData.metrics.overallHealth}/100 (${this.statusData.metrics.healthGrade})`);
    console.log(`⚠️  发现 ${this.statusData.risks.length} 个风险`);
    
    return reportPath;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const tracker = new ProjectStatusTracker();
  tracker.run().catch(error => {
    console.error('❌ 项目状态跟踪失败:', error);
    process.exit(1);
  });
}

module.exports = ProjectStatusTracker;
