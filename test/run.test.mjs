import { jest } from '@jest/globals';

const fakePRNumber = 432;
const mockCore = {
  debug: jest.fn(),
  getInput: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
};
const mockContext = {
  payload: { pull_request: { number: fakePRNumber } },
  repo: {},
  sha: undefined,
};
const mockGithub = {
  getOctokit: jest.fn(() => ({ name: 'fake-client' })),
};
const localGithub = {
  createComment: jest.fn(),
  deleteComment: jest.fn(),
  editComment: jest.fn(),
  getChangedFiles: jest.fn(),
  getComments: jest.fn(),
  getFileContent: jest.fn(),
};

jest.unstable_mockModule('@actions/core', () => ({
  debug: mockCore.debug,
  getInput: mockCore.getInput,
  info: mockCore.info,
  warning: mockCore.warning,
}));

jest.unstable_mockModule('@actions/github', () => ({
  context: mockContext,
  getOctokit: mockGithub.getOctokit,
}));

jest.unstable_mockModule('../lib/github.mjs', () => localGithub);

const comment = await import('../lib/comment.mjs');
const { run } = await import('../lib/run.mjs');

beforeEach(() => {
  jest.clearAllMocks();
  mockContext.payload = { pull_request: { number: fakePRNumber } };
  mockContext.repo = {};
  mockContext.sha = undefined;
  mockGithub.getOctokit.mockImplementation(() => ({ name: 'fake-client' }));
});

describe('run', () => {
  test('fully-mocked recreating a comment happy path', async () => {
    const fakeToken = 'github-token-123456';
    const fakeConfigPath = 'foo/config-file.yml';
    const fakeConfig = 'comment:\n'
      + '  on-update: recreate\n'
      + '  header: Hello {{name}}!\n'
      + '  footer: Bye!\n'
      + '  snippets:\n'
      + '    - id: snippet1\n'
      + '      body: This is snippet 1\n'
      + '      files:\n'
      + '        - any: ["*.md"]\n'
      + '          all: ["!CONTRIBUTING.md"]\n'
      + '    - id: snippet2\n'
      + '      body: This is snippet 2\n'
      + '      files:\n'
      + '        - vendor/**.js\n'
      + '        - static/**.js\n'
      + '    - id: snippet3\n'
      + '      body: This is snippet 3\n'
      + '      files:\n'
      + '        - static/**.css\n';

    mockCore.getInput.mockImplementation((argument) => {
      if (argument === 'github-token') {
        return fakeToken;
      }

      if (argument === 'config-file') {
        return 'foo/config-file.yml';
      }

      if (argument === 'template-variables') {
        return '{"name": "Bob"}';
      }

      return null;
    });

    const previousComment = {
      created_at: '2020-01-03',
      body: comment.commentMetadata(['snippet3']),
      url: 'previous-comment-url',
    };

    const existingPRComments = [
      { created_at: '2020-01-02' },
      previousComment,
      { created_at: '2020-01-01' },
    ];

    const commentBody = `${'Hello Bob!\n\n'
      + 'This is snippet 1\n\n'
    + 'This is snippet 3\n\n'
    + 'Bye!\n\n'}${
      comment.commentMetadata(['snippet1', 'snippet3'])}`;

    localGithub.getChangedFiles.mockResolvedValue(['static/foo.html', 'README.md', 'static/foo.css']);
    localGithub.getFileContent.mockResolvedValue(fakeConfig);
    localGithub.getComments.mockResolvedValue(existingPRComments);

    await run();

    expect(mockGithub.getOctokit).toHaveBeenCalledTimes(1);
    expect(mockGithub.getOctokit.mock.calls[0][0]).toEqual(fakeToken);

    expect(localGithub.getChangedFiles).toHaveBeenCalledTimes(1);
    expect(localGithub.getChangedFiles).toHaveBeenCalledWith({ name: 'fake-client' }, fakePRNumber);

    expect(localGithub.getFileContent).toHaveBeenCalledTimes(1);
    expect(localGithub.getFileContent).toHaveBeenCalledWith({ name: 'fake-client' }, fakeConfigPath);

    expect(localGithub.getComments).toHaveBeenCalledTimes(1);
    expect(localGithub.getComments).toHaveBeenCalledWith({ name: 'fake-client' }, fakePRNumber);

    expect(localGithub.deleteComment).toHaveBeenCalledTimes(1);
    expect(localGithub.deleteComment).toHaveBeenCalledWith({ name: 'fake-client' }, previousComment);

    expect(localGithub.deleteComment).toHaveBeenCalledTimes(1);
    expect(localGithub.deleteComment).toHaveBeenCalledWith({ name: 'fake-client' }, previousComment);

    expect(localGithub.createComment).toHaveBeenCalledTimes(1);
    expect(localGithub.createComment).toHaveBeenCalledWith({ name: 'fake-client' }, fakePRNumber, commentBody);

    expect(localGithub.editComment).toHaveBeenCalledTimes(0);
  });
});
