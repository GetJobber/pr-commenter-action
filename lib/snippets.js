import { debug, info } from '@actions/core';

const { Minimatch } = require('minimatch');

function getMatchingSnippetIds(changedFiles, commentConfig) {
  const snippetIds = commentConfig.get('snippets').reduce((acc, snippet) => {
    debug(`processing snippet ${snippet.get('id')}`);

    if (checkGlobs(changedFiles, snippet.get('files'), commentConfig.get('globOptions') || {})) {
      return [...acc, snippet.get('id')];
    }
    return acc;
  }, []);

  info(`matched snippet ids: ${snippetIds}`);

  return snippetIds;
}

function toMatchConfig(config) {
  if (typeof config === 'string') {
    return {
      any: [config],
    };
  }

  return config;
}

function printPattern(matcher) {
  return (matcher.negate ? '!' : '') + matcher.pattern;
}

function checkGlobs(changedFiles, globs, opts) {
  for (const glob of globs) {
    debug(` checking pattern ${JSON.stringify(glob)}`);
    const matchConfig = toMatchConfig(glob);
    if (checkMatch(changedFiles, matchConfig, opts)) {
      return true;
    }
  }
  return false;
}

function isMatch(changedFile, matchers) {
  debug(`    matching patterns against file ${changedFile}`);
  for (const matcher of matchers) {
    debug(`   - ${printPattern(matcher)}`);
    if (!matcher.match(changedFile)) {
      debug(`   ${printPattern(matcher)} did not match`);
      return false;
    }
  }

  debug('   all patterns matched');
  return true;
}

// equivalent to "Array.some()" but expanded for debugging and clarity
function checkAny(changedFiles, globs, opts) {
  const matchers = globs.map((g) => new Minimatch(g, opts));
  debug('  checking "any" patterns');
  for (const changedFile of changedFiles) {
    if (isMatch(changedFile, matchers)) {
      debug(`  "any" patterns matched against ${changedFile}`);
      return true;
    }
  }

  debug('  "any" patterns did not match any files');
  return false;
}

// equivalent to "Array.every()" but expanded for debugging and clarity
function checkAll(changedFiles, globs, opts) {
  const matchers = globs.map((g) => new Minimatch(g, opts));
  debug(' checking "all" patterns');
  for (const changedFile of changedFiles) {
    if (!isMatch(changedFile, matchers)) {
      debug(`  "all" patterns did not match against ${changedFile}`);
      return false;
    }
  }

  debug('  "all" patterns matched all files');
  return true;
}

function checkMatch(changedFiles, matchConfig, opts) {
  if (matchConfig.all !== undefined) {
    if (!checkAll(changedFiles, matchConfig.all, opts)) {
      return false;
    }
  }

  if (matchConfig.any !== undefined) {
    if (!checkAny(changedFiles, matchConfig.any, opts)) {
      return false;
    }
  }

  return true;
}

export default { getMatchingSnippetIds };
