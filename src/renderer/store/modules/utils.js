import IsEqual from 'lodash.isequal'
import FtToastEvents from '../../components/ft-toast/ft-toast-events'
import fs from 'fs'
import path from 'path'
import i18n from '../../i18n/index'

import { IpcChannels } from '../../../constants'

const state = {
  isSideNavOpen: false,
  sessionSearchHistory: [],
  popularCache: null,
  trendingCache: {
    default: null,
    music: null,
    gaming: null,
    movies: null
  },
  showProgressBar: false,
  progressBarPercentage: 0,
  regionNames: [],
  regionValues: [],
  recentBlogPosts: [],
  searchSettings: {
    sortBy: 'relevance',
    time: '',
    type: 'all',
    duration: ''
  },
  colorNames: [
    'Red',
    'Pink',
    'Purple',
    'DeepPurple',
    'Indigo',
    'Blue',
    'LightBlue',
    'Cyan',
    'Teal',
    'Green',
    'LightGreen',
    'Lime',
    'Yellow',
    'Amber',
    'Orange',
    'DeepOrange',
    'DraculaCyan',
    'DraculaGreen',
    'DraculaOrange',
    'DraculaPink',
    'DraculaPurple',
    'DraculaRed',
    'DraculaYellow',
    'CatppuccinMochaRosewater',
    'CatppuccinMochaFlamingo',
    'CatppuccinMochaPink',
    'CatppuccinMochaMauve',
    'CatppuccinMochaRed',
    'CatppuccinMochaMaroon',
    'CatppuccinMochaPeach',
    'CatppuccinMochaYellow',
    'CatppuccinMochaGreen',
    'CatppuccinMochaTeal',
    'CatppuccinMochaSky',
    'CatppuccinMochaSapphire',
    'CatppuccinMochaBlue',
    'CatppuccinMochaLavender'

  ],
  colorValues: [
    '#d50000',
    '#C51162',
    '#AA00FF',
    '#6200EA',
    '#304FFE',
    '#2962FF',
    '#0091EA',
    '#00B8D4',
    '#00BFA5',
    '#00C853',
    '#64DD17',
    '#AEEA00',
    '#FFD600',
    '#FFAB00',
    '#FF6D00',
    '#DD2C00',
    '#8BE9FD',
    '#50FA7B',
    '#FFB86C',
    '#FF79C6',
    '#BD93F9',
    '#FF5555',
    '#F1FA8C',
    '#F5E0DC',
    '#F2CDCD',
    '#F5C2E7',
    '#CBA6F7',
    '#F38BA8',
    '#EBA0AC',
    '#FAB387',
    '#F9E2AF',
    '#A6E3A1',
    '#94E2D5',
    '#89DCEB',
    '#74C7EC',
    '#89B4FA',
    '#B4BEFE'
  ],
  externalPlayerNames: [],
  externalPlayerNameTranslationKeys: [],
  externalPlayerValues: [],
  externalPlayerCmdArguments: {}
}

const getters = {
  getIsSideNavOpen () {
    return state.isSideNavOpen
  },

  getCurrentVolume () {
    return state.currentVolume
  },

  getSessionSearchHistory () {
    return state.sessionSearchHistory
  },

  getPopularCache () {
    return state.popularCache
  },

  getTrendingCache () {
    return state.trendingCache
  },

  getSearchSettings () {
    return state.searchSettings
  },

  getColorNames () {
    return state.colorNames
  },

  getColorValues () {
    return state.colorValues
  },

  getShowProgressBar () {
    return state.showProgressBar
  },

  getProgressBarPercentage () {
    return state.progressBarPercentage
  },

  getRegionNames () {
    return state.regionNames
  },

  getRegionValues () {
    return state.regionValues
  },

  getRecentBlogPosts () {
    return state.recentBlogPosts
  },

  getExternalPlayerNames () {
    return state.externalPlayerNames
  },

  getExternalPlayerNameTranslationKeys () {
    return state.externalPlayerNameTranslationKeys
  },

  getExternalPlayerValues () {
    return state.externalPlayerValues
  },

  getExternalPlayerCmdArguments () {
    return state.externalPlayerCmdArguments
  }
}

/**
 * Wrapper function that calls `ipcRenderer.invoke(IRCtype, payload)` if the user is
 * using Electron or a provided custom callback otherwise.
 * @param {Object} context Object
 * @param {String} IRCtype String
 * @param {Function} webCbk Function
 * @param {Object} payload any (default: null)
*/

async function invokeIRC(context, IRCtype, webCbk, payload = null) {
  let response = null
  if (process.env.IS_ELECTRON) {
    const { ipcRenderer } = require('electron')
    response = await ipcRenderer.invoke(IRCtype, payload)
  } else if (webCbk) {
    response = await webCbk()
  }

  return response
}

