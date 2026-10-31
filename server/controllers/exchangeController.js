const Exchange = require('../models/Exchange');
const Resource = require('../models/Resource');
const User = require('../models/User');
const Activity = require('../models/Activity');
const notify = require('../utils/notify');
const { recomputeTrust } = require('../utils/trust');
const { GREEN_POINTS } = require('../utils/constants');
const { asyncHandler, httpError } = require('../middleware/error');

const POP = [
  { path: 'resource', select: 'title images listingType price rentPerDay category status' },
  { path: 'offeredResource', select: 'title images category' },
  { path: 'requester', select: 'name avatar trustScore ratingAvg' },
  { path: 'owner', select: 'name avatar trustScore ratingAvg' }
];

exports.create = asyncHandler(async (req, res) => {
  const { resourceId, offeredPrice, offeredResourceId, message, startDate, endDate, meetupLocation, meetupTime } = req.body;
  const resource = await Resource.findById(resourceId);
  if (!resource) throw httpError(404, 'Listing not found');
  if (resource.owner.equals(req.user._id)) throw httpError(400, 'You cannot request your own listing');
  if (resource.status !== 'Available') throw httpError(400, 'This item is no longer available');
  const dup = await Exchange.findOne({ resource: resourceId, requester: req.user._id, status: { $in: ['Pending', 'Accepted'] } });
  if (dup) throw httpError(400, 'You already have an open request for this item');

  const data = {
    resource: resource._id,
    requester: req.user._id,
    owner: resource.owner,
    type: resource.listingType,
    category: resource.category,
    message,
    meetupLocation,
    meetupTime: meetupTime || undefined,
    history: [{ status: 'Pending', note: 'Request sent', by: req.user._id }]
  };
  if (resource.listingType === 'Sell') data.offeredPrice = Number(offeredPrice) || resource.price;
  if (['Rent', 'Lend'].includes(resource.listingType)) {
    if (!startDate || !endDate) throw httpError(400, 'Pick start and end dates for borrowing');
    if (new Date(endDate) < new Date(startDate)) throw httpError(400, 'End date must be after the start date');
    data.startDate = startDate;
    data.endDate = endDate;
    if (resource.listingType === 'Rent') {
      const days = Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / 864e5) + 1);
      data.offeredPrice = days * resource.rentPerDay;
    }
  }
  if (resource.listingType === 'Swap') {
    const offered = await Resource.findOne({ _id: offeredResourceId, owner: req.user._id, status: 'Available' });
    if (!offered) throw httpError(400, 'Choose one of your available listings to offer in the swap');
    data.offeredResource = offered._id;
  }

  const ex = await Exchange.create(data);
  Activity.create({ user: req.user._id, action: 'request', resource: resource._id, category: resource.category }).catch(() => {});
  await notify(req, resource.owner, {
    type: 'exchange',
    message: `${req.user.name} sent a ${resource.listingType.toLowerCase()} request for "${resource.title}"`,
    link: '/exchanges'
  });
  res.status(201).json(await ex.populate(POP));
});

exports.list = asyncHandler(async (req, res) => {
  const { role = 'all', status } = req.query;
  const me = req.user._id;
  const filter = role === 'incoming' ? { owner: me } : role === 'outgoing' ? { requester: me } : { $or: [{ owner: me }, { requester: me }] };
  if (status) filter.status = status;
  res.json(await Exchange.find(filter).sort('-updatedAt').populate(POP));
});

