import Constants from 'expo-constants';

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ||
  'http://localhost:3000';

export interface Movie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path?: string | null;
  vote_average: number;
  release_date: string;
  genre_ids: number[];
  original_language: string;
}

export interface MoviesResponse {
  results: Movie[];
  total_pages: number;
  page: number;
  poster_base: string;
  mock?: boolean;
}

export interface Restaurant {
  place_id: string;
  name: string;
  cuisine?: string;
  rating?: number;
  price_level?: number;
  vicinity?: string;
  open_now?: boolean;
  types?: string[];
}

export interface RestaurantsResponse {
  results: Restaurant[];
  mock?: boolean;
}

export interface FreekendEvent {
  id: string;
  title: string;
  venue: string;
  date: string;
  time: string;
  category: string;
  price: string;
  image: string | null;
  url: string;
}

export interface EventsResponse {
  results: FreekendEvent[];
  city: string;
  note?: string;
}

export interface ChatUser {
  name?: string;
  ott_subscriptions?: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface FrameBotChatParams {
  message: string;
  history?: ChatMessage[];
  user?: ChatUser;
  city?: string;
  language?: string;
}

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`API error ${res.status} on ${path}`);
  return (await res.json()) as T;
}

export function getTrendingMovies(page = 1): Promise<MoviesResponse> {
  return getJSON<MoviesResponse>(`/movies/trending?page=${page}`);
}

export function searchMovies(q: string, page = 1): Promise<MoviesResponse> {
  return getJSON<MoviesResponse>(`/movies/search?q=${encodeURIComponent(q)}&page=${page}`);
}

export function discoverMovies(params: { genre?: number; language?: string; page?: number } = {}): Promise<MoviesResponse> {
  const qs = new URLSearchParams();
  if (params.genre) qs.set('genre', String(params.genre));
  if (params.language) qs.set('language', params.language);
  qs.set('page', String(params.page ?? 1));
  return getJSON<MoviesResponse>(`/movies/discover?${qs.toString()}`);
}

export function getMovieDetails(id: number): Promise<Movie & { poster_base: string }> {
  return getJSON<Movie & { poster_base: string }>(`/movies/${id}`);
}

export function getRestaurants(city: string, cuisine?: string): Promise<RestaurantsResponse> {
  const qs = new URLSearchParams({ city });
  if (cuisine) qs.set('cuisine', cuisine);
  return getJSON<RestaurantsResponse>(`/restaurants?${qs.toString()}`);
}

export function getEvents(city: string, category?: string): Promise<EventsResponse> {
  const qs = new URLSearchParams({ city });
  if (category) qs.set('category', category);
  return getJSON<EventsResponse>(`/events?${qs.toString()}`);
}

/**
 * POST /framebot/chat — streams SSE `data:` lines carrying {text}, ending with {done:true}.
 * Calls onChunk with each text chunk as it arrives; resolves with the full text.
 */
export async function framebotChat(params: FrameBotChatParams, onChunk: (text: string) => void): Promise<string> {
  const res = await fetch(`${BASE_URL}/framebot/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: params.message,
      history: params.history ?? [],
      user: params.user ?? {},
      city: params.city ?? 'hyderabad',
      language: params.language ?? 'English',
    }),
  });
  if (!res.ok) throw new Error(`FrameBot API error ${res.status}`);
  if (!res.body) throw new Error('Streaming not supported in this environment');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      try {
        const json = JSON.parse(payload) as { text?: string; done?: boolean; error?: string };
        if (json.error) throw new Error(json.error);
        if (json.done) {
          try { await reader.cancel(); } catch { /* noop */ }
          return full;
        }
        if (json.text) {
          full += json.text;
          onChunk(json.text);
        }
      } catch (e) {
        if (e instanceof Error && e.message !== payload) throw e;
      }
    }
  }
  return full;
}

export { BASE_URL };
