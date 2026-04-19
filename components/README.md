# QuantitySelector Component

A reusable React Native component for handling product quantity selection with multiple input methods.

## Features

- **Increment/Decrement buttons**: Standard +/- buttons for quantity adjustment
- **Tap-to-edit**: Tap the quantity display to enter a custom amount
- **Manual input section**: Dedicated text input with "Set" button (full version only)
- **Modal input**: Modal popup for quantity entry (compact version)
- **Stock validation**: Prevents exceeding available stock
- **Remove functionality**: Optional remove button for cart items
- **Compact mode**: Streamlined version for product cards

## Usage

### Compact Mode (Product Cards)

```jsx
<QuantitySelector
  product={item}
  currentQuantity={getCartQuantity(item.id)}
  onQuantityChange={(newQuantity) => {
    if (newQuantity === 0) {
      // Remove from cart
      CartWishlistService.removeFromCart(item.id);
    } else {
      // Update quantity
      CartWishlistService.updateCartQuantity(item.id, newQuantity);
    }
  }}
  compact={true}
/>
```

### Full Mode (Cart Screen)

```jsx
<QuantitySelector
  product={item}
  currentQuantity={item.quantity}
  onQuantityChange={(newQuantity) => updateQuantity(item.id, newQuantity)}
  onRemove={() => removeFromCart(item.id)}
  showRemoveButton={true}
/>
```

## Props

| Prop               | Type     | Default | Description                          |
| ------------------ | -------- | ------- | ------------------------------------ |
| `product`          | Object   | -       | Product object containing stock info |
| `currentQuantity`  | Number   | 0       | Current quantity in cart             |
| `onQuantityChange` | Function | -       | Callback when quantity changes       |
| `showRemoveButton` | Boolean  | false   | Show remove button                   |
| `onRemove`         | Function | -       | Callback for remove action           |
| `style`            | Object   | -       | Custom styles                        |
| `compact`          | Boolean  | false   | Use compact mode                     |

## Input Methods

1. **Increment/Decrement**: Use +/- buttons
2. **Tap quantity**: Tap the number to edit inline (full mode) or open modal (compact mode)
3. **Manual input**: Use the dedicated input field with "Set" button (full mode only)

## Stock Validation

The component automatically validates against `product.stock` and prevents:

- Setting quantity above available stock
- Invalid quantity values (non-numeric, negative, zero)

## Integration

The component is integrated into:

- `UserHome.js` - Product cards in compact mode
- `CategoryProducts.js` - Product cards in compact mode
- `Cart.js` - Cart items in full mode with remove button
