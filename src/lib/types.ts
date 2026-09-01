export type Sentiment = 'positive' | 'neutral' | 'concern';

export const SENTIMENTS: Sentiment[] = ['positive', 'neutral', 'concern'];

export type Reportee = {
  id: string;
  owner_id: string;
  name: string;
  role: string | null;
  color: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  owner_id: string;
  label: string;
  sort_order: number;
  created_at: string;
};

export type Incident = {
  id: string;
  owner_id: string;
  reportee_id: string;
  occurred_at: string;
  sentiment: Sentiment;
  severity: number;
  themes: string[];
  note: string;
  photo_path: string | null;
  /** Set when one capture covered several people; shared by their rows. */
  group_id: string | null;
  discussed_at: string | null;
  created_at: string;
  updated_at: string;
  /** Client-only: set while the row still lives in the offline outbox. */
  pending?: boolean;
  /** Client-only: local file uri of a photo that has not been uploaded yet. */
  local_photo_uri?: string | null;
};

export type OneOnOne = {
  id: string;
  owner_id: string;
  reportee_id: string;
  held_at: string;
  notes: string | null;
  created_at: string;
};

export type NewIncident = {
  /** One capture can cover several people; each gets its own row. */
  reportee_ids: string[];
  occurred_at: string;
  sentiment: Sentiment;
  severity: number;
  themes: string[];
  note: string;
  local_photo_uri?: string | null;
};
