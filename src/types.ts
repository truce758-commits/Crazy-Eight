export enum Suit {
  HEARTS = 'hearts',
  DIAMONDS = 'diamonds',
  CLUBS = 'clubs',
  SPADES = 'spades',
}

export enum Rank {
  TWO = '2',
  THREE = '3',
  FOUR = '4',
  FIVE = '5',
  SIX = '6',
  SEVEN = '7',
  EIGHT = '8',
  NINE = '9',
  TEN = '10',
  JACK = 'J',
  QUEEN = 'Q',
  KING = 'K',
  ACE = 'A',
}

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
}

export type GameStatus = 'waiting' | 'playing' | 'choosing_suit' | 'game_over';

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface GameState {
  deck: Card[];
  playerHand: Card[];
  aiHand: Card[];
  discardPile: Card[];
  currentSuit: Suit | null;
  turn: 'player' | 'ai';
  status: GameStatus;
  winner: 'player' | 'ai' | null;
  difficulty: Difficulty;
}
