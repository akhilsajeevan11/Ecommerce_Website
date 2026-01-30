# Implementation Plan: UI Styling Fixes

## Overview

This implementation plan covers fixing responsive navigation, implementing placeholder pages (Cart, Checkout, Orders, Wishlist, Admin), and ensuring consistent design system application across the NOIR e-commerce platform.

## Tasks

- [x] 1. Fix Responsive Navigation CSS
  - Add missing responsive utility classes to App.css
  - Verify mobile/desktop menu toggle behavior
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Implement Cart Page
  - [x] 2.1 Create CartPage component with cart item display
    - Fetch product details for cart items
    - Display product image, name, size, color, quantity, price
    - Implement quantity adjustment controls
    - Implement remove item functionality
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 2.2 Add cart summary section
    - Display subtotal calculation
    - Display shipping estimate
    - Display total
    - Add "Proceed to Checkout" button
    - _Requirements: 2.4, 2.6_

  - [x] 2.3 Implement empty cart state
    - Display empty message when cart has no items
    - Add "Continue Shopping" link
    - _Requirements: 2.5_

  - [ ]* 2.4 Write property test for cart total calculation
    - **Property 2: Cart Total Calculation**
    - **Validates: Requirements 2.2**

- [x] 3. Implement Checkout Page
  - [x] 3.1 Create CheckoutPage component with order summary
    - Display all cart items with totals
    - Show item images, names, quantities, prices
    - _Requirements: 3.1_

  - [x] 3.2 Implement shipping address form
    - Add form fields: name, address, city, state, postal code, phone
    - Implement form validation with error display
    - _Requirements: 3.2, 3.3_

  - [x] 3.3 Integrate Razorpay payment
    - Create payment order via API
    - Handle Razorpay checkout flow
    - Process payment success/failure
    - Create order on successful payment
    - _Requirements: 3.4, 3.5, 3.6_

  - [ ]* 3.4 Write property test for form validation
    - **Property 4: Checkout Form Validation**
    - **Validates: Requirements 3.3**

- [ ] 4. Checkpoint - Cart and Checkout
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement Orders Page
  - [x] 5.1 Create OrdersPage component with order list
    - Fetch user orders from API
    - Display order ID, date, status, total, item count
    - Implement expandable order details
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 5.2 Implement empty and auth states
    - Display empty state when no orders
    - Handle unauthenticated users
    - _Requirements: 4.4, 4.5_

  - [ ]* 5.3 Write property test for orders display
    - **Property 5: Orders Display Completeness**
    - **Validates: Requirements 4.1, 4.2**

- [x] 6. Implement Wishlist Page
  - [x] 6.1 Create WishlistPage component with product grid
    - Fetch wishlist product details
    - Display product image, name, price, availability
    - _Requirements: 5.1, 5.2_

  - [x] 6.2 Implement wishlist actions
    - Add "Add to Cart" functionality
    - Add "Remove from Wishlist" functionality
    - _Requirements: 5.3, 5.4_

  - [x] 6.3 Implement empty and auth states
    - Display empty state when wishlist is empty
    - Handle unauthenticated users
    - _Requirements: 5.5, 5.6_

  - [ ]* 6.4 Write property test for wishlist removal
    - **Property 7: Wishlist Item Removal**
    - **Validates: Requirements 5.4**

- [ ] 7. Checkpoint - Orders and Wishlist
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement Admin Page
  - [x] 8.1 Create AdminPage component with tab navigation
    - Implement Products and Orders tabs
    - Add admin access check
    - _Requirements: 6.1, 6.2_

  - [x] 8.2 Implement Products management section
    - Display product list with name, price, stock
    - Add create product form/modal
    - Add edit product functionality
    - Add delete product functionality
    - _Requirements: 6.3, 6.4_

  - [x] 8.3 Implement Orders management section
    - Display all orders with customer info, status, total
    - Add order status update dropdown
    - _Requirements: 6.5, 6.6_

  - [ ]* 8.4 Write property test for admin product list
    - **Property 8: Admin Product List Completeness**
    - **Validates: Requirements 6.3**

- [-] 9. Apply Design System Consistency
  - [x] 9.1 Verify typography across all pages
    - Ensure Bodoni Moda for headings
    - Ensure Manrope for body text
    - Ensure JetBrains Mono for prices/technical text
    - _Requirements: 7.1, 7.2_

  - [x] 9.2 Verify component styling
    - Ensure rounded-none on buttons and inputs
    - Ensure consistent spacing (px-6, px-12, px-24)
    - Ensure grayscale images with hover effect
    - _Requirements: 7.3, 7.4, 7.5_

  - [x] 9.3 Verify page transitions
    - Ensure fade-up + blur animation on all pages
    - _Requirements: 7.6_

- [ ] 10. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
