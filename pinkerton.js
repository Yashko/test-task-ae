const jsdom = require('jsdom')
const fs = require('fs')

const { JSDOM } = jsdom
const [,, originFile, targetFile] = process.argv

const defaultVictimID = 'make-everything-ok-button'

let config = { howDeep: 4, defaultPrice: 1, priceStep: 0.25 }

if (!originFile || !targetFile) {
  console.error(new Error('Please specify input files as 1st & 2nd argument to the script'))
  process.exit(1)
}

function index (el) {
  let childrens = Array.from(el.parentNode.children).filter(x => x.tagName !== 'NAV')
  return childrens.indexOf(el)
}

function pathLookup (el, cssComp = true) {
  let out = []
  let frankerz = el
  for (;;) {
    if (frankerz.tagName === 'BODY') break
    if (cssComp) out.push(frankerz.tagName + ':nth-of-type(' + (index(frankerz) + 1) + ')')
    else out.push(frankerz.tagName + '[' + (index(frankerz) + 1) + ']')
    frankerz = frankerz.parentElement
  }
  out.reverse()
  out.unshift('HTML', 'BODY')
  return out.join(' > ')
}

class Pinkerton {
  constructor () {
    this.victimID = defaultVictimID
    this.clues = {
      attributes: [] // Array<Attr>
    }
    this.suspects = []
    this.out = ''
    let anotherVictim = process.argv.filter(x => x.substr(0, 12) === '--element-id')[0]
    if (anotherVictim) {
      this.victimID = anotherVictim.split('=', 2)[1]
    }
  }

  collectClues (elementID) {
    const dom = new JSDOM(fs.readFileSync(originFile))
    let victim = dom.window.document.getElementById(this.victimID)
    this.clues.attributes.push(...victim.attributes)
    this.clues.parent = victim.parentElement
    this.clues.text = victim.textContent
    this.note('Clues collected!\n', this.clues)
    this.note('Parent path:\n', pathLookup(this.clues.parent))
    return this
  }

  addSuspects (arr, price = config.defaultPrice) {
    if (!Array.isArray(arr)) return console.error(new Error('Please'))
    arr.map(el => {
      let index = this.suspects.findIndex(x => x.el === el)
      if (index === -1) {
        this.suspects.push({ el, cc: price })
      } else {
        this.suspects[index].cc += price
      }
    })
  }

  hunt () {
    this.note('Hunt started...')
    const { window } = new JSDOM(fs.readFileSync(targetFile))
    let step = 1
    let datPrice = config.defaultPrice
    let datEl = this.clues.parent
    while (step <= config.howDeep) {
      this.note('Step #', step, ', distance price: ' + datPrice)
      let root = window.document.querySelector(pathLookup(datEl))
      let childsAllArr = Array.from(root.querySelectorAll('*'))
      // distance reward
      this.addSuspects(childsAllArr, datPrice)
      this.note(childsAllArr.length, ' elements was awarded for the distance')
      // attributes reward
      childsAllArr.map(el => {
        this.clues.attributes.map(attr => {
          if (el.getAttribute(attr.name) === attr.value) {
            this.addSuspects(Array.from([el]))
            this.note(el, ' receives ', config.defaultPrice, ' value for ', attr.name, ' attribute')
          }
        })
      })
      datEl = datEl.parentElement
      datPrice -= config.priceStep
      step++
    }
    this.suspects.sort((a, b) => b.cc - a.cc)
    return this
  }

  note (...x) {
    let notebook = process.argv.filter(x => x === '--make-notes')[0]
    if (notebook) console.log(...x)
  }

  output () {
    this.out = pathLookup(this.suspects[0].el, false)
    this.note('Top 5 suspects:\n', this.suspects.slice(0, 5))
    console.log(this.out)
  }
}

new Pinkerton().collectClues().hunt().output()
