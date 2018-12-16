// returns true if points are the same
function pointsEqual([x1, y1], [x2, y2]) {
  return x1 == x2 && y1 == y2;
}

// returns index of key in node.kvPairs, or -1
function keyToPairIndex(node, key1) {
  return node.kvPairs.findIndex(([key2]) => pointsEqual(key1, key2));
}

// returns conversion of key to child index:
//         0
//    NW   ^   NE
//         |
//       0 | 2
//  0 <----+----> 1
//       1 | 3
//         |
//    SW   v   SE
//         1
function keyToChildIndex(node, [x, y]) {
  const bitLeft = x < node.aabb.x + node.aabb.width / 2 ? 0 : 1;
  const bitTop = y < node.aabb.y + node.aabb.height / 2 ? 0 : 1;
  return bitLeft << 1 | bitTop;
}

// returns first two bits of index
function getDirectionBits(index) {
  return [index >> 1 & 1, index & 1];
}

// returns child at key or new child
function keyToChild(node, key) {
  const index = keyToChildIndex(node, key);
  let child = node.children[index];
  if(child != null) return child;

  const [bitLeft, bitTop] = getDirectionBits(index);
  const childAABB = new AABB(
    node.aabb.x + bitLeft * node.aabb.width / 2,
    node.aabb.y + bitTop * node.aabb.height / 2,
    node.aabb.width / 2,
    node.aabb.height / 2
  );

  child = new Node(childAABB, node.MAX_BUCKET_SIZE);
  node.children[index] = child;
  return child;
}

// splits node such that it contains no more entries than node.MAX_BUCKET_SIZE
function splitNode(node) {
  if(node.kvPairs.length <= node.MAX_BUCKET_SIZE) return;

  for(const [key, value] of node.kvPairs) {
    const child = keyToChild(node, key);
    child.kvPairs.push([key, value]);
  }
  node.kvPairs = [];

  for(const child of node.children) {
    if(child != null) splitNode(child);
  }
}

// represents an axis-aligned bounding box
export class AABB {
  // converts AABB-like object to AABB instance
  static from(aabb) {
    if(aabb == null) return null;

    const x = 'x' in aabb ? aabb.x : 'left' in aabb ? aabb.left : 0;
    const y = 'y' in aabb ? aabb.y : 'top' in aabb ? aabb.top : 0;
    const w = 'width' in aabb ? aabb.width : 'right' in aabb ? aabb.right - x : 0;
    const h = 'height' in aabb ? aabb.height : 'bottom' in aabb ? aabb.bottom - y : 0;

    return new AABB(x, y, w, h);
  }

  constructor(x, y, w, h) {
    if(w < 0) {
      x += w;
      w *= -1;
    }
    if(h < 0) {
      y += h;
      h *= -1;
    }

    this.x = x;
    this.y = y;
    this.left = x;
    this.top = y;
    this.right = x + w;
    this.bottom = y + h;
    this.width = w;
    this.height = h;
  }

  // return true if point lies in this AABB
  contains(point) {
    if(point == null) return false;
    const [x, y] = point;

    return x >= this.left
      && x < this.right
      && y >= this.top
      && y < this.bottom;
  }

  // returns true if this intersects the other AABB
  intersects(other) {
    if(!(other instanceof AABB)) other = AABB.from(other);
    if(other == null) return false;
    if(this == other) return true;

    // "Fast rectangle to rectangle intersection"
    // http://stackoverflow.com/a/2752369/2727710
    return this.left < other.right
      && other.left < this.right
      && this.top < other.bottom
      && other.top < this.bottom;
  }
}

// represents a node in the PointQuadTree
class Node {
  constructor(aabb, bucketCapacity) {
    this.aabb = aabb;
    this.children = [null, null, null, null];
    this.kvPairs = [];
    this.MAX_BUCKET_SIZE = bucketCapacity;
  }

  // alias for this.entries
  *[Symbol.iterator]() {
    yield* this.entries();
  }

  // returns value deleted by key
  delete(key) {
    if(!this.isLeaf()) {
      const index = keyToChildIndex(this, key);
      const child = this.children[index];
      if(child == null) return null;

      const removedValue = child.delete(key);
      if(child.isEmpty()) this.children[index] = null;
      return removedValue;
    }

    const index = keyToPairIndex(this, key);
    if(index < 0) return undefined;

    const [, removedValue] = this.kvPairs[index];
    this.kvPairs.splice(index, 1);
    return removedValue;
  }

  // returns an iterable over the key-value pairs
  *entries() {
    if(!this.isLeaf()) {
      for(const child of this.children) {
        if(child != null) yield* child.entries();
      }
    } else {
      yield* Array.from(this.kvPairs);
    }
  }

