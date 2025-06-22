// generateProjectOutline.js
// Enhanced for dynamic package detection, NestJS modules, code-first GraphQL, CI, tests, env, Docker, Prisma multi-schema, Next.js routes.

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const glob = require('glob');

const OUTPUT_FILE = 'project-outline-detailed.md';
const IGNORE_DIRS = ['.git', '.next', '.turbo', 'dist', 'coverage', '.cache', 'logs', 'out','generated','node_modules'];
let ESSENTIAL_NODE_MODULES = [];

// Load essential modules dynamically from package.json
function loadEssentialNodeModules() {
  try {
    const rootPkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'));
    ESSENTIAL_NODE_MODULES = Array.from(new Set([
      ...Object.keys(rootPkg.dependencies || {}),
      ...Object.keys(rootPkg.devDependencies || {}),
      ...Object.keys(rootPkg.peerDependencies || {}),
      ...Object.keys(rootPkg.optionalDependencies || {}),
    ]));
  } catch (e) {
    console.warn('Warning: failed to load essential modules:', e.message);
  }
}

// Utility to write a line with indentation
function write(stream, line = '', indent = 0) {
  stream.write(`${'  '.repeat(indent)}- ${line}\n`);
}

// Find files by glob pattern
function findFiles(pattern) {
  return glob.sync(pattern, { nodir: true });
}

// Parse README.md for title & description
function parseReadme() {
  const readmePath = 'README.md';
  if (!fs.existsSync(readmePath)) return null;
  const lines = fs.readFileSync(readmePath, 'utf-8').split(/\r?\n/);
  const title = lines.find(l => l.startsWith('# '))?.slice(2) || '';
  const description = lines.slice(1).find(l => l.trim()) || '';
  return { title, description };
}

// Parse .env keys without values
function parseEnv(envPath) {
  if (!fs.existsSync(envPath)) return [];
  return fs.readFileSync(envPath, 'utf-8')
    .split(/\r?\n/)
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => l.split('=')[0]);
}

// Parse all environment files
function parseEnvFiles() {
  return findFiles('**/.env*').filter(f => fs.statSync(f).isFile());
}

// Parse Docker Compose services from multiple locations
function parseDockerCompose(paths) {
  return paths
    .filter(p => fs.existsSync(p))
    .flatMap(fp => {
      try {
        const doc = yaml.load(fs.readFileSync(fp, 'utf-8')) || {};
        return Object.entries(doc.services || {}).map(
          ([name, cfg]) => `${path.relative(process.cwd(), fp)} → ${name}: ${cfg.image || 'N/A'}`
        );
      } catch {
        return [];
      }
    });
}

// Parse Terraform resources & modules
function parseTerraform(dir) {
  const files = findFiles(`${dir}/**/*.tf`);
  const resources = [];
  const modules = [];
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8').split(/\r?\n/);
    content.forEach(line => {
      const r = line.match(/^resource\s+"([^"]+)"\s+"([^"]+)"/);
      if (r) resources.push(`${r[1]}.${r[2]} (in ${path.relative(process.cwd(), file)})`);
      const m = line.match(/^module\s+"([^"]+)"/);
      if (m) modules.push(`${m[1]} (in ${path.relative(process.cwd(), file)})`);
    });
  });
  return { resources, modules };
}

// Parse Prisma schemas across the project
function parsePrismaSchemas() {
  const schemas = findFiles('**/schema.prisma');
  return schemas.map(p => ({
    path: p,
    models: fs.readFileSync(p, 'utf-8')
      .split(/\r?\n/)
      .filter(l => l.startsWith('model '))
      .map(l => l.split(' ')[1]),
  }));
}

// Parse NestJS modules (controllers & services)
function parseNestModules() {
  const dir = 'apps/backend/src/modules';
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(d => fs.statSync(path.join(dir, d)).isDirectory())
    .map(mod => {
      const base = path.join(dir, mod);
      return {
        module: mod,
        controllers: findFiles(`${base}/*.controller.ts`).map(f => path.basename(f)),
        services: findFiles(`${base}/*.service.ts`).map(f => path.basename(f)),
      };
    });
}

