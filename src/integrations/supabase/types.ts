export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      coachs: {
        Row: {
          created_at: string
          id: string
          mot_de_passe: string
          nom: string
        }
        Insert: {
          created_at?: string
          id?: string
          mot_de_passe: string
          nom: string
        }
        Update: {
          created_at?: string
          id?: string
          mot_de_passe?: string
          nom?: string
        }
        Relationships: []
      }
      entrainements: {
        Row: {
          created_at: string
          date: string
          equipe: string
          heure: string
          id: string
          lieu: string | null
        }
        Insert: {
          created_at?: string
          date: string
          equipe?: string
          heure: string
          id?: string
          lieu?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          equipe?: string
          heure?: string
          id?: string
          lieu?: string | null
        }
        Relationships: []
      }
      etoiles_joueuses: {
        Row: {
          date: string
          etoiles: number
          id: string
          joueuse_id: string
          mission_id: string | null
          motif: string | null
        }
        Insert: {
          date?: string
          etoiles: number
          id?: string
          joueuse_id: string
          mission_id?: string | null
          motif?: string | null
        }
        Update: {
          date?: string
          etoiles?: number
          id?: string
          joueuse_id?: string
          mission_id?: string | null
          motif?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "etoiles_joueuses_joueuse_id_fkey"
            columns: ["joueuse_id"]
            isOneToOne: false
            referencedRelation: "joueuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etoiles_joueuses_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      historique_flammes: {
        Row: {
          coach: string | null
          date: string
          id: string
          joueuse_id: string
          motif: string
          variation: number
        }
        Insert: {
          coach?: string | null
          date?: string
          id?: string
          joueuse_id: string
          motif: string
          variation: number
        }
        Update: {
          coach?: string | null
          date?: string
          id?: string
          joueuse_id?: string
          motif?: string
          variation?: number
        }
        Relationships: [
          {
            foreignKeyName: "historique_flammes_joueuse_id_fkey"
            columns: ["joueuse_id"]
            isOneToOne: false
            referencedRelation: "joueuses"
            referencedColumns: ["id"]
          },
        ]
      }
      joueuses: {
        Row: {
          created_at: string
          date_naissance: string
          equipe: string
          flamme_actuelle: number
          id: string
          licence: string | null
          photo: string | null
          prenom: string
          record_flamme: number
          statut_blessure: string
        }
        Insert: {
          created_at?: string
          date_naissance: string
          equipe?: string
          flamme_actuelle?: number
          id?: string
          licence?: string | null
          photo?: string | null
          prenom: string
          record_flamme?: number
          statut_blessure?: string
        }
        Update: {
          created_at?: string
          date_naissance?: string
          equipe?: string
          flamme_actuelle?: number
          id?: string
          licence?: string | null
          photo?: string | null
          prenom?: string
          record_flamme?: number
          statut_blessure?: string
        }
        Relationships: []
      }
      matchs: {
        Row: {
          adversaire: string
          created_at: string
          date: string
          heure: string
          id: string
          lieu: string
        }
        Insert: {
          adversaire: string
          created_at?: string
          date: string
          heure: string
          id?: string
          lieu?: string
        }
        Update: {
          adversaire?: string
          created_at?: string
          date?: string
          heure?: string
          id?: string
          lieu?: string
        }
        Relationships: []
      }
      messages_coach: {
        Row: {
          contenu: string
          date_publication: string
          id: string
          titre: string | null
        }
        Insert: {
          contenu: string
          date_publication?: string
          id?: string
          titre?: string | null
        }
        Update: {
          contenu?: string
          date_publication?: string
          id?: string
          titre?: string | null
        }
        Relationships: []
      }
      messages_likes: {
        Row: {
          created_at: string
          id: string
          joueuse_id: string
          message_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          joueuse_id: string
          message_id: string
        }
        Update: {
          created_at?: string
          id?: string
          joueuse_id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_likes_joueuse_id_fkey"
            columns: ["joueuse_id"]
            isOneToOne: false
            referencedRelation: "joueuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_likes_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages_coach"
            referencedColumns: ["id"]
          },
        ]
      }
      messages_reponses: {
        Row: {
          auteur_nom: string
          auteur_type: string
          contenu: string
          created_at: string
          id: string
          joueuse_id: string | null
          message_id: string
        }
        Insert: {
          auteur_nom: string
          auteur_type?: string
          contenu: string
          created_at?: string
          id?: string
          joueuse_id?: string | null
          message_id: string
        }
        Update: {
          auteur_nom?: string
          auteur_type?: string
          contenu?: string
          created_at?: string
          id?: string
          joueuse_id?: string | null
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_reponses_joueuse_id_fkey"
            columns: ["joueuse_id"]
            isOneToOne: false
            referencedRelation: "joueuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reponses_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages_coach"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          archivee: boolean
          automatique: boolean
          categorie: string | null
          created_at: string
          date: string | null
          description: string | null
          etoiles: number
          id: string
          places_max: number
          recurrente: boolean
          titre: string
          updated_at: string
        }
        Insert: {
          archivee?: boolean
          automatique?: boolean
          categorie?: string | null
          created_at?: string
          date?: string | null
          description?: string | null
          etoiles?: number
          id?: string
          places_max?: number
          recurrente?: boolean
          titre: string
          updated_at?: string
        }
        Update: {
          archivee?: boolean
          automatique?: boolean
          categorie?: string | null
          created_at?: string
          date?: string | null
          description?: string | null
          etoiles?: number
          id?: string
          places_max?: number
          recurrente?: boolean
          titre?: string
          updated_at?: string
        }
        Relationships: []
      }
      missions_inscriptions: {
        Row: {
          coach_validateur: string | null
          date_inscription: string
          date_validation: string | null
          id: string
          joueuse_id: string
          mission_id: string
          motif_refus: string | null
          statut: string
        }
        Insert: {
          coach_validateur?: string | null
          date_inscription?: string
          date_validation?: string | null
          id?: string
          joueuse_id: string
          mission_id: string
          motif_refus?: string | null
          statut?: string
        }
        Update: {
          coach_validateur?: string | null
          date_inscription?: string
          date_validation?: string | null
          id?: string
          joueuse_id?: string
          mission_id?: string
          motif_refus?: string | null
          statut?: string
        }
        Relationships: [
          {
            foreignKeyName: "missions_inscriptions_joueuse_id_fkey"
            columns: ["joueuse_id"]
            isOneToOne: false
            referencedRelation: "joueuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_inscriptions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      presences_entrainements: {
        Row: {
          date_validation: string
          entrainement_id: string
          fatigue: number | null
          id: string
          joueuse_id: string
          presente: boolean
        }
        Insert: {
          date_validation?: string
          entrainement_id: string
          fatigue?: number | null
          id?: string
          joueuse_id: string
          presente?: boolean
        }
        Update: {
          date_validation?: string
          entrainement_id?: string
          fatigue?: number | null
          id?: string
          joueuse_id?: string
          presente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "presences_entrainements_entrainement_id_fkey"
            columns: ["entrainement_id"]
            isOneToOne: false
            referencedRelation: "entrainements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presences_entrainements_joueuse_id_fkey"
            columns: ["joueuse_id"]
            isOneToOne: false
            referencedRelation: "joueuses"
            referencedColumns: ["id"]
          },
        ]
      }
      presences_matchs: {
        Row: {
          created_at: string
          id: string
          joueuse_id: string
          match_id: string
          presente: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          joueuse_id: string
          match_id: string
          presente?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          joueuse_id?: string
          match_id?: string
          presente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "presences_matchs_joueuse_id_fkey"
            columns: ["joueuse_id"]
            isOneToOne: false
            referencedRelation: "joueuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presences_matchs_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matchs"
            referencedColumns: ["id"]
          },
        ]
      }
      shoot_scores: {
        Row: {
          date_partie: string
          id: string
          nom: string
          score: number
          utilisateur_id: string
          utilisateur_type: string
        }
        Insert: {
          date_partie?: string
          id?: string
          nom: string
          score: number
          utilisateur_id: string
          utilisateur_type: string
        }
        Update: {
          date_partie?: string
          id?: string
          nom?: string
          score?: number
          utilisateur_id?: string
          utilisateur_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_blessee: { Args: { p_joueuse_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
