import React from 'react';
import PropTypes from 'prop-types'
import './App.css';
import ChatWindow from './ChatWindow';
import io from 'socket.io-client';

const SERVER_HOST = window.origin;
let socket = io(SERVER_HOST);

function clamp(number, min, max) {
  return Math.max(min, Math.min(number, max));
}

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      leftForce: 0,
      rightForce: 0,
      leftWin: 0,
      rightWin: 0,
      leftPlayerCount: 0,
      rightPlayerCount: 0,
      winNumber: 0,
      team: null, 
    };
  }

  componentDidMount() {
    document.addEventListener('mousedown', this.handleClick);
    document.addEventListener('touchend', this.handleClick);
    socket.on('client.tick', this.handleTick);
    socket.on('client.connection', this.handleConnection);
    this.fetchLeaderboard();
  }

  fetchLeaderboard = () => {
    fetch(`${SERVER_HOST}/leaderboard`, {
      method: 'GET'
    })
    .then(res => res.json())
    .then(this.handleLeaderboardResponse)
  }

  componentWillUnmount() {
    document.addEventListener('mousedown', this.handleClick);
    document.addEventListener('touchend', this.handleClick);
  }

//prevents android from registering mouse events in addition to taps

  handleClick = (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.keyCode == 13) return;


    e.preventDefault();

    if (this.state.team === 'left') {
      socket.emit('server.inputLeft');
    } else if (this.state.team === 'right') {
      socket.emit('server.inputRight');
    }
  };

  handleLeaderboardResponse = (res) => {
    this.setState({
      leftWin: res.left,
      rightWin: res.right,
    });
  };

  handleConnection = (connectionInfo) => {
    this.setState({
      team: connectionInfo.team,
      leftPlayerCount: connectionInfo.leftPlayerCount,
      rightPlayerCount: connectionInfo.rightPlayerCount,
    });
  }


  handleTick = (gameInfo) => {
    this.setState({
      leftForce: gameInfo.leftForce,
      rightForce: gameInfo.rightForce,
      leftPlayerCount: gameInfo.leftPlayerCount,
      rightPlayerCount: gameInfo.rightPlayerCount,
      winNumber: gameInfo.winNumber,
      gameState: gameInfo.state, 
    });

    if (gameInfo.state !== 'PLAYING') {
      this.fetchLeaderboard();
    }
  };

  render() {
    let lineStyle = {
      transform: `translate(${this.state.winNumber * 300}px, 0)`
    };

    let classes = ['App', this.state.gameState].join(' ');

    let gameStateComponent;
    if (this.state.gameState === 'LEFT_WIN') {
      gameStateComponent = (
        <div className="GameStateTitle">Left Wins!</div>
      );
    }
    else if (this.state.gameState === 'RIGHT_WIN') {
      gameStateComponent = (
        <div className="GameStateTitle">Right Wins!</div>
      );
    }
    else {
      gameStateComponent = (
        <div className="GameStateTitle">CLICK or TAP to TUG!</div>
      );
    }
    return (
      <div className={classes}>
      <div className="GameTitle"><span>Tug-0-War!</span></div>
        <div className="TeamTitle">
          {this.state.team === 'left' && (
            <span>You are Left Team!</span>
          )}
          {this.state.team === 'right' && (
            <span>You are Right Team!</span>
          )}
          {this.state.team === null && (
            <span>...</span>
          )}
        </div>
        <div className="Leaderboard">
          <div className="Leaderboard__left">
            <div>Left Wins:{this.state.leftWin}</div>
            <div>Players:{this.state.leftPlayerCount}</div>
            <div>Speed: {this.state.leftForce.toFixed(2)}</div>
          </div>
          <div className="Leaderboard__right">
            <div>Right Wins:{this.state.rightWin}</div>
            <div>Players:{this.state.rightPlayerCount}</div>
            <div>Speed: {this.state.rightForce.toFixed(2)}</div>
          </div>
        </div>
        {gameStateComponent}
        <div className="LineBox">
          <div style={lineStyle} className="Line" />
        </div>
        <ChatWindow socket={socket} />
      </div>
    );
  }
}


App.propTypes = {
  incrementForce: PropTypes.number,
  dragForce: PropTypes.number,
};

App.defaultProps = {
  incrementForce: 40,
  dragForce: 1,
};

export default App;
