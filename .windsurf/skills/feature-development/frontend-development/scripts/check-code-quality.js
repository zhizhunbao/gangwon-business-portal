#!/usr/bin/env node

/**
 * Frontend Code Quality Checker
 * 
 * This script performs various code quality checks on the frontend codebase
 */

const fs = require('fs');
const path = require('path');

class CodeQualityChecker {
  constructor() {
    this.issues = [];
    this.frontendDir = path.join(process.cwd(), 'frontend');
  }

  checkFileStructure() {
    console.log('🔍 Checking file structure...');
    
    const requiredDirs = [
      'src/components',
      'src/shared/hooks',
      'src/shared/services',
      'src/shared/utils',
      'src/shared/i18n/locales'
    ];

    requiredDirs.forEach(dir => {
      const fullPath = path.join(this.frontendDir, dir);
      if (!fs.existsSync(fullPath)) {
        this.issues.push(`Missing directory: ${dir}`);
      }
    });
  }

  checkComponentNaming() {
    console.log('🔍 Checking component naming conventions...');
    
    const componentsDir = path.join(this.frontendDir, 'src/components');
    if (fs.existsSync(componentsDir)) {
      const files = fs.readdirSync(componentsDir, { recursive: true });
      
      files.forEach(file => {
        if (file.endsWith('.jsx') || file.endsWith('.tsx')) {
          const fileName = path.basename(file, path.extname(file));
          
          // Check PascalCase naming
          if (!/^[A-Z][a-zA-Z0-9]*$/.test(fileName)) {
            this.issues.push(`Component should use PascalCase: ${file}`);
          }
        }
      });
    }
  }

  checkI18nKeys() {
    console.log('🔍 Checking i18n keys...');
    
    const localesDir = path.join(this.frontendDir, 'src/shared/i18n/locales');
    if (fs.existsSync(localesDir)) {
      const koFile = path.join(localesDir, 'ko.json');
      const zhFile = path.join(localesDir, 'zh.json');
      
      if (fs.existsSync(koFile) && fs.existsSync(zhFile)) {
        const koKeys = Object.keys(JSON.parse(fs.readFileSync(koFile, 'utf8')));
        const zhKeys = Object.keys(JSON.parse(fs.readFileSync(zhFile, 'utf8')));
        
        const missingInZh = koKeys.filter(key => !zhKeys.includes(key));
        const missingInKo = zhKeys.filter(key => !koKeys.includes(key));
        
        missingInZh.forEach(key => {
          this.issues.push(`Missing i18n key in zh.json: ${key}`);
        });
        
        missingInKo.forEach(key => {
          this.issues.push(`Missing i18n key in ko.json: ${key}`);
        });
      }
    }
  }

  async run() {
    console.log('🚀 Starting frontend code quality check...\n');
    
    this.checkFileStructure();
    this.checkComponentNaming();
    this.checkI18nKeys();
    
    console.log('\n📊 Check Results:');
    if (this.issues.length === 0) {
      console.log('✅ No issues found!');
    } else {
      console.log(`❌ Found ${this.issues.length} issues:`);
      this.issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });
    }
    
    return this.issues.length === 0;
  }
}

// Run if called directly
if (require.main === module) {
  const checker = new CodeQualityChecker();
  checker.run().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = CodeQualityChecker;
