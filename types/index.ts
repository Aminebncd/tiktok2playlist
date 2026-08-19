export interface TikTokFavoriteSound {
  id: string;
  date?: string;
  soundUrl: string;
  displayName?: string;
}

export interface SpotifyTrack {
  id: string;
  uri: string;
  title: string;
  artists: string;
  album?: string;
  imageUrl?: string;
  externalUrl: string;
}

export interface TrackMatch {
  sound: TikTokFavoriteSound;
  status: "matched" | "unmatched";
  track?: SpotifyTrack;
  selected: boolean;
}
