import React, { useState, useEffect, useCallback } from 'react';
import socket from './socket';
import JoinScreen from './components/JoinScreen';
import Lobby from './components/Lobby';
import Chat from './components/Chat';
import PartyMenu from './components/PartyMenu';
import ThemeSwitcher from './components/ThemeSwitcher';

// Game components
import NAHGame from './games/NerdsAgainstHumanity/Game';
import MemeMeleeGame from './games/MemeMelee/Game';
import TriviaGame from './games/TriviaFetch/Game';
import SuperSketchyGame from './games/SuperSketchy/Game';
import BaseGamePlayer from './games/BaseGamePlayer';

function getPlayerId() {
  let id = sessionStorage.getItem('bellbox-player-id');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('bellbox-player-id', id);
  }
  return id;
}

const playerId = getPlayerId();

export default function App() {
  // screen: join | lobby | nah-game | trivia-game | trivia-gameover | base-game
  const [screen, setScreen] = useState('join');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [games, setGames] = useState([]);
  const [votes, setVotes] = useState({});
  const [toast, setToast] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);

  // NAH game state
  const [nahGameState, setNahGameState] = useState(null);
  const [nahThemes, setNahThemes] = useState({});
  const [nahSelectedThemes, setNahSelectedThemes] = useState(['standard', 'scifi', 'fantasy', 'nostalgia', 'horror', 'science']);

  // Spice level (1=Family Fun, 2=Spicy, 3=Unhinged)
  const [spiceLevel, setSpiceLevel] = useState(2);

  // AI Bots toggle
  const [aiBots, setAiBots] = useState(false);

  // Trivia game state
  const [triviaGameState, setTriviaGameState] = useState(null);
  const [gusMessage, setGusMessage] = useState("Woof! I'm Gus, your host! Let's play! 🎾");
  const [winner, setWinner] = useState(null);

  // Active BaseGame info (for BaseGamePlayer)
  const [activeGameInfo, setActiveGameInfo] = useState(null);

  // Theme
  const [theme, setTheme] = useState(() => localStorage.getItem('bellbox-theme') || 'party');
  const handleThemeChange = (t) => {
    setTheme(t);
    localStorage.setItem('bellbox-theme', t);
    document.documentElement.setAttribute('data-theme', t === 'party' ? '' : t);
  };
  // Apply saved theme on mount
  React.useEffect(() => {
    if (theme !== 'party') document.documentElement.setAttribute('data-theme', theme);
  }, []);

  const showToast = useCallback((msg, duration = 3000) => {
    setToast(msg);
    setTimeout(() => setToast(null), duration);
  }, []);

  // ── Socket Listeners ──────────────────────────────────────
  useEffect(() => {
    const tryReconnect = () => {
      socket.emit('reconnect-attempt', { playerId }, (res) => {
        if (res.error) return;
        setPlayerName(res.playerName);
        setRoomCode(res.roomCode);
        setPlayers(res.players);
        setIsHost(res.isHost);
        setGames(res.games || []);
        setVotes(res.votes || {});
        setChatMessages(res.chatMessages || []);
        if (res.spiceLevel) setSpiceLevel(res.spiceLevel);
        if (res.aiBots !== undefined) setAiBots(res.aiBots);

        if ((res.state === 'IN_GAME' || res.state === 'PENDING') && res.activeGame && res.gameState) {
          // Restore game-specific state
          if (res.activeGame === 'nerds-against-humanity') {
            setNahGameState(res.gameState);
            setScreen('nah-game');
          } else if (res.activeGame === 'meme-melee') {
            setNahGameState(res.gameState);
            setScreen('meme-melee-game');
          } else if (res.activeGame === 'super-sketchy') {
            setScreen('super-sketchy-game');
          } else if (res.activeGame === 'trivia-fetch') {
            setTriviaGameState(res.gameState);
            setScreen('trivia-game');
          } else {
            const info = (res.games || []).find(g => g.id === res.activeGame);
            if (info) setActiveGameInfo(info);
            setScreen('base-game');
          }
        } else {
          setScreen('lobby');
        }
        showToast('Reconnected! 🎮');
      });
    };

    if (socket.connected) tryReconnect();
    socket.on('connect', tryReconnect);

    // ── Lobby events ──────────────────────────────────────
    socket.on('player-joined', ({ players: pl }) => {
      setPlayers(pl);
      showToast(`${pl[pl.length - 1].name} joined the party! 🎉`);
    });

    socket.on('player-rejoined', ({ playerName: pn, players: pl }) => {
      setPlayers(pl);
      showToast(`${pn} is back! 🎮`);
    });

    socket.on('player-left', ({ playerName: pn, players: pl, votes: v }) => {
      setPlayers(pl);
      if (v) setVotes(v);
      showToast(`${pn} left 👋`);
      const me = pl.find(p => p.id === socket.id);
      if (me?.isHost) setIsHost(true);
    });

    socket.on('vote-update', ({ votes: v, players: pl }) => {
      setVotes(v);
      setPlayers(pl);
    });

    socket.on('spice-update', ({ spiceLevel: sl }) => {
      setSpiceLevel(sl);
    });

    socket.on('ai-bots-update', ({ aiBots: ab, players: pl }) => {
      setAiBots(ab);
      setPlayers(pl);
    });

    socket.on('chat-message', (msg) => {
      setChatMessages(prev => [...prev.slice(-49), msg]);
    });

    // ── Game launch ───────────────────────────────────────
    socket.on('game-launched', ({ game }) => {
      if (game === 'nerds-against-humanity') {
        setScreen('nah-game');
      } else if (game === 'meme-melee') {
        setScreen('meme-melee-game');
      } else if (game === 'super-sketchy') {
        setScreen('super-sketchy-game');
      } else if (game === 'trivia-fetch') {
        setScreen('trivia-game');
      } else {
        // BaseGame-derived game
        setScreen('base-game');
      }
    });

    // ── Back to lobby ─────────────────────────────────────
    socket.on('back-to-lobby', ({ players: pl, votes: v, games: g, spiceLevel: sl, aiBots: ab }) => {
      setPlayers(pl);
      if (v) setVotes(v);
      if (g) setGames(g);
      if (sl) setSpiceLevel(sl);
      if (ab !== undefined) setAiBots(ab);
      setNahGameState(null);
      setTriviaGameState(null);
      setActiveGameInfo(null);
      setWinner(null);
      setScreen('lobby');
      showToast('Back to the party! 🎉');
    });

    // ── NAH events ────────────────────────────────────────
    socket.on('new-round', (data) => {
      setNahGameState({
        phase: 'picking',
        blackCard: data.blackCard,
        hand: data.hand,
        cardCzar: data.cardCzar,
        roundNumber: data.roundNumber,
        players: data.players,
        scores: data.scores,
        submissions: null,
        winner: null,
      });
      setPlayers(data.players);
      // Keep current screen if already in meme-melee-game
      setScreen(prev => prev === 'meme-melee-game' ? 'meme-melee-game' : 'nah-game');
    });

    socket.on('submission-update', ({ players: pl }) => {
      setPlayers(pl);
      setNahGameState(prev => prev ? { ...prev, players: pl } : prev);
    });

    socket.on('judging-phase', ({ submissions, blackCard, cardCzar }) => {
      setNahGameState(prev => ({
        ...prev,
        phase: 'judging',
        submissions,
        blackCard,
        cardCzar,
      }));
    });

    socket.on('round-winner', ({ winnerName, winningCards, blackCard, scores, gameOver, message }) => {
      setNahGameState(prev => ({
        ...prev,
        phase: gameOver ? 'gameover' : 'roundend',
        winner: { name: winnerName, cards: winningCards },
        blackCard,
        scores,
        gameOverMessage: message,
      }));
    });

    // ── Trivia events ─────────────────────────────────────
    socket.on('game-started', ({ players: pl, activePlayerId, categories }) => {
      setPlayers(pl);
      setTriviaGameState({
        phase: 'spinning',
        activePlayerId,
        categories,
        scores: pl.map(p => ({ socketId: p.socketId, name: p.name, score: p.score, pawStamps: p.pawStamps })),
        pawStamps: {},
        streakCount: 0,
      });
      setScreen('trivia-game');
    });

    socket.on('gus-says', ({ message }) => {
      setGusMessage(message);
    });

    socket.on('game-over', ({ winnerName, scores, reason }) => {
      setWinner({ name: winnerName, scores, reason });
      setScreen('trivia-gameover');
    });

    // ── Party Menu events ─────────────────────────────────
    socket.on('host-changed', ({ newHostId, newHostName, players: pl }) => {
      setPlayers(pl);
      setIsHost(newHostId === socket.id);
      showToast(`⭐ ${newHostName} is the new Party Leader!`);
    });

    socket.on('kicked', ({ reason }) => {
      setScreen('join');
      setRoomCode('');
      setPlayers([]);
      setIsHost(false);
      setNahGameState(null);
      setTriviaGameState(null);
      setActiveGameInfo(null);
      setVotes({});
      setChatMessages([]);
      showToast(reason || 'You were removed from the party');
    });

    return () => {
      socket.off('connect');
      socket.off('player-joined');
      socket.off('player-rejoined');
      socket.off('player-left');
      socket.off('vote-update');
      socket.off('spice-update');
      socket.off('ai-bots-update');
      socket.off('chat-message');
      socket.off('game-launched');
      socket.off('back-to-lobby');
      socket.off('new-round');
      socket.off('submission-update');
      socket.off('judging-phase');
      socket.off('round-winner');
      socket.off('game-started');
      socket.off('gus-says');
      socket.off('game-over');
      socket.off('host-changed');
      socket.off('kicked');
    };
  }, [showToast]);

  // ── Handlers ──────────────────────────────────────────────
  const handleCreate = (name) => {
    socket.emit('create-room', { playerName: name, playerId }, (res) => {
      if (res.error) return showToast(res.error);
      setPlayerName(name);
      setRoomCode(res.roomCode);
      setPlayers(res.players);
      setIsHost(true);
      setGames(res.games || []);
      setVotes(res.votes || {});
      setChatMessages(res.chatMessages || []);
      if (res.spiceLevel) setSpiceLevel(res.spiceLevel);
      if (res.aiBots !== undefined) setAiBots(res.aiBots);
      setScreen('lobby');
      socket.emit('get-themes', (t) => setNahThemes(t));
    });
  };

  const handleJoin = (name, code) => {
    socket.emit('join-room', { roomCode: code, playerName: name, playerId }, (res) => {
      if (res.error) return showToast(res.error);
      setPlayerName(name);
      setRoomCode(res.roomCode);
      setPlayers(res.players);
      setIsHost(res.isHost);
      setGames(res.games || []);
      setVotes(res.votes || {});
      setChatMessages(res.chatMessages || []);
      if (res.spiceLevel) setSpiceLevel(res.spiceLevel);
      if (res.aiBots !== undefined) setAiBots(res.aiBots);

      if ((res.state === 'IN_GAME' || res.state === 'PENDING') && res.activeGame) {
        if (res.activeGame === 'nerds-against-humanity') {
          setScreen('nah-game');
        } else if (res.activeGame === 'meme-melee') {
          setScreen('meme-melee-game');
        } else if (res.activeGame === 'super-sketchy') {
          setScreen('super-sketchy-game');
        } else if (res.activeGame === 'trivia-fetch') {
          setScreen('trivia-game');
        } else {
          const info = (res.games || []).find(g => g.id === res.activeGame);
          if (info) setActiveGameInfo(info);
          setScreen('base-game');
        }
      } else {
        setScreen('lobby');
      }
    });
  };

  const handleVote = (gameId) => {
    socket.emit('vote-game', { gameId }, (res) => {
      if (res.error) showToast(res.error);
    });
  };

  const handleSetSpice = (level) => {
    socket.emit('set-spice', { spiceLevel: level }, (res) => {
      if (res?.error) showToast(res.error);
    });
  };

  const handleToggleAiBots = () => {
    socket.emit('toggle-ai-bots', (res) => {
      if (res?.error) showToast(res.error);
    });
  };


  const handleLaunchGame = (gameId, launchOpts = {}) => {
    const opts = { gameId };
    if (gameId === 'nerds-against-humanity') {
      opts.selectedThemes = nahSelectedThemes;
    }
    if (launchOpts.selectedTopics) {
      opts.selectedTopics = launchOpts.selectedTopics;
    }
    if (launchOpts.selectedCategories) {
      opts.selectedCategories = launchOpts.selectedCategories;
    }
    // Store game info for BaseGamePlayer
    const info = games.find(g => g.id === gameId);
    if (info) setActiveGameInfo(info);
    socket.emit('launch-game', opts, (res) => {
      if (res.error) showToast(res.error);
    });
  };

  const handleSendChat = (text) => {
    socket.emit('chat-message', { text }, (res) => {
      if (res?.error) showToast(res.error);
    });
  };

  const handleSendVoice = ({ audio, mimeType, duration }) => {
    socket.emit('voice-message', { audio, mimeType, duration }, (res) => {
      if (res?.error) showToast(res.error);
    });
  };

  const handleLeave = () => {
    socket.emit('leave-game', () => {
      setScreen('join');
      setRoomCode('');
      setPlayers([]);
      setIsHost(false);
      setNahGameState(null);
      setTriviaGameState(null);
      setActiveGameInfo(null);
      setVotes({});
      setChatMessages([]);
    });
  };

  const handleReturnToLobby = () => {
    socket.emit('return-to-lobby');
  };

  const handlePlayAgain = () => {
    socket.emit('play-again');
  };

  const handleRestartSameGame = () => {
    socket.emit('restart-same-game', (res) => {
      if (res?.error) showToast(res.error);
    });
  };

  const handlePromoteHost = (targetId) => {
    socket.emit('promote-host', { targetId }, (res) => {
      if (res?.error) showToast(res.error);
    });
  };

  const handleKickPlayer = (targetId) => {
    socket.emit('kick-player', { targetId }, (res) => {
      if (res?.error) showToast(res.error);
    });
  };

  // ── NAH handlers ──────────────────────────────────────────
  const handleNAHSubmit = (cardIndices) => {
    socket.emit('submit-cards', { cardIndices }, (res) => {
      if (res.error) showToast(res.error);
    });
  };

  const handleNAHJudge = (index) => {
    socket.emit('judge-pick', { submissionIndex: index }, (res) => {
      if (res.error) showToast(res.error);
    });
  };

  const handleNextRound = () => {
    socket.emit('next-round');
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="app">
      {toast && <div className="toast pop-in">{toast}</div>}

      {screen === 'join' && (
        <JoinScreen onCreateRoom={handleCreate} onJoinRoom={handleJoin} />
      )}

      {screen === 'lobby' && (
        <Lobby
          roomCode={roomCode}
          players={players}
          isHost={isHost}
          games={games}
          votes={votes}
          onVote={handleVote}
          onLaunch={handleLaunchGame}
          onLeave={handleLeave}
          nahThemes={nahThemes}
          nahSelectedThemes={nahSelectedThemes}
          onToggleTheme={(id) => {
            setNahSelectedThemes(prev => {
              if (prev.includes(id)) {
                if (prev.length <= 1) return prev;
                return prev.filter(t => t !== id);
              }
              return [...prev, id];
            });
          }}
          spiceLevel={spiceLevel}
          onSetSpice={handleSetSpice}
          aiBots={aiBots}
          onToggleAiBots={handleToggleAiBots}
          theme={theme}
        />
      )}

      {screen === 'nah-game' && nahGameState && (
        <NAHGame
          gameState={nahGameState}
          myId={socket.id}
          onSubmit={handleNAHSubmit}
          onJudge={handleNAHJudge}
          onNextRound={handleNextRound}
          onPlayAgain={handleReturnToLobby}
          onRestartSame={handleRestartSameGame}
          isHost={isHost}
          onLeave={handleReturnToLobby}
        />
      )}

      {screen === 'meme-melee-game' && nahGameState && (
        <MemeMeleeGame
          gameState={nahGameState}
          myId={socket.id}
          onSubmit={handleNAHSubmit}
          onJudge={handleNAHJudge}
          onNextRound={handleNextRound}
          onPlayAgain={handleReturnToLobby}
          onRestartSame={handleRestartSameGame}
          isHost={isHost}
          onLeave={handleReturnToLobby}
        />
      )}

      {screen === 'super-sketchy-game' && (
        <SuperSketchyGame
          socket={socket}
          myId={socket.id}
          isHost={isHost}
          onReturn={handleReturnToLobby}
          onRestartSame={handleRestartSameGame}
        />
      )}

      {screen === 'trivia-game' && triviaGameState && (
        <TriviaGame
          socket={socket}
          playerName={playerName}
          roomCode={roomCode}
          gameState={triviaGameState}
          setGameState={setTriviaGameState}
          gusMessage={gusMessage}
          showToast={showToast}
        />
      )}

      {screen === 'trivia-gameover' && winner && (
        <div className="game-over-screen">
          <div className="game-over-content pop-in">
            <div className="winner-title">
              {winner.reason ? '💀 Game Over' : '👑 The Crown Goes To...'}
            </div>
            <div className="winner-name wobble">
              {winner.name || winner.reason || 'Nobody'}
            </div>

            <div className="gus-says-area">
              <span className="gus-emoji">🐕</span>
              <div className="gus-bubble">{gusMessage}</div>
            </div>

            {winner.scores && (
              <div className="final-scores">
                <h3>Final Scores</h3>
                {[...winner.scores]
                  .sort((a, b) => b.score - a.score)
                  .map((s, i) => (
                    <div className="final-score-row" key={i}>
                      <span className="rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
                      <span className="name">{s.name}</span>
                      <span className="paws">{s.pawStamps?.length || 0} 🦴</span>
                    </div>
                  ))}
              </div>
            )}

            {isHost && (
              <div className="game-over-buttons">
                <button className="button button--primary" onClick={handleRestartSameGame}>
                  🔄 Play Again
                </button>
                <button className="button button--primary" onClick={handleReturnToLobby}>
                  🎉 Back to Party!
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BaseGame — Universal game screen for all BaseGame-derived games */}
      {screen === 'base-game' && (
        <BaseGamePlayer
          socket={socket}
          myId={socket.id}
          isHost={isHost}
          gameInfo={activeGameInfo}
          onReturn={handleReturnToLobby}
          onRestartSame={handleRestartSameGame}
        />
      )}

      {/* Party Menu — available everywhere except join screen */}
      {screen !== 'join' && (
        <PartyMenu
          players={players}
          isHost={isHost}
          myId={socket.id}
          roomCode={roomCode}
          screen={screen}
          gameInfo={activeGameInfo}
          onPromote={handlePromoteHost}
          onKick={handleKickPlayer}
          onReturnToLobby={handleReturnToLobby}
          onLeave={handleLeave}
          showToast={showToast}
          theme={theme}
        />
      )}

      {/* Chat available everywhere except join screen */}
      {screen !== 'join' && (
        <Chat
          messages={chatMessages}
          onSend={handleSendChat}
          onSendVoice={handleSendVoice}
          playerName={playerName}
        />
      )}

      <ThemeSwitcher theme={theme} onChangeTheme={handleThemeChange} />
    </div>
  );
}
