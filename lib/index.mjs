import { error as coreError, setFailed } from '@actions/core';

import { run } from './run.mjs';

(async () => {
  try {
    await run();
  } catch (error) {
    coreError(error);
    setFailed(error.message);
  }
})();
