const Discord = require('discord.js');
const client = new Discord.Client();
const config = require('./config.json');
const ytdl = require('ytdl-core');

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setActivity('& runnin some with the bois', {type: 'STREAMING'})
});

client.login(config.token);

// Enables Youtube functionality
//client.setYoutubeKey(config.ytToken);

// Initializes playlist dict using 'playlist.txt' as source
function init_playlist() {
    var fs = require('fs');
    var file = fs.readFileSync('./playlist.txt').toString();

    // Formats text file by [genre, link, ..., ...]
    var textFile = file.split(';');

    var dict = {};
    var ifKey = true;
    var keyVal = "";

    // Initializes dict by alternating from genre/link
    for (var i in textFile) {
        if (ifKey) {
            keyVal = textFile[i].replace(/(\r\n|\n|\r)/gm, "");
            ifKey = false;
        } else {
            dict[keyVal] = textFile[i];
            ifKey = true;
        }
    }
    return dict;
}

// Initializes current set of playlists in a dict
var playlist_dict = init_playlist();

// Inits playlist queue
const queue = new Map();
var music_init = false;
var queueConstruct = null;


async function execute(message, serverQueue) {
	const args = message.content.split(' ');

	const voiceChannel = message.member.voiceChannel;
	if (!voiceChannel) return message.channel.send('You need to be in a voice channel to play music!');
	const permissions = voiceChannel.permissionsFor(message.client.user);
	if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
		return message.channel.send('I need the permissions to join and speak in your voice channel!');
	}

	
	const songInfo = await ytdl.getInfo(args[1]);

	console.log(songInfo);

	const song = {
		title: songInfo.title,
		url:   songInfo.video_url,
	};

	if (!song) {
		serverQueue.voiceChannel.leave();
		queue.delete(guild.id);
		return;
	}
	
	
	
	if (!queueConstruct) {
		queueConstruct = {				// whats purpose of queueConstruct vs serverQueue
			textChannel: message.channel,
			voiceChannel: voiceChannel,
			connection: null,
			songs: [],
			volume: 5,
			playing: true,
		};

		queue.set(message.guild.id, queueConstruct);

		//queueConstruct.songs.push(song);

		try {
			var connection = await voiceChannel.join();
			queueConstruct.connection = connection;
			queueConstruct.songs.push(song);

			if (!queueConstruct.songs[0]) {
				serverQueue.voiceChannel.leave();
				queue.delete(guild.id);
				return;
			}
			
			//console.log(queueConstruct.songs);
			//play(message.guild, connection, queueConstruct.songs[0], message, songInfo);
			//while (queueConstruct.songs) {
			console.log('here?');
			let stream = ytdl.downloadFromInfo(songInfo, { highWaterMark: 1024 * 1024 * 10 });
			let dispatcher = connection.playStream(stream)
				.on('end', () => {
					message.channel.send(`Finished playing: ${song.title}`);
					//console.log(queueConstruct.songs);
					queueConstruct.songs.shift();
					//console.log(queueConstruct.songs);
					//execute(message, queue.get(message.guild.id));
					//play(guild, serverQueue.songs[0]);
				})
				.on('error', error => {
					console.error(error);
				});
			dispatcher.setVolumeLogarithmic(queueConstruct.volume / 5);
			//} 
		} catch (err) {
			console.log(err);
			queue.delete(message.guild.id);
			return message.channel.send(err);
		}
			
	} else {
		console.log('here 2');
		queueConstruct.songs.push(song);
		console.log(serverQueue.songs);
		return message.channel.send(`${song.title} has been added to the queue!`);
	}
}

// pass in songInfo, use the ytdl.downloadFromInfo in this f(x) for queueing songs
function play(guild, connection, song, message, songInfo) {
	const serverQueue = queue.get(guild.id);

	if (!song) {
		serverQueue.voiceChannel.leave();
		queue.delete(guild.id);
		return;
	}

	message.channel.send(`${song.title} has been added to the queue!`);
	let stream = ytdl.downloadFromInfo(songInfo, {filter: 'audioonly'});
	let dispatcher = connection.playStream(stream)
		.on('end', () => {
			message.channel.send(`Finished playing: ${song.title}`);
			serverQueue.songs.shift();
			play(guild, serverQueue.songs[0]);
		})
		.on('error', error => {
			console.error(error);
		});
	dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
}

