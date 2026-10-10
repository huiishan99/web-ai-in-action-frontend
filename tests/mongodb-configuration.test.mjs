import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import mongoConfig from '../src/lib/mongodb-config.cjs';

const { requireMongoUri } = mongoConfig;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requiredMessage = 'MONGODB_URI is required';

function loadConsumer(relativePath, environment, failConnect = false, rooms = []) {
  const calls = { constructed: 0, connected: 0, closed: 0, values: [], logs: [], pipelines: [] };
  class MongoClient {
    constructor(value) {
      calls.constructed++;
      calls.values.push(value);
    }
    async connect() {
      calls.connected++;
      if (failConnect) throw new Error('Synthetic connection failure');
    }
    db() {
      return {
        collection: () => ({
          aggregate: (pipeline) => {
            calls.pipelines.push(pipeline);
            return { toArray: async () => rooms };
          },
        }),
      };
    }
    async close() {
      calls.closed++;
    }
  }
  const quietConsole = {
    log: (...args) => calls.logs.push(args),
    error: (...args) => calls.logs.push(args),
  };
  const consumerModule = { exports: {} };
  const fakeRequire = (specifier) => {
    if (specifier === 'mongodb') {
      return { MongoClient };
    }
    if (specifier === 'next/server') {
      return {
        NextResponse: {
          json: (body, init = {}) => ({ status: init.status || 200, body }),
        },
      };
    }
    if (specifier.endsWith('/mongodb-config.cjs')) {
      return { requireMongoUri: () => requireMongoUri(environment) };
    }
    throw new Error('Unexpected dependency in offline fixture');
  };
  // Requiring the standalone script must not run its main entry point.
  fakeRequire.main = null;
  let source = fs.readFileSync(path.join(root, relativePath), 'utf8');
  if (relativePath.endsWith('.ts')) {
    source = ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
      },
    }).outputText;
  }
  const context = vm.createContext({
    require: fakeRequire,
    module: consumerModule,
    exports: consumerModule.exports,
    console: quietConsole,
    Error,
  });
  new vm.Script(source, { filename: relativePath }).runInContext(context);
  return { consumer: consumerModule.exports, calls };
}

test('missing and blank configuration fails with a fixed, value-free message', () => {
  for (const environment of [{}, { MONGODB_URI: '' }, { MONGODB_URI: ' \t\n ' }]) {
    assert.throws(() => requireMongoUri(environment), { message: requiredMessage });
  }
});

test('a configured opaque value is forwarded without being modified', () => {
  const value = ' synthetic-test-value ';
  assert.equal(requireMongoUri({ MONGODB_URI: value }), value);
});

test('standalone module loads without configuration and without starting main', () => {
  const { consumer, calls } = loadConsumer('backend/room_matching_script.js', {});
  assert.equal(typeof consumer.RoomMatcher, 'function');
  assert.equal(calls.constructed, 0);
  assert.equal(calls.connected, 0);
});

test('standalone connection rejects absent or blank configuration before constructing a client', async () => {
  for (const environment of [{}, { MONGODB_URI: '' }, { MONGODB_URI: ' \t ' }]) {
    const { consumer, calls } = loadConsumer('backend/room_matching_script.js', environment);
    const matcher = new consumer.RoomMatcher();
    await assert.rejects(matcher.connect(), { message: requiredMessage });
    assert.equal(calls.constructed, 0);
    assert.equal(calls.connected, 0);
  }
});

test('standalone connection forwards configured value and retains disconnect behavior', async () => {
  const value = 'synthetic-test-value';
  const { consumer, calls } = loadConsumer('backend/room_matching_script.js', { MONGODB_URI: value });
  const matcher = new consumer.RoomMatcher();
  await matcher.connect();
  await matcher.disconnect();
  assert.deepEqual(calls.values, [value]);
  assert.equal(calls.connected, 1);
  assert.equal(calls.closed, 1);
});

test('GET health response remains available without database configuration', async () => {
  const { consumer, calls } = loadConsumer('src/app/api/room-matching/route.ts', {});
  const response = await consumer.GET();
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ok');
  assert.equal(calls.constructed, 0);
});

test('POST retains invalid-input response without creating a database client', async () => {
  const { consumer, calls } = loadConsumer('src/app/api/room-matching/route.ts', {});
  const response = await consumer.POST({ json: async () => ({ sentiment: 'invalid', hobbies: [] }) });
  assert.equal(response.status, 400);
  assert.equal(typeof response.body.error, 'string');
  assert.equal(calls.constructed, 0);
});

test('valid POST with absent or blank configuration returns a safe 500 before client construction', async () => {
  for (const environment of [{}, { MONGODB_URI: '' }, { MONGODB_URI: ' \t ' }]) {
    const { consumer, calls } = loadConsumer('src/app/api/room-matching/route.ts', environment);
    const response = await consumer.POST({ json: async () => ({ sentiment: 5, hobbies: [1, 0, 0] }) });
    assert.equal(response.status, 500);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error, requiredMessage);
    assert.equal(calls.constructed, 0);
    assert.equal(calls.connected, 0);
  }
});

test('configured POST forwards the value and keeps the existing connection-error response', async () => {
  const value = 'synthetic-test-value';
  const { consumer, calls } = loadConsumer('src/app/api/room-matching/route.ts', { MONGODB_URI: value }, true);
  const response = await consumer.POST({ json: async () => ({ sentiment: 5, hobbies: [1, 0, 0] }) });
  assert.equal(response.status, 500);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error, 'Synthetic connection failure');
  assert.deepEqual(calls.values, [value]);
  assert.equal(calls.connected, 1);
  assert.equal(calls.closed, 1);
});

test('configured POST preserves vector search, active-room selection, response shape, and cleanup', async () => {
  const active = { roomId: 'fixture-active', roomName: 'Synthetic room', isActive: true, matchScore: 0.8 };
  const rooms = [{ roomId: 'fixture-inactive', isActive: false }, active];
  const { consumer, calls } = loadConsumer('src/app/api/room-matching/route.ts', { MONGODB_URI: 'synthetic-test-value' }, false, rooms);
  const response = await consumer.POST({ json: async () => ({ sentiment: 5, hobbies: [1, 0, 0] }) });
  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(JSON.stringify(response.body)), { success: true, ...active });
  assert.deepEqual(Array.from(calls.pipelines[0][0].$vectorSearch.queryVector), [5, 1, 0, 0]);
  assert.equal(calls.pipelines[0][0].$vectorSearch.index, 'room_vector_index');
  assert.equal(calls.connected, 1);
  assert.equal(calls.closed, 1);
});

test('configured POST preserves the no-active-room error and closes the client', async () => {
  const { consumer, calls } = loadConsumer('src/app/api/room-matching/route.ts', { MONGODB_URI: 'synthetic-test-value' }, false, [{ isActive: false }]);
  const response = await consumer.POST({ json: async () => ({ sentiment: 5, hobbies: [1, 0, 0] }) });
  assert.equal(response.status, 500);
  assert.equal(response.body.success, false);
  assert.equal(calls.closed, 1);
});
