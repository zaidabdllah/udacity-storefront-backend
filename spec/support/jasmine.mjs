export default {
  spec_dir: 'spec',
  spec_files: ['**/*[sS]pec.ts'],
  helpers: ['helpers/**/*.ts'],
  requires: ['ts-node/register'],
  random: false,
  stopSpecOnExpectationFailure: false,
};