function stop(message, queueConstruct) {
	if (!message.member.voiceChannel) return message.channel.send('You have to be in a voice channel to stop the music!');
	if (queueConstruct) {
		queueConstruct.songs = [];
		queueConstruct.connection.dispatcher.end();
	}
}

function skip(message, queueConstruct) {
	if (!message.member.voiceChannel) return message.channel.send('You have to be in a voice channel to stop the music!');
	if (!queueConstruct) return message.channel.send('There is no song that I could skip!');
	queueConstruct.connection.dispatcher.end();
}

function print_queue(message, serverQueue) {
	//
	console.log(serverQueue);
	console.log("**************");
	console.log(queue.songs);
}


// Prints available YouTube playlists
function print_playlist(message) {
    for (var key in playlist_dict) {
        message.channel.send(key + ' : ' + playlist_dict[key]);
    }
}

// Adds playlist to overall dict
function add_to_playlist(genre, link) {
	if (genre.length > 0 && link.length > 0) {
		if (link.startsWith('https://www.youtube.com')) {
			playlist_dict[genre] = link;
			// Update text file to reflect addition
			var fs = require("fs");
			fs.appendFile("./playlist.txt", genre + ";" + link + ";\r\n", function (err) {
			if (err) throw err;
			});
			return true;
		}
	} 
    return false;
}

// Removes playlist from overall dict
function remove_from_playlist(genre) {
    playlist_dict.delete(genre);
}

// Displays available commands
function display_help(message) {
    message.channel.send(`Available commands:\n
    					  \t!help, !commands
    					  \t!playlists
    					  \t!add [playist name], [youtube link]
    					  \t!remove [playlist name]
    					  \t!play [youtube link]
    					  \t!skip (skips current song)
    					  \t!stop (ends current song)
    					  \t!roll [n] (rolls a number from 1 - n)
    					  \t'what is my avatar'
    					  \t...
    					  \tWIP`);
}

// Roll die function
// @param: total sides of die
function roll_die(total_sides) {
	return String(Math.floor(Math.random() * (+total_sides - +1)) + +1);
}

// Messaging portion
client.on('message', message => {
    // Our client needs to know if it will execute a command
    // It will listen for messages that will start with `!`
    const serverQueue = queue.get(message.guild.id);
    //message.content = message.content.toLowerCase();
    if (message.content === '!help' || message.content === '!commands') {
        display_help(message);
    } else if (message.content === '!playlists') {
		print_playlist(message);
    } else if (message.content.startsWith('!add')) {
		var input = message.content.substring(5).split(",");
		// Checks validity of command
        var addCheck = add_to_playlist(input[0].trim(), input[1].trim());

        if (addCheck) {
			message.channel.send('Playlist added successfully. Genre is ' + input[0]);
        } else {
			message.channel.send('Playlist failed to be added. Link must be from youtube.com');
        }
    } else if (message.content.startsWith('!remove')) {
		console.log(message.content.split(" ")[1]);
		remove_from_playlist(message.content.split(" ")[1]);
    } else if (message.content === 'what is my avatar') {
		message.reply(message.author.avatarURL);
    } else if (message.content.startsWith('!roll')) {
		var total_sides = message.content.split(" ")[1];
		if (!isNaN(total_sides) && total_sides > 1) {
			var result = roll_die(total_sides);
			message.reply('Your roll from 1 - ' + total_sides + ' is: ' + result);
			if (result === 69) {
				message.channel.send('lol nice');
			}
		} else {
			message.reply('That\'s not a number idiot');
		}
    } else if (message.content.includes('hello') || message.content.includes('hi')) {
		message.reply('ohayo (◕◡◕✿)');
    } else if (message.guild && message.content.startsWith('!play')) {
		execute(message, serverQueue);
		music_init = true;
    } else if (message.content.startsWith('!stop') && music_init) {
		stop(message, serverQueue);
    } else if (message.content.startsWith('!skip') && music_init) {
		skip(message, serverQueue);
    } else if (message.content === '!queue') {
		print_queue(message);
    } else if (message.content.startsWith("!")) {
		message.reply('try using an actual command u big dum dum');
    }
});