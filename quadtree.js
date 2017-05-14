(function(window) {
    "use strict";

    const Point = {
        equals(p1, p2) {
            return p1 == p2 || p1.x == p2.x && p1.y == p2.y;
        }
    };

    class AABB {
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

        contains(point) {
            return point != null && point.x >= this.left && point.x < this.right && point.y >= this.top && point.y < this.bottom;
        }

        // "Fast rectangle to rectangle intersection" http://stackoverflow.com/a/2752369/2727710
        intersects(aabb) {
            return this == aabb || aabb != null && this.left < aabb.right && aabb.left < this.right && this.top < aabb.bottom && aabb.top < this.bottom;
        }
    }

    class QuadTree {
        constructor(x, y, w, h) {
            this.aabb = new AABB(x, y, w, h);
            this.root = new Node(this.aabb);
            this.entryCount = 0;
        }

        get(key) {
            return this.isKeyValid(key) ? this.root.get(key) : null;
        }

        getAll(x, y, w, h) {
            return this.root.getAll(new AABB(x, y, w, h));
        }

        put(key, value) {
            const success = this.isKeyValid(key) && this.isValueValid(value) && this.root.put(key, value);

            if(success) {
                this.entryCount++;
            }

            return success;
        }

        remove(key) {
            const removedValue = this.isKeyValid(key) ? this.root.remove(key) : null;

            if(removedValue != null) {
                this.entryCount--;
            }

            return removedValue;
        }

        size() {
            return this.entryCount;
        }

        getHeight() {
            return this.root.getHeight();
        }

        isEmpty() {
            return this.entryCount == 0;
        }

        isKeyValid(key) {
            return this.aabb.contains(key);
        }

        isValueValid(value) {
            return value != null;
        }

        containsKey(key) {
            return this.isKeyValid(key) && this.root.containsKey(key);
        }

        containsValue(value) {
            return this.isValueValid(value) && this.root.containsValue(value);
        }

        clear() {
            this.root = new Node(this.aabb);
            this.entryCount = 0;
        }

        draw(ctx) {
            this.root.draw(ctx);
        }
    }

    class Node {
        constructor(aabb) {
            this.aabb = aabb;
            this.children = [null, null, null, null];
            this.keys = [];
            this.values = [];
        }

        getChildIndex(key) {
            const bitLeft = key.x < this.aabb.x + this.aabb.width / 2 ? 0 : 1;
            const bitTop = key.y < this.aabb.y + this.aabb.height / 2 ? 0 : 1;

            return bitLeft << 1 | bitTop;
        }

        getKeyIndex(key1) {
            return this.keys.findIndex(key2 => Point.equals(key1, key2));
        }

        findChild(key) {
            const index = this.getChildIndex(key);
            let child = this.children[index];

            if(child == null) {
                const childAABB = new AABB(
                    this.aabb.x + (index >> 1 & 1) * this.aabb.width / 2,
                    this.aabb.y + (index & 1) * this.aabb.height / 2,
                    this.aabb.width / 2,
                    this.aabb.height / 2
                );
                child = new Node(childAABB);

                this.children[index] = child;
            }

            return child;
        }

        get(key) {
            if(!this.isLeaf()) {
                const child = this.children[this.getChildIndex(key)];

                if(child == null) {
                    return null;
                }

                return child.get(key);
            }

            const index = this.getKeyIndex(key);

            return index >= 0 ? this.values[index] : null;
        }

        getAll(aabb) {
            const all = [];

            if(!this.isLeaf()) {
                // collect results from getAll invoked on eligible children
                this.children.forEach(child => {
                    if(child != null && aabb.intersects(child.aabb)) {
                        all.push(...child.getAll(aabb));
                    }
                });
            } else {
                // collect values that lie in AABB
                this.keys.forEach((key, index) => {
                    if(aabb.contains(key)) {
                        all.push(this.values[index]);
                    }
                });
            }

            return all;
        }

        put(key, value) {
            if(!this.isLeaf()) {
                return this.findChild(key).put(key, value);
            }

            if(this.getKeyIndex(key) >= 0) {
                return false;
            }

            this.keys.push(key);
            this.values.push(value);
            this.split();

            return true;
        }

        remove(key) {
            if(!this.isLeaf()) {
                const index = this.getChildIndex(key);
                const child = this.children[index];

                if(child == null) {
                    return null;
                }

                const removedValue = child.remove(key);

                if(child.isEmpty()) {
                    this.children[index] = null;
                }

                return removedValue;
            }

            const index = this.getKeyIndex(key);

            if(index >= 0) {
                const removedValue = this.values[index];
                this.keys.splice(index, 1);
                this.values.splice(index, 1);
                return removedValue;
            }

            return null;
        }

        getHeight() {
            let height = 0;

            this.children.forEach(child => {
                if(child != null) {
                    height = Math.max(height, child.getHeight());
                }
            });

            return 1 + height;
        }

        isEmpty() {
            return this.isLeaf() && this.keys.length == 0;
        }

        containsKey(key) {
            if(!this.isLeaf()) {
                const child = this.children[this.getChildIndex(key)];

                return child != null && child.containsKey(key);
            }

            return this.getKeyIndex(key) >= 0;
        }

        containsValue(value) {
            if(!this.isLeaf()) {
                return this.children.some(child => child != null && child.containsValue(value));
            }

            return this.values.includes(value);
        }

        draw(ctx) {
            this.children.forEach(child => {
                if(child != null) {
                    child.draw(ctx);
                }
            });

            ctx.strokeRect(this.aabb.x, this.aabb.y, this.aabb.width, this.aabb.height);
        }

        isLeaf() {
            return this.children.every(child => child == null);
        }

        split() {
            if(this.keys.length <= Node.MAX_BUCKET_SIZE) {
                return;
            }

            while(this.keys.length > 0) {
                var key = this.keys.pop();
                var value = this.values.pop();
                var child = this.findChild(key);

                child.keys.push(key);
                child.values.push(value);
            }

            this.children.forEach(child => {
                if(child != null) {
                    child.split();
                }
            });
        }
    }
    Node.MAX_BUCKET_SIZE = 5;

    window.QuadTree = QuadTree;
})(window);
