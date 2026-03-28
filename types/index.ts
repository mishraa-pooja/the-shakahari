/**
 * Shared TypeScript types for menu items, cart, orders, and API payloads.
 */

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  /** Path under public/, e.g. /images/PaneerBiryani.png */
  image?: string;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface OrderItemPayload {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface OrderPayload {
  name: string;
  phone: string;
  address: string;
  landmark?: string;
  pincode: string;
  slot: string;
  notes?: string;
  items: OrderItemPayload[];
  total: number;
  paymentMethod: string;
  latitude?: number;
  longitude?: number;
}

export interface OrderRecord {
  id: string;
  order_id: string;
  name: string;
  phone: string;
  address: string;
  landmark: string | null;
  pincode: string;
  slot: string;
  notes: string | null;
  items: OrderItemPayload[];
  total: number;
  payment_method: string;
  status: string;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
}
