/* eslint-disable no-extend-native */

const core = {
  debug: jest.fn(),
  error: jest.fn(),
  getInput: jest.fn(),
  info: jest.fn(),
  setFailed: jest.fn(),
  warning: jest.fn(),
};

const github = {
  context: {
    payload: {},
    repo: {},
    sha: undefined,
  },
  getOctokit: jest.fn(() => ({ name: 'fake-client' })),
};

Promise.prototype.debug = core.debug;
Promise.prototype.error = core.error;
Promise.prototype.getInput = core.getInput;
Promise.prototype.info = core.info;
Promise.prototype.setFailed = core.setFailed;
Promise.prototype.warning = core.warning;
Promise.prototype.getOctokit = github.getOctokit;

Object.defineProperty(Promise.prototype, 'context', {
  configurable: true,
  get() {
    return github.context;
  },
});

function resetActionMocks() {
  Object.values(core).forEach((mockFn) => mockFn.mockReset());
  github.getOctokit.mockReset();
  github.getOctokit.mockImplementation(() => ({ name: 'fake-client' }));
  github.context = {
    payload: {},
    repo: {},
    sha: undefined,
  };
}

function setGithubContext(context) {
  github.context = context;
}

async function preloadActionModules() {
  await Promise.all([
    import('@actions/core'),
    import('@actions/github'),
  ]);
}

module.exports = {
  core,
  github,
  preloadActionModules,
  resetActionMocks,
  setGithubContext,
};
