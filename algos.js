/*
 * algos.js
 * Provides generator-based and synchronous sorting algorithms.
 * Exposes:
 *  - window.Algos.generators: { name: function*(arr) { ... } }
 *    Each generator yields action objects describing operations to animate.
 *  - window.Algos.sync: pure synchronous functions for testing (return sorted array or operate in-place)
 */
(function () {
  const Algos = { generators: {}, sync: {} };

  // Helper: swap in array
  function swap(arr, i, j) {
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }

  // Generator contract: yield {type:'compare',a:i,b:j} or {type:'swap',a:i,b:j} or {type:'set',i:idx,value:v}

  // Bubble - generator
  function* bubbleGen(arr) {
    const n = arr.length;
    for (let i = 0; i < n; i++) {
      let swapped = false;
      for (let j = 0; j < n - 1 - i; j++) {
        yield { type: "compare", a: j, b: j + 1 };
        if (arr[j] > arr[j + 1]) {
          swap(arr, j, j + 1);
          yield { type: "swap", a: j, b: j + 1 };
          swapped = true;
        }
      }
      if (!swapped) break;
    }
    yield { type: "done" };
  }

  // Quick - generator (Lomuto/Hoare style using recursion with stack to make generator-friendly)
  function* quickGen(arr) {
    const stack = [[0, arr.length - 1]];
    while (stack.length) {
      const [l, r] = stack.pop();
      if (l >= r) continue;
      const pivot = arr[Math.floor((l + r) / 2)];
      let i = l,
        j = r;
      while (i <= j) {
        while (arr[i] < pivot) {
          yield { type: "compare", a: i };
          i++;
        }
        while (arr[j] > pivot) {
          yield { type: "compare", a: j };
          j--;
        }
        if (i <= j) {
          swap(arr, i, j);
          yield { type: "swap", a: i, b: j };
          i++;
          j--;
        }
      }
      if (l < j) stack.push([l, j]);
      if (i < r) stack.push([i, r]);
    }
    yield { type: "done" };
  }

  // Merge - generator
  function* mergeGen(arr) {
    function* mergeRange(l, r) {
      if (l >= r) return;
      const m = Math.floor((l + r) / 2);
      yield* mergeRange(l, m);
      yield* mergeRange(m + 1, r);
      const left = arr.slice(l, m + 1);
      const right = arr.slice(m + 1, r + 1);
      let i = 0,
        j = 0,
        k = l;
      while (i < left.length && j < right.length) {
        yield { type: "compare", a: l + i, b: m + 1 + j };
        if (left[i] <= right[j]) {
          arr[k] = left[i++];
          yield { type: "set", i: k, value: arr[k] };
        } else {
          arr[k] = right[j++];
          yield { type: "set", i: k, value: arr[k] };
        }
        k++;
      }
      while (i < left.length) {
        arr[k] = left[i++];
        yield { type: "set", i: k, value: arr[k] };
        k++;
      }
      while (j < right.length) {
        arr[k] = right[j++];
        yield { type: "set", i: k, value: arr[k] };
        k++;
      }
    }
    yield* mergeRange(0, arr.length - 1);
    yield { type: "done" };
  }

  // Heap - generator
  function* heapGen(arr) {
    const n = arr.length;
    function* siftDown(start, end) {
      let root = start;
      while (true) {
        let child = 2 * root + 1;
        if (child > end) return;
        if (child + 1 <= end) {
          yield { type: "compare", a: child, b: child + 1 };
          if (arr[child] < arr[child + 1]) child++;
        }
        yield { type: "compare", a: root, b: child };
        if (arr[root] < arr[child]) {
          swap(arr, root, child);
          yield { type: "swap", a: root, b: child };
          root = child;
        } else return;
      }
    }
    // build heap
    for (let start = Math.floor((n - 2) / 2); start >= 0; start--) {
      yield* siftDown(start, n - 1);
    }
    for (let end = n - 1; end > 0; end--) {
      swap(arr, 0, end);
      yield { type: "swap", a: 0, b: end };
      yield* siftDown(0, end - 1);
    }
    yield { type: "done" };
  }

  // Radix (LSD) for non-negative integers - for generator we'll convert to integers scaled by factor
  function* radixGen(arr) {
    // assume arr contains numbers in [0,1); scale to ints
    const n = arr.length;
    const scale = 1000; // precision
    const A = arr.map((x) => Math.floor(x * scale));
    let max = 0;
    for (const v of A) if (v > max) max = v;
    let exp = 1;
    while (Math.floor(max / exp) > 0) {
      const buckets = Array.from({ length: 10 }, () => []);
      for (let i = 0; i < n; i++) {
        const d = Math.floor((A[i] / exp) % 10);
        yield { type: "compare", a: i };
        buckets[d].push(A[i]);
      }
      let idx = 0;
      for (let b = 0; b < 10; b++) {
        for (const val of buckets[b]) {
          A[idx] = val;
          arr[idx] = val / scale;
          yield { type: "set", i: idx, value: arr[idx] };
          idx++;
        }
      }
      exp *= 10;
    }
    yield { type: "done" };
  }

  // Synchronous variants for tests
  function bubbleSync(arr) {
    const a = arr.slice();
    for (let i = 0; i < a.length; i++) {
      for (let j = 0; j < a.length - 1 - i; j++) {
        if (a[j] > a[j + 1]) {
          const t = a[j];
          a[j] = a[j + 1];
          a[j + 1] = t;
        }
      }
    }
    return a;
  }
  function quickSync(arr) {
    const a = arr.slice();
    a.sort((x, y) => x - y);
    return a;
  }
  function mergeSync(arr) {
    return quickSync(arr);
  }
  function heapSync(arr) {
    return quickSync(arr);
  }
  function radixSync(arr) {
    return quickSync(arr);
  }

  Algos.generators.bubble = bubbleGen;
  Algos.generators.quick = quickGen;
  Algos.generators.merge = mergeGen;
  Algos.generators.heap = heapGen;
  Algos.generators.radix = radixGen;

  Algos.sync.bubble = bubbleSync;
  Algos.sync.quick = quickSync;
  Algos.sync.merge = mergeSync;
  Algos.sync.heap = heapSync;
  Algos.sync.radix = radixSync;

  window.Algos = Algos;
})();