// Parse code-first GraphQL (NestJS decorators)
function parseGraphQLCodeFirst() {
  const dir = 'apps/backend/src';
  const files = findFiles(`${dir}/**/*.ts`);
  const resolvers = [];
  const objectTypes = [];
  files.forEach(f => {
    const c = fs.readFileSync(f, 'utf-8');
    if (/@Resolver\(/.test(c)) resolvers.push(path.relative(process.cwd(), f));
    if (/@ObjectType\(/.test(c)) objectTypes.push(path.relative(process.cwd(), f));
  });
  return { resolvers, objectTypes };
}

// Parse GraphQL SDL files
function parseGraphQLSDL() {
  return findFiles('**/*.graphql').concat(findFiles('**/*.gql')).map(f => path.relative(process.cwd(), f));
}

// Parse Next.js app pages & API routes
function parseNextRoutes() {
  const pages = findFiles('apps/frontend/app/**/*.{page.tsx,page.jsx,ts,tsx}')
    .map(f => f.replace(/^apps\/frontend\/app/, '').replace(/\.(ts|tsx|jsx)$/, ''));
  const api = findFiles('apps/frontend/app/api/**/route.ts')
    .map(f => f.replace(/^apps\/frontend\/app/, '').replace(/\/route\.ts$/, ''));
  return { pages, api };
}

// Parse CI workflows
function parseCIWorkflows() {
  return findFiles('.github/workflows/*.{yml,yaml}').map(f => path.relative(process.cwd(), f));
}

// Parse test files
function parseTestFiles() {
  const patterns = ['apps/backend/**/*.{spec,e2e-spec}.ts', 'apps/frontend/**/*.test.ts', 'apps/frontend/**/*.spec.ts'];
  return patterns.flatMap(p => findFiles(p).map(f => path.relative(process.cwd(), f)));
}

// Parse configuration files
function parseConfigFiles() {
  const patterns = ['.eslintrc*', '.prettierrc*', 'tsconfig*', 'jest.config*', 'vite.config*'];
  return patterns.flatMap(p => findFiles(p).map(f => path.relative(process.cwd(), f)));
}

// Parse custom scripts directory
function parseScriptsDir() {
  const dir = 'scripts';
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir, f)).isFile());
}

// Collect package.json data
let packageSummaries = [];
function collectPackageJson(pkgPath, location) {
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    packageSummaries.push({ location, ...{
      name: pkg.name || '',
      version: pkg.version || '',
      description: pkg.description || '',
      scripts: pkg.scripts || {},
      dependencies: pkg.dependencies || {},
      devDependencies: pkg.devDependencies || {},
      peerDependencies: pkg.peerDependencies || {},
      optionalDependencies: pkg.optionalDependencies || {},
    }});
  } catch (e) {
    packageSummaries.push({ location, error: e.message });
  }
}

// Recursive directory walk
function walk(dir, stream, depth = 0) {
  const name = path.basename(dir);
  if (IGNORE_DIRS.includes(name.toLowerCase())) return;
  write(stream, `${name}/`, depth);
  const pkg = path.join(dir, 'package.json');
  if (fs.existsSync(pkg)) collectPackageJson(pkg, path.relative(process.cwd(), pkg));
  fs.readdirSync(dir).forEach(item => {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      if (item === 'node_modules') {
        ESSENTIAL_NODE_MODULES.forEach(mod => {
          if (fs.existsSync(path.join(full, mod))) write(stream, `node_modules/${mod}/`, depth + 1);
        });
      } else {
        walk(full, stream, depth + 1);
      }
    } else {
      write(stream, item, depth + 1);
    }
  });
}

// Write package.json summaries section
function writeSummaries(stream) {
  stream.write('\n\n## 📦 PACKAGE.JSON SUMMARIES\n');
  packageSummaries.forEach(pkg => {
    stream.write(`\n### ${pkg.location}\n`);
    if (pkg.error) {
      stream.write(`- ❌ Error parsing: ${pkg.error}\n`);
      return;
    }
    stream.write(`- Name: ${pkg.name}\n- Version: ${pkg.version}\n`);
    if (pkg.description) stream.write(`- Description: ${pkg.description}\n`);
    ['scripts','dependencies','devDependencies','peerDependencies','optionalDependencies'].forEach(key => {
      if (pkg[key] && Object.keys(pkg[key]).length) {
        stream.write(`- ${key.charAt(0).toUpperCase() + key.slice(1)}:\n`);
        Object.entries(pkg[key]).forEach(([k,v]) => stream.write(`  - ${k}: ${v}\n`));
      }
    });
  });
}

