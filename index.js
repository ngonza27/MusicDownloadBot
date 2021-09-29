const { Builder, By, Key, until } = require('selenium-webdriver')
const SpotifyWebApi = require('spotify-web-api-node')
const request = require('request')
const fs = require('fs')
const dotenv = require('dotenv')

dotenv.config()

/* Get Access-Token
https://developer.spotify.com/console/post-playlists/

Login
https://developer.spotify.com/dashboard/login
*/

const playlistsId = '21YfnJXZGWAfsQ5wad6Ddf'

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  accessToken: process.env.ACCESS_TOKEN,
})

async function getSpotifySongsList(id) {
  let songsList = []
  let offset = 0
  const total = await spotifyApi
    .getPlaylistTracks(id)
    .then((data) => data.body.total)
    .catch()

  while (offset < total) {
    let songsBatch = await spotifyApi
      .getPlaylistTracks(id, { offset })
      .then((data, err) => {
        if (err) console.log(err)

        return data.body.items.map((item) => {
          return item.track.name + '  ' + item.track.artists[0].name
        })
      })
      .catch()
    songsList.push(...songsBatch)
    offset += 100
  }
  return songsList
}

function downloadSong(songURL, song_name) {
  request
    .get(songURL)
    .on('error', function (err) {
      console.log(err)
    })
    .pipe(fs.createWriteStream(song_name + '.mp3'))
}

async function download(id) {
  let array = await getSpotifySongsList(id)
  const arrayLength = array.length
  let global_song_name = ""
  let driver = await new Builder().forBrowser('firefox').build()

  for (let i = 0; i < arrayLength; ++i) {
    const songName = array[i]
    try {
      await driver.get(
        `https://www.youtube.com/results?search_query=${songName}`
      )

      await driver.wait(until.elementLocated(By.id('video-title')), 3000)
      const url = await driver
        .findElement(By.id('video-title'))
        .getAttribute('href')
      let song_name = await driver
        .findElement(By.id('video-title'))
        .getAttribute('title')
      song_name = song_name.replace(/[&\/\\#^+()$~%.'":*?<>{}|!@]/g, '')
      global_song_name = song_name
      let splited_url = url.split('.com')
      const downloadPageUrl = splited_url[0] + 'pp.com' + splited_url[1]
      await driver.get(downloadPageUrl)
      await driver.wait(until.elementLocated(By.linkText('mp3')), 3000).click()
      await driver
        .wait(until.elementLocated(By.linkText('Download')), 3000)
        .click()
      const downloadUrl = await driver
        .wait(until.elementLocated(By.linkText('Download .mp3')), 5000)
        .getAttribute('href')
      downloadSong(downloadUrl, song_name)
    } catch (err) {
      console.log(err, global_song_name)
    }
  }
}

download(playlistsId)
