'use strict';

const InsightsPublisher = require('../../../../lib/util/insightspublisher');
const a = require('../../../lib/util').a;
const assert = require('assert');
const getToken = require('../../../lib/token');
const { wsServerInsights } = require('../../../env');

const options = {};
if (wsServerInsights) {
  options.gateway = wsServerInsights;
}

const tokens = new Map([
  ['expired', getToken('foo', { ttl: 60 * -1000 })],
  ['invalid', 'foo'],
  ['valid', getToken('foo') ]
]);

describe('InsightsPublisher', () => {
  describe('connect', () => {
    [ [ 'expired', 9202 ], [ 'invalid', 9004 ], [ 'valid' ] ].forEach(scenario => {
      var publisher;
      const tokenType = scenario[0];
      const expectedErrorCode = scenario[1];

      context(`when attempted with ${a(tokenType)} ${tokenType} token`, () => {
        before(() => {
          publisher = new InsightsPublisher(tokens.get(tokenType),
            'twilio-video.js',
            '1.2.3',
            'prod',
            'us1',
            options);
        });

        const description = tokenType !== 'valid'
          ? `should disconnect with the error code ${expectedErrorCode}`
          : 'should be successful';

        const test = tokenType !== 'valid' ? async () => {
          const error = await new Promise((resolve, reject) => {
            publisher.once('connected', () => reject(new Error('Unexpected connect')));
            publisher.once('disconnected', resolve);
          });
          assert(error instanceof Error);
          assert.equal(error.code, expectedErrorCode);
        } : () => new Promise((resolve, reject) => {
          publisher.once('connected', resolve);
          publisher.once('disconnected', error => reject(error || new Error('Unexpected disconnect')));
        });

        it(description, test);

        after(() => {
          publisher.disconnect();
        });
      });
    });
  });

  describe('disconnect', () => {
    it('should disconnect without any error', async () => {
      const publisher = new InsightsPublisher(tokens.get('valid'),
        'twilio-video.js',
        '1.2.3',
        'prod',
        'us1',
        options);

      publisher.once('connected', () => publisher.disconnect());
      const error = await new Promise(resolve => publisher.once('disconnected', resolve));
      assert(!error);
    });
  });
});