/* eslint camelcase: "off" */
import languageFile from '../../gettext/json/available_languages.json'
/** @ngInject */
export function LanguageFactory ($http, $q, $log, $window, gettextCatalog, lodash) {
  var availableAvailable = $q.defer()
  var service = {
    available: {
      'en': 'English'  // not translated on purpose
    },
    ready: availableAvailable.promise,
    browser: browser,
    onLogin: onLogin,
    onReload: onReload,
    chosen: {
      code: null
    },
    save: save,
    match: match,
    userHref: null,
    setLocale: setLocale,
    fixState: fixState
  }

  init()

  return service

  function init () {
    lodash.extend(service.available, languageFile)
    availableAvailable.resolve(service.available)
  }

  // returns a list of user's preferred languages, in order
  function browser () {
    var ary = []

    // the standard
    if (lodash.isArray($window.navigator.languages)) {
      ary = lodash.slice($window.navigator.languages)
    }

    // IE 11 and older browers
    if ($window.navigator.language) {
      ary.push($window.navigator.language)
    }

    // IE<11
    if ($window.navigator.userLanguage) {
      ary.push($window.navigator.userLanguage)
    }

    return lodash.uniq(ary)
  }

  function setLocale (code) {
    if (!code || (code === '_browser_')) {
      code = service.match(service.available, service.browser())
    }
    service.chosen.code = code
    gettextCatalog.loadAndSet(code)

    return code
  }

  function getLocale (data) {
    return data &&
      data.settings &&
      data.settings.ui_service &&
      data.settings.ui_service.display &&
      data.settings.ui_service.display.locale
  }

  function setUser (data) {
    service.userHref = data.identity.user_href.replace(/^.*?\/api\//, '/api/')
  }

  function onLogin (data) {
    setUser(data)
    var code = 'en'
    if (!service.chosen.code || (service.chosen.code === '_user_')) {
      code = getLocale(data)
    } else {
      code = service.chosen.code
      save(code)
    }
    setLocale(code)

    return code
  }

  function onReload (data) {
    setUser(data)

    var code = getLocale(data)
    setLocale(code)

    return code
  }

  function save (code) {
    if (!service.userHref) {
      $log.error('Trying to save language selection without a valid userHref')

      return
    }

    if (code === '_browser_') {
      code = null
    }

    return $http.post(service.userHref, {
      action: 'edit',
      resource: {
        settings: {
          ui_service: {
            display: {
              locale: code
            }
          }
        }
      }
    })
  }

  // returns the best match from available
  function match (available, requested) {
    var shorten = function (str) {
      return {
        orig: str,
        short: str.replace(/[-_].*$/, '')
      }
    }

    var short = {
      available: lodash.keys(available).map(shorten),
      requested: requested.map(shorten)
    }

    for (var k in short.requested) {
      var r = short.requested[k]

      var match = lodash.find(short.available, function (a) {
        // try exact match first
        return a.orig.toLowerCase() === r.orig.toLowerCase()
      }) || lodash.find(short.available, function (a) {
        // lowercase, only language code match second
        return a.short.toLowerCase() === r.short.toLowerCase()
      })

      if (match) {
        return match.orig
      }
    }

    return 'en'
  }

  function fixState (state, toolbarConfig) {
    var fields = toolbarConfig.sortConfig.fields
    var current = state.sort.currentField

    if (!current || !current.id) {
      return
    }

    var found = lodash.find(fields, { id: current.id }) || current

    // can't just replace currentField, the original instance stays inside pf-sort
    state.sort.currentField.title = found.title
  }
}
