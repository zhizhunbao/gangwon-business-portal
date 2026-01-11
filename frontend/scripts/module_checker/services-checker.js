#!/usr/bin/env node
// Services 文件结构检查器

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadTemplate() {
  const templatePath = path.join(__dirname, 'templates/services-template.json');
  return JSON.parse(fs.readFileSync(templatePath, 'utf-8'));
}

function checkServiceFile(filePath) {
  const template = loadTemplate();
  const code = fs.readFileSync(filePath, 'utf-8');
  const lines = code.split('\n');
  const fileName = path.basename(filePath);
  
  const results = {
    file: filePath,
    checks: [],
  };

  // 跳过 index.js 和 api.service.js（特殊文件）
  if (fileName === 'index.js' || fileName === 'api.service.js') {
    results.checks.push({
      name: '跳过检查',
      passed: true,
      violations: [],
    });
    return results;
  }

  // 1. 检查文件命名
  const namingViolations = [];
  if (!fileName.endsWith('.service.js')) {
    namingViolations.push({
      line: 0,
      message: `文件命名不规范: ${fileName}`,
      suggestion: '应使用 xxx.service.js 格式',
    });
  }
  results.checks.push({
    name: '文件命名',
    passed: namingViolations.length === 0,
    violations: namingViolations,
  });

  // 2. 检查必需导入
  const importViolations = [];
  for (const required of template.required.imports) {
    const importRegex = new RegExp(`import[^;]*\\b${required}\\b|from[^;]*${required}`);
    if (!importRegex.test(code)) {
      importViolations.push({
        line: 0,
        message: `缺少必需导入: ${required}`,
      });
    }
  }
  
  // 检查导入文件是否存在
  if (template.imports?.checkExists) {
    const importPathRegex = /import\s+[^;]+\s+from\s+['"]([^'"]+)['"]/g;
    let pathMatch;
    const fileDir = path.dirname(path.resolve(filePath));
    
    while ((pathMatch = importPathRegex.exec(code)) !== null) {
      const importPath = pathMatch[1];
      
      if (importPath.startsWith('@shared/')) {
        const srcDir = fileDir.replace(/[\\\/]shared[\\\/]services.*$/, '');
        const relativePath = importPath.replace('@shared/', 'shared/');
        const possiblePaths = [
          path.join(srcDir, relativePath + '.js'),
          path.join(srcDir, relativePath + '.jsx'),
          path.join(srcDir, relativePath, 'index.js'),
          path.join(srcDir, relativePath, 'index.jsx'),
        ];
        
        const exists = possiblePaths.some(p => fs.existsSync(p));
        if (!exists) {
          importViolations.push({
            line: findLineNumber(code, pathMatch[0]),
            message: `导入路径不存在: ${importPath}`,
            suggestion: '检查文件路径是否正确',
          });
        }
      } else if (importPath.startsWith('./') || importPath.startsWith('../')) {
        const possiblePaths = [
          path.join(fileDir, importPath + '.js'),
          path.join(fileDir, importPath + '.jsx'),
          path.join(fileDir, importPath, 'index.js'),
          path.join(fileDir, importPath, 'index.jsx'),
        ];
        
        const exists = possiblePaths.some(p => fs.existsSync(p));
        if (!exists) {
          importViolations.push({
            line: findLineNumber(code, pathMatch[0]),
            message: `导入路径不存在: ${importPath}`,
            suggestion: '检查文件路径是否正确',
          });
        }
      }
    }
  }
  
  // 检查未使用的导入
  if (template.imports?.checkUnused) {
    const importLineRegex = /import\s+(?:\{([^}]+)\}|(\w+))\s+from\s+['"][^'"]+['"]/g;
    let importMatch;
    while ((importMatch = importLineRegex.exec(code)) !== null) {
      const namedImports = importMatch[1];
      const defaultImport = importMatch[2];
      
      if (namedImports) {
        const names = namedImports.split(',').map(n => n.trim().split(/\s+as\s+/).pop().trim());
        for (const name of names) {
          if (!name) continue;
          const codeWithoutImports = code.replace(/import[^;]+;/g, '');
          const usageRegex = new RegExp(`\\b${name}\\b`);
          if (!usageRegex.test(codeWithoutImports)) {
            importViolations.push({
              line: findLineNumber(code, importMatch[0]),
              message: `未使用的导入: ${name}`,
              suggestion: '移除未使用的导入',
            });
          }
        }
      }
      
      if (defaultImport && defaultImport !== 'apiService') {
        const codeWithoutImports = code.replace(/import[^;]+;/g, '');
        const usageRegex = new RegExp(`\\b${defaultImport}\\b`);
        if (!usageRegex.test(codeWithoutImports)) {
          importViolations.push({
            line: findLineNumber(code, importMatch[0]),
            message: `未使用的导入: ${defaultImport}`,
            suggestion: '移除未使用的导入',
          });
        }
      }
    }
  }
  results.checks.push({
    name: '导入检查',
    passed: importViolations.length === 0,
    violations: importViolations,
  });

  // 3. 检查 class 结构
  const structureViolations = [];
  if (template.structure.useClass) {
    const classRegex = /class\s+(\w+Service)\s*\{/;
    if (!classRegex.test(code)) {
      structureViolations.push({
        line: 0,
        message: '应使用 class 封装 service',
        suggestion: 'class XxxService { ... }',
      });
    }
  }
  results.checks.push({
    name: 'Class 结构',
    passed: structureViolations.length === 0,
    violations: structureViolations,
  });

  // 4. 检查 default export
  const exportViolations = [];
  if (template.structure.defaultExport) {
    const directExportRegex = /export\s+default\s+new\s+\w+Service\(\)/;
    const varExportRegex = /const\s+\w+\s*=\s*new\s+\w+Service\(\)[\s\S]*export\s+default\s+\w+/;
    const createServiceExportRegex = /export\s+default\s+createService\s*\(\s*\w+Service\s*\)/;
    const varCreateServiceExportRegex = /const\s+\w+\s*=\s*createService\s*\(\s*\w+Service\s*\)[\s\S]*export\s+default\s+\w+/;
    if (!directExportRegex.test(code) && !varExportRegex.test(code) && !createServiceExportRegex.test(code) && !varCreateServiceExportRegex.test(code)) {
      exportViolations.push({
        line: 0,
        message: '应使用 default export 导出实例',
        suggestion: 'export default new XxxService() 或 export default createService(XxxService)',
      });
    }
  }
  results.checks.push({
    name: '导出规范',
    passed: exportViolations.length === 0,
    violations: exportViolations,
  });

  // 5. 检查禁止的模式
  const patternViolations = [];
  for (const pattern of template.forbidden.patterns) {
    if (code.includes(pattern)) {
      patternViolations.push({
        line: findLineNumber(code, pattern),
        message: `禁止的模式: ${pattern}`,
      });
    }
  }
  results.checks.push({
    name: '禁止模式',
    passed: patternViolations.length === 0,
    violations: patternViolations,
  });

  // 6. 检查直接使用 axios
  const axiosViolations = [];
  if (template.forbidden.directAxios) {
    const axiosImportRegex = /import\s+axios\s+from/;
    if (axiosImportRegex.test(code)) {
      axiosViolations.push({
        line: findLineNumber(code, 'import axios'),
        message: '不应直接导入 axios',
        suggestion: '使用 apiService 代替',
      });
    }
  }
  results.checks.push({
    name: 'Axios 使用',
    passed: axiosViolations.length === 0,
    violations: axiosViolations,
  });

  // 7. 检查 store 导入
  const storeViolations = [];
  if (template.forbidden.storeImports) {
    const storeImportRegex = /import.*from\s+['"]@shared\/stores['"]/;
    if (storeImportRegex.test(code)) {
      storeViolations.push({
        line: findLineNumber(code, '@shared/stores'),
        message: 'Service 不应导入 store',
        suggestion: 'Service 只负责 API 调用，状态管理在 hooks 或组件中处理',
      });
    }
  }
  results.checks.push({
    name: 'Store 导入',
    passed: storeViolations.length === 0,
    violations: storeViolations,
  });

  // 8. 检查注释规范
  const commentViolations = [];
  if (template.comments?.singleLineOnly) {
    // 检查文件顶部是否使用单行注释
    const firstNonEmptyLine = lines.find(line => line.trim().length > 0);
    if (firstNonEmptyLine && !firstNonEmptyLine.trim().startsWith('//')) {
      commentViolations.push({
        line: 1,
        message: '文件顶部应使用单行中文注释',
        suggestion: '使用 // Service 描述',
      });
    }
    
    // 检查 JSDoc 多行注释
    const jsdocRegex = /\/\*\*[\s\S]*?\*\//g;
    let match;
    while ((match = jsdocRegex.exec(code)) !== null) {
      const line = code.substring(0, match.index).split('\n').length;
      commentViolations.push({
        line,
        message: '禁止使用 JSDoc 多行注释',
        suggestion: '使用 // 单行中文注释',
      });
    }
    
    // 检查 /* */ 多行注释
    const multiLineCommentRegex = /\/\*[^*][\s\S]*?\*\//g;
    while ((match = multiLineCommentRegex.exec(code)) !== null) {
      const line = code.substring(0, match.index).split('\n').length;
      commentViolations.push({
        line,
        message: '禁止使用多行注释',
        suggestion: '使用 // 单行中文注释',
      });
    }
  }
  
  // 检查方法内注释
  if (template.comments?.forbidInMethodComments) {
    const classMatch = code.match(/class\s+\w+Service\s*\{([\s\S]*)\}/);
    if (classMatch) {
      const classBody = classMatch[1];
      const methodRegex = /(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{/g;
      let methodMatch;
      
      while ((methodMatch = methodRegex.exec(classBody)) !== null) {
        const methodStart = methodMatch.index + methodMatch[0].length;
        let braceCount = 1;
        let i = methodStart;
        
        while (i < classBody.length && braceCount > 0) {
          if (classBody[i] === '{') braceCount++;
          if (classBody[i] === '}') braceCount--;
          i++;
        }
        
        const methodBody = classBody.slice(methodStart, i - 1);
        const inMethodCommentRegex = /^\s*\/\//gm;
        let commentMatch;
        while ((commentMatch = inMethodCommentRegex.exec(methodBody)) !== null) {
          const lineInMethod = methodBody.substring(0, commentMatch.index).split('\n').length;
          const absoluteLine = code.substring(0, code.indexOf(methodMatch[0])).split('\n').length + lineInMethod;
          commentViolations.push({
            line: absoluteLine,
            message: `方法 ${methodMatch[1]} 内禁止使用注释`,
            suggestion: '方法内代码应自解释，不需要注释',
          });
          break; // 每个方法只报一次
        }
      }
    }
  }
  results.checks.push({
    name: '注释规范',
    passed: commentViolations.length === 0,
    violations: commentViolations,
  });

  // 9. 检查 _ 前缀方法名
  const underscoreViolations = [];
  if (template.naming?.forbidUnderscorePrefix) {
    const methodRegex = /^\s*(async\s+)?(_\w+)\s*\([^)]*\)\s*\{/gm;
    let match;
    while ((match = methodRegex.exec(code)) !== null) {
      const methodName = match[2];
      underscoreViolations.push({
        line: findLineNumber(code, match[0].trim()),
        message: `禁止使用 _ 前缀的方法名: ${methodName}`,
        suggestion: '将私有逻辑内联到调用方法中，或使用有意义的方法名',
      });
    }
  }
  results.checks.push({
    name: '方法命名',
    passed: underscoreViolations.length === 0,
    violations: underscoreViolations,
  });

  // 10. 检查多重 fallback 模式
  const fallbackViolations = [];
  if (template.forbidden?.multipleFallback) {
    const fallbackRegex = /(\w+\.[\w.]+)\s*\|\|\s*(\w+\.[\w.]+)\s*\|\|\s*(\w+\.[\w.]+)/g;
    let match;
    while ((match = fallbackRegex.exec(code)) !== null) {
      fallbackViolations.push({
        line: findLineNumber(code, match[0]),
        message: `多重 fallback 模式: ${match[0].substring(0, 50)}...`,
        suggestion: '后端应返回统一格式，前端只做一次 snake_case → camelCase 转换',
      });
    }
    
    const paramFallbackRegex = /(\w+)\.(\w+)\s*\|\|\s*\1\.(\w+)/g;
    while ((match = paramFallbackRegex.exec(code)) !== null) {
      const objName = match[1];
      const param1 = match[2];
      const param2 = match[3];
      if (objName === 'response') continue;
      if (param1 !== param2) {
        fallbackViolations.push({
          line: findLineNumber(code, match[0]),
          message: `双重参数 fallback: ${objName}.${param1} || ${objName}.${param2}`,
          suggestion: '统一使用 camelCase 参数名，调用方负责传正确的参数',
        });
      }
    }
  }
  results.checks.push({
    name: '多重 Fallback',
    passed: fallbackViolations.length === 0,
    violations: fallbackViolations,
  });

  // 11. 检查默认空数据返回
  const emptyReturnViolations = [];
  if (template.forbidden?.defaultEmptyReturn) {
    const emptyReturnPatterns = [
      /return\s*\{\s*items:\s*\[\]/g,
      /return\s*\{\s*records:\s*\[\]/g,
      /return\s*\[\s*\]/g,
    ];
    for (const pattern of emptyReturnPatterns) {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        emptyReturnViolations.push({
          line: findLineNumber(code, match[0]),
          message: '禁止返回默认空数据',
          suggestion: 'Service 只负责 API 调用，错误处理和默认值在调用方处理',
        });
      }
    }
  }
  results.checks.push({
    name: '默认返回值',
    passed: emptyReturnViolations.length === 0,
    violations: emptyReturnViolations,
  });

  // 12. 检查可选字段默认值
  const optionalDefaultViolations = [];
  if (template.forbidden?.optionalFieldDefaults) {
    const badDefaultPatterns = [
      { regex: /:\s*\w+\.\w+\s*\|\|\s*''/g, message: "可选字段不应使用空字符串默认值 ''" },
      { regex: /:\s*\w+\.\w+\s*\|\|\s*""/g, message: '可选字段不应使用空字符串默认值 ""' },
      { regex: /:\s*\w+\?\.\w+\s*\|\|\s*''/g, message: "可选字段不应使用空字符串默认值 ''" },
      { regex: /:\s*\w+\?\.\w+\s*\|\|\s*""/g, message: '可选字段不应使用空字符串默认值 ""' },
    ];
    for (const { regex, message } of badDefaultPatterns) {
      let match;
      while ((match = regex.exec(code)) !== null) {
        optionalDefaultViolations.push({
          line: findLineNumber(code, match[0]),
          message: `${message}: ${match[0].trim()}`,
          suggestion: "可选字段使用 ?? null，让调用方决定如何处理空值",
        });
      }
    }
  }
  results.checks.push({
    name: '可选字段默认值',
    passed: optionalDefaultViolations.length === 0,
    violations: optionalDefaultViolations,
  });

  // 13. 检查参数默认值（调用方必须传入所有参数）
  const paramDefaultViolations = [];
  if (template.forbidden?.parameterDefaults) {
    const paramDefaultPatterns = [
      /params\.(\w+)\s*\|\|\s*\d+/g,
      /params\.(\w+)\s*\|\|\s*['"]/g,
      /params\.(\w+)\s*\?\?\s*\d+/g,
      /params\.(\w+)\s*\?\?\s*['"]/g,
      /params\.(\w+)\s*\|\|\s*true/g,
      /params\.(\w+)\s*\|\|\s*false/g,
      /params\.(\w+)\s*\?\?\s*true/g,
      /params\.(\w+)\s*\?\?\s*false/g,
    ];
    for (const regex of paramDefaultPatterns) {
      let match;
      while ((match = regex.exec(code)) !== null) {
        paramDefaultViolations.push({
          line: findLineNumber(code, match[0]),
          message: `参数不应有默认值: ${match[0].trim()}`,
          suggestion: '调用方必须传入所有参数，Service 不提供默认值',
        });
      }
    }
  }
  results.checks.push({
    name: '参数默认值',
    passed: paramDefaultViolations.length === 0,
    violations: paramDefaultViolations,
  });

  // 14. 检查响应默认值（后端必须提供所有字段）
  const responseDefaultViolations = [];
  if (template.forbidden?.responseDefaults) {
    const responseDefaultPatterns = [
      /response\.(\w+)\s*\|\|\s*\d+/g,
      /response\.(\w+)\s*\|\|\s*['"]/g,
      /response\.(\w+)\s*\?\?\s*\d+/g,
      /response\.(\w+)\s*\?\?\s*['"]/g,
      /response\.(\w+)\s*\|\|\s*\[\]/g,
      /response\.(\w+)\s*\?\?\s*\[\]/g,
      /response\.(\w+)\s*\|\|\s*\{\}/g,
      /response\.(\w+)\s*\?\?\s*\{\}/g,
      /item\.(\w+)\s*\|\|\s*\d+/g,
      /item\.(\w+)\s*\|\|\s*['"]/g,
      /item\.(\w+)\s*\?\?\s*\d+/g,
      /item\.(\w+)\s*\?\?\s*['"]/g,
      /item\.(\w+)\s*\|\|\s*\[\]/g,
      /item\.(\w+)\s*\?\?\s*\[\]/g,
    ];
    for (const regex of responseDefaultPatterns) {
      let match;
      while ((match = regex.exec(code)) !== null) {
        responseDefaultViolations.push({
          line: findLineNumber(code, match[0]),
          message: `响应字段不应有默认值: ${match[0].trim()}`,
          suggestion: '后端必须提供所有字段，Service 不提供默认值',
        });
      }
    }
  }
  results.checks.push({
    name: '响应默认值',
    passed: responseDefaultViolations.length === 0,
    violations: responseDefaultViolations,
  });

  // 15. 检查请求数据空值处理（发送到后端的数据必须将空字符串转为 null）
  const emptyStringViolations = [];
  if (template.required?.emptyStringToNull !== false) {
    // 只检查直接赋值模式: requestData.xxx = data.xxx;
    // 跳过在 if 块内的赋值（条件赋值通常是有意为之）
    const requestDataAssignRegex = /requestData\.(\w+)\s*=\s*data\.(\w+)\s*;/g;
    let match;
    while ((match = requestDataAssignRegex.exec(code)) !== null) {
      const fieldName = match[1];
      const fullLine = code.split('\n').find(line => line.includes(match[0]));
      if (fullLine && fullLine.includes('JSON.stringify')) continue;
      
      // 检查这行是否在 if 块内
      const matchIndex = match.index;
      const codeBeforeMatch = code.substring(0, matchIndex);
      
      // 找到最近的 if 语句开始位置
      const lastIfIndex = codeBeforeMatch.lastIndexOf('if (');
      if (lastIfIndex !== -1) {
        // 检查 if 块是否已经闭合
        const codeBetween = codeBeforeMatch.substring(lastIfIndex);
        const openBraces = (codeBetween.match(/\{/g) || []).length;
        const closeBraces = (codeBetween.match(/\}/g) || []).length;
        // 如果在未闭合的 if 块内，跳过
        if (openBraces > closeBraces) continue;
      }
      
      emptyStringViolations.push({
        line: findLineNumber(code, match[0]),
        message: `字段 ${fieldName} 未处理空值`,
        suggestion: `使用 data.${match[2]} || null 将空字符串转为 null，避免后端 Pydantic 验证失败`,
      });
    }
  }
  results.checks.push({
    name: '空值处理',
    passed: emptyStringViolations.length === 0,
    violations: emptyStringViolations,
  });

  // 16. 检查参数校验（带 params 参数的方法必须有校验）
  const paramValidationViolations = [];
  if (template.required?.paramValidation) {
    // 如果使用 createService 包装，则跳过手动校验检查
    const usesCreateServiceDirect = /export\s+default\s+createService\s*\(\s*\w+Service\s*\)/.test(code);
    const usesCreateServiceVar = /=\s*createService\s*\(\s*\w+Service\s*\)/.test(code);
    if (usesCreateServiceDirect || usesCreateServiceVar) {
      results.checks.push({
        name: '参数校验',
        passed: true,
        violations: [],
      });
      return results;
    }

    const classMatch = code.match(/class\s+\w+Service\s*\{([\s\S]*)\}/);
    if (classMatch) {
      const classBody = classMatch[1];
      
      // 检查带 params 参数的方法
      const paramsMethodRegex = /(?:async\s+)?(\w+)\s*\(\s*params\s*\)\s*\{/g;
      let methodMatch;
      
      while ((methodMatch = paramsMethodRegex.exec(classBody)) !== null) {
        const methodName = methodMatch[1];
        const methodStart = methodMatch.index + methodMatch[0].length;
        let braceCount = 1;
        let i = methodStart;
        
        while (i < classBody.length && braceCount > 0) {
          if (classBody[i] === '{') braceCount++;
          if (classBody[i] === '}') braceCount--;
          i++;
        }
        
        const methodBody = classBody.slice(methodStart, i - 1);
        
        const requiredParamMatches = methodBody.match(/(?:^|[{,\s])(\w+):\s*params\.(\w+)\b(?!\s*\?)/gm);
        if (!requiredParamMatches || requiredParamMatches.length === 0) continue;
        
        const requiredParams = [];
        for (const match of requiredParamMatches) {
          const paramMatch = match.match(/params\.(\w+)/);
          if (paramMatch && !match.includes('params?.')) {
            requiredParams.push(paramMatch[1]);
          }
        }
        
        if (requiredParams.length === 0) continue;
        
        const hasValidation = /if\s*\(\s*!params/.test(methodBody) || /throw\s+new\s+Error\s*\(\s*["']Missing/.test(methodBody);
        
        if (!hasValidation) {
          const lineNum = code.substring(0, code.indexOf(methodMatch[0])).split('\n').length;
          const uniqueParams = [...new Set(requiredParams)].slice(0, 3).join(', ');
          paramValidationViolations.push({
            line: lineNum,
            message: `方法 ${methodName}(params) 缺少参数校验`,
            suggestion: `添加 if (!params?.${uniqueParams.split(', ')[0]}) throw new Error("Missing required params: ${uniqueParams}")`,
          });
        }
      }
      
      // 检查带独立参数的方法（如 recordId, memberId, data 等）
      const independentMethodRegex = /(?:async\s+)?(\w+)\s*\(\s*([^)]+)\s*\)\s*\{/g;
      
      while ((methodMatch = independentMethodRegex.exec(classBody)) !== null) {
        const methodName = methodMatch[1];
        const paramsStr = methodMatch[2].trim();
        
        if (paramsStr === 'params' || paramsStr === '') continue;
        
        const methodStart = methodMatch.index + methodMatch[0].length;
        let braceCount = 1;
        let i = methodStart;
        
        while (i < classBody.length && braceCount > 0) {
          if (classBody[i] === '{') braceCount++;
          if (classBody[i] === '}') braceCount--;
          i++;
        }
        
        const methodBody = classBody.slice(methodStart, i - 1);
        
        const paramNames = paramsStr.split(',').map(p => p.trim().split('=')[0].trim()).filter(p => p && p !== 'params');
        
        const requiredParams = paramNames.filter(p => {
          const usedDirectly = new RegExp(`\\b${p}\\b`).test(methodBody);
          const hasDefault = paramsStr.includes(`${p} =`) || paramsStr.includes(`${p}=`);
          return usedDirectly && !hasDefault;
        });
        
        if (requiredParams.length === 0) continue;
        
        const hasValidation = requiredParams.every(p => {
          return new RegExp(`if\\s*\\(\\s*!${p}\\b`).test(methodBody) || 
                 new RegExp(`throw\\s+new\\s+Error.*${p}`).test(methodBody);
        });
        
        if (!hasValidation) {
          const lineNum = code.substring(0, code.indexOf(methodMatch[0])).split('\n').length;
          const firstRequired = requiredParams[0];
          paramValidationViolations.push({
            line: lineNum,
            message: `方法 ${methodName}(${paramsStr}) 缺少参数校验`,
            suggestion: `添加 if (!${firstRequired}) throw new Error("Missing required param: ${firstRequired}")`,
          });
        }
      }
    }
  }
  results.checks.push({
    name: '参数校验',
    passed: paramValidationViolations.length === 0,
    violations: paramValidationViolations,
  });

  return results;
}

function findLineNumber(code, pattern) {
  const index = code.indexOf(pattern);
  if (index === -1) return 0;
  return code.substring(0, index).split('\n').length;
}

function checkDirectory(dir) {
  const results = [];
  const files = fs.readdirSync(dir, { recursive: true });

  for (const file of files) {
    if (file.endsWith('.js') && !file.includes('node_modules')) {
      results.push(checkServiceFile(path.join(dir, file)));
    }
  }

  return results;
}

function printReport(results) {
  for (const result of results) {
    console.log(`\n检查文件: ${result.file}`);
    console.log('='.repeat(60));

    for (const check of result.checks) {
      if (check.passed) {
        console.log(`[PASS] ${check.name}`);
      } else {
        console.log(`[FAIL] ${check.name}`);
        const maxShow = 5;
        const violations = check.violations.slice(0, maxShow);
        for (const v of violations) {
          const location = v.line > 0 ? `:${v.line}` : '';
          console.log(`  ${result.file}${location}`);
          console.log(`    ${v.message}`);
          if (v.suggestion) {
            console.log(`    → ${v.suggestion}`);
          }
        }
        if (check.violations.length > maxShow) {
          console.log(`  ... 还有 ${check.violations.length - maxShow} 个问题`);
        }
        console.log('\n' + '='.repeat(60));
        console.log(`[STOP] 检查失败，请先修复上述问题！`);
        return false;
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('[PASS] 所有检查通过');
  return true;
}

// CLI
if (process.argv[1].includes('services-checker')) {
  const dir = process.argv[2] || 'src/shared/services';
  const results = checkDirectory(dir);
  process.exit(printReport(results) ? 0 : 1);
}

export { checkServiceFile, checkDirectory, printReport };
