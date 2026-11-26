#!/usr/bin/env node
'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const Module = require('module');
const path = require('path');

const HEAVY_PACKAGES = [
  /^arima$/,
  /^@tensorflow\/tfjs(?:\/|$)/,
  /^@duckdb\/node-api(?:\/|$)/,
  /^playwright(?:\/|$)/,
  /^pdfkit$/,
  /^sharp$/,
  /^nodemailer$/,
  /^openai(?:\/|$)/,
  /^@anthropic-ai\/(?:sdk|bedrock-sdk)(?:\/|$)/,
  /^@modelcontextprotocol\/sdk(?:\/|$)/,
  /^oracledb$/,
  /^pg(?:\/|$)/,
  /^@clickhouse\/client(?:\/|$)/,
  /^@google-cloud\/bigquery(?:\/|$)/,
  /^mssql$/,
  /^vertica$/,
  /^snowflake-sdk$/,
  /^mysql2(?:\/|$)/,
  /^mariadb$/,
  /^mongodb(?:\/|$)/,
];

const DRIVER_PACKAGES = {
  mysql: 'mysql2',
  postgres: 'pg',
  mariadb: 'mariadb',
  sqlserver: 'mssql',
  oracle: 'oracledb',
  bigquery: '@google-cloud/bigquery',
  snowflake: 'snowflake-sdk',
  vertica: 'vertica',
  clickhouse: '@clickhouse/client',
  mongodb: 'mongodb',
};

function parseArgs(argv) {
  const options = {
    apiRoot: path.resolve(__dirname, '..'),
    compareRoot: null,
    runs: 3,
    scenarios: ['startup'],
    worker: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const equalsAt = arg.indexOf('=');
    const key = equalsAt === -1 ? arg : arg.slice(0, equalsAt);
    const inlineValue = equalsAt === -1 ? null : arg.slice(equalsAt + 1);
    const takeValue = () => inlineValue !== null ? inlineValue : argv[++i];

    switch (key) {
      case '--api-root':
        options.apiRoot = path.resolve(takeValue());
        break;
      case '--compare-root':
        options.compareRoot = path.resolve(takeValue());
        break;
      case '--runs':
        options.runs = Number.parseInt(takeValue(), 10);
        break;
      case '--scenarios':
        options.scenarios = takeValue().split(',').filter(Boolean);
        break;
      case '--worker':
        options.worker = true;
        break;
      case '-h':
      case '--help':
        options.help = true;
        break;
      default:
        throw new Error(`Opción desconocida: ${arg}`);
    }
  }

  if (!Number.isInteger(options.runs) || options.runs < 1) {
    throw new Error('--runs debe ser un entero mayor que cero.');
  }

  return options;
}

function usage() {
  console.log(`
Uso:
  node scripts/memory-benchmark.js --api-root <ruta-api> [opciones]

Compara el RSS del grafo de módulos en procesos aislados. No inicia la API,
no conecta con MongoDB/datasources, no abre el navegador ni envía correo.
La configuración local config.overwrite.js se sustituye por valores neutros.

Opciones:
  --compare-root <ruta-api>  Checkout base para comparar con --api-root.
  --runs <n>                 Procesos nuevos por escenario (por defecto: 3).
  --scenarios <lista>        startup,arima,tensorflow,duckdb,pdf,mail,mcp,ai,
                             driver:<tipo> (por defecto: startup).
  -h, --help                 Muestra esta ayuda.

Ejemplo A/B:
  node scripts/memory-benchmark.js \\
    --api-root /ruta/cambios/eda/eda_api \\
    --compare-root /ruta/base/eda/eda_api \\
    --runs 5 --scenarios startup,arima,tensorflow,duckdb,pdf,mail,mcp,ai,driver:postgres

Compile ambos checkouts antes de comparar. Use la misma versión de Node y el
mismo sistema. Los escenarios de TensorFlow, PDF y drivers cargan módulos en
un proceso hijo aislado; nunca ejecutan conexiones o acciones externas.
`);
}

function packageName(request) {
  if (request.startsWith('@')) return request.split('/').slice(0, 2).join('/');
  return request.split('/')[0];
}

function isHeavyPackage(request) {
  return HEAVY_PACKAGES.some((pattern) => pattern.test(request));
}

function memorySnapshot() {
  const memory = process.memoryUsage();
  return {
    rssBytes: memory.rss,
    heapUsedBytes: memory.heapUsed,
    externalBytes: memory.external,
    arrayBuffersBytes: memory.arrayBuffers,
  };
}

function megabytes(bytes) {
  return Math.round(bytes / 1024 / 1024 * 10) / 10;
}

