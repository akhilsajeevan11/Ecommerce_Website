# NOIR - Monochrome Luxury E-commerce

A complete e-commerce platform with 3D product visualization, built with FastAPI, React, and MongoDB.

## Features

- 🎨 Black & White minimalist design
- 🎭 3D product viewer with Three.js
- 🔄 360° product rotation
- 🛒 Complete shopping cart & checkout
- 💳 Razorpay payment integration
- ⭐ Product reviews & ratings
- 👤 User authentication & profiles
- 📦 Order management & tracking
- 🔐 Admin dashboard
- ❤️ Wishlist functionality

## Tech Stack

**Frontend:**
- React 19
- Tailwind CSS
- Shadcn UI
- Three.js / React Three Fiber
- Framer Motion
- Axios

**Backend:**
- FastAPI
- MongoDB (Motor)
- JWT Authentication
- Razorpay
- Bcrypt

## Setup Instructions

### Prerequisites
- Node.js 20+
- Python 3.10+
- MongoDB

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Update `.env` file with your credentials:
```
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=noir_db
JWT_SECRET=your-secret-key
RAZORPAY_KEY_ID=your_key
RAZORPAY_KEY_SECRET=your_secret
```

5. Run seed script to create sample data:
```bash
python ../scripts/seed_data.py
```

6. Start backend server:
```bash
python main.py
```

Backend will run on `http://localhost:8000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
yarn install
```

3. Update `.env` file:
```
REACT_APP_BACKEND_URL=http://localhost:8000
```

4. Start development server:
```bash
yarn start
```

Frontend will run on `http://localhost:3000`

## Default Credentials

After running seed script:

**Admin:**
- Email: admin@noir.com
- Password: admin123

**User:**
- Email: test@noir.com
- Password: test123

## Project Structure

```
/
├── frontend/
│   ├── public/
│   │   └── index.html (with Razorpay script)
│   └── src/
│       ├── components/
│       │   ├── ui/ (Shadcn components)
│       │   ├── Navigation.js
│       │   ├── AuthModal.js
│       │   ├── CartDrawer.js
│       │   ├── ProductViewer3D.js
│       │   ├── Product360Viewer.js
│       │   └── ProductCard.js
│       ├── context/
│       │   └── AppContext.js
│       ├── pages/
│       │   ├── HomePage.js
│       │   ├── ProductListPage.js
│       │   ├── ProductDetailPage.js
│       │   ├── CartPage.js
│       │   ├── CheckoutPage.js
│       │   ├── OrdersPage.js
│       │   ├── WishlistPage.js
│       │   └── AdminPage.js
│       ├── lib/
│       │   └── utils.js
│       ├── App.js
│       ├── App.css
│       └── index.css
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── .env
├── scripts/
│   └── seed_data.py
└── design_guidelines.json
```

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login user
- GET `/api/auth/me` - Get current user

### Products
- GET `/api/products` - Get all products
- GET `/api/products/{id}` - Get product by ID
- POST `/api/products` - Create product (Admin)
- PUT `/api/products/{id}` - Update product (Admin)
- DELETE `/api/products/{id}` - Delete product (Admin)

### Cart
- GET `/api/cart` - Get user cart
- POST `/api/cart` - Update cart

### Wishlist
- GET `/api/wishlist` - Get wishlist
- POST `/api/wishlist/add` - Add to wishlist
- POST `/api/wishlist/remove` - Remove from wishlist

### Orders
- GET `/api/orders` - Get user orders
- POST `/api/orders` - Create order
- GET `/api/admin/orders` - Get all orders (Admin)
- PUT `/api/admin/orders/{id}/status` - Update order status (Admin)

### Reviews
- GET `/api/reviews/{product_id}` - Get product reviews
- POST `/api/reviews` - Create review

### Payment
- POST `/api/payment/create-order` - Create Razorpay order

## Design Guidelines

See `design_guidelines.json` for complete design system including:
- Typography (Bodoni Moda, Manrope, JetBrains Mono)
- Color palette (Black & White with zinc grays)
- Component styles
- Layout strategies
- 3D viewer configuration

## License

MIT
