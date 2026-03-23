import { error as coreError, setFailed } from '@actions/core';

const { run } = require('./run');

(async () => {
  try {
    await run();
  } catch (error) {
    coreError(error);
    setFailed(error.message);
  }
})();
