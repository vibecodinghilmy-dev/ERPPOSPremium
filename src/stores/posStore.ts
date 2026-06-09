import { create } from 'zustand'
import type { CartItem } from '@/types'

interface POSState {
  cart: CartItem[]
  orderType: 'dine_in' | 'take_away' | 'delivery'
  paymentMethod: 'cash' | 'qris' | 'debit'
  addItem: (item: CartItem) => void
  setQuantity: (productId: string, quantity: number) => void
  removeItem: (productId: string) => void
  clearCart: () => void
  setOrderType: (type: 'dine_in' | 'take_away' | 'delivery') => void
  setPaymentMethod: (method: 'cash' | 'qris' | 'debit') => void
}

export const usePOSStore = create<POSState>((set) => ({
  cart: [],
  orderType: 'dine_in',
  paymentMethod: 'cash',
  addItem: (item) =>
    set((state) => {
      const existing = state.cart.find((i) => i.product_id === item.product_id)
      if (existing) {
        return {
          cart: state.cart.map((i) =>
            i.product_id === item.product_id
              ? { ...i, quantity: i.quantity + 1, total_price: (i.quantity + 1) * i.unit_price }
              : i
          ),
        }
      }
      return { cart: [...state.cart, item] }
    }),
  setQuantity: (productId, quantity) =>
    set((state) => ({
      cart: quantity <= 0
        ? state.cart.filter((i) => i.product_id !== productId)
        : state.cart.map((i) =>
            i.product_id === productId
              ? { ...i, quantity, total_price: quantity * i.unit_price }
              : i
          ),
    })),
  removeItem: (productId) =>
    set((state) => ({
      cart: state.cart.filter((i) => i.product_id !== productId),
    })),
  clearCart: () => set({ cart: [] }),
  setOrderType: (orderType) => set({ orderType }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
}))

export const usePOSSelectors = {
  subtotal: (state: POSState) =>
    state.cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0),
  tax: (state: POSState) =>
    state.cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0) * 0.11,
  total: (state: POSState) => {
    const sub = state.cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
    return sub + sub * 0.11
  },
  itemCount: (state: POSState) =>
    state.cart.reduce((sum, item) => sum + item.quantity, 0),
}