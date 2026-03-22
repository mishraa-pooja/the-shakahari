/**
 * Supabase Database types for the orders table.
 * Used by the Supabase client for type-safe inserts.
 */

export interface Database {
  public: {
    Tables: {
      orders: {
        Row: {
          id: string;
          order_id: string;
          name: string;
          phone: string;
          address: string;
          landmark: string | null;
          pincode: string;
          slot: string;
          notes: string | null;
          items: unknown;
          total: number;
          payment_method: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          name: string;
          phone: string;
          address: string;
          landmark?: string | null;
          pincode: string;
          slot: string;
          notes?: string | null;
          items: unknown;
          total: number;
          payment_method?: string;
          status?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
      };
    };
  };
}
