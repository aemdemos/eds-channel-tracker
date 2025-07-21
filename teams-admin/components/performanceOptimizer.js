/*
 * Copyright 2025 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

export class PerformanceOptimizer {
  static elementCache = new Map();
  
  static getElementById(id) {
    if (!this.elementCache.has(id)) {
      const element = document.getElementById(id);
      if (element) {
        this.elementCache.set(id, element);
      }
    }
    return this.elementCache.get(id);
  }

  static clearElementCache() {
    this.elementCache.clear();
  }

  static debounce(func, delay) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  static throttle(func, limit) {
    let inThrottle;
    return (...args) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  static createDocumentFragment(htmlString) {
    const template = document.createElement('template');
    template.innerHTML = htmlString;
    return template.content;
  }

  static batchDOMUpdates(updates) {
    const fragment = document.createDocumentFragment();
    updates.forEach(update => {
      if (typeof update === 'function') {
        update(fragment);
      }
    });
    return fragment;
  }

  static lazyLoad(elements, callback, options = {}) {
    const defaultOptions = {
      root: null,
      rootMargin: '10px',
      threshold: 0.1
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          callback(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, finalOptions);

    elements.forEach(element => observer.observe(element));
    return observer;
  }

  static memoize(fn) {
    const cache = new Map();
    return (...args) => {
      const key = JSON.stringify(args);
      if (cache.has(key)) {
        return cache.get(key);
      }
      const result = fn(...args);
      cache.set(key, result);
      return result;
    };
  }

  static createVirtualizedList(container, items, itemHeight, renderItem) {
    const containerHeight = container.clientHeight;
    const visibleItems = Math.ceil(containerHeight / itemHeight) + 2; // Buffer
    let scrollTop = 0;

    const render = () => {
      const startIndex = Math.floor(scrollTop / itemHeight);
      const endIndex = Math.min(startIndex + visibleItems, items.length);
      
      container.innerHTML = '';
      container.style.height = `${items.length * itemHeight}px`;
      container.style.paddingTop = `${startIndex * itemHeight}px`;

      for (let i = startIndex; i < endIndex; i++) {
        const itemElement = renderItem(items[i], i);
        container.appendChild(itemElement);
      }
    };

    container.addEventListener('scroll', this.throttle((e) => {
      scrollTop = e.target.scrollTop;
      render();
    }, 16)); // ~60fps

    render();
    return { render };
  }

  static preloadData(urls) {
    return Promise.allSettled(
      urls.map(url => 
        fetch(url, { 
          method: 'GET',
          cache: 'force-cache' 
        }).then(response => ({ url, data: response }))
      )
    );
  }

  static optimizeImages(imgElements) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
          }
          observer.unobserve(img);
        }
      });
    });

    imgElements.forEach(img => observer.observe(img));
    return observer;
  }

  static createBatchProcessor(processFn, batchSize = 10, delay = 16) {
    const queue = [];
    let processing = false;

    const process = async () => {
      if (processing || queue.length === 0) return;
      
      processing = true;
      const batch = queue.splice(0, batchSize);
      
      await new Promise(resolve => {
        requestAnimationFrame(() => {
          processFn(batch);
          resolve();
        });
      });
      
      processing = false;
      
      if (queue.length > 0) {
        setTimeout(process, delay);
      }
    };

    return {
      add: (item) => {
        queue.push(item);
        process();
      },
      flush: () => {
        while (queue.length > 0) {
          const batch = queue.splice(0, batchSize);
          processFn(batch);
        }
      }
    };
  }
} 