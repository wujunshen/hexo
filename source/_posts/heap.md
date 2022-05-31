---
title: 堆
excerpt: 数据结构-堆
categories:
  - 算法
tags:
  - 算法
  - 数据结构
  - 堆
  - heap
comments: true
layout: post
index_img: /img/milan/12.png
sticky: 884
abbrlink: 4206121381
date: 2022-06-01 04:25:19
---
# 堆

堆其实是个完全二叉树

* 每个结点的值都大于或等于其左右孩子结点的值，称为最大堆
* 每个结点的值都小于或等于其左右孩子结点的值，称为最小堆

![最大堆和最小堆](img/heap/13D70C61-09AF-4ED9-96A9-2312B141E585.png)

图一是最大堆，图二是最小堆

完全二叉树概念
叶子节点只能出现在最下层和次下层，且最下层的结点都集中在该层最左边的若干位置的二叉树

图例

![完全二叉树](img/heap/F1A766EF-D846-49C9-9C58-B5B9DDA28D97.png)

# 二叉堆

就是最大堆，特点如下图

![最大堆特点](img/heap/95E88F5E-9068-4573-A649-0CA0DA2495D6.png)

源码实现，包括main测试方法

``` java
public class BinaryHeap {
  private static final int HEAP_DEGREE = 2;
  private final int[] heap;
  private int heapSize;

  /** This will initialize our heap with default size. */
  public BinaryHeap(int capacity) {
    heapSize = 0;
    heap = new int[capacity + 1];
    Arrays.fill(heap, -1);
  }

  public static void main(String[] args) {
    BinaryHeap maxHeap = new BinaryHeap(10);
    maxHeap.insert(10);
    maxHeap.insert(4);
    maxHeap.insert(9);
    maxHeap.insert(1);
    maxHeap.insert(7);
    maxHeap.insert(5);
    maxHeap.insert(3);

    maxHeap.printHeap();
    maxHeap.delete(5);
    maxHeap.printHeap();
    maxHeap.delete(2);
    maxHeap.printHeap();
  }

  public boolean isEmpty() {
    return heapSize == 0;
  }

  public boolean isFull() {
    return heapSize == heap.length;
  }

  private int parent(int i) {
    return (i - 1) / HEAP_DEGREE;
  }

  private int kthChild(int i, int k) {
    return HEAP_DEGREE * i + k;
  }

  /**
   * Inserts new element in to heap Complexity: O(log N) As worst case scenario, we need to traverse
   * till the root
   */
  public void insert(int x) {
    if (isFull()) {
      throw new NoSuchElementException("Heap is full, No space to insert new element");
    }
    heap[heapSize] = x;
    heapSize++;
    heapifyUp(heapSize - 1);
  }

  /** Deletes element at index x Complexity: O(log N) */
  public int delete(int x) {
    if (isEmpty()) {
      throw new NoSuchElementException("Heap is empty, No element to delete");
    }
    int maxElement = heap[x];
    heap[x] = heap[heapSize - 1];
    heapSize--;
    heapifyDown(x);
    return maxElement;
  }

  /** Maintains the heap property while inserting an element. */
  private void heapifyUp(int i) {
    int insertValue = heap[i];
    while (i > 0 && insertValue > heap[parent(i)]) {
      heap[i] = heap[parent(i)];
      i = parent(i);
    }
    heap[i] = insertValue;
  }

  /** Maintains the heap property while deleting an element. */
  private void heapifyDown(int i) {
    int child;
    int temp = heap[i];
    while (kthChild(i, 1) < heapSize) {
      child = maxChild(i);
      if (temp >= heap[child]) {
        break;
      }
      heap[i] = heap[child];
      i = child;
    }
    heap[i] = temp;
  }

  private int maxChild(int i) {
    int leftChild = kthChild(i, 1);
    int rightChild = kthChild(i, 2);
    return heap[leftChild] > heap[rightChild] ? leftChild : rightChild;
  }

  /** Prints all elements of the heap */
  public void printHeap() {
    System.out.print("nHeap = ");
    for (int i : heap) {
      System.out.print(i + " ");
    }
    System.out.println();
  }

  /** This method returns the max element of the heap. complexity: O(1) */
  public int findMax() {
    if (isEmpty()) {
      throw new NoSuchElementException("Heap is empty.");
    }
    return heap[0];
  }
}
```
