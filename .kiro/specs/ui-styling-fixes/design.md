# Design Document

## Overview

This design document outlines the technical implementation for fixing UI styling issues and implementing placeholder pages in the NOIR e-commerce platform. The implementation follows the monochrome luxury design system defined in `design_guidelines.json` and uses React with Tailwind CSS and Shadcn UI components.

## Architecture

The application follows a component-based architecture with:
- **Pages**: Route-level components in `src/pages/`
- **Components**: Reusable UI components in `src/components/`
- **Context**: Global state management via React Context in `src/context/`
- **UI Library**: Shadcn UI components in `src/components/ui/`

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        App.js                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              AppProviders (Context)                  │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐      │    │
│  │  │AuthContext│  │CartContext│  │WishlistContext│     │    │
│  │  └──────────┘  └──────────┘  └──────────────┘      │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
│  ┌────────────────────────┼────────────────────────────┐    │
│  │                    Navigation                        │    │
│  └────────────────────────┼────────────────────────────┘    │
│                           │                                  │
│  ┌────────────────────────┼────────────────────────────┐    │
│  │                   Page Routes                        │    │
│  │  HomePage │ ProductListPage │ CartPage │ etc.       │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### CartPage Component

```javascript
// Props: None (uses context)
// State:
interface CartPageState {
  products: Map<string, Product>;  // Cached product details
  loading: boolean;
  error: string | null;
}

// Methods:
- loadProductDetails(): Promise<void>
- handleQuantityChange(productId, size, color, newQty): void
- handleRemoveItem(productId, size, color): void
- calculateSubtotal(): number
- calculateTotal(): number
```

### CheckoutPage Component

```javascript
// Props: None (uses context)
// State:
interface CheckoutPageState {
  shippingAddress: {
    name: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    phone: string;
  };
  errors: Record<string, string>;
  processing: boolean;
  paymentStatus: 'idle' | 'processing' | 'success' | 'failed';
}

// Methods:
- validateForm(): boolean
- handleInputChange(field, value): void
- initiatePayment(): Promise<void>
- createOrder(paymentDetails): Promise<void>
```

### OrdersPage Component

```javascript
// Props: None (uses context)
// State:
interface OrdersPageState {
  orders: Order[];
  expandedOrderId: string | null;
  loading: boolean;
}

// Methods:
- loadOrders(): Promise<void>
- toggleOrderDetails(orderId): void
- getStatusColor(status): string
```

### WishlistPage Component

```javascript
// Props: None (uses context)
// State:
interface WishlistPageState {
  products: Product[];
  loading: boolean;
}

// Methods:
- loadWishlistProducts(): Promise<void>
- handleAddToCart(product): void
- handleRemoveFromWishlist(productId): void
```

### AdminPage Component

```javascript
// Props: None (uses context)
// State:
interface AdminPageState {
  activeTab: 'products' | 'orders';
  products: Product[];
  orders: Order[];
  editingProduct: Product | null;
  loading: boolean;
}

// Methods:
- loadProducts(): Promise<void>
- loadOrders(): Promise<void>
- handleCreateProduct(product): Promise<void>
- handleUpdateProduct(productId, product): Promise<void>
- handleDeleteProduct(productId): Promise<void>
- handleUpdateOrderStatus(orderId, status): Promise<void>
```

## Data Models

### Cart Item (existing)
```javascript
{
  product_id: string;
  quantity: number;
  size: string;
  color: string;
}
```

### Order (existing)
```javascript
{
  id: string;
  user_id: string;
  items: CartItem[];
  total: number;
  shipping_address: ShippingAddress;
  status: 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  created_at: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
}
```

### Shipping Address
```javascript
{
  name: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  phone: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Cart Display Completeness

*For any* cart containing items, the Cart_Page SHALL display all items with their complete information (image, name, size, color, quantity, price), and the displayed count SHALL equal the number of items in the cart state.

**Validates: Requirements 2.1**

### Property 2: Cart Total Calculation

*For any* cart state and any quantity adjustment, the cart subtotal SHALL equal the sum of (item.quantity × product.price) for all items, and this calculation SHALL update immediately after any quantity change.

**Validates: Requirements 2.2**

### Property 3: Cart Item Removal

*For any* cart containing an item, after removing that item, the cart SHALL no longer contain that item and the cart length SHALL decrease by one.

**Validates: Requirements 2.3**

### Property 4: Checkout Form Validation

*For any* form submission with invalid data (empty required fields, invalid phone format, invalid postal code), the Checkout_Page SHALL display a validation error for each invalid field and SHALL NOT proceed with payment.

**Validates: Requirements 3.3**

### Property 5: Orders Display Completeness

*For any* user with orders, the Orders_Page SHALL display all orders, and each order SHALL show order ID, date, status, total, and item count.

**Validates: Requirements 4.1, 4.2**

### Property 6: Wishlist Display Completeness

*For any* wishlist containing products, the Wishlist_Page SHALL display all products with image, name, price, and availability status.

**Validates: Requirements 5.1, 5.2**

### Property 7: Wishlist Item Removal

*For any* wishlist containing a product, after removing that product, the wishlist SHALL no longer contain that product.

**Validates: Requirements 5.4**

### Property 8: Admin Product List Completeness

*For any* product catalog, the Admin_Page products view SHALL display all products with name, price, stock, and action buttons.

**Validates: Requirements 6.3**

### Property 9: Admin Orders List Completeness

*For any* set of orders, the Admin_Page orders view SHALL display all orders with customer info, status, and total amount.

**Validates: Requirements 6.5**

### Property 10: Responsive Navigation Behavior

*For any* viewport width, the Navigation component SHALL display either mobile menu (width < 768px) or desktop menu (width >= 768px), never both simultaneously.

**Validates: Requirements 1.1, 1.2**

### Property 11: Product Image Grayscale Filter

*For any* product image in the application, the image SHALL have grayscale filter applied by default, and SHALL remove grayscale on hover.

**Validates: Requirements 7.3**

## Error Handling

### Network Errors
- Display toast notification with error message
- Provide retry option where applicable
- Maintain last known good state

### Authentication Errors
- Redirect to login for protected pages (Orders, Wishlist, Checkout)
- Display appropriate message for unauthorized access (Admin)

### Payment Errors
- Display clear error message
- Allow user to retry payment
- Do not create order on payment failure

### Validation Errors
- Display inline error messages below form fields
- Highlight invalid fields with border color
- Prevent form submission until errors resolved

## Testing Strategy

### Unit Tests
- Test cart calculation functions
- Test form validation logic
- Test status color mapping functions

### Property-Based Tests
Using a property-based testing library (e.g., fast-check for JavaScript):

1. **Cart calculations**: Generate random cart states and verify total calculations
2. **Form validation**: Generate random form inputs and verify validation behavior
3. **List completeness**: Generate random data sets and verify all items displayed

### Integration Tests
- Test page navigation flows
- Test context state updates across components
- Test API integration with mock responses

### Configuration
- Minimum 100 iterations per property test
- Tag format: **Feature: ui-styling-fixes, Property {number}: {property_text}**