function instrumentModules(apiRoot) {
  const originalLoad = Module._load;
  const loadedPackages = new Set();
  const configRoot = path.join(apiRoot, 'config');

  function stubInstanceConfig(parentFile, request) {
    const resolvedPath = path.resolve(path.dirname(parentFile), request);
    const relativePath = path.relative(configRoot, resolvedPath);
    if (relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) return null;

    const configName = path.basename(resolvedPath).replace(/\.(js|json)$/, '');
    if (configName === 'seed') return { SEED: 'isolated-benchmark-seed' };
    if (configName === 'database.config') return { url: 'mongodb://127.0.0.1:27017/isolated-benchmark' };
    if (configName === 'sinergiacrm.config') return { sinergiaConn: {} };
    return null;
  }

  function safeFs(target, existsSync) {
    return new Proxy(target, {
      get(object, property) {
        if (property === 'existsSync') return existsSync;
        const value = Reflect.get(object, property, object);
        return typeof value === 'function' ? value.bind(object) : value;
      },
    });
  }

  Module._load = function(request, parent, isMain) {
    const parentFile = parent && parent.filename || '';

    if (isHeavyPackage(request)) loadedPackages.add(packageName(request));

    if (parentFile && request.startsWith('.')) {
      const configStub = stubInstanceConfig(parentFile, request);
      if (configStub) return configStub;
    }

    if (request === 'fs' && parentFile.endsWith(`${path.sep}apply-config-overwrite.js`)) {
      const realFs = originalLoad.apply(this, arguments);
      return safeFs(realFs, (targetPath) => {
        if (path.resolve(targetPath) === path.join(configRoot, 'config.overwrite.js')) return false;
        return realFs.existsSync(targetPath);
      });
    }

    return originalLoad.apply(this, arguments);
  };

  return loadedPackages;
}

async function runScenario(apiRoot, scenario) {
  if (scenario === 'startup') return;

  if (scenario === 'arima') {
    const { ArimaService } = require(path.join(apiRoot, 'dist/services/prediction/arima.service'));
    const dataset = Array.from({ length: 40 }, (_, i) => 100 + Math.sin(i * 0.4) * 20 + Math.cos(i * 0.1) * 5);
    const result = ArimaService.forecast(dataset, 2, { p: 1, d: 1, q: 1 });
    if (!result.every(Number.isFinite)) throw new Error('ARIMA no devolvió predicciones finitas.');
    return;
  }

  if (scenario === 'tensorflow') {
    const { TensorflowService } = require(path.join(apiRoot, 'dist/services/prediction/tensorflow.service'));
    const result = await TensorflowService.forecast(
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      1,
      { epochs: 1, lookback: 2, learningRate: 0.01 }
    );
    if (!result.every(Number.isFinite)) throw new Error('TensorFlow no devolvió predicciones finitas.');
    return;
  }

  if (scenario === 'duckdb') {
    const { DuckDBConnection } = require(path.join(apiRoot, 'dist/services/connection/db-systems/duckdb-connection'));
    const instance = await new DuckDBConnection({}).getclient();
    instance.closeSync();
    return;
  }

  if (scenario === 'pdf') {
    require('playwright');
    require('pdfkit');
    require('sharp');
    return;
  }

  if (scenario === 'mail') {
    require('nodemailer');
    return;
  }

  if (scenario === 'mcp') {
    require('@modelcontextprotocol/sdk/server/mcp.js');
    require('@modelcontextprotocol/sdk/server/streamableHttp.js');
    require('@modelcontextprotocol/sdk/client/index.js');
    return;
  }

  if (scenario === 'ai') {
    require(path.join(apiRoot, 'dist/services/prompt/providers/openai.provider'));
    return;
  }

  if (scenario.startsWith('driver:')) {
    const driver = scenario.slice('driver:'.length);
    if (driver === 'duckdb') {
      const { DuckDBConnection } = require(path.join(apiRoot, 'dist/services/connection/db-systems/duckdb-connection'));
      const instance = await new DuckDBConnection({}).getclient();
      instance.closeSync();
      return;
    }
    const packageNameToLoad = DRIVER_PACKAGES[driver];
    if (!packageNameToLoad) throw new Error(`Driver desconocido: ${driver}`);
    require(packageNameToLoad);
    return;
  }

  throw new Error(`Escenario desconocido: ${scenario}`);
}

async function runWorker(options) {
  const routerPath = path.join(options.apiRoot, 'dist/router.js');
  const schedulerPath = path.join(options.apiRoot, 'dist/EdaScheduler.js');
  if (!fs.existsSync(routerPath) || !fs.existsSync(schedulerPath)) {
    throw new Error(`No encuentro el build en ${options.apiRoot}. Ejecute npm run build en ese checkout.`);
  }

  const loadedPackages = instrumentModules(options.apiRoot);
  if (global.gc) global.gc();
  const before = memorySnapshot();

  require(routerPath);
  require(schedulerPath);
  if (global.gc) global.gc();
  const idle = memorySnapshot();
  const packagesAtIdle = new Set(loadedPackages);

  await runScenario(options.apiRoot, options.scenarios[0]);
  if (global.gc) global.gc();
  const afterScenario = memorySnapshot();

  console.log(`SDA_MEMORY_BENCHMARK:${JSON.stringify({
    node: process.version,
    apiRoot: options.apiRoot,
    scenario: options.scenarios[0],
    rssBeforeBytes: before.rssBytes,
    rssIdleBytes: idle.rssBytes,
    rssAfterScenarioBytes: afterScenario.rssBytes,
    heapIdleBytes: idle.heapUsedBytes,
    heapAfterScenarioBytes: afterScenario.heapUsedBytes,
    externalIdleBytes: idle.externalBytes,
    externalAfterScenarioBytes: afterScenario.externalBytes,
    loadedAtIdle: Array.from(packagesAtIdle).sort(),
    loadedAfterScenario: Array.from(loadedPackages).sort(),
  })}`);
}

