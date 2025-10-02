
export type DLLNode<T> = {
  value: T;
  prev: number | null;
  next: number | null;
};

export default class DoublyLinkedList<T> {
  nodes: DLLNode<T>[];

  constructor(items: T[] = []) {
    this.nodes = [];
    for (let i = 0; i < items.length; i++) {
      this.nodes.push({
        value: items[i],
        prev: i - 1 >= 0 ? i - 1 : null,
        next: i + 1 < items.length ? i + 1 : null,
      });
    }
  }

  static fromArray<U>(items: U[]) {
    return new DoublyLinkedList(items);
  }

  toArray(): T[] {
    return this.nodes.map((n) => n.value);
  }

  length(): number {
    return this.nodes.length;
  }

  nextIndex(index: number): number | null {
    if (index < 0 || index >= this.nodes.length) return null;
    return this.nodes[index].next;
  }

  prevIndex(index: number): number | null {
    if (index < 0 || index >= this.nodes.length) return null;
    return this.nodes[index].prev;
  }

  // returns a new shuffled list, optionally preserving the item at preserveIndex as head
  shuffle(preserveIndex?: number): DoublyLinkedList<T> {
    const arr = this.toArray();
    let preserved: T | null = null;
    if (preserveIndex !== undefined && preserveIndex !== null && preserveIndex >= 0 && preserveIndex < arr.length) {
      preserved = arr[preserveIndex];
    }
    const rest = arr.filter((_, idx) => idx !== preserveIndex);
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    const newArr = preserved !== null ? [preserved, ...rest] : rest;
    return new DoublyLinkedList(newArr);
  }
}
