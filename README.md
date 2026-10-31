# CampusHub — Collaborative Resource Sharing & Exchange Platform (MERN)

Students sell, rent, lend, swap and donate campus resources; lost & found with auto-matching; community hub; AI recommendations; trust & reviews; admin dashboard; circular-economy impact dashboard.

## Requirements
- Node.js 18+
- MongoDB 6+ (local or MongoDB Atlas)

## Run locally
```bash
# 1. API
cd server
cp .env.example .env        # set MONGO_URI and JWT_SECRET
npm install
npm run seed                # demo users, listings, exchanges, reviews, posts
npm run dev                 # http://localhost:5000

# 2. Client (new terminal)
cd client
npm install
npm run dev                 # http://localhost:5173 (proxies /api, /uploads, /socket.io)
```

Demo logins: `priya@campus.edu` / `password123` (also arjun, meera, rahul, sneha, karthik) · Admin: `admin@campushub.edu` / `admin123`

## Production
```bash
cd client && npm run build
cd ../server && NODE_ENV=production npm start   # serves client/dist + API on one port
```

## Modules → where they live
| Module | Backend | Frontend |
|---|---|---|
| 1 Auth & profile | `authController`, `userController`, `middleware/auth.js` | `Auth.jsx`, `Profile.jsx` |
| 2 Listings | `resourceController` (multer image upload) | `ResourceForm.jsx`, `MyListings.jsx`, `ResourceDetail.jsx` |
| 3 Smart search | text index + fuzzy fallback, autocomplete | `Browse.jsx`, header search |
| 4 Exchanges | `exchangeController` (dual confirmation, points) | `Exchanges.jsx` |
| 5 Chat & negotiation | `messageController`, `socket.js` (presence, typing) | `Messages.jsx` |
| 6 Lost & found | `lostFoundController`, matching in `utils/recommend.js` | `LostFound.jsx` |
| 7 Community | `communityController` | `Community.jsx` |
| 8 AI & analytics | `utils/recommend.js`, `aiController` | `Dashboard.jsx`, `Insights.jsx` |
| 9 Reviews & trust | `reviewController`, `utils/trust.js`, reports | `Exchanges.jsx`, `Profile.jsx` |
| 10 Admin | `adminController` | `Admin.jsx` |
| 11 Circular economy | `impactController`, factors in `utils/constants.js` | `Impact.jsx` |

Extras: wishlist, real-time notifications, green points & badges, AI price suggestion, similar items, auto-hide after 3 reports, admin broadcast, campus-email auto-verification.

Impact figures (CO₂, waste, value) are estimates from per-category factors in `server/utils/constants.js`; lend/rent count at half weight.