exports.get = asyncHandler(async (req, res) => {
  const ex = await Exchange.findById(req.params.id).populate(POP);
  if (!ex) throw httpError(404, 'Exchange not found');
  const me = String(req.user._id);
  if (![String(ex.owner._id), String(ex.requester._id)].includes(me) && req.user.role !== 'admin') throw httpError(403, 'Not your exchange');
  res.json(ex);
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const { action, note, meetupLocation, meetupTime } = req.body;
  const ex = await Exchange.findById(req.params.id).populate('resource');
  if (!ex) throw httpError(404, 'Exchange not found');
  const isOwner = ex.owner.equals(req.user._id);
  const isRequester = ex.requester.equals(req.user._id);
  if (!isOwner && !isRequester) throw httpError(403, 'Not your exchange');
  const title = ex.resource?.title || 'the item';
  const other = isOwner ? ex.requester : ex.owner;

  if (action === 'accept') {
    if (!isOwner || ex.status !== 'Pending') throw httpError(400, 'Only pending requests can be accepted by the owner');
    if (ex.resource.status !== 'Available') throw httpError(400, 'This item is already reserved for another request');
    ex.status = 'Accepted';
    if (meetupLocation) ex.meetupLocation = meetupLocation;
    if (meetupTime) ex.meetupTime = meetupTime;
    ex.resource.status = 'Reserved';
    await ex.resource.save();
  } else if (action === 'reject') {
    if (!isOwner || ex.status !== 'Pending') throw httpError(400, 'Only pending requests can be declined');
    ex.status = 'Rejected';
  } else if (action === 'cancel') {
    if (!['Pending', 'Accepted'].includes(ex.status)) throw httpError(400, 'This exchange can no longer be cancelled');
    if (ex.status === 'Accepted' && ex.resource) {
      ex.resource.status = 'Available';
      await ex.resource.save();
    }
    ex.status = 'Cancelled';
  } else if (action === 'schedule') {
    if (ex.status !== 'Accepted') throw httpError(400, 'Meetups can be scheduled after acceptance');
    ex.meetupLocation = meetupLocation || ex.meetupLocation;
    ex.meetupTime = meetupTime || ex.meetupTime;
  } else {
    throw httpError(400, 'Unknown action');
  }

  ex.history.push({ status: ex.status, note: note || action, by: req.user._id });
  await ex.save();
  const verb = { accept: 'accepted', reject: 'declined', cancel: 'cancelled', schedule: 'updated the meetup for' }[action];
  await notify(req, other, { type: 'exchange', message: `${req.user.name} ${verb} the exchange for "${title}"`, link: '/exchanges' });
  res.json(await Exchange.findById(ex._id).populate(POP));
});

// Both parties confirm hand-over / return; on double confirmation the exchange completes
exports.confirm = asyncHandler(async (req, res) => {
  const ex = await Exchange.findById(req.params.id).populate('resource');
  if (!ex) throw httpError(404, 'Exchange not found');
  if (ex.status !== 'Accepted') throw httpError(400, 'Only accepted exchanges can be confirmed');
  const isOwner = ex.owner.equals(req.user._id);
  const isRequester = ex.requester.equals(req.user._id);
  if (!isOwner && !isRequester) throw httpError(403, 'Not your exchange');
  if (isOwner) ex.ownerConfirmed = true;
  if (isRequester) ex.requesterConfirmed = true;

  if (ex.ownerConfirmed && ex.requesterConfirmed) {
    ex.status = 'Completed';
    ex.completedAt = new Date();
    ex.history.push({ status: 'Completed', note: 'Both parties confirmed', by: req.user._id });
    if (ex.resource) {
      const returnable = ['Rent', 'Lend'].includes(ex.type);
      ex.resource.status = returnable ? 'Available' : 'Exchanged';
      await ex.resource.save();
      if (!returnable) {
        await Exchange.updateMany({ resource: ex.resource._id, status: 'Pending', _id: { $ne: ex._id } }, { status: 'Rejected' });
      }
    }
    if (ex.offeredResource) await Resource.updateOne({ _id: ex.offeredResource }, { status: 'Exchanged' });
    const pts = GREEN_POINTS[ex.type] || 10;
    await User.updateMany({ _id: { $in: [ex.owner, ex.requester] } }, { $inc: { completedExchanges: 1, greenPoints: pts } });
    await Promise.all([recomputeTrust(ex.owner), recomputeTrust(ex.requester)]);
    for (const uid of [ex.owner, ex.requester]) {
      await notify(req, uid, {
        type: 'review',
        message: `Exchange for "${ex.resource?.title}" completed. You earned ${pts} green points. Leave a review!`,
        link: '/exchanges'
      });
    }
  } else {
    ex.history.push({ status: 'Accepted', note: `${isOwner ? 'Owner' : 'Requester'} confirmed`, by: req.user._id });
    await notify(req, isOwner ? ex.requester : ex.owner, {
      type: 'exchange',
      message: `${req.user.name} confirmed the hand-over for "${ex.resource?.title}". Confirm on your side to complete it.`,
      link: '/exchanges'
    });
  }
  await ex.save();
  res.json(await Exchange.findById(ex._id).populate(POP));
});
