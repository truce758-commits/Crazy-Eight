/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Suit, 
  Rank, 
  Card as CardType, 
  GameState, 
  GameStatus,
  Difficulty
} from './types';
import { 
  Trophy, 
  RotateCcw, 
  User, 
  Cpu, 
  ChevronRight,
  Info
} from 'lucide-react';

// --- Constants & Helpers ---

const SUITS = [Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS, Suit.SPADES];
const RANKS = [
  Rank.ACE, Rank.TWO, Rank.THREE, Rank.FOUR, Rank.FIVE, 
  Rank.SIX, Rank.SEVEN, Rank.EIGHT, Rank.NINE, Rank.TEN, 
  Rank.JACK, Rank.QUEEN, Rank.KING
];

const createDeck = (): CardType[] => {
  const deck: CardType[] = [];
  SUITS.forEach(suit => {
    RANKS.forEach(rank => {
      deck.push({
        id: `${rank}-${suit}`,
        suit,
        rank,
      });
    });
  });
  return deck;
};

const shuffle = (deck: CardType[]): CardType[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

const getSuitSymbol = (suit: Suit) => {
  switch (suit) {
    case Suit.HEARTS: return '♥';
    case Suit.DIAMONDS: return '♦';
    case Suit.CLUBS: return '♣';
    case Suit.SPADES: return '♠';
  }
};

const getSuitColor = (suit: Suit) => {
  return (suit === Suit.HEARTS || suit === Suit.DIAMONDS) ? 'text-red-600' : 'text-slate-900';
};

// --- Components ---

interface CardProps {
  card: CardType;
  isFaceDown?: boolean;
  onClick?: () => void;
  isPlayable?: boolean;
  index?: number;
  total?: number;
  isAI?: boolean;
  key?: React.Key;
}

const Card = ({ 
  card, 
  isFaceDown = false, 
  onClick, 
  isPlayable = false,
  index = 0,
  total = 1,
  isAI = false
}: CardProps) => {
  // Calculate fan effect
  const rotation = total > 1 ? (index - (total - 1) / 2) * (isAI ? 5 : 8) : 0;
  const xOffset = total > 1 ? (index - (total - 1) / 2) * (isAI ? 15 : 30) : 0;

  return (
    <motion.div
      layoutId={card.id}
      initial={{ scale: 0.8, opacity: 0, y: isAI ? -100 : 100 }}
      animate={{ 
        scale: 1, 
        opacity: 1, 
        y: 0, 
        rotate: rotation,
        x: xOffset,
        zIndex: index,
        filter: isPlayable || isFaceDown ? 'brightness(1)' : 'brightness(0.8)'
      }}
      whileHover={isPlayable ? { y: -20, scale: 1.05, zIndex: 50 } : {}}
      onClick={isPlayable ? onClick : undefined}
      className={`
        relative w-20 h-28 sm:w-24 sm:h-36 rounded-lg card-shadow flex flex-col items-center justify-center
        ${isFaceDown 
          ? 'bg-blue-800 border-2 border-white' 
          : 'bg-white border border-gray-200'}
        ${isPlayable ? 'cursor-pointer ring-2 ring-yellow-400' : 'cursor-default'}
        transition-shadow duration-200 select-none
      `}
    >
      {isFaceDown ? (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-12 h-16 sm:w-16 sm:h-24 border-2 border-blue-400/30 rounded flex items-center justify-center">
            <div className="text-blue-400/20 text-4xl">8</div>
          </div>
        </div>
      ) : (
        <>
          <div className={`absolute top-1 left-2 text-sm sm:text-lg font-bold ${getSuitColor(card.suit)}`}>
            {card.rank}
          </div>
          <div className={`text-3xl sm:text-5xl ${getSuitColor(card.suit)}`}>
            {getSuitSymbol(card.suit)}
          </div>
          <div className={`absolute bottom-1 right-2 text-sm sm:text-lg font-bold rotate-180 ${getSuitColor(card.suit)}`}>
            {card.rank}
          </div>
        </>
      )}
    </motion.div>
  );
};

export default function App() {
  const [state, setState] = useState<GameState>({
    deck: [],
    playerHand: [],
    aiHand: [],
    discardPile: [],
    currentSuit: null,
    turn: 'player',
    status: 'waiting',
    winner: null,
    difficulty: 'normal',
  });

  const [message, setMessage] = useState<string>("Welcome to Tina's Crazy 8s!");

  // --- Game Actions ---

  const goToHome = useCallback(() => {
    setState(prev => ({
      ...prev,
      status: 'waiting',
      winner: null,
    }));
    setMessage("Welcome to Tina's Crazy 8s!");
  }, []);

  const initGame = useCallback((difficulty: Difficulty = 'normal') => {
    const fullDeck = shuffle(createDeck());
    const playerHand = fullDeck.splice(0, 8);
    const aiHand = fullDeck.splice(0, 8);
    
    // Initial discard must not be an 8 for simplicity, or we just handle it
    let initialDiscard = fullDeck.pop()!;
    while (initialDiscard.rank === Rank.EIGHT) {
      fullDeck.unshift(initialDiscard);
      initialDiscard = fullDeck.pop()!;
    }

    setState({
      deck: fullDeck,
      playerHand,
      aiHand,
      discardPile: [initialDiscard],
      currentSuit: initialDiscard.suit,
      turn: 'player',
      status: 'playing',
      winner: null,
      difficulty,
    });
    setMessage(`Game started (${difficulty})! Your turn.`);
  }, []);

  const drawCard = useCallback((target: 'player' | 'ai') => {
    setState(prev => {
      if (prev.deck.length === 0) {
        setMessage("Deck is empty! Skipping draw.");
        return { ...prev, turn: prev.turn === 'player' ? 'ai' : 'player' };
      }

      const newDeck = [...prev.deck];
      const drawnCard = newDeck.pop()!;
      const isPlayer = target === 'player';
      
      const newState = {
        ...prev,
        deck: newDeck,
        [isPlayer ? 'playerHand' : 'aiHand']: [...prev[isPlayer ? 'playerHand' : 'aiHand'], drawnCard],
        turn: prev.turn // Keep turn the same to allow playing if possible (optional rule, but let's stick to "draw and end turn" if not playable)
      };

      // Check if drawn card is playable
      const topCard = prev.discardPile[prev.discardPile.length - 1];
      const canPlay = drawnCard.rank === Rank.EIGHT || 
                      drawnCard.rank === topCard.rank || 
                      drawnCard.suit === prev.currentSuit;

      if (!canPlay) {
        newState.turn = isPlayer ? 'ai' : 'player';
        setMessage(isPlayer ? "No playable card drawn. AI's turn." : "AI drew a card and passed.");
      } else {
        setMessage(isPlayer ? "You drew a playable card!" : "AI drew a card.");
      }

      return newState;
    });
  }, []);

  const playCard = useCallback((card: CardType, target: 'player' | 'ai') => {
    setState(prev => {
      const isPlayer = target === 'player';
      const handKey = isPlayer ? 'playerHand' : 'aiHand';
      const newHand = prev[handKey].filter(c => c.id !== card.id);
      const newDiscardPile = [...prev.discardPile, card];
      
      let nextStatus: GameStatus = 'playing';
      let nextTurn = isPlayer ? 'ai' : 'player';
      let nextSuit = card.suit;

      if (newHand.length === 0) {
        return {
          ...prev,
          [handKey]: newHand,
          discardPile: newDiscardPile,
          status: 'game_over',
          winner: target,
        };
      }

      if (card.rank === Rank.EIGHT) {
        if (isPlayer) {
          nextStatus = 'choosing_suit';
          setMessage("Crazy 8! Choose a new suit.");
        } else {
          // AI chooses suit (most frequent in hand)
          const counts: Record<Suit, number> = {
            [Suit.HEARTS]: 0, [Suit.DIAMONDS]: 0, [Suit.CLUBS]: 0, [Suit.SPADES]: 0
          };
          newHand.forEach(c => counts[c.suit]++);
          nextSuit = Object.entries(counts).reduce((a, b) => a[1] > b[1] ? a : b)[0] as Suit;
          setMessage(`AI played an 8 and chose ${nextSuit}!`);
        }
      } else {
        setMessage(isPlayer ? "Nice move! AI's turn." : `AI played ${card.rank} of ${card.suit}.`);
      }

      return {
        ...prev,
        [handKey]: newHand,
        discardPile: newDiscardPile,
        currentSuit: nextSuit,
        status: nextStatus,
        turn: nextTurn,
      };
    });
  }, []);

  const selectSuit = (suit: Suit) => {
    setState(prev => ({
      ...prev,
      currentSuit: suit,
      status: 'playing',
      turn: 'ai'
    }));
    setMessage(`You chose ${suit}. AI's turn.`);
  };

  // --- AI Logic ---

  useEffect(() => {
    if (state.status === 'playing' && state.turn === 'ai') {
      const timer = setTimeout(() => {
        const topCard = state.discardPile[state.discardPile.length - 1];
        const playableCards = state.aiHand.filter(c => 
          c.rank === Rank.EIGHT || 
          c.rank === topCard.rank || 
          c.suit === state.currentSuit
        );

        if (playableCards.length > 0) {
          let cardToPlay: CardType;

          if (state.difficulty === 'easy') {
            // Easy: Random valid move
            cardToPlay = playableCards[Math.floor(Math.random() * playableCards.length)];
          } else if (state.difficulty === 'normal') {
            // Normal: Prefer non-8s first
            const nonEight = playableCards.find(c => c.rank !== Rank.EIGHT);
            cardToPlay = nonEight || playableCards[0];
          } else {
            // Hard: Strategic selection
            const nonEights = playableCards.filter(c => c.rank !== Rank.EIGHT);
            if (nonEights.length > 0) {
              // Pick the card whose suit is most common in hand
              const counts: Record<Suit, number> = {
                [Suit.HEARTS]: 0, [Suit.DIAMONDS]: 0, [Suit.CLUBS]: 0, [Suit.SPADES]: 0
              };
              state.aiHand.forEach(c => counts[c.suit]++);
              cardToPlay = nonEights.reduce((prev, curr) => 
                counts[curr.suit] > counts[prev.suit] ? curr : prev
              );
            } else {
              cardToPlay = playableCards[0]; // Must be an 8
            }
          }
          
          playCard(cardToPlay, 'ai');
        } else {
          drawCard('ai');
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state.status, state.turn, state.aiHand, state.discardPile, state.currentSuit, state.difficulty, playCard, drawCard]);

  // --- Derived State ---

  const topDiscard = state.discardPile[state.discardPile.length - 1];
  const isPlayerTurn = state.turn === 'player' && state.status === 'playing';

  const canPlayerDraw = useMemo(() => {
    if (!isPlayerTurn) return false;
    return !state.playerHand.some(c => 
      c.rank === Rank.EIGHT || 
      c.rank === topDiscard.rank || 
      c.suit === state.currentSuit
    );
  }, [isPlayerTurn, state.playerHand, topDiscard, state.currentSuit]);

  // --- Render ---

  return (
    <div className="flex flex-col h-screen max-w-5xl mx-auto px-4 py-6 font-sans">
      {/* Header */}
      <header className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <button 
            onClick={goToHome}
            className="bg-yellow-400 p-2 rounded-lg text-sky-900 hover:scale-110 transition-transform"
          >
            <Trophy size={24} />
          </button>
          <h1 className="text-2xl font-display font-bold tracking-tight">Tina Crazy 8s</h1>
        </div>
        <button 
          onClick={() => initGame(state.difficulty)}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-colors"
        >
          <RotateCcw size={18} />
          <span className="hidden sm:inline">New Game</span>
        </button>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 relative flex flex-col justify-between items-center py-8">
        
        {/* AI Hand */}
        <div className="w-full flex flex-col items-center">
          <div className="flex items-center gap-2 mb-4 text-white/60">
            <Cpu size={20} />
            <span className="font-medium">AI Opponent ({state.aiHand.length})</span>
          </div>
          <div className="relative h-36 w-full flex justify-center">
            <AnimatePresence>
              {state.aiHand.map((card, i) => (
                <Card 
                  key={card.id} 
                  card={card} 
                  isFaceDown 
                  index={i} 
                  total={state.aiHand.length}
                  isAI
                />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Center: Deck & Discard */}
        <div className="flex items-center gap-8 sm:gap-16 my-8">
          {/* Draw Pile */}
          <div className="flex flex-col items-center gap-2">
            <div 
              onClick={() => canPlayerDraw && drawCard('player')}
              className={`
                relative w-20 h-28 sm:w-24 sm:h-36 rounded-lg border-2 border-white/20 flex items-center justify-center
                ${canPlayerDraw ? 'cursor-pointer ring-4 ring-yellow-400/50 hover:scale-105' : 'opacity-50'}
                transition-all duration-200
              `}
              style={{
                background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
                boxShadow: '0 10px 0 #172554'
              }}
            >
              <div className="text-white/20 text-4xl font-display font-bold">8</div>
              {state.deck.length > 0 && (
                <div className="absolute -top-3 -right-3 bg-yellow-400 text-sky-900 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-lg">
                  {state.deck.length}
                </div>
              )}
            </div>
            <span className="text-xs uppercase tracking-widest text-white/40 font-bold">Draw</span>
          </div>

          {/* Discard Pile */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative w-20 h-28 sm:w-24 sm:h-36">
              <AnimatePresence mode="popLayout">
                {topDiscard && (
                  <Card 
                    key={topDiscard.id} 
                    card={topDiscard} 
                  />
                )}
              </AnimatePresence>
              {state.currentSuit && state.currentSuit !== topDiscard?.suit && (
                <div className="absolute -top-4 -right-4 bg-white text-slate-900 p-2 rounded-full shadow-xl border-2 border-yellow-400 animate-bounce">
                  <span className={`text-xl ${getSuitColor(state.currentSuit)}`}>
                    {getSuitSymbol(state.currentSuit)}
                  </span>
                </div>
              )}
            </div>
            <span className="text-xs uppercase tracking-widest text-white/40 font-bold">Discard</span>
          </div>
        </div>

        {/* Player Hand */}
        <div className="w-full flex flex-col items-center">
          <div className="relative h-36 w-full flex justify-center mb-4">
            <AnimatePresence>
              {state.playerHand.map((card, i) => {
                const isPlayable = isPlayerTurn && (
                  card.rank === Rank.EIGHT || 
                  card.rank === topDiscard?.rank || 
                  card.suit === state.currentSuit
                );
                return (
                  <Card 
                    key={card.id} 
                    card={card} 
                    isPlayable={isPlayable}
                    onClick={() => playCard(card, 'player')}
                    index={i}
                    total={state.playerHand.length}
                  />
                );
              })}
            </AnimatePresence>
          </div>
          <div className="flex items-center gap-2 text-white/60">
            <User size={20} />
            <span className="font-medium">You ({state.playerHand.length})</span>
          </div>
        </div>

      </main>

      {/* Footer / Status Message */}
      <footer className="mt-4 bg-black/20 backdrop-blur-md rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isPlayerTurn ? 'bg-green-400 animate-pulse' : 'bg-white/20'}`} />
          <p className="text-sm sm:text-base font-medium text-white/90">{message}</p>
        </div>
        {canPlayerDraw && (
          <button 
            onClick={() => drawCard('player')}
            className="flex items-center gap-1 text-yellow-400 font-bold text-sm uppercase tracking-wider hover:text-yellow-300 transition-colors"
          >
            Draw Card <ChevronRight size={16} />
          </button>
        )}
      </footer>

      {/* Modals */}
      <AnimatePresence>
        {state.status === 'waiting' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-sky-950/90 backdrop-blur-xl z-50 flex items-center justify-center p-6"
          >
            <div className="max-w-md w-full text-center">
              <div className="w-24 h-24 bg-yellow-400 rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-12 shadow-2xl">
                <span className="text-6xl font-display font-bold text-sky-900">8</span>
              </div>
              <h2 className="text-4xl font-display font-bold mb-4">Crazy Eights</h2>
              <p className="text-white/60 mb-8 leading-relaxed">
                Match the suit or rank of the top card. 8s are wild! First to empty their hand wins.
              </p>
              
              <div className="flex flex-col gap-3 mb-8">
                <p className="text-sm font-bold uppercase tracking-widest text-white/40">选择难度 (Select Difficulty)</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setState(prev => ({ ...prev, difficulty: d }))}
                      className={`
                        py-3 rounded-xl font-bold transition-all border-2
                        ${state.difficulty === d 
                          ? 'bg-yellow-400 border-yellow-400 text-sky-900 scale-105' 
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}
                      `}
                    >
                      {d === 'easy' ? '简单' : d === 'normal' ? '普通' : '困难'}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => initGame(state.difficulty)}
                className="w-full bg-white text-sky-900 font-bold py-4 rounded-2xl text-xl hover:bg-yellow-400 transition-all transform hover:scale-105 active:scale-95 shadow-xl"
              >
                开始游戏 (Start Game)
              </button>
              <div className="mt-8 flex items-center justify-center gap-4 text-white/40 text-sm">
                <div className="flex items-center gap-1"><Info size={14} /> 52 Cards</div>
                <div className="flex items-center gap-1"><User size={14} /> 1 Player</div>
                <div className="flex items-center gap-1"><Cpu size={14} /> AI Opponent</div>
              </div>
            </div>
          </motion.div>
        )}

        {state.status === 'choosing_suit' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl">
              <h3 className="text-2xl font-display font-bold text-slate-900 mb-6 text-center">Pick a Suit</h3>
              <div className="grid grid-cols-2 gap-4">
                {SUITS.map(suit => (
                  <button
                    key={suit}
                    onClick={() => selectSuit(suit)}
                    className={`
                      flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-slate-100 hover:border-yellow-400 hover:bg-yellow-50 transition-all group
                    `}
                  >
                    <span className={`text-4xl mb-2 ${getSuitColor(suit)} group-hover:scale-125 transition-transform`}>
                      {getSuitSymbol(suit)}
                    </span>
                    <span className="text-slate-500 font-bold uppercase text-xs tracking-widest">{suit}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {state.status === 'game_over' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-sky-950/95 backdrop-blur-xl z-50 flex items-center justify-center p-6"
          >
            <div className="max-w-md w-full text-center">
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mb-8"
              >
                {state.winner === 'player' ? (
                  <>
                    <div className="w-32 h-32 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl ring-8 ring-yellow-400/20">
                      <Trophy size={64} className="text-sky-900" />
                    </div>
                    <h2 className="text-5xl font-display font-bold mb-2">Victory!</h2>
                    <p className="text-white/60 text-lg">You've cleared all your cards. Well played!</p>
                  </>
                ) : (
                  <>
                    <div className="w-32 h-32 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl ring-8 ring-slate-700/20">
                      <Cpu size={64} className="text-white" />
                    </div>
                    <h2 className="text-5xl font-display font-bold mb-2">Defeat</h2>
                    <p className="text-white/60 text-lg">The AI cleared its hand first. Better luck next time!</p>
                  </>
                )}
              </motion.div>
              <button 
                onClick={() => initGame(state.difficulty)}
                className="w-full bg-white text-sky-900 font-bold py-4 rounded-2xl text-xl hover:bg-yellow-400 transition-all shadow-xl mb-4"
              >
                再来一局 (Play Again)
              </button>
              <button 
                onClick={goToHome}
                className="w-full bg-white/10 text-white font-bold py-4 rounded-2xl text-xl hover:bg-white/20 transition-all border border-white/20"
              >
                返回主页 (Back to Home)
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
