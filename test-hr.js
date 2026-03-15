const { io } = require('./client/node_modules/socket.io-client');

const host = io('http://localhost:4000', { transports: ['websocket'] });
const p2 = io('http://localhost:4000', { transports: ['websocket'] });
const p3 = io('http://localhost:4000', { transports: ['websocket'] });

let roomCode = null;
let roundCount = 0;

function log(tag, msg) { console.log(`[${tag}] ${msg}`); }

host.on('connect', () => {
  log('HOST', 'Connected: ' + host.id);
  host.emit('create-room', { playerName: 'Pharaoh1', playerId: 'pid1' }, (res) => {
    if (res.error) { log('HOST', 'CREATE ERR: ' + res.error); process.exit(1); }
    roomCode = res.roomCode;
    log('HOST', 'Room: ' + roomCode);
    log('HOST', 'Avatar: ' + res.players[0]?.avatar);

    p2.emit('join-room', { roomCode, playerName: 'Anubis2', playerId: 'pid2' }, (r) => {
      if (r.error) return log('P2', 'JOIN ERR: ' + r.error);
      log('P2', 'Joined, avatar: ' + r.players.find(p => p.name === 'Anubis2')?.avatar);

      p3.emit('join-room', { roomCode, playerName: 'Sphinx3', playerId: 'pid3' }, (r2) => {
        if (r2.error) return log('P3', 'JOIN ERR: ' + r2.error);
        log('P3', 'Joined, avatar: ' + r2.players.find(p => p.name === 'Sphinx3')?.avatar);

        host.emit('get-topic-packs', (t) => {
          log('HOST', 'Topic packs: ' + Object.keys(t.packs).length + ' packs');
          log('HOST', 'Selected: ' + t.selected.length + ' selected');
        });

        setTimeout(() => {
          host.emit('launch-game', { gameId: 'hieroglyphics' }, (r3) => {
            if (r3.error) return log('HOST', 'LAUNCH ERR: ' + r3.error);
            log('HOST', 'Game launched!');
          });
        }, 500);
      });
    });
  });
});

[host, p2, p3].forEach((s, i) => {
  const tag = ['HOST', 'P2', 'P3'][i];

  s.on('bg-round-start', (d) => {
    if (i === 0) {
      roundCount++;
      log(tag, `=== ROUND ${d.round}/${d.totalRounds} ===`);
      log(tag, 'Emojis: ' + (d.prompt?.text || 'none'));
      log(tag, 'Instruction: ' + (d.prompt?.instruction || 'none'));
      log(tag, 'Category: ' + (d.prompt?.category || 'none'));
      log(tag, 'BellBot: ' + (d.bellbotSays || 'none'));
    }

    // All 3 players submit guesses
    const guesses = ['Star Wars', 'Pizza', 'I dunno'];
    setTimeout(() => {
      s.emit('bg-submit', { submission: guesses[i] });
      if (i === 0) log(tag, 'Submitted: ' + guesses[i]);
    }, 800 + i * 300);
  });

  s.on('bg-submission-update', (d) => {
    log(tag, `Submitted: ${d.submittedCount}/${d.totalPlayers}`);
  });

  s.on('bg-preparing', (d) => log(tag, 'Preparing: ' + d.message));

  s.on('bg-reveal-start', () => log(tag, 'Reveal starting...'));

  s.on('bg-reveals', (d) => {
    log(tag, `Reveals (${d.reveals?.length}):`);
    if (d.reveals) {
      d.reveals.forEach(r => {
        const sub = typeof r.submission === 'string' ? r.submission : JSON.stringify(r.submission);
        log(tag, `  ${r.playerName}: "${sub}" | ${r.aiComment || ''}`);
      });
    }
  });

  s.on('bg-round-end', (d) => {
    if (i !== 0) return; // only log from host
    log(tag, '--- ROUND END ---');
    log(tag, 'BellBot: ' + d.bellbotSays);
    log(tag, 'Correct Answer: ' + d.correctAnswer);
    log(tag, 'GameOver: ' + d.gameOver);
    if (d.roundScores) {
      d.roundScores.forEach(rs => {
        log(tag, `  ${rs.name}: ${rs.aiScore}pts - "${rs.aiComment}" (guess: "${rs.submission}")`);
      });
    }
    if (d.leaderboard) {
      log(tag, 'Leaderboard: ' + d.leaderboard.map(l => `${l.name}:${l.score}`).join(', '));
    }

    if (d.gameOver) {
      log(tag, '=== GAME OVER ===');
      log(tag, `Winner: ${d.leaderboard?.[0]?.name} with ${d.leaderboard?.[0]?.score} pts`);
      setTimeout(() => process.exit(0), 500);
    } else if (i === 0) {
      // Host advances to next round
      setTimeout(() => {
        log(tag, '>> Advancing to next round...');
        host.emit('bg-next-round', (r) => {
          if (r?.error) log(tag, 'NEXT ROUND ERR: ' + r.error);
        });
      }, 1500);
    }
  });
});

setTimeout(() => { console.log('TEST TIMEOUT'); process.exit(0); }, 120000);
