const Report = require('../models/Report');
const { asyncHandler, httpError } = require('../middleware/error');

exports.create = asyncHandler(async (req, res) => {
  const { targetType, targetId, reason, details } = req.body;
  if (!targetType || !targetId || !reason) throw httpError(400, 'Target and reason are required');
  if (targetType === 'User' && String(targetId) === String(req.user._id)) throw httpError(400, 'You cannot report yourself');
  res.status(201).json(await Report.create({ reporter: req.user._id, targetType, targetId, reason, details }));
});