// Main execution
function generateOutline() {
  loadEssentialNodeModules();
  const stream = fs.createWriteStream(OUTPUT_FILE);

  const readme = parseReadme();
  if (readme) stream.write(`# ${readme.title}\n\n${readme.description}\n\n`);
  stream.write(`**Generated:** ${new Date().toLocaleString()}\n\n`);

  // Project structure
  stream.write('## 🗂️ Project Structure\n');
  walk(process.cwd(), stream);

  // CI Workflows
  const ci = parseCIWorkflows();
  if (ci.length) {
    stream.write('\n## 🚦 CI Workflows\n');
    ci.forEach(f => stream.write(`- ${f}\n`));
  }

  // Config Files
  const cfg = parseConfigFiles();
  if (cfg.length) {
    stream.write('\n## ⚙️ Config Files\n');
    cfg.forEach(f => stream.write(`- ${f}\n`));
  }

  // Environment
  const envFiles = parseEnvFiles();
  if (envFiles.length) {
    stream.write('\n## 🔑 Environment Files & Keys\n');
    envFiles.forEach(f => {
      stream.write(`- ${f}\n`);
      parseEnv(f).forEach(k => stream.write(`  - ${k}\n`));
    });
  }

  // Docker Compose
  const dc = parseDockerCompose(['docker-compose.yml', 'apps/backend/docker-compose.yml']);
  if (dc.length) {
    stream.write('\n## 🐳 Docker Compose Services\n');
    dc.forEach(s => stream.write(`- ${s}\n`));
  }

  // NestJS Modules
  const nest = parseNestModules();
  if (nest.length) {
    stream.write('\n## 🔧 NestJS Modules\n');
    nest.forEach(m => {
      stream.write(`- ${m.module}:\n`);
      m.controllers.forEach(c => stream.write(`  - Controller: ${c}\n`));
      m.services.forEach(s => stream.write(`  - Service: ${s}\n`));
    });
  }

  // Prisma Schemas
  const pris = parsePrismaSchemas();
  if (pris.length) {
    stream.write('\n## 💾 Prisma Schemas & Models\n');
    pris.forEach(p => {
      stream.write(`- ${p.path}:\n`);
      p.models.forEach(m => stream.write(`  - Model: ${m}\n`));
    });
  }

  // GraphQL Code-First
  const gqlCode = parseGraphQLCodeFirst();
  if (gqlCode.resolvers.length || gqlCode.objectTypes.length) {
    stream.write('\n## 📡 GraphQL (Code-First)\n');
    gqlCode.resolvers.forEach(r => stream.write(`- Resolver: ${r}\n`));
    gqlCode.objectTypes.forEach(t => stream.write(`- ObjectType: ${t}\n`));
  }

  // GraphQL SDL
  const gqlSDL = parseGraphQLSDL();
  if (gqlSDL.length) {
    stream.write('\n## 📡 GraphQL SDL Files\n');
    gqlSDL.forEach(f => stream.write(`- ${f}\n`));
  }

  // Next.js Routes
  const next = parseNextRoutes();
  if (next.pages.length) {
    stream.write('\n## 🚀 Next.js Pages\n');
    next.pages.forEach(p => stream.write(`- ${p}\n`));
  }
  if (next.api.length) {
    stream.write('\n## 🚀 Next.js API Routes\n');
    next.api.forEach(a => stream.write(`- ${a}\n`));
  }

  // Scripts Directory
  const scripts = parseScriptsDir();
  if (scripts.length) {
    stream.write('\n## 📜 Scripts Directory\n');
    scripts.forEach(s => stream.write(`- ${s}\n`));
  }

  // Test Files
//   const tests = parseTestFiles();
//   if (tests.length) {
//     stream.write('\n## 🧪 Test Files\n');
//     tests.forEach(t => stream.write(`- ${t}\n`));
//   }

  // Terraform
  const tf = parseTerraform('infra');
  if (tf.resources.length || tf.modules.length) {
    stream.write('\n## 🏗️ Terraform Resources & Modules\n');
    tf.resources.forEach(r => stream.write(`- Resource: ${r}\n`));
    tf.modules.forEach(m => stream.write(`- Module: ${m}\n`));
  }

  // Package Summaries
  writeSummaries(stream);
  stream.end(() => console.log(`✅ Detailed outline written to ${OUTPUT_FILE}`));
}

generateOutline();
