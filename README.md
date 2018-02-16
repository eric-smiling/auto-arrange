# auto-arrange
Automatically arranges nodes while dragging them.

## Context
There is a [Context](https://github.com/eric-smiling/auto-arrange/blob/master/src/js/Context.js) class that represents a space shared by draggable nodes. The Context interface is meant to be the primary externally useful abstraction. Typical usage is demonstrated by [index.js](https://github.com/eric-smiling/auto-arrange/blob/master/src/js/index.js).

##### Relevant steps are:
- construct a context, providing a method for locating the draggable nodes (`getNodes`)
- call the `start` method on drag start
- call the `move` method on drag move
- call the `end` method on drag end

## Internals
The context class maintains a series of Maps and methods used for repel and revert logic while dragging. The Maps are not exposed/useful externally (with the exception of the `positions` Map which has an accessor).

The format of the `positions` map is:
```
node ==> {
  id: [node identifier],
  rect: {
    width: [width],
    height: [height],
    top: [top],
    left: [left],
    bottom: [bottom],
    right: [right]
  }
}
```

##### Extras
- uses es6 via  babel transpilation
- airbnb linter rule are applied
- bundle is created via webpack

#### Known Bugs:
- the dragging nodes disappear on a page that is scrolled vertically

##### TODO:
- add jsdoc
- write tests
- remove getNodes as a dependency from `attract`, `repel`, and `revert` actions
- ~possibly move actions into Context class directly, eliminating the long argument lists~


#### TO USE:
- clone the repo
- npm install
- npm run build
- view the ui here: http://localhost:8080/dist/index.html
- view the es5 here: http://localhost:8080/js/bundle.js

Shortcut: Just grab [`bundle.js`](https://github.com/eric-smiling/auto-arrange/blob/master/dist/js/bundle.js). Caution, it includes the interact library.
