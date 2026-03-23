import { context } from '@actions/github';
import { debug, info } from '@actions/core';

async function deleteComment(client, comment) {
  return client.rest.issues.deleteComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    comment_id: comment.id,
  });
}

async function editComment(client, comment, newBody) {
  return client.rest.issues.updateComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    comment_id: comment.id,
    body: newBody,
  });
}

async function createComment(client, prNumber, body) {
  return client.rest.issues.createComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: prNumber,
    body,
  });
}

async function getChangedFiles(client, prNumber) {
  const listFilesOptions = client.rest.pulls.listFiles.endpoint.merge({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: prNumber,
  });

  const listFilesResponse = await client.paginate(listFilesOptions);
  const changedFiles = listFilesResponse.map((f) => f.filename);

  debug('found changed files:');
  for (const file of changedFiles) {
    debug(`  ${file}`);
  }

  return changedFiles;
}

async function getFileContent(client, repoPath) {
  let remoteDefn = {
    owner: context.repo.owner,
    repo: context.repo.repo,
    path: repoPath,
    ref: context.sha,
  };

  if (repoPath.includes('@')) {
    const regex = /^(.+?)\/(.+?)@(.+?):(.+?)$/;
    const match = repoPath.match(regex);

    if (match) {
      // eslint-disable-next-line no-unused-vars
      const [_, org, repo, ref, path] = match;
      remoteDefn = {
        owner: org,
        repo,
        path,
        ref,
      };
    }
  }

  info(`Fetching file: ${JSON.stringify({ remoteDefn })}`);

  const response = await client.rest.repos.getContent(remoteDefn);

  return Buffer.from(response.data.content, response.data.encoding).toString();
}

async function getComments(client, prNumber) {
  const { data: comments } = await client.rest.issues.listComments({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: prNumber,
  });

  return comments;
}

export {
  deleteComment,
  editComment,
  createComment,
  getChangedFiles,
  getFileContent,
  getComments,
};
