/**
 * Zod schemas for checkout form and API order validation.
 */

import { z } from "zod";

const SLOTS = ["12 PM", "1 PM", "2 PM", "3 PM"] as const;

const orderItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().positive(),
  quantity: z.number().int().positive(),
});

export const checkoutFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  address: z.string().min(10, "Please enter a complete address"),
  landmark: z.string().optional(),
  pincode: z.string().regex(/^\d{6}$/, "Pincode must be 6 digits"),
  slot: z.enum(SLOTS, {
    message: "Please select a delivery slot",
  }),
  notes: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const orderPayloadSchema = z.object({
  name: z.string().min(2),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  address: z.string().min(10),
  landmark: z.string().optional(),
  pincode: z.string().regex(/^\d{6}$/),
  slot: z.enum(SLOTS),
  notes: z.string().optional(),
  items: z.array(orderItemSchema).min(1, "Cart is empty"),
  total: z.number().positive(),
  paymentMethod: z.literal("COD"),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;
