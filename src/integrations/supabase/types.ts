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
      access_packages: {
        Row: {
          can_download_image: boolean
          can_download_pdf: boolean
          can_view_image: boolean
          can_view_pdf: boolean
          created_at: string
          description: string
          id: string
          name: string
          qtypes: Database["public"]["Enums"]["question_type"][]
          subject_ids: string[]
        }
        Insert: {
          can_download_image?: boolean
          can_download_pdf?: boolean
          can_view_image?: boolean
          can_view_pdf?: boolean
          created_at?: string
          description?: string
          id?: string
          name: string
          qtypes?: Database["public"]["Enums"]["question_type"][]
          subject_ids?: string[]
        }
        Update: {
          can_download_image?: boolean
          can_download_pdf?: boolean
          can_view_image?: boolean
          can_view_pdf?: boolean
          created_at?: string
          description?: string
          id?: string
          name?: string
          qtypes?: Database["public"]["Enums"]["question_type"][]
          subject_ids?: string[]
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          created_at: string
          detail: string
          event: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          detail?: string
          event: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          detail?: string
          event?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      challenge_sessions: {
        Row: {
          created_at: string
          id: string
          mode: string
          score: number
          seconds: number
          total: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mode: string
          score?: number
          seconds?: number
          total?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mode?: string
          score?: number
          seconds?: number
          total?: number
          user_id?: string
        }
        Relationships: []
      }
      chapters: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          subject_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          subject_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      course_lesson_progress: {
        Row: {
          completed_at: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      course_lessons: {
        Row: {
          course_id: string
          created_at: string
          id: string
          info: string
          link_id: string | null
          position: number
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          info?: string
          link_id?: string | null
          position?: number
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          info?: string
          link_id?: string | null
          position?: number
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_lessons_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "links"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          chapter_id: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          is_published: boolean
          name: string
          sort_order: number
          subject_id: string | null
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          is_published?: boolean
          name: string
          sort_order?: number
          subject_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          is_published?: boolean
          name?: string
          sort_order?: number
          subject_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_page_access: {
        Row: {
          granted_at: string
          page_id: string
          source: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          page_id: string
          source?: string
          user_id: string
        }
        Update: {
          granted_at?: string
          page_id?: string
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_page_access_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "custom_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_pages: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          description: string
          icon: string
          id: string
          is_published: boolean
          name: string
          slug: string
          updated_at: string
          visibility: string
        }
        Insert: {
          body?: string
          created_at?: string
          created_by?: string | null
          description?: string
          icon?: string
          id?: string
          is_published?: boolean
          name: string
          slug: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          description?: string
          icon?: string
          id?: string
          is_published?: boolean
          name?: string
          slug?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      demands: {
        Row: {
          chapter_id: string | null
          created_at: string
          details: string | null
          id: string
          status: string
          subject_id: string | null
          updated_at: string
          user_id: string
          want: string
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          status?: string
          subject_id?: string | null
          updated_at?: string
          user_id?: string
          want: string
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          status?: string
          subject_id?: string | null
          updated_at?: string
          user_id?: string
          want?: string
        }
        Relationships: [
          {
            foreignKeyName: "demands_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demands_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      downloads: {
        Row: {
          created_at: string
          id: string
          resource_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          resource_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          resource_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "downloads_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      event_days: {
        Row: {
          created_at: string
          day_date: string | null
          day_number: number
          event_id: string
          id: string
          title: string
        }
        Insert: {
          created_at?: string
          day_date?: string | null
          day_number: number
          event_id: string
          id?: string
          title?: string
        }
        Update: {
          created_at?: string
          day_date?: string | null
          day_number?: number
          event_id?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_days_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "exam_events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_syllabus: {
        Row: {
          chapter_id: string | null
          created_at: string
          event_id: string
          id: string
          subject_id: string | null
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          event_id: string
          id?: string
          subject_id?: string | null
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          event_id?: string
          id?: string
          subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_syllabus_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_syllabus_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "exam_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_syllabus_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      event_task_completions: {
        Row: {
          completed_at: string
          task_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          task_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_task_completions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "event_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      event_task_resources: {
        Row: {
          created_at: string
          id: string
          kind: string
          label: string
          ref_id: string | null
          task_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          label?: string
          ref_id?: string | null
          task_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          label?: string
          ref_id?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_task_resources_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "event_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      event_tasks: {
        Row: {
          chapter_id: string | null
          created_at: string
          day_id: string
          id: string
          instructions: string
          sort_order: number
          subject_id: string | null
          title: string
          topic_id: string | null
          updated_at: string
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          day_id: string
          id?: string
          instructions?: string
          sort_order?: number
          subject_id?: string | null
          title: string
          topic_id?: string | null
          updated_at?: string
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          day_id?: string
          id?: string
          instructions?: string
          sort_order?: number
          subject_id?: string | null
          title?: string
          topic_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_tasks_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tasks_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "event_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tasks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tasks_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_events: {
        Row: {
          created_at: string
          created_by: string | null
          end_date: string
          event_type: string
          id: string
          is_active: boolean
          name: string
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_date: string
          event_type?: string
          id?: string
          is_active?: boolean
          name: string
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_date?: string
          event_type?: string
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      exp_ledger: {
        Row: {
          created_at: string
          delta: number
          id: string
          reason: string
          ref: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          reason: string
          ref?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          reason?: string
          ref?: string | null
          user_id?: string
        }
        Relationships: []
      }
      exp_rules: {
        Row: {
          enabled: boolean
          exp: number
          key: string
          label: string
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          exp?: number
          key: string
          label: string
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          exp?: number
          key?: string
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      flashcard_sets: {
        Row: {
          ai_generated: boolean
          chapter_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_published: boolean
          subject_id: string | null
          title: string
          topic_id: string | null
          updated_at: string
        }
        Insert: {
          ai_generated?: boolean
          chapter_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          subject_id?: string | null
          title: string
          topic_id?: string | null
          updated_at?: string
        }
        Update: {
          ai_generated?: boolean
          chapter_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          subject_id?: string | null
          title?: string
          topic_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_sets_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcard_sets_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcard_sets_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          back: string
          chapter_id: string | null
          created_at: string
          front: string
          id: string
          position: number
          set_id: string | null
          subject_id: string | null
          topic_id: string | null
          updated_at: string
        }
        Insert: {
          back: string
          chapter_id?: string | null
          created_at?: string
          front: string
          id?: string
          position?: number
          set_id?: string | null
          subject_id?: string | null
          topic_id?: string | null
          updated_at?: string
        }
        Update: {
          back?: string
          chapter_id?: string | null
          created_at?: string
          front?: string
          id?: string
          position?: number
          set_id?: string | null
          subject_id?: string | null
          topic_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcards_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "flashcard_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcards_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcards_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      game_attempts: {
        Row: {
          chapter_id: string | null
          correct: number
          created_at: string
          game_key: string
          id: string
          score: number
          seconds: number
          subject_id: string | null
          topic_id: string | null
          total: number
          user_id: string
          wrong: number
        }
        Insert: {
          chapter_id?: string | null
          correct?: number
          created_at?: string
          game_key: string
          id?: string
          score?: number
          seconds?: number
          subject_id?: string | null
          topic_id?: string | null
          total?: number
          user_id: string
          wrong?: number
        }
        Update: {
          chapter_id?: string | null
          correct?: number
          created_at?: string
          game_key?: string
          id?: string
          score?: number
          seconds?: number
          subject_id?: string | null
          topic_id?: string | null
          total?: number
          user_id?: string
          wrong?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_attempts_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_attempts_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_attempts_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      game_settings: {
        Row: {
          enabled: boolean
          game_key: string
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          game_key: string
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          game_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      links: {
        Row: {
          chapter_id: string | null
          created_at: string
          description: string
          id: string
          kind: Database["public"]["Enums"]["link_kind"]
          subject_id: string | null
          title: string
          topic_id: string | null
          updated_at: string
          url: string
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          description?: string
          id?: string
          kind?: Database["public"]["Enums"]["link_kind"]
          subject_id?: string | null
          title: string
          topic_id?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          description?: string
          id?: string
          kind?: Database["public"]["Enums"]["link_kind"]
          subject_id?: string | null
          title?: string
          topic_id?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "links_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "links_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "links_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      member_chapter_access: {
        Row: {
          chapter_id: string
          user_id: string
        }
        Insert: {
          chapter_id: string
          user_id: string
        }
        Update: {
          chapter_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_chapter_access_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      member_exp: {
        Row: {
          balance: number
          lifetime: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          lifetime?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          lifetime?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      member_qtype_access: {
        Row: {
          qtype: Database["public"]["Enums"]["question_type"]
          user_id: string
        }
        Insert: {
          qtype: Database["public"]["Enums"]["question_type"]
          user_id: string
        }
        Update: {
          qtype?: Database["public"]["Enums"]["question_type"]
          user_id?: string
        }
        Relationships: []
      }
      member_settings: {
        Row: {
          can_download_image: boolean
          can_download_pdf: boolean
          can_view_image: boolean
          can_view_pdf: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          can_download_image?: boolean
          can_download_pdf?: boolean
          can_view_image?: boolean
          can_view_pdf?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          can_download_image?: boolean
          can_download_pdf?: boolean
          can_view_image?: boolean
          can_view_pdf?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      member_subject_access: {
        Row: {
          subject_id: string
          user_id: string
        }
        Insert: {
          subject_id: string
          user_id: string
        }
        Update: {
          subject_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_subject_access_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_reads: {
        Row: {
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          title: string
        }
        Insert: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          last_login_at: string | null
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id: string
          is_active?: boolean
          last_login_at?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      question_attempts: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          is_skipped: boolean
          marks_awarded: number
          question_id: string
          quiz_attempt_id: string | null
          selected_option: number | null
          test_attempt_id: string | null
          time_spent_seconds: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean
          is_skipped?: boolean
          marks_awarded?: number
          question_id: string
          quiz_attempt_id?: string | null
          selected_option?: number | null
          test_attempt_id?: string | null
          time_spent_seconds?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          is_skipped?: boolean
          marks_awarded?: number
          question_id?: string
          quiz_attempt_id?: string | null
          selected_option?: number | null
          test_attempt_id?: string | null
          time_spent_seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_attempts_quiz_attempt_id_fkey"
            columns: ["quiz_attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_attempts_test_attempt_id_fkey"
            columns: ["test_attempt_id"]
            isOneToOne: false
            referencedRelation: "test_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          ai_generated: boolean
          chapter_id: string
          correct_option: number | null
          created_at: string
          difficulty: Database["public"]["Enums"]["difficulty"]
          explanation: string
          id: string
          image_url: string | null
          marks: number
          options: Json
          qtype: Database["public"]["Enums"]["question_type"]
          question_text: string
          status: Database["public"]["Enums"]["question_status"]
          subject_id: string
          topic_id: string | null
          updated_at: string
        }
        Insert: {
          ai_generated?: boolean
          chapter_id: string
          correct_option?: number | null
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty"]
          explanation?: string
          id?: string
          image_url?: string | null
          marks?: number
          options?: Json
          qtype?: Database["public"]["Enums"]["question_type"]
          question_text: string
          status?: Database["public"]["Enums"]["question_status"]
          subject_id: string
          topic_id?: string | null
          updated_at?: string
        }
        Update: {
          ai_generated?: boolean
          chapter_id?: string
          correct_option?: number | null
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty"]
          explanation?: string
          id?: string
          image_url?: string | null
          marks?: number
          options?: Json
          qtype?: Database["public"]["Enums"]["question_type"]
          question_text?: string
          status?: Database["public"]["Enums"]["question_status"]
          subject_id?: string
          topic_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          attempt_number: number
          correct_count: number
          id: string
          incorrect_count: number
          quiz_id: string
          score: number
          skipped_count: number
          submitted_at: string
          time_taken_seconds: number
          total_marks: number
          user_id: string
        }
        Insert: {
          attempt_number?: number
          correct_count?: number
          id?: string
          incorrect_count?: number
          quiz_id: string
          score?: number
          skipped_count?: number
          submitted_at?: string
          time_taken_seconds?: number
          total_marks?: number
          user_id: string
        }
        Update: {
          attempt_number?: number
          correct_count?: number
          id?: string
          incorrect_count?: number
          quiz_id?: string
          score?: number
          skipped_count?: number
          submitted_at?: string
          time_taken_seconds?: number
          total_marks?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          position: number
          question_id: string
          quiz_id: string
        }
        Insert: {
          position?: number
          question_id: string
          quiz_id: string
        }
        Update: {
          position?: number
          question_id?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          chapter_id: string
          created_at: string
          duration_minutes: number
          id: string
          is_published: boolean
          quiz_number: number
          source: Database["public"]["Enums"]["quiz_source"]
          subject_id: string
          title: string
          topic_id: string | null
          updated_at: string
        }
        Insert: {
          chapter_id: string
          created_at?: string
          duration_minutes?: number
          id?: string
          is_published?: boolean
          quiz_number?: number
          source?: Database["public"]["Enums"]["quiz_source"]
          subject_id: string
          title?: string
          topic_id?: string | null
          updated_at?: string
        }
        Update: {
          chapter_id?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          is_published?: boolean
          quiz_number?: number
          source?: Database["public"]["Enums"]["quiz_source"]
          subject_id?: string
          title?: string
          topic_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          chapter_id: string | null
          created_at: string
          description: string
          id: string
          kind: Database["public"]["Enums"]["resource_kind"]
          name: string
          size_bytes: number
          storage_path: string
          subject_id: string | null
          topic_id: string | null
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          description?: string
          id?: string
          kind?: Database["public"]["Enums"]["resource_kind"]
          name: string
          size_bytes?: number
          storage_path: string
          subject_id?: string | null
          topic_id?: string | null
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          description?: string
          id?: string
          kind?: Database["public"]["Enums"]["resource_kind"]
          name?: string
          size_bytes?: number
          storage_path?: string
          subject_id?: string | null
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      store_items: {
        Row: {
          course_id: string | null
          created_at: string
          created_by: string | null
          description: string
          exp_price: number
          external_url: string | null
          flashcard_set_id: string | null
          id: string
          is_active: boolean
          item_type: string
          link_id: string | null
          page_id: string | null
          resource_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          exp_price?: number
          external_url?: string | null
          flashcard_set_id?: string | null
          id?: string
          is_active?: boolean
          item_type: string
          link_id?: string | null
          page_id?: string | null
          resource_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          exp_price?: number
          external_url?: string | null
          flashcard_set_id?: string | null
          id?: string
          is_active?: boolean
          item_type?: string
          link_id?: string | null
          page_id?: string | null
          resource_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_items_flashcard_set_id_fkey"
            columns: ["flashcard_set_id"]
            isOneToOne: false
            referencedRelation: "flashcard_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_items_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_items_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "custom_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_items_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      store_purchases: {
        Row: {
          created_at: string
          exp_spent: number
          id: string
          item_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exp_spent: number
          id?: string
          item_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          exp_spent?: number
          id?: string
          item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_purchases_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "store_items"
            referencedColumns: ["id"]
          },
        ]
      }
      study_clock: {
        Row: {
          active: boolean
          created_at: string
          last_seen: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          last_seen?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          last_seen?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_clock_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_days: {
        Row: {
          created_at: string
          seconds: number
          study_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          seconds?: number
          study_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          seconds?: number
          study_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_days_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string
          icon: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      test_attempts: {
        Row: {
          correct_count: number
          id: string
          incorrect_count: number
          score: number
          skipped_count: number
          submitted_at: string
          test_id: string
          time_taken_seconds: number
          total_marks: number
          user_id: string
        }
        Insert: {
          correct_count?: number
          id?: string
          incorrect_count?: number
          score?: number
          skipped_count?: number
          submitted_at?: string
          test_id: string
          time_taken_seconds?: number
          total_marks?: number
          user_id: string
        }
        Update: {
          correct_count?: number
          id?: string
          incorrect_count?: number
          score?: number
          skipped_count?: number
          submitted_at?: string
          test_id?: string
          time_taken_seconds?: number
          total_marks?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_questions: {
        Row: {
          position: number
          question_id: string
          test_id: string
        }
        Insert: {
          position?: number
          question_id: string
          test_id: string
        }
        Update: {
          position?: number
          question_id?: string
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          created_at: string
          difficulty: Database["public"]["Enums"]["difficulty"] | null
          duration_minutes: number
          id: string
          is_published: boolean
          name: string
          subject_id: string | null
          total_marks: number
        }
        Insert: {
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty"] | null
          duration_minutes?: number
          id?: string
          is_published?: boolean
          name: string
          subject_id?: string | null
          total_marks?: number
        }
        Update: {
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty"] | null
          duration_minutes?: number
          id?: string
          is_published?: boolean
          name?: string
          subject_id?: string | null
          total_marks?: number
        }
        Relationships: [
          {
            foreignKeyName: "tests_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      todos: {
        Row: {
          content: string
          created_at: string
          id: string
          is_done: boolean
          sort_order: number
          task_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_done?: boolean
          sort_order?: number
          task_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_done?: boolean
          sort_order?: number
          task_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      topics: {
        Row: {
          chapter_id: string
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          chapter_id: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          chapter_id?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "topics_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      tracker_columns: {
        Row: {
          created_at: string
          group_key: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_key: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_key?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      tracker_progress: {
        Row: {
          chapter_id: string
          checked: boolean
          column_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_id: string
          checked?: boolean
          column_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_id?: string
          checked?: boolean
          column_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracker_progress_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracker_progress_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "tracker_columns"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_chapter: {
        Args: { _chapter: string; _uid: string }
        Returns: boolean
      }
      can_access_qtype: {
        Args: { _t: Database["public"]["Enums"]["question_type"]; _uid: string }
        Returns: boolean
      }
      can_access_question: {
        Args: { _qid: string; _uid: string }
        Returns: boolean
      }
      can_access_subject: {
        Args: { _subject: string; _uid: string }
        Returns: boolean
      }
      can_see_custom_page: {
        Args: { _page: string; _uid: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_member: { Args: { _uid: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      study_heartbeat: { Args: { _active: boolean }; Returns: undefined }
      touch_last_login: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "member"
      difficulty: "Easy" | "Medium" | "Hard" | "Very Hard"
      link_kind: "note" | "video"
      question_status: "draft" | "published" | "archived"
      question_type:
        | "MCQ"
        | "Assertion & Reason"
        | "Case Study"
        | "Competency Based"
        | "Numerical"
        | "Image Based"
        | "Diagram Based"
        | "Source Based"
        | "Map Based"
        | "Extract Based"
        | "Grammar"
      quiz_source: "manual" | "ai"
      resource_kind: "pdf" | "image"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "member"],
      difficulty: ["Easy", "Medium", "Hard", "Very Hard"],
      link_kind: ["note", "video"],
      question_status: ["draft", "published", "archived"],
      question_type: [
        "MCQ",
        "Assertion & Reason",
        "Case Study",
        "Competency Based",
        "Numerical",
        "Image Based",
        "Diagram Based",
        "Source Based",
        "Map Based",
        "Extract Based",
        "Grammar",
      ],
      quiz_source: ["manual", "ai"],
      resource_kind: ["pdf", "image"],
    },
  },
} as const
