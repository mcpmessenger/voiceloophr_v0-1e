#!/usr/bin/env node

/**
 * Local Security Scanner for VoiceLoop HR
 * Run this script before pushing to main branch
 * 
 * Usage: node scripts/security-scan.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SecurityScanner {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.passed = [];
    this.projectRoot = path.resolve(__dirname, '..');
    this.isWindows = process.platform === 'win32';
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '🔍';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  addIssue(message, severity = 'high') {
    this.issues.push({ message, severity });
    this.log(`ISSUE: ${message}`, 'error');
  }

  addWarning(message) {
    this.warnings.push(message);
    this.log(`WARNING: ${message}`, 'warning');
  }

  addPassed(message) {
    this.passed.push(message);
    this.log(`PASSED: ${message}`);
  }

  // Windows-compatible file search
  async findFiles(extensions, excludeDirs = []) {
    const files = [];
    
    function walkDir(dir) {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          if (!excludeDirs.includes(item)) {
            walkDir(fullPath);
          }
        } else if (extensions.some(ext => item.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    }
    
    try {
      walkDir(this.projectRoot);
    } catch (error) {
      // Skip directories that can't be read
    }
    
    return files;
  }

  // Windows-compatible text search
  async searchInFiles(files, patterns) {
    const results = [];
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        for (const pattern of patterns) {
          if (pattern.test(content)) {
            results.push({
              file: path.relative(this.projectRoot, file),
              pattern: pattern.source,
              matches: content.match(pattern) || []
            });
          }
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }
    
    return results;
  }

  async scanForHardcodedCredentials() {
    this.log('Scanning for hardcoded credentials...');
    
    const patterns = [
      // AWS Access Keys
      { pattern: /AKIA[0-9A-Z]{16}/g, name: 'AWS Access Key' },
      // AWS Secret Keys (example pattern)
      { pattern: /wJalrXUtnFEMI\/K7MDENG\/bPxRfiCY[0-9A-Za-z\/]{20}/g, name: 'AWS Secret Key' },
      // OpenAI API Keys
      { pattern: /sk-[a-zA-Z0-9]{48}/g, name: 'OpenAI API Key' },
      // Generic API Keys (more specific to avoid false positives)
      { pattern: /[a-zA-Z0-9]{40,}/g, name: 'Potential API Key' },
      // Database URLs
      { pattern: /mongodb:\/\/[^:\s]+:[^@\s]+@/g, name: 'Database URL with credentials' },
      // Private Keys
      { pattern: /-----BEGIN PRIVATE KEY-----/g, name: 'Private Key' },
      // SSH Keys
      { pattern: /-----BEGIN OPENSSH PRIVATE KEY-----/g, name: 'SSH Private Key' }
    ];

    const excludeDirs = ['node_modules', '.git', '.next', 'dist', 'build'];
    const extensions = ['.ts', '.js', '.tsx', '.jsx', '.json', '.md'];
    
    try {
      const files = await this.findFiles(extensions, excludeDirs);
      const searchPatterns = patterns.map(p => p.pattern);
      const results = await this.searchInFiles(files, searchPatterns);
      
      if (results.length > 0) {
        for (const result of results) {
          const pattern = patterns.find(p => p.pattern.source === result.pattern);
          this.addIssue(`Found potential ${pattern?.name || 'credential'} in ${result.file}!`, 'critical');
        }
      } else {
        this.addPassed('No hardcoded credentials found');
      }
    } catch (error) {
      this.addIssue(`Error scanning for credentials: ${error.message}`);
    }
  }

  async scanEnvironmentVariables() {
    this.log('Checking environment variable usage...');
    
    try {
      const envFiles = ['.env.local', '.env.example', '.env'];
      let envFileFound = false;
      
      for (const envFile of envFiles) {
        if (fs.existsSync(path.join(this.projectRoot, envFile))) {
          envFileFound = true;
          const content = fs.readFileSync(path.join(this.projectRoot, envFile), 'utf8');
          
          // Check for actual values instead of placeholders
          const lines = content.split('\n');
          for (const line of lines) {
            if (line.includes('=') && !line.includes('your_') && !line.includes('placeholder')) {
              const [key, value] = line.split('=');
              if (value && value.trim() && !value.includes('$')) {
                this.addWarning(`Environment variable ${key} has a value - ensure this is not a real credential`);
              }
            }
          }
        }
      }
      
      if (!envFileFound) {
        this.addWarning('No .env files found - check environment configuration');
      } else {
        this.addPassed('Environment files found and checked');
      }
    } catch (error) {
      this.addIssue(`Error checking environment variables: ${error.message}`);
    }
  }

  async scanDependencies() {
    this.log('Checking dependencies for security issues...');
    
    try {
      // Check for known vulnerabilities
      try {
        const audit = execSync('pnpm audit --audit-level moderate --json || echo "{}"', { 
          cwd: this.projectRoot, 
          encoding: 'utf8',
          stdio: 'pipe'
        });
        const auditResult = JSON.parse(audit);
        
        if (auditResult.vulnerabilities) {
          const vulnCount = Object.keys(auditResult.vulnerabilities).length;
          if (vulnCount > 0) {
            this.addIssue(`${vulnCount} vulnerabilities found in dependencies`, 'high');
          } else {
            this.addPassed('No vulnerabilities found in dependencies');
          }
        }
      } catch (error) {
        this.addWarning('Could not run security audit - check pnpm configuration');
      }

      // Check for outdated packages (Windows-compatible)
      try {
        const outdated = execSync('pnpm outdated --json || echo "[]"', { 
          cwd: this.projectRoot, 
          encoding: 'utf8',
          stdio: 'pipe'
        });
        const outdatedPackages = JSON.parse(outdated);
        
        if (outdatedPackages.length > 0) {
          this.addWarning(`${outdatedPackages.length} outdated packages found`);
          outdatedPackages.forEach(pkg => {
            this.log(`  ${pkg.name}: ${pkg.current} → ${pkg.latest}`, 'warning');
          });
        } else {
          this.addPassed('All packages are up to date');
        }
      } catch (error) {
        this.addWarning('Could not check for outdated packages');
      }
    } catch (error) {
      this.addIssue(`Error checking dependencies: ${error.message}`);
    }
  }

  async scanConfiguration() {
    this.log('Checking configuration files...');
    
    try {
      // Check package.json
      const packageJson = JSON.parse(fs.readFileSync(path.join(this.projectRoot, 'package.json'), 'utf8'));
      
      if (packageJson.private === false) {
        this.addWarning('Package is marked as public - consider making it private');
      }
      
      if (packageJson.version === '0.0.0') {
        this.addWarning('Package version is 0.0.0 - consider updating');
      }
      
      // Check for scripts that might be dangerous
      const dangerousScripts = ['eval', 'exec', 'rm -rf', 'sudo'];
      for (const script of dangerousScripts) {
        if (JSON.stringify(packageJson.scripts).includes(script)) {
          this.addWarning(`Potentially dangerous script found: ${script}`);
        }
      }
      
      this.addPassed('Package.json configuration checked');
      
      // Check for sensitive files
      const sensitiveFiles = ['.env.local', '.env.production', 'secrets.json', 'credentials.json'];
      for (const file of sensitiveFiles) {
        if (fs.existsSync(path.join(this.projectRoot, file))) {
          this.addWarning(`Sensitive file found: ${file} - ensure it's in .gitignore`);
        }
      }
      
    } catch (error) {
      this.addIssue(`Error checking configuration: ${error.message}`);
    }
  }

  async scanGitConfiguration() {
    this.log('Checking Git configuration...');
    
    try {
      // Check if .gitignore includes sensitive files
      const gitignorePath = path.join(this.projectRoot, '.gitignore');
      if (fs.existsSync(gitignorePath)) {
        const gitignore = fs.readFileSync(gitignorePath, 'utf8');
        const requiredIgnores = ['.env', '.env.local', '.env.production', 'node_modules', 'dist', 'build'];
        
        for (const ignore of requiredIgnores) {
          if (!gitignore.includes(ignore)) {
            this.addWarning(`Missing from .gitignore: ${ignore}`);
          }
        }
        
        this.addPassed('Gitignore configuration checked');
      } else {
        this.addWarning('No .gitignore file found');
      }
      
      // Check for large files (Windows-compatible)
      try {
        const files = await this.findFiles(['*'], ['node_modules', '.git']);
        const largeFiles = [];
        
        for (const file of files) {
          try {
            const stats = fs.statSync(file);
            if (stats.size > 10 * 1024 * 1024) { // >10MB
              largeFiles.push(path.relative(this.projectRoot, file));
            }
          } catch (error) {
            // Skip files that can't be accessed
          }
        }
        
        if (largeFiles.length > 0) {
          this.addWarning('Large files found (>10MB) - consider adding to .gitignore');
          largeFiles.slice(0, 10).forEach(file => {
            this.log(`  ${file}`, 'warning');
          });
        }
      } catch (error) {
        // No large files found or error accessing
      }
      
    } catch (error) {
      this.addIssue(`Error checking Git configuration: ${error.message}`);
    }
  }

  async scanTypeScriptSecurity() {
    this.log('Running TypeScript security checks...');
    
    try {
      // Check TypeScript compilation
      execSync('pnpm tsc --noEmit --strict', { 
        cwd: this.projectRoot, 
        stdio: 'pipe' 
      });
      this.addPassed('TypeScript compilation successful');
    } catch (error) {
      this.addIssue('TypeScript compilation failed - fix type errors before pushing');
    }
    
    try {
      // Check ESLint
      execSync('pnpm lint', { 
        cwd: this.projectRoot, 
        stdio: 'pipe' 
      });
      this.addPassed('ESLint checks passed');
    } catch (error) {
      this.addIssue('ESLint checks failed - fix linting errors before pushing');
    }
  }

  async scanAWSConfiguration() {
    this.log('Checking AWS configuration security...');
    
    try {
      // Check for AWS SDK usage
      const files = await this.findFiles(['.ts', '.js'], ['node_modules', '.git']);
      const awsFiles = [];
      
      for (const file of files) {
        try {
          const content = fs.readFileSync(file, 'utf8');
          if (content.includes('aws-sdk') || content.includes('@aws-sdk')) {
            awsFiles.push(path.relative(this.projectRoot, file));
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }
      
      if (awsFiles.length > 0) {
        this.addPassed('AWS SDK usage detected');
        
        // Check for proper environment variable usage
        let envUsageFound = false;
        for (const file of awsFiles) {
          try {
            const content = fs.readFileSync(path.join(this.projectRoot, file), 'utf8');
            if (content.includes('process.env.AWS')) {
              envUsageFound = true;
              break;
            }
          } catch (error) {
            // Skip files that can't be read
          }
        }
        
        if (envUsageFound) {
          this.addPassed('AWS credentials properly use environment variables');
        } else {
          this.addWarning('AWS SDK found but no environment variable usage detected');
        }
      } else {
        this.addPassed('No AWS SDK usage detected');
      }
      
    } catch (error) {
      this.addIssue(`Error checking AWS configuration: ${error.message}`);
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('🔒 SECURITY SCAN REPORT');
    console.log('='.repeat(60));
    
    console.log(`\n📊 Summary:`);
    console.log(`  ✅ Passed: ${this.passed.length}`);
    console.log(`  ⚠️  Warnings: ${this.warnings.length}`);
    console.log(`  ❌ Issues: ${this.issues.length}`);
    
    if (this.passed.length > 0) {
      console.log(`\n✅ Passed Checks:`);
      this.passed.forEach(check => console.log(`  • ${check}`));
    }
    
    if (this.warnings.length > 0) {
      console.log(`\n⚠️  Warnings:`);
      this.warnings.forEach(warning => console.log(`  • ${warning}`));
    }
    
    if (this.issues.length > 0) {
      console.log(`\n❌ Critical Issues:`);
      this.issues.forEach(issue => {
        const severity = issue.severity === 'critical' ? '🚨' : '❌';
        console.log(`  ${severity} ${issue.message}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    
    if (this.issues.length === 0) {
      console.log('🎉 All security checks passed! Safe to push to main branch.');
      return true;
    } else {
      console.log('🚨 Security issues found! Fix these before pushing to main branch.');
      return false;
    }
  }

  async runFullScan() {
    console.log('🚀 Starting comprehensive security scan...\n');
    
    await this.scanForHardcodedCredentials();
    await this.scanEnvironmentVariables();
    await this.scanDependencies();
    await this.scanConfiguration();
    await this.scanGitConfiguration();
    await this.scanTypeScriptSecurity();
    await this.scanAWSConfiguration();
    
    return this.generateReport();
  }
}

// Run the scanner if this file is executed directly
if (require.main === module) {
  const scanner = new SecurityScanner();
  
  scanner.runFullScan()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Scanner failed:', error);
      process.exit(1);
    });
}

module.exports = SecurityScanner;
