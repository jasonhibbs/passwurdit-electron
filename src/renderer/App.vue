<template lang="pug">

#app

  #output(
    role="region"
    aria-live="polite"
  )
    #password
      span(
        ref="password"
        tabindex="0"
        @focus="onTouchOutput"
      ) {{ password }}
    #controls
      button#refresh(
        title="Refresh"
        @click="updatePassword"
      )
        include assets/img/refresh.svg
      button#copy(
        type="button"
        :class="{ '_success': copySuccess, _fail: copyFail }"
        :disabled="copying"
        :aria-pressed="copying"
        @click="onCopy"
        )
        span(v-if="copySuccess") Copied!
        span(v-else-if="copyFail") Couldn’t Copy
        span(v-else) Copy

  button#toggle(
    title="Toggle drawer"
    aria-controls="drawer"
    :aria-expanded="expanded ? 'true' : 'false'"
    @click="onToggle"
  )
    span
      i
      i
      i

  #drawer(:hidden="!expanded")

    form#settings(
      ref="form"
      aria-controls="output"
      @submit.prevent="updatePassword"
    )
      label#length
        span Characters
        input._tabular-numerals(
          title="Password Length"
          aria-label="Password Length"
          type="number"
          name="l"
          placeholder="24"
          pattern="[0-9]*"
          min="8"
          max="64"
          step="1"
          @input="onInput"
          @focus="onDrawerFocus"
          v-model="input.length"
        )

      label#case
        span Case
        select(
          title="Password Case"
          aria-label="Password Case"
          name="c"
          @change="onInput"
          @focus="onDrawerFocus"
          v-model="input.lettercase")
          option(value="c") Mixed
          option(value="l") Lower

      label#separator
        span Separator
        select(
          title="Password Separator"
          aria-label="Password Separator"
          name="s"
          @change="onInput"
          @focus="onDrawerFocus"
          v-model="input.separator")
          option(value="h") Hyphens
          option(value="n") Numbers
          option(value="p") Periods
          option(value="c") Commas
          option(value="s") Slashes

    #signature
      a(
        href="http://jasonhibbs.co.uk"
        target="_blank"
        title="Author’s website"
        @focus="onDrawerFocus"
        @click.prevent="onExternalLink"
      )
        abbr(title="Jason Hibbs") JH



</template>
<style lang="less"> @import '~@/assets/less/style'; </style>
<script>
import { words }  from '@/assets/js/words.js'
import { shell, ipcRenderer } from 'electron'

let minWordLength = 2
let maxWordLength = 9
let minPasswordLength = 8
let maxPasswordLength = 64
let defaultPasswordLength = 24

// Export ---------------------------------------------------------
export default {
  name: 'Passwurdit',
  components: {},
  computed: {
    password() {
      let refresh = this.refresh
      return getPassword(this.settings.length, this.settings.lettercase, this.settings.separator)
    }
  },
  data() {
    return {
      expanded    : false,
      refresh     : false,
      copying     : false,
      copySuccess : false,
      copyFail    : false,
      input: {
        length     : 24,
        lettercase : 'l',
        separator  : 'h'
      },
      settings: {
        length     : 24,
        lettercase : 'l',
        separator  : 'h'
      }
    }
  },

  methods: {

    onCopy(e) {
      let that = this
      let button = e.target
      let password = this.$refs.password

      setSelection(password)
      this.copying = true

      try {
        let copied = document.execCommand('copy')
        if (copied) {
          this.copySuccess = true
        } else {
          this.copyFail = true
        }
      } catch (error) {
        this.copyFail = true
      }

      clearSelection()

      setTimeout(() => {
        that.copying = false
        that.copyFail = false
        that.copySuccess = false
      }, 1600)
    },

    onExternalLink(e) {
      e.preventDefault()
      shell.openExternal('http://jasonhibbs.co.uk')
    },

    onDrawerFocus() {
      if (!this.expanded) {
        this.expanded = true
        ipcRenderer.send('toggleExpanded', this.expanded)
      }
    },

    onInput() {
      this.updateSettings()
    },

    onToggle() {
      this.expanded = !this.expanded
      ipcRenderer.send('toggleExpanded', this.expanded)
    },

    onTouchOutput(e) {
      setSelection(e.target)
    },

    updateFromStore(store) {
      this.input.length     = validateLength(store.length)       || this.settings.length;
      this.input.lettercase = validateCase(store.lettercase)     || this.settings.lettercase;
      this.input.separator  = validateSeparator(store.separator) || this.settings.separator;
      this.updateSettings();

      this.expanded = !!store.expanded
      ipcRenderer.send('toggleExpanded', this.expanded)
    },

    updateSettings() {
      if (isLengthValid(this.input.length)) {
        this.settings.length   = this.input.length
      }
      this.settings.lettercase = this.input.lettercase
      this.settings.separator  = this.input.separator

      this.updateStoreSettings();
    },

    updateStoreSettings() {
      let data = {
        length:     this.settings.length,
        lettercase: this.settings.lettercase,
        separator:  this.settings.separator
      }

      ipcRenderer.send('updateSettings', data)
    },

    updatePassword() {
      this.refresh = !this.refresh
    }
  },

  beforeCreate() {
    ipcRenderer.on('loaded', (e, data) => {
      document.documentElement.className = document.documentElement.className.replace('_loading','_loaded')
      this.updateFromStore(data)
    })

    ipcRenderer.on('log', (e, data) => {
      console.log(data);
    })
  },
}

