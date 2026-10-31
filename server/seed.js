/* Seeds CampusHub with demo data. Run: npm run seed */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Resource = require('./models/Resource');
const Exchange = require('./models/Exchange');
const Review = require('./models/Review');
const Post = require('./models/Post');
const LostFound = require('./models/LostFound');
const Activity = require('./models/Activity');
const Notification = require('./models/Notification');
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');
const Report = require('./models/Report');
const { recomputeTrust } = require('./utils/trust');
const { GREEN_POINTS } = require('./utils/constants');

const daysAgo = (n) => new Date(Date.now() - n * 864e5);

(async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campushub');
  console.log('Clearing collections...');
  await Promise.all([User, Resource, Exchange, Review, Post, LostFound, Activity, Notification, Conversation, Message, Report].map((m) => m.deleteMany({})));

  const people = [
    { name: 'Campus Admin', email: 'admin@campushub.edu', password: 'admin123', role: 'admin', department: 'Management', isVerified: true },
    { name: 'Priya Raman', email: 'priya@campus.edu', department: 'Computer Science', year: 3, interests: ['Electronics', 'arduino', 'programming', 'Books'], hostel: 'Kaveri Block' },
    { name: 'Arjun Kumar', email: 'arjun@campus.edu', department: 'Mechanical', year: 2, interests: ['Lab Equipment', 'drafter', 'Sports'], hostel: 'Vaigai Block' },
    { name: 'Meera Iyer', email: 'meera@campus.edu', department: 'Biotechnology', year: 4, interests: ['Books', 'lab coat', 'Notes'], hostel: 'Kaveri Block' },
    { name: 'Rahul Das', email: 'rahul@campus.edu', department: 'Electronics', year: 1, interests: ['Electronics', 'calculator', 'Stationery'] },
    { name: 'Sneha Pillai', email: 'sneha@campus.edu', department: 'Computer Science', year: 2, interests: ['Furniture', 'Clothing', 'cycle'] },
    { name: 'Karthik Subramani', email: 'karthik@campus.edu', department: 'Civil', year: 3, interests: ['Notes', 'Books', 'Sports'] }
  ];
  const users = [];
  for (const p of people) users.push(await User.create({ password: 'password123', isVerified: true, studentId: `CH${1000 + users.length}`, ...p }));
  const [, priya, arjun, meera, rahul, sneha, karthik] = users;
  console.log(`Created ${users.length} users`);

  const R = (owner, title, category, listingType, extra = {}) => ({
    owner: owner._id, department: owner.department, title, category, listingType,
    description: extra.description || `${title}. Well maintained and ready to use. Pick up from campus.`,
    condition: extra.condition || 'Good', price: extra.price || 0, rentPerDay: extra.rentPerDay || 0,
    swapFor: extra.swapFor || '', tags: extra.tags || [], location: extra.location || 'Main Library',
    views: extra.views || Math.floor(Math.random() * 60), createdAt: daysAgo(extra.ago || Math.floor(Math.random() * 40))
  });

  const resources = await Resource.insertMany([
    R(priya, 'Arduino Uno starter kit with sensors', 'Electronics', 'Sell', { price: 900, condition: 'Like New', tags: ['arduino', 'iot', 'sensors', 'microcontroller'], description: 'Arduino Uno R3, breadboard, 20 jumper wires, ultrasonic, DHT11 and IR sensors. Used for one mini-project.' }),
    R(priya, 'Introduction to Algorithms (CLRS) 3rd ed.', 'Books', 'Lend', { tags: ['algorithms', 'cse', 'clrs', 'dsa'], condition: 'Good' }),
    R(priya, 'Casio fx-991EX scientific calculator', 'Electronics', 'Rent', { rentPerDay: 15, tags: ['calculator', 'exam', 'casio'], condition: 'Like New' }),
    R(arjun, 'Mini drafter and drawing board set', 'Lab Equipment', 'Sell', { price: 450, tags: ['drafter', 'engineering drawing', 'first year'], location: 'Mech Block' }),
    R(arjun, 'Cricket bat (English willow)', 'Sports', 'Swap', { swapFor: 'Football or badminton racquet', tags: ['cricket', 'bat'], location: 'Sports Complex' }),
    R(arjun, 'Thermodynamics by P.K. Nag', 'Books', 'Sell', { price: 250, tags: ['thermodynamics', 'mechanical', 'textbook'] }),
    R(meera, 'Lab coat (size M) and safety goggles', 'Lab Equipment', 'Donate', { tags: ['lab coat', 'goggles', 'chemistry', 'biotech'], location: 'Bio Block' }),
    R(meera, 'Molecular Biology handwritten notes (Sem 5)', 'Notes', 'Donate', { tags: ['molecular biology', 'notes', 'biotech'], condition: 'Good' }),
    R(meera, 'Lehninger Principles of Biochemistry', 'Books', 'Sell', { price: 600, condition: 'Like New', tags: ['biochemistry', 'lehninger', 'textbook'] }),
    R(rahul, 'Digital multimeter DT830D', 'Electronics', 'Lend', { tags: ['multimeter', 'ece', 'lab'], location: 'ECE Lab 2' }),
    R(rahul, 'Soldering iron kit 25W with stand', 'Electronics', 'Rent', { rentPerDay: 10, tags: ['soldering', 'electronics', 'diy'] }),
    R(rahul, 'A4 graph sheets and record notebooks bundle', 'Stationery', 'Donate', { tags: ['record', 'graph sheet', 'stationery'] }),
    R(sneha, 'Study table with drawer', 'Furniture', 'Sell', { price: 1200, condition: 'Good', tags: ['table', 'hostel', 'furniture'], location: 'Kaveri Block', description: 'Sturdy wooden study table, fits hostel rooms. Graduating seniors leaving soon, pickup only.' }),
    R(sneha, 'Hercules bicycle with lock', 'Sports', 'Rent', { rentPerDay: 40, tags: ['cycle', 'bicycle', 'commute'], location: 'Main Gate' }),
    R(sneha, 'Formal blazer (size S) for placements', 'Clothing', 'Lend', { tags: ['blazer', 'formal', 'placement', 'interview'] }),
    R(sneha, 'Python Crash Course book', 'Books', 'Swap', { swapFor: 'Any web development book', tags: ['python', 'programming', 'beginner'] }),
    R(karthik, 'Surveying instruments notes and lab manual', 'Notes', 'Sell', { price: 80, tags: ['surveying', 'civil', 'lab manual'] }),
    R(karthik, 'Badminton racquet pair (Yonex)', 'Sports', 'Swap', { swapFor: 'Cricket bat', tags: ['badminton', 'yonex', 'racquet'] }),
    R(karthik, 'Table lamp LED', 'Furniture', 'Donate', { tags: ['lamp', 'hostel', 'study'] }),
    R(karthik, 'Strength of Materials by R.K. Bansal', 'Books', 'Sell', { price: 220, tags: ['som', 'civil', 'mechanical', 'textbook'] }),
    R(priya, 'Raspberry Pi 4 (4GB) with case', 'Electronics', 'Sell', { price: 3800, condition: 'Like New', tags: ['raspberry pi', 'iot', 'linux'] }),
    R(rahul, 'Electronic Devices by Floyd', 'Books', 'Lend', { tags: ['electronics', 'ece', 'devices'] }),
    R(meera, 'Micropipette set (used, calibrated)', 'Lab Equipment', 'Rent', { rentPerDay: 25, tags: ['micropipette', 'biotech', 'lab'] }),
    R(arjun, 'Hostel bucket, mug and hangers', 'Other', 'Donate', { tags: ['hostel', 'essentials', 'first year'] })
  ]);
  console.log(`Created ${resources.length} listings`);
  const byTitle = (t) => resources.find((r) => r.title.startsWith(t));

  // Completed exchanges spread across months for the impact dashboard
  const completedSpecs = [
    [byTitle('Lab coat'), rahul, 150],
    [byTitle('Thermodynamics'), karthik, 120, 230],
    [byTitle('Hostel bucket'), rahul, 95],
    [byTitle('Study table'), priya, 70, 1100],
    [byTitle('Strength of'), arjun, 50, 200],
    [byTitle('Molecular Biology'), sneha, 35],
    [byTitle('A4 graph'), arjun, 20],
    [byTitle('Table lamp'), meera, 8]
  ];
  const exchanges = [];
  for (const [res, requester, ago, price] of completedSpecs) {
    const ex = await Exchange.create({
      resource: res._id, requester: requester._id, owner: res.owner, type: res.listingType, category: res.category,
      offeredPrice: price || 0, status: 'Completed', ownerConfirmed: true, requesterConfirmed: true,
      completedAt: daysAgo(ago), meetupLocation: 'Main Library', createdAt: daysAgo(ago + 2),
      history: [{ status: 'Pending', note: 'Request sent', by: requester._id, at: daysAgo(ago + 2) }, { status: 'Completed', note: 'Both parties confirmed', by: res.owner, at: daysAgo(ago) }]
    });
    res.status = 'Exchanged';
    await res.save();
    exchanges.push(ex);
    await User.updateMany({ _id: { $in: [res.owner, requester._id] } }, { $inc: { completedExchanges: 1, greenPoints: GREEN_POINTS[res.listingType] } });
  }
  // A completed lend (item returns to available)
  const clrs = byTitle('Introduction to Algorithms');
  exchanges.push(await Exchange.create({ resource: clrs._id, requester: sneha._id, owner: priya._id, type: 'Lend', category: 'Books', status: 'Completed', ownerConfirmed: true, requesterConfirmed: true, completedAt: daysAgo(12), startDate: daysAgo(30), endDate: daysAgo(12) }));
  await User.updateMany({ _id: { $in: [priya._id, sneha._id] } }, { $inc: { completedExchanges: 1, greenPoints: GREEN_POINTS.Lend } });

  // Open requests to demo the workflow
  await Exchange.create({ resource: byTitle('Arduino')._id, requester: rahul._id, owner: priya._id, type: 'Sell', category: 'Electronics', offeredPrice: 800, message: 'Hi! Need it for my mini project. Can you do 800?', history: [{ status: 'Pending', note: 'Request sent', by: rahul._id }] });
  await Exchange.create({ resource: byTitle('Hercules bicycle')._id, requester: priya._id, owner: sneha._id, type: 'Rent', category: 'Sports', offeredPrice: 200, startDate: daysAgo(-2), endDate: daysAgo(-6), message: 'Need it for 5 days', history: [{ status: 'Pending', note: 'Request sent', by: priya._id }] });
  const cricket = byTitle('Cricket bat');
  const badminton = byTitle('Badminton');
  await Exchange.create({ resource: cricket._id, requester: karthik._id, owner: arjun._id, type: 'Swap', category: 'Sports', offeredResource: badminton._id, message: 'Swap for my Yonex pair?', status: 'Accepted', meetupLocation: 'Sports Complex', meetupTime: daysAgo(-1), history: [{ status: 'Pending', by: karthik._id }, { status: 'Accepted', by: arjun._id }] });
  cricket.status = 'Reserved';
  await cricket.save();

  // Reviews
  const reviewTexts = [
    [5, 'Smooth hand-over, item exactly as described.', ['Item as described', 'Punctual']],
    [4, 'Good condition, slight delay in meeting.', ['Item as described']],
    [5, 'Super friendly and helpful!', ['Friendly', 'Punctual']],
    [5, 'Great deal, would exchange again.', ['Fair price', 'Friendly']]
  ];
  for (const [i, ex] of exchanges.entries()) {
    const [rating, comment, tags] = reviewTexts[i % reviewTexts.length];
    await Review.create({ reviewer: ex.requester, reviewee: ex.owner, exchange: ex._id, rating, comment, tags });
    await Review.create({ reviewer: ex.owner, reviewee: ex.requester, exchange: ex._id, rating: Math.max(4, rating - (i % 2)), comment: 'Responsive and on time.', tags: ['Punctual'] });
    ex.reviewedBy = [ex.requester, ex.owner];
    await ex.save();
  }

  await Post.insertMany([
    { author: users[0]._id, type: 'Announcement', title: 'Swap Week starts Monday', content: 'Bring your unused books, lab gear and hostel items to the Main Library foyer from Monday to Friday, 4-6 PM. Every completed exchange during Swap Week earns double green points.', tags: ['swapweek', 'event'], pinned: true },
    { author: meera._id, type: 'Tip', title: 'How to keep borrowed lab coats clean', content: 'Wash in cold water separately, avoid bleach on the logo, and return it ironed. Small things build trust scores!', tags: ['lab', 'tips'], likes: [priya._id, rahul._id] },
    { author: rahul._id, type: 'Question', title: 'Anyone has the Network Theory lab manual?', content: 'First year ECE here. Looking to borrow the Network Theory manual for a week before the internals.', tags: ['ece', 'lab manual'], comments: [{ user: priya._id, text: 'Check with Karthik, his roommate had one.' }] },
    { author: sneha._id, type: 'Event', title: 'Book drive for the village library', content: 'NSS is collecting school-level books this weekend. Drop them at the NSS room, Admin Block.', tags: ['nss', 'donation'], eventDate: daysAgo(-5), likes: [meera._id, karthik._id, arjun._id] },
    { author: arjun._id, type: 'Request', title: 'Need a drafter for one week', content: 'Mine broke before the engineering drawing exam. Will return in perfect condition.', tags: ['drafter', 'urgent'] }
  ]);

  await LostFound.insertMany([
    { type: 'Lost', title: 'Black Casio calculator', description: 'Lost my black Casio fx-991 calculator with my name sticker on the back.', category: 'Electronics', location: 'Exam Hall B', date: daysAgo(3), reporter: rahul._id, contact: 'Message on CampusHub' },
    { type: 'Found', title: 'Casio scientific calculator found', description: 'Found a black Casio calculator near exam hall B after the afternoon session.', category: 'Electronics', location: 'Exam Hall B corridor', date: daysAgo(2), reporter: meera._id },
    { type: 'Found', title: 'Blue water bottle (Milton)', description: 'Blue steel bottle left in the library reading room.', category: 'Other', location: 'Main Library reading room', date: daysAgo(1), reporter: karthik._id },
    { type: 'Lost', title: 'ID card and hostel key', description: 'Lost my student ID card in a brown pouch with a hostel room key attached.', category: 'Other', location: 'Canteen', date: daysAgo(4), reporter: sneha._id }
  ]);

  // Behaviour data for recommendations / analytics
  const acts = [];
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const searches = ['arduino', 'calculator', 'drafter', 'lab coat', 'cycle', 'python book', 'notes', 'multimeter', 'table'];
  for (const u of users.slice(1)) {
    for (let i = 0; i < 25; i++) {
      const res = pick(resources);
      acts.push({ user: u._id, action: pick(['view', 'view', 'view', 'wishlist', 'request']), resource: res._id, category: res.category, createdAt: daysAgo(Math.random() * 25) });
    }
    for (let i = 0; i < 4; i++) acts.push({ user: u._id, action: 'search', query: pick(searches), createdAt: daysAgo(Math.random() * 25) });
  }
  await Activity.insertMany(acts);

  const conv = await Conversation.create({ participants: [rahul._id, priya._id], resource: byTitle('Arduino')._id, lastMessage: 'Offer: ₹800', lastMessageAt: new Date() });
  await Message.insertMany([
    { conversation: conv._id, sender: rahul._id, text: 'Hi Priya, is the Arduino kit still available?', readBy: [rahul._id, priya._id], createdAt: daysAgo(0.2) },
    { conversation: conv._id, sender: priya._id, text: 'Yes! All sensors are included.', readBy: [rahul._id, priya._id], createdAt: daysAgo(0.18) },
    { conversation: conv._id, sender: rahul._id, kind: 'offer', text: 'Offered ₹800', offer: { amount: 800, status: 'Pending' }, readBy: [rahul._id], createdAt: daysAgo(0.1) }
  ]);

  for (const u of users) await recomputeTrust(u._id);
  await Notification.create({ user: priya._id, type: 'exchange', message: 'Rahul Das sent a sell request for "Arduino Uno starter kit with sensors"', link: '/exchanges' });

  console.log('\nSeed complete. Sign in with:');
  console.log('  Admin   admin@campushub.edu / admin123');
  console.log('  Student priya@campus.edu / password123  (also arjun, meera, rahul, sneha, karthik)');
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
