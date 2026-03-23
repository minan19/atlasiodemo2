// Jest CJS mock for node-fetch (pure ESM package)
const fetch = jest.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: async () => ({}),
  text: async () => '',
});
fetch.default = fetch;
module.exports = fetch;
module.exports.default = fetch;
