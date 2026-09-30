'use strict';

const fs = require('fs');
const path = require('path');

const { processLocale, readI18nConfig, seedLocale } = require('./lib/i18n-merge');

/**
 * CLI for the localization layer.
 *
 *   node scripts/i18n-merge.js                    merge every locale declared in angular.json
 *   node scripts/i18n-merge.js --locale=ca        merge a single locale
 *   node scripts/i18n-merge.js --check            validate only, write nothing, fail on any issue
 *   node scripts/i18n-merge.js --reset-broken     build, falling back to the source text on rejected translations
 *   node scripts/i18n-merge.js --seed             refresh the translation catalogs from the extraction
 *
 * The merge always writes the best possible output and reports the problems it
 * found, so a translation defect never blocks a local build: a translation the
 * compiler rejects falls back to the source text. `--check` is the gate: it
 * writes nothing and exits non zero as soon as anything is wrong, which is what
 * CI should run.
 *
 * `--seed` is the maintenance job: it moves the `<source>` of every catalog to
 * the current extraction, keeps the translations that still compile, and copies
 * the previous catalog to `src/locale/legacy` before overwriting it.
 */

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

function parseArgs(argv) {
    const options = { check: false, debug: false, seed: false, noResetBroken: false, locales: [], help: false };
    for (const arg of argv) {
        if (arg === '--check') {
            options.check = true;
        } else if (arg === '--seed') {
            options.seed = true;
        } else if (arg === '--reset-broken') {
            options.noResetBroken = false;
        } else if (arg === '--no-reset-broken') {
            options.noResetBroken = true;
        } else if (arg === '--debug') {
            options.debug = true;
        } else if (arg === '--help' || arg === '-h') {
            options.help = true;
        } else if (arg.startsWith('--locale=')) {
            options.locales.push(arg.slice('--locale='.length));
        } else {
            throw new Error(`Unknown argument: ${arg}`);
        }
    }
    if (options.seed && options.check) {
        throw new Error('--seed rewrites the catalogs and cannot be combined with --check');
    }
    return options;
}

function usage() {
    console.log('Usage: node scripts/i18n-merge.js [--check] [--seed] [--no-reset-broken] [--debug] [--locale=<locale>]');
    console.log('  --check             validate only, write nothing, exit 1 on any issue');
    console.log('  --seed              refresh the translation catalogs from the extraction');
    console.log('  --no-reset-broken   keep a rejected translation instead of falling back to the source text');
    console.log('  --debug             keep the verbose trace of the underlying merge');
    console.log('  --locale=<id>       restrict the run to a single locale (repeatable)');
}

function formatCounts(counts) {
    const parts = [];
    if (counts.source !== undefined) {
        parts.push(`source ${counts.source}`);
    }
    for (const key of ['base', 'catalog', 'custom', 'overridden', 'customOnly', 'baseOnly', 'dropped', 'kept', 'reset', 'added', 'removed']) {
        if (counts[key] !== undefined && counts[key] !== 0) {
            parts.push(`${key} ${counts[key]}`);
        }
    }
    return parts.length ? parts.join(' | ') : 'nothing to merge';
}

function printReport(report, projectRoot) {
    const output = path.relative(projectRoot, report.outputPath);
    if (report.status === 'merged') {
        console.log(`  ${GREEN}✓${RESET} ${report.locale} -> ${output}`);
        console.log(`      ${BLUE}${formatCounts(report.counts)}${RESET}`);
    } else {
        console.log(`  ${RED}✗${RESET} ${report.locale} ${RED}(no output)${RESET}`);
    }
    for (const issue of report.issues) {
        const marker = issue.level === 'error' ? `${RED}✗${RESET}` : `${YELLOW}⚠${RESET}`;
        console.log(`      ${marker} ${issue.code}: ${issue.message}`);
    }
}

function runSeed({ projectRoot, locales, sourceLocale }) {
    console.log(`${BLUE}=====${RESET} i18n seed | source locale ${GREEN}${sourceLocale}${RESET} | ${locales.join(', ')}`);
    for (const locale of locales) {
        const result = seedLocale({ projectRoot, locale, sourceLocale });
        const counts = formatCounts(result.counts);
        if (result.created) {
            console.log(`  ${GREEN}✓${RESET} ${locale} created from the extraction ${BLUE}(${counts})${RESET}`);
        } else {
            console.log(`  ${GREEN}✓${RESET} ${locale} refreshed ${BLUE}(${counts})${RESET} ${BLUE}${result.archived}${RESET}`);
        }
        for (const issue of result.issues) {
            const marker = issue.level === 'error' ? `${RED}✗${RESET}` : `${YELLOW}⚠${RESET}`;
            console.log(`      ${marker} ${issue.code}: ${issue.message}`);
        }
    }
    console.log(`${BLUE}=====${RESET} run "npm run i18n:merge" to rebuild the locales ${BLUE}=====${RESET}`);
}

function main() {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
        usage();
        return 0;
    }

    const projectRoot = path.join(__dirname, '..');
    const config = readI18nConfig(projectRoot);
    const locales = options.locales.length ? options.locales : config.locales;

    if (!options.debug) {
        console.debug = () => undefined;
    }

    if (options.seed) {
        runSeed({ projectRoot, locales, sourceLocale: config.sourceLocale });
        return 0;
    }

    console.log(
        `${BLUE}=====${RESET} i18n ${options.check ? 'check' : 'merge'} ${RESET}${config.projectName}${RESET} | source locale ${GREEN}${config.sourceLocale}${RESET} | ${locales.join(', ')}`
    );

    const reports = locales.map((locale) =>
        processLocale({
            projectRoot,
            locale,
            sourceLocale: config.sourceLocale,
            resetBroken: !options.check && !options.noResetBroken,
        })
    );
    for (const report of reports) {
        printReport(report, projectRoot);
    }

    if (!options.check) {
        for (const report of reports) {
            if (report.status === 'merged') {
                fs.mkdirSync(path.dirname(report.outputPath), { recursive: true });
                fs.writeFileSync(report.outputPath, report.content, 'utf8');
            }
        }
    }

    const issues = reports.flatMap((report) => report.issues);
    const errors = issues.filter((issue) => issue.level === 'error');
    const warnings = issues.filter((issue) => issue.level === 'warning');
    const merged = reports.filter((report) => report.status === 'merged').length;

    console.log(
        `${BLUE}=====${RESET} ${merged}/${reports.length} locale(s) merged | ${RED}${errors.length} error(s)${RESET} | ${YELLOW}${warnings.length} warning(s)${RESET} ${BLUE}=====${RESET}`
    );
    if (!options.check && issues.length) {
        console.log(
            `${YELLOW}⚠${RESET} Issues do not block the build here, run ${GREEN}npm run i18n:check${RESET} to fail on them`
        );
    }

    return options.check && issues.length ? 1 : 0;
}

try {
    process.exitCode = main();
} catch (error) {
    console.error(`${RED}✗${RESET} ${error.message}`);
    process.exitCode = 1;
}
