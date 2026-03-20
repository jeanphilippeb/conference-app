export type Priority = 'must_meet' | 'should_meet' | 'nice_to_have';
export type ConferenceStatus = 'upcoming' | 'active' | 'completed';
export type InteractionStatus = 'met' | 'attempted' | 'no_show';

export interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  role: 'admin' | 'rep';
  lifetime_score?: number;
}

export interface Conference {
  id: string;
  name: string;
  location: string;
  start_date: string;
  end_date: string;
  status: ConferenceStatus;
  created_by?: string;
  created_at: string;
  // computed
  target_count?: number;
  met_count?: number;
}

export interface Target {
  id: string;
  conference_id: string;
  first_name: string;
  last_name: string;
  company: string;
  role?: string;
  phone?: string;
  email?: string;
  photo_url?: string;
  linkedin_url?: string;
  priority: Priority;
  pre_notes?: string;
  tags?: string[];
  added_by?: string;
  created_at: string;
  // joined
  interactions?: Interaction[];
  latest_interaction?: Interaction;
}

export interface Interaction {
  id: string;
  target_id: string;
  user_id: string;
  status: InteractionStatus;
  notes?: string;
  follow_up?: string;
  met_at: string;
  created_at: string;
  score?: number;
  // joined
  profile?: Profile;
}
