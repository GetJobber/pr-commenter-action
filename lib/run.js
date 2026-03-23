import {
  getInput, debug, info, warning,
} from '@actions/core';

import { context, getOctokit } from '@actions/github';

const yaml = require('js-yaml');
const { validateCommentConfig } = require('./config');
const { getMatchingSnippetIds } = require('./snippets');

const {
  assembleCommentBody,
  extractCommentMetadata,
  shouldPostNewComment,
  shouldDeletePreviousComment,
  shouldEditPreviousComment,
} = require('./comment');

const {
  deleteComment,
  editComment,
  createComment,
  getChangedFiles,
  getFileContent,
  getComments,
} = require('./github');

async function run() {
  const token = getInput('github-token', { required: true });
  const configPath = getInput('config-file', { required: true });
  const templateVariablesJSONString = getInput('template-variables', { required: false });

  const prNumber = getPrNumber();
  if (!prNumber) {
    // eslint-disable-next-line no-console
    console.log('Could not get pull request number from context, exiting');
    return;
  }

  // eslint-disable-next-line new-cap
  const client = new getOctokit(token);

  debug(`fetching changed files for pr #${prNumber}`);
  const changedFiles = await getChangedFiles(client, prNumber);
  const previousComment = await getPreviousPRComment(client, prNumber);

  let templateVariables = {};
  if (templateVariablesJSONString) {
    debug('Input template-variables was passed');
    debug(templateVariablesJSONString);

    try {
      templateVariables = JSON.parse(templateVariablesJSONString);
    } catch (error) {
      warning('Failed to parse template-variables input as JSON. Continuing without template variables.');
    }
  } else {
    debug('Input template-variables was not passed');
  }

  const commentConfig = await getCommentConfig(client, configPath, templateVariables);
  const snippetIds = getMatchingSnippetIds(changedFiles, commentConfig);

  if (shouldDeletePreviousComment(previousComment, snippetIds, commentConfig)) {
    info('removing previous comment');
    await deleteComment(client, previousComment);
  }

  const commentBody = assembleCommentBody(snippetIds, commentConfig, templateVariables);

  if (shouldEditPreviousComment(previousComment, snippetIds, commentConfig)) {
    info('updating previous comment');
    await editComment(client, previousComment, commentBody);
  }

  if (shouldPostNewComment(previousComment, snippetIds, commentConfig)) {
    info('creating a new comment');
    await createComment(client, prNumber, commentBody);
  }
}

function getPrNumber() {
  const pullRequest = context.payload.pull_request;
  if (!pullRequest) {
    return undefined;
  }

  return pullRequest.number;
}

async function getCommentConfig(client, configurationPath, templateVariables) {
  const configurationContent = await getFileContent(client, configurationPath);
  const configObject = yaml.load(configurationContent);

  // transform object to a map or throw if yaml is malformed:
  const configMap = validateCommentConfig(configObject, templateVariables);
  return configMap;
}

async function getPreviousPRComment(client, prNumber) {
  const comments = await getComments(client, prNumber);
  debug(`there are ${comments.length} comments on the PR #${prNumber}`);

  const newestFirst = (c1, c2) => c2.created_at.localeCompare(c1.created_at);
  const sortedComments = comments.sort(newestFirst);
  const previousComment = sortedComments.find((c) => extractCommentMetadata(c.body) !== null);

  if (previousComment) {
    const previousSnippetIds = extractCommentMetadata(previousComment.body);

    info(`found previous comment made by pr-commenter: ${previousComment.url}`);
    info(`extracted snippet ids from previous comment: ${previousSnippetIds.join(', ')}`);

    return previousComment;
  }

  return null;
}

export default { run };
