export default {
  spec_dir: '.',
  spec_files: ['source/**/*[sS]pec.ts'],
  helpers: ['spec/helpers/**/*.ts'],
  requires: ['ts-node/register'],
  random: false,
  stopSpecOnExpectationFailure: false,
};
