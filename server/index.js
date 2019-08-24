var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
const path = require('path');
const Sequelize = require('sequelize');


app.use(express.static(path.join(__dirname, '..', '/build')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '/build/index.html'));
});

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '..', 'sqlite_db/database.sqlite'),
});


class Win extends Sequelize.Model {}
Win.init({
  side: Sequelize.STRING,
  at: Sequelize.DATE
}, {
  sequelize,
  modelName: 'win'
});
sequelize.sync();


const port = process.env.PORT || 5000;
http.listen(port, () => {
  console.log(`listening on *:${port}`);
});
app.get('/leaderboard', function (req, res) {
  const findLeftCount = Win.findAndCountAll({
    where: {
      side: 'left',
    },
  });
  const findRightCount = Win.findAndCountAll({
    where: {
      side: 'right',
    },
  });

  Promise.all([findLeftCount, findRightCount]).then(countResults => {
    res.json({
      left: countResults[0].count,
      right: countResults[1].count,
    });
  });
});



const leftConnections = new Set();
const rightConnections = new Set();
io.on('connection', (socket) => {

  if (leftConnections.size > rightConnections.size) {
    rightConnections.add(socket);
    socket.emit('client.connection', {
      team: 'right',
      leftPlayerCount: leftConnections.size,
      rightPlayerCount: rightConnections.size,
    });
    socket.on('disconnect', () => {
      rightConnections.delete(socket);
    });
  }
  else {
    leftConnections.add(socket);
    socket.emit('client.connection', {
      team: 'left',
      leftPlayerCount: leftConnections.size,
      rightPlayerCount: rightConnections.size,
    });
    socket.on('disconnect', () => {
      leftConnections.delete(socket);
    });
  }


  // Chat Logic
  socket.on('server.chatMessage', (msg) => {
    io.emit('client.chatMessage', msg);
  });

  // Game Logic
  socket.on('server.inputLeft', () => {
    incLeft();
  });

  socket.on('server.inputRight', () => {
    incRight();
  });
  
});

function clamp(number, min, max) {
  return Math.max(min, Math.min(number, max));
}

const INC_FORCE = 40;

const GameState = {
  LEFT_WIN: 'LEFT_WIN',
  RIGHT_WIN: 'RIGHT_WIN',
  PLAYING: 'PLAYING',
};

let L_FORCE = 0;
let R_FORCE = 0;
let WIN_NUMBER = 0;
let GAME_STATE = GameState.PLAYING;

function reset() {
  let side;
  if (GAME_STATE === GameState.LEFT_WIN) {
    side = 'left';
  } else {
    side = 'right';
  }

  L_FORCE = 0;
  R_FORCE = 0;
  WIN_NUMBER = 0;
  
  Win.create({
    side: side,
    at: new Date(),
  }).then(() => {
    setTimeout(tick, 7 * 1000);
  });
}


function incLeft() {
  if (GAME_STATE !== GameState.PLAYING) {
    return;
  }

  //scales force by no. of connections
  const teamSizeScale = leftConnections.size === 0 ? 1 : leftConnections.size;
  L_FORCE += Math.max(2, INC_FORCE / teamSizeScale);
}

function incRight() {
  if (GAME_STATE !== GameState.PLAYING) {
    return;
  }

  //scales force by no. of connections
  const teamSizeScale = rightConnections.size === 0 ? 1 : leftConnections.size;
  R_FORCE += Math.max(2, INC_FORCE / teamSizeScale);
}

function tick() {
  L_FORCE -= (L_FORCE * 0.05);
  R_FORCE -= (R_FORCE * 0.05);

  L_FORCE = clamp(L_FORCE, 0, 10000000);
  R_FORCE = clamp(R_FORCE, 0, 10000000);
  let delta = R_FORCE - L_FORCE;
  WIN_NUMBER += delta / 30000;
  WIN_NUMBER = clamp(WIN_NUMBER, -1, 1);

  if (WIN_NUMBER === -1) {
    GAME_STATE = GameState.LEFT_WIN;
    reset();
  }
  else if (WIN_NUMBER === 1) {
    GAME_STATE = GameState.RIGHT_WIN;
    reset();
  }
  else {
    GAME_STATE = GameState.PLAYING;
    
    // tick again
    setTimeout(tick, 1 / 60 * 1000);
  }
  
  io.emit('client.tick', {
    leftForce: L_FORCE,
    rightForce: R_FORCE,
    leftPlayerCount: leftConnections.size,
    rightPlayerCount: rightConnections.size,
    winNumber: WIN_NUMBER,
    state: GAME_STATE,
  });
}
tick();