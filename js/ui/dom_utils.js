// js/ui/dom_utils.js

const DOMUtils = {
    qs: function(selector, parent = document) { return parent.querySelector(selector); },
    qsa: function(selector, parent = document) { return parent.querySelectorAll(selector); },
    createElement: function(tagName, attributes = {}, children = []) {
        const element = document.createElement(tagName);
        for (const key in attributes) {
            if (key === 'class') {
                if (Array.isArray(attributes[key])) attributes[key].forEach(cls => element.classList.add(cls));
                else element.className = attributes[key];
            } else if (key === 'dataset') {
                 for (const dataKey in attributes[key]) element.dataset[dataKey] = attributes[key][dataKey];
            } else element.setAttribute(key, attributes[key]);
        }
        children.forEach(child => {
            if (typeof child === 'string') element.appendChild(document.createTextNode(child));
            else if (child instanceof Node) element.appendChild(child);
        });
        return element;
    },
    addClass: function(element, className) { if (element && className) element.classList.add(className); },
    removeClass: function(element, className) { if (element && className) element.classList.remove(className); },
    toggleClass: function(element, className, force) {
        if (element && className) return element.classList.toggle(className, force);
        return undefined;
    },
    hasClass: function(element, className) {
        if (element && className) return element.classList.contains(className);
        return false;
    },
    on: function(element, eventType, handler, options) {
        if (element && eventType && typeof handler === 'function') element.addEventListener(eventType, handler, options);
    },
    off: function(element, eventType, handler, options) {
        if (element && eventType && typeof handler === 'function') element.removeEventListener(eventType, handler, options);
    },
    empty: function(element) { if (element) while (element.firstChild) element.removeChild(element.firstChild); },
    toggleDisplay: function(element, show) {
        if (element) {
            if (typeof show === 'boolean') element.style.display = show ? '' : 'none';
            else element.style.display = element.style.display === 'none' ? '' : 'none';
        }
    },
    setText: function(element, text) { if (element) element.textContent = text; }
};
