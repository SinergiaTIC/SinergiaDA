'use strict';

const fs = require('fs-extra');

var source = './src/index_locale.html';
var target = './dist/app-eda/index.html';
var mergedConfig = './src/app/config/customizable/customizable_merged.ts';

/**
 * Reads ENABLED_LANGUAGES from customizable_merged.ts (defaults + overwrites, see apply-overwrites.js).
 * Returns null if it isn't defined or can't be parsed, so index.html keeps redirecting without restriction.
 */
function readEnabledLanguages() {
    if (!fs.existsSync(mergedConfig)) return null;
    var content = fs.readFileSync(mergedConfig, 'utf8');
    var match = /^export const ENABLED_LANGUAGES[^=]*=\s*(\[[^\]]*\])/m.exec(content);
    if (!match) return null;
    try {
        var languages = JSON.parse(match[1].replace(/'/g, '"').replace(/,\s*\]/, ']'));
        return Array.isArray(languages) && languages.every(l => typeof l === 'string') ? languages : null;
    } catch (e) {
        return null;
    }
}

var enabledLanguages = readEnabledLanguages();
var html = fs.readFileSync(source, 'utf8');

if (enabledLanguages) {
    html = html.replace('var enabledLanguages = null;', 'var enabledLanguages = ' + JSON.stringify(enabledLanguages) + ';');
} else {
    console.warn('\x1b[33m⚠\x1b[0m ENABLED_LANGUAGES no encontrado en customizable_merged.ts: index.html redirige sin restricción de idiomas');
}

fs.outputFileSync(target, html);

console.log('\x1b[34m=====\x1b[0m Fitxer \x1b[32m[/src/index_locale.html] \x1b[0mcopiat a \x1b[32m[/dist/app-eda] \x1b[34m=====\x1b[0m');
if (enabledLanguages) {
    console.log('\x1b[34m=====\x1b[0m ENABLED_LANGUAGES: \x1b[32m' + enabledLanguages.join(', ') + '\x1b[0m \x1b[34m=====\x1b[0m');
}
