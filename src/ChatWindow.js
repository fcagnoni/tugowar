import React from 'react';
import PropTypes from 'prop-types'
import ioClient from 'socket.io-client';
import './ChatWindow.css';

class ChatWindow extends React.Component {
  constructor(props) {
    super(props);

    this.messageTextInputRef = React.createRef();
    this.state = {
      messageText: '',
      messages: []
    };
    this.messagesRef = React.createRef();
  }

  componentDidMount() {
    this.props.socket.on('client.chatMessage', this.handleChatMessage);
  }

  handleChatMessage = (message) => {
    const newMessages = [
      ...this.state.messages,
      message
    ];
    this.setState({
      messages: newMessages,
    });
    if (this.messagesRef.current) {
      const node = this.messagesRef.current;
      node.scrollTop =  node.scrollHeight - node.clientHeight;
    }
  };

  handleSubmit = (e) => {
    e.preventDefault();
    this.props.socket.emit('server.chatMessage', this.state.messageText);

    this.setState({
      messageText: ''
    });

    if (this.messageTextInputRef.current) {
      this.messageTextInputRef.current.focus();
    }
  };

  render() {
    return (
      <form className="ChatWindow" onSubmit={this.handleSubmit}>
        <div className="ChatWindow__Messages" ref={this.messagesRef}>
        {this.state.messages.map((message, i) => {
          return (
            <div className="chatWindowMessage" key={i}>{message}</div>
          );
        })}
        </div>
        <div className="ChatWindow__Controls">
          <input 
            className="ChatWindow__TextInput"
            ref={this.messageTextInputRef}
            type="text" 
            value={this.state.messageText} 
            onChange={(e) => {
              this.setState({
                messageText: e.target.value,
              });
            }}  
          />
          <input className="ChatWindow__SendButton" type="submit" value="Send Message" />
        </div>
      </form>
    );
  }
}


ChatWindow.propTypes = {
  socket: PropTypes.object.isRequired,
};

ChatWindow.defaultProps = {
  
};

export default ChatWindow;
