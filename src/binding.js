// see: https://michaelmovsesov.com/articles/angular-like-two-way-data-binding-vanilla-js

'use strict'

// Cache DOM elements
const inputElements = document.querySelectorAll('[data-model]');
const boundElements = document.querySelectorAll('[data-bind]');

// Initialize scope variable to hold the state of the model.
let scope = {};


function init() {
    // Loop through input elements
    for (let el of inputElements) {
        if (el.tagName.toLowerCase() === 'input' || el.tagName.toLowerCase() === 'select') {
            // Get property name from each input with an attribute of 'data-model'
            let propName = el.getAttribute('data-model');

            // Update bound scope property on input change
            el.addEventListener('keyup', e => { scope[propName] = el.value; });
            el.addEventListener('mouseup', e => { scope[propName] = el.value; });

            // Set property update logic
            setPropUpdateLogic(propName);
        }
    }
};

function setPropUpdateLogic(prop) {
    if (!scope.hasOwnProperty(prop)) {
        let value;
        Object.defineProperty(scope, prop, {
            // Automatically update bound dom elements when a scope property is set to a new value
            set: (newValue) => {
                value = newValue;

                // Set input elements to new value
                for (let el of inputElements) {
                    if (el.getAttribute('data-model') === prop) {
                        if (el.type) {
                            el.value = newValue;
                        }
                    }
                }
                // Set all other bound dom elements to new value
                for (let el of boundElements) {
                    if (el.getAttribute('data-bind') === prop) {
                        if (!el.type) {
                            el.innerHTML = newValue;
                        }
                    }
                }
            },
            get: () => {
                return value;
            },
            enumerable: true
        })
    }
}

function docReady(fn) {
    // see if DOM is already available
    if (document.readyState === "complete" || document.readyState === "interactive") {
        // call on next available tick
        setTimeout(fn, 1);
    } else {
        document.addEventListener("DOMContentLoaded", fn);
    }
}

docReady(function () {
    init();
});
