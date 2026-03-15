// Automated Trivia Fetch! playtest — 2-player happy path
import { io } from 'socket.io-client';

const SERVER = 'http://localhost:4000';
const delay = ms => new Promise(r => setTimeout(r, ms));

function connect(name) {
  return new Promise((resolve, reject) => {
    const s = io(SERVER, { transports: ['websocket'] });
    s.on('connect', () => { console.log(`  ✅ ${name} connected (${s.id})`); resolve(s); });
    s.on('connect_error', e => reject(e));
    setTimeout(() => reject(new Error(`${name} connect timeout`)), 5000);
  });
}

function emit(socket, event, data) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${event} timeout`)), 30000);
    if (data !== undefined && data !== null) {
      socket.emit(event, data, (res) => { clearTimeout(timer); resolve(res); });
    } else {
      socket.emit(event, (res) => { clearTimeout(timer); resolve(res); });
    }
  });
}

async function run() {
  console.log('\n🐕 Trivia Fetch! Automated Playtest\n');

  // Connect two players
  const host = await connect('Host');
  const p2 = await connect('Player2');

  // Create room
  const createRes = await emit(host, 'create-room', { playerName: 'Alice' });
  if (createRes.error) throw new Error('Create room failed: ' + createRes.error);
  const roomCode = createRes.roomCode;
  console.log(`  🏠 Room created: ${roomCode}`);

  // Join room
  const joinRes = await emit(p2, 'join-room', { roomCode, playerName: 'Bob' });
  if (joinRes.error) throw new Error('Join room failed: ' + joinRes.error);
  console.log('  🏠 Bob joined');

  // Vote for trivia-fetch
  await emit(host, 'vote-game', { gameId: 'trivia-fetch' });
  await emit(p2, 'vote-game', { gameId: 'trivia-fetch' });
  console.log('  🗳️  Both voted trivia-fetch');

  // Launch game
  const launchRes = await emit(host, 'launch-game', { gameId: 'trivia-fetch' });
  if (launchRes.error) throw new Error('Launch failed: ' + launchRes.error);
  console.log('  🚀 Game launched!');

  // Listen for events
  let wheelResult = null;
  let questionData = null;
  let answerResultData = null;
  let turnUpdate = null;
  let gusMessages = [];

  host.on('wheel-result', d => { wheelResult = d; });
  host.on('question-show', d => { questionData = d; });
  host.on('answer-result', d => { answerResultData = d; });
  host.on('turn-update', d => { turnUpdate = d; });
  host.on('gus-says', d => { gusMessages.push(d.message); });
  p2.on('wheel-result', d => { /* p2 sees too */ });
  p2.on('question-show', d => { /* p2 sees too */ });
  p2.on('answer-result', d => { /* p2 sees too */ });
  p2.on('turn-update', d => { /* p2 sees too */ });

  await delay(500);

  // Play 3 rounds
  for (let round = 1; round <= 3; round++) {
    console.log(`\n  ── Round ${round} ──`);
    wheelResult = null;
    questionData = null;
    answerResultData = null;
    turnUpdate = null;

    // Figure out whose turn it is
    const activeSocket = round === 1 ? host : (turnUpdate?.activePlayerId === host.id ? host : p2);
    const activeName = activeSocket === host ? 'Alice' : 'Bob';

    // Spin
    const spinRes = await emit(activeSocket, 'spin-wheel');
    if (spinRes.error) { console.log(`  ❌ Spin error: ${spinRes.error}`); break; }
    console.log(`  🎡 ${activeName} spun → segment: ${spinRes.segment?.name || 'unknown'}`);

    await delay(500); // Wait for wheel-result event

    if (!wheelResult) {
      console.log('  ⚠️  No wheel-result received');
    }

    // Request question
    const qRes = await emit(activeSocket, 'request-question');
    if (qRes.error) { console.log(`  ❌ Question error: ${qRes.error}`); break; }
    console.log(`  ❓ Question: "${qRes.question?.substring(0, 60)}..."`);

    await delay(300);

    // Submit answer (always pick index 0 for testing)
    answerResultData = null;
    const ansRes = await emit(activeSocket, 'submit-answer', { answerIndex: 0 });
    if (ansRes.error) { console.log(`  ❌ Answer error: ${ansRes.error}`); break; }
    console.log(`  ${ansRes.correct ? '✅ Correct!' : '❌ Wrong'} (answer was index ${ansRes.correctIndex})`);
    if (ansRes.stampEarned) console.log(`  🦴 Treat earned: ${ansRes.stampEarned}`);
    if (ansRes.gameWon) console.log(`  🏆 ${ansRes.winnerName} WINS!`);

    await delay(300);

    // Check turn update
    if (turnUpdate) {
      const nextName = turnUpdate.activePlayerId === host.id ? 'Alice' : 'Bob';
      console.log(`  ➡️  Next turn: ${nextName} (state: ${turnUpdate.state})`);
    }
  }

  // Print Gus messages
  if (gusMessages.length > 0) {
    console.log(`\n  🐕 Gus said ${gusMessages.length} things:`);
    gusMessages.forEach((m, i) => console.log(`     ${i + 1}. ${m}`));
  } else {
    console.log('\n  ⚠️  Gus never said anything (Gemini may not be connected)');
  }

  // Test game-over event
  host.on('game-over', d => {
    console.log(`  🏆 Game over! Winner: ${d.winnerName}`);
  });

  console.log('\n  ✅ Playtest complete!\n');
  
  host.disconnect();
  p2.disconnect();
  process.exit(0);
}

run().catch(e => {
  console.error('❌ Playtest failed:', e.message);
  process.exit(1);
});
