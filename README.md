# understanding-promise
<a href="https://promisesaplus.com/">
    <img src="https://promisesaplus.com/assets/logo-small.png" alt="Promises/A+ logo"
         title="Promises/A+ 1.0 compliant" align="right" />
</a>
An easy-to-understand version of Promise/A+ implementation


结合各种“手写Promise文章”的一个符合Promise/A+规范的实现，仅供学习使用

<br>

### test
```bash
yarn
yarn test
```

### 实现内容

#### 符合Promise/A+规范的实现

#### 构造函数包含 resolve 一个 `Thenable` 对象的处理
Promise/A+规范中并没有对Promise构造函数的要求，现有的文章基本都没有处理

#### 其他API
- Promise.prototype.catch()
- Promise.race()
- Promise.all()
- Promise.allSettled()