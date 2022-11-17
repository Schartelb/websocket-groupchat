/** Functionality related to chatting. */

// Room is an abstraction of a chat channel
const { json } = require('express');
const Room = require('./Room');
const axios = require('axios');
const dadURL = "https://icanhazdadjoke.com/"

/** ChatUser is a individual connection from client -> server to chat. */

class ChatUser {
  /** make chat: store connection-device, rooom */

  constructor(send, roomName) {
    this._send = send; // "send" function for this user
    this.room = Room.get(roomName); // room user will be in
    this.name = null; // becomes the username of the visitor

    console.log(`created chat in ${this.room.name}`);
  }

  /** send msgs to this client using underlying connection-send-function */

  send(data) {
    try {
      this._send(data);
    } catch {
      // If trying to send to a user fails, ignore it
    }
  }

  /** handle joining: add to room members, announce join */

  handleJoin(name) {
    this.name = name;
    this.room.join(this);
    this.room.broadcast({
      type: 'note',
      text: `"${this.name} joined "${this.room.name}".`
    });
  }


/**handle Name Change: add to room members, remove old,
 *  announce change */

 handleNameChange(data) {
  let oldName = this.name
  this.room.leave(this)
  let text = data.text.split(" ")
  let name = text[1]
  this.name = name;
  this.room.join(this);
  this.room.broadcast({
    type: 'note',
    text: `"${oldName} is now ${name}".`
  });
}
  /** handle a chat: broadcast to room. */

  handleChat(text) {
    this.room.broadcast({
      name: this.name,
      type: 'chat',
      text: text
    });
  }

  singleChat(text){
    this.room.message({
      name: this.name,
      type:"chat",
      text: text
    })
  }
  /** Handle messages from client:
   *
   * - {type: "join", name: username} : join
   * - {type: "chat", text: msg }     : chat
   * improve by reading first character,
   *  if / send to dictionary with commands, "/joke", "/members"
  */

  handleMessage(jsonData) {
    let msg = JSON.parse(jsonData);
    console.log(`msg - ${msg.name}`)
    if (msg.type === "join"){this.handleJoin(msg.name); 
    }else if (msg.type === "chat"){
          msg.text=="/members" ? this.listMembers(): 
          msg.text=="/joke" ? this.handleJoke():
          msg.text.includes("/name") ? this.handleNameChange(msg):
          this.handleChat(msg.text)
          
  }else throw new Error(`bad message: ${msg.type}`);
  }

  /** Handle Joke request from client:   */
  async handleJoke(){
    try{
    let text = await axios.get(dadURL)
    console.log(text.joke)
    this.singleChat(text.joke)
    }catch(err){
      this.singleChat("All out of Jokes!")
    }
  }

listMembers(){
    let list="In this room: ";
    for(let user of this.room.members){
      list+=`${user.name}\n`
    }
    console.log(list)
    this.singleChat(list)
  }

  /** Connection was closed: leave room, announce exit to others */

  handleClose() {
    this.room.leave(this);
    this.room.broadcast({
      type: 'note',
      text: `${this.name} left ${this.room.name}.`
    });
  }
}

module.exports = ChatUser;
