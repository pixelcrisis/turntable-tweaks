// notify.js | send notifications / fake chat messages

module.exports = app => {

  // "Silent" messages posted in chat
  app.Post = function (alert) {
    // Alerts post in the chat
    // but are only visible to the user
    let { head, body, type } = alert
    $('.chat .messages').append(`
      <div class="message ${type}"><em>
        <span class="subject">${head}</span>
        <span class="text">${body}</span>
      </em></div>
    `)
    this.$View().updateChatScroll()
  }

  // send a full chat message to the room
  app.Speak = function (text) {
    // Speak sends a message to chat
    // for all the users in the room
    let roomid = this.$View().roomId
    let section = this.$View().section
    window.turntable.sendMessage({
      text, api: 'room.speak', roomid, section
    })
  }

  // send a desktop notification
  app.Notify = function (alert) {
    // Notify sends desktop notifications
    // but not if we can't, or we're on turntable
    if (!this.canNotify() || document.hasFocus()) return
    let { head, body, type } = alert, icon = this.__logo
    // add a function to refocus and close the notification
    let ding = () => {
      let sent = new Notification(head, { icon, body })
      sent.onclick = () => { window.focus(); sent.close() }
    }
    // if we have a type, delay it, therwise send
    return type ? this.delay(ding, 5, type) : ding()
  }

  // get desktop notificaiton permissions
  app.canNotify = function () {
    let cfg = this.config
    // if we need to send notifications,
    // get the browser permission for it
    let has = cfg.ping_pm || cfg.ping_song || cfg.ping_chat
    // return if no notifications possible
    if (!has || !('Notification' in window)) return false
    if (Notification.permission === 'denied') return false
    // prompt for the permission if default
    if (Notification.permission === 'default') {
      this.Log('requesting notifications')
      Notification.requestPermission()
      return false
    }
    // otherwise we have permissions
    return true
  }

  // check for perms on attach and update
  app.on(['attach', 'update'], app.canNotify)

}