// Helpers --------------------------------------------------------
function random(max, min) {
  if (!max) { max = 1 }
  if (!min) { min = 0 }
  let diff = (max - min)
  return Math.floor(Math.random() * diff) + min
}

function uppercase(word) {
  return word.charAt(0).toUpperCase() + word.slice(1)
}

function deleteAfter(char, string) {
  let index = string.slice(0, -1).lastIndexOf(char) + 1

  if (char.match(/\d/)) {
    index = string.search(/(\d+)(?!.*\d)/) + 1
  }

  return string.substring(0, index)
}

function getSeparator(code) {
  switch (code) {
    case 'n':
      return '0'
    case 's':
      return '/'
    case 'p':
      return '.'
    case 'c':
      return ','
    // case 'h':
    default:
      return '-'
  }
}

// Words ----------------------------------------------------------
function getWord(list) {
  return list[random(list.length)]
}

function getWordOfLength(length) {
  let min = minWordLength
  let max = maxWordLength
  let list

  if (length % 1) {
    length = Math.floor(length)
  }

  if (length < min) {
    length = min
  }

  if (length > max) {
    length = max
  }

  list = words[length - min]

  return getWord(list)
}

function getWeightedRandomLength() {
  let lengths = [2,3,3,4,4,5,5,5,5,6,6,6,6,6,7,7,7,7,8,8,9]
  return lengths[random(lengths.length)]
}

function getRandomWord() {
  let min = minWordLength
  let max = maxWordLength
  return getWordOfLength(getWeightedRandomLength())
}

function getPassword(length, lettercase, separator) {
  let min = minWordLength
  let max = maxWordLength
  let string = ''
  let numbers = false

  if (!length) { length = defaultPasswordLength }

  if (separator === 'n') {
    numbers = true
  } else {
    separator = getSeparator(separator)
  }

  while (string.length < length) {
    let word

    if (numbers) {
      separator = random(9).toString()
    }

    if ((length - string.length) < (min + 1)) {
      // We’ve overrun, delete the previous word
      string = deleteAfter(separator, string)
    }

    if ((length - string.length) <= max) {
      if (!string.length) {
        // Password is too short, but we’ll try to give them more than one word
        word = getWordOfLength(Math.floor(length / random(4, 2))) + separator
      } else {
        // We’re at the end of a string, so we’ll get a word that fits
        word = getWordOfLength(length - string.length)
      }
    } else {
      // Any word will do
      word = getRandomWord() + separator
    }

    if (lettercase === 'c') {
      word = uppercase(word)
    }

    string += word
  }

  return string
}

// Validate -------------------------------------------------------
function isLengthValid(length) {
  return !length || (length >= minPasswordLength && length <= maxPasswordLength)
}

function validateLength(length) {
  if (!length) {
    return false
  } else {
    if (length % 1) {
      length = Math.floor(length)
    }

    if (length < minPasswordLength) {
      length = minPasswordLength
    }

    if (length > maxPasswordLength) {
      length = maxPasswordLength
    }

    return length
  }
}

function validateCase(lettercase) {
  if (!lettercase) {
    return false
  } else {
    let valid = ['c', 'l']
    if (valid.indexOf(lettercase) > -1) {
      return lettercase
    } else {
      return 'l'
    }
  }
}

function validateSeparator(separator) {
  if (!separator) {
    return false
  } else {
    var valid = ['h', 'd', 's', 'n']
    if (valid.indexOf(separator) > -1) {
      return separator
    } else {
      return 'h'
    }
  }
}

// Select & Copy --------------------------------------------------
function setSelection(el) {
  let selection = window.getSelection()
  let range = document.createRange()
  range.selectNodeContents(el)
  selection.removeAllRanges()
  selection.addRange(range)
}

function clearSelection() {
  window.getSelection().removeAllRanges()
}

// TODO:
// electron-store gives access to persistent settings
// closing all windows should probably just quit the app
// multiple windows should be fine


</script>