function median(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function runSamples(apiRoot, options, label) {
  const samples = [];
  for (let i = 0; i < options.runs; i++) {
    const env = {
      ...process.env,
      SDA_MEMORY_BENCH_WORKER: '1',
      SDA_MEMORY_BENCH_API_ROOT: apiRoot,
      SDA_MEMORY_BENCH_SCENARIO: options.scenarios[0],
    };
    const result = childProcess.spawnSync(process.execPath, ['--expose-gc', __filename, '--worker'], {
      cwd: apiRoot,
      env,
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
      timeout: 300000,
    });

    if (result.error || result.status !== 0) {
      throw new Error(`${label}, ${options.scenarios[0]}, muestra ${i + 1}: ${result.error?.message || result.stderr || result.stdout}`);
    }

    const line = result.stdout.split(/\r?\n/).find(value => value.startsWith('SDA_MEMORY_BENCHMARK:'));
    if (!line) throw new Error(`${label}, ${options.scenarios[0]}, muestra ${i + 1}: falta el resultado JSON.`);
    samples.push(JSON.parse(line.slice('SDA_MEMORY_BENCHMARK:'.length)));
  }
  return samples;
}

function summarize(samples) {
  return {
    node: samples[0].node,
    rssIdleMB: megabytes(median(samples.map(sample => sample.rssIdleBytes))),
    rssAfterScenarioMB: megabytes(median(samples.map(sample => sample.rssAfterScenarioBytes))),
    heapIdleMB: megabytes(median(samples.map(sample => sample.heapIdleBytes))),
    heapAfterScenarioMB: megabytes(median(samples.map(sample => sample.heapAfterScenarioBytes))),
    externalIdleMB: megabytes(median(samples.map(sample => sample.externalIdleBytes))),
    externalAfterScenarioMB: megabytes(median(samples.map(sample => sample.externalAfterScenarioBytes))),
    loadedAtIdle: Array.from(new Set(samples.flatMap(sample => sample.loadedAtIdle))).sort(),
    loadedAfterScenario: Array.from(new Set(samples.flatMap(sample => sample.loadedAfterScenario))).sort(),
  };
}

function runParent(options) {
  const roots = options.compareRoot
    ? [{ label: 'base', root: options.compareRoot }, { label: 'cambios', root: options.apiRoot }]
    : [{ label: 'evaluación', root: options.apiRoot }];

  const results = {};
  for (const root of roots) {
    for (const scenario of options.scenarios) {
      const scenarioOptions = { ...options, apiRoot: root.root, scenarios: [scenario] };
      const samples = runSamples(root.root, scenarioOptions, root.label);
      results[`${root.label}:${scenario}`] = summarize(samples);
    }
  }

  const comparison = [];
  for (const scenario of options.scenarios) {
    const current = options.compareRoot ? results[`cambios:${scenario}`] : results[`evaluación:${scenario}`];
    const baseline = options.compareRoot ? results[`base:${scenario}`] : null;
    comparison.push({
      escenario: scenario,
      rssIdleMB: current.rssIdleMB,
      rssAfterScenarioMB: current.rssAfterScenarioMB,
      deltaVsBaseRSSIdleMB: baseline ? Math.round((current.rssIdleMB - baseline.rssIdleMB) * 10) / 10 : null,
      deltaVsBaseRSSAfterScenarioMB: baseline ? Math.round((current.rssAfterScenarioMB - baseline.rssAfterScenarioMB) * 10) / 10 : null,
      node: current.node,
      loadedAtIdle: current.loadedAtIdle,
      loadedAfterScenario: current.loadedAfterScenario,
    });
  }

  console.log(`RSS mediano de ${options.runs} procesos nuevos (MB). Delta negativo significa menos RSS en los cambios.`);
  console.log(JSON.stringify(comparison, null, 2));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) return usage();

  if (options.worker || process.env.SDA_MEMORY_BENCH_WORKER === '1') {
    options.apiRoot = path.resolve(process.env.SDA_MEMORY_BENCH_API_ROOT || options.apiRoot);
    options.scenarios = [process.env.SDA_MEMORY_BENCH_SCENARIO || 'startup'];
    await runWorker(options);
    process.exit(0);
  }

  if (options.scenarios.some(scenario => scenario !== 'startup'
      && scenario !== 'arima'
      && scenario !== 'tensorflow'
      && scenario !== 'duckdb'
      && scenario !== 'pdf'
      && scenario !== 'mail'
      && scenario !== 'mcp'
      && scenario !== 'ai'
      && !scenario.startsWith('driver:'))) {
    throw new Error('Use uno de los escenarios indicados en --help.');
  }

  runParent(options);
}

main().catch(error => {
  console.error(`Error en la prueba aislada de memoria: ${error.message}`);
  process.exit(1);
});
