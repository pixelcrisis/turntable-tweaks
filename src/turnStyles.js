// turnStyles.js

// the main initiation
const tS = function() {
	this.loadConfig()
	this.loadThemes()
	this.attachRoom()
}

// defaults & utilities
tS.prototype.__ = {
	config: {
		saved: true,
		autobop: true,
		theme: "dark",
		style: "",
		notify: {
			song: true,
			ping: true,
			user: true
		}
	},
	options: {
		theme: {
			dark: "Dark Mode",
			night: "Night Mode",
		},
		style: {
			pink: "Pink",
			blue: "Blue",
			teal: "Teal",
			green: "Green",
		},
	},

	log: (str) => console.info(`turnStyles :: ${str}`),
	// check if obj exists and has a key
	has: (obj, key) => obj !== null && typeof obj != "undefined" && obj[key]
}
// attach to the turntable room
tS.prototype.attachRoom = function() {
	this.core = window.turntable
	if (!this.core) return this.__.log("where are we?")
	this.user = this.core.user.id
	let again = () => setTimeout(tS.prototype.attachRoom.bind(this), 250)

	// let's find the room
	for (let x in this.core) {
		if (this.__.has(this.core[x], "roomId")) {
			this.room = this.core[x]
			break
		}
	}

	if (!this.room) return again()

	// find the room manager
	for (let x in this.room) {
		if (this.__.has(this.room[x], "roomData")) {
			this.ttbl = this.room[x]
			break
		}
	}
	// try again if we can't find it
	if (!this.ttbl) return again()

	// record any currently playing song
	if (this.room.currentSong) {
		this.now_playing = {
			snag: 0, hate: 0,
			love: this.room.upvoters.length,
			...this.room.currentSong.metadata
		}
	}

	this.core.addEventListener('message', this.runEvents.bind(this))

	this.__.log(`loaded room: ${this.room.roomId}`)

	this.runAutobop()
	this.buildPanel()
}

// define our "database"
tS.prototype.loadConfig = function() {
	const store = window.localStorage.getItem("tsdb")
	this.config = store ? JSON.parse(store) : {}

	// apply our defaults for any config upgrades
	this.config = { ...this.__.config, ...this.config }

	this.base = window.tsBase || 'https://ts.pixelcrisis.co/src/'
	this.__.log("loaded config")
}
tS.prototype.saveConfig = function() {
	this.config.theme   = $("#ts_theme").val()
	this.config.style   = $("#ts_style").val()
	this.config.autobop = $("#ts_autobop").val()

	window.localStorage.setItem("tsdb", JSON.stringify(this.config))
	$('#ts_pane').removeClass('active')
	this.__.log("saved config")
	this.loadThemes()
}

// load our styles and themes
tS.prototype.loadThemes = function() {
	this.refreshCSS("themes", this.config.theme)
	this.refreshCSS("styles", this.config.style)
}
tS.prototype.refreshCSS = function(type, name) {
	let curr = $(`link.tS-${type}`)
	let path = `${this.base}/${type}/${name}.css`
	if (!name) return curr.length ? curr.remove() : false
	this.__.log(`loading ${type}/${name}.css`)

	if (curr.length) curr.attr("href", path)
	else {
		let link = document.createElement('link')
		link.classList.add(`tS-${type}`)
		link.rel = "stylesheet"
		link.type = "text/css"
		link.href = path
		document.head.append(link)
	} 
}

// run our autobop (awesome)
tS.prototype.runAutobop = function() {
	if (this.autobop) clearTimeout(this.autobop)
	if (!this.config.autobop) return
	let roomId = this.room.roomId
	this.autobop = setTimeout(() => {
		$(window).focus()
		let options = { bubbles: true, cancelable: true, view: window }
		let awesome = document.querySelectorAll('.awesome-button')[0]
		let clicked = new MouseEvent('click', options)
		return !awesome.dispatchEvent(clicked)
	}, (Math.random() * 7) * 1000)
}

// handle our notifications
tS.prototype.notifyUser = function(data) {
	return window.postMessage({
		type: "tsNotify", notification: data
	})
}

// build our options menu
tS.prototype.buildPanel = function() {
	// the options window
	$('body').append(`
		<div id="ts_pane">
			<h2>turnStyles options</h2>
			
			<label>Theme</label>
			${this.handleOpts('theme')}
			
			<label>Style</label>
			${this.handleOpts('style')}

			<label>${this.handleBool('autobop')} Autobop</label>

			<button id="ts_close">Cancel</button>
			<button id="ts_save">Save</button>
		</div>
	`)
	// the menu toggle
	$('#layout-option').before(`
		<li class="ts link option">
			<a id="ts_open" href="#">turnStyles</a>
		</li>
	`)
	// bind up the events
	$('#ts_save').on('click', this.saveConfig.bind(this))
	$('#ts_open').on('click', () => $('#ts_pane').toggleClass('active'))
	$('#ts_close').on('click', () => $('#ts_pane').removeClass('active'))
}
tS.prototype.handleOpts = function(list) {
	let data = this.__.options[list]
	let opts = `<option value="">None</option>`
	for (let key in data) {
		let curr = this.config[list] == key ? 'selected' : ''
		opts += `<option value="${key}" ${curr}>${data[key]}</option>`
	}
	return `<select id="ts_${list}">${opts}</select>`
}
tS.prototype.handleBool = function(data) {
	let checked = this.__.config[data] ? 'checked' : ''
	return `<input id="ts_${data}" type="checkbox" ${checked} />`
}

// event handlers
tS.prototype.runEvents = function(e) {
	if (!e.command) return
	if (e.command == "speak") this.onNewChat(e)
	if (e.command == "newsong") this.onNewSong(e)
	if (e.command == "snagged") this.onNewSnag(e)
	if (e.command == "update_votes") this.onNewVote(e)
}
tS.prototype.onNewChat = function(e) {
	console.log(e)
}
tS.prototype.onNewSong = function(e) {
	this.runAutobop()

	// save the current as the last played
	if (!this.now_playing) this.last_played = {}
	else this.last_played = { ...this.now_playing }
	// set the current song to the new one
	this.now_playing = {
		love: 0, hate: 0, snag: 0,
		...e.room.metadata.current_song.metadata
	}

	if (this.config.notify.song) {
		let head = `Now Playing: ${this.now_playing.song}`
		let text = `By: ${this.now_playing.artist}`

		if (this.last_played.song) text = [
			`Last:`,
			`${this.last_played.love}🔺`,
			`${this.last_played.hate}🔻`,
			`${this.last_played.snag}❤️`,
			`${this.last_played.song}`
		].join(' ')

		this.notifyUser({ head, text })
	}
}
tS.prototype.onNewSnag = function(e) {
	if (!this.now_playing) return
	this.now_playing.snag += 1
}
tS.prototype.onNewVote = function(e) {
	if (!this.now_playing) return
	this.now_playing.love = e.room.metadata.upvotes
	this.now_playing.hate = e.room.metadata.downvotes
}

const $tS = window.$tS = new tS()