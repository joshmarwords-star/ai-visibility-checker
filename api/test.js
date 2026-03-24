module.exports = function handler(req, res) {
  res.status(200).json({ ok: true, env_set: !!process.env.DATAFORSEO_AUTH });
};
