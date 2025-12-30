// Auto-generated types from Supabase
// Run: npm run db:types to regenerate

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      jobs: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          customer_id: string | null;
          stage_id: string | null;
          job_address_street: string | null;
          job_address_city: string | null;
          job_address_state: string | null;
          job_address_zip: string | null;
          scheduled_date: string | null;
          scheduled_time_start: string | null;
          scheduled_time_end: string | null;
          quote_amount: number | null;
          final_amount: number | null;
          photos_required_before: boolean;
          photos_required_after: boolean;
          priority: number;
          internal_notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['jobs']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['jobs']['Insert']>;
      };
      customers: {
        Row: {
          id: string;
          name: string;
          company: string | null;
          email: string | null;
          phone: string | null;
          address_street: string | null;
          address_city: string | null;
          address_state: string | null;
          address_zip: string | null;
          notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['customers']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['customers']['Insert']>;
      };
      job_stages: {
        Row: {
          id: string;
          name: string;
          color: string;
          sort_order: number;
          is_field_visible: boolean;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['job_stages']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['job_stages']['Insert']>;
      };
      job_checklists: {
        Row: {
          id: string;
          job_id: string;
          template_id: string | null;
          name: string;
          is_master: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['job_checklists']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['job_checklists']['Insert']>;
      };
      job_checklist_items: {
        Row: {
          id: string;
          checklist_id: string;
          text: string;
          is_checked: boolean;
          checked_by: string | null;
          checked_at: string | null;
          sort_order: number;
          is_required: boolean;
        };
        Insert: Omit<Database['public']['Tables']['job_checklist_items']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['job_checklist_items']['Insert']>;
      };
      job_photos: {
        Row: {
          id: string;
          job_id: string;
          photo_type: 'before' | 'after' | 'progress' | 'other';
          caption: string | null;
          storage_path: string;
          uploaded_by: string | null;
          latitude: number | null;
          longitude: number | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['job_photos']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['job_photos']['Insert']>;
      };
      invoices: {
        Row: {
          id: string;
          job_id: string | null;
          customer_id: string | null;
          invoice_number: string | null;
          status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';
          subtotal: number;
          tax_rate: number;
          tax_amount: number;
          total: number;
          amount_paid: number;
          issue_date: string;
          due_date: string | null;
          paid_date: string | null;
          stripe_invoice_id: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['invoices']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['invoices']['Insert']>;
      };
      equipment: {
        Row: {
          id: string;
          name: string;
          type: string | null;
          make: string | null;
          model: string | null;
          status: 'active' | 'in_shop' | 'retired';
          next_service_date: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['equipment']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['equipment']['Insert']>;
      };
      shop_tasks: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          equipment_id: string | null;
          task_type: 'maintenance' | 'repair' | 'inspection' | 'other';
          assigned_to: string | null;
          due_date: string | null;
          completed_at: string | null;
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          priority: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['shop_tasks']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['shop_tasks']['Insert']>;
      };
    };
  };
}