const actions = {
  openExternalLink (_, url) {
    if (process.env.IS_ELECTRON) {
      const ipcRenderer = require('electron').ipcRenderer
      ipcRenderer.send(IpcChannels.OPEN_EXTERNAL_LINK, url)
    } else {
      window.open(url, '_blank')
    }
  },

  replaceFilenameForbiddenChars(_, filenameOriginal) {
    let filenameNew = filenameOriginal
    let forbiddenChars = {}
    switch (process.platform) {
      case 'win32':
        forbiddenChars = {
          '<': '＜', // U+FF1C
          '>': '＞', // U+FF1E
          ':': '：', // U+FF1A
          '"': '＂', // U+FF02
          '/': '／', // U+FF0F
          '\\': '＼', // U+FF3C
          '|': '｜', // U+FF5C
          '?': '？', // U+FF1F
          '*': '＊' // U+FF0A
        }
        break
      case 'darwin':
        forbiddenChars = { '/': '／', ':': '：' }
        break
      case 'linux':
        forbiddenChars = { '/': '／' }
        break
      default:
        break
    }

    for (const forbiddenChar in forbiddenChars) {
      filenameNew = filenameNew.replaceAll(forbiddenChar, forbiddenChars[forbiddenChar])
    }
    return filenameNew
  },

  /**
   * This writes to the clipboard. If an error occurs during the copy,
   * a toast with the error is shown. If the copy is successful and
   * there is a success message, a toast with that message is shown.
   * @param {string} content the content to be copied to the clipboard
   * @param {string} messageOnSuccess the message to be displayed as a toast when the copy succeeds (optional)
   * @param {string} messageOnError the message to be displayed as a toast when the copy fails (optional)
   */
  async copyToClipboard ({ dispatch }, { content, messageOnSuccess, messageOnError }) {
    let clipboardAPI = navigator.clipboard?.writeText.bind(navigator.clipboard)
    if (window.cordova !== undefined) {
      clipboardAPI = window.cordova.plugins.clipboard.copy
    }
    if (clipboardAPI !== undefined && window.isSecureContext) {
      try {
        await clipboardAPI(content)
        if (messageOnSuccess !== undefined) {
          dispatch('showToast', {
            message: messageOnSuccess
          })
        }
      } catch (error) {
        console.error(`Failed to copy ${content} to clipboard`, error)
        if (messageOnError !== undefined) {
          dispatch('showToast', {
            message: `${messageOnError}: ${error}`,
            time: 5000
          })
        } else {
          dispatch('showToast', {
            message: `${i18n.t('Clipboard.Copy failed')}: ${error}`,
            time: 5000
          })
        }
      }
    } else {
      dispatch('showToast', {
        message: i18n.t('Clipboard.Cannot access clipboard without a secure connection'),
        time: 5000
      })
    }
  },

  async downloadMedia({ rootState, dispatch }, { url, title, extension, fallingBackPath }) {
    const fileName = `${await dispatch('replaceFilenameForbiddenChars', title)}.${extension}`
    const locale = i18n._vm.locale
    const translations = i18n._vm.messages[locale]
    const startMessage = translations['Starting download'].replace('$', title)
    const completedMessage = translations['Downloading has completed'].replace('$', title)
    const errorMessage = translations['Downloading failed'].replace('$', title)
    let folderPath = rootState.settings.downloadFolderPath

    if (!process.env.IS_ELECTRON) {
      dispatch('openExternalLink', url)
      return
    }

    if (folderPath === '') {
      const options = {
        defaultPath: fileName,
        filters: [
          {
            name: extension.toUpperCase(),
            extensions: [extension]
          }
        ]
      }
      const response = await dispatch('showSaveDialog', { options })

      if (response.canceled || response.filePath === '') {
        // User canceled the save dialog
        return
      }

      folderPath = response.filePath
    } else {
      if (!fs.existsSync(folderPath)) {
        try {
          fs.mkdirSync(folderPath, { recursive: true })
        } catch (err) {
          console.error(err)
          dispatch('showToast', {
            message: err
          })
          return
        }
      }
      folderPath = path.join(folderPath, fileName)
    }

    dispatch('showToast', {
      message: startMessage
    })

    const response = await fetch(url).catch((error) => {
      console.log(error)
      dispatch('showToast', {
        message: errorMessage
      })
    })

    const reader = response.body.getReader()
    const chunks = []

    const handleError = (err) => {
      console.log(err)
      dispatch('showToast', {
        message: errorMessage
      })
    }

    const processText = async ({ done, value }) => {
      if (done) {
        return
      }

      chunks.push(value)
      // Can be used in the future to determine download percentage
      // const contentLength = response.headers.get('Content-Length')
      // const receivedLength = value.length
      // const percentage = receivedLength / contentLength
      await reader.read().then(processText).catch(handleError)
    }

    await reader.read().then(processText).catch(handleError)

    const blobFile = new Blob(chunks)
    const buffer = await blobFile.arrayBuffer()

    fs.writeFile(folderPath, new DataView(buffer), (err) => {
      if (err) {
        console.error(err)
        dispatch('showToast', {
          message: errorMessage
        })
      } else {
        dispatch('showToast', {
          message: completedMessage
        })
      }
    })
  },

  async getSystemLocale (context) {
    const webCbk = () => {
      if (navigator && navigator.language) {
        return navigator.language
      }
    }

    return (await invokeIRC(context, IpcChannels.GET_SYSTEM_LOCALE, webCbk)) || 'en-US'
  },

  async showOpenDialog (context, options) {
    // TODO: implement showOpenDialog web compatible callback
    const webCbk = () => null
    return await invokeIRC(context, IpcChannels.SHOW_OPEN_DIALOG, webCbk, options)
  },

  async showSaveDialog (context, { options, useModal = false }) {
    // TODO: implement showSaveDialog web compatible callback
    const webCbk = () => null
    return await invokeIRC(context, IpcChannels.SHOW_SAVE_DIALOG, webCbk, { options, useModal })
  },

  async getUserDataPath (context) {
    // TODO: implement getUserDataPath web compatible callback
    const webCbk = () => null
    return await invokeIRC(context, IpcChannels.GET_USER_DATA_PATH, webCbk)
  },

  async getPicturesPath (context) {
    const webCbk = () => null
    return await invokeIRC(context, IpcChannels.GET_PICTURES_PATH, webCbk)
  },

  parseScreenshotCustomFileName: function({ rootState }, payload) {
    return new Promise((resolve, reject) => {
      const { pattern = rootState.settings.screenshotFilenamePattern, date, playerTime, videoId } = payload
      const keywords = [
        ['%Y', date.getFullYear()], // year 4 digits
        ['%M', (date.getMonth() + 1).toString().padStart(2, '0')], // month 2 digits
        ['%D', date.getDate().toString().padStart(2, '0')], // day 2 digits
        ['%H', date.getHours().toString().padStart(2, '0')], // hour 2 digits
        ['%N', date.getMinutes().toString().padStart(2, '0')], // minute 2 digits
        ['%S', date.getSeconds().toString().padStart(2, '0')], // second 2 digits
        ['%T', date.getMilliseconds().toString().padStart(3, '0')], // millisecond 3 digits
        ['%s', parseInt(playerTime)], // video position second n digits
        ['%t', (playerTime % 1).toString().slice(2, 5) || '000'], // video position millisecond 3 digits
        ['%i', videoId] // video id
      ]

      let parsedString = pattern
      for (const [key, value] of keywords) {
        parsedString = parsedString.replaceAll(key, value)
      }

      const platform = process.platform
      if (platform === 'win32') {
        // https://www.boost.org/doc/libs/1_78_0/libs/filesystem/doc/portability_guide.htm
        // https://stackoverflow.com/questions/1976007/
        const noForbiddenChars = ['<', '>', ':', '"', '/', '|', '?', '*'].every(char => {
          return parsedString.indexOf(char) === -1
        })
        if (!noForbiddenChars) {
          reject(new Error('Forbidden Characters')) // use message as translation key
        }
      } else if (platform === 'darwin') {
        // https://superuser.com/questions/204287/
        if (parsedString.indexOf(':') !== -1) {
          reject(new Error('Forbidden Characters'))
        }
      }

      const dirChar = platform === 'win32' ? '\\' : '/'
      let filename
      if (parsedString.indexOf(dirChar) !== -1) {
        const lastIndex = parsedString.lastIndexOf(dirChar)
        filename = parsedString.substring(lastIndex + 1)
      } else {
        filename = parsedString
      }

      if (!filename) {
        reject(new Error('Empty File Name'))
      }

      resolve(parsedString)
    })
  },

  updateShowProgressBar ({ commit }, value) {
    commit('setShowProgressBar', value)
  },

  getRandomColorClass () {
    const randomInt = Math.floor(Math.random() * state.colorNames.length)
    return 'main' + state.colorNames[randomInt]
  },

  getRandomColor () {
    const randomInt = Math.floor(Math.random() * state.colorValues.length)
    return state.colorValues[randomInt]
  },

  getRegionData ({ commit }, payload) {
    let fileData
    /* eslint-disable-next-line */
    const fileLocation = payload.isDev ? './static/geolocations/' : `${__dirname}/static/geolocations/`
    if (fs.existsSync(`${fileLocation}${payload.locale}`)) {
      fileData = fs.readFileSync(`${fileLocation}${payload.locale}/countries.json`)
    } else {
      fileData = fs.readFileSync(`${fileLocation}en-US/countries.json`)
    }
    const countries = JSON.parse(fileData).map((entry) => { return { id: entry.id, name: entry.name, code: entry.alpha2 } })
    countries.sort((a, b) => { return a.id - b.id })

    const regionNames = countries.map((entry) => { return entry.name })
    const regionValues = countries.map((entry) => { return entry.code })

    commit('setRegionNames', regionNames)
    commit('setRegionValues', regionValues)
  },

  calculateColorLuminance (_, colorValue) {
    const cutHex = colorValue.substring(1, 7)
    const colorValueR = parseInt(cutHex.substring(0, 2), 16)
    const colorValueG = parseInt(cutHex.substring(2, 4), 16)
    const colorValueB = parseInt(cutHex.substring(4, 6), 16)

    const luminance = (0.299 * colorValueR + 0.587 * colorValueG + 0.114 * colorValueB) / 255

    if (luminance > 0.5) {
      return '#000000'
    } else {
      return '#FFFFFF'
    }
  },

  calculatePublishedDate(_, publishedText) {
    const date = new Date()

    if (publishedText === 'Live') {
      return publishedText
    }

    const textSplit = publishedText.split(' ')

    if (textSplit[0].toLowerCase() === 'streamed') {
      textSplit.shift()
    }

    const timeFrame = textSplit[1]
    const timeAmount = parseInt(textSplit[0])
    let timeSpan = null

    if (timeFrame.indexOf('second') > -1) {
      timeSpan = timeAmount * 1000
    } else if (timeFrame.indexOf('minute') > -1) {
      timeSpan = timeAmount * 60000
    } else if (timeFrame.indexOf('hour') > -1) {
      timeSpan = timeAmount * 3600000
    } else if (timeFrame.indexOf('day') > -1) {
      timeSpan = timeAmount * 86400000
    } else if (timeFrame.indexOf('week') > -1) {
      timeSpan = timeAmount * 604800000
    } else if (timeFrame.indexOf('month') > -1) {
      timeSpan = timeAmount * 2592000000
    } else if (timeFrame.indexOf('year') > -1) {
      timeSpan = timeAmount * 31556952000
    }

    return date.getTime() - timeSpan
  },

  getVideoParamsFromUrl (_, url) {
    /** @type {URL} */
    let urlObject
    const paramsObject = { videoId: null, timestamp: null, playlistId: null }
    try {
      urlObject = new URL(url)
    } catch (e) {
      return paramsObject
    }

    function extractParams(videoId) {
      paramsObject.videoId = videoId
      paramsObject.timestamp = urlObject.searchParams.get('t')
    }

    const extractors = [
      // anything with /watch?v=
      function() {
        if (urlObject.pathname === '/watch' && urlObject.searchParams.has('v')) {
          extractParams(urlObject.searchParams.get('v'))
          paramsObject.playlistId = urlObject.searchParams.get('list')
          return paramsObject
        }
      },
      // youtu.be
      function() {
        if (urlObject.host === 'youtu.be' && urlObject.pathname.match(/^\/[A-Za-z0-9_-]+$/)) {
          extractParams(urlObject.pathname.slice(1))
          return paramsObject
        }
      },
      // youtube.com/embed
      function() {
        if (urlObject.pathname.match(/^\/embed\/[A-Za-z0-9_-]+$/)) {
          extractParams(urlObject.pathname.replace('/embed/', ''))
          return paramsObject
        }
      },
      // youtube.com/shorts
      function() {
        if (urlObject.pathname.match(/^\/shorts\/[A-Za-z0-9_-]+$/)) {
          extractParams(urlObject.pathname.replace('/shorts/', ''))
          return paramsObject
        }
      },
      // cloudtube
      function() {
        if (urlObject.host.match(/^cadence\.(gq|moe)$/) && urlObject.pathname.match(/^\/cloudtube\/video\/[A-Za-z0-9_-]+$/)) {
          extractParams(urlObject.pathname.slice('/cloudtube/video/'.length))
          return paramsObject
        }
      }
    ]

    return extractors.reduce((a, c) => a || c(), null) || paramsObject
  },

  getYoutubeUrlInfo ({ state }, urlStr) {
    // Returns
    // - urlType [String] `video`, `playlist`
    //
    // If `urlType` is "video"
    // - videoId [String]
    // - timestamp [String]
    //
    // If `urlType` is "playlist"
    // - playlistId [String]
    // - query [Object]
    //
    // If `urlType` is "search"
    // - searchQuery [String]
    // - query [Object]
    //
    // If `urlType` is "hashtag"
    // Nothing else
    //
    // If `urlType` is "channel"
    // - channelId [String]
    //
    // If `urlType` is "unknown"
    // Nothing else
    //
    // If `urlType` is "invalid_url"
    // Nothing else
    const { videoId, timestamp, playlistId } = actions.getVideoParamsFromUrl(null, urlStr)
    if (videoId) {
      return {
        urlType: 'video',
        videoId,
        playlistId,
        timestamp
      }
    }

    let url
    try {
      url = new URL(urlStr)
    } catch {
      return {
        urlType: 'invalid_url'
      }
    }
    let urlType = 'unknown'

    const channelPattern =
      /^\/(?:(?<type>channel|user|c)\/)?(?<channelId>[^/]+)(?:\/(join|featured|videos|playlists|about|community|channels))?\/?$/

    const typePatterns = new Map([
      ['playlist', /^\/playlist\/?$/],
      ['search', /^\/results\/?$/],
      ['hashtag', /^\/hashtag\/([^/?&#]+)$/],
      ['channel', channelPattern]
    ])

    for (const [type, pattern] of typePatterns) {
      const matchFound = pattern.test(url.pathname)
      if (matchFound) {
        urlType = type
        break
      }
    }

    switch (urlType) {
      case 'playlist': {
        if (!url.searchParams.has('list')) {
          throw new Error('Playlist: "list" field not found')
        }

        const playlistId = url.searchParams.get('list')
        url.searchParams.delete('list')

        const query = {}
        for (const [param, value] of url.searchParams) {
          query[param] = value
        }

        return {
          urlType: 'playlist',
          playlistId,
          query
        }
      }

      case 'search': {
        if (!url.searchParams.has('search_query')) {
          throw new Error('Search: "search_query" field not found')
        }

        const searchQuery = url.searchParams.get('search_query')
        url.searchParams.delete('search_query')

        const searchSettings = state.searchSettings
        const query = {
          sortBy: searchSettings.sortBy,
          time: searchSettings.time,
          type: searchSettings.type,
          duration: searchSettings.duration
        }

        for (const [param, value] of url.searchParams) {
          query[param] = value
        }

        return {
          urlType: 'search',
          searchQuery,
          query
        }
      }

      case 'hashtag': {
        return {
          urlType: 'hashtag'
        }
      }
      /*
      Using RegExp named capture groups from ES2018
      To avoid access to specific captured value broken

      Channel URL (ID-based)
      https://www.youtube.com/channel/UCfMJ2MchTSW2kWaT0kK94Yw
      https://www.youtube.com/channel/UCfMJ2MchTSW2kWaT0kK94Yw/about
      https://www.youtube.com/channel/UCfMJ2MchTSW2kWaT0kK94Yw/channels
      https://www.youtube.com/channel/UCfMJ2MchTSW2kWaT0kK94Yw/community
      https://www.youtube.com/channel/UCfMJ2MchTSW2kWaT0kK94Yw/featured
      https://www.youtube.com/channel/UCfMJ2MchTSW2kWaT0kK94Yw/join
      https://www.youtube.com/channel/UCfMJ2MchTSW2kWaT0kK94Yw/playlists
      https://www.youtube.com/channel/UCfMJ2MchTSW2kWaT0kK94Yw/videos

      Custom URL

      https://www.youtube.com/c/YouTubeCreators
      https://www.youtube.com/c/YouTubeCreators/about
      etc.

      Legacy Username URL

      https://www.youtube.com/user/ufoludek
      https://www.youtube.com/user/ufoludek/about
      etc.

      */
      case 'channel': {
        const match = url.pathname.match(channelPattern)
        const channelId = match.groups.channelId
        const idType = ['channel', 'user', 'c'].indexOf(match.groups.type) + 1
        if (!channelId) {
          throw new Error('Channel: could not extract id')
        }

        let subPath = null
        switch (url.pathname.split('/').filter(i => i)[2]) {
          case 'playlists':
            subPath = 'playlists'
            break
          case 'channels':
          case 'about':
            subPath = 'about'
            break
          case 'community':
          default:
            subPath = 'videos'
            break
        }
        return {
          urlType: 'channel',
          channelId,
          idType,
          subPath
        }
      }

      default: {
        // Unknown URL type
        return {
          urlType: 'unknown'
        }
      }
    }
  },

  padNumberWithLeadingZeros(_, payload) {
    let numberString = payload.number.toString()
    while (numberString.length < payload.length) {
      numberString = '0' + numberString
    }
    return numberString
  },

  async buildVTTFileLocally ({ dispatch }, Storyboard) {
    let vttString = 'WEBVTT\n\n'
    // how many images are in one image
    const numberOfSubImagesPerImage = Storyboard.sWidth * Storyboard.sHeight
    // the number of storyboard images
    const numberOfImages = Math.ceil(Storyboard.count / numberOfSubImagesPerImage)
    const intervalInSeconds = Storyboard.interval / 1000
    let currentUrl = Storyboard.url
    let startHours = 0
    let startMinutes = 0
    let startSeconds = 0
    let endHours = 0
    let endMinutes = 0
    let endSeconds = intervalInSeconds
    for (let i = 0; i < numberOfImages; i++) {
      let xCoord = 0
      let yCoord = 0
      for (let j = 0; j < numberOfSubImagesPerImage; j++) {
        // add the timestamp information
        const paddedStartHours = await dispatch('padNumberWithLeadingZeros', {
          number: startHours,
          length: 2
        })
        const paddedStartMinutes = await dispatch('padNumberWithLeadingZeros', {
          number: startMinutes,
          length: 2
        })
        const paddedStartSeconds = await dispatch('padNumberWithLeadingZeros', {
          number: startSeconds,
          length: 2
        })
        const paddedEndHours = await dispatch('padNumberWithLeadingZeros', {
          number: endHours,
          length: 2
        })
        const paddedEndMinutes = await dispatch('padNumberWithLeadingZeros', {
          number: endMinutes,
          length: 2
        })
        const paddedEndSeconds = await dispatch('padNumberWithLeadingZeros', {
          number: endSeconds,
          length: 2
        })
        vttString += `${paddedStartHours}:${paddedStartMinutes}:${paddedStartSeconds}.000 --> ${paddedEndHours}:${paddedEndMinutes}:${paddedEndSeconds}.000\n`
        // add the current image url as well as the x, y, width, height information
        vttString += currentUrl + `#xywh=${xCoord},${yCoord},${Storyboard.width},${Storyboard.height}\n\n`
        // update the variables
        startHours = endHours
        startMinutes = endMinutes
        startSeconds = endSeconds
        endSeconds += intervalInSeconds
        if (endSeconds >= 60) {
          endSeconds -= 60
          endMinutes += 1
        }
        if (endMinutes >= 60) {
          endMinutes -= 60
          endHours += 1
        }
        // x coordinate can only be smaller than the width of one subimage * the number of subimages per row
        xCoord = (xCoord + Storyboard.width) % (Storyboard.width * Storyboard.sWidth)
        // only if the x coordinate is , so in a new row, we have to update the y coordinate
        if (xCoord === 0) {
          yCoord += Storyboard.height
        }
      }
      // make sure that there is no value like M0 or M1 in the parameters that gets replaced
      currentUrl = currentUrl.replace('M' + i.toString() + '.jpg', 'M' + (i + 1).toString() + '.jpg')
    }
    return vttString
  },

  toLocalePublicationString ({ dispatch }, payload) {
    if (payload.isLive) {
      return '0' + payload.liveStreamString
    } else if (payload.isUpcoming || payload.publishText === null) {
      // the check for null is currently just an inferring of knowledge, because there is no other possibility left
      return `${payload.upcomingString}: ${payload.publishText}`
    } else if (payload.isRSS) {
      return payload.publishText
    }
    const strings = payload.publishText.split(' ')
    // filters out the streamed x hours ago and removes the streamed in order to keep the rest of the code working
    if (strings[0].toLowerCase() === 'streamed') {
      strings.shift()
    }
    const singular = (strings[0] === '1')
    let publicationString = payload.templateString.replace('$', strings[0])
    switch (strings[1].substring(0, 2)) {
      case 'se':
        if (singular) {
          publicationString = publicationString.replace('%', payload.timeStrings.Second)
        } else {
          publicationString = publicationString.replace('%', payload.timeStrings.Seconds)
        }
        break
      case 'mi':
        if (singular) {
          publicationString = publicationString.replace('%', payload.timeStrings.Minute)
        } else {
          publicationString = publicationString.replace('%', payload.timeStrings.Minutes)
        }
        break
      case 'ho':
        if (singular) {
          publicationString = publicationString.replace('%', payload.timeStrings.Hour)
        } else {
          publicationString = publicationString.replace('%', payload.timeStrings.Hours)
        }
        break
      case 'da':
        if (singular) {
          publicationString = publicationString.replace('%', payload.timeStrings.Day)
        } else {
          publicationString = publicationString.replace('%', payload.timeStrings.Days)
        }
        break
      case 'we':
        if (singular) {
          publicationString = publicationString.replace('%', payload.timeStrings.Week)
        } else {
          publicationString = publicationString.replace('%', payload.timeStrings.Weeks)
        }
        break
      case 'mo':
        if (singular) {
          publicationString = publicationString.replace('%', payload.timeStrings.Month)
        } else {
          publicationString = publicationString.replace('%', payload.timeStrings.Months)
        }
        break
      case 'ye':
        if (singular) {
          publicationString = publicationString.replace('%', payload.timeStrings.Year)
        } else {
          publicationString = publicationString.replace('%', payload.timeStrings.Years)
        }
        break
    }
    return publicationString
  },

  clearSessionSearchHistory ({ commit }) {
    commit('setSessionSearchHistory', [])
  },

  showToast (_, payload) {
    FtToastEvents.$emit('toast-open', payload.message, payload.action, payload.time)
  },

  showExternalPlayerUnsupportedActionToast: function ({ dispatch }, payload) {
    if (!payload.ignoreWarnings) {
      const toastMessage = payload.template
        .replace('$', payload.externalPlayer)
        .replace('%', payload.action)
      dispatch('showToast', {
        message: toastMessage
      })
    }
  },

  getExternalPlayerCmdArgumentsData ({ commit }, payload) {
    const fileName = 'external-player-map.json'
    let fileData
    /* eslint-disable-next-line */
    const fileLocation = payload.isDev ? './static/' : `${__dirname}/static/`

    if (fs.existsSync(`${fileLocation}${fileName}`)) {
      fileData = fs.readFileSync(`${fileLocation}${fileName}`)
    } else {
      fileData = '[{"name":"None","value":"","cmdArguments":null}]'
    }

    const externalPlayerMap = JSON.parse(fileData).map((entry) => {
      return { name: entry.name, nameTranslationKey: entry.nameTranslationKey, value: entry.value, cmdArguments: entry.cmdArguments }
    })

    const externalPlayerNames = externalPlayerMap.map((entry) => { return entry.name })
    const externalPlayerNameTranslationKeys = externalPlayerMap.map((entry) => { return entry.nameTranslationKey })
    const externalPlayerValues = externalPlayerMap.map((entry) => { return entry.value })
    const externalPlayerCmdArguments = externalPlayerMap.reduce((result, item) => {
      result[item.value] = item.cmdArguments
      return result
    }, {})

    commit('setExternalPlayerNames', externalPlayerNames)
    commit('setExternalPlayerNameTranslationKeys', externalPlayerNameTranslationKeys)
    commit('setExternalPlayerValues', externalPlayerValues)
    commit('setExternalPlayerCmdArguments', externalPlayerCmdArguments)
  },

  openInExternalPlayer ({ dispatch, state, rootState }, payload) {
    const args = []
    const externalPlayer = rootState.settings.externalPlayer
    const cmdArgs = state.externalPlayerCmdArguments[externalPlayer]
    const executable = rootState.settings.externalPlayerExecutable !== ''
      ? rootState.settings.externalPlayerExecutable
      : cmdArgs.defaultExecutable
    const ignoreWarnings = rootState.settings.externalPlayerIgnoreWarnings
    const customArgs = rootState.settings.externalPlayerCustomArgs

    // Append custom user-defined arguments,
    // or use the default ones specified for the external player.
    if (typeof customArgs === 'string' && customArgs !== '') {
      const custom = customArgs.split(';')
      args.push(...custom)
    } else if (typeof cmdArgs.defaultCustomArguments === 'string' && cmdArgs.defaultCustomArguments !== '') {
      const defaultCustomArguments = cmdArgs.defaultCustomArguments.split(';')
      args.push(...defaultCustomArguments)
    }

    if (payload.watchProgress > 0 && payload.watchProgress < payload.videoLength - 10) {
      if (typeof cmdArgs.startOffset === 'string') {
        args.push(`${cmdArgs.startOffset}${payload.watchProgress}`)
      } else {
        dispatch('showExternalPlayerUnsupportedActionToast', {
          ignoreWarnings,
          externalPlayer,
          template: payload.strings.UnsupportedActionTemplate,
          action: payload.strings['Unsupported Actions']['starting video at offset']
        })
      }
    }

    if (payload.playbackRate !== null) {
      if (typeof cmdArgs.playbackRate === 'string') {
        args.push(`${cmdArgs.playbackRate}${payload.playbackRate}`)
      } else {
        dispatch('showExternalPlayerUnsupportedActionToast', {
          ignoreWarnings,
          externalPlayer,
          template: payload.strings.UnsupportedActionTemplate,
          action: payload.strings['Unsupported Actions']['setting a playback rate']
        })
      }
    }

    // Check whether the video is in a playlist
    if (typeof cmdArgs.playlistUrl === 'string' && payload.playlistId !== null && payload.playlistId !== '') {
      if (payload.playlistIndex !== null) {
        if (typeof cmdArgs.playlistIndex === 'string') {
          args.push(`${cmdArgs.playlistIndex}${payload.playlistIndex}`)
        } else {
          dispatch('showExternalPlayerUnsupportedActionToast', {
            ignoreWarnings,
            externalPlayer,
            template: payload.strings.UnsupportedActionTemplate,
            action: payload.strings['Unsupported Actions']['opening specific video in a playlist (falling back to opening the video)']
          })
        }
      }

      if (payload.playlistReverse) {
        if (typeof cmdArgs.playlistReverse === 'string') {
          args.push(cmdArgs.playlistReverse)
        } else {
          dispatch('showExternalPlayerUnsupportedActionToast', {
            ignoreWarnings,
            externalPlayer,
            template: payload.strings.UnsupportedActionTemplate,
            action: payload.strings['Unsupported Actions']['reversing playlists']
          })
        }
      }

      if (payload.playlistShuffle) {
        if (typeof cmdArgs.playlistShuffle === 'string') {
          args.push(cmdArgs.playlistShuffle)
        } else {
          dispatch('showExternalPlayerUnsupportedActionToast', {
            ignoreWarnings,
            externalPlayer,
            template: payload.strings.UnsupportedActionTemplate,
            action: payload.strings['Unsupported Actions']['shuffling playlists']
          })
        }
      }

      if (payload.playlistLoop) {
        if (typeof cmdArgs.playlistLoop === 'string') {
          args.push(cmdArgs.playlistLoop)
        } else {
          dispatch('showExternalPlayerUnsupportedActionToast', {
            ignoreWarnings,
            externalPlayer,
            template: payload.strings.UnsupportedActionTemplate,
            action: payload.strings['Unsupported Actions']['looping playlists']
          })
        }
      }
      if (cmdArgs.supportsYtdlProtocol) {
        args.push(`${cmdArgs.playlistUrl}ytdl://${payload.playlistId}`)
      } else {
        args.push(`${cmdArgs.playlistUrl}https://youtube.com/playlist?list=${payload.playlistId}`)
      }
    } else {
      if (payload.playlistId !== null && payload.playlistId !== '') {
        dispatch('showExternalPlayerUnsupportedActionToast', {
          ignoreWarnings,
          externalPlayer,
          template: payload.strings.UnsupportedActionTemplate,
          action: payload.strings['Unsupported Actions']['opening playlists']
        })
      }
      if (payload.videoId !== null) {
        if (cmdArgs.supportsYtdlProtocol) {
          args.push(`${cmdArgs.videoUrl}ytdl://${payload.videoId}`)
        } else {
          args.push(`${cmdArgs.videoUrl}https://www.youtube.com/watch?v=${payload.videoId}`)
        }
      }
    }

    const openingToast = payload.strings.OpeningTemplate
      .replace('$', payload.playlistId === null || payload.playlistId === ''
        ? payload.strings.video
        : payload.strings.playlist)
      .replace('%', externalPlayer)
    dispatch('showToast', {
      message: openingToast
    })

    console.log(executable, args)

    const { ipcRenderer } = require('electron')
    ipcRenderer.send(IpcChannels.OPEN_IN_EXTERNAL_PLAYER, { executable, args })
  }
}

const mutations = {
  toggleSideNav (state) {
    state.isSideNavOpen = !state.isSideNavOpen
  },

  setShowProgressBar (state, value) {
    state.showProgressBar = value
  },

  setProgressBarPercentage (state, value) {
    state.progressBarPercentage = value
  },

  setSessionSearchHistory (state, history) {
    state.sessionSearchHistory = history
  },

  addToSessionSearchHistory (state, payload) {
    const sameSearch = state.sessionSearchHistory.findIndex((search) => {
      return search.query === payload.query && IsEqual(payload.searchSettings, search.searchSettings)
    })

    if (sameSearch !== -1) {
      state.sessionSearchHistory[sameSearch].data = payload.data
      state.sessionSearchHistory[sameSearch].nextPageRef = payload.nextPageRef
    } else {
      state.sessionSearchHistory.push(payload)
    }
  },

  setPopularCache (state, value) {
    state.popularCache = value
  },

  setTrendingCache (state, { value, page }) {
    state.trendingCache[page] = value
  },

  setSearchSortBy (state, value) {
    state.searchSettings.sortBy = value
  },

  setSearchTime (state, value) {
    state.searchSettings.time = value
  },

  setSearchType (state, value) {
    state.searchSettings.type = value
  },

  setSearchDuration (state, value) {
    state.searchSettings.duration = value
  },

  setRegionNames (state, value) {
    state.regionNames = value
  },

  setRegionValues (state, value) {
    state.regionValues = value
  },

  setRecentBlogPosts (state, value) {
    state.recentBlogPosts = value
  },

  setExternalPlayerNames (state, value) {
    state.externalPlayerNames = value
  },

  setExternalPlayerNameTranslationKeys (state, value) {
    state.externalPlayerNameTranslationKeys = value
  },

  setExternalPlayerValues (state, value) {
    state.externalPlayerValues = value
  },

  setExternalPlayerCmdArguments (state, value) {
    state.externalPlayerCmdArguments = value
  }
}

export default {
  state,
  getters,
  actions,
  mutations
}
