var PENDING = 'pending'
var FULFILLED = 'fulfilled'
var REJECTED = 'rejected'

var asap = (function () {
  if (process && process.nextTick) {
    return process.nextTick
  } else {
    return setTimeout
  }
}())

function Promise(executor) {
  var self = this
  self.status = PENDING
  self.value = undefined
  self.reason = undefined
  self.resolvedCallbacks = []
  self.rejectedCallbacks = []

  function resolve(value) {
    // 调用resolvePromise处理value为thenable的情况
    resolvePromise(self, value, function(v){
      if (self.status === PENDING) {
        self.status = FULFILLED
        self.value = v
        for (var i = 0; i < self.resolvedCallbacks.length; i++) {
          self.resolvedCallbacks[i]()
        }
      }
    }, reject)
  }

  function reject(reason) {
    if (self.status === PENDING) {
      self.status = REJECTED
      self.reason = reason
      for (var i = 0; i < self.rejectedCallbacks.length; i++) {
        self.rejectedCallbacks[i]()
      }
    }
  }

  try {
    executor(resolve, reject)
  } catch (e) {
    reject(e)
  }

}

Promise.prototype.then = function (onFulfilled, onRejected) {
  onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : function (value) { return value }
  onRejected = typeof onRejected === 'function' ? onRejected : function (reason) { throw reason }

  var self = this
  var promise2 = new Promise(function (resolve, reject) {
    function handleOnFulfilled() {
      asap(function () {
        try {
          var x = onFulfilled(self.value)
          resolvePromise(promise2, x, resolve, reject)
        } catch (e) {
          reject(e)
        }
      })
    }

    function handleOnRejected() {
      asap(function () {
        try {
          var x = onRejected(self.reason)
          resolvePromise(promise2, x, resolve, reject)
        } catch (e) {
          reject(e)
        }
      })
    }

    if (self.status === FULFILLED) {
      handleOnFulfilled()
    }

    if (self.status === REJECTED) {
      handleOnRejected()
    }

    if (self.status === PENDING) {
      self.resolvedCallbacks.push(handleOnFulfilled)
      self.rejectedCallbacks.push(handleOnRejected)
    }
  })

  return promise2
}

/**
 * If x is a thenable, it attempts to make promise adopt the state of x, under the assumption that x behaves at least somewhat like a promise. Otherwise, it fulfills promise with the value x.
 * @param {*} promise 
 * @param {*} x 
 * @param {*} resolve 
 * @param {*} reject 
 */
function resolvePromise(promise, x, resolve, reject) {
  if (promise === x) {
    throw TypeError('Chaining cycle detected for promise')
  }

  // 如果是Promise实例直接调用then方法，免去了后面判断thenable、取then方法的操作
  if (x instanceof Promise) {
    return x.then(resolve, reject)
  }

  if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
    var then, called
    try {
      then = x.then
    } catch (e) {
      // 一定要写return，如果访问then报错就不走后面判断then的逻辑了
      return reject(e)
    }

    if (typeof then === 'function') {
      try {
        then.call(x, function (y) {
          if (!called) {
            called = true
            resolvePromise(promise, y, resolve, reject)
          }
        }, function (r) {
          if (!called) {
            called = true
            reject(r)
          }
        })
      } catch (e) {
        if (!called) {
          reject(e)
        }
      }
    } else {
      resolve(x)
    }

  }
  else {
    resolve(x)
  }
}

// 其他API的实现，不在promises-aplus的测试用例中
Promise.prototype.catch = function (onRejected) {
  return this.then(null, onRejected)
}

Promise.resolve = function (v) {
  return new Promise(function (resolve) {
    resolve(v)
  })
}

Promise.reject = function (r) {
  return new Promise(function (resolve, reject) {
    reject(r)
  })
}

Promise.all = function (iterable) {
  if (iterable == null || typeof iterable[Symbol.iterator] != 'function') {
    throw TypeError(iterable + 'is not iterable')
  }
  var resolvedCount = 0
  var result = []


  return new Promise(function (resolve, reject) {
    var handleResolve = function (value, index) {
      result[index] = value
      resolvedCount++
      if (resolvedCount === iterable.length) {
        resolve(result)
      }
    }
    for (var i = 0; i < iterable.length; i++) {
      var elem = iterable[i]
      if (elem && typeof elem.then == 'function') {
        (function (i) {
          elem.then(function (v) {
            handleResolve(v, i)
          }, function (r) {
            reject(r)
          })
        })(i)
      } else {
        handleResolve(elem, i)
      }

    }
  })
}

Promise.race = function (iterable) {
  if (iterable == null || typeof iterable[Symbol.iterator] != 'function') {
    throw TypeError(iterable + 'is not iterable')
  }
  return new Promise(function (resolve, reject) {
    for (var i = 0; i < iterable.length; i++) {
      var elem = iterable[i]
      if (elem && typeof elem.then == 'function') {
        elem.then(resolve, reject)
      } else {
        resolve(elem)
      }
    }
  })
}

Promise.allSettled = function (iterable) {
  if (iterable == null || typeof iterable[Symbol.iterator] != 'function') {
    throw TypeError(iterable + 'is not iterable')
  }
  var result = []
  var settledCount = 0
  return new Promise(function (resolve, reject) {
    var handleSettled = function (value, index) { }
    for (var i = 0; i < iterable.length; i++) {
      var elem = iterable[i]
      if (elem && typeof elem.then == 'function') {
        (function (i) {
          elem.then(function (v) {
            result[i] = { status: 'fulfilled', value: v }
            settledCount++
            if (settledCount === iterable.length) {
              resolve(result)
            }
          }, function (r) {
            result[i] = { status: 'rejected', reason: r }
            settledCount++
            if (settledCount === iterable.length) {
              resolve(result)
            }
          })
        })(i)
      } else {
        result[i] = { status: 'fulfilled', value: elem }
        settledCount++
        if (settledCount === iterable.length) {
          resolve(result)
        }
      }
    }
  })
}

// promises-tests adapter
Promise.deferred = Promise.defer = function () {
  var dfd = {}
  dfd.promise = new Promise(function (resolve, reject) {
    dfd.resolve = resolve
    dfd.reject = reject
  })
  return dfd
}

module.exports = Promise