  // iterates over the key-value pairs with callbackFn
  forEach(callbackFn, thisArg, container) {
    if(!this.isLeaf()) {
      for(const child of this.children) {
        if(child != null) child.forEach(callbackFn, thisArg, container);
      }
    } else {
      for(const [key, value] of this.kvPairs) {
        callbackFn.call(thisArg, key, value, container);
      }
    }
  }

  // returns the value at the given key
  get(key) {
    if(!this.isLeaf()) {
      const child = this.children[keyToChildIndex(this, key)];
      if(child == null) return undefined;
      return child.get(key);
    }

    const index = keyToPairIndex(this, key);
    if(index < 0) return undefined;
    const [, value] = this.kvPairs[index];
    return value;
  }

  // collects all values whose keys lie within the given AABB
  getAll(aabb, values) {
    if(!this.isLeaf()) {
      // collect results from getAll invoked on eligible children
      for(const child of this.children) {
        if(child != null && child.aabb.intersects(aabb)) {
          child.getAll(aabb, values);
        }
      }
    } else {
      // collect values that lie in AABB
      for(const [key, value] of this.kvPairs) {
        if(aabb.contains(key)) {
          values.push(value);
        }
      }
    }
  }

  // returns true if key exists
  has(key) {
    if(!this.isLeaf()) {
      const child = this.children[keyToChildIndex(this, key)];
      return child != null && child.has(key);
    }

    return keyToPairIndex(this, key) >= 0;
  }

  // returns tree depth
  height() {
    let height = 0;

    this.children.forEach(child => {
      if(child != null) height = Math.max(height, child.height());
    });

    return 1 + height;
  }

  // returns true if no entries
  isEmpty() {
    return this.isLeaf() && this.kvPairs.length == 0;
  }

  // returns true if no child nodes
  isLeaf() {
    return this.children.every(child => child == null);
  }

  // returns an iterable over the keys
  *keys() {
    if(!this.isLeaf()) {
      for(const child of this.children) {
        if(child != null) yield* child.keys();
      }
    } else {
      yield* this.kvPairs.map(([key]) => key);
    }
  }

  // returns true if no entry was overwritten
  set(key, value) {
    if(!this.isLeaf()) return keyToChild(this, key).set(key, value);
    // TODO: enable overwriting of existing entries
    if(keyToPairIndex(this, key) >= 0) return false;

    this.kvPairs.push([key, value]);
    splitNode(this);

    return true;
  }

  // returns iterable over values
  *values() {
    if(!this.isLeaf()) {
      for(const child of this.children) {
        if(child != null) yield* child.values();
      }
    } else {
      yield* this.kvPairs.map(([, value]) => value);
    }
  }
}

// represents a point quadtree
export default class PointQuadTree {
  constructor(aabb, iterable = [], bucketCapacity = 4) {
    aabb = AABB.from(aabb);
    if(aabb == null || aabb.width == 0 || aabb.height == 0) {
      throw new RangeError("aabb must have non-zero area");
    }

    if(bucketCapacity < 1) {
      throw new RangeError("bucketCapacity must be at least 1");
    }

    this.MAX_BUCKET_SIZE = bucketCapacity;
    this.aabb = aabb;
    this.root = new Node(aabb, bucketCapacity);
    this.entryCount = 0;

    for(const [key, value] of iterable) {
      this.set(key, value);
    }
  }

  size() {
    return this.entryCount;
  }

  // alias for this.root[Symbol.iterator]
  *[Symbol.iterator]() {
    yield* this.root;
  }

  // resets to empty
  clear() {
    this.root = new Node(this.aabb, this.MAX_BUCKET_SIZE);
    this.entryCount = 0;
  }

  // returns true if entry was deleted
  delete(key) {
    if(this.aabb.contains(key)) {
      this.root.delete(key);
      this.entryCount--;
      return true;
    }

    return false;
  }

  // alias for this.root.entries
  entries() {
    return this.root.entries();
  }

  // calls this.root.forEach with this as container
  forEach(callbackFn, thisArg) {
    this.root.forEach(callbackFn, thisArg, this);
  }

  // returns value at key, or undefined
  get(key) {
    return this.aabb.contains(key) ? this.root.get(key) : undefined;
  }

  // returns all values with keys within aabb
  getAll(aabb) {
    aabb = AABB.from(aabb);
    if(aabb == null) return [];

    const values = [];
    this.root.getAll(aabb, values);
    return values;
  }

  // returns true if key exists
  has(key) {
    return this.aabb.contains(key) && this.root.has(key);
  }

  // alias for this.root.height
  height() {
    return this.root.height();
  }

  // alias for this.root.keys
  keys() {
    return this.root.keys();
  }

  // stores value at key, returns this
  set(key, value) {
    const success = this.aabb.contains(key) && this.root.set(key, value);
    if(success) this.entryCount++;
    return this;
  }

  // alias for this.root.values
  values() {
    return this.root.values();
  }
